CREATE TABLE "activity_days" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "activity_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_days_day_idx" ON "activity_days" USING btree ("day");--> statement-breakpoint
-- Point de départ : les sessions encore ouvertes (jour de la dernière activité, heure de Madagascar).
INSERT INTO "activity_days" ("user_id", "day")
SELECT DISTINCT "user_id", ("updated_at" AT TIME ZONE 'Indian/Antananarivo')::date FROM "session"
ON CONFLICT DO NOTHING;
