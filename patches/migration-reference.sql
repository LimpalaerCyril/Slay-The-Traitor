-- Référence SQL. Préférer `npm run db:generate` depuis le schema Drizzle.
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
    CONSTRAINT "sts2_bridge_event_receipts_pk"
        PRIMARY KEY (
            "bridge_session_id",
            "identity_link_id",
            "client_instance_id",
            "sequence"
        ),
    CONSTRAINT "sts2_bridge_event_receipts_sequence_positive"
        CHECK ("sequence" > 0),
    CONSTRAINT "sts2_bridge_event_receipts_disposition_valid"
        CHECK ("disposition" IN ('ACCEPTED', 'IGNORED')),
    CONSTRAINT "sts2_bridge_event_receipts_consistency"
        CHECK (
            (
                "disposition" = 'ACCEPTED'
                AND "game_event_id" IS NOT NULL
                AND "ignored_reason" IS NULL
            )
            OR
            (
                "disposition" = 'IGNORED'
                AND "game_event_id" IS NULL
                AND "ignored_reason" IS NOT NULL
            )
        ),
    CONSTRAINT "sts2_bridge_event_receipts_session_fk"
        FOREIGN KEY ("bridge_session_id")
        REFERENCES "sts2_bridge_sessions"("id")
        ON DELETE CASCADE,
    CONSTRAINT "sts2_bridge_event_receipts_identity_fk"
        FOREIGN KEY ("identity_link_id")
        REFERENCES "platform_identity_links"("id")
        ON DELETE CASCADE,
    CONSTRAINT "sts2_bridge_event_receipts_game_event_fk"
        FOREIGN KEY ("game_event_id")
        REFERENCES "game_events"("id")
        ON DELETE CASCADE
);
