import type { DevAction } from "@/types/dashboard";

/** Sample dev actions for DevActionCard testing. Seed decide-pending or use directly in Decide Inbox. */
export const mockDevActions: DevAction[] = [
  {
    id: "dev-1",
    category: "dev",
    actionType: "add_dependency",
    title: "Add zod for schema validation",
    description: "Add zod@3.22.4 to backend-api for request/response validation.",
    reasoning:
      "Current validation is manual and error-prone. Zod provides type-safe schemas with clear error messages. Alternatives: io-ts (heavier), yup (less TS-friendly). Zod is the standard in our stack.",
    implications: [
      "package.json change in backend-api",
      "~50KB bundle increase (tree-shakeable)",
      "Existing validation logic in 3 files will be replaced",
    ],
    projectId: "proj-1",
    riskLevel: "low",
    status: "pending",
    createdAt: "2025-01-29T09:30:00Z",
    devPayload: {
      type: "add_dependency",
      packageName: "zod",
    },
  },
  {
    id: "dev-2",
    category: "dev",
    actionType: "architecture_change",
    title: "Split backend-api into gateway + worker services",
    description: "Extract async processing into a separate worker service with a queue.",
    reasoning:
      "P99 spikes correlate with batch jobs. Separating sync (gateway) from async (worker) will isolate latency. Considered: same process with worker threads (complex), cron (no real-time). Queue-based worker is cleaner.",
    implications: [
      "New repo: backend-worker",
      "New infra: Redis or SQS for queue",
      "Deployment pipeline changes",
      "Data flow changes in 12 files",
    ],
    projectId: "proj-1",
    riskLevel: "high",
    status: "pending",
    createdAt: "2025-01-29T08:15:00Z",
    devPayload: {
      type: "architecture_change",
    },
  },
  {
    id: "dev-3",
    category: "dev",
    actionType: "external_api",
    title: "Integrate Stripe for subscription billing",
    description: "Add Stripe API for checkout and webhook handling.",
    reasoning:
      "User requested subscription model. Stripe is the standard; alternatives (Paddle, LemonSqueezy) add another vendor. Stripe has the best docs and webhook reliability.",
    implications: [
      "New env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
      "New routes: /api/checkout, /api/webhooks/stripe",
      "Database schema: subscriptions table",
      "Auth/payment touch — requires security review",
    ],
    projectId: "proj-1",
    riskLevel: "critical",
    status: "pending",
    createdAt: "2025-01-28T16:00:00Z",
    devPayload: {
      type: "external_api",
    },
  },
];
