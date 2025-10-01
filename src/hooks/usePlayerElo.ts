import { useState, useEffect } from 'react';

const PLAYER_ELO_KEY = 'player_elo';
const INITIAL_ELO = 1200;

export const usePlayerElo = () => {
  const [playerElo, setPlayerElo] = useState<number | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  useEffect(() => {
    const storedElo = localStorage.getItem(PLAYER_ELO_KEY);
    if (storedElo) {
      const elo = parseInt(storedElo, 10);
      setPlayerElo(elo);
      setIsCalibrated(true);
    } else {
      // Start with initial ELO but mark as uncalibrated
      setPlayerElo(INITIAL_ELO);
      setIsCalibrated(false);
    }
  }, []);

  const updatePlayerElo = (newElo: number) => {
    setPlayerElo(newElo);
    setIsCalibrated(true);
    localStorage.setItem(PLAYER_ELO_KEY, newElo.toString());
  };

  return { playerElo, isCalibrated, updatePlayerElo };
};
