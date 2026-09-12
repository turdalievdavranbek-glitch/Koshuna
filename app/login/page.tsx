"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { DEMO_OTP, useStore } from "@/lib/store";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const user = useStore((s) => s.user);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const [phone, setPhone] = useState("+996 ");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function sendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSent(true);
  }

  function onLogin(e: FormEvent) {
    e.preventDefault();
    const result = login(phone, code);
    if (!result.ok) {
      setError(result.error || "Не вышло");
      return;
    }
    router.push(next);
  }

  if (user) {
    return (
      <div>
        <div className="section-title">
          <h2>Профиль</h2>
        </div>
        <p>Вы вошли как <b>{user.phone}</b></p>
        <button className="primary" type="button" onClick={logout}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <h2>Вход по телефону</h2>
      </div>
      <p className="hero-note">
        Демо-вход: любой номер КР и код <b>{DEMO_OTP}</b>.
      </p>
      <form onSubmit={sent ? onLogin : sendCode}>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Телефон</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        {sent && (
          <label className="field">
            <span>Код из SMS</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" />
          </label>
        )}
        <button className="primary" type="submit">
          {sent ? "Войти" : "Получить код"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="empty">Загрузка…</div>}>
      <LoginForm />
    </Suspense>
  );
}
