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
        <h1 className="text-left text-4xl underline font-montserrat">
          World of Tech
        </h1>
      </div>

      {/* Middle section with ELO and Calibration */}
      <div className="flex w-full max-w-4xl items-start justify-center gap-8">
        {/* Left: Player ELO */}
        <div className="flex-1 text-center relative h-40">
          <p className="text-xl text-foreground font-ubuntu -mt-6">Your current elo</p>
          <p className="absolute top-40 left-1/2 -translate-x-1/2 text-3xl text-foreground font-ubuntu">
            {playerElo !== null ? (isCalibrated ? playerElo : `${playerElo}?`) : '1200?'}
          </p>
        </div>

        {/* Right: Calibration Progress */}
        <div className="flex-1 text-center">
          <p className="text-xl text-foreground font-ubuntu -mt-6">Question difficulty Calibration</p>
          <div className="mx-auto mt-14 h-40 w-8 border-2 border-foreground flex flex-col justify-end relative" style={{ backgroundColor: 'rgb(233, 233, 233)' }}>
            <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm text-muted-foreground font-ubuntu whitespace-nowrap">
              {questionsData?.calibrated || 0} / {questionsData?.total || 0} calibrated
            </p>
            <div 
              className="w-full bg-primary transition-all duration-300"
              style={{ height: `${calibrationPercentage}%`, minHeight: calibrationPercentage > 0 ? '2px' : '0px' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="w-full max-w-2xl pb-8">
        <Button 
          onClick={onStartGame}
          className="w-full text-2xl font-ubuntu h-32 text-white"
        >
          Start single player
        </Button>
      </div>
    </div>
  );
};
