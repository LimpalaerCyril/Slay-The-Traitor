ALTER TABLE "game_players" ADD COLUMN "position" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "games_open_channel_unique" ON "games" USING btree ("guild_id","text_channel_id") WHERE 
            "games"."state"
            NOT IN (
              'FINISHED',
              'CANCELLED'
            )
          ;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_position_unique" UNIQUE("game_id","position");--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_position_non_negative" CHECK (
                    "game_players"."position" >= 0
                );