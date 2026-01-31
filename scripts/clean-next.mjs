#!/usr/bin/env node
import { rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(root, ".next");
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Deleted .next");
} else {
  console.log(".next not found");
}
