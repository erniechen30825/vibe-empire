-- Add profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  long_term_months INTEGER DEFAULT 3,
  cycle_length_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
DROP POLICY IF EXISTS "profiles_owner" ON profiles;
CREATE POLICY "profiles_owner" ON profiles 
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Add user_settings table for the settings page
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  long_term_months INTEGER DEFAULT 3,
  cycle_days INTEGER DEFAULT 14,
  highlight_points INTEGER DEFAULT 30,
  habit_min INTEGER DEFAULT 5,
  habit_max INTEGER DEFAULT 10,
  extra_points INTEGER DEFAULT 10,
  difficulty_scaling BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for user_settings
DROP POLICY IF EXISTS "user_settings_owner" ON user_settings;
CREATE POLICY "user_settings_owner" ON user_settings 
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());
