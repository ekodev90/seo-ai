import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  date,
  uniqueIndex,
  index,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const linkStatusEnum = pgEnum("link_status", [
  "active",
  "down",
  "suspended",
  "blocked",
  "parked",
  "unknown",
]);

export const keywordSourceEnum = pgEnum("keyword_source", ["manual", "gsc"]);

export const auditKindEnum = pgEnum("audit_kind", ["onpage", "psi", "full"]);

export const auditStatusEnum = pgEnum("audit_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const findingCategoryEnum = pgEnum("finding_category", [
  "content",
  "technical",
  "mobile",
  "cwv",
  "schema",
  "aio",
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "critical",
  "warning",
  "info",
  "pass",
]);

export const aiReportKindEnum = pgEnum("ai_report_kind", [
  "audit_plan",
  "comparison",
  "keyword_insight",
]);

export const rankProviderEnum = pgEnum("rank_provider", ["gsc", "scrape", "serper"]);

// ── Better Auth Tables ───────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── Core ──────────────────────────────────────────────────────────────────────

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    primaryUrl: text("primary_url").notNull(),
    gscPropertyUrl: text("gsc_property_url"),
    locale: text("locale").notNull().default("id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("websites_user_id_idx").on(t.userId)]
);

export const alternativeLinks = pgTable(
  "alternative_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
    isPrimary: boolean("is_primary").notNull().default(false),
    currentStatus: linkStatusEnum("current_status").notNull().default("unknown"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastStatusChangeAt: timestamp("last_status_change_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("alternative_links_website_id_idx").on(t.websiteId)]
);

export const linkChecks = pgTable(
  "link_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alternativeLinkId: uuid("alternative_link_id")
      .notNull()
      .references(() => alternativeLinks.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    status: linkStatusEnum("status").notNull(),
    httpStatus: integer("http_status"),
    latencyMs: integer("latency_ms"),
    finalUrl: text("final_url"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    isHeartbeat: boolean("is_heartbeat").notNull().default(false),
  },
  (t) => [
    index("link_checks_alt_link_id_idx").on(t.alternativeLinkId),
    index("link_checks_checked_at_idx").on(t.checkedAt),
  ]
);

// ── Keywords & Rankings ───────────────────────────────────────────────────────

export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    phrase: text("phrase").notNull(),
    source: keywordSourceEnum("source").notNull().default("manual"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("keywords_website_phrase_key").on(t.websiteId, t.phrase),
    index("keywords_website_id_idx").on(t.websiteId),
  ]
);

export const rankSnapshots = pgTable(
  "rank_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => keywords.id, { onDelete: "cascade" }),
    capturedAt: date("captured_at").notNull(),
    device: text("device").notNull(), // 'mobile' | 'desktop'
    position: integer("position"), // null = not top 100
    foundUrl: text("found_url"),
    serpFeatures: jsonb("serp_features").$type<string[]>(),
    aiOverviewPresent: boolean("ai_overview_present"),
    aiOverviewCited: boolean("ai_overview_cited"),
    aiOverviewSources: jsonb("ai_overview_sources").$type<string[]>(),
    provider: rankProviderEnum("provider").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rank_snapshots_key").on(t.keywordId, t.capturedAt, t.device, t.provider),
    index("rank_snapshots_keyword_device_idx").on(t.keywordId, t.device, t.capturedAt),
  ]
);

export const gscDaily = pgTable(
  "gsc_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    query: text("query").notNull(),
    page: text("page").notNull(),
    device: text("device").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gsc_daily_website_date_idx").on(t.websiteId, t.date),
    uniqueIndex("gsc_daily_unique").on(t.websiteId, t.date, t.query, t.page, t.device),
  ]
);

// ── Audits ─────────────────────────────────────────────────────────────────────

export const audits = pgTable(
  "audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    targetUrl: text("target_url").notNull(),
    kind: auditKindEnum("kind").notNull(),
    status: auditStatusEnum("status").notNull().default("pending"),
    score: integer("score"),
    summary: jsonb("summary").$type<{
      totalFindings: number;
      critical: number;
      warning: number;
      info: number;
      pass: number;
    }>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audits_website_id_idx").on(t.websiteId)]
);

export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    category: findingCategoryEnum("category").notNull(),
    severity: findingSeverityEnum("severity").notNull(),
    message: text("message").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    recommendation: text("recommendation"),
  },
  (t) => [index("audit_findings_audit_id_idx").on(t.auditId)]
);

// ── Competitors ────────────────────────────────────────────────────────────────

export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("competitors_website_id_idx").on(t.websiteId)]
);

export const comparisons = pgTable(
  "comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    competitorId: uuid("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    metrics: jsonb("metrics").$type<Record<string, unknown>>(),
    aiReportId: uuid("ai_report_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comparisons_website_id_idx").on(t.websiteId)]
);

// ── AI Reports ─────────────────────────────────────────────────────────────────

export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: aiReportKindEnum("kind").notNull(),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    content: text("content"), // markdown
    structured: jsonb("structured").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_reports_kind_idx").on(t.kind)]
);

// ── Settings ───────────────────────────────────────────────────────────────────

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueEncrypted: text("value_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("settings_user_key").on(t.userId, t.key)]
);

// ── Job Activity Log ───────────────────────────────────────────────────────────

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull().default("started"), // 'started' | 'completed' | 'failed'
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("job_runs_job_name_idx").on(t.jobName)]
);
