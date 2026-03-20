import { useState } from "react";
import axios from "axios";

export default function Login({ setAdmin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await axios.post("https://vilacos-server.onrender.com/login", { user, pass });
      if (r.data.ok) {
        localStorage.setItem("admin", "true");
        setAdmin(true);
      } else {
        setErro("Usuário ou senha incorretos");
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao conectar ao servidor");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fdf7f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "20px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:wght@300;400;500&display=swap');
        .login-input {
          width: 100%; padding: 12px 16px;
          border: 1px solid rgba(244,167,195,0.35);
          border-radius: 12px;
          background: #fdf7f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #3a2530;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .login-input:focus { border-color: #f4a7c3; background: white; }
        .login-input::placeholder { color: #9a7a87; }
        .login-btn {
          width: 100%;
          background: linear-gradient(135deg, #f9a8d4, #e879a0);
          color: white; border: none;
          padding: 13px; border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          cursor: pointer; letter-spacing: 0.04em;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(232,121,160,0.35);
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 6px 22px rgba(232,121,160,0.55);
          transform: translateY(-1px);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>

      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "44px 40px",
        width: "100%", maxWidth: "380px",
        border: "1px solid rgba(244,167,195,0.2)",
        boxShadow: "0 10px 50px rgba(224,123,160,0.12)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎀</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "26px", fontWeight: 600,
            color: "#3a2530", marginBottom: "6px"
          }}>Painel Admin</h2>
          <p style={{ fontSize: "13px", color: "#9a7a87" }}>Ateliê Vi Laços</p>
        </div>

        <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            className="login-input"
            placeholder="Usuário"
            value={user}
            onChange={e => setUser(e.target.value)}
            autoComplete="username"
          />
          <input
            className="login-input"
            type="password"
            placeholder="Senha"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete="current-password"
          />

          {erro && (
            <p style={{
              fontSize: "13px", color: "#c0392b",
              background: "#fef0f0", padding: "10px 14px",
              borderRadius: "10px", textAlign: "center"
            }}>{erro}</p>
          )}

          <button type="submit" className="login-btn" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
