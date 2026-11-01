"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError = "" }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="password-input-wrapper">
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && (
            <div className="alert error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button className="button primary full" disabled={submitting} type="submit">
            {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
