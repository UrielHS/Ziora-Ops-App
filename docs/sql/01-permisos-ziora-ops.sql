-- Permisos del usuario de base de datos de Ziora Ops sobre la base compartida "eventops".
--
-- Antes de esto, crea el usuario (desde una terminal con gcloud):
--   gcloud sql users create ziora_ops --instance=event-ops-db \
--     --password="$(openssl rand -base64 32)" --project=event-ops-509602
--   (guarda esa contraseña en Secret Manager como ziora-ops-db-password, ver docs/SETUP-CONEXION.md)
--
-- Corre este archivo conectado como "eventops" (dueño de las tablas de Event Ops).
-- Principio: Ziora Ops lee lo compartido, escribe solo contactos y etiquetas, y es dueño de su schema "ops".

GRANT CONNECT ON DATABASE eventops TO ziora_ops;
GRANT CREATE  ON DATABASE eventops TO ziora_ops;   -- para que su migración cree el schema "ops"
GRANT USAGE   ON SCHEMA public TO ziora_ops;

-- Lectura de lo que administra Event Ops
GRANT SELECT ON public.users, public.events, public.event_contacts, public.organizations TO ziora_ops;

-- Contactos compartidos: Ziora Ops crea y completa, nunca borra
GRANT SELECT, INSERT, UPDATE ON public.contacts, public.contact_tags TO ziora_ops;

-- Necesario para las llaves foráneas de ops.* hacia estas tablas
GRANT REFERENCES ON public.users, public.contacts, public.events TO ziora_ops;
