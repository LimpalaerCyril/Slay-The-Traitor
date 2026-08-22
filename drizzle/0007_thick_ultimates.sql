CREATE TYPE "public"."bridge_platform" AS ENUM('STEAM');--> statement-breakpoint
CREATE TABLE "bridge_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_link_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"bridge_version" text NOT NULL,
	"game_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "bridge_credentials_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "bridge_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_identity_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"platform" "bridge_platform" NOT NULL,
	"platform_player_id" text NOT NULL,
	"platform_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_identity_links_discord_platform_unique" UNIQUE("discord_user_id","platform"),
	CONSTRAINT "platform_identity_links_platform_player_unique" UNIQUE("platform","platform_player_id")
);
--> statement-breakpoint
ALTER TABLE "bridge_credentials" ADD CONSTRAINT "bridge_credentials_identity_link_id_platform_identity_links_id_fk" FOREIGN KEY ("identity_link_id") REFERENCES "public"."platform_identity_links"("id") ON DELETE cascade ON UPDATE no action;