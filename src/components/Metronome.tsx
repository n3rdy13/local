import { useState, useEffect, useRef } from "react";
import { Play, Square, Volume2, Settings } from "lucide-react";

interface MetronomeProps {
  bpm: number;
  setBpm: (bpm: number) => void;
  accentFirstBeat: boolean;
  setAccentFirstBeat: (accent: boolean) => void;
  timeSignature: number;
  setTimeSignature: (num: number) => void;
  onBeatTrigger?: (beatIndex: number, time: number) => void;
}

export default function Metronome({
  bpm,
  setBpm,
  accentFirstBeat,
  setAccentFirstBeat,
  timeSignature,
  setTimeSignature,
  onBeatTrigger
}: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0.0);
  const beatIndexRef = useRef<number>(0);
  const intervalIdRef = useRef<number | null>(null);

  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const timeSignatureRef = useRef(timeSignature);
  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);

  const accentFirstBeatRef = useRef(accentFirstBeat);
  useEffect(() => {
    accentFirstBeatRef.current = accentFirstBeat;
  }, [accentFirstBeat]);

  const onBeatTriggerRef = useRef(onBeatTrigger);
  useEffect(() => {
    onBeatTriggerRef.current = onBeatTrigger;
  }, [onBeatTrigger]);

  const playClick = (time: number, isAccent: boolean) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // High pitched beep for accent, lower for other beats
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);
    
    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.12);
  };

  const scheduler = () => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    // Schedule 100ms in advance
    while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
      const beatTime = nextNoteTimeRef.current;
      const beatIdx = beatIndexRef.current;
      const isAccent = accentFirstBeatRef.current && beatIdx === 0;

      playClick(beatTime, isAccent);

      // Notify parent component (useful for visual tap and tapping mechanics)
      if (onBeatTriggerRef.current) {
        onBeatTriggerRef.current(beatIdx, beatTime);
      }

      // Update local state for UI rendering on a safe delay
      const displayBeatIdx = beatIdx;
      setTimeout(() => {
        setCurrentBeat(displayBeatIdx);
      }, (beatTime - audioCtx.currentTime) * 1000);

      // Advance next beat time
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += secondsPerBeat;

      // Increment beat index
      beatIndexRef.current = (beatIndexRef.current + 1) % timeSignatureRef.current;
    }
  };

  const startMetronome = () => {
    if (isPlaying) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    setIsPlaying(true);
    currentBeat && setCurrentBeat(0);
    beatIndexRef.current = 0;
    nextNoteTimeRef.current = audioCtx.currentTime + 0.05;

    // Tick interval: 25ms scheduler polling
    const id = window.setInterval(scheduler, 25);
    intervalIdRef.current = id;
  };

  const stopMetronome = () => {
    if (!isPlaying) return;

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    setIsPlaying(false);
    setCurrentBeat(0);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-6">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-500" />
          Metronome Configuration
        </h3>
        <span className={`h-2.5 w-2.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
      </div>

      {/* BPM display & controls */}
      <div className="text-center mb-6">
        <div className="text-5xl font-extrabold text-slate-800 tabular-nums select-none mb-1">
          {bpm}
        </div>
        <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Beats Per Minute (BPM)
        </div>
      </div>

      {/* BPM slider */}
      <div className="w-full mb-6 px-2">
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
          <span>40 BPM</span>
          <span>120 BPM</span>
          <span>240 BPM</span>
        </div>
      </div>

      {/* Quick increments */}
      <div className="flex items-center gap-2 w-full mb-6">
        <button
          onClick={() => setBpm(Math.max(40, bpm - 5))}
          className="flex-1 py-1 px-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
        >
          -5
        </button>
        <button
          onClick={() => setBpm(Math.max(40, bpm - 1))}
          className="flex-1 py-1 px-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
        >
          -1
        </button>
        <button
          onClick={() => setBpm(Math.min(240, bpm + 1))}
          className="flex-1 py-1 px-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
        >
          +1
        </button>
        <button
          onClick={() => setBpm(Math.min(240, bpm + 5))}
          className="flex-1 py-1 px-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
        >
          +5
        </button>
      </div>

      {/* Time Signature and Accents */}
      <div className="grid grid-cols-2 gap-4 w-full mb-6">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Time Signature
          </label>
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(parseInt(e.target.value))}
            className="w-full px-2.5 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl bg-white focus:outline-emerald-500"
          >
            <option value="2">2/4 (Duple)</option>
            <option value="3">3/4 (Triple)</option>
            <option value="4">4/4 (Common)</option>
            <option value="5">5/4 (Odd)</option>
            <option value="6">6/8 (Compound)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Accent Downbeat
          </label>
          <button
            onClick={() => setAccentFirstBeat(!accentFirstBeat)}
            className={`w-full py-1.5 px-3 border text-xs font-bold rounded-xl transition ${
              accentFirstBeat
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {accentFirstBeat ? "ENABLED" : "DISABLED"}
          </button>
        </div>
      </div>

      {/* Visual Indicator Dots */}
      <div className="flex gap-2.5 items-center justify-center mb-6 h-6">
        {Array.from({ length: timeSignature }).map((_, idx) => (
          <div
            key={idx}
            className={`h-4 w-4 rounded-full transition-transform duration-75 ${
              isPlaying && currentBeat === idx
                ? "bg-emerald-500 scale-125 shadow-xs"
                : "bg-slate-200 scale-100"
            }`}
          />
        ))}
      </div>

      {/* Play/Stop Trigger */}
      <button
        onClick={togglePlayback}
        className={`w-full py-3.5 px-6 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all ${
          isPlaying
            ? "bg-slate-800 text-white hover:bg-slate-900"
            : "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md"
        }`}
      >
        {isPlaying ? (
          <>
            <Square className="w-4 h-4 fill-white" />
            <span>PAUSE METRONOME</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-white" />
            <span>START METRONOME</span>
          </>
        )}
      </button>
    </div>
  );
}
