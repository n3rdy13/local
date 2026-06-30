import { useState, useEffect, useRef } from "react";
import { Rudiment, PracticeSession } from "../types";
import { savePracticeSession } from "../lib/db";
import { Award, Zap, Timer, CheckCircle, ChevronRight, Activity, Music, TrendingUp } from "lucide-react";

interface RudimentTrainerProps {
  rudiment: Rudiment;
  metronomeBpm: number;
}

export default function RudimentTrainer({ rudiment, metronomeBpm }: RudimentTrainerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<string>("Click 'Start Routine' to play along.");
  const [duration, setDuration] = useState(0); // seconds
  const [hits, setHits] = useState<{ id: number; key: "L" | "R" | "L/R" | "R/L" | "LL/R" | "RR/L" | "LL" | "RR"; status: "pending" | "perfect" | "early" | "late" | "missed"; timestamp: number }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalHitsCount, setTotalHitsCount] = useState(0);
  const [perfectHitsCount, setPerfectHitsCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Speed trainer mode
  const [isSpeedTrainer, setIsSpeedTrainer] = useState(false);
  const [speedInterval, setSpeedInterval] = useState(4); // bars before increase
  const [targetBpm, setTargetBpm] = useState(metronomeBpm + 20);
  const [currentBpm, setCurrentBpm] = useState(metronomeBpm);
  const [bpmStep, setBpmStep] = useState(5);

  const timerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synchronize dynamic speed changes
  useEffect(() => {
    setCurrentBpm(metronomeBpm);
  }, [metronomeBpm]);

  // Keep tracks of hitting pattern
  const currentHand = rudiment.sticking[currentIndex % rudiment.sticking.length];

  // Duration ticking
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const playSynthesizedDrum = (type: "left" | "right" | "accent" | "double") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "accent") {
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
      } else if (type === "double") {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
      } else {
        osc.frequency.setValueAtTime(type === "left" ? 150 : 170, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
      }

      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  const handleHitInput = (hand: "L" | "R") => {
    if (!isPlaying) return;

    const hitTime = Date.now();
    playSynthesizedDrum(hand === "L" ? "left" : "right");

    const expectedSticking = rudiment.sticking[currentIndex];
    
    // Determine if hit matches the required hand sequence
    const hasHandConflict = 
      expectedSticking.includes("L") && hand !== "L" ||
      expectedSticking.includes("R") && hand !== "R";

    // Scoring and rating latency checks
    let hitStatus: "perfect" | "early" | "late" | "missed" = "perfect";
    let message = "Excellent Precision!";

    if (hasHandConflict) {
      hitStatus = "missed";
      message = `Wrong sticking! Expected ${expectedSticking}`;
    } else {
      // Basic mock evaluation logic based on intervals (ideal delay depends on BPM)
      const idealIntervalMs = (60 / currentBpm) * 1000 * (4 / rudiment.subdivision);
      const actualIntervalMs = lastTapTimeRef.current > 0 ? (hitTime - lastTapTimeRef.current) : idealIntervalMs;
      const difference = Math.abs(actualIntervalMs - idealIntervalMs);

      if (difference < 70) {
        hitStatus = "perfect";
        message = "Perfect Sticking!";
        setPerfectHitsCount((p) => p + 1);
      } else if (difference < 150) {
        hitStatus = "early";
        message = "Slightly Off-Beat";
      } else {
        hitStatus = "late";
        message = "Unstable Tempo";
      }
    }

    setHits((prev) => [
      ...prev.slice(-15),
      { id: Date.now(), key: expectedSticking as any, status: hitStatus, timestamp: hitTime }
    ]);

    setTotalHitsCount((t) => t + 1);
    setFeedback(message);
    lastTapTimeRef.current = hitTime;
    setCurrentIndex((prev) => (prev + 1) % rudiment.sticking.length);

    // Dynamic speed trainer BPM ramp up
    if (isSpeedTrainer && (currentIndex + 1) % (rudiment.sticking.length * speedInterval) === 0) {
      if (currentBpm < targetBpm) {
        setCurrentBpm((prev) => Math.min(targetBpm, prev + bpmStep));
        setFeedback(`⚡ Accelerating to ${Math.min(targetBpm, currentBpm + bpmStep)} BPM!`);
      }
    }
  };

  // Keyboard shortcut support (A for Left hand, L or S for Right hand)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "a") {
        handleHitInput("L");
      } else if (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "d" || e.key.toLowerCase() === ";") {
        handleHitInput("R");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentIndex, currentBpm, isSpeedTrainer, targetBpm]);

  const startPractice = () => {
    setIsPlaying(true);
    setHits([]);
    setDuration(0);
    setCurrentIndex(0);
    setTotalHitsCount(0);
    setPerfectHitsCount(0);
    setSessionCompleted(false);
    setFeedback("Practice session has started. Use 'A' (Left) and 'D' (Right) keys!");
    lastTapTimeRef.current = 0;
  };

  const endPractice = () => {
    setIsPlaying(false);
    setSessionCompleted(true);

    const accuracy = totalHitsCount > 0 ? Math.round((perfectHitsCount / totalHitsCount) * 100) : 0;

    // Save practice stats to DB
    const session: PracticeSession = {
      id: `session_${Date.now()}`,
      rudimentId: rudiment.id,
      rudimentName: rudiment.name,
      date: new Date().toISOString().split("T")[0],
      bpm: currentBpm,
      durationSeconds: duration,
      accuracyScore: accuracy,
      totalHits: totalHitsCount,
      correctHits: perfectHitsCount,
      timestamp: Date.now()
    };

    savePracticeSession(session);
    setFeedback("Session finished! Stats stored to Local Database.");
  };

  const currentScore = totalHitsCount > 0 ? Math.round((perfectHitsCount / totalHitsCount) * 100) : 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            {rudiment.category}
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 mt-1">{rudiment.name}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-lg">{rudiment.description}</p>
        </div>

        {/* Speed Trainer Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-2xl">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
              Speed Trainer
            </span>
            <button
              onClick={() => setIsSpeedTrainer(!isSpeedTrainer)}
              className={`text-xs font-bold ${isSpeedTrainer ? "text-emerald-600" : "text-slate-400"}`}
            >
              {isSpeedTrainer ? "ACTIVE" : "INACTIVE"}
            </button>
          </div>
        </div>
      </div>

      {/* Speed Trainer Settings */}
      {isSpeedTrainer && (
        <div className="grid grid-cols-3 gap-3 bg-indigo-50/40 border border-indigo-100/30 p-3.5 rounded-xl mb-4 text-xs">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Target BPM
            </label>
            <input
              type="number"
              value={targetBpm}
              onChange={(e) => setTargetBpm(parseInt(e.target.value) || currentBpm)}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              BPM Increase Step
            </label>
            <input
              type="number"
              value={bpmStep}
              onChange={(e) => setBpmStep(parseInt(e.target.value) || 5)}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Bars interval
            </label>
            <input
              type="number"
              value={speedInterval}
              onChange={(e) => setSpeedInterval(parseInt(e.target.value) || 4)}
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white"
            />
          </div>
        </div>
      )}

      {/* Sheet Music Visual Representation */}
      <div className="bg-slate-900 rounded-2xl p-5 mb-5 text-center relative overflow-hidden flex flex-col justify-center min-h-[140px]">
        <div className="absolute top-2 left-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-emerald-500" />
          Interactive Notation Feed
        </div>

        <div className="flex items-center justify-center gap-4 py-4 overflow-x-auto no-scrollbar">
          {rudiment.sticking.map((stick, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center transition-all ${
                currentIndex === idx && isPlaying
                  ? "scale-115 text-emerald-400"
                  : "text-slate-400 opacity-75"
              }`}
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-extrabold border-2 mb-1.5 transition ${
                  currentIndex === idx && isPlaying
                    ? "bg-emerald-500/20 border-emerald-400 shadow-md text-emerald-300"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                {stick}
              </div>
              <span className="text-[10px] font-semibold">{idx + 1}</span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 font-medium">
          Sticking Guide: <strong className="text-emerald-400">R</strong> (Right Hand), <strong className="text-indigo-400">L</strong> (Left Hand)
        </div>
      </div>

      {/* Manual Drum Trigger Pads (for touch/click) */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <button
          onClick={() => handleHitInput("L")}
          disabled={!isPlaying}
          className={`py-8 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-1 transition ${
            isPlaying
              ? "bg-indigo-500/10 border-indigo-200 text-indigo-700 hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
              : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <span className="text-xl">🥁</span>
          <span className="text-xs tracking-wider uppercase">LEFT PAD</span>
          <span className="text-[10px] font-medium text-indigo-500/80">[ Press F / A ]</span>
        </button>

        <button
          onClick={() => handleHitInput("R")}
          disabled={!isPlaying}
          className={`py-8 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-1 transition ${
            isPlaying
              ? "bg-emerald-500/10 border-emerald-200 text-emerald-700 hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
              : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <span className="text-xl">🥁</span>
          <span className="text-xs tracking-wider uppercase">RIGHT PAD</span>
          <span className="text-[10px] font-medium text-emerald-500/80">[ Press J / D ]</span>
        </button>
      </div>

      {/* Running Score and Analytics Header */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5">
            TEMPO (BPM)
          </span>
          <span className="text-lg font-bold text-slate-800">{currentBpm}</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5">
            PRACTICE TIMER
          </span>
          <span className="text-lg font-bold text-slate-800">{duration}s</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5">
            PRECISION
          </span>
          <span className="text-lg font-bold text-emerald-600">{currentScore}%</span>
        </div>
      </div>

      {/* Interactive feedback & key logs */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-5 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span>Live Audio & Key Assessment</span>
        </div>
        <p className="text-xs font-semibold text-slate-700 mb-3">{feedback}</p>

        {/* Dynamic score track log dots */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {hits.map((hit) => (
            <div
              key={hit.id}
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                hit.status === "perfect"
                  ? "bg-emerald-500/15 text-emerald-700 border border-emerald-300"
                  : hit.status === "early" || hit.status === "late"
                  ? "bg-amber-500/15 text-amber-700 border border-amber-300"
                  : "bg-rose-500/15 text-rose-700 border border-rose-300"
              }`}
            >
              {hit.key}: {hit.status.toUpperCase()}
            </div>
          ))}
          {hits.length === 0 && (
            <span className="text-2xs font-bold text-slate-400">Waiting for tap triggers...</span>
          )}
        </div>
      </div>

      {/* Routine triggers */}
      <div className="flex gap-3">
        {!isPlaying ? (
          <button
            onClick={startPractice}
            className="flex-1 py-3 px-5 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wider uppercase hover:bg-indigo-700 transition shadow-xs"
          >
            START PRACTICE ROUTINE
          </button>
        ) : (
          <button
            onClick={endPractice}
            className="flex-1 py-3 px-5 rounded-xl bg-rose-600 text-white font-bold text-xs tracking-wider uppercase hover:bg-rose-700 transition shadow-xs"
          >
            STOP & PERSIST RESULTS
          </button>
        )}
      </div>

      {/* Completion Trophy Alert */}
      {sessionCompleted && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
          <Award className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-800 text-xs">Practice session saved locally!</h4>
            <p className="text-[10px] text-emerald-700 leading-normal mt-0.5">
              Practice data for {rudiment.name} at {currentBpm} BPM has been recorded. Review your performance trajectory in the Stats Dashboard!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
