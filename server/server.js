require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mercadopago = require("mercadopago");

const app = express();

app.use(cors());
app.use(express.json());

mercadopago.configure({
  access_token: process.env.MP_TOKEN
});

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

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASS || "123";
  if (user === adminUser && pass === adminPass) return res.json({ ok: true });
  res.json({ ok: false });
});

app.get("/produtos", (req, res) => {
  res.json(produtos);
});

app.post("/produtos", (req, res) => {
  const { nome, preco, estoque, fotoUrl } = req.body;
  const p = {
    id: Date.now(),
    nome: String(nome || "").trim(),
    preco: Number(String(preco).replace(",", ".")),
    estoque: Number(estoque || 0),
    foto: fotoUrl || ""
  };
  if (!p.nome || isNaN(p.preco)) {
    return res.status(400).json({ erro: "Nome e preço são obrigatórios" });
  }
  produtos.push(p);
  salvarDB();
  res.json(p);
});

app.put("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const produto = produtos.find(p => p.id == id);
  if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

  const { nome, preco, estoque, fotoUrl } = req.body;
  produto.nome = String(nome || produto.nome).trim();
  produto.preco = Number(String(preco).replace(",", "."));
  produto.estoque = Number(estoque ?? produto.estoque);
  if (fotoUrl !== undefined) produto.foto = fotoUrl;

  salvarDB();
  res.json({ ok: true });
});

app.delete("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const idx = produtos.findIndex(p => p.id == id);
  if (idx === -1) return res.status(404).json({ erro: "Produto não encontrado" });
  produtos.splice(idx, 1);
  salvarDB();
  res.json({ ok: true });
});

app.post("/checkout", async (req, res) => {
  try {
    const itens = req.body.itens;
    if (!itens || itens.length === 0) return res.status(400).json({ erro: "Carrinho vazio" });

    for (const item of itens) {
      const produto = produtos.find(p => p.id == item.id);
      if (!produto) return res.status(400).json({ erro: `Produto não encontrado: ${item.nome}` });
      if (produto.estoque < item.q) {
        return res.status(400).json({
          erro: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}`
        });
      }
    }

    const base = process.env.SITE_URL || "https://marvelous-bubblegum-1c3c80.netlify.app";

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

app.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== "payment") return res.sendStatus(200);

    const pagamento = await mercadopago.payment.get(data.id);
    const status = pagamento.body.status;
    if (status !== "approved") return res.sendStatus(200);

    const itens = pagamento.body.additional_info?.items || [];
    for (const item of itens) {
      const produto = produtos.find(p => p.nome.toLowerCase() === item.title.toLowerCase());
      if (produto) {
        produto.estoque = Math.max(0, produto.estoque - Number(item.quantity));
        console.log(`Estoque atualizado: ${produto.nome} -> ${produto.estoque}`);
      }
    }

    salvarDB();
    res.sendStatus(200);
  } catch (err) {
    console.error("ERRO WEBHOOK:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
