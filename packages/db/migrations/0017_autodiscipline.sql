CREATE TYPE "public"."goal_status" AS ENUM('EN_COURS', 'ATTEINT', 'ABANDONNE');--> statement-breakpoint
CREATE TYPE "public"."review_kind" AS ENUM('JOUR', 'SEMAINE');--> statement-breakpoint
CREATE TABLE "discipline_goals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"title" text NOT NULL,
	"due_on" date,
	"status" "goal_status" DEFAULT 'EN_COURS' NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discipline_habit_checks" (
	"habit_id" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "discipline_habit_checks_habit_id_day_pk" PRIMARY KEY("habit_id","day")
);
--> statement-breakpoint
CREATE TABLE "discipline_habits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"title" text NOT NULL,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discipline_reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"kind" "review_kind" NOT NULL,
	"period_start" date NOT NULL,
	"wins" text,
	"blocks" text,
	"priority" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discipline_goals" ADD CONSTRAINT "discipline_goals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_habit_checks" ADD CONSTRAINT "discipline_habit_checks_habit_id_discipline_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."discipline_habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_habits" ADD CONSTRAINT "discipline_habits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_reviews" ADD CONSTRAINT "discipline_reviews_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discipline_goals_member_idx" ON "discipline_goals" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "discipline_habits_member_idx" ON "discipline_habits" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discipline_reviews_period_uq" ON "discipline_reviews" USING btree ("member_id","kind","period_start");