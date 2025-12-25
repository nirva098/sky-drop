/**
 * Core Physics Simulation
 * 
 * Implements the skydiving physics model with:
 * - Proper drag equation: F = 0.5 * ρ * v² * Cd * A
 * - Semi-implicit Euler integration
 * - Altitude-dependent air density
 * - Body position configurations
 */

import type { DragConfiguration } from './constants';
import {
  GRAVITY,
  MASS_SKYDIVER,
  MASS_WITH_CANOPY,
  DRAG_BELLY,
  DRAG_DIVE,
  DRAG_ARCH,
  DRAG_TRACK,
  DRAG_PARACHUTE,
  TRACK_THRUST,
  FLARE_LIFT_FORCE,
  PARACHUTE_FORWARD_SPEED,
  PARACHUTE_GLIDE_DESCENT,
  PARACHUTE_BRAKE_DESCENT,
  CANOPY_TURN_RATE,
  FREEFALL_ROTATION_TORQUE,
  getAirDensity,
  getDeploymentFactor,
} from './constants';
import { velocityMagnitude, normalize } from './integration';

/**
 * Body position during freefall
 */
export type BodyPosition = 'belly' | 'dive' | 'arch' | 'track';

/**
 * Control inputs for physics simulation
 */
export interface PhysicsControls {
  dive: boolean;      // W - head down
  arch: boolean;      // S - spread/brake
  left: boolean;      // A - turn left
  right: boolean;     // D - turn right
  track: boolean;     // Shift - forward tracking
  flare: boolean;     // S during canopy - brake/flare
}

/**
 * State for physics simulation
 */
export interface PhysicsState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  angularVelocity: { x: number; y: number; z: number };
}

/**
 * Get the drag configuration for current body position
 */
export function getDragConfigForPosition(
  controls: PhysicsControls,
  isCanopy: boolean
): DragConfiguration {
  if (isCanopy) {
    return DRAG_PARACHUTE;
  }
  
  if (controls.dive) return DRAG_DIVE;
  if (controls.arch) return DRAG_ARCH;
  if (controls.track) return DRAG_TRACK;
  return DRAG_BELLY;
}

/**
 * Calculate all forces acting on the skydiver
 */
export function calculateForces(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  controls: PhysicsControls,
  isCanopy: boolean,
  deploymentFactor: number = 1.0
): {
  totalForce: { x: number; y: number; z: number };
  dragForce: { x: number; y: number; z: number };
  gravityForce: { x: number; y: number; z: number };
  thrustForce: { x: number; y: number; z: number };
  liftForce: { x: number; y: number; z: number };
} {
  const altitude = Math.max(0, position.y);
  const rho = getAirDensity(altitude);
  const speed = velocityMagnitude(velocity);
  const mass = isCanopy ? MASS_WITH_CANOPY : MASS_SKYDIVER;
  
  // Gravity force (always down)
  const gravityForce = {
    x: 0,
    y: -mass * GRAVITY,
    z: 0,
  };
  
  // Get drag configuration
  let dragConfig: DragConfiguration;
  let effectiveK: number;
  
  if (isCanopy) {
    // Interpolate between freefall drag and parachute drag based on deployment
    const freefallK = DRAG_BELLY.k;
    const parachuteK = DRAG_PARACHUTE.k;
    effectiveK = freefallK + (parachuteK - freefallK) * deploymentFactor;
    dragConfig = DRAG_PARACHUTE; // For reference
  } else {
    dragConfig = getDragConfigForPosition(controls, false);
    effectiveK = dragConfig.k;
  }
  
  // Drag force: F = ρ * v² * k (opposing velocity)
  // k already includes the 0.5 factor
  let dragForce = { x: 0, y: 0, z: 0 };
  if (speed > 0.01) {
    const dragMagnitude = rho * speed * speed * effectiveK;
    const velNorm = normalize(velocity);
    dragForce = {
      x: -velNorm.x * dragMagnitude,
      y: -velNorm.y * dragMagnitude,
      z: -velNorm.z * dragMagnitude,
    };
  }
  
  // Thrust force (tracking in freefall)
  let thrustForce = { x: 0, y: 0, z: 0 };
  if (!isCanopy && controls.track) {
    // Apply forward thrust (negative Z in our coordinate system)
    thrustForce = {
      x: 0,
      y: 0,
      z: -TRACK_THRUST,
    };
  }
  
  // Lift/control forces for canopy
  let liftForce = { x: 0, y: 0, z: 0 };
  if (isCanopy && deploymentFactor > 0.3) {
    // Ram-air parachute aerodynamics model
    // The canopy generates both lift and forward drive
    
    const effectiveDeployment = Math.min(1, (deploymentFactor - 0.3) / 0.7); // 0.3-1.0 mapped to 0-1
    
    // Determine flight mode based on brake input
    let targetDescentRate: number;
    let targetForwardSpeed: number;
    
    if (controls.flare || controls.arch) {
      // Full brakes / flare - maximum drag, reduced forward speed
      // Flare converts forward speed into lift temporarily
      targetDescentRate = PARACHUTE_BRAKE_DESCENT; // ~6 m/s down
      targetForwardSpeed = PARACHUTE_FORWARD_SPEED * 0.3; // Reduced forward
      
      // Flare lift - exchanges horizontal momentum for vertical
      const currentHorizontalSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
      if (currentHorizontalSpeed > 5) {
        liftForce.y = FLARE_LIFT_FORCE * effectiveDeployment * (currentHorizontalSpeed / 15);
      }
    } else if (controls.dive) {
      // Full glide - nose down, maximum forward speed, faster descent
      targetDescentRate = PARACHUTE_GLIDE_DESCENT * 1.3; // ~5.2 m/s down
      targetForwardSpeed = PARACHUTE_FORWARD_SPEED * 1.2; // ~14.4 m/s forward
    } else {
      // Half brakes - balanced flight
      targetDescentRate = (PARACHUTE_GLIDE_DESCENT + PARACHUTE_BRAKE_DESCENT) / 2; // ~5 m/s
      targetForwardSpeed = PARACHUTE_FORWARD_SPEED; // ~12 m/s
    }
    
    // Apply aerodynamic forces to achieve target flight characteristics
    // Using proportional-derivative control for stability
    
    // Vertical control - target descent rate
    const currentDescentRate = -velocity.y;
    const descentError = targetDescentRate - currentDescentRate;
    const verticalForce = descentError * 100 * effectiveDeployment;
    liftForce.y += verticalForce;
    
    // Forward drive - maintain forward speed
    // This represents the canopy's aerodynamic drive
    const currentForwardSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    const forwardError = targetForwardSpeed - currentForwardSpeed;
    
    // Apply force in current heading direction
    if (currentForwardSpeed > 0.5) {
      const headingX = velocity.x / currentForwardSpeed;
      const headingZ = velocity.z / currentForwardSpeed;
      const forwardForce = forwardError * 30 * effectiveDeployment;
      liftForce.x += headingX * forwardForce;
      liftForce.z += headingZ * forwardForce;
    } else {
      // If nearly stationary horizontally, drive forward in -Z
      liftForce.z += forwardError * 30 * effectiveDeployment * -1;
    }
  }
  
  // Total force
  const totalForce = {
    x: gravityForce.x + dragForce.x + thrustForce.x + liftForce.x,
    y: gravityForce.y + dragForce.y + thrustForce.y + liftForce.y,
    z: gravityForce.z + dragForce.z + thrustForce.z + liftForce.z,
  };
  
  return {
    totalForce,
    dragForce,
    gravityForce,
    thrustForce,
    liftForce,
  };
}

/**
 * Perform a single physics integration step using semi-implicit Euler
 */
export function physicsStep(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  controls: PhysicsControls,
  isCanopy: boolean,
  deploymentFactor: number,
  dt: number
): {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  gForce: number;
} {
  const mass = isCanopy ? MASS_WITH_CANOPY : MASS_SKYDIVER;
  
  // Calculate forces
  const forces = calculateForces(position, velocity, controls, isCanopy, deploymentFactor);
  
  // Calculate acceleration: a = F / m
  const acceleration = {
    x: forces.totalForce.x / mass,
    y: forces.totalForce.y / mass,
    z: forces.totalForce.z / mass,
  };
  
  // Semi-implicit Euler integration:
  // v_new = v + a * dt
  // p_new = p + v_new * dt
  const newVelocity = {
    x: velocity.x + acceleration.x * dt,
    y: velocity.y + acceleration.y * dt,
    z: velocity.z + acceleration.z * dt,
  };
  
  const newPosition = {
    x: position.x + newVelocity.x * dt,
    y: position.y + newVelocity.y * dt,
    z: position.z + newVelocity.z * dt,
  };
  
  // Calculate G-force felt by skydiver
  // G-force = drag force / (mass * g)
  // At terminal velocity, drag = gravity, so G-force = 1
  // During deployment, G-force can spike to 3-4
  const dragMagnitude = velocityMagnitude(forces.dragForce);
  const liftMagnitude = Math.max(0, forces.liftForce.y);
  const feltForce = dragMagnitude + liftMagnitude;
  const gForce = feltForce / (mass * GRAVITY);
  
  return {
    position: newPosition,
    velocity: newVelocity,
    acceleration,
    gForce,
  };
}

/**
 * Calculate the expected time to reach terminal velocity
 * Based on drag equation integration
 */
export function timeToTerminalVelocity(
  config: DragConfiguration,
  altitude: number = 0
): number {
  // Approximate: t ≈ v_t / g * 2.3 (for 90% of terminal velocity)
  const rho = getAirDensity(altitude);
  const vt = Math.sqrt((MASS_SKYDIVER * GRAVITY) / (rho * config.k));
  return (vt / GRAVITY) * 2.3;
}

/**
 * Classify landing quality based on vertical speed
 */
export type LandingQuality = 'perfect' | 'good' | 'hard' | 'crash';

export function classifyLanding(verticalSpeed: number): LandingQuality {
  const absSpeed = Math.abs(verticalSpeed);
  if (absSpeed < 3) return 'perfect';
  if (absSpeed < 5) return 'good';
  if (absSpeed < 8) return 'hard';
  return 'crash';
}

/**
 * Calculate horizontal turn rate for canopy
 */
export function calculateTurnRate(
  controls: PhysicsControls,
  deploymentFactor: number
): number {
  if (deploymentFactor < 0.5) return 0;
  
  let turnInput = 0;
  if (controls.left) turnInput = 1;
  if (controls.right) turnInput = -1;
  
  return turnInput * CANOPY_TURN_RATE * deploymentFactor;
}

/**
 * Calculate freefall rotation torque
 */
export function calculateFreefallTorque(
  controls: PhysicsControls
): { x: number; y: number; z: number } {
  let torque = { x: 0, y: 0, z: 0 };
  
  if (controls.left) torque.y = FREEFALL_ROTATION_TORQUE;
  if (controls.right) torque.y = -FREEFALL_ROTATION_TORQUE;
  
  return torque;
}

