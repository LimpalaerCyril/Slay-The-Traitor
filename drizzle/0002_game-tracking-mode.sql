CREATE TYPE "public"."game_tracking_mode" AS ENUM('MANUAL', 'STS2');--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tracking_mode" "game_tracking_mode" DEFAULT 'MANUAL' NOT NULL;