CREATE TYPE "public"."ai_report_kind" AS ENUM('audit_plan', 'comparison', 'keyword_insight');--> statement-breakpoint
CREATE TYPE "public"."audit_kind" AS ENUM('onpage', 'psi', 'full');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('content', 'technical', 'mobile', 'cwv', 'schema', 'aio');--> statement-breakpoint
CREATE TYPE "public"."finding_severity" AS ENUM('critical', 'warning', 'info', 'pass');--> statement-breakpoint
CREATE TYPE "public"."keyword_source" AS ENUM('manual', 'gsc');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('active', 'down', 'suspended', 'blocked', 'parked', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."rank_provider" AS ENUM('gsc', 'scrape', 'serper');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "ai_report_kind" NOT NULL,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"content" text,
	"structured" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternative_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"current_status" "link_status" DEFAULT 'unknown' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_status_change_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"category" "finding_category" NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"recommendation" text
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"kind" "audit_kind" NOT NULL,
	"status" "audit_status" DEFAULT 'pending' NOT NULL,
	"score" integer,
	"summary" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"competitor_id" uuid NOT NULL,
	"metrics" jsonb,
	"ai_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"date" date NOT NULL,
	"query" text NOT NULL,
	"page" text NOT NULL,
	"device" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"message" text,
	"metadata" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"source" "keyword_source" DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alternative_link_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "link_status" NOT NULL,
	"http_status" integer,
	"latency_ms" integer,
	"final_url" text,
	"evidence" jsonb,
	"is_heartbeat" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rank_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword_id" uuid NOT NULL,
	"captured_at" date NOT NULL,
	"device" text NOT NULL,
	"position" integer,
	"found_url" text,
	"serp_features" jsonb,
	"ai_overview_present" boolean,
	"ai_overview_cited" boolean,
	"ai_overview_sources" jsonb,
	"provider" "rank_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"primary_url" text NOT NULL,
	"gsc_property_url" text,
	"locale" text DEFAULT 'id' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alternative_links" ADD CONSTRAINT "alternative_links_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_daily" ADD CONSTRAINT "gsc_daily_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_checks" ADD CONSTRAINT "link_checks_alternative_link_id_alternative_links_id_fk" FOREIGN KEY ("alternative_link_id") REFERENCES "public"."alternative_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rank_snapshots" ADD CONSTRAINT "rank_snapshots_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_reports_kind_idx" ON "ai_reports" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "alternative_links_website_id_idx" ON "alternative_links" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "audit_findings_audit_id_idx" ON "audit_findings" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "audits_website_id_idx" ON "audits" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "comparisons_website_id_idx" ON "comparisons" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "competitors_website_id_idx" ON "competitors" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "gsc_daily_website_date_idx" ON "gsc_daily" USING btree ("website_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_daily_unique" ON "gsc_daily" USING btree ("website_id","date","query","page","device");--> statement-breakpoint
CREATE INDEX "job_runs_job_name_idx" ON "job_runs" USING btree ("job_name");--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_website_phrase_key" ON "keywords" USING btree ("website_id","phrase");--> statement-breakpoint
CREATE INDEX "keywords_website_id_idx" ON "keywords" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "link_checks_alt_link_id_idx" ON "link_checks" USING btree ("alternative_link_id");--> statement-breakpoint
CREATE INDEX "link_checks_checked_at_idx" ON "link_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rank_snapshots_key" ON "rank_snapshots" USING btree ("keyword_id","captured_at","device","provider");--> statement-breakpoint
CREATE INDEX "rank_snapshots_keyword_device_idx" ON "rank_snapshots" USING btree ("keyword_id","device","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_user_key" ON "settings" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "websites_user_id_idx" ON "websites" USING btree ("user_id");