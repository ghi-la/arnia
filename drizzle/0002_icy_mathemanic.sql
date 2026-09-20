CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"path" text NOT NULL,
	"thumbnail_path" text,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"original_name" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_category" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"category_id" text,
	"location_id" text,
	"unit" text DEFAULT 'pz' NOT NULL,
	"sku" text,
	"barcode" text,
	"min_threshold" integer DEFAULT 0 NOT NULL,
	"supplier" text,
	"notes" text,
	"avg_cost_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'CHF' NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"equipment_tracking" text,
	"purchase_value_minor" bigint,
	"usage_cost_minor" bigint,
	"condition" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"kind" text DEFAULT 'site' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"type" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_cost_minor" bigint,
	"event_id" text,
	"reason" text,
	"condition_on_return" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_category" ADD CONSTRAINT "inventory_category_parent_id_inventory_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."inventory_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_category_id_inventory_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_parent_id_location_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_entity_idx" ON "attachment" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "inventory_category_parent_id_idx" ON "inventory_category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "item_category_id_idx" ON "item" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "item_location_id_idx" ON "item" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "item_barcode_idx" ON "item" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "location_parent_id_idx" ON "location" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "stock_movement_item_id_idx" ON "stock_movement" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "stock_movement_event_id_idx" ON "stock_movement" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "stock_movement_created_at_idx" ON "stock_movement" USING btree ("created_at");