import { useState, useEffect } from "react";
import { StartScreen } from "@/components/StartScreen";
import { QuestionScreen } from "@/components/QuestionScreen";
import { usePlayerElo } from "@/hooks/usePlayerElo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { playerElo, isCalibrated, updatePlayerElo } = usePlayerElo();
  const [isPlaying, setIsPlaying] = useState(false);
  const [questionsInitialized, setQuestionsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if questions are already in the database
    const checkAndFetchQuestions = async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        // Fetch questions from API
        toast({
          title: "Initializing questions...",
          description: "Fetching IT quiz questions from the database.",
        });

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-questions`,
            { method: 'POST' }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch questions');
          }

          const data = await response.json();
          
          toast({
            title: "Questions ready!",
            description: `Loaded ${data.count} questions. Let's play!`,
          });

          // Fetch second batch if we got 50
          if (data.count === 50) {
            setTimeout(async () => {
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-questions`,
                { method: 'POST' }
              );
            }, 1000);
          }
        } catch (error) {
          console.error('Error fetching questions:', error);
          toast({
            title: "Error",
            description: "Failed to load questions. Please try again.",
            variant: "destructive",
          });
        }
      }
      
      setQuestionsInitialized(true);
    };

    checkAndFetchQuestions();
  }, [toast]);

  const handleStartGame = () => {
    if (!isCalibrated) {
      toast({
        title: "Complete Calibration First",
        description: "Please answer at least 6 questions to calibrate your ELO rating.",
        variant: "destructive",
      });
      return;
    }
    setIsPlaying(true);
  };

  const handleBackToStart = () => {
    setIsPlaying(false);
  };

  if (!questionsInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Initializing Quiz...</h2>
          <p className="mt-2 text-muted-foreground">Please wait while we load the questions</p>
        </div>
      </div>
    );
  }

  if (isPlaying && playerElo !== null) {
    return (
      <QuestionScreen 
        playerElo={playerElo}
        onUpdateElo={updatePlayerElo}
        onBackToStart={handleBackToStart}
      />
    );
  }

  return (
    <StartScreen 
      playerElo={playerElo}
      isCalibrated={isCalibrated}
      onStartGame={handleStartGame}
    />
  );
};

export default Index;
