import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { GameScene } from './scenes/GameScene';

function App() {
  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
      <Suspense fallback={null}>
        <GameScene />
      </Suspense>
    </Canvas>
  );
}

export default App;
