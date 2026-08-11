CREATE TYPE "public"."game_state" AS ENUM('LOBBY', 'READY', 'ACTIVE', 'VOTING', 'FINISHED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."objective_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."objective_type" AS ENUM('PRIMARY', 'SECONDARY');--> statement-breakpoint
CREATE TABLE "game_players" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"discord_user_id" text NOT NULL,
	"character_slug" text NOT NULL,
	"alive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "game_players_pk" PRIMARY KEY("game_id","player_id"),
	CONSTRAINT "game_players_discord_user_unique" UNIQUE("game_id","discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"text_channel_id" text NOT NULL,
	"voice_channel_id" text,
	"lobby_message_id" text,
	"host_discord_user_id" text NOT NULL,
	"seed" text NOT NULL,
	"state" "game_state" DEFAULT 'LOBBY' NOT NULL,
	"contradiction" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objective_assignments" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"objective_type" "objective_type" NOT NULL,
	"objective_code" text NOT NULL,
	"progress_current" integer DEFAULT 0 NOT NULL,
	"progress_target" integer NOT NULL,
	"status" "objective_status" DEFAULT 'PENDING' NOT NULL,
	CONSTRAINT "objective_assignments_pk" PRIMARY KEY("game_id","player_id","objective_type"),
	CONSTRAINT "objective_progress_current_non_negative" CHECK (
          "objective_assignments"."progress_current" >= 0
        ),
	CONSTRAINT "objective_progress_target_positive" CHECK (
          "objective_assignments"."progress_target" > 0
        )
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"role_code" text NOT NULL,
	CONSTRAINT "role_assignments_pk" PRIMARY KEY("game_id","player_id"),
	CONSTRAINT "role_assignments_role_unique" UNIQUE("game_id","role_code")
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD CONSTRAINT "objective_assignments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD CONSTRAINT "objective_assignments_player_fk" FOREIGN KEY ("game_id","player_id") REFERENCES "public"."game_players"("game_id","player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_player_fk" FOREIGN KEY ("game_id","player_id") REFERENCES "public"."game_players"("game_id","player_id") ON DELETE no action ON UPDATE no action;