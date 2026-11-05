-- Nov-2026: Ziora Ops deja de escribir en los contactos de Event Ops (ahora tiene ops.contacts).
-- Correr como "eventops" DESPUÉS de aplicar la migración 0008 de Ziora Ops.
REVOKE INSERT, UPDATE, REFERENCES ON public.contacts FROM ziora_ops;
REVOKE INSERT, UPDATE ON public.contact_tags FROM ziora_ops;
GRANT SELECT ON public.contacts, public.contact_tags TO ziora_ops;
