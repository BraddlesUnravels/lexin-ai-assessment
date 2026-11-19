CREATE TYPE "public"."material_status" AS ENUM('Active', 'Pending Review', 'Obsolete');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('Spare Part', 'Consumable', 'Raw Material', 'Tool');--> statement-breakpoint
CREATE TABLE "materials" (
	"material_number" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"material_type" "material_type" NOT NULL,
	"status" "material_status" NOT NULL,
	"manufacturer_name" text,
	"manufacturer_part_number" text,
	"unit_of_measure" text NOT NULL,
	"unit_price_aud" numeric(12, 2),
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "materials_unit_price_aud_non_negative" CHECK ("materials"."unit_price_aud" >= 0)
);
--> statement-breakpoint
CREATE TABLE "plant_catalogue" (
	"material_number" text NOT NULL,
	"plant_code" text NOT NULL,
	"quantity_on_hand" numeric(12, 3) NOT NULL,
	CONSTRAINT "plant_catalogue_material_number_plant_code_pk" PRIMARY KEY("material_number","plant_code"),
	CONSTRAINT "plant_catalogue_quantity_on_hand_non_negative" CHECK ("plant_catalogue"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"plant_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plant_catalogue" ADD CONSTRAINT "plant_catalogue_material_number_materials_material_number_fk" FOREIGN KEY ("material_number") REFERENCES "public"."materials"("material_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_catalogue" ADD CONSTRAINT "plant_catalogue_plant_code_plants_plant_code_fk" FOREIGN KEY ("plant_code") REFERENCES "public"."plants"("plant_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plant_catalogue_plant_code_idx" ON "plant_catalogue" USING btree ("plant_code");