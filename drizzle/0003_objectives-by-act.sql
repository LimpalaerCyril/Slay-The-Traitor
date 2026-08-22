ALTER TABLE "objective_assignments" DROP CONSTRAINT "objective_progress_current_non_negative";--> statement-breakpoint
ALTER TABLE "objective_assignments" DROP CONSTRAINT "objective_progress_target_positive";--> statement-breakpoint
DROP INDEX "games_open_channel_unique";--> statement-breakpoint
ALTER TABLE "objective_assignments" DROP CONSTRAINT "objective_assignments_pk";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "current_act" integer;--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD COLUMN "act_number" integer;--> statement-breakpoint

UPDATE "games"
SET "current_act" = 1
WHERE "state" IN (
  'READY',
  'ACTIVE',
  'VOTING',
  'FINISHED'
);
UPDATE "objective_assignments" SET "act_number" = 1 WHERE "objective_type" = 'SECONDARY';

CREATE UNIQUE INDEX "objective_assignments_primary_unique" ON "objective_assignments" USING btree ("game_id","player_id") WHERE 
                        "objective_assignments"."objective_type"
                        = 'PRIMARY'
                    ;--> statement-breakpoint
CREATE UNIQUE INDEX "objective_assignments_secondary_act_unique" ON "objective_assignments" USING btree ("game_id","player_id","act_number") WHERE 
                        "objective_assignments"."objective_type"
                        = 'SECONDARY'
                    ;--> statement-breakpoint
CREATE UNIQUE INDEX "games_open_channel_unique" ON "games" USING btree ("guild_id","text_channel_id") WHERE 
                        "games"."state"
                        NOT IN (
                        'FINISHED',
                        'CANCELLED'
                        )
                    ;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_current_act_valid" CHECK (
                    "games"."current_act"
                    IS NULL
                    OR (
                    "games"."current_act" >= 1
                    AND "games"."current_act" <= 3
                    )
                );--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD CONSTRAINT "objective_assignments_scope_valid" CHECK (
                    (
                    "objective_assignments"."objective_type" = 'PRIMARY'
                    AND "objective_assignments"."act_number" IS NULL
                    )
                    OR
                    (
                    "objective_assignments"."objective_type" = 'SECONDARY'
                    AND "objective_assignments"."act_number" BETWEEN 1 AND 3
                    )
                );--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD CONSTRAINT "objective_progress_current_non_negative" CHECK (
                    "objective_assignments"."progress_current" >= 0
                );--> statement-breakpoint
ALTER TABLE "objective_assignments" ADD CONSTRAINT "objective_progress_target_positive" CHECK (
                    "objective_assignments"."progress_target" > 0
                );