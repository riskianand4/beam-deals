import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion } from "framer-motion";

const WORK_DURATION = 25 * 60; // 25 menit
const BREAK_DURATION = 5 * 60; // 5 menit

const FocusTimer = () => {
  const [seconds, setSeconds] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds((s) => s - 1), 1000);
    } else if (seconds === 0) {
      stop();
      setIsRunning(false);
      if (isBreak) {
        toast.success("☕ Istirahat selesai! Siap kerja lagi?");
        setIsBreak(false);
        setSeconds(WORK_DURATION);
      } else {
        setSessions((s) => s + 1);
        toast.success("🎉 Sesi fokus selesai! Saatnya istirahat.");
        setIsBreak(true);
        setSeconds(BREAK_DURATION);
      }
    }
    return stop;
  }, [isRunning, seconds, isBreak, stop]);

  const toggle = () => setIsRunning((r) => !r);

  const reset = () => {
    stop();
    setIsRunning(false);
    setIsBreak(false);
    setSeconds(WORK_DURATION);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = isBreak ? BREAK_DURATION : WORK_DURATION;
  const progress = ((total - seconds) / total) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md transition-colors hover:bg-muted/60">
          <Timer className="w-3.5 h-3.5" />
          {isRunning && (
            <span className="font-mono text-[11px]  font-medium">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          )}
          {isRunning && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              {isBreak ? <Coffee className="w-3.5 h-3.5 text-warning" /> : <Timer className="w-3.5 h-3.5 text-primary" />}
              {isBreak ? "Waktu Istirahat" : "Mode Fokus"}
            </h3>
            <span className="text-[10px] text-muted-foreground">{sessions} sesi</span>
          </div>

          {/* Progress ring */}
          <div className="flex items-center justify-center py-2">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={isBreak ? "hsl(var(--warning))" : "hsl(var(--primary))"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-8 px-4 gap-1.5 text-xs" onClick={toggle}>
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? "Jeda" : "Mulai"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {isBreak ? "Santai sejenak, lalu lanjutkan!" : "Fokus penuh selama 25 menit"}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FocusTimer;
