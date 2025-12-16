import { useRef } from 'react';
import { Group } from 'three';

export const CargoPlane = () => {
    const group = useRef<Group>(null);

    // Hard-coded procedural plane
    return (
        <group ref={group} position={[0, 10000, 0]} rotation={[0, Math.PI, 0]}>
            {/* Fuselage */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[4, 4, 20]} />
                <meshStandardMaterial color="#555" roughness={0.3} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.5, 11]}>
                <sphereGeometry args={[2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#555" />
            </mesh>

            {/* Wings */}
            <mesh position={[0, 1, 2]}>
                <boxGeometry args={[30, 0.5, 6]} />
                <meshStandardMaterial color="#666" />
            </mesh>

            {/* Tail */}
            <mesh position={[0, 2, -9]}>
                <boxGeometry args={[10, 0.5, 4]} />
                <meshStandardMaterial color="#666" />
            </mesh>
            <mesh position={[0, 4, -9]}>
                <boxGeometry args={[0.5, 4, 3]} />
                <meshStandardMaterial color="#666" />
            </mesh>

            {/* Cargo Door (Open) */}
            <mesh position={[0, -1, -10]}>
                <boxGeometry args={[3, 0.2, 4]} />
                <meshStandardMaterial color="#222" />
            </mesh>

            {/* Propellers (Simple Discs) */}
            <mesh position={[8, 1, 5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2, 2, 0.1, 8]} />
                <meshStandardMaterial color="#222" transparent opacity={0.6} />
            </mesh>
            <mesh position={[-8, 1, 5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2, 2, 0.1, 8]} />
                <meshStandardMaterial color="#222" transparent opacity={0.6} />
            </mesh>
        </group>
    );
};
