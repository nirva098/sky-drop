import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { useControls } from '../hooks/useControls';

export const SkydiverModel = () => {
    const group = useRef<Group>(null);
    const { dive, flare, left, right, track } = useControls();

    useFrame((state, delta) => {
        if (!group.current) return;

        // Procedural Animation based on Input
        const targetRotationX = dive ? 1.5 : flare ? -0.5 : track ? 0.5 : 0; // Dive=HeadDown, Flare=BellyUp
        const targetRotationZ = left ? 0.5 : right ? -0.5 : 0; // Bank

        // Simple lerp for smooth transition
        group.current.rotation.x += (targetRotationX - group.current.rotation.x) * delta * 5;
        group.current.rotation.z += (targetRotationZ - group.current.rotation.z) * delta * 5;

        // Idle hover noise
        group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    });

    return (
        <group ref={group}>
            {/* Body */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.5, 0.8, 0.3]} />
                <meshStandardMaterial color="#ff4500" />
            </mesh>

            {/* Head */}
            <mesh position={[0, 0.6, 0]} castShadow>
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshStandardMaterial color="#ffd700" />
            </mesh>

            {/* Goggles */}
            <mesh position={[0, 0.65, 0.2]}>
                <boxGeometry args={[0.2, 0.1, 0.1]} />
                <meshStandardMaterial color="black" roughness={0.2} />
            </mesh>

            {/* Backpack/Rig */}
            <mesh position={[0, 0.1, -0.2]} castShadow>
                <boxGeometry args={[0.4, 0.6, 0.2]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Arts & Legs (Static for now, but distinct) */}
            <group position={[-0.4, 0.2, 0]}>
                <mesh rotation={[0, 0, 0.5]}>
                    <boxGeometry args={[0.2, 0.6, 0.2]} />
                    <meshStandardMaterial color="#ff4500" />
                </mesh>
            </group>
            <group position={[0.4, 0.2, 0]}>
                <mesh rotation={[0, 0, -0.5]}>
                    <boxGeometry args={[0.2, 0.6, 0.2]} />
                    <meshStandardMaterial color="#ff4500" />
                </mesh>
            </group>

            <group position={[-0.2, -0.6, 0]}>
                <mesh rotation={[0, 0, 0.2]}>
                    <boxGeometry args={[0.25, 0.7, 0.25]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>
            <group position={[0.2, -0.6, 0]}>
                <mesh rotation={[0, 0, -0.2]}>
                    <boxGeometry args={[0.25, 0.7, 0.25]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>
        </group>
    );
};
