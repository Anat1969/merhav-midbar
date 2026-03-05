
-- Drop ALL existing policies on these tables
DROP POLICY IF EXISTS "Public access binui_projects" ON binui_projects;
DROP POLICY IF EXISTS "Allow all access to binui_projects" ON binui_projects;
DROP POLICY IF EXISTS "Public access generic_projects" ON generic_projects;
DROP POLICY IF EXISTS "Allow all access to generic_projects" ON generic_projects;
DROP POLICY IF EXISTS "Public access project_attachments" ON project_attachments;
DROP POLICY IF EXISTS "Allow all access to project_attachments" ON project_attachments;

-- Create explicitly PERMISSIVE policies
CREATE POLICY "permissive_binui" ON binui_projects AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "permissive_generic" ON generic_projects AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "permissive_attachments" ON project_attachments AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
