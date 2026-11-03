-- Documents officiels : statuts, règlement intérieur, procès-verbaux, rapports (versions archivées, jamais supprimées).
CREATE TABLE "official_documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"adopted_on" date,
	"visibility" "visibility" DEFAULT 'PUBLIC' NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"published_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "official_documents_kind_idx" ON "official_documents" USING btree ("kind","archived_at");