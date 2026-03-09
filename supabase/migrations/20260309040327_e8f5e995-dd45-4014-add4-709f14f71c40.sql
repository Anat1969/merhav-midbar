-- Create idea_cards table
CREATE TABLE public.idea_cards (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.idea_cards ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY "permissive_idea_cards" 
ON public.idea_cards 
FOR ALL 
USING (true) 
WITH CHECK (true);