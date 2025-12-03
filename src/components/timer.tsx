"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { Play, Pause, RotateCcw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SESSION_DURATION = 25;
const DEFAULT_BREAK_DURATION = 5;

export function Timer() {
  const [sessionDuration, setSessionDuration] = useState(DEFAULT_SESSION_DURATION);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK_DURATION);
  
  const [tempSession, setTempSession] = useState(sessionDuration);
  const [tempBreak, setTempBreak] = useState(breakDuration);

  const [mode, setMode] = useState<"session" | "break">("session");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionDuration * 60);
  const [key, setKey] = useState(0);

  const tickSynth = useRef<Tone.MembraneSynth | null>(null);
  const bellSynth = useRef<Tone.MetalSynth | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    tickSynth.current = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).toDestination();
    
    bellSynth.current = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    
    return () => {
        tickSynth.current?.dispose();
        bellSynth.current?.dispose();
    }
  }, []);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("zenith-sessionDuration");
      const savedBreak = localStorage.getItem("zenith-breakDuration");
      const session = savedSession ? parseInt(savedSession, 10) : DEFAULT_SESSION_DURATION;
      const breakD = savedBreak ? parseInt(savedBreak, 10) : DEFAULT_BREAK_DURATION;
      
      if (!isNaN(session) && session > 0) {
        setSessionDuration(session);
        setTempSession(session);
        setTimeRemaining(session * 60);
      }
      if (!isNaN(breakD) && breakD > 0) {
        setBreakDuration(breakD);
        setTempBreak(breakD);
      }
      setKey(prev => prev + 1);
    } catch (error) {
        console.error("Could not access localStorage:", error);
        toast({
            title: "Error",
            description: "Could not load saved settings from your browser.",
            variant: "destructive",
        });
    }
  }, [toast]);

  const resetTimer = useCallback((newMode?: "session" | "break") => {
    setIsTimerRunning(false);
    const currentMode = newMode || mode;
    setMode(currentMode);
    setTimeRemaining(
      (currentMode === "session" ? sessionDuration : breakDuration) * 60
    );
    setKey(prev => prev + 1);
  }, [mode, sessionDuration, breakDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
        if (Tone.context.state === 'running' && tickSynth.current) {
            tickSynth.current.triggerAttackRelease("C2", "8n", Tone.now());
        }
      }, 1000);
    } else if (isTimerRunning && timeRemaining === 0) {
      if (Tone.context.state === 'running' && bellSynth.current) {
        bellSynth.current.triggerAttackRelease("C4", "2n", Tone.now());
      }
      const newMode = mode === "session" ? "break" : "session";
      resetTimer(newMode);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeRemaining, resetTimer, mode]);


  const toggleTimer = async () => {
    if (Tone.context.state !== 'running') {
      try {
        await Tone.start();
        console.log('AudioContext started');
      } catch (e) {
        console.error('Could not start AudioContext', e);
        toast({
          title: "Audio Error",
          description: "Could not start audio. Your browser might be blocking it.",
          variant: "destructive",
        });
        return;
      }
    }
    setIsTimerRunning(!isTimerRunning);
  };
  
  const handleSettingsSave = () => {
    const newSession = Math.max(1, tempSession);
    const newBreak = Math.max(1, tempBreak);

    setSessionDuration(newSession);
    setBreakDuration(newBreak);

    try {
        localStorage.setItem("zenith-sessionDuration", newSession.toString());
        localStorage.setItem("zenith-breakDuration", newBreak.toString());
    } catch (error) {
        console.error("Could not access localStorage:", error);
        toast({
            title: "Error",
            description: "Could not save settings to your browser.",
            variant: "destructive",
        });
    }
    
    if (mode === 'session') {
        setTimeRemaining(newSession * 60);
    } else if (mode === 'break') {
        setTimeRemaining(newBreak * 60);
    }
    
    setIsTimerRunning(false);
    setKey(prev => prev + 1);
  };

  const totalDuration = (mode === "session" ? sessionDuration : breakDuration) * 60;
  const progress = totalDuration > 0 ? (totalDuration - timeRemaining) / totalDuration : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const CIRCLE_RADIUS = 140;
  const CIRCLE_STROKE_WIDTH = 12;
  const circumference = 2 * Math.PI * (CIRCLE_RADIUS - CIRCLE_STROKE_WIDTH / 2);

  return (
    <Card className="shadow-2xl rounded-2xl border-none overflow-hidden">
      <CardContent className="p-6 sm:p-10 flex flex-col items-center justify-center">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 300 300">
            <circle
              cx="150" cy="150"
              r={CIRCLE_RADIUS - CIRCLE_STROKE_WIDTH / 2}
              fill="transparent"
              stroke="hsl(var(--accent) / 0.2)"
              strokeWidth={CIRCLE_STROKE_WIDTH}
            />
            <circle
              key={key}
              cx="150" cy="150"
              r={CIRCLE_RADIUS - CIRCLE_STROKE_WIDTH / 2}
              fill="transparent"
              stroke="hsl(var(--primary))"
              strokeWidth={CIRCLE_STROKE_WIDTH}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 150 150)"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-6xl sm:text-7xl font-bold font-mono tabular-nums text-foreground">
              {formatTime(timeRemaining)}
            </p>
            <p className="text-lg text-muted-foreground uppercase tracking-widest mt-2">
              {mode}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 w-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full w-14 h-14" aria-label="Open settings">
                <Settings className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="session" className="text-right">Session (min)</Label>
                  <Input id="session" type="number" value={tempSession} onChange={(e) => setTempSession(parseInt(e.target.value) || 0)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="break" className="text-right">Break (min)</Label>
                  <Input id="break" type="number" value={tempBreak} onChange={(e) => setTempBreak(parseInt(e.target.value) || 0)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" onClick={handleSettingsSave}>Save changes</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={toggleTimer}
            size="lg"
            aria-label={isTimerRunning ? "Pause timer" : "Start timer"}
            className={cn("rounded-full w-24 h-24 text-lg shadow-lg transition-all transform hover:scale-105 active:scale-100", 
                isTimerRunning ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isTimerRunning ? <Pause size={48} /> : <Play size={48} className="ml-1" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => resetTimer()} className="rounded-full w-14 h-14" aria-label="Reset timer">
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
