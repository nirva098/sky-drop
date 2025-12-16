import { RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import * as THREE from 'three';

export const Terrain = () => {
    // Generate a simple island terrain using math
    const { geometry, colors } = useMemo(() => {
        const geo = new THREE.PlaneGeometry(2000, 2000, 64, 64);
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();
        const colors = [];

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);

            // Circular island shape logic
            const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y); // Y is "up" in 2D plane logic before rotation? 
            // PlaneGeometry is typically X/Y with Z up, but we rotate it -X 90deg usually. 
            // Let's assume standard UV mapping.

            // Create a central mountain/island with falloff
            let z = 0;
            const radius = 800;
            if (dist < radius) {
                // Sine waves for hills
                z = Math.cos(dist / 250) * 50 + Math.sin(vertex.x / 100) * 20 + Math.cos(vertex.y / 100) * 20;
                // General bell curve shape for island height
                z += Math.max(0, (1 - dist / radius) * 150);
            } else {
                z = -10; // Underwater
            }

            posAttribute.setZ(i, z);

            // Simple vertex coloring based on height
            if (z > 50) colors.push(0.5, 0.5, 0.5); // Stone
            else if (z > 5) colors.push(0.1, 0.6, 0.2); // Grass
            else colors.push(0.9, 0.8, 0.5); // Sand
        }

        geo.computeVertexNormals();
        return { geometry: geo, colors: new Float32Array(colors) };
    }, []);

    // Add colors to geometry
    useMemo(() => {
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }, [geometry, colors]);

    return (
        <group position={[0, -2, 0]}>
            {/* Physics for the Island */}
            <RigidBody type="fixed" colliders="trimesh">
                <mesh geometry={geometry} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial vertexColors flatShading roughness={0.8} />
                </mesh>
            </RigidBody>

            {/* Ocean Plane (Visual + Kill floor) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
                <planeGeometry args={[10000, 10000]} />
                <meshStandardMaterial color="#006994" roughness={0.1} metalness={0.5} />
            </mesh>
        </group>
    );
};
