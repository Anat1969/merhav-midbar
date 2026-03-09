
CREATE TABLE public.tabaot (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quarter text NOT NULL DEFAULT '',
  plan_name text NOT NULL DEFAULT '',
  instructions_url text NOT NULL DEFAULT '',
  tashrit_url text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tabaot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissive_tabaot" ON public.tabaot FOR ALL USING (true) WITH CHECK (true);
