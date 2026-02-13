/**
 * Unified persistence layer for The Nightly Build.
 *
 * Provides `kv` — a key-value store that:
 *   - In development (or when no DB URL is set): uses local filesystem (.data/*.json)
 *   - In production: uses Supabase (preferred) or Turso (libSQL)
 *
 * All existing store files migrate from raw fs.readFile/fs.writeFile to these
 * functions with minimal changes (same JSON semantics, same fallback behavior).
 *
 * Usage:
 *   import { kv } from "@/lib/db";
 *   const items = await kv.get<MyType[]>("my-store") ?? [];
 *   await kv.set("my-store", items);
 *   await kv.append("audit-log", jsonLine);
 */

import { FileAdapter } from "./adapters/file";
import { SupabaseAdapter } from "./adapters/supabase";
import { TursoAdapter } from "./adapters/turso";

export interface KVAdapter {
  /** Read a JSON value by key. Returns null if not found. */
  get<T = unknown>(key: string): Promise<T | null>;
  /** Write a JSON value by key (full overwrite). */
  set<T = unknown>(key: string, value: T): Promise<void>;
  /** Append a line to a JSONL log (for append-only stores). */
  append(key: string, line: string): Promise<void>;
  /** Read all lines from a JSONL log. */
  readLines(key: string): Promise<string[]>;
  /** Delete a key. */
  del(key: string): Promise<void>;
  /** Check if adapter is using a real database (vs filesystem). */
  isDatabase(): boolean;
}

// ─── Singleton ───────────────────────────────────────────

let _adapter: KVAdapter | null = null;

function getAdapter(): KVAdapter {
  if (_adapter) return _adapter;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (supabaseUrl && supabaseKey) {
    _adapter = new SupabaseAdapter(supabaseUrl, supabaseKey);
    console.log("[db] Using Supabase database");
  } else if (tursoUrl) {
    _adapter = new TursoAdapter(tursoUrl, tursoToken ?? "");
    console.log("[db] Using Turso database");
  } else {
    _adapter = new FileAdapter();
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[db] WARNING: Using filesystem adapter in production. " +
          "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or TURSO_DATABASE_URL for a persistent database."
      );
    }
  }

  return _adapter;
}

/**
 * The key-value store. Use this everywhere instead of raw fs operations.
 *
 * In development: reads/writes to .data/*.json files (same as before).
 * In production: reads/writes to Supabase or Turso when configured.
 */
export const kv: KVAdapter = new Proxy({} as KVAdapter, {
  get(_, prop: keyof KVAdapter) {
    const adapter = getAdapter();
    const method = adapter[prop];
    if (typeof method === "function") {
      return method.bind(adapter);
    }
    return method;
  },
});

// Re-export types
export type { KVAdapter as Adapter };
