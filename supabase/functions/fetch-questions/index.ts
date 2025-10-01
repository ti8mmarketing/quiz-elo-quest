import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching questions from Open Trivia Database...');
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check how many questions we already have
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    console.log(`Current questions in database: ${count}`);

    if (count && count >= 100) {
      return new Response(
        JSON.stringify({ message: 'Already have 100+ questions', count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch questions from Open Trivia API
    // Category 18 = Science: Computers, type=multiple for multiple choice
    const questionsToFetch = 50; // API limit is 50 per request
    const response = await fetch(
      `https://opentdb.com/api.php?amount=${questionsToFetch}&category=18&type=multiple&encode=url3986`
    );

    if (!response.ok) {
      throw new Error(`Trivia API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.results.length} questions from API`);

    // Process and insert questions
    const questionsToInsert = data.results.map((q: any) => ({
      question: decodeURIComponent(q.question),
      correct_answer: decodeURIComponent(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map((a: string) => decodeURIComponent(a)),
      difficulty: q.difficulty,
      elo_rating: 1200, // Starting ELO
      times_answered: 0
    }));

    const { data: insertedQuestions, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log(`Successfully inserted ${insertedQuestions?.length} questions`);

    return new Response(
      JSON.stringify({ 
        message: 'Questions fetched and stored successfully', 
        count: insertedQuestions?.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
