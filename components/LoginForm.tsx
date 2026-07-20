"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError = "" }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const cleanUsername = username.trim().toLowerCase();
    const loginDomain = process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "iade.local";

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${cleanUsername}@${loginDomain}`,
      password,
    });

    if (signInError) {
      setError("Kullanıcı adı veya şifre hatalı.");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">İT</div>
        <p className="eyebrow">HEKA OPERASYON</p>
        <h1>İade Takip Sistemi</h1>
        <p className="muted">İade girişlerini, teslim durumunu ve kontrol sonucunu tek ekrandan yönetin.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Kullanıcı adı
            <input
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Örn. depo"
              pattern="[a-zA-Z0-9._-]+"
              required
            />
          </label>

          <label>
            Şifre
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="alert error">{error}</div>}

          <button className="button primary full" disabled={submitting} type="submit">
            {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
