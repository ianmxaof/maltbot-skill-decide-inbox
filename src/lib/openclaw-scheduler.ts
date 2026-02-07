/**
 * OpenClaw scheduled tasks (cron-like).
 * Jobs stored in OPENCLAW_DIR/schedule.json. Run due jobs via API (external cron or heartbeat).
 */

import * as fs from "fs/promises";
import * as path from "path";
import CronExpressionParser from "cron-parser";
import { OPENCLAW_DIR } from "./openclaw-config";

export const SCHEDULE_PATH = path.join(OPENCLAW_DIR, "schedule.json");

export type ScheduledJobType =
  | "daily_briefing"
  | "weekly_report"
  | "reminder"
  | "heartbeat"
  | "custom";

export interface ScheduledJob {
  id: string;
  type: ScheduledJobType;
  cron: string;
  label: string;
  config?: Record<string, unknown>;
  lastRun?: string;
  nextRun: string;
  enabled?: boolean;
}

const DEFAULT_JOBS: ScheduledJob[] = [];

async function readSchedule(): Promise<ScheduledJob[]> {
  try {
    const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
    const data = JSON.parse(raw) as { jobs?: ScheduledJob[] };
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    return jobs.map((j) => ({
      ...j,
      enabled: j.enabled !== false,
    }));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeSchedule(jobs: ScheduledJob[]): Promise<void> {
  await fs.mkdir(path.dirname(SCHEDULE_PATH), { recursive: true });
  await fs.writeFile(
    SCHEDULE_PATH,
    JSON.stringify({ jobs }, null, 2),
    "utf8"
  );
}

function nextRunFromCron(cron: string, after?: Date): string {
  try {
    const expr = CronExpressionParser.parse(cron, {
      currentDate: after ?? new Date(),
    });
    const next = expr.next().toDate();
    return next.toISOString();
  } catch {
    return new Date(Date.now() + 86400_000).toISOString();
  }
}

function isDue(job: ScheduledJob, now: Date): boolean {
  if (job.enabled === false) return false;
  return new Date(job.nextRun).getTime() <= now.getTime();
}

/** List all scheduled jobs, refreshing nextRun for each */
export async function listScheduledJobs(): Promise<ScheduledJob[]> {
  const jobs = await readSchedule();
  const now = new Date();
  const updated = jobs.map((j) => {
    const next = nextRunFromCron(
      j.cron,
      j.lastRun ? new Date(j.lastRun) : undefined
    );
    return { ...j, nextRun: next };
  });
  await writeSchedule(updated);
  return updated;
}

/** Add a job. id generated if not provided. */
export async function addScheduledJob(
  job: Omit<ScheduledJob, "id" | "nextRun"> & { id?: string }
): Promise<ScheduledJob> {
  const jobs = await readSchedule();
  const id =
    job.id ?? `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const nextRun = nextRunFromCron(job.cron);
  const newJob: ScheduledJob = {
    ...job,
    id,
    nextRun,
    enabled: job.enabled !== false,
  };
  jobs.push(newJob);
  await writeSchedule(jobs);
  return newJob;
}

/** Remove a job by id */
export async function removeScheduledJob(id: string): Promise<boolean> {
  const jobs = await readSchedule();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return false;
  jobs.splice(idx, 1);
  await writeSchedule(jobs);
  return true;
}

/** Get jobs that are due (nextRun <= now). Caller runs them and then markRun. */
export async function getDueJobs(): Promise<ScheduledJob[]> {
  const jobs = await listScheduledJobs();
  const now = new Date();
  return jobs.filter((j) => isDue(j, now));
}

/** Mark job as run and set next run */
export async function markJobRun(id: string): Promise<void> {
  const jobs = await readSchedule();
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  const now = new Date();
  job.lastRun = now.toISOString();
  job.nextRun = nextRunFromCron(job.cron, now);
  await writeSchedule(jobs);
}

/** Run due jobs: return list of job ids that were due. Caller should execute each (e.g. trigger briefing) and then markJobRun. */
export async function runDueJobs(): Promise<ScheduledJob[]> {
  const due = await getDueJobs();
  for (const j of due) {
    await markJobRun(j.id);
  }
  return due;
}
