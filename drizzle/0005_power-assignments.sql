CREATE TABLE "power_assignments" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"power_code" text NOT NULL,
	"target_player_ids" jsonb DEFAULT 
                            '[]'::jsonb
                         NOT NULL,
	"setup_completed" boolean DEFAULT true NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "power_assignments_pk" PRIMARY KEY("game_id","player_id"),
	CONSTRAINT "power_assignments_uses_non_negative" CHECK (
                    "power_assignments"."uses" >= 0
                )
);
--> statement-breakpoint
ALTER TABLE "power_assignments" ADD CONSTRAINT "power_assignments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;