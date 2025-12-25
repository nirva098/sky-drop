import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../stores/useGameStore';

/**
 * Atmospheric effects including clouds at various layers
 * with parallax movement based on player position
 */
export const Atmosphere = () => {
    const { altitude } = useGameStore();

    return (
        <group>
            {/* High Altitude Cirrus Clouds - wispy, transparent */}
            <CloudLayer 
                baseAltitude={8000} 
                count={6} 
                spread={500} 
                opacity={0.3}
                size={150}
                playerAltitude={altitude}
            />

            {/* Mid Altitude Cumulus - main cloud deck */}
            <CloudLayer 
                baseAltitude={4000} 
                count={10} 
                spread={400} 
                opacity={0.7}
                size={100}
                playerAltitude={altitude}
            />

            {/* Low Stratocumulus - denser, darker */}
            <CloudLayer 
                baseAltitude={1500} 
                count={8} 
                spread={300} 
                opacity={0.9}
                size={80}
                playerAltitude={altitude}
            />

            {/* Very Low Clouds - close to ground */}
            <CloudLayer 
                baseAltitude={500} 
                count={5} 
                spread={200} 
                opacity={0.6}
                size={40}
                playerAltitude={altitude}
            />

            {/* Ground Haze */}
            <GroundHaze playerAltitude={altitude} />
        </group>
    );
};

interface CloudLayerProps {
    baseAltitude: number;
    count: number;
    spread: number;
    opacity: number;
    size: number;
    playerAltitude: number;
}

/**
 * Layer of clouds at a specific altitude range
 */
const CloudLayer = ({ 
    baseAltitude, 
    count, 
    spread, 
    opacity, 
    size,
    playerAltitude 
}: CloudLayerProps) => {
    const groupRef = useRef<THREE.Group>(null);

    // Generate cloud positions
    const cloudPositions = useMemo(() => {
        const positions: [number, number, number][] = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const radius = spread * 0.3 + Math.random() * spread * 0.7;
            positions.push([
                Math.cos(angle) * radius,
                baseAltitude + (Math.random() - 0.5) * 200,
                Math.sin(angle) * radius
            ]);
        }
        return positions;
    }, [count, spread, baseAltitude]);

    // Visibility based on player altitude
    const isVisible = Math.abs(playerAltitude - baseAltitude) < 2000;
    const distanceFactor = 1 - Math.min(1, Math.abs(playerAltitude - baseAltitude) / 2000);

    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Slow rotation for ambient movement
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    });

    if (!isVisible) return null;

    return (
        <group ref={groupRef}>
            {cloudPositions.map((pos, i) => (
                <Cloud
                    key={i}
                    position={pos}
                    opacity={opacity * distanceFactor}
                    speed={0.2 + Math.random() * 0.3}
                    bounds={[size, size * 0.3, size]}
                    segments={Math.floor(10 + Math.random() * 10)}
                    color={baseAltitude > 5000 ? '#ffffff' : '#f0f0f0'}
                />
            ))}
        </group>
    );
};

interface GroundHazeProps {
    playerAltitude: number;
}

/**
 * Ground-level atmospheric haze that becomes visible as player descends
 */
const GroundHaze = ({ playerAltitude }: GroundHazeProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Haze becomes more visible as player gets lower
    const hazeOpacity = Math.max(0, 0.3 - (playerAltitude / 3000) * 0.3);
    
    useFrame(() => {
        if (!meshRef.current) return;
        
        // Update opacity based on altitude
        const material = meshRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = hazeOpacity;
    });

    if (playerAltitude > 2000) return null;

    return (
        <mesh ref={meshRef} position={[0, 100, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5000, 5000]} />
            <meshBasicMaterial 
                color="#c0d8e8" 
                transparent 
                opacity={hazeOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};
