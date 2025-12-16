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
        if (phase === GamePhase.FREEFALL && controls.action && altitude < 900) {
            // Simple deployment altitude check to prevent instant open
            deployChute();
        }
    }, [phase, controls, jump, deployChute, altitude]);

    // State for progressive deployment (0 = closed, 1 = fully open)
    const deploymentRef = useRef(0);

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
            body.setTranslation({ x: 0, y: 3048, z: 0 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        // 2. Freefall Physics
        if (phase === GamePhase.FREEFALL) {
            // Reset deployment state
            deploymentRef.current = 0;

            // Terminal V targets: Belly=55m/s (k=0.26), Dive=90m/s (k=0.09)
            let dragFactor = 0.26;
            if (controls.dive) dragFactor = 0.09;
            if (controls.flare) dragFactor = 0.39; // Arch braking

            const dragMagnitude = dragFactor * (speed ** 2);
            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            body.applyImpulse(dragForce.multiplyScalar(delta), true);

            // Steering
            const rotationTorque = 2;
            if (controls.left) body.applyTorqueImpulse({ x: 0, y: rotationTorque, z: 0 }, true);
            if (controls.right) body.applyTorqueImpulse({ x: 0, y: -rotationTorque, z: 0 }, true);

            // Tracking
            if (controls.track) {
                const trackStrength = 300;
                const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(body.rotation().x, body.rotation().y, body.rotation().z, body.rotation().w));
                body.applyImpulse(forwardDir.multiplyScalar(trackStrength * delta), true);
            }
        }

        // 3. Canopy Physics (Progressive Opening)
        if (phase === GamePhase.CANOPY) {
            // Smoothly ramp up drag to simulate opening shock mitigation (3 seconds to full open)
            if (deploymentRef.current < 1) {
                deploymentRef.current += delta / 3.0; // 3 seconds
                if (deploymentRef.current > 1) deploymentRef.current = 1;
            }

            // Lerp dynamic drag factor
            // Start from freefall drag (~0.26) to Canopy drag (~31.4)
            const baseDrag = 0.26;
            const targetDrag = 31.4;
            // Use easeOutCubic for realistic "snatch force" curve? Or linear for simplicity.
            // Linear lerp:
            const currentDragFactor = baseDrag + (targetDrag - baseDrag) * deploymentRef.current;

            const dragMagnitude = currentDragFactor * (speed ** 2);

            const dragForce = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
                .normalize()
                .multiplyScalar(-dragMagnitude);

            body.applyImpulse(dragForce.multiplyScalar(delta), true);

            // Steering (Only effective when mostly open)
            if (deploymentRef.current > 0.5) {
                if (controls.left) body.applyTorqueImpulse({ x: 0, y: 0.5, z: 0 }, true);
                if (controls.right) body.applyTorqueImpulse({ x: 0, y: -0.5, z: 0 }, true);
            }

            // Flare (Lift)
            if (controls.flare && deploymentRef.current > 0.8) {
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
            body.setTranslation({ x: 0, y: 3048, z: 0 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }

    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={[0, 3048, 0]}
            colliders={false} // Manual collider
            mass={80} // 80kg Skydiver
            gravityScale={1.0} // Real Earth Gravity
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
