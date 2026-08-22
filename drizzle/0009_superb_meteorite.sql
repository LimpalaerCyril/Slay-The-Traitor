ALTER TABLE "sts2_bridge_connections" ADD COLUMN "last_act_index" integer;--> statement-breakpoint
ALTER TABLE "sts2_bridge_connections" ADD COLUMN "last_act_id" text;--> statement-breakpoint
ALTER TABLE "sts2_bridge_connections" ADD COLUMN "last_snapshot" jsonb;