
-- Create binui_projects table
CREATE TABLE public.binui_projects (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  category text NOT NULL,
  sub text NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  created text NOT NULL,
  note text NOT NULL DEFAULT '',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  images jsonb NOT NULL DEFAULT '{"tashrit":null,"tza":null,"hadmaya":null}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create generic_projects table
CREATE TABLE public.generic_projects (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  domain text NOT NULL,
  name text NOT NULL,
  poetic_name text NOT NULL DEFAULT '',
  poem text NOT NULL DEFAULT '',
  category text NOT NULL,
  sub text NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  created text NOT NULL,
  note text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  document text NOT NULL DEFAULT '',
  task text NOT NULL DEFAULT '',
  decision text NOT NULL DEFAULT '',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  tracking jsonb NOT NULL DEFAULT '{"date":"","note":"","agent":""}'::jsonb,
  initiator text NOT NULL DEFAULT '',
  image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_attachments table
CREATE TABLE public.project_attachments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_type text NOT NULL,
  project_id bigint NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_binui_projects_category ON public.binui_projects(category);
CREATE INDEX idx_binui_projects_status ON public.binui_projects(status);
CREATE INDEX idx_generic_projects_domain ON public.generic_projects(domain);
CREATE INDEX idx_generic_projects_status ON public.generic_projects(status);
CREATE INDEX idx_project_attachments_project ON public.project_attachments(project_type, project_id);

-- Enable RLS
ALTER TABLE public.binui_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generic_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth yet)
CREATE POLICY "Allow all access to binui_projects" ON public.binui_projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to generic_projects" ON public.generic_projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to project_attachments" ON public.project_attachments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);

-- Storage policies for public access
CREATE POLICY "Allow public uploads to project-files" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'project-files');
CREATE POLICY "Allow public reads from project-files" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'project-files');
CREATE POLICY "Allow public deletes from project-files" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'project-files');
