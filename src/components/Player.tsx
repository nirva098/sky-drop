import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import { useGameStore, GamePhase } from '../stores/useGameStore';
import { useControls } from '../hooks/useControls';
import * as THREE from 'three';
import { SkydiverModel } from './SkydiverModel';
import {
    JUMP_ALTITUDE,
    MASS_SKYDIVER,
    MIN_DEPLOYMENT_ALTITUDE,
    GROUND_FRICTION,
    getDeploymentFactor,
    DEPLOYMENT_DURATION,
} from '../physics/constants';
import type { PhysicsControls } from '../physics/simulation';
import {
    physicsStep,
    calculateTurnRate,
    calculateFreefallTorque,
    classifyLanding,
} from '../physics/simulation';
import type { PhysicsAccumulator } from '../physics/integration';
import {
    createAccumulator,
    updatePhysics,
    velocityMagnitude,
} from '../physics/integration';
import { Parachute } from './Parachute';

export const Player = () => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const { phase, altitude, setAltitude, setSpeed, setAcceleration, jump, deployChute, land, reset } = useGameStore();
    const controls = useControls();

    // Physics accumulator for fixed timestep
    const accumulatorRef = useRef<PhysicsAccumulator>(
        createAccumulator(
            { x: 0, y: JUMP_ALTITUDE, z: 0 },
            { x: 0, y: 0, z: 0 }
        )
    );

    // Deployment state
    const deploymentStartTimeRef = useRef<number>(0);
    const deploymentFactorRef = useRef<number>(0);

    // Previous velocity for acceleration calculation
    const prevSpeedRef = useRef<number>(0);

    // Convert controls to physics format
    const getPhysicsControls = useCallback((): PhysicsControls => ({
        dive: controls.dive,
        arch: controls.flare, // S key is arch in freefall, flare in canopy
        left: controls.left,
        right: controls.right,
        track: controls.track,
        flare: controls.flare && phase === GamePhase.CANOPY,
    }), [controls, phase]);

    // Handle phase transitions based on inputs
    useEffect(() => {
        if (phase === GamePhase.READY && controls.action) {
            jump();
            // Reset accumulator with slight forward velocity from aircraft
            accumulatorRef.current = createAccumulator(
                { x: 0, y: JUMP_ALTITUDE, z: 0 },
                { x: 0, y: -5, z: -10 } // Initial exit velocity
            );
            deploymentFactorRef.current = 0;
            deploymentStartTimeRef.current = 0;
        }
        if (phase === GamePhase.FREEFALL && controls.action && altitude < MIN_DEPLOYMENT_ALTITUDE + 200) {
            // Deploy with some buffer above minimum
            deployChute();
            deploymentStartTimeRef.current = 0; // Will be set on first frame
        }
    }, [phase, controls.action, jump, deployChute, altitude]);

    // Main physics update
    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        const body = rigidBodyRef.current;
        const isCanopy = phase === GamePhase.CANOPY;
        const physicsControls = getPhysicsControls();

        // =========================================================================
        // READY PHASE - In Aircraft
        // =========================================================================
        if (phase === GamePhase.READY) {
            body.setTranslation({ x: 0, y: JUMP_ALTITUDE, z: 0 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            
            // Reset accumulator
            accumulatorRef.current = createAccumulator(
                { x: 0, y: JUMP_ALTITUDE, z: 0 },
                { x: 0, y: 0, z: 0 }
            );
            
            setAltitude(JUMP_ALTITUDE);
            setSpeed(0);
            setAcceleration(0);
            return;
        }

        // =========================================================================
        // LANDED PHASE
        // =========================================================================
        if (phase === GamePhase.LANDED) {
            // Apply ground friction
            const linvel = body.linvel();
            body.setLinvel({
                x: linvel.x * (1 - GROUND_FRICTION * delta),
                y: 0,
                z: linvel.z * (1 - GROUND_FRICTION * delta)
            }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);

            // Reset on action
            if (controls.action) {
                reset();
                body.setTranslation({ x: 0, y: JUMP_ALTITUDE, z: 0 }, true);
                body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                accumulatorRef.current = createAccumulator(
                    { x: 0, y: JUMP_ALTITUDE, z: 0 },
                    { x: 0, y: 0, z: 0 }
                );
            }
            return;
        }

        // =========================================================================
        // FREEFALL / CANOPY PHASE - Active Physics
        // =========================================================================

        // Update deployment factor for canopy phase
        if (isCanopy) {
            if (deploymentStartTimeRef.current === 0) {
                deploymentStartTimeRef.current = state.clock.elapsedTime;
            }
            const deploymentTime = state.clock.elapsedTime - deploymentStartTimeRef.current;
            deploymentFactorRef.current = getDeploymentFactor(deploymentTime);
            
            // Clamp to 1 after full deployment
            if (deploymentTime > DEPLOYMENT_DURATION) {
                deploymentFactorRef.current = 1.0;
            }
        } else {
            deploymentFactorRef.current = 0;
        }

        // Sync accumulator with Rapier body state
        const currentPos = body.translation();
        const currentVel = body.linvel();
        
        accumulatorRef.current.currentPosition = {
            x: currentPos.x,
            y: currentPos.y,
            z: currentPos.z,
        };
        accumulatorRef.current.currentVelocity = {
            x: currentVel.x,
            y: currentVel.y,
            z: currentVel.z,
        };

        // Track G-force across physics steps
        let totalGForce = 0;
        let stepCount = 0;

        // Run fixed timestep physics
        const steps = updatePhysics(
            accumulatorRef.current,
            delta,
            (position, velocity, dt) => {
                const result = physicsStep(
                    position,
                    velocity,
                    physicsControls,
                    isCanopy,
                    deploymentFactorRef.current,
                    dt
                );
                
                totalGForce += result.gForce;
                stepCount++;
                
                return {
                    position: result.position,
                    velocity: result.velocity,
                };
            }
        );

        // Apply physics result to Rapier body
        if (steps > 0) {
            const acc = accumulatorRef.current;
            
            // Set position and velocity
            body.setTranslation({
                x: acc.currentPosition.x,
                y: acc.currentPosition.y,
                z: acc.currentPosition.z,
            }, true);
            
            body.setLinvel({
                x: acc.currentVelocity.x,
                y: acc.currentVelocity.y,
                z: acc.currentVelocity.z,
            }, true);

            // Apply rotation/torque
            if (!isCanopy) {
                // Freefall rotation
                const torque = calculateFreefallTorque(physicsControls);
                if (torque.y !== 0) {
                    body.applyTorqueImpulse({
                        x: torque.x * delta,
                        y: torque.y * delta,
                        z: torque.z * delta,
                    }, true);
                }
            } else {
                // Canopy turning
                const turnRate = calculateTurnRate(physicsControls, deploymentFactorRef.current);
                if (turnRate !== 0) {
                    const currentRot = body.rotation();
                    const euler = new THREE.Euler().setFromQuaternion(
                        new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w)
                    );
                    euler.y += turnRate * delta;
                    const newQuat = new THREE.Quaternion().setFromEuler(euler);
                    body.setRotation({
                        x: newQuat.x,
                        y: newQuat.y,
                        z: newQuat.z,
                        w: newQuat.w,
                    }, true);

                    // Apply velocity rotation for canopy turns
                    const speed = velocityMagnitude(acc.currentVelocity);
                    if (speed > 1) {
                        const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(newQuat);
                        const horizontalSpeed = Math.sqrt(
                            acc.currentVelocity.x ** 2 + acc.currentVelocity.z ** 2
                        );
                        body.setLinvel({
                            x: forwardDir.x * horizontalSpeed,
                            y: acc.currentVelocity.y,
                            z: forwardDir.z * horizontalSpeed,
                        }, true);
                    }
                }
            }
        }

        // Update store with current values
        const currentSpeed = velocityMagnitude(accumulatorRef.current.currentVelocity);
        setAltitude(accumulatorRef.current.currentPosition.y);
        setSpeed(currentSpeed);
        
        // Average G-force over physics steps
        const avgGForce = stepCount > 0 ? totalGForce / stepCount : 0;
        setAcceleration(avgGForce);

        prevSpeedRef.current = currentSpeed;

        // =========================================================================
        // GROUND COLLISION DETECTION
        // =========================================================================
        const groundHeight = getTerrainHeight(
            accumulatorRef.current.currentPosition.x,
            accumulatorRef.current.currentPosition.z
        );
        
        if (accumulatorRef.current.currentPosition.y <= groundHeight + 1) {
            // Landing!
            const verticalSpeed = Math.abs(accumulatorRef.current.currentVelocity.y);
            const landingQuality = classifyLanding(verticalSpeed);
            
            land();
            useGameStore.getState().setLandingQuality(landingQuality);
            
            // Set final position on ground
            body.setTranslation({
                x: accumulatorRef.current.currentPosition.x,
                y: groundHeight + 0.5,
                z: accumulatorRef.current.currentPosition.z,
            }, true);
            
            // Zero vertical velocity
            body.setLinvel({
                x: accumulatorRef.current.currentVelocity.x * 0.3,
                y: 0,
                z: accumulatorRef.current.currentVelocity.z * 0.3,
            }, true);

            // Calculate score (distance to target at origin)
            const dist = Math.sqrt(
                accumulatorRef.current.currentPosition.x ** 2 +
                accumulatorRef.current.currentPosition.z ** 2
            );
            
            // Add landing quality bonus/penalty
            let score = dist;
            if (landingQuality === 'crash') score += 100;
            else if (landingQuality === 'hard') score += 20;
            else if (landingQuality === 'perfect') score = Math.max(0, score - 5);
            
            useGameStore.getState().setScore(score);
        }
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={[0, JUMP_ALTITUDE, 0]}
            colliders={false}
            mass={MASS_SKYDIVER}
            gravityScale={0} // We handle gravity manually in physics simulation
            enabledRotations={[true, true, true]}
            linearDamping={0}
            angularDamping={2}
        >
            <CapsuleCollider args={[0.9, 0.4]} />

            {/* Visual Model */}
            <group rotation={[Math.PI / 2, 0, 0]}>
                <SkydiverModel />
            </group>

            {/* Parachute Visual */}
            {phase === GamePhase.CANOPY && (
                <Parachute 
                    deploymentFactor={deploymentFactorRef.current} 
                    isBraking={controls.flare}
                />
            )}
        </RigidBody>
    );
};

/**
 * Simple terrain height function
 * In a real implementation, this would sample the actual terrain geometry
 */
function getTerrainHeight(x: number, z: number): number {
    const dist = Math.sqrt(x * x + z * z);
    const radius = 800;
    
    if (dist < radius) {
        // Match terrain generation from Terrain.tsx
        let height = Math.cos(dist / 250) * 50 + Math.sin(x / 100) * 20 + Math.cos(z / 100) * 20;
        height += Math.max(0, (1 - dist / radius) * 150);
        return height - 2; // Account for terrain group offset
    }
    return -12; // Ocean level
}

