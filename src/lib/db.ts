import { PracticeSession, Rudiment, CustomRoutine } from "../types";

const STORAGE_KEY_SESSIONS = "drum_practice_sessions";
const STORAGE_KEY_ROUTINES = "drum_practice_routines";

// Predefined rudiments
export const PREDEFINED_RUDIMENTS: Rudiment[] = [
  {
    id: "single-stroke-roll",
    name: "Single Stroke Roll",
    description: "Alternating single strokes on each hand. The most fundamental drum rudiment.",
    difficulty: "Beginner",
    pattern: "R L R L R L R L",
    sticking: ["R", "L", "R", "L", "R", "L", "R", "L"],
    subdivision: 16,
    category: "Rolls"
  },
  {
    id: "double-stroke-roll",
    name: "Double Stroke Roll",
    description: "Alternating double strokes on each hand (diddles).",
    difficulty: "Beginner",
    pattern: "R R L L R R L L",
    sticking: ["R", "R", "L", "L", "R", "R", "L", "L"],
    subdivision: 16,
    category: "Rolls"
  },
  {
    id: "single-paradiddle",
    name: "Single Paradiddle",
    description: "A combination of single and double strokes. Essential for moving smoothly around the kit.",
    difficulty: "Beginner",
    pattern: "R L R R L R L L",
    sticking: ["R", "L", "R", "R", "L", "R", "L", "L"],
    subdivision: 16,
    category: "Diddles"
  },
  {
    id: "double-paradiddle",
    name: "Double Paradiddle",
    description: "Adds another set of alternating single strokes before the diddle.",
    difficulty: "Intermediate",
    pattern: "R L R L R R L R L R L L",
    sticking: ["R", "L", "R", "L", "R", "R", "L", "R", "L", "R", "L", "L"],
    subdivision: 16,
    category: "Diddles"
  },
  {
    id: "flam",
    name: "Flam",
    description: "A small grace note played slightly before the primary stroke with opposite hand.",
    difficulty: "Beginner",
    pattern: "lR rL lR rL",
    sticking: ["L/R", "R/L", "L/R", "R/L"],
    subdivision: 8,
    category: "Flams"
  },
  {
    id: "flam-tap",
    name: "Flam Tap",
    description: "Alternating flams followed by a single tap of the same hand.",
    difficulty: "Intermediate",
    pattern: "lR R rL L lR R rL L",
    sticking: ["L/R", "R", "R/L", "L", "L/R", "R", "R/L", "L"],
    subdivision: 16,
    category: "Flams"
  },
  {
    id: "drag",
    name: "Single Drag Tap",
    description: "Two rapid grace notes played before an accented beat.",
    difficulty: "Intermediate",
    pattern: "llR L rrL R",
    sticking: ["LL/R", "L", "RR/L", "R"],
    subdivision: 8,
    category: "Drags"
  },
  {
    id: "five-stroke-roll",
    name: "Five Stroke Roll",
    description: "Two doubles and a single accent: RRLLR or LLRRL.",
    difficulty: "Intermediate",
    pattern: "R R L L R L L R R L",
    sticking: ["R", "R", "L", "L", "R", "L", "L", "R", "R", "L"],
    subdivision: 16,
    category: "Rolls"
  }
];

// Load practice sessions from localStorage
export function getPracticeSessions(): PracticeSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load practice sessions", error);
    return [];
  }
}

// Save a practice session to localStorage
export function savePracticeSession(session: PracticeSession): void {
  try {
    const sessions = getPracticeSessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save practice session", error);
  }
}

// Load custom routines
export function getCustomRoutines(): CustomRoutine[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ROUTINES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load routines", error);
    return [];
  }
}

// Save a custom routine
export function saveCustomRoutine(routine: CustomRoutine): void {
  try {
    const routines = getCustomRoutines();
    routines.push(routine);
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(routines));
  } catch (error) {
    console.error("Failed to save routine", error);
  }
}

// Delete a custom routine
export function deleteCustomRoutine(id: string): void {
  try {
    const routines = getCustomRoutines();
    const filtered = routines.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete routine", error);
  }
}
