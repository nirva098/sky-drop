import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, GamePhase } from '../stores/useGameStore';

/**
 * Speed-reactive particle system for wind/velocity visualization
 * Particles intensity and color shift based on current speed
 */
export const SpeedParticles = () => {
    const { speed, phase } = useGameStore();
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    // Particle configuration
    const count = 300;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Particle state
    const particleData = useRef<{
        positions: Float32Array;
        velocities: Float32Array;
        sizes: Float32Array;
    }>({
        positions: new Float32Array(count * 3),
        velocities: new Float32Array(count),
        sizes: new Float32Array(count),
    });

    // Initialize particles
    useMemo(() => {
        const data = particleData.current;
        for (let i = 0; i < count; i++) {
            // Random positions in a box around camera
            data.positions[i * 3] = (Math.random() - 0.5) * 30;
            data.positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
            data.positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
            data.velocities[i] = Math.random() * 0.5 + 0.5;
            data.sizes[i] = Math.random() * 0.5 + 0.5;
        }
    }, [count]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        const mesh = meshRef.current;
        const data = particleData.current;
        const cameraPos = state.camera.position;

        // Only show particles during active phases with significant speed
        const minSpeed = phase === GamePhase.CANOPY ? 3 : 15;
        if (speed < minSpeed || phase === GamePhase.READY || phase === GamePhase.LANDED) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;

        // Speed factor affects particle behavior
        const speedFactor = Math.min(1, speed / 80);
        const stretchFactor = 0.05 + speedFactor * 0.3;

        // Update each particle
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            // Move particles upward (we're falling, so wind appears to go up)
            const particleSpeed = speed * data.velocities[i] * delta;
            data.positions[idx + 1] += particleSpeed;
            
            // Add slight horizontal drift
            data.positions[idx] += (Math.random() - 0.5) * delta * 2;
            data.positions[idx + 2] += (Math.random() - 0.5) * delta * 2;

            // Reset particles that go too far
            if (data.positions[idx + 1] > 15) {
                data.positions[idx] = (Math.random() - 0.5) * 30;
                data.positions[idx + 1] = -15;
                data.positions[idx + 2] = (Math.random() - 0.5) * 30;
            }

            // Position relative to camera
            dummy.position.set(
                cameraPos.x + data.positions[idx],
                cameraPos.y + data.positions[idx + 1],
                cameraPos.z + data.positions[idx + 2]
            );

            // Stretch based on speed (elongated in Y direction)
            const baseSize = data.sizes[i] * 0.02;
            dummy.scale.set(
                baseSize,
                baseSize + speed * stretchFactor * data.sizes[i],
                baseSize
            );

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;

        // Update material color based on speed
        // Shift from white to light blue at high speeds
        const material = mesh.material as THREE.MeshBasicMaterial;
        const blueShift = speedFactor * 0.3;
        material.color.setRGB(1 - blueShift * 0.5, 1 - blueShift * 0.2, 1);
        material.opacity = 0.2 + speedFactor * 0.4;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial 
                color="white" 
                transparent 
                opacity={0.3}
                depthWrite={false}
            />
        </instancedMesh>
    );
};
