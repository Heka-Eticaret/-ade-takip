"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LoginForm } from "@/components/LoginForm";
import { ReturnDashboard } from "@/components/ReturnDashboard";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    setSession(activeSession);
    setError("");

    if (!activeSession) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, full_name, role")
      .eq("id", activeSession.user.id)
      .single();

    if (profileError || !data) {
      setProfile(null);
      setError("Kullanıcı profili bulunamadı. Yönetici kullanıcı kurulumunu kontrol edin.");
      setLoading(false);
      return;
    }

    setProfile(data as Profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (mounted) void loadProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      if (mounted) void loadProfile(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  if (loading) {
    return (
      <main className="center-screen">
        <div className="loader" aria-label="Yükleniyor" />
        <p>İade sistemi açılıyor…</p>
      </main>
    );
  }

  if (!session || !profile) {
    return <LoginForm initialError={error} />;
  }

  return <ReturnDashboard profile={profile} />;
}
