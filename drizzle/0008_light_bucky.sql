CREATE TABLE "sts2_bridge_connections" (
	"bridge_session_id" text NOT NULL,
	"identity_link_id" integer NOT NULL,
	"client_instance_id" text NOT NULL,
	"platform_name" text NOT NULL,
	"bridge_version" text NOT NULL,
	"game_version" text NOT NULL,
	"lobby_id" text NOT NULL,
	"is_host" boolean NOT NULL,
	"host_platform_player_id" text NOT NULL,
	"connected_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sts2_bridge_connections_pk" PRIMARY KEY("bridge_session_id","identity_link_id")
);
--> statement-breakpoint
CREATE TABLE "sts2_bridge_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"session_code" text NOT NULL,
	"current_lobby_id" text,
	"host_platform_player_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sts2_bridge_sessions_game_id_unique" UNIQUE("game_id"),
	CONSTRAINT "sts2_bridge_sessions_session_code_unique" UNIQUE("session_code"),
	CONSTRAINT "sts2_bridge_sessions_current_lobby_id_unique" UNIQUE("current_lobby_id")
);
--> statement-breakpoint
ALTER TABLE "sts2_bridge_connections" ADD CONSTRAINT "sts2_bridge_connections_bridge_session_id_sts2_bridge_sessions_id_fk" FOREIGN KEY ("bridge_session_id") REFERENCES "public"."sts2_bridge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sts2_bridge_connections" ADD CONSTRAINT "sts2_bridge_connections_identity_link_id_platform_identity_links_id_fk" FOREIGN KEY ("identity_link_id") REFERENCES "public"."platform_identity_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sts2_bridge_sessions" ADD CONSTRAINT "sts2_bridge_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;