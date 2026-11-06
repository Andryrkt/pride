CREATE TABLE "personal_budget_entries" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"day" date NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_budget_goals" (
	"member_id" text PRIMARY KEY NOT NULL,
	"monthly_saving" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_budget_entries" ADD CONSTRAINT "personal_budget_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_budget_goals" ADD CONSTRAINT "personal_budget_goals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_budget_entries_member_day_idx" ON "personal_budget_entries" USING btree ("member_id","day");