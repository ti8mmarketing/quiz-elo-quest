import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  elo_rating: number;
}

interface QuestionScreenProps {
  playerElo: number;
  onUpdateElo: (newElo: number) => void;
  onBackToStart: () => void;
}

export const QuestionScreen = ({ playerElo, onUpdateElo, onBackToStart }: QuestionScreenProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch a random question
  const { data: questions, refetch: refetchQuestion } = useQuery({
    queryKey: ['random-question'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(100);
      
      if (error) throw error;
      return data as Question[];
    },
    enabled: true
  });

  // Update ELO mutation
  const updateEloMutation = useMutation({
    mutationFn: async ({ questionId, wasCorrect }: { questionId: string; wasCorrect: boolean }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-elo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId,
            playerElo,
            wasCorrect
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update ELO');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onUpdateElo(data.newPlayerElo);
    }
  });

  // Set up a random question when questions are loaded
  useEffect(() => {
    if (questions && questions.length > 0 && !currentQuestion) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
      
      // Shuffle answers
      const allAnswers = [
        randomQuestion.correct_answer,
        ...randomQuestion.incorrect_answers
      ];
      const shuffled = allAnswers.sort(() => Math.random() - 0.5);
      setAnswers(shuffled);
    }
  }, [questions, currentQuestion]);

  const handleAnswerClick = (answer: string) => {
    if (selectedAnswer || isAnimating) return;

    setSelectedAnswer(answer);
    const correct = answer === currentQuestion?.correct_answer;
    setIsCorrect(correct);
    setIsAnimating(true);

    // Update ELO
    if (currentQuestion) {
      updateEloMutation.mutate({
        questionId: currentQuestion.id,
        wasCorrect: correct
      });
    }

    // Show result after animation
    setTimeout(() => {
      setShowResult(true);
      setIsAnimating(false);
    }, 1000);
  };

  const handleContinue = () => {
    // Reset state
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);
    setCurrentQuestion(null);
    setAnswers([]);
    
    // Fetch new question
    refetchQuestion();
  };

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-xl text-foreground">Loading question...</p>
      </div>
    );
  }

  const encouragementMessages = {
    correct: ['Well done!', 'Keep it up!'],
    incorrect: ['No Problem!', "Don't give up!"]
  };

  const randomEncouragement = isCorrect !== null
    ? encouragementMessages[isCorrect ? 'correct' : 'incorrect'][
        Math.floor(Math.random() * 2)
      ]
    : '';

  return (
    <div className="relative flex min-h-screen flex-col bg-background p-6">
      {/* Overlay */}
      {isAnimating && (
        <div 
          className="fixed inset-0 z-10 flex items-center justify-center bg-black transition-opacity duration-500"
          style={{ opacity: 0.75 }}
        >
          <p 
            className="text-6xl font-bold transition-opacity duration-500"
            style={{ 
              color: isCorrect ? 'rgb(20, 215, 65)' : 'rgb(215, 20, 65)',
            }}
          >
            {isCorrect ? 'RIGHT!' : 'WRONG!'}
          </p>
        </div>
      )}

      {/* Question Section */}
      <div className={`transition-all duration-500 ${showResult ? 'h-auto' : 'flex-1'}`}>
        <p 
          className={`font-semibold text-foreground transition-all duration-500 ${
            showResult ? 'text-sm' : 'text-2xl'
          }`}
        >
          Question:
        </p>
        <p 
          className={`mt-2 text-foreground transition-all duration-500 ${
            showResult ? 'text-xs' : 'text-lg'
          }`}
        >
          {currentQuestion.question}
        </p>

        {/* Answer Buttons */}
        <div 
          className={`mt-8 grid grid-cols-2 gap-4 transition-all duration-500 ${
            showResult ? 'h-auto scale-[0.6] -translate-y-full' : ''
          }`}
        >
          {answers.map((answer, index) => (
            <Button
              key={index}
              onClick={() => handleAnswerClick(answer)}
              disabled={!!selectedAnswer}
              className="h-24 w-full text-base font-medium transition-all"
              style={{ 
                borderRadius: 0,
                aspectRatio: '5 / 3'
              }}
              variant={
                selectedAnswer === answer
                  ? answer === currentQuestion.correct_answer
                    ? 'default'
                    : 'destructive'
                  : 'outline'
              }
            >
              {answer}
            </Button>
          ))}
        </div>
      </div>

      {/* Result Section */}
      {showResult && (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="flex flex-1 gap-4">
            {/* Left: Encouragement */}
            <div className="flex flex-1 flex-col justify-start border-2 border-foreground p-4">
              <p className="text-xl font-bold text-foreground">{randomEncouragement}</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Right answer:</p>
              <p className="mt-2 text-base text-foreground">{currentQuestion.correct_answer}</p>
            </div>

            {/* Right: Question Difficulty */}
            <div className="flex flex-1 flex-col justify-start border-2 border-foreground p-4">
              <p className="text-lg font-semibold italic text-foreground">Question Difficulty:</p>
              <p className="mt-2 text-base italic text-foreground capitalize">
                {currentQuestion.difficulty}
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            className="mt-4 h-16 w-full text-lg font-semibold"
            style={{ borderRadius: 0 }}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
};
