import { useState, useEffect } from "react";
import { PREDEFINED_RUDIMENTS } from "./lib/db";
import { Rudiment } from "./types";
import Metronome from "./components/Metronome";
import RudimentTrainer from "./components/RudimentTrainer";
import PracticePlanner from "./components/PracticePlanner";
import GrooveGenerator from "./components/GrooveGenerator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { CircleAlert as AlertCircle, Brain, Sparkles, Activity, Settings, Music, BarChart2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"practice" | "planner" | "groove" | "stats">("practice");
  const [bpm, setBpm] = useState(100);
  const [accentFirstBeat, setAccentFirstBeat] = useState(true);
  const [timeSignature, setTimeSignature] = useState(4);
  const [activeRudiment, setActiveRudiment] = useState<Rudiment>(PREDEFINED_RUDIMENTS[0]);

  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    // Check if Gemini Key is configured
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setHasApiKey(data.hasAPIKey);
      })
      .catch(() => {});
  }, []);

  const handleSelectRudimentFromPlanner = (rudimentId: string, customBpm?: number) => {
    const rud = PREDEFINED_RUDIMENTS.find((r) => r.id === rudimentId);
    if (rud) {
      setActiveRudiment(rud);
      if (customBpm) {
        setBpm(customBpm);
      }
      setActiveTab("practice");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col font-sans" id="drum-learning-root">
      
      {/* Alert banner if API key is missing */}
      {!hasApiKey && (
        <div className="bg-rose-600 px-6 py-3 text-center text-white flex items-center justify-center gap-2 text-xs font-semibold print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>GEMINI_API_KEY is not configured.</strong> AI Coaching and smart routine synthesizers are disabled. Please set GEMINI_API_KEY in your local environment or Playground Secrets to unlock all AI features.
          </span>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg shadow-sm font-bold">
            🥁
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-base md:text-lg leading-tight">
              Acoustic Rhythm Academy
            </h1>
            <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase mt-0.5">
              Interactive Drum Learning & Rudiment Studio
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
          💻 Local Sandbox Storage Enabled
        </div>
      </header>

      {/* Main Dashboard Panel Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("practice")}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "practice"
                ? "border-emerald-500 text-emerald-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Rudiment Practice Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "planner"
                ? "border-emerald-500 text-emerald-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Practice Planner & Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("groove")}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "groove"
                ? "border-emerald-500 text-emerald-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Groove Sequencer</span>
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "stats"
                ? "border-emerald-500 text-emerald-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Practice Statistics</span>
          </button>
        </div>

        {/* Dynamic Panels */}
        {activeTab === "practice" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Metronome and Selection */}
            <div className="space-y-6 lg:col-span-1">
              {/* Rudiment List Selector */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Syllabus Rudiments</h3>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto no-scrollbar">
                  {PREDEFINED_RUDIMENTS.map((rud) => (
                    <button
                      key={rud.id}
                      onClick={() => setActiveRudiment(rud)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        activeRudiment.id === rud.id
                          ? "bg-emerald-50/50 border-emerald-300 text-emerald-950 font-bold"
                          : "bg-white border-slate-150 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold leading-tight">{rud.name}</span>
                        <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wide mt-1 block">
                          {rud.difficulty} • {rud.category}
                        </span>
                      </div>
                      <span className="text-xs">➔</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Precise Audio Metronome */}
              <Metronome
                bpm={bpm}
                setBpm={setBpm}
                accentFirstBeat={accentFirstBeat}
                setAccentFirstBeat={setAccentFirstBeat}
                timeSignature={timeSignature}
                setTimeSignature={setTimeSignature}
              />
            </div>

            {/* Right Column: Training Pad Practice area */}
            <div className="lg:col-span-2">
              <RudimentTrainer
                rudiment={activeRudiment}
                metronomeBpm={bpm}
              />
            </div>

          </div>
        )}

        {activeTab === "planner" && (
          <PracticePlanner
            onSelectRudiment={handleSelectRudimentFromPlanner}
            currentBpm={bpm}
          />
        )}

        {activeTab === "groove" && (
          <GrooveGenerator />
        )}

        {activeTab === "stats" && (
          <AnalyticsDashboard />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Acoustic Rhythm Academy. Empowering local musicianship without server constraints.</p>
        <p className="text-[10px] text-slate-300 mt-1">
          Running on local laptop storage environment. Snapshot downloadable through AI Studio settings interface.
        </p>
      </footer>
    </div>
  );
}
