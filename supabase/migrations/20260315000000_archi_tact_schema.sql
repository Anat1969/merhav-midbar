-- ============================================================
-- ARCHI-TACT — Project Management Tool for Architects
-- Schema Migration: All tables + RLS policies
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE archi_user_role AS ENUM ('architect', 'team_member');
CREATE TYPE archi_user_plan AS ENUM ('free', 'pro', 'studio');
CREATE TYPE archi_project_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE archi_stage_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE archi_payment_status AS ENUM ('pending', 'awaiting_approval', 'approved', 'paid', 'overdue');
CREATE TYPE archi_actor_type AS ENUM ('architect', 'client', 'contractor');

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_users
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  full_name   text NOT NULL,
  role        archi_user_role NOT NULL DEFAULT 'architect',
  plan        archi_user_plan NOT NULL DEFAULT 'free',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_users ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own record
CREATE POLICY "archi_users_select_own"
  ON public.archi_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "archi_users_insert_own"
  ON public.archi_users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "archi_users_update_own"
  ON public.archi_users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_clients
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL,  -- FK added after archi_projects created
  full_name     text NOT NULL,
  email         text,
  phone         text,
  access_token  uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_clients ENABLE ROW LEVEL SECURITY;

-- Architects can manage clients for their projects
CREATE POLICY "archi_clients_architect_all"
  ON public.archi_clients FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- Clients can read their own record via token (handled via service role / RPC)

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_projects
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  client_id   uuid REFERENCES public.archi_clients(id) ON DELETE SET NULL,
  owner_id    uuid NOT NULL REFERENCES public.archi_users(id) ON DELETE CASCADE,
  status      archi_project_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Back-fill FK on archi_clients
ALTER TABLE public.archi_clients
  ADD CONSTRAINT archi_clients_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.archi_projects(id) ON DELETE CASCADE;

ALTER TABLE public.archi_projects ENABLE ROW LEVEL SECURITY;

-- Owners can do everything with their projects
CREATE POLICY "archi_projects_owner_all"
  ON public.archi_projects FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_stages
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_stages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.archi_projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  order_index   integer NOT NULL DEFAULT 0,
  status        archi_stage_status NOT NULL DEFAULT 'pending',
  fee_amount    numeric(12,2) NOT NULL DEFAULT 0,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archi_stages_owner_all"
  ON public.archi_stages FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_payments
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.archi_projects(id) ON DELETE CASCADE,
  stage_id      uuid NOT NULL REFERENCES public.archi_stages(id) ON DELETE CASCADE,
  amount        numeric(12,2) NOT NULL DEFAULT 0,
  status        archi_payment_status NOT NULL DEFAULT 'pending',
  due_date      date,
  approved_at   timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archi_payments_owner_all"
  ON public.archi_payments FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_contractors
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_contractors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.archi_projects(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  company_name  text,
  role          text,
  email         text,
  access_token  uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archi_contractors_owner_all"
  ON public.archi_contractors FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_documents
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.archi_projects(id) ON DELETE CASCADE,
  stage_id      uuid REFERENCES public.archi_stages(id) ON DELETE SET NULL,
  name          text NOT NULL,
  file_url      text NOT NULL,
  uploaded_by   uuid NOT NULL REFERENCES public.archi_users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archi_documents_owner_all"
  ON public.archi_documents FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: archi_activity_log
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archi_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.archi_projects(id) ON DELETE CASCADE,
  actor_type  archi_actor_type NOT NULL,
  actor_id    uuid NOT NULL,
  action      text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.archi_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archi_activity_log_owner_read"
  ON public.archi_activity_log FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "archi_activity_log_insert_all"
  ON public.archi_activity_log FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.archi_projects WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_archi_projects_owner     ON public.archi_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_archi_stages_project     ON public.archi_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_archi_stages_order       ON public.archi_stages(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_archi_payments_project   ON public.archi_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_archi_payments_stage     ON public.archi_payments(stage_id);
CREATE INDEX IF NOT EXISTS idx_archi_payments_status    ON public.archi_payments(status);
CREATE INDEX IF NOT EXISTS idx_archi_documents_project  ON public.archi_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_archi_documents_stage    ON public.archi_documents(stage_id);
CREATE INDEX IF NOT EXISTS idx_archi_activity_project   ON public.archi_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_archi_clients_token      ON public.archi_clients(access_token);
CREATE INDEX IF NOT EXISTS idx_archi_contractors_token  ON public.archi_contractors(access_token);

-- ────────────────────────────────────────────────────────────
-- FUNCTION: Auto-create payment when stage is marked completed
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.archi_on_stage_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status transitions TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Record completion timestamp
    NEW.completed_at := now();

    -- Create a payment record automatically
    INSERT INTO public.archi_payments (
      project_id,
      stage_id,
      amount,
      status,
      due_date
    ) VALUES (
      NEW.project_id,
      NEW.id,
      NEW.fee_amount,
      'awaiting_approval',
      (now() + interval '14 days')::date
    );

    -- Log the activity
    INSERT INTO public.archi_activity_log (
      project_id,
      actor_type,
      actor_id,
      action,
      metadata
    ) VALUES (
      NEW.project_id,
      'architect',
      auth.uid(),
      'stage_completed',
      jsonb_build_object(
        'stage_id',   NEW.id,
        'stage_name', NEW.name,
        'fee_amount', NEW.fee_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS archi_stage_completed_trigger ON public.archi_stages;
CREATE TRIGGER archi_stage_completed_trigger
  BEFORE UPDATE OF status ON public.archi_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.archi_on_stage_completed();

-- ────────────────────────────────────────────────────────────
-- FUNCTION: Public client/contractor access via token (no auth)
-- ────────────────────────────────────────────────────────────

-- Returns project + stages + payments for a client via their access_token
CREATE OR REPLACE FUNCTION public.archi_client_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client  public.archi_clients%ROWTYPE;
  v_result  jsonb;
BEGIN
  SELECT * INTO v_client
  FROM public.archi_clients
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT jsonb_build_object(
    'client',   row_to_json(v_client),
    'project',  (
      SELECT row_to_json(p)
      FROM public.archi_projects p
      WHERE p.id = v_client.project_id
    ),
    'stages', (
      SELECT jsonb_agg(s ORDER BY s.order_index)
      FROM public.archi_stages s
      WHERE s.project_id = v_client.project_id
    ),
    'payments', (
      SELECT jsonb_agg(pay ORDER BY pay.created_at DESC)
      FROM public.archi_payments pay
      WHERE pay.project_id = v_client.project_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Returns project + stages for a contractor via their access_token
CREATE OR REPLACE FUNCTION public.archi_contractor_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contractor  public.archi_contractors%ROWTYPE;
  v_result      jsonb;
BEGIN
  SELECT * INTO v_contractor
  FROM public.archi_contractors
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT jsonb_build_object(
    'contractor', row_to_json(v_contractor),
    'project', (
      SELECT row_to_json(p)
      FROM public.archi_projects p
      WHERE p.id = v_contractor.project_id
    ),
    'stages', (
      SELECT jsonb_agg(s ORDER BY s.order_index)
      FROM public.archi_stages s
      WHERE s.project_id = v_contractor.project_id
    ),
    'documents', (
      SELECT jsonb_agg(d ORDER BY d.created_at DESC)
      FROM public.archi_documents d
      WHERE d.project_id = v_contractor.project_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: Client approves a payment via token
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.archi_client_approve_payment(
  p_token      uuid,
  p_payment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client   public.archi_clients%ROWTYPE;
  v_payment  public.archi_payments%ROWTYPE;
BEGIN
  -- Validate token
  SELECT * INTO v_client
  FROM public.archi_clients
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- Validate payment belongs to client's project
  SELECT * INTO v_payment
  FROM public.archi_payments
  WHERE id = p_payment_id
    AND project_id = v_client.project_id
    AND status = 'awaiting_approval';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'payment_not_found_or_not_pending');
  END IF;

  -- Approve
  UPDATE public.archi_payments
  SET status = 'approved', approved_at = now()
  WHERE id = p_payment_id;

  -- Log activity
  INSERT INTO public.archi_activity_log (
    project_id, actor_type, actor_id, action, metadata
  ) VALUES (
    v_client.project_id,
    'client',
    v_client.id,
    'payment_approved',
    jsonb_build_object('payment_id', p_payment_id, 'amount', v_payment.amount)
  );

  -- Open the next stage (lowest pending stage in same project)
  UPDATE public.archi_stages
  SET status = 'in_progress'
  WHERE id = (
    SELECT id FROM public.archi_stages
    WHERE project_id = v_client.project_id
      AND status = 'pending'
    ORDER BY order_index ASC
    LIMIT 1
  );

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- DEFAULT 6 STAGES — inserted via a helper function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.archi_create_default_stages(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.archi_stages (project_id, name, order_index, status) VALUES
    (p_project_id, 'תכנון מקדמי',       0, 'in_progress'),
    (p_project_id, 'היתר בנייה',         1, 'pending'),
    (p_project_id, 'תכניות ביצוע',       2, 'pending'),
    (p_project_id, 'מכרז קבלנים',        3, 'pending'),
    (p_project_id, 'ליווי ביצוע',        4, 'pending'),
    (p_project_id, 'גמר ואכלוס',         5, 'pending');
END;
$$;
