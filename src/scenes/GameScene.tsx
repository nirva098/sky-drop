import { Sky, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Player } from '../components/Player';
import { Terrain } from '../components/Terrain';
import { Atmosphere } from '../components/Atmosphere';
import { useGameStore } from '../stores/useGameStore';

export const GameScene = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 25]} castShadow intensity={1.5} shadow-mapSize={[2048, 2048]} />
      <Sky sunPosition={[100, 20, 100]} turbidity={10} rayleigh={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Physics>
        <Terrain />
        <Player />
      </Physics>

      <Atmosphere />
      {/* HUD Overlay placed via Portal or just outside canvas in main App? 
          For now, we can't render HTML inside Canvas easily without <Html>. 
          Ideally HUD should be in App.tsx, but let's put camera controller here. 
      */}
      <CameraFollow />
    </>
  );
};

// Simple Camera Follow Component
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CameraFollow = () => {
  const { phase, altitude } = useGameStore();

  useFrame((state) => {
    // Simple distinct camera modes
    if (phase === 'READY') {
      // In plane view (Side scroll style or fixed)
      state.camera.position.lerp(new THREE.Vector3(0, 10000, 20), 0.1);
      state.camera.lookAt(0, 10000, 0);
    } else if (phase === 'FREEFALL' || phase === 'CANOPY') {
      // Follow player falling
      const playerY = altitude;

      // Look slightly down
      state.camera.position.lerp(new THREE.Vector3(0, playerY + 5, 10), 0.1);
      state.camera.lookAt(0, playerY, 0);
    } else {
      // Landed
      state.camera.position.lerp(new THREE.Vector3(0, 2, 5), 0.1);
      state.camera.lookAt(0, 1, 0);
    }
  });

  return null; // managing camera directly
};
