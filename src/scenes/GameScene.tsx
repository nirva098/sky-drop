import { Sky, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Player } from '../components/Player';
import { Terrain } from '../components/Terrain';
import { Atmosphere } from '../components/Atmosphere';
import { GameOverScreen } from '../components/GameOverScreen';
import { CargoPlane } from '../components/CargoPlane';
import { SpeedParticles } from '../components/SpeedParticles';
import { useGameStore, GamePhase } from '../stores/useGameStore';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

export const GameScene = () => {
  const { altitude } = useGameStore();
  
  // Dynamic sky based on altitude
  const skyTurbidity = Math.max(1, 10 - (altitude / 500));
  const skyRayleigh = Math.max(0.5, 3 - (altitude / 1500));
  
  return (
    <>
      {/* Dynamic background color based on altitude */}
      <color attach="background" args={[getBackgroundColor(altitude)]} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4 + (altitude / 10000) * 0.2} />
      <directionalLight 
        position={[50, 100, 25]} 
        castShadow 
        intensity={1.5} 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />
      
      {/* Sky with altitude-dependent parameters */}
      <Sky 
        sunPosition={[100, 20, 100]} 
        turbidity={skyTurbidity} 
        rayleigh={skyRayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      
      {/* Stars visible at high altitude */}
      {altitude > 2000 && (
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={1} 
        />
      )}

      <Physics gravity={[0, 0, 0]}> {/* We handle gravity manually */}
        <Terrain />
        <Player />
      </Physics>

      <CargoPlane />
      <Atmosphere />
      <SpeedParticles />
      <GameOverScreen />
      <DynamicCamera />
    </>
  );
};

/**
 * Get background color based on altitude
 * Higher = deeper blue, lower = lighter with haze
 */
function getBackgroundColor(altitude: number): string {
  if (altitude > 2500) return '#1a3a5c'; // Deep sky blue
  if (altitude > 1500) return '#4a7aac'; // Mid sky blue  
  if (altitude > 500) return '#87CEEB'; // Standard sky blue
  return '#a8d4e6'; // Hazy horizon
}

/**
 * Dynamic Camera with FOV scaling, phase-appropriate behavior, and smooth following
 */
const DynamicCamera = () => {
  const { phase, altitude, speed } = useGameStore();
  const { camera } = useThree();
  
  // Smooth values
  const targetFovRef = useRef(60);
  const currentFovRef = useRef(60);
  const shakeRef = useRef(0);
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 5, 10));
  const isFirstFrame = useRef(true);
  
  useFrame((state, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    
    // =========================================================================
    // FOV SCALING - Speed creates sense of velocity
    // =========================================================================
    const baseFov = 60;
    const maxFovIncrease = 30;
    const speedFactor = Math.min(1, speed / 100); // 0-1 based on speed up to 100 m/s
    
    if (phase === GamePhase.FREEFALL) {
      targetFovRef.current = baseFov + speedFactor * maxFovIncrease;
    } else if (phase === GamePhase.CANOPY) {
      // Narrower FOV under canopy for more relaxed feeling
      targetFovRef.current = baseFov - 5;
    } else {
      targetFovRef.current = baseFov;
    }
    
    // Smooth FOV transition
    currentFovRef.current += (targetFovRef.current - currentFovRef.current) * delta * 3;
    perspectiveCamera.fov = currentFovRef.current;
    perspectiveCamera.updateProjectionMatrix();
    
    // =========================================================================
    // CAMERA SHAKE - High speed turbulence
    // =========================================================================
    let shakeIntensity = 0;
    if (phase === GamePhase.FREEFALL && speed > 40) {
      shakeIntensity = ((speed - 40) / 60) * 0.3; // Up to 0.3 units shake
    }
    
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    
    // =========================================================================
    // CAMERA POSITION - Phase-appropriate framing
    // =========================================================================
    let targetPosition = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();
    
    if (phase === GamePhase.READY) {
      // Interior plane view - looking at jump door
      targetPosition.set(0, altitude - 1, 15);
      targetLookAt.set(0, altitude, 0);
      cameraOffsetRef.current.lerp(new THREE.Vector3(0, -1, 15), delta * 2);
    } else if (phase === GamePhase.FREEFALL) {
      // Dynamic follow - slightly behind and above
      // Distance increases with speed for dramatic effect
      const followDistance = 8 + (speed / 50) * 4;
      const followHeight = 3 + (speed / 100) * 2;
      
      targetPosition.set(0, altitude + followHeight, followDistance);
      targetLookAt.set(0, altitude - 5, 0); // Look slightly ahead of player
      cameraOffsetRef.current.lerp(new THREE.Vector3(0, followHeight, followDistance), delta * 3);
    } else if (phase === GamePhase.CANOPY) {
      // Pull back for wider view under canopy
      const followDistance = 15;
      const followHeight = 5;
      
      targetPosition.set(0, altitude + followHeight, followDistance);
      targetLookAt.set(0, altitude, -10); // Look at where player is heading
      cameraOffsetRef.current.lerp(new THREE.Vector3(0, followHeight, followDistance), delta * 2);
    } else {
      // Landed - low orbit view
      const time = state.clock.elapsedTime;
      const orbitRadius = 8;
      const orbitHeight = 3;
      const orbitSpeed = 0.2;
      
      targetPosition.set(
        Math.sin(time * orbitSpeed) * orbitRadius,
        orbitHeight,
        Math.cos(time * orbitSpeed) * orbitRadius
      );
      targetLookAt.set(0, 1, 0);
      cameraOffsetRef.current.lerp(new THREE.Vector3(0, orbitHeight, orbitRadius), delta);
    }
    
    // Apply camera position with smoothing
    // On first frame, snap to position immediately
    if (isFirstFrame.current) {
      state.camera.position.copy(targetPosition);
      isFirstFrame.current = false;
    } else {
      const lerpSpeed = phase === GamePhase.LANDED ? 0.5 : 3;
      state.camera.position.lerp(
        targetPosition.add(new THREE.Vector3(shakeX, shakeY, 0)),
        delta * lerpSpeed
      );
    }
    
    // Look at target
    state.camera.lookAt(targetLookAt);
  });

  return null;
};
