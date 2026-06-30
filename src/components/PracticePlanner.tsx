import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Brain, Sparkles, Plus, Play, Trash2 } from "lucide-react";
import { CustomRoutine, CoachChatSession } from "../types";
import { getCustomRoutines, saveCustomRoutine, deleteCustomRoutine, PREDEFINED_RUDIMENTS } from "../lib/db";

interface PracticePlannerProps {
  onSelectRudiment: (id: string, customBpm?: number) => void;
  currentBpm: number;
}

export default function PracticePlanner({ onSelectRudiment, currentBpm }: PracticePlannerProps) {
  const [routines, setRoutines] = useState<CustomRoutine[]>([]);
  const [chatHistory, setChatHistory] = useState<CoachChatSession[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // New Routine Form
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineDesc, setNewRoutineDesc] = useState("");
  const [selectedRudimentId, setSelectedRudimentId] = useState(PREDEFINED_RUDIMENTS[0].id);
  const [stepDuration, setStepDuration] = useState(5);
  const [stepStartBpm, setStepStartBpm] = useState(currentBpm);
  const [stepTargetBpm, setStepTargetBpm] = useState(currentBpm + 20);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadRoutines();
    
    // Seed default coach greeting
    setChatHistory([
      {
        id: "greet",
        role: "model",
        text: "Hey! I'm Coach Dave, your AI drumming instructor. Need tips on improving your single-paradiddles, double-stroke rolls, or looking for a customized speed training workout routine? Ask me anything!",
        timestamp: Date.now()
      }
    ]);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const loadRoutines = () => {
    setRoutines(getCustomRoutines());
  };

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;

    const routine: CustomRoutine = {
      id: `routine_${Date.now()}`,
      name: newRoutineName,
      description: newRoutineDesc,
      steps: [
        {
          rudimentId: selectedRudimentId,
          durationMinutes: stepDuration,
          startBpm: stepStartBpm,
          targetBpm: stepTargetBpm
        }
      ],
      createdAt: Date.now()
    };

    saveCustomRoutine(routine);
    loadRoutines();

    setNewRoutineName("");
    setNewRoutineDesc("");
  };

  const handleDeleteRoutineItem = (id: string) => {
    deleteCustomRoutine(id);
    loadRoutines();
  };

  const handleSendChat = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMsg: CoachChatSession = {
      id: `chat_${Date.now()}`,
      role: "user",
      text: inputMessage,
      timestamp: Date.now()
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/drum-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          history: chatHistory.map(h => ({ sender: h.role, text: h.text }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI Drum Coach.");
      }

      const data = await response.json();
      const coachMsg: CoachChatSession = {
        id: `chat_${Date.now() + 1}`,
        role: "model",
        text: data.reply || "I'm having some trouble formulating thoughts, but keep practicing those stroke rolls!",
        timestamp: Date.now()
      };

      setChatHistory((prev) => [...prev, coachMsg]);
    } catch (e: any) {
      console.error(e);
      const errMsg: CoachChatSession = {
        id: `chat_err_${Date.now()}`,
        role: "model",
        text: "I couldn't reach the AI server. Remember that drumming takes practice, consistency, and focus! Use standard metronome settings to work on timing.",
        timestamp: Date.now()
      };
      setChatHistory((prev) => [...prev, errMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preset generators triggered via Gemini AI
  const handleAIWorksheetRoutine = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-drum-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpm: currentBpm })
      });

      if (!response.ok) throw new Error("Routine generation failed.");
      
      const data = await response.json();
      if (data && data.name) {
        const routine: CustomRoutine = {
          id: `routine_ai_${Date.now()}`,
          name: `AI: ${data.name}`,
          description: data.description,
          steps: data.steps.map((st: any) => ({
            rudimentId: st.rudimentId || "single-stroke-roll",
            durationMinutes: st.durationMinutes || 3,
            startBpm: st.startBpm || currentBpm,
            targetBpm: st.targetBpm || (currentBpm + 15)
          })),
          createdAt: Date.now()
        };
        saveCustomRoutine(routine);
        loadRoutines();
        
        // Coach logs a response in chat
        setChatHistory((prev) => [
          ...prev,
          {
            id: `chat_${Date.now()}`,
            role: "model",
            text: `✨ I have formulated a specialized workout routine for you: "${data.name}". It has been appended to your local Custom Workouts below!`,
            timestamp: Date.now()
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* AI Drum Coach Dave */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[550px]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-sm">
              👑
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">AI Coach Dave</h3>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Master Drumming Instructor</p>
            </div>
          </div>
          <button
            onClick={handleAIWorksheetRoutine}
            disabled={isGenerating}
            className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            <span>AI WORKOUT GENERATOR</span>
          </button>
        </div>

        {/* Chat Message Window */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 no-scrollbar">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  chat.role === "user"
                    ? "bg-slate-850 text-white rounded-br-none"
                    : "bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-3xs"
                }`}
              >
                {chat.text}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <Brain className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Coach Dave is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input trigger */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            placeholder="Ask Dave about sticking tips, polyrhythms, or drum concepts..."
            className="flex-1 px-4 py-2 border border-slate-200 text-xs rounded-xl focus:outline-emerald-500 bg-white"
          />
          <button
            onClick={handleSendChat}
            disabled={!inputMessage.trim() || isGenerating}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white transition disabled:opacity-50"
          >
            <Send className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>

      {/* Routine Custom Planner and lists */}
      <div className="space-y-6">
        
        {/* Workouts creator */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Create Practice Workout
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">Structure local drum routines based on custom tempo bounds</p>

          <form onSubmit={handleCreateRoutine} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Workout Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diddle Warmup"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target Rudiment
                </label>
                <select
                  value={selectedRudimentId}
                  onChange={(e) => setSelectedRudimentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg bg-white"
                >
                  {PREDEFINED_RUDIMENTS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Short description
              </label>
              <input
                type="text"
                placeholder="Briefly describe the exercise goal..."
                value={newRoutineDesc}
                onChange={(e) => setNewRoutineDesc(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-emerald-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={stepDuration}
                  onChange={(e) => setStepDuration(parseInt(e.target.value) || 5)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Start BPM
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={stepStartBpm}
                  onChange={(e) => setStepStartBpm(parseInt(e.target.value) || 100)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target BPM
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={stepTargetBpm}
                  onChange={(e) => setStepTargetBpm(parseInt(e.target.value) || 120)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-emerald-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition shadow-xs"
            >
              Add Workout Routine
            </button>
          </form>
        </div>

        {/* Saved routines list */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm max-h-[250px] overflow-y-auto no-scrollbar flex-1 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Custom & AI Workouts</h3>
          
          <div className="space-y-3 flex-1">
            {routines.map((rt) => (
              <div key={rt.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 duration-150">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{rt.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{rt.description}</p>
                  {rt.steps && rt.steps.length > 0 && (
                    <div className="flex gap-2 text-[9px] font-bold text-indigo-600 mt-1.5 uppercase tracking-wide">
                      <span>{rt.steps[0].durationMinutes} Mins</span>
                      <span>•</span>
                      <span>{rt.steps[0].startBpm} ➔ {rt.steps[0].targetBpm} BPM</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {rt.steps && rt.steps.length > 0 && (
                    <button
                      onClick={() => onSelectRudiment(rt.steps[0].rudimentId, rt.steps[0].startBpm)}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
                      title="Launch Routine"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteRoutineItem(rt.id)}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition"
                    title="Delete Routine"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {routines.length === 0 && (
              <div className="text-center py-6">
                <span className="text-2xl">⚡</span>
                <p className="text-xs font-semibold text-slate-400 mt-1">No custom workout structures yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Generate an AI routine or create a manual practice sequence!</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
