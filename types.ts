export interface Rudiment {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  pattern: string; // e.g. "R L R R L R L L"
  sticking: string[]; // ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L']
  subdivision: 4 | 8 | 16; // 16th notes, 8th notes, quarter notes
  notationText?: string;
  category: "Rolls" | "Diddles" | "Flams" | "Drags";
}

export interface MetronomeSettings {
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  subdivision: 1 | 2 | 4 | 8; // Beats per beat (1 = quarters, 2 = eighths, 4 = sixteenths, etc.)
  accentFirstBeat: boolean;
  volume: number;
}

export interface PracticeSession {
  id: string;
  rudimentId: string;
  rudimentName: string;
  date: string; // YYYY-MM-DD
  bpm: number;
  durationSeconds: number;
  accuracyScore: number; // 0 - 100
  totalHits: number;
  correctHits: number;
  timestamp: number;
}

export interface CustomRoutine {
  id: string;
  name: string;
  description: string;
  steps: {
    rudimentId: string;
    durationMinutes: number;
    startBpm: number;
    targetBpm: number;
  }[];
  createdAt: number;
}

export interface CoachChatSession {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}
