import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../stores/useGameStore';

export const SpeedParticles = () => {
    const { speed } = useGameStore();
    const count = 200;
    const mesh = useRef<THREE.InstancedMesh>(null);

    // Create random positions around camera
    const dummy = new THREE.Object3D();
    const particles = useRef(new Float32Array(count * 3));
    const speeds = useRef(new Float32Array(count));

    useFrame((state, delta) => {
        if (!mesh.current) return;

        // Only show if moving fast
        if (speed < 10) {
            mesh.current.visible = false;
            return;
        }
        mesh.current.visible = true;

        const cameraPos = state.camera.position;

        for (let i = 0; i < count; i++) {
            // Update Y position (fall up relative to camera, or particles move up?)
            // Actually, we are falling down. Particles should stay still or move up relative to us.
            // Let's just simulate "wind" moving UP past the camera (+Y).

            // Initialize if needed
            if (!particles.current[i * 3 + 1]) { // If Y is 0 (uninitialized roughly)
                particles.current[i * 3] = (Math.random() - 0.5) * 20; // X
                particles.current[i * 3 + 1] = (Math.random() - 0.5) * 20; // Y
                particles.current[i * 3 + 2] = (Math.random() - 0.5) * 20; // Z
                speeds.current[i] = Math.random() * 0.5 + 0.5;
            }

            // Move particle UP (relative to camera falling down)
            // Speed factor based on actual player speed
            const speedFactor = speed * 0.5 * delta * speeds.current[i];

            particles.current[i * 3 + 1] += speedFactor; // Y up

            // Reset if too high
            if (particles.current[i * 3 + 1] > 10) {
                particles.current[i * 3 + 1] = -10;
                particles.current[i * 3] = (Math.random() - 0.5) * 20;
                particles.current[i * 3 + 2] = (Math.random() - 0.5) * 20;
            }

            // Update Instance
            dummy.position.set(
                cameraPos.x + particles.current[i * 3],
                cameraPos.y + particles.current[i * 3 + 1],
                cameraPos.z + particles.current[i * 3 + 2]
            );
            // Stretch based on speed
            dummy.scale.set(0.02, speed * 0.05, 0.02);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        }
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="white" transparent opacity={0.3} />
        </instancedMesh>
    );
};
