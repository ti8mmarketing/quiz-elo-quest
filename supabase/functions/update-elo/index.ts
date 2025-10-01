import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ELO calculation constants
const K_FACTOR = 32; // Standard K-factor for ELO

function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewElo(currentElo: number, expectedScore: number, actualScore: number): number {
  return Math.round(currentElo + K_FACTOR * (actualScore - expectedScore));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, playerElo, wasCorrect } = await req.json();

    if (!questionId || playerElo === undefined || wasCorrect === undefined) {
      throw new Error('Missing required parameters');
    }

    console.log(`Updating ELO - Question: ${questionId}, Player ELO: ${playerElo}, Correct: ${wasCorrect}`);

    // Create Supabase client with service role for updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current question ELO
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('elo_rating, times_answered')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      throw new Error('Question not found');
    }

    const questionElo = question.elo_rating;
    const timesAnswered = question.times_answered;

    // Calculate expected scores
    const playerExpected = calculateExpectedScore(playerElo, questionElo);
    const questionExpected = calculateExpectedScore(questionElo, playerElo);

    // Actual scores (1 for win, 0 for loss)
    const playerActual = wasCorrect ? 1 : 0;
    const questionActual = wasCorrect ? 0 : 1;

    // Calculate new ELOs
    const newPlayerElo = calculateNewElo(playerElo, playerExpected, playerActual);
    const newQuestionElo = calculateNewElo(questionElo, questionExpected, questionActual);

    console.log(`Old ELOs - Player: ${playerElo}, Question: ${questionElo}`);
    console.log(`New ELOs - Player: ${newPlayerElo}, Question: ${newQuestionElo}`);

    // Update question in database
    const { error: updateError } = await supabase
      .from('questions')
      .update({ 
        elo_rating: newQuestionElo,
        times_answered: timesAnswered + 1
      })
      .eq('id', questionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        newPlayerElo,
        newQuestionElo,
        timesAnswered: timesAnswered + 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-elo:', error);
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
