import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StartScreenProps {
  playerElo: number | null;
  isCalibrated: boolean;
  onStartGame: () => void;
}

export const StartScreen = ({ playerElo, isCalibrated, onStartGame }: StartScreenProps) => {
  const { data: questionsData } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      const { data: calibratedData } = await supabase
        .from('questions')
        .select('times_answered')
        .gte('times_answered', 2);
      
      return {
        total: count || 0,
        calibrated: calibratedData?.length || 0
      };
    }
  });

  const total = questionsData?.total || 0;
  const calibrated = questionsData?.calibrated || 0;
  const calibrationPercentage = total > 0 
    ? Math.min(100, Math.max(0, (calibrated / total) * 100))
    : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background p-6">
      {/* Title */}
      <div className="w-full pt-8">
        <h1 className="text-center text-4xl font-bold underline" style={{ fontFamily: 'Caladea, serif' }}>
          World of Tech
        </h1>
      </div>

      {/* Middle section with ELO and Calibration */}
      <div className="flex w-full max-w-4xl items-center justify-center gap-8">
        {/* Left: Player ELO */}
        <div className="flex-1 text-center">
          <p className="text-xl font-semibold text-foreground">Your current elo</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {playerElo !== null ? (isCalibrated ? playerElo : `${playerElo}?`) : '1200?'}
          </p>
        </div>

        {/* Right: Calibration Progress */}
        <div className="flex-1 text-center">
          <p className="text-xl font-semibold text-foreground">Question difficulty Calibration:</p>
          <div className="mx-auto mt-4 h-48 w-12 border-2 border-foreground bg-background flex flex-col justify-end">
            <div 
              className="w-full bg-success transition-all duration-300"
              style={{ height: `${calibrationPercentage}%`, minHeight: calibrationPercentage > 0 ? '2px' : '0px' }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {questionsData?.calibrated || 0} / {questionsData?.total || 0} calibrated
          </p>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="w-full max-w-2xl space-y-4 pb-8">
        <Button 
          onClick={onStartGame}
          className="h-16 w-full text-lg font-semibold"
        >
          Start single player
        </Button>
        <div className="flex gap-4">
          <Button 
            disabled
            variant="secondary"
            className="h-16 flex-1 text-lg font-semibold"
          >
            Join
          </Button>
          <Button 
            disabled
            variant="secondary"
            className="h-16 flex-1 text-lg font-semibold"
          >
            Offline
          </Button>
        </div>
      </div>
    </div>
  );
};
