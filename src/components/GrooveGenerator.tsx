import { useState, useEffect } from "react";
import { Sparkles, Music, Play, Square, Settings, Wand2 } from "lucide-react";

export default function GrooveGenerator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [grooveName, setGrooveName] = useState("Standard Rock Groove");
  const [grooveDescription, setGrooveDescription] = useState("A classic eighth-note rock beat with kick on 1 and 3, snare on 2 and 4.");
  const [pattern, setPattern] = useState<{
    hihat: boolean[];
    snare: boolean[];
    kick: boolean[];
  }>({
    hihat: [true, true, true, true, true, true, true, true],
    snare: [false, false, true, false, false, false, true, false],
    kick:  [true, false, false, false, true, false, false, false]
  });

  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const audioCtxRef = useState<AudioContext | null>(null);
  const audioCtxInstance = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0.0);
  const stepIndexRef = useRef<number>(0);

  // Synchronize refs for variables in loops
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const patternRef = useRef(pattern);
  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  const generateNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const playInstrument = (type: "hihat" | "snare" | "kick", time: number) => {
    const ctx = audioCtxInstance.current;
    if (!ctx) return;

    if (type === "kick") {
      // Sine drop for deep punchy kick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

      osc.start(time);
      osc.stop(time + 0.13);
    } else if (type === "snare") {
      // Snare drum combines noise and decaying fundamental sine
      const noise = ctx.createBufferSource();
      noise.buffer = generateNoiseBuffer(ctx);

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.value = 1000;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // Osc component for punch
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, time);
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      noise.start(time);
      osc.start(time);
      noise.stop(time + 0.16);
      osc.stop(time + 0.12);
    } else if (type === "hihat") {
      // Hihat is short highpassed noise
      const noise = ctx.createBufferSource();
      noise.buffer = generateNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 8000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(time);
      noise.stop(time + 0.06);
    }
  };

  const scheduler = () => {
    const ctx = audioCtxInstance.current;
    if (!ctx) return;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const scheduledTime = nextNoteTimeRef.current;
      const idx = stepIndexRef.current;

      const currPat = patternRef.current;
      if (currPat.hihat[idx]) playInstrument("hihat", scheduledTime);
      if (currPat.snare[idx]) playInstrument("snare", scheduledTime);
      if (currPat.kick[idx]) playInstrument("kick", scheduledTime);

      const currentIdxDisplay = idx;
      setTimeout(() => {
        setActiveStep(currentIdxDisplay);
      }, (scheduledTime - ctx.currentTime) * 1000);

      // Eighth notes scheduling
      const secondsPerBeat = 60.0 / bpmRef.current;
      const stepDuration = secondsPerBeat / 2; // 1/8 note steps
      nextNoteTimeRef.current += stepDuration;

      stepIndexRef.current = (stepIndexRef.current + 1) % 8;
    }
  };

  const startGroove = () => {
    if (isPlaying) return;

    if (!audioCtxInstance.current) {
      audioCtxInstance.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxInstance.current;
    if (ctx.state === "suspended") ctx.resume();

    setIsPlaying(true);
    setActiveStep(0);
    stepIndexRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;

    intervalIdRef.current = window.setInterval(scheduler, 25);
  };

  const stopGroove = () => {
    if (!isPlaying) return;

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setIsPlaying(false);
    setActiveStep(0);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopGroove();
    } else {
      startGroove();
    }
  };

  const toggleStep = (instrument: "hihat" | "snare" | "kick", index: number) => {
    setPattern((prev) => {
      const targetList = [...prev[instrument]];
      targetList[index] = !targetList[index];
      return { ...prev, [instrument]: targetList };
    });
  };

  // AI Groove Generator via Gemini endpoint proxy
  const handleAIGrooveCreation = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-drum-groove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpm })
      });

      if (!response.ok) throw new Error("Could not synthesize groove details with AI.");

      const data = await response.json();
      if (data && data.name) {
        setGrooveName(data.name);
        setGrooveDescription(data.description || "A custom AI drum rhythm.");
        if (data.pattern) {
          setPattern({
            hihat: data.pattern.hihat || [true, true, true, true, true, true, true, true],
            snare: data.pattern.snare || [false, false, true, false, false, false, true, false],
            kick:  data.pattern.kick || [true, false, false, false, true, false, false, false]
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-500" />
            Adaptive Groove Studio & Sequencer
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Design customized drum machine step loops or let AI synthesize them</p>
        </div>

        <button
          onClick={handleAIGrooveCreation}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-[10px] bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>{isGenerating ? "GENERATING BEAT..." : "AI BEAT GENERATOR"}</span>
        </button>
      </div>

      {/* Loaded Groove Meta Card */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-800 text-xs">{grooveName}</h4>
        <p className="text-[10px] text-slate-500 mt-1 leading-normal">{grooveDescription}</p>
      </div>

      {/* BPM Configuration and Slider */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
            Tempo: <span className="text-emerald-500 font-bold">{bpm} BPM</span>
          </label>
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <button
          onClick={togglePlayback}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition ${
            isPlaying
              ? "bg-slate-850 text-white hover:bg-slate-900"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>PAUSE groove</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>PLAY groove</span>
            </>
          )}
        </button>
      </div>

      {/* Grid Sequencer Steps */}
      <div className="space-y-4 mb-6">
        {/* Step Numbers */}
        <div className="grid grid-cols-9 gap-2 items-center text-center">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase text-left">Inst</span>
          {Array.from({ length: 8 }).map((_, idx) => (
            <span
              key={idx}
              className={`text-[10px] font-extrabold rounded-md py-1 ${
                isPlaying && activeStep === idx
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "text-slate-400"
              }`}
            >
              {idx + 1}
            </span>
          ))}
        </div>

        {/* Hihat Row */}
        <div className="grid grid-cols-9 gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-500">Hi-Hat</span>
          {pattern.hihat.map((val, idx) => (
            <button
              key={idx}
              onClick={() => toggleStep("hihat", idx)}
              className={`py-3 rounded-xl border text-[10px] font-bold transition ${
                val
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
              } ${isPlaying && activeStep === idx ? "ring-2 ring-emerald-300" : ""}`}
            >
              H
            </button>
          ))}
        </div>

        {/* Snare Row */}
        <div className="grid grid-cols-9 gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-500">Snare</span>
          {pattern.snare.map((val, idx) => (
            <button
              key={idx}
              onClick={() => toggleStep("snare", idx)}
              className={`py-3 rounded-xl border text-[10px] font-bold transition ${
                val
                  ? "bg-indigo-500 border-indigo-500 text-white"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
              } ${isPlaying && activeStep === idx ? "ring-2 ring-indigo-300" : ""}`}
            >
              S
            </button>
          ))}
        </div>

        {/* Kick Row */}
        <div className="grid grid-cols-9 gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-500">Kick</span>
          {pattern.kick.map((val, idx) => (
            <button
              key={idx}
              onClick={() => toggleStep("kick", idx)}
              className={`py-3 rounded-xl border text-[10px] font-bold transition ${
                val
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
              } ${isPlaying && activeStep === idx ? "ring-2 ring-slate-400" : ""}`}
            >
              K
            </button>
          ))}
        </div>
      </div>

      <div className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
        <Settings className="w-3.5 h-3.5 text-slate-300" />
        <span>Click cells above to toggle drums. Beat auto-syncs to standard audio output buffer parameters.</span>
      </div>
    </div>
  );
}
