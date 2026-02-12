/**
 * Unified persistence layer for The Nightly Build.
 *
 * Provides `kv` — a key-value store that:
 *   - In development (or when TURSO_DATABASE_URL is unset): uses local filesystem (.data/*.json)
 *   - In production: uses Turso (libSQL at the edge)
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

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    _adapter = new TursoAdapter(tursoUrl, tursoToken);
    console.log("[db] Using Turso database");
  } else {
    _adapter = new FileAdapter();
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[db] WARNING: Using filesystem adapter in production. " +
        "Set TURSO_DATABASE_URL to use a persistent database."
      );
    }
  }

  return _adapter;
}

/**
 * The key-value store. Use this everywhere instead of raw fs operations.
 *
 * In development: reads/writes to .data/*.json files (same as before).
 * In production: reads/writes to Turso (libSQL at the edge).
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
