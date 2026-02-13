/**
 * Supabase adapter — reads/writes JSON to Supabase (PostgreSQL).
 * Use when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
 *
 * Run the schema SQL once in Supabase Dashboard → SQL Editor (see docs/DEPLOY-VERCEL.md).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { KVAdapter } from "../index";

type KvStoreRow = { key: string; value: string; updated_at: string };
type KvLogRow = { id: number; key: string; line: string; created_at: string };

export class SupabaseAdapter implements KVAdapter {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const { data, error } = await this.client
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) throw new Error(`[db/supabase] get: ${error.message}`);
    if (data == null) return null;

    try {
      return JSON.parse((data as { value: string }).value) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    const now = new Date().toISOString();

    const { error } = await this.client.from("kv_store").upsert(
      { key, value: json, updated_at: now } as KvStoreRow,
      { onConflict: "key" }
    );

    if (error) throw new Error(`[db/supabase] set: ${error.message}`);
  }

  async append(key: string, line: string): Promise<void> {
    const cleanLine = line.endsWith("\n") ? line.slice(0, -1) : line;

    const { error } = await this.client.from("kv_logs").insert({
      key,
      line: cleanLine,
    } as Omit<KvLogRow, "id" | "created_at">);

    if (error) throw new Error(`[db/supabase] append: ${error.message}`);
  }

  async readLines(key: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("kv_logs")
      .select("line")
      .eq("key", key)
      .order("id", { ascending: true });

    if (error) throw new Error(`[db/supabase] readLines: ${error.message}`);
    return (data ?? []).map((row) => (row as { line: string }).line);
  }

  async del(key: string): Promise<void> {
    await this.client.from("kv_store").delete().eq("key", key);
    await this.client.from("kv_logs").delete().eq("key", key);
  }

  isDatabase(): boolean {
    return true;
  }
}
