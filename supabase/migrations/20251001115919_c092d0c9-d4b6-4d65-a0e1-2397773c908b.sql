-- Create questions table with ELO system
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  incorrect_answers TEXT[] NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  times_answered INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (questions are public data)
CREATE POLICY "Questions are viewable by everyone" 
ON public.questions 
FOR SELECT 
USING (true);

-- Create policy for server-side updates (only through edge functions)
CREATE POLICY "Questions can be updated via service role" 
ON public.questions 
FOR UPDATE 
USING (false);

-- Create policy for server-side inserts (only through edge functions)
CREATE POLICY "Questions can be inserted via service role" 
ON public.questions 
FOR INSERT 
WITH CHECK (false);

-- Create index for faster queries
CREATE INDEX idx_questions_elo ON public.questions(elo_rating);
CREATE INDEX idx_questions_times_answered ON public.questions(times_answered);