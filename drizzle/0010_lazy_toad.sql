CREATE TABLE "sts2_bridge_event_receipts" (
	"bridge_session_id" text NOT NULL,
	"identity_link_id" integer NOT NULL,
	"client_instance_id" text NOT NULL,
	"sequence" bigint NOT NULL,
	"event_type" text NOT NULL,
	"event_fingerprint" text NOT NULL,
	"disposition" text NOT NULL,
	"ignored_reason" text,
	"game_event_id" text,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sts2_bridge_event_receipts_pk" PRIMARY KEY("bridge_session_id","identity_link_id","client_instance_id","sequence"),
	CONSTRAINT "sts2_bridge_event_receipts_sequence_positive" CHECK (
                    "sts2_bridge_event_receipts"."sequence" > 0
                ),
	CONSTRAINT "sts2_bridge_event_receipts_disposition_valid" CHECK (
                    "sts2_bridge_event_receipts"."disposition"
                    IN ('ACCEPTED', 'IGNORED')
                ),
	CONSTRAINT "sts2_bridge_event_receipts_consistency" CHECK (
                    (
                        "sts2_bridge_event_receipts"."disposition" = 'ACCEPTED'
                        AND "sts2_bridge_event_receipts"."game_event_id" IS NOT NULL
                        AND "sts2_bridge_event_receipts"."ignored_reason" IS NULL
                    )
                    OR
                    (
                        "sts2_bridge_event_receipts"."disposition" = 'IGNORED'
                        AND "sts2_bridge_event_receipts"."game_event_id" IS NULL
                        AND "sts2_bridge_event_receipts"."ignored_reason" IS NOT NULL
                    )
                )
);
--> statement-breakpoint
ALTER TABLE "sts2_bridge_event_receipts" ADD CONSTRAINT "sts2_bridge_event_receipts_bridge_session_id_sts2_bridge_sessions_id_fk" FOREIGN KEY ("bridge_session_id") REFERENCES "public"."sts2_bridge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sts2_bridge_event_receipts" ADD CONSTRAINT "sts2_bridge_event_receipts_identity_link_id_platform_identity_links_id_fk" FOREIGN KEY ("identity_link_id") REFERENCES "public"."platform_identity_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sts2_bridge_event_receipts" ADD CONSTRAINT "sts2_bridge_event_receipts_game_event_id_game_events_id_fk" FOREIGN KEY ("game_event_id") REFERENCES "public"."game_events"("id") ON DELETE cascade ON UPDATE no action;