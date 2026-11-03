-- Schema public de Event Ops (migraciones 0000-0012) SOLO para desarrollo local de Ziora Ops.
-- Generado con pg_dump --schema-only. En producción este schema lo administra Event Ops.



-- Name: public; Type: SCHEMA; Schema: -; Owner: -

CREATE SCHEMA IF NOT EXISTS public;


-- Name: channel; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.channel AS ENUM (
    'email',
    'whatsapp',
    'linkedin',
    'call',
    'other'
);

-- Name: city; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.city AS ENUM (
    'cdmx',
    'nyc',
    'other',
    'tbd',
    'gdl',
    'mty'
);

-- Name: contact_source; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.contact_source AS ENUM (
    'manual',
    'luma',
    'notion',
    'linkedin',
    'ai_tinkerers',
    'demo_form',
    'ziora_app',
    'facebook_group',
    'instagram',
    'csv_import'
);

-- Name: contact_tag; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.contact_tag AS ENUM (
    'sponsor',
    'speaker',
    'panelist',
    'founder',
    'angel',
    'vc',
    'venue',
    'community_partner',
    'influencer',
    'hospital',
    'university',
    'volunteer',
    'attendee',
    'vendor',
    'psychologist',
    'lead',
    'clinic',
    'ziora_user'
);

-- Name: contact_type; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.contact_type AS ENUM (
    'person',
    'venue'
);

-- Name: conversation_kind; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.conversation_kind AS ENUM (
    'email',
    'meet_notes',
    'manual'
);

-- Name: currency; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.currency AS ENUM (
    'USD',
    'MXN'
);

-- Name: event_format; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.event_format AS ENUM (
    'workshop',
    'hackathon',
    'demo_night',
    'panel',
    'founders_dinner',
    'open_mic',
    'gathering',
    'mixer',
    'conference',
    'dinner'
);

-- Name: event_role; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.event_role AS ENUM (
    'speaker',
    'panelist',
    'moderator',
    'judge',
    'mentor',
    'guest',
    'volunteer',
    'vendor',
    'host',
    'sponsor_contact'
);

-- Name: event_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.event_status AS ENUM (
    'idea',
    'planning',
    'confirmed',
    'done',
    'cancelled'
);

-- Name: expense_category; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.expense_category AS ENUM (
    'venue',
    'food_beverage',
    'photo_video',
    'post_production',
    'merch',
    'prizes',
    'transport',
    'other'
);

-- Name: expense_payment_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.expense_payment_status AS ENUM (
    'unpaid',
    'invoiced',
    'paid'
);

-- Name: import_source; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.import_source AS ENUM (
    'luma',
    'notion',
    'linkedin'
);

-- Name: import_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.import_status AS ENUM (
    'previewed',
    'applied',
    'discarded'
);

-- Name: inbox_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.inbox_status AS ENUM (
    'new',
    'reviewed',
    'converted',
    'discarded'
);

-- Name: ops_role; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.ops_role AS ENUM (
    'admin',
    'logistics',
    'content',
    'sponsors',
    'none'
);

-- Name: org_type; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.org_type AS ENUM (
    'company',
    'hospital',
    'university',
    'venue',
    'vendor',
    'community',
    'fund',
    'other'
);

-- Name: paid_from; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.paid_from AS ENUM (
    'mercury',
    'ramp',
    'brex',
    'personal_mx',
    'other'
);

-- Name: piece_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.piece_status AS ENUM (
    'not_started',
    'in_progress',
    'done',
    'blocked',
    'na'
);

-- Name: platform; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.platform AS ENUM (
    'ai_tinkerers',
    'health2tech',
    'ugly_talks',
    'independent',
    'collab',
    'tbd'
);

-- Name: sponsor_stage; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.sponsor_stage AS ENUM (
    'interested',
    'pitched',
    'confirmed',
    'paid'
);

-- Name: suggestion_kind; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.suggestion_kind AS ENUM (
    'task',
    'piece_status',
    'note',
    'contact',
    'sponsorship'
);

-- Name: suggestion_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.suggestion_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- Name: sync_job; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.sync_job AS ENUM (
    'sync_google',
    'extract',
    'import'
);

-- Name: task_source; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.task_source AS ENUM (
    'manual',
    'inbox',
    'email',
    'meet'
);

-- Name: task_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.task_status AS ENUM (
    'todo',
    'doing',
    'done'
);

-- Name: user_role; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'operator',
    'volunteer'
);

-- Name: venue_candidate_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.venue_candidate_status AS ENUM (
    'contacted',
    'in_negotiation',
    'proposal_received',
    'declined',
    'confirmed'
);

-- Name: contact_tags; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.contact_tags (
    contact_id uuid NOT NULL,
    tag public.contact_tag NOT NULL
);

-- Name: contacts; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    organization_id uuid,
    city public.city,
    linkedin_url text,
    opens_doors_for_ziora boolean DEFAULT false NOT NULL,
    source public.contact_source DEFAULT 'manual'::public.contact_source NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    type public.contact_type DEFAULT 'person'::public.contact_type NOT NULL,
    venue_name text,
    address text,
    contact_linkedin text,
    venue_location_address text,
    capacity integer,
    website text
);

-- Name: conversations; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    kind public.conversation_kind DEFAULT 'manual'::public.conversation_kind NOT NULL,
    external_id text,
    subject text NOT NULL,
    summary text,
    occurred_at timestamp with time zone NOT NULL,
    raw_ref text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    body text,
    participants text[] DEFAULT '{}'::text[] NOT NULL,
    source_updated_at timestamp with time zone,
    extracted_at timestamp with time zone,
    extract_attempts integer DEFAULT 0 NOT NULL,
    extract_error text
);

-- Name: detail_templates; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.detail_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    format text NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: event_contacts; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.event_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    role_in_event public.event_role NOT NULL,
    confirmed boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contribution text
);

-- Name: event_formats; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.event_formats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    internal_guidelines text,
    default_pieces jsonb DEFAULT '[]'::jsonb NOT NULL,
    custom_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: event_venues; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.event_venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    status public.venue_candidate_status DEFAULT 'contacted'::public.venue_candidate_status NOT NULL,
    quote_budget text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: events; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    platform public.platform DEFAULT 'tbd'::public.platform NOT NULL,
    format text NOT NULL,
    city public.city DEFAULT 'tbd'::public.city NOT NULL,
    date date,
    venue_text text,
    status public.event_status DEFAULT 'idea'::public.event_status NOT NULL,
    budget_amount_cents integer,
    budget_currency public.currency,
    fx_rate_mxn_per_usd numeric(10,4) NOT NULL,
    collaborators_text text,
    notes text,
    gmail_label text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gmail_label_id text,
    gmail_synced_at timestamp with time zone,
    calendar_event_ids text[] DEFAULT '{}'::text[] NOT NULL,
    description text,
    audience text,
    expected_attendance integer,
    agenda text,
    registration_url text,
    venue_address text,
    venue_capacity integer,
    call_for_speakers_closes date,
    registration_closes date,
    outcomes text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    details_updated_at timestamp with time zone,
    details_updated_by uuid,
    venue_id uuid,
    official_venue_id uuid,
    media_folder_link text,
    portal_event_url text
);

-- Name: expenses; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    category public.expense_category DEFAULT 'other'::public.expense_category NOT NULL,
    description text NOT NULL,
    planned_amount_cents integer NOT NULL,
    planned_currency public.currency NOT NULL,
    actual_amount_cents integer,
    actual_currency public.currency,
    paid_from public.paid_from,
    paid_at date,
    vendor_contact_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_category text,
    payment_status public.expense_payment_status DEFAULT 'unpaid'::public.expense_payment_status NOT NULL
);

-- Name: imports; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source public.import_source NOT NULL,
    file_name text NOT NULL,
    uploaded_by uuid NOT NULL,
    status public.import_status DEFAULT 'previewed'::public.import_status NOT NULL,
    plan jsonb,
    summary jsonb DEFAULT '{"created": 0, "skipped": 0, "updated": 0}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: inbox_items; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.inbox_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    channel public.channel NOT NULL,
    requester_text text,
    requester_contact_id uuid,
    organization_id uuid,
    city public.city,
    format text,
    budget_amount_cents integer,
    budget_currency public.currency,
    tentative_date date,
    notes text,
    status public.inbox_status DEFAULT 'new'::public.inbox_status NOT NULL,
    converted_event_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: organizations; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.org_type DEFAULT 'company'::public.org_type NOT NULL,
    city public.city,
    website text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: piece_templates; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.piece_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    format text NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    default_owner_role public.ops_role DEFAULT 'none'::public.ops_role NOT NULL,
    requires_admin_approval boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: pieces; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.pieces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    status public.piece_status DEFAULT 'not_started'::public.piece_status NOT NULL,
    owner_user_id uuid,
    requires_admin_approval boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: sponsorships; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.sponsorships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    contact_id uuid,
    stage public.sponsor_stage DEFAULT 'interested'::public.sponsor_stage NOT NULL,
    amount_cents integer,
    currency public.currency,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: suggestions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    event_id uuid NOT NULL,
    kind public.suggestion_kind NOT NULL,
    payload jsonb NOT NULL,
    status public.suggestion_status DEFAULT 'pending'::public.suggestion_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confidence numeric(3,2),
    evidence text,
    applied_ref jsonb
);

-- Name: sync_runs; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job public.sync_job NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    ok boolean,
    counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text
);

-- Name: tasks; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    piece_id uuid,
    title text NOT NULL,
    description text,
    assignee_user_id uuid,
    due_date date,
    status public.task_status DEFAULT 'todo'::public.task_status NOT NULL,
    source public.task_source DEFAULT 'manual'::public.task_source NOT NULL,
    created_by uuid NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: team_payments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.team_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    currency public.currency DEFAULT 'MXN'::public.currency NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    paid_at date,
    paid_from public.paid_from,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: users; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role public.user_role DEFAULT 'operator'::public.user_role NOT NULL,
    ops_role public.ops_role DEFAULT 'none'::public.ops_role NOT NULL,
    active boolean DEFAULT true NOT NULL,
    image text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: venues; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    address text,
    capacity integer,
    city public.city DEFAULT 'cdmx'::public.city NOT NULL,
    website text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: contact_tags contact_tags_contact_id_tag_pk; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.contact_tags
    ADD CONSTRAINT contact_tags_contact_id_tag_pk PRIMARY KEY (contact_id, tag);

-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);

-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

-- Name: detail_templates detail_templates_format_unique; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.detail_templates
    ADD CONSTRAINT detail_templates_format_unique UNIQUE (format);

-- Name: detail_templates detail_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.detail_templates
    ADD CONSTRAINT detail_templates_pkey PRIMARY KEY (id);

-- Name: event_contacts event_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_contacts
    ADD CONSTRAINT event_contacts_pkey PRIMARY KEY (id);

-- Name: event_formats event_formats_key_unique; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_formats
    ADD CONSTRAINT event_formats_key_unique UNIQUE (key);

-- Name: event_formats event_formats_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_formats
    ADD CONSTRAINT event_formats_pkey PRIMARY KEY (id);

-- Name: event_venues event_venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_venues
    ADD CONSTRAINT event_venues_pkey PRIMARY KEY (id);

-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);

-- Name: inbox_items inbox_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.inbox_items
    ADD CONSTRAINT inbox_items_pkey PRIMARY KEY (id);

-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

-- Name: piece_templates piece_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.piece_templates
    ADD CONSTRAINT piece_templates_pkey PRIMARY KEY (id);

-- Name: pieces pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_pkey PRIMARY KEY (id);

-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);

-- Name: sponsorships sponsorships_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_pkey PRIMARY KEY (id);

-- Name: suggestions suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_pkey PRIMARY KEY (id);

-- Name: sync_runs sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_pkey PRIMARY KEY (id);

-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

-- Name: team_payments team_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.team_payments
    ADD CONSTRAINT team_payments_pkey PRIMARY KEY (id);

-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);

-- Name: contacts_email_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX contacts_email_unique ON public.contacts USING btree (email) WHERE (email IS NOT NULL);

-- Name: contacts_organization_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX contacts_organization_id_idx ON public.contacts USING btree (organization_id);

-- Name: contacts_type_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX contacts_type_idx ON public.contacts USING btree (type);

-- Name: conversations_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX conversations_event_id_idx ON public.conversations USING btree (event_id);

-- Name: conversations_external_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX conversations_external_unique ON public.conversations USING btree (kind, external_id) WHERE (external_id IS NOT NULL);

-- Name: event_contacts_contact_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX event_contacts_contact_id_idx ON public.event_contacts USING btree (contact_id);

-- Name: event_contacts_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX event_contacts_unique ON public.event_contacts USING btree (event_id, contact_id, role_in_event);

-- Name: event_formats_key_idx; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX event_formats_key_idx ON public.event_formats USING btree (key);

-- Name: event_venues_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX event_venues_event_id_idx ON public.event_venues USING btree (event_id);

-- Name: event_venues_event_venue_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX event_venues_event_venue_unique ON public.event_venues USING btree (event_id, venue_id);

-- Name: event_venues_venue_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX event_venues_venue_id_idx ON public.event_venues USING btree (venue_id);

-- Name: expenses_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX expenses_event_id_idx ON public.expenses USING btree (event_id);

-- Name: inbox_items_status_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX inbox_items_status_idx ON public.inbox_items USING btree (status);

-- Name: pieces_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX pieces_event_id_idx ON public.pieces USING btree (event_id);

-- Name: sponsorships_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX sponsorships_event_id_idx ON public.sponsorships USING btree (event_id);

-- Name: sponsorships_organization_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX sponsorships_organization_id_idx ON public.sponsorships USING btree (organization_id);

-- Name: suggestions_conversation_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX suggestions_conversation_id_idx ON public.suggestions USING btree (conversation_id);

-- Name: suggestions_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX suggestions_event_id_idx ON public.suggestions USING btree (event_id);

-- Name: sync_runs_started_at_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX sync_runs_started_at_idx ON public.sync_runs USING btree (started_at);

-- Name: tasks_assignee_user_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX tasks_assignee_user_id_idx ON public.tasks USING btree (assignee_user_id);

-- Name: tasks_event_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX tasks_event_id_idx ON public.tasks USING btree (event_id);

-- Name: tasks_piece_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX tasks_piece_id_idx ON public.tasks USING btree (piece_id);

-- Name: team_payments_user_id_idx; Type: INDEX; Schema: public; Owner: -

CREATE INDEX team_payments_user_id_idx ON public.team_payments USING btree (user_id);

-- Name: contact_tags contact_tags_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.contact_tags
    ADD CONSTRAINT contact_tags_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Name: contacts contacts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Name: conversations conversations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Name: conversations conversations_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: event_contacts event_contacts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_contacts
    ADD CONSTRAINT event_contacts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Name: event_contacts event_contacts_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_contacts
    ADD CONSTRAINT event_contacts_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: event_venues event_venues_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_venues
    ADD CONSTRAINT event_venues_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: event_venues event_venues_venue_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.event_venues
    ADD CONSTRAINT event_venues_venue_id_contacts_id_fk FOREIGN KEY (venue_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Name: events events_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Name: events events_details_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_details_updated_by_users_id_fk FOREIGN KEY (details_updated_by) REFERENCES public.users(id);

-- Name: events events_official_venue_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_official_venue_id_contacts_id_fk FOREIGN KEY (official_venue_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Name: events events_venue_id_venues_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_venues_id_fk FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

-- Name: expenses expenses_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: expenses expenses_vendor_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vendor_contact_id_contacts_id_fk FOREIGN KEY (vendor_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Name: imports imports_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);

-- Name: inbox_items inbox_items_converted_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.inbox_items
    ADD CONSTRAINT inbox_items_converted_event_id_events_id_fk FOREIGN KEY (converted_event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- Name: inbox_items inbox_items_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.inbox_items
    ADD CONSTRAINT inbox_items_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Name: inbox_items inbox_items_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.inbox_items
    ADD CONSTRAINT inbox_items_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Name: inbox_items inbox_items_requester_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.inbox_items
    ADD CONSTRAINT inbox_items_requester_contact_id_contacts_id_fk FOREIGN KEY (requester_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Name: pieces pieces_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: pieces pieces_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id);

-- Name: sponsorships sponsorships_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Name: sponsorships sponsorships_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: sponsorships sponsorships_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- Name: suggestions suggestions_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Name: suggestions suggestions_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: suggestions suggestions_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

-- Name: tasks tasks_assignee_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_user_id_users_id_fk FOREIGN KEY (assignee_user_id) REFERENCES public.users(id);

-- Name: tasks tasks_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Name: tasks tasks_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Name: tasks tasks_piece_id_pieces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_piece_id_pieces_id_fk FOREIGN KEY (piece_id) REFERENCES public.pieces(id) ON DELETE SET NULL;

-- Name: team_payments team_payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.team_payments
    ADD CONSTRAINT team_payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


