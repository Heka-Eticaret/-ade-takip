"use client";

import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  // Only initialize on client side
  if (typeof window === "undefined") {
    return null;
  }

  // Lazy initialization
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Return a dummy client during build/SSR - real client will be created on first actual client render
      console.warn("Supabase credentials not available during build");
      return null;
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}

// Backward compatibility export
export const supabase = {
  auth: {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const client = getSupabaseClient();
      if (!client) {
        return { error: new Error("Supabase not initialized") };
      }
      return client.auth.signInWithPassword(credentials);
    },
    signOut: async () => {
      const client = getSupabaseClient();
      if (!client) {
        return { error: new Error("Supabase not initialized") };
      }
      return client.auth.signOut();
    },
  },
  from: (table: string) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase not initialized");
    }
    return client.from(table);
  },
  channel: (name: string) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase not initialized");
    }
    return client.channel(name);
  },
  removeChannel: async (channel: any) => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    return client.removeChannel(channel);
  },
} as any;
