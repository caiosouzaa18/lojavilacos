import { useEffect, useState } from "react";
import axios from "axios";
import "./admin.css";

const API = "http://localhost:3001";

export default function Admin() {
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [foto, setFoto] = useState(null);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const res = await axios.get(`${API}/produtos`);
      setProdutos(res.data);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar produtos");
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!nome || !preco) return alert("Preencha nome e preço");

    setCarregando(true);
    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("preco", preco);
    formData.append("estoque", estoque);
    if (foto) formData.append("foto", foto);

    try {
      if (editando) {
        await axios.put(`${API}/produtos/${editando}`, formData);
      } else {
        await axios.post(`${API}/produtos`, formData);
      }
      limpar();
      carregar();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar produto");
    } finally {
      setCarregando(false);
    }
  }

  function editar(p) {
    setNome(p.nome);
    setPreco(p.preco);
    setEstoque(p.estoque);
    setFoto(null);
    setEditando(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(id, nomeProduto) {
    if (!window.confirm(`Excluir "${nomeProduto}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`${API}/produtos/${id}`);
      carregar();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir produto");
    }
  }

  function limpar() {
    setNome(""); setPreco(""); setEstoque(""); setFoto(null); setEditando(null);
  }

  function sair() {
    localStorage.removeItem("admin");
    window.location.reload();
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🎀 Painel Admin</h1>
        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>

      {/* FORM */}
      <div className="form-card">
        <h2>{editando ? "✏️ Editar produto" : "➕ Novo produto"}</h2>
        <form onSubmit={salvar} className="form">
          <input
            placeholder="Nome do produto"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
          <input
            placeholder="Preço (ex: 29.90)"
            value={preco}
            onChange={e => setPreco(e.target.value)}
          />
          <input
            placeholder="Estoque"
            type="number"
            min="0"
            value={estoque}
            onChange={e => setEstoque(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            onChange={e => setFoto(e.target.files[0])}
          />
          <div className="form-actions">
            <button type="submit" className="btn-salvar" disabled={carregando}>
              {carregando ? "Salvando..." : editando ? "Atualizar produto" : "Cadastrar produto"}
            </button>
            {editando && (
              <button type="button" className="btn-cancelar" onClick={limpar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LISTA */}
      <div className="lista-header">
        <h2>Produtos</h2>
        <span className="lista-count">{produtos.length} item{produtos.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="lista">
        {produtos.length === 0 ? (
          <div className="lista-vazia">
            <span>🎀</span>
            <p>Nenhum produto cadastrado ainda</p>
          </div>
        ) : (
          produtos.map(p => (
            <div key={p.id} className="item">
              <img
                src={p.foto || "https://placehold.co/64x64/fce8f1/e07ba0?text=🎀"}
                alt={p.nome}
              />
              <div className="item-info">
                <h3>{p.nome}</h3>
                <span className="preco">R$ {Number(p.preco || 0).toFixed(2)}</span>
                <span className={`estoque-badge ${p.estoque <= 0 ? "zero" : ""}`}>
                  {p.estoque > 0 ? `${p.estoque} em estoque` : "Esgotado"}
                </span>
              </div>
              <div className="acoes">
                <button className="btn-editar" onClick={() => editar(p)}>Editar</button>
                <button className="btn-excluir" onClick={() => excluir(p.id, p.nome)}>Excluir</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
