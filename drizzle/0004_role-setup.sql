ALTER TYPE "public"."game_state" ADD VALUE 'SETUP' BEFORE 'READY';--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN "variant_code" text;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN "target_player_ids" jsonb DEFAULT 
                            '[]'::jsonb
                         NOT NULL;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN "setup_completed" boolean DEFAULT true NOT NULL;