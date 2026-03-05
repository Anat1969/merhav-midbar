

## הבעיה

מדיניות האבטחה (RLS) על כל 3 הטבלאות הוגדרה כ-**RESTRICTIVE** במקום **PERMISSIVE**. ב-PostgreSQL, כשאין מדיניות PERMISSIVE — הגישה נחסמת לחלוטין, גם אם כתוב `true`. לכן כל השאילתות מחזירות מערך ריק.

## הפתרון

מיגרציית SQL אחת שמוחקת את המדיניויות הקיימות ויוצרת חדשות מסוג **PERMISSIVE**:

```sql
-- Drop restrictive policies
DROP POLICY IF EXISTS "Allow all access to binui_projects" ON binui_projects;
DROP POLICY IF EXISTS "Allow all access to generic_projects" ON generic_projects;
DROP POLICY IF EXISTS "Allow all access to project_attachments" ON project_attachments;

-- Create permissive policies
CREATE POLICY "Public access binui_projects" ON binui_projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access generic_projects" ON generic_projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access project_attachments" ON project_attachments
  FOR ALL USING (true) WITH CHECK (true);
```

שינוי אחד בלבד — מיגרציית SQL. אין צורך בשינויי קוד.

