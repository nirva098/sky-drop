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

    useFrame((_state, delta) => {
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
            // F_drag = k * v^2
            // At terminal velocity (55m/s), Drag = Gravity (80kg * 9.8 = 784N)
            // 784 = k * 55^2 => k = 0.26 (Belly)
            // Dive (90m/s): 784 = k * 90^2 => k = 0.09

            // NOTE: If speed feels slow, it might be the Sense of Speed (FOV/Particles) not just number.
            // But let's relax drag slightly to ensure we hit 55+ easily.
            let dragFactor = 0.20; // Reduced from 0.26 to ensure we exceed 50m/s easily

            if (controls.dive) dragFactor = 0.05; // Very low drag for high speed dive
            if (controls.flare) dragFactor = 0.6; // Arch/Brake

            const dragMagnitude = dragFactor * (speed ** 2);

            // F_drag vector
            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            // Apply Impulse = Force * dt
            body.applyImpulse(dragForce.multiplyScalar(delta), true);

            // Steering (Torque) - Constant torque doesn't need delta if used as torque impulse per frame for "motor" effect,
            // but for physical correctness it should be Torque * delta. 
            // However, snappy control feel often likes raw impulse. Let's keep it direct but scaled.
            const rotationTorque = 2; // Reduced since mass is 80, but rotation inertia might be default.
            // Actually Rapier default inertia for Capsule(0.9, 0.4) might be low. 
            // Let's use small values and tune.
            if (controls.left) body.applyTorqueImpulse({ x: 0, y: rotationTorque, z: 0 }, true);
            if (controls.right) body.applyTorqueImpulse({ x: 0, y: -rotationTorque, z: 0 }, true);

            // Tracking (Forward Force)
            if (controls.track) {
                const trackStrength = 300; // Newtons
                const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(body.rotation().x, body.rotation().y, body.rotation().z, body.rotation().w));
                body.applyImpulse(forwardDir.multiplyScalar(trackStrength * delta), true);
            }
        }

        // 3. Canopy Physics
        if (phase === GamePhase.CANOPY) {
            // Descent Rate ~5m/s. Gravity = 784N.
            // Drag = k * 5^2 = 25k. 784/25 = 31.
            const dragFactor = 30.0;
            const dragMagnitude = dragFactor * (speed ** 2);

            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            body.applyImpulse(dragForce.multiplyScalar(delta), true);

            // Steering
            if (controls.left) body.applyTorqueImpulse({ x: 0, y: 0.5, z: 0 }, true);
            if (controls.right) body.applyTorqueImpulse({ x: 0, y: -0.5, z: 0 }, true);

            // Flare (Lift)
            if (controls.flare) {
                // Lift Force = 1.5g roughly? 
                body.applyImpulse({ x: 0, y: 1200 * delta, z: 0 }, true);
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
            mass={80} // 80kg Skydiver
            gravityScale={1.5} // slightly heavier gravity feel for games? Or keep 1.0 standard. 
            // Let's Stick to 1.0 for realism, but maybe user wants "Fast" fall. 
            // If user says "speed not fixed", maybe they mean visual speed?
            // Let's actually increase Gravity Scale to 1.0 explicit just in case.
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
