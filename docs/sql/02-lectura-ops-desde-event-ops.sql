-- Opcional, cuando Event Ops quiera mostrar datos de Ziora Ops (consentimientos, demos).
-- Corre conectado como "ziora_ops" DESPUÉS de la primera migración de Ziora Ops.
GRANT USAGE ON SCHEMA ops TO eventops;
GRANT SELECT ON ALL TABLES IN SCHEMA ops TO eventops;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT SELECT ON TABLES TO eventops;
