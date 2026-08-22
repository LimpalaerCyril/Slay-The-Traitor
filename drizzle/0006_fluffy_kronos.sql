CREATE TYPE "public"."game_event_source" AS ENUM('DISCORD', 'MANUAL', 'MOD', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."game_event_validation_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"event_type" text NOT NULL,
	"act_number" integer,
	"actor_player_id" text,
	"target_player_id" text,
	"payload" jsonb DEFAULT 
                            '{}'::jsonb
                         NOT NULL,
	"source" "game_event_source" NOT NULL,
	"validation_status" "game_event_validation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_events_act_number_valid" CHECK (
                    "game_events"."act_number"
                    IS NULL
                    OR (
                        "game_events"."act_number" >= 1
                        AND "game_events"."act_number" <= 3
                    )
                )
);
--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_events_game_created_at_idx" ON "game_events" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "game_events_game_type_idx" ON "game_events" USING btree ("game_id","event_type");