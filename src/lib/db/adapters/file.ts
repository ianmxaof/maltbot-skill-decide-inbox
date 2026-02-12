/**
 * File adapter — reads/writes JSON to .data/*.json files.
 * This is the development/fallback adapter. It preserves the exact behavior
 * of the existing store files so the migration is seamless.
 */

import { promises as fs } from "fs";
import path from "path";
import type { KVAdapter } from "../index";

const DATA_DIR = path.join(process.cwd(), ".data");
const AUDIT_DIR = path.join(process.cwd(), ".audit");

export class FileAdapter implements KVAdapter {
  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private getFilePath(key: string): string {
    // Keys starting with "audit:" go to the .audit/ directory
    if (key.startsWith("audit:")) {
      const filename = key.slice(6); // remove "audit:" prefix
      return path.join(AUDIT_DIR, `${filename}.jsonl`);
    }
    // JSONL logs use .jsonl extension
    if (key.endsWith(".jsonl")) {
      return path.join(DATA_DIR, key);
    }
    return path.join(DATA_DIR, `${key}.json`);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
  }

  async append(key: string, line: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);
    const content = line.endsWith("\n") ? line : line + "\n";
    await fs.appendFile(filePath, content, "utf-8");
  }

  async readLines(key: string): Promise<string[]> {
    try {
      const filePath = this.getFilePath(key);
      const raw = await fs.readFile(filePath, "utf-8");
      return raw.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  async del(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, that's fine
    }
  }

  isDatabase(): boolean {
    return false;
  }
}
