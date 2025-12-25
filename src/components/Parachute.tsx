import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParachuteProps {
    deploymentFactor: number;
    isBraking: boolean;
}

/**
 * Ram-air parachute canopy with realistic geometry
 * Models a 7-cell rectangular parachute
 */
export const Parachute = ({ deploymentFactor, isBraking }: ParachuteProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const canopyRef = useRef<THREE.Mesh>(null);
    
    // Animation state
    const oscillationRef = useRef(0);
    const inflationRef = useRef(0);

    // Create ram-air canopy geometry
    const canopyGeometry = useMemo(() => {
        // Ram-air canopies have a curved rectangular shape
        const width = 6; // Span
        const depth = 3; // Chord length
        const cells = 7; // Number of cells
        
        // Create a curved surface
        const widthSegments = cells * 4;
        const depthSegments = 8;
        
        const geometry = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            // Create curved shape (higher in middle, lower at edges)
            // Ram-air canopy has an arc shape
            const xNorm = x / (width / 2); // -1 to 1
            const yNorm = y / (depth / 2); // -1 to 1
            
            // Main arc curvature
            let z = Math.sqrt(1 - xNorm * xNorm) * 1.5;
            
            // Add cell bulges
            const cellWidth = width / cells;
            const cellPosition = Math.abs(x) % cellWidth;
            const cellBulge = Math.sin((cellPosition / cellWidth) * Math.PI) * 0.15;
            z += cellBulge;
            
            // Trailing edge curves down
            z -= (yNorm + 1) * 0.2;
            
            positions.setZ(i, z);
        }
        
        geometry.computeVertexNormals();
        return geometry;
    }, []);

    // Generate suspension line attachment points
    const lineAttachments = useMemo(() => {
        const points: [number, number][] = [];
        const cells = 7;
        const width = 6;
        const cellWidth = width / cells;
        
        // Lines at each cell edge
        for (let i = 0; i <= cells; i++) {
            const x = -width / 2 + i * cellWidth;
            points.push([x, 1.5]); // Front risers
            points.push([x, -1.5]); // Rear risers
        }
        
        return points;
    }, []);

    useFrame((_state, delta) => {
        if (!groupRef.current || !canopyRef.current) return;

        // Smooth inflation
        inflationRef.current += (deploymentFactor - inflationRef.current) * delta * 3;
        const inflation = inflationRef.current;

        // Deployment animation
        const scale = 0.2 + inflation * 0.8;
        const yOffset = 3 + inflation * 3;
        
        groupRef.current.scale.set(scale, scale, scale);
        groupRef.current.position.y = yOffset;

        // Oscillation during deployment
        if (inflation < 0.9 && inflation > 0.1) {
            oscillationRef.current += delta * 8;
            const swingAmount = (1 - inflation) * 0.3;
            groupRef.current.rotation.x = Math.sin(oscillationRef.current) * swingAmount;
            groupRef.current.rotation.z = Math.cos(oscillationRef.current * 0.7) * swingAmount * 0.5;
        } else {
            // Stabilize
            groupRef.current.rotation.x *= 0.95;
            groupRef.current.rotation.z *= 0.95;
        }

        // Brake toggle deformation would go here
        // When braking, trailing edge pulls down
        if (canopyRef.current && isBraking) {
            canopyRef.current.rotation.x = -0.1 * inflation;
        } else if (canopyRef.current) {
            canopyRef.current.rotation.x *= 0.9;
        }
    });

    // Colors
    const primaryColor = '#ffffff';
    const secondaryColor = '#ff4400';
    const lineColor = '#1a1a1a';

    return (
        <group ref={groupRef} position={[0, 6, 0]}>
            {/* Main Canopy */}
            <mesh ref={canopyRef} geometry={canopyGeometry} rotation={[0.3, 0, 0]}>
                <meshStandardMaterial 
                    color={primaryColor}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.4 + deploymentFactor * 0.5}
                />
            </mesh>

            {/* Canopy stripes */}
            <mesh geometry={canopyGeometry} rotation={[0.3, 0, 0]} position={[0, 0, 0.01]}>
                <meshStandardMaterial
                    color={secondaryColor}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={(0.4 + deploymentFactor * 0.5) * 0.5}
                />
            </mesh>

            {/* Slider - the fabric that slows deployment */}
            {deploymentFactor < 0.95 && (
                <mesh position={[0, -1 - deploymentFactor * 2, 0]}>
                    <boxGeometry args={[0.8, 0.1, 0.8]} />
                    <meshStandardMaterial color="#666" />
                </mesh>
            )}

            {/* Suspension Lines - A and B risers */}
            {lineAttachments.map(([x, z], i) => (
                <SuspensionLine
                    key={i}
                    startX={x}
                    startZ={z}
                    deploymentFactor={deploymentFactor}
                    color={lineColor}
                />
            ))}

            {/* Risers (main connection to harness) */}
            <group position={[0, -2 - deploymentFactor * 2, 0]}>
                {/* Left riser group */}
                <mesh position={[-0.3, 0, 0]}>
                    <boxGeometry args={[0.05, 1, 0.02]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                {/* Right riser group */}
                <mesh position={[0.3, 0, 0]}>
                    <boxGeometry args={[0.05, 1, 0.02]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>

            {/* Brake toggles visible when deployed */}
            {deploymentFactor > 0.8 && (
                <>
                    <mesh position={[-0.4, -3 - deploymentFactor, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
                        <meshStandardMaterial color="#ff0000" />
                    </mesh>
                    <mesh position={[0.4, -3 - deploymentFactor, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
                        <meshStandardMaterial color="#ffff00" />
                    </mesh>
                </>
            )}
        </group>
    );
};

/**
 * Individual suspension line from canopy to risers
 */
const SuspensionLine = ({ 
    startX, 
    startZ, 
    deploymentFactor,
    color 
}: { 
    startX: number; 
    startZ: number;
    deploymentFactor: number;
    color: string;
}) => {
    const lineRef = useRef<THREE.Mesh>(null);

    // Calculate line geometry
    const lineLength = 3 + deploymentFactor * 2;
    const endY = -lineLength;
    
    // Slight curve to lines
    const midX = startX * 0.3;
    const midZ = startZ * 0.3;

    // Create curved line using TubeGeometry
    const curve = useMemo(() => {
        const points = [
            new THREE.Vector3(startX, 0, startZ),
            new THREE.Vector3(midX, endY * 0.5, midZ),
            new THREE.Vector3(0, endY, 0),
        ];
        return new THREE.CatmullRomCurve3(points);
    }, [startX, startZ, midX, midZ, endY]);

    const tubeGeometry = useMemo(() => {
        return new THREE.TubeGeometry(curve, 8, 0.01, 4, false);
    }, [curve]);

    return (
        <mesh ref={lineRef} geometry={tubeGeometry}>
            <meshBasicMaterial 
                color={color} 
                transparent 
                opacity={0.5 + deploymentFactor * 0.4}
            />
        </mesh>
    );
};

