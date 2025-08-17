-- Fix database schema issues for long-term planning

-- Add missing title column to cycles table
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing cycles with default titles if they don't have them
UPDATE cycles 
SET title = 'Cycle ' || seq 
WHERE title IS NULL OR title = '';

-- Ensure habit_plans table has correct structure
-- Check if frequency column exists and has correct type
DO $$ 
BEGIN
    -- Add frequency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_plans' AND column_name = 'frequency') THEN
        ALTER TABLE habit_plans ADD COLUMN frequency TEXT;
    END IF;
    
    -- Add times_per_week column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_plans' AND column_name = 'times_per_week') THEN
        ALTER TABLE habit_plans ADD COLUMN times_per_week INTEGER;
    END IF;
END $$;

-- Update habit_plans with default values for existing records
UPDATE habit_plans 
SET frequency = 'daily' 
WHERE frequency IS NULL;

-- Add cycle_goals table if it doesn't exist (referenced in long-term wizard)
CREATE TABLE IF NOT EXISTS cycle_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    expected_progress TEXT,
    expected_hours INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cycle_id, goal_id)
);

-- Enable RLS for cycle_goals
ALTER TABLE cycle_goals ENABLE ROW LEVEL SECURITY;

-- Create policy for cycle_goals
DROP POLICY IF EXISTS "cycle_goals_via_cycles" ON cycle_goals;
CREATE POLICY "cycle_goals_via_cycles" ON cycle_goals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM cycles c 
        JOIN long_terms lt ON c.long_term_id = lt.id 
        WHERE c.id = cycle_goals.cycle_id AND lt.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM cycles c 
        JOIN long_terms lt ON c.long_term_id = lt.id 
        WHERE c.id = cycle_goals.cycle_id AND lt.user_id = auth.uid()
    )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cycles_long_term_id ON cycles(long_term_id);
CREATE INDEX IF NOT EXISTS idx_cycle_goals_cycle_id ON cycle_goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_goals_goal_id ON cycle_goals(goal_id);
