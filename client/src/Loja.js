import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./loja.css";

const API = "https://vilacos-server.onrender.com";

export default function Loja() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState(() => {
    try { return JSON.parse(localStorage.getItem("carrinho") || "[]"); }
    catch { return []; }
  });
  const [busca, setBusca] = useState("");
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const toastTimer = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
  }, [carrinho]);

  // header scroll effect
  useEffect(() => {
    const header = document.querySelector(".header");
    const onScroll = () => {
      if (window.scrollY > 10) header?.classList.add("scrolled");
      else header?.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // fechar carrinho com ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setCarrinhoAberto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function carregar() {
    try {
      const res = await axios.get(`${API}/produtos`);
      setProdutos(res.data);
    } catch (err) {
      console.error(err);
      mostrarToast("Erro ao carregar produtos");
    }
  }

  function mostrarToast(msg) {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show: false, msg: "" }), 2500);
  }

  function adicionar(p) {
    if (p.estoque <= 0) return;
    setCarrinho(prev => {
      const existe = prev.find(i => i.id === p.id);
      if (existe) return prev.map(i => i.id === p.id ? { ...i, q: i.q + 1 } : i);
      return [...prev, { ...p, q: 1 }];
    });
    mostrarToast(`✨ ${p.nome} adicionado!`);
  }

  function aumentar(item) {
    setCarrinho(prev => prev.map(i => i.id === item.id ? { ...i, q: i.q + 1 } : i));
  }

  function diminuir(item) {
    setCarrinho(prev =>
      prev.map(i => i.id === item.id && i.q > 1 ? { ...i, q: i.q - 1 } : i)
    );
  }

  function remover(id) {
    setCarrinho(prev => prev.filter(i => i.id !== id));
  }

  const total = carrinho.reduce((soma, i) => soma + Number(i.preco) * i.q, 0);
  const totalItens = carrinho.reduce((soma, i) => soma + i.q, 0);

  async function finalizarCompra() {
    try {
      const res = await axios.post(`${API}/checkout`, { itens: carrinho });
      window.location.href = res.data.init_point;
    } catch (err) {
      console.error(err);
      mostrarToast("Erro ao iniciar pagamento");
    }
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-container">
          <div className="header-brand">
            <img src="/vi.png" className="logo" alt="logo" />
            <div className="brand-text">
              <h1>Ateliê Vi Laços</h1>
              <span>Laços feitos com amor 💖</span>
            </div>
          </div>
          <div className="header-actions">
            <a
              href="https://www.instagram.com/vii.lacos"
              target="_blank"
              rel="noreferrer"
              className="insta-btn"
            >
              <span>📸</span>
              <span>Instagram</span>
            </a>
            {/* ✅ Admin abre em nova aba */}
            <button
              onClick={() => window.open("/admin", "_blank")}
              className="admin-btn"
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <h2>
          Cada laço,<br />
          <strong>uma história</strong>
        </h2>
        <p>Peças artesanais únicas, feitas com carinho 🎀</p>
      </section>

      {/* BUSCA */}
      <div className="busca-wrapper">
        <div className="busca-inner">
          <span className="busca-icon">🔍</span>
          <input
            className="busca"
            placeholder="Buscar produtos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* PRODUTOS */}
      <section className="produtos-section">
        <p className="produtos-titulo">
          {busca
            ? `${produtosFiltrados.length} resultado${produtosFiltrados.length !== 1 ? "s" : ""}`
            : "Coleção"}
        </p>

        {produtosFiltrados.length === 0 ? (
          <div className="empty-state">
            <span>🎀</span>
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="produtos">
            {produtosFiltrados.map(p => (
              <div className="card" key={p.id}>
                <div className="card-img-wrap">
                  <img
                    src={p.foto || "https://placehold.co/300x300/fce8f1/e07ba0?text=🎀"}
                    alt={p.nome}
                  />
                  {p.estoque <= 0 && (
                    <div className="card-badge-esgotado">Esgotado</div>
                  )}
                </div>
                <div className="card-body">
                  <h3>{p.nome}</h3>
                  <p className="card-preco">R$ {Number(p.preco || 0).toFixed(2)}</p>
                  <p className={`card-estoque ${p.estoque <= 0 ? "esgotado" : ""}`}>
                    {p.estoque > 0 ? `${p.estoque} disponíveis` : "Sem estoque"}
                  </p>
                  <button
                    disabled={p.estoque <= 0}
                    onClick={() => adicionar(p)}
                  >
                    {p.estoque > 0 ? "Adicionar ao carrinho" : "Esgotado"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NOSSA HISTÓRIA */}
      <section className="historia-section">
        <div className="historia-inner">
          <div className="historia-img-wrap">
            <img src="/vitoria.png" alt="Vitória de Melo Souza" className="historia-foto" />
            <div className="historia-img-detalhe" />
          </div>
          <div className="historia-texto">
            <span className="historia-label">Nossa história</span>
            <h2 className="historia-titulo">
              Tudo começa com<br /><em>amor e um laço</em>
            </h2>
            <p>
              Me chamo <strong>Vitória de Melo Souza</strong> e desde pequena sempre fui apaixonada
              por coisas bonitas, delicadas e feitas à mão. O que começou como um hobby
              nas horas vagas logo se transformou em muito mais do que eu imaginava.
            </p>
            <p>
              Cada laço que crio carrega um pedacinho do meu coração. Escolho os tecidos
              com cuidado, cuido de cada detalhe com capricho, porque sei que do outro lado
              existe uma mãe, uma filha, uma pessoa especial que merece o melhor.
            </p>
            <p>
              O Ateliê Vi Laços nasceu da vontade de transformar carinho em arte —
              e arte em memórias que durem para sempre. 🎀
            </p>
            <a
              href="https://www.instagram.com/vii.lacos"
              target="_blank"
              rel="noreferrer"
              className="historia-insta"
            >
              Me acompanhe no Instagram ✨
            </a>
          </div>
        </div>
      </section>

      {/* OVERLAY */}
      <div
        className={`carrinho-overlay ${carrinhoAberto ? "open" : ""}`}
        onClick={() => setCarrinhoAberto(false)}
      />

      {/* CARRINHO LATERAL */}
      <div className={`carrinho ${carrinhoAberto ? "open" : ""}`}>
        <div className="carrinho-header">
          <h3>🛒 Carrinho {totalItens > 0 && `(${totalItens})`}</h3>
          <button className="carrinho-close" onClick={() => setCarrinhoAberto(false)}>✕</button>
        </div>

        <div className="carrinho-items">
          {carrinho.length === 0 ? (
            <div className="carrinho-vazio">
              <span>🎀</span>
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.id} className="item-carrinho">
                <img
                  src={item.foto || "https://placehold.co/60x60/fce8f1/e07ba0?text=🎀"}
                  alt={item.nome}
                />
                <div className="item-info">
                  <p className="item-nome">{item.nome}</p>
                  <p className="item-preco-unit">R$ {Number(item.preco).toFixed(2)} cada</p>
                </div>
                <div className="qtd">
                  <button onClick={() => diminuir(item)}>−</button>
                  <span>{item.q}</span>
                  <button onClick={() => aumentar(item)}>+</button>
                </div>
                <button className="remover" onClick={() => remover(item.id)}>🗑</button>
              </div>
            ))
          )}
        </div>

        {carrinho.length > 0 && (
          <div className="carrinho-footer">
            <div className="total-row">
              <span className="total-label">Total</span>
              <span className="total-valor">R$ {total.toFixed(2)}</span>
            </div>
            <button className="finalizar" onClick={finalizarCompra}>
              Finalizar compra
            </button>
          </div>
        )}
      </div>

      {/* BOTÃO FLUTUANTE DO CARRINHO */}
      <button className="carrinho-toggle" onClick={() => setCarrinhoAberto(true)}>
        🛒
        {totalItens > 0 && (
          <span className="carrinho-badge">{totalItens}</span>
        )}
      </button>

      {/* TOAST */}
      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.msg}</div>
    </>
  );
}
