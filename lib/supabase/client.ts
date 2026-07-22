"use client";

import {
  createClient,
  type AuthChangeEvent,
  type RealtimeChannel,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseInitError: Error | null = null;

export function getSupabaseClient() {
  // Only initialize on client side
  if (typeof window === "undefined") {
    return null;
  }

  // Lazy initialization
  if (!supabaseInstance && !supabaseInitError) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      supabaseInitError = new Error(
        "Supabase credentials not available. Please check your environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
      console.error(supabaseInitError.message);
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

// Backward compatibility export - throws only in client context
export const supabase = {
  auth: {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const client = getSupabaseClient();
      if (!client) {
        return { error: new Error("Supabase not initialized. Check environment variables.") };
      }
      return client.auth.signInWithPassword(credentials);
    },
    getSession: async () => {
      const client = getSupabaseClient();
      if (!client) {
        return { data: { session: null } };
      }
      return client.auth.getSession();
    },
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      const client = getSupabaseClient();
      if (!client) {
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return client.auth.onAuthStateChange(callback);
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
      // Return a mock query builder that won't break
      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }) }),
          order: () => ({ data: null, error: new Error("Supabase not initialized") }),
          subscribe: () => ({ unsubscribe: () => {} }),
        }),
        insert: () => Promise.resolve({ error: new Error("Supabase not initialized") }),
        update: () => ({
          eq: () => Promise.resolve({ error: new Error("Supabase not initialized") }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: new Error("Supabase not initialized") }),
        }),
      } as unknown as ReturnType<SupabaseClient["channel"]>;
    }
    return client.from(table);
  },
  channel: (name: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return {
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
      } as unknown as ReturnType<SupabaseClient["channel"]>;
    }
    return client.channel(name);
  },
  removeChannel: async (channel: RealtimeChannel) => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    return client.removeChannel(channel);
  },
} as unknown as SupabaseClient;
