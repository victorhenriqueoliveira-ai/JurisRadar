ALTER TABLE "users" ADD COLUMN "system_role" text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token_expires_at" timestamp;
