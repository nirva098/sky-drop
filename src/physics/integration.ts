/**
 * Fixed Timestep Physics Integration
 * 
 * Implements accumulator pattern for deterministic physics simulation
 * independent of rendering frame rate.
 */

import { PHYSICS_DT, MAX_FRAME_DELTA } from './constants';

/**
 * Physics accumulator state
 */
export interface PhysicsAccumulator {
  /** Accumulated time not yet consumed by physics steps */
  accumulator: number;
  /** Previous position for interpolation */
  prevPosition: { x: number; y: number; z: number };
  /** Current physics position */
  currentPosition: { x: number; y: number; z: number };
  /** Previous velocity for interpolation */
  prevVelocity: { x: number; y: number; z: number };
  /** Current physics velocity */
  currentVelocity: { x: number; y: number; z: number };
}

/**
 * Create initial accumulator state
 */
export function createAccumulator(
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  velocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): PhysicsAccumulator {
  return {
    accumulator: 0,
    prevPosition: { ...position },
    currentPosition: { ...position },
    prevVelocity: { ...velocity },
    currentVelocity: { ...velocity },
  };
}

/**
 * Step function signature for physics update
 */
export type PhysicsStepFn = (
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  dt: number
) => {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
};

/**
 * Update physics with fixed timestep accumulator pattern
 * 
 * @param accumulator Current accumulator state
 * @param frameDelta Time since last frame (s)
 * @param stepFn Physics step function
 * @returns Number of physics steps taken
 */
export function updatePhysics(
  accumulator: PhysicsAccumulator,
  frameDelta: number,
  stepFn: PhysicsStepFn
): number {
  // Clamp frame delta to prevent spiral of death
  const clampedDelta = Math.min(frameDelta, MAX_FRAME_DELTA);
  
  accumulator.accumulator += clampedDelta;
  
  let steps = 0;
  
  while (accumulator.accumulator >= PHYSICS_DT) {
    // Store previous state for interpolation
    accumulator.prevPosition = { ...accumulator.currentPosition };
    accumulator.prevVelocity = { ...accumulator.currentVelocity };
    
    // Execute physics step
    const result = stepFn(
      accumulator.currentPosition,
      accumulator.currentVelocity,
      PHYSICS_DT
    );
    
    accumulator.currentPosition = result.position;
    accumulator.currentVelocity = result.velocity;
    
    accumulator.accumulator -= PHYSICS_DT;
    steps++;
  }
  
  return steps;
}

/**
 * Get interpolated position for smooth rendering
 * 
 * @param accumulator Current accumulator state
 * @returns Interpolated position between physics steps
 */
export function getInterpolatedPosition(
  accumulator: PhysicsAccumulator
): { x: number; y: number; z: number } {
  const alpha = accumulator.accumulator / PHYSICS_DT;
  
  return {
    x: lerp(accumulator.prevPosition.x, accumulator.currentPosition.x, alpha),
    y: lerp(accumulator.prevPosition.y, accumulator.currentPosition.y, alpha),
    z: lerp(accumulator.prevPosition.z, accumulator.currentPosition.z, alpha),
  };
}

/**
 * Get interpolated velocity for smooth HUD updates
 */
export function getInterpolatedVelocity(
  accumulator: PhysicsAccumulator
): { x: number; y: number; z: number } {
  const alpha = accumulator.accumulator / PHYSICS_DT;
  
  return {
    x: lerp(accumulator.prevVelocity.x, accumulator.currentVelocity.x, alpha),
    y: lerp(accumulator.prevVelocity.y, accumulator.currentVelocity.y, alpha),
    z: lerp(accumulator.prevVelocity.z, accumulator.currentVelocity.z, alpha),
  };
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculate velocity magnitude
 */
export function velocityMagnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalize a vector
 */
export function normalize(
  v: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const mag = velocityMagnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / mag,
    y: v.y / mag,
    z: v.z / mag,
  };
}

