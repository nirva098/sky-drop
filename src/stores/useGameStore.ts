import { create } from 'zustand';

export const GamePhase = {
    READY: 'READY',
    FREEFALL: 'FREEFALL',
    CANOPY: 'CANOPY',
    LANDED: 'LANDED',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

interface GameState {
    phase: GamePhase;
    altitude: number;
    speed: number;
    score: number;

    // Actions
    setPhase: (phase: GamePhase) => void;
    setAltitude: (alt: number) => void;
    setSpeed: (speed: number) => void;
    setScore: (dist: number) => void;
    reset: () => void;

    // Transitions
    jump: () => void;
    deployChute: () => void;
    land: () => void;
}

export const useGameStore = create<GameState>((set) => ({
    phase: GamePhase.READY,
    altitude: 3048, // 10,000 ft
    speed: 0,
    score: 0,

    setPhase: (phase) => set({ phase }),
    setAltitude: (altitude) => set({ altitude }),
    setSpeed: (speed) => set({ speed }),
    setScore: (score) => set({ score }),

    reset: () => set({
        phase: GamePhase.READY,
        altitude: 3048,
        speed: 0,
        score: 0
    }),

    jump: () => set({ phase: GamePhase.FREEFALL }),
    deployChute: () => set({ phase: GamePhase.CANOPY }),
    land: () => set({ phase: GamePhase.LANDED }),
}));
