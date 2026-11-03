-- Ziora Ops comparte public.contacts con Event Ops. Cambios aditivos: solo agrega valores de enum.
-- No reescribe ni borra datos. IF NOT EXISTS la hace segura de repetir.
ALTER TYPE "public"."city" ADD VALUE IF NOT EXISTS 'gdl';
--> statement-breakpoint
ALTER TYPE "public"."city" ADD VALUE IF NOT EXISTS 'mty';
--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE IF NOT EXISTS 'demo_form';
--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE IF NOT EXISTS 'ziora_app';
--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE IF NOT EXISTS 'facebook_group';
--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE IF NOT EXISTS 'instagram';
--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE IF NOT EXISTS 'csv_import';
--> statement-breakpoint
ALTER TYPE "public"."contact_tag" ADD VALUE IF NOT EXISTS 'psychologist';
--> statement-breakpoint
ALTER TYPE "public"."contact_tag" ADD VALUE IF NOT EXISTS 'lead';
--> statement-breakpoint
ALTER TYPE "public"."contact_tag" ADD VALUE IF NOT EXISTS 'clinic';
--> statement-breakpoint
ALTER TYPE "public"."contact_tag" ADD VALUE IF NOT EXISTS 'ziora_user';
