import { useState, useEffect } from "react";
import { getPracticeSessions, PREDEFINED_RUDIMENTS } from "../lib/db";
import { PracticeSession } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, BarChart3, Clock, Flame, Calendar, RefreshCw } from "lucide-react";

export default function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);

  const loadSessions = () => {
    const data = getPracticeSessions();
    setSessions(data);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Compute stats
  const totalPracticeTimeSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalPracticeTimeMinutes = Math.round(totalPracticeTimeSeconds / 60);
  const averageAccuracy = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.accuracyScore, 0) / sessions.length) 
    : 0;
  
  // Calculate streaks (consecutive days of practice)
  const getStreak = () => {
    if (sessions.length === 0) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort();
    let streak = 0;
    let today = new Date().toISOString().split("T")[0];
    
    // Check if practiced today or yesterday
    if (dates.includes(today) || dates.includes(new Date(Date.now() - 86400000).toISOString().split("T")[0])) {
      streak = 1;
      for (let i = dates.length - 1; i > 0; i--) {
        const d1 = new Date(dates[i]);
        const d2 = new Date(dates[i - 1]);
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
        } else if (diffDays > 1) {
          break;
        }
      }
    }
    return streak;
  };

  const streakDays = getStreak();

  // Aggregate performance data over time for chart
  const getChartData = () => {
    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map(s => ({
      date: s.date.slice(5), // MM-DD
      accuracy: s.accuracyScore,
      bpm: s.bpm,
      name: s.rudimentName
    }));
  };

  // Group by Rudiment type
  const getRudimentDistribution = () => {
    const distribution: Record<string, number> = {};
    sessions.forEach(s => {
      distribution[s.rudimentName] = (distribution[s.rudimentName] || 0) + Math.round(s.durationSeconds / 60);
    });
    return Object.entries(distribution).map(([name, mins]) => ({ name, mins }));
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Practice Minutes
            </span>
            <span className="text-xl font-bold text-slate-800">{totalPracticeTimeMinutes}m</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Avg Precision
            </span>
            <span className="text-xl font-bold text-slate-800">{averageAccuracy}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Daily Streak
            </span>
            <span className="text-xl font-bold text-slate-800">{streakDays} Days</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Sessions
            </span>
            <span className="text-xl font-bold text-slate-800">{sessions.length} sessions</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Precision Progress Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Precision Progress Trajectory</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Evaluation accuracy percentage plotted chronologically</p>
            </div>
            <button
              onClick={loadSessions}
              className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition"
              title="Refresh Stats"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[250px] w-full mt-2">
            {sessions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px" }}
                    itemStyle={{ color: "#fff", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAccuracy)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">📊</span>
                <p className="text-xs font-semibold text-slate-400">No session metrics available.</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Practice active rudiments to chart your precision improvements!</p>
              </div>
            )}
          </div>
        </div>

        {/* Practice Time Distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Time allocation</h3>
          <p className="text-[10px] text-slate-400 mb-4">Minutes allocated across diverse rudiments</p>

          <div className="h-[250px] w-full">
            {sessions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getRudimentDistribution()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px" }}
                    itemStyle={{ color: "#fff", fontSize: "11px" }}
                  />
                  <Bar dataKey="mins" name="Minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">🥁</span>
                <p className="text-xs font-semibold text-slate-400">No practice distribution yet.</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Your time allocation chart will appear here after practicing.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Practice History</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Complete record of your laptop drum routines</p>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear your local history?")) {
                  localStorage.removeItem("drum_practice_sessions");
                  loadSessions();
                }
              }}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider"
            >
              Clear Log History
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {sessions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Rudiment</th>
                  <th className="py-3 px-5">Tempo (BPM)</th>
                  <th className="py-3 px-5">Duration</th>
                  <th className="py-3 px-5">Hits</th>
                  <th className="py-3 px-5 text-right">Precision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-semibold text-slate-500">{s.date}</td>
                    <td className="py-3 px-5 font-bold text-slate-800">{s.rudimentName}</td>
                    <td className="py-3 px-5 tabular-nums">{s.bpm} BPM</td>
                    <td className="py-3 px-5 font-bold text-slate-500">{s.durationSeconds}s</td>
                    <td className="py-3 px-5 text-slate-500">{s.correctHits} / {s.totalHits}</td>
                    <td className="py-3 px-5 text-right font-extrabold text-emerald-600 tabular-nums">
                      {s.accuracyScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center">
              <p className="text-xs font-semibold text-slate-400">No entries in the local practice logs.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Start an active routine to build your persistent log book.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
