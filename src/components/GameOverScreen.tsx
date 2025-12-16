import { Html } from '@react-three/drei';
import { useGameStore, GamePhase } from '../stores/useGameStore';

export const GameOverScreen = () => {
    const { phase, score, reset } = useGameStore();

    if (phase !== GamePhase.LANDED) return null;

    return (
        <Html center>
            <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', color: '#333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <h1 style={{ margin: '0 0 20px 0', fontSize: '3em' }}>TOUCHDOWN!</h1>
                <div style={{ fontSize: '1.5em', marginBottom: '30px' }}>
                    Distance to Target: <strong>{score.toFixed(1)} m</strong>
                </div>
                <button
                    onClick={reset}
                    style={{ background: '#007bff', color: 'white', border: 'none', padding: '15px 30px', fontSize: '1.2em', borderRadius: '10px', cursor: 'pointer' }}
                >
                    Jump Again
                </button>
            </div>
        </Html>
    );
};
