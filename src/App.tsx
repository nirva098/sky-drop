import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { GameScene } from './scenes/GameScene';
import { useGameStore } from './stores/useGameStore';

const HUD = () => {
  const { altitude, speed, phase } = useGameStore();
  return (
    <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'monospace', fontSize: '1.2em', pointerEvents: 'none', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>SKY DROP DEBUG</div>
      <div>ALT: {altitude.toFixed(0)}m</div>
      <div>SPD: {speed.toFixed(1)}m/s</div>
      <div>PHASE: {phase}</div>
      <div style={{ fontSize: '0.8em', opacity: 0.9, marginTop: 10, borderTop: '1px solid #555', paddingTop: '5px' }}>
        [SPACE] ... Jump / Open<br />
        [W] ....... Dive (Fast)<br />
        [S] ....... Arch (Slow)<br />
        [SHIFT] ... Track
      </div>
    </div>
  );
};

function App() {
  return (
    <>
      <HUD />
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
