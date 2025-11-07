import { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CookingTimerProps {
  minutes: number;
  onClose: () => void;
}

export const CookingTimer = ({ minutes, onClose }: CookingTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  return (
    <div className="inline-flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-primary/20">
      <Timer className="w-4 h-4 text-primary" />
      <span className="font-mono font-bold text-foreground">{formatTime(timeLeft)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsRunning(!isRunning)}
      >
        {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReset}>
        <RotateCcw className="w-3 h-3" />
      </Button>
    </div>
  );
};
