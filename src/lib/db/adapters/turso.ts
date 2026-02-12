/**
 * Turso adapter — reads/writes JSON to a Turso (libSQL) database.
 * Production adapter for serverless environments where the filesystem is ephemeral.
 *
 * Schema (auto-created on first use):
 *   kv_store: key TEXT PK, value TEXT, updated_at TEXT
 *   kv_logs:  key TEXT, line TEXT, seq INTEGER, created_at TEXT
 */

import { createClient, type Client } from "@libsql/client";
import type { KVAdapter } from "../index";

export class TursoAdapter implements KVAdapter {
  private client: Client;
  private initialized = false;

  constructor(url: string, authToken?: string) {
    this.client = createClient({
      url,
      authToken,
    });
  }

  private async ensureSchema(): Promise<void> {
    if (this.initialized) return;

    await this.client.batch([
      `CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS kv_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        line TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_kv_logs_key ON kv_logs(key)`,
    ]);

    this.initialized = true;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    await this.ensureSchema();

    const result = await this.client.execute({
      sql: "SELECT value FROM kv_store WHERE key = ?",
      args: [key],
    });

    if (result.rows.length === 0) return null;

    try {
      return JSON.parse(result.rows[0].value as string) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.ensureSchema();

    const json = JSON.stringify(value);
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, json, now],
    });
  }

  async append(key: string, line: string): Promise<void> {
    await this.ensureSchema();

    const cleanLine = line.endsWith("\n") ? line.slice(0, -1) : line;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: "INSERT INTO kv_logs (key, line, created_at) VALUES (?, ?, ?)",
      args: [key, cleanLine, now],
    });
  }

  async readLines(key: string): Promise<string[]> {
    await this.ensureSchema();

    const result = await this.client.execute({
      sql: "SELECT line FROM kv_logs WHERE key = ? ORDER BY id ASC",
      args: [key],
    });

    return result.rows.map((row) => row.line as string);
  }

  async del(key: string): Promise<void> {
    await this.ensureSchema();

    await this.client.batch([
      { sql: "DELETE FROM kv_store WHERE key = ?", args: [key] },
      { sql: "DELETE FROM kv_logs WHERE key = ?", args: [key] },
    ]);
  }

  isDatabase(): boolean {
    return true;
  }
}
