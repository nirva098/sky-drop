import { create } from 'zustand';
import type { LandingQuality } from '../physics/simulation';
import { JUMP_ALTITUDE } from '../physics/constants';

export const GamePhase = {
    READY: 'READY',
    FREEFALL: 'FREEFALL',
    CANOPY: 'CANOPY',
    LANDED: 'LANDED',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/**
 * Telemetry data point for physics validation
 */
export interface TelemetryPoint {
    time: number;
    altitude: number;
    speed: number;
    gForce: number;
    phase: GamePhase;
}

interface GameState {
    phase: GamePhase;
    altitude: number;
    speed: number;
    acceleration: number; // G-force
    score: number;
    landingQuality: LandingQuality | null;
    
    // Telemetry for validation
    telemetry: TelemetryPoint[];
    telemetryEnabled: boolean;
    jumpStartTime: number;

    // Actions
    setPhase: (phase: GamePhase) => void;
    setAltitude: (alt: number) => void;
    setSpeed: (speed: number) => void;
    setAcceleration: (accel: number) => void;
    setScore: (dist: number) => void;
    setLandingQuality: (quality: LandingQuality) => void;
    reset: () => void;

    // Transitions
    jump: () => void;
    deployChute: () => void;
    land: () => void;
    
    // Telemetry
    recordTelemetry: (time: number) => void;
    toggleTelemetry: () => void;
    exportTelemetry: () => string;
    clearTelemetry: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    phase: GamePhase.READY,
    altitude: JUMP_ALTITUDE,
    speed: 0,
    acceleration: 0,
    score: 0,
    landingQuality: null,
    
    telemetry: [],
    telemetryEnabled: false,
    jumpStartTime: 0,

    setPhase: (phase) => set({ phase }),
    setAltitude: (altitude) => set({ altitude }),
    setSpeed: (speed) => set({ speed }),
    setAcceleration: (accel) => set({ acceleration: accel }),
    setScore: (score) => set({ score }),
    setLandingQuality: (landingQuality) => set({ landingQuality }),

    reset: () => set({
        phase: GamePhase.READY,
        altitude: JUMP_ALTITUDE,
        speed: 0,
        acceleration: 0,
        score: 0,
        landingQuality: null,
        telemetry: [],
        jumpStartTime: 0,
    }),

    jump: () => set((state) => ({ 
        phase: GamePhase.FREEFALL,
        jumpStartTime: performance.now() / 1000,
        telemetry: state.telemetryEnabled ? [] : state.telemetry,
    })),
    
    deployChute: () => set({ phase: GamePhase.CANOPY }),
    land: () => set({ phase: GamePhase.LANDED }),
    
    recordTelemetry: (time: number) => {
        const state = get();
        if (!state.telemetryEnabled) return;
        if (state.phase === GamePhase.READY || state.phase === GamePhase.LANDED) return;
        
        const jumpTime = time - state.jumpStartTime;
        
        // Only record every 0.5 seconds to avoid huge arrays
        const lastPoint = state.telemetry[state.telemetry.length - 1];
        if (lastPoint && jumpTime - lastPoint.time < 0.5) return;
        
        const point: TelemetryPoint = {
            time: jumpTime,
            altitude: state.altitude,
            speed: state.speed,
            gForce: state.acceleration,
            phase: state.phase,
        };
        
        set({ telemetry: [...state.telemetry, point] });
    },
    
    toggleTelemetry: () => set((state) => ({ 
        telemetryEnabled: !state.telemetryEnabled 
    })),
    
    exportTelemetry: () => {
        const state = get();
        const lines = [
            'Time(s),Altitude(m),Speed(m/s),G-Force,Phase',
            ...state.telemetry.map(p => 
                `${p.time.toFixed(2)},${p.altitude.toFixed(1)},${p.speed.toFixed(2)},${p.gForce.toFixed(3)},${p.phase}`
            )
        ];
        return lines.join('\n');
    },
    
    clearTelemetry: () => set({ telemetry: [] }),
}));
