import { useEffect, useState } from 'react';

export interface Controls {
    dive: boolean; // W
    flare: boolean; // S
    left: boolean; // A
    right: boolean; // D
    action: boolean; // Space
    track: boolean; // Shift
}

const CONTROL_MAP: Record<string, keyof Controls> = {
    KeyW: 'dive',
    ArrowUp: 'dive',
    KeyS: 'flare',
    ArrowDown: 'flare',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'action',
    ShiftLeft: 'track',
    ShiftRight: 'track',
};

export const useControls = () => {
    const [controls, setControls] = useState<Controls>({
        dive: false,
        flare: false,
        left: false,
        right: false,
        action: false,
        track: false,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const control = CONTROL_MAP[e.code];
            if (control) {
                setControls((prev) => ({ ...prev, [control]: true }));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const control = CONTROL_MAP[e.code];
            if (control) {
                setControls((prev) => ({ ...prev, [control]: false }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return controls;
};
