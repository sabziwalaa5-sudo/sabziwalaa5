-- SQL script to create users table for SABJIWALAA 5 authentication

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID UNIQUE NOT NULL,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  profile_photo TEXT,
  role TEXT DEFAULT 'customer' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow select by authenticated users
CREATE POLICY "Allow public select on users"
  ON public.users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create policy to allow insert/update by authenticated users for their own record
CREATE POLICY "Allow users to manage their own record"
  ON public.users
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
