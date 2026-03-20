import { BrowserRouter, Routes, Route } from "react-router-dom";
import Loja from "./Loja";
import Admin from "./Admin";
import Login from "./Login";
import { useState } from "react";

function AdminPage() {
  const [logado, setLogado] = useState(
    localStorage.getItem("admin") === "true"
  );

  if (!logado) return <Login setAdmin={setLogado} />;
  return <Admin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Loja />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}