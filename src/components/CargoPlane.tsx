import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Group, Mesh } from 'three';
import { useGameStore, GamePhase } from '../stores/useGameStore';
import { JUMP_ALTITUDE } from '../physics/constants';

export const CargoPlane = () => {
    const group = useRef<Group>(null);
    const doorRef = useRef<Mesh>(null);
    const { phase } = useGameStore();

    // Door animation state
    const doorOpenRef = useRef(0); // 0 = closed, 1 = fully open

    useFrame((_state, delta) => {
        if (!group.current) return;

        // Animate door based on phase
        const targetDoorOpen = phase === GamePhase.READY ? 1 : 0.3;
        doorOpenRef.current += (targetDoorOpen - doorOpenRef.current) * delta * 2;

        // Update door rotation
        if (doorRef.current) {
            doorRef.current.rotation.x = -Math.PI / 2 - doorOpenRef.current * (Math.PI / 2);
        }

        // Subtle aircraft movement when player is in plane
        if (phase === GamePhase.READY) {
            group.current.position.y = JUMP_ALTITUDE + Math.sin(_state.clock.elapsedTime * 0.5) * 0.5;
            group.current.rotation.z = Math.sin(_state.clock.elapsedTime * 0.3) * 0.02;
        }
    });

    return (
        <group ref={group} position={[0, JUMP_ALTITUDE, 0]} rotation={[0, Math.PI, 0]}>
            {/* Main Fuselage */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[4, 4, 20]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Fuselage stripes */}
            <mesh position={[0, 2.01, 0]}>
                <boxGeometry args={[4.02, 0.1, 20]} />
                <meshStandardMaterial color="#ff4400" />
            </mesh>
            <mesh position={[0, -2.01, 0]}>
                <boxGeometry args={[4.02, 0.1, 20]} />
                <meshStandardMaterial color="#ff4400" />
            </mesh>

            {/* Nose Cone */}
            <mesh position={[0, -0.5, 11]}>
                <sphereGeometry args={[2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Cockpit Windows */}
            <mesh position={[0, 0.5, 11.5]} rotation={[-0.3, 0, 0]}>
                <boxGeometry args={[3, 1, 0.1]} />
                <meshStandardMaterial color="#1a3a5c" roughness={0.1} metalness={0.8} />
            </mesh>

            {/* Interior - visible through door */}
            <InteriorCabin />

            {/* Wings */}
            <mesh position={[0, 1, 2]} castShadow>
                <boxGeometry args={[32, 0.5, 6]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
            </mesh>
            
            {/* Wing tips */}
            <mesh position={[16, 1.5, 2]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[2, 1, 1]} />
                <meshStandardMaterial color="#ff4400" />
            </mesh>
            <mesh position={[-16, 1.5, 2]} rotation={[0, 0, -0.2]}>
                <boxGeometry args={[2, 1, 1]} />
                <meshStandardMaterial color="#ff4400" />
            </mesh>

            {/* Tail */}
            <mesh position={[0, 2, -9]} castShadow>
                <boxGeometry args={[12, 0.5, 4]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
            </mesh>
            
            {/* Vertical Stabilizer */}
            <mesh position={[0, 5, -9]} castShadow>
                <boxGeometry args={[0.5, 6, 4]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, 7.5, -10]}>
                <boxGeometry args={[0.6, 1, 2]} />
                <meshStandardMaterial color="#ff4400" />
            </mesh>

            {/* Jump Door - animated */}
            <mesh 
                ref={doorRef} 
                position={[0, -2, -10]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <boxGeometry args={[3, 4, 0.15]} />
                <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>

            {/* Door Frame */}
            <mesh position={[-1.6, -0.5, -10]}>
                <boxGeometry args={[0.2, 3, 0.3]} />
                <meshStandardMaterial color="#555" />
            </mesh>
            <mesh position={[1.6, -0.5, -10]}>
                <boxGeometry args={[0.2, 3, 0.3]} />
                <meshStandardMaterial color="#555" />
            </mesh>
            <mesh position={[0, 1, -10]}>
                <boxGeometry args={[3.4, 0.2, 0.3]} />
                <meshStandardMaterial color="#555" />
            </mesh>

            {/* Engines */}
            <Engine position={[8, 0.5, 5]} />
            <Engine position={[-8, 0.5, 5]} />

            {/* Navigation Lights */}
            <pointLight position={[16, 1, 2]} color="#ff0000" intensity={0.5} distance={5} />
            <pointLight position={[-16, 1, 2]} color="#00ff00" intensity={0.5} distance={5} />
            <pointLight position={[0, 8, -10]} color="#ffffff" intensity={0.3} distance={10} />
        </group>
    );
};

/**
 * Interior cabin with seats and details
 */
const InteriorCabin = () => {
    return (
        <group position={[0, -0.5, -5]}>
            {/* Floor */}
            <mesh position={[0, -1.5, 0]}>
                <boxGeometry args={[3.5, 0.2, 12]} />
                <meshStandardMaterial color="#2a2a2a" />
            </mesh>

            {/* Bench seats along walls */}
            <mesh position={[-1.5, -1, 0]}>
                <boxGeometry args={[0.5, 0.3, 10]} />
                <meshStandardMaterial color="#4a3a2a" />
            </mesh>
            <mesh position={[1.5, -1, 0]}>
                <boxGeometry args={[0.5, 0.3, 10]} />
                <meshStandardMaterial color="#4a3a2a" />
            </mesh>

            {/* Static line anchor */}
            <mesh position={[0, 1.3, -3]}>
                <boxGeometry args={[0.1, 0.1, 8]} />
                <meshStandardMaterial color="#ffcc00" metalness={0.8} />
            </mesh>

            {/* Cargo netting */}
            <mesh position={[-1.8, 0, 0]}>
                <boxGeometry args={[0.05, 2, 10]} />
                <meshStandardMaterial color="#556b2f" transparent opacity={0.5} />
            </mesh>
            <mesh position={[1.8, 0, 0]}>
                <boxGeometry args={[0.05, 2, 10]} />
                <meshStandardMaterial color="#556b2f" transparent opacity={0.5} />
            </mesh>

            {/* Red jump light */}
            <JumpLight />

            {/* Interior lights */}
            <pointLight position={[0, 1, 0]} intensity={0.5} color="#ffeecc" distance={8} />
            <pointLight position={[0, 1, -4]} intensity={0.3} color="#ffeecc" distance={6} />
        </group>
    );
};

/**
 * Jump light that changes from red to green
 */
const JumpLight = () => {
    const lightRef = useRef<Mesh>(null);
    const { phase } = useGameStore();
    
    useFrame(() => {
        if (!lightRef.current) return;
        const material = lightRef.current.material as THREE.MeshStandardMaterial;
        // Green when ready to jump, red otherwise
        material.color.set(phase === GamePhase.READY ? '#00ff00' : '#ff0000');
        material.emissive.set(phase === GamePhase.READY ? '#00ff00' : '#ff0000');
    });

    return (
        <mesh ref={lightRef} position={[0, 1.3, -5]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
                color="#00ff00" 
                emissive="#00ff00"
                emissiveIntensity={2}
            />
        </mesh>
    );
};

/**
 * Aircraft engine with spinning propeller
 */
const Engine = ({ position }: { position: [number, number, number] }) => {
    const propellerRef = useRef<Mesh>(null);

    useFrame((_state, delta) => {
        if (propellerRef.current) {
            propellerRef.current.rotation.z += delta * 50;
        }
    });

    return (
        <group position={position}>
            {/* Engine nacelle */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[1.5, 1.2, 4, 16]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.7} />
            </mesh>
            
            {/* Propeller hub */}
            <mesh position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            
            {/* Spinning propeller disc (blur effect) */}
            <mesh ref={propellerRef} position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.5, 2.5, 0.05, 32]} />
                <meshBasicMaterial color="#333" transparent opacity={0.4} />
            </mesh>
        </group>
    );
};
