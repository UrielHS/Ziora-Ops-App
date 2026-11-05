-- Perfil del lead (columnas Nombre a Ciudad de la hoja). Idempotente: en producción ya se había aplicado una versión
-- previa de esta migración con prioridad, segmento y flag B2B (5-nov-2026); aquí se agregan las que falten y se quitan esas.
ALTER TABLE "ops"."contacts" ADD COLUMN IF NOT EXISTS "city_name" text;--> statement-breakpoint
ALTER TABLE "ops"."contacts" ADD COLUMN IF NOT EXISTS "patients_per_week" text;--> statement-breakpoint
ALTER TABLE "ops"."contacts" ADD COLUMN IF NOT EXISTS "approach" text;--> statement-breakpoint
ALTER TABLE "ops"."contacts" ADD COLUMN IF NOT EXISTS "documentation" text;--> statement-breakpoint
ALTER TABLE "ops"."contacts" ADD COLUMN IF NOT EXISTS "ai_usage" text;--> statement-breakpoint
DROP INDEX IF EXISTS "ops"."contacts_segment_idx";--> statement-breakpoint
ALTER TABLE "ops"."contacts" DROP COLUMN IF EXISTS "priority";--> statement-breakpoint
ALTER TABLE "ops"."contacts" DROP COLUMN IF EXISTS "segment";--> statement-breakpoint
ALTER TABLE "ops"."contacts" DROP COLUMN IF EXISTS "b2b_flag";
