import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { useGameStore, GamePhase } from '../stores/useGameStore';
import { useControls } from '../hooks/useControls';
import * as THREE from 'three';
import { SkydiverModel } from './SkydiverModel';

export const Player = () => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const { phase, altitude, setAltitude, setSpeed, jump, deployChute, land, reset } = useGameStore();
    const controls = useControls();

    // Handle phase transitions based on inputs
    useEffect(() => {
        if (phase === GamePhase.READY && controls.action) {
            jump();
            // Initial impulse to exit plane
            rigidBodyRef.current?.applyImpulse({ x: 0, y: 0, z: -5 }, true);
        }
        if (phase === GamePhase.FREEFALL && controls.action && altitude < 8000) {
            // Simple deployment altitude check to prevent instant open
            deployChute();
        }
    }, [phase, controls, jump, deployChute, altitude]);

    useFrame(() => {
        if (!rigidBodyRef.current) return;

        const body = rigidBodyRef.current;
        const velocity = body.linvel();
        const position = body.translation();
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

        // Update Store
        setAltitude(position.y);
        setSpeed(speed);

        // --- PHYSICS LOGIC ---

        // 1. Ready Phase (In Plane)
        if (phase === GamePhase.READY) {
            // Lock to plane position (simple override for now)
            body.setTranslation({ x: 0, y: 10000, z: 0 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        // 2. Freefall Physics
        if (phase === GamePhase.FREEFALL) {
            // Drag Calculation
            // F = 0.5 * rho * v^2 * Cd * A
            // Simplified: DragForce = -k * v^2

            let dragCoefficient = 0.5; // Base drag (belly)

            if (controls.dive) dragCoefficient = 0.2; // Head down (fast)
            if (controls.flare) dragCoefficient = 1.0; // Arch (slow)

            // Rapier applies gravity naturally. We just add Drag.
            // Drag opposes velocity.
            const dragMagnitude = dragCoefficient * (speed ** 2) * 0.01;
            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            body.applyImpulse(dragForce, true);

            // Steering (Torque/Force)
            const rotationSpeed = 2;
            if (controls.left) body.applyTorqueImpulse({ x: 0, y: rotationSpeed, z: 0 }, true);
            if (controls.right) body.applyTorqueImpulse({ x: 0, y: -rotationSpeed, z: 0 }, true);

            // Tracking (Horizontal movement)
            if (controls.track) {
                const trackForce = new THREE.Vector3(0, 0, -20).applyQuaternion(new THREE.Quaternion(body.rotation().x, body.rotation().y, body.rotation().z, body.rotation().w));
                body.applyImpulse(trackForce, true);
            }
        }

        // 3. Canopy Physics
        if (phase === GamePhase.CANOPY) {
            // Massive Drag to slow down
            const dragCoefficient = 2.0;
            const dragMagnitude = dragCoefficient * (speed ** 2) * 0.05;
            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            body.applyImpulse(dragForce, true);

            // Steering
            if (controls.left) body.applyTorqueImpulse({ x: 0, y: 1, z: 0 }, true);
            if (controls.right) body.applyTorqueImpulse({ x: 0, y: -1, z: 0 }, true);

            // Flare (Braking) - adds extra Lift/Drag
            if (controls.flare) {
                body.applyImpulse({ x: 0, y: 10, z: 0 }, true); // Fake lift
            }
        }

        // 4. Landing Check
        if ((phase === GamePhase.FREEFALL || phase === GamePhase.CANOPY) && position.y < 2) {
            land();
            // Calculate 2D distance to center (0,0)
            const dist = Math.sqrt(position.x ** 2 + position.z ** 2);
            // We need to access setScore from store, but we only destructured a few. 
            // Let's rely on useGameStore.getState().setScore(dist) or refetch.
            useGameStore.getState().setScore(dist);
        }

        // Reset Logic (Temporary)
        if (phase === GamePhase.LANDED && controls.action) {
            reset();
            body.setTranslation({ x: 0, y: 10000, z: 0 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }

    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={[0, 10000, 0]}
            colliders={false} // Manual collider
            enabledRotations={[true, true, true]}
            linearDamping={0} // We handle drag manually
            angularDamping={1} // Stabilize rotation
        >
            <CapsuleCollider args={[0.9, 0.4]} />

            {/* Visual Model */}
            <group rotation={[Math.PI / 2, 0, 0]}> {/* Rotate to face down/forward by default if needed, or adjust model */}
                <SkydiverModel />
            </group>

            {/* Parachute Visual (Simple cone for now when deployed) */}
            {phase === GamePhase.CANOPY && (
                <group position={[0, 4, 0]}>
                    <mesh>
                        <coneGeometry args={[3, 2, 8, 1, true]} />
                        <meshStandardMaterial color="white" side={THREE.DoubleSide} />
                    </mesh>
                    {/* Lines */}
                    <mesh position={[0, -1, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, 2]} />
                        <meshBasicMaterial color="black" />
                    </mesh>
                </group>
            )}
        </RigidBody>
    );
};
