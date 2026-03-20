require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mercadopago = require("mercadopago");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   🔐 CONFIG MERCADO PAGO (via .env)
================================ */
mercadopago.configure({
  access_token: process.env.MP_TOKEN
});

/* ================================
   📦 BANCO SIMPLES (JSON)
================================ */
let produtos = [];
const DB_PATH = path.join(__dirname, "produtos.json");

if (fs.existsSync(DB_PATH)) {
  try {
    produtos = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (err) {
    console.error("Erro ao ler produtos.json:", err);
  }
}

function salvarDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(produtos, null, 2));
}

/* ================================
   🔑 LOGIN
================================ */
app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASS || "123";

  if (user === adminUser && pass === adminPass) {
    return res.json({ ok: true });
  }
  res.json({ ok: false });
});

/* ================================
   📷 UPLOAD
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  }
});

/* ================================
   📥 GET PRODUTOS
================================ */
app.get("/produtos", (req, res) => {
  const base = process.env.BASE_URL || "https://vilacos-server.onrender.com";
  const lista = produtos.map(p => ({
    ...p,
    foto: p.foto ? `${base}/uploads/${p.foto}` : ""
  }));
  res.json(lista);
});

/* ================================
   ➕ CRIAR PRODUTO
================================ */
app.post("/produtos", upload.single("foto"), (req, res) => {
  const p = {
    id: Date.now(),
    nome: String(req.body.nome || "").trim(),
    preco: Number(String(req.body.preco).replace(",", ".")),
    estoque: Number(req.body.estoque || 0),
    foto: req.file ? req.file.filename : ""
  };

  if (!p.nome || isNaN(p.preco)) {
    return res.status(400).json({ erro: "Nome e preço são obrigatórios" });
  }

  produtos.push(p);
  salvarDB();
  res.json(p);
});

/* ================================
   ✏️ EDITAR PRODUTO
================================ */
app.put("/produtos/:id", upload.single("foto"), (req, res) => {
  const { id } = req.params;
  const produto = produtos.find(p => p.id == id);

  if (!produto) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  produto.nome = String(req.body.nome || produto.nome).trim();
  produto.preco = Number(String(req.body.preco).replace(",", "."));
  produto.estoque = Number(req.body.estoque ?? produto.estoque);

  if (req.file) produto.foto = req.file.filename;

  salvarDB();
  res.json({ ok: true });
});

/* ================================
   ❌ DELETE PRODUTO
================================ */
app.delete("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const idx = produtos.findIndex(p => p.id == id);

  if (idx === -1) {
    return res.status(404).json({ erro: "Produto não encontrado" });
  }

  produtos.splice(idx, 1);
  salvarDB();
  res.json({ ok: true });
});

/* ================================
   💳 CHECKOUT MERCADO PAGO
   + validação de estoque no servidor
================================ */
app.post("/checkout", async (req, res) => {
  try {
    const itens = req.body.itens;
    if (!itens || itens.length === 0) {
      return res.status(400).json({ erro: "Carrinho vazio" });
    }

    // Validar estoque de cada item no servidor
    for (const item of itens) {
      const produto = produtos.find(p => p.id == item.id);
      if (!produto) {
        return res.status(400).json({ erro: `Produto não encontrado: ${item.nome}` });
      }
      if (produto.estoque < item.q) {
        return res.status(400).json({
          erro: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}`
        });
      }
    }

    const base = process.env.BASE_URL || "https://seu-site.com";

    const preference = {
      items: itens.map(i => ({
        title: i.nome,
        unit_price: Number(i.preco),
        quantity: i.q
      })),
      back_urls: {
        success: `${base}/sucesso`,
        failure: `${base}/erro`,
        pending: `${base}/pendente`
      },
      auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });

  } catch (err) {
    console.error("ERRO CHECKOUT:", err);
    res.status(500).json({ erro: "Erro ao criar pagamento" });
  }
});

/* ================================
   🔔 WEBHOOK MERCADO PAGO
   Baixa estoque automaticamente após pagamento aprovado.
   Configure em: mercadopago.com.br/developers/panel/webhooks
   URL do webhook: https://seu-site.com/webhook
================================ */
app.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "payment") return res.sendStatus(200);

    const pagamento = await mercadopago.payment.get(data.id);
    const status = pagamento.body.status;

    if (status !== "approved") return res.sendStatus(200);

    const itens = pagamento.body.additional_info?.items || [];

    for (const item of itens) {
      const produto = produtos.find(
        p => p.nome.toLowerCase() === item.title.toLowerCase()
      );
      if (produto) {
        produto.estoque = Math.max(0, produto.estoque - Number(item.quantity));
        console.log(`📦 Estoque atualizado: ${produto.nome} → ${produto.estoque}`);
      }
    }

    salvarDB();
    res.sendStatus(200);

  } catch (err) {
    console.error("ERRO WEBHOOK:", err);
    res.sendStatus(500);
  }
});

/* ================================
   🚀 START SERVER
================================ */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎀 Servidor rodando em http://localhost:${PORT}`);
});
