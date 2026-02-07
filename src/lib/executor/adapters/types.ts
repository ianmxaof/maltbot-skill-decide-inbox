/**
 * Executor adapter interface: platform-specific execution (e.g. Moltbook).
 * PowerCoreExecutor routes heartbeat, execute, and pending to the active adapter.
 */

export interface ExecutorHeartbeatOptions {
  mode?: string;
  adapter?: string;
}

export interface ExecutorHeartbeatResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  result?: unknown;
  stats?: unknown;
}

export interface ExecutorExecuteOptions {
  id: string;
  approvedBy?: string;
  adapter?: string;
}

export interface ExecutorExecuteResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ExecutorPendingItem {
  id: string;
  category: string;
  title: string;
  [key: string]: unknown;
}

export interface ExecutorPendingResult {
  success: boolean;
  items: ExecutorPendingItem[];
  error?: string;
}

export interface ExecutorAdapter {
  readonly name: string;

  /** Run one heartbeat (e.g. autopilot cycle). */
  heartbeat(options?: ExecutorHeartbeatOptions): Promise<ExecutorHeartbeatResult>;

  /** Execute a pending action by id. */
  execute(options: ExecutorExecuteOptions): Promise<ExecutorExecuteResult>;

  /** List pending items (e.g. for Decide Inbox). */
  listPending(): Promise<ExecutorPendingResult>;
}
