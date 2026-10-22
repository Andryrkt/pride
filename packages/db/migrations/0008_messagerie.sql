-- Messagerie des membres : assistant automatique et transmission aux responsables.
CREATE TYPE "public"."message_recipient" AS ENUM('ASSISTANT', 'TRESORIER', 'SECRETARIAT', 'COORDONNATEUR', 'COMMISSION_SOCIALE');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('MEMBRE', 'ASSISTANT', 'EQUIPE');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"member_id" text NOT NULL,
	"recipient" "message_recipient" NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sender" "message_sender" DEFAULT 'MEMBRE' NOT NULL,
	"member_read_at" timestamp with time zone,
	"staff_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"conversation_id" text NOT NULL,
	"sender" "message_sender" NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"links" jsonb,
	"chips" text,
	"attachment_key" text,
	"attachment_name" text,
	"attachment_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_member_recipient_uq" ON "conversations" USING btree ("member_id","recipient");--> statement-breakpoint
CREATE INDEX "conversations_last_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");