/**
 * Physics Constants for Skydiving Simulation
 * All values in SI units (meters, seconds, kilograms)
 * 
 * Sources:
 * - USPA Skydiver's Information Manual
 * - NASA Standard Atmosphere Model
 * - Biomechanics research on human drag coefficients
 */

// =============================================================================
// FUNDAMENTAL CONSTANTS
// =============================================================================

/** Standard gravitational acceleration (m/s²) */
export const GRAVITY = 9.80665;

/** Sea level air density (kg/m³) - ISA standard */
export const RHO_SEA_LEVEL = 1.225;

/** Atmospheric scale height (m) - for exponential density model */
export const SCALE_HEIGHT = 8500;

// =============================================================================
// PHYSICS SIMULATION PARAMETERS
// =============================================================================

/** Fixed physics timestep (seconds) - 120 Hz for stability */
export const PHYSICS_DT = 1 / 120;

/** Maximum frame delta to prevent spiral of death (seconds) */
export const MAX_FRAME_DELTA = 0.1;

// =============================================================================
// SKYDIVER PARAMETERS
// =============================================================================

/** Skydiver mass including equipment (kg) */
export const MASS_SKYDIVER = 80;

/** Effective mass under deployed canopy (kg) - includes added mass effect */
export const MASS_WITH_CANOPY = 90;

// =============================================================================
// BODY POSITION DRAG CONFIGURATIONS
// Each configuration defines: Cd (drag coefficient) and A (cross-sectional area)
// k = 0.5 * Cd * A (convenience factor for drag equation)
// 
// Drag force: F = 0.5 * rho * v² * Cd * A = rho * v² * k
// Terminal velocity: v_t = sqrt(2 * m * g / (rho * Cd * A)) = sqrt(m * g / (rho * k))
// =============================================================================

export interface DragConfiguration {
  /** Descriptive name */
  name: string;
  /** Drag coefficient (dimensionless) */
  Cd: number;
  /** Cross-sectional area (m²) */
  A: number;
  /** Convenience factor k = 0.5 * Cd * A (m²) */
  k: number;
  /** Expected terminal velocity at sea level (m/s) - for validation */
  terminalVelocitySeaLevel: number;
}

/**
 * Belly-to-earth stable position (box position)
 * This is the standard stable freefall position
 * Target terminal velocity: ~55 m/s (120-125 mph)
 */
export const DRAG_BELLY: DragConfiguration = {
  name: 'belly',
  Cd: 1.0,
  A: 0.95,
  k: 0.5 * 1.0 * 0.95, // 0.475
  terminalVelocitySeaLevel: 53,
};

/**
 * Head-down dive position
 * Streamlined body position for maximum speed
 * Target terminal velocity: ~80 m/s (180 mph)
 */
export const DRAG_DIVE: DragConfiguration = {
  name: 'dive',
  Cd: 0.5,
  A: 0.35,
  k: 0.5 * 0.5 * 0.35, // 0.0875
  terminalVelocitySeaLevel: 85,
};

/**
 * Arch/spread position (max drag)
 * Maximum drag configuration for braking
 * Target terminal velocity: ~45 m/s (100 mph)
 */
export const DRAG_ARCH: DragConfiguration = {
  name: 'arch',
  Cd: 1.3,
  A: 1.1,
  k: 0.5 * 1.3 * 1.1, // 0.715
  terminalVelocitySeaLevel: 42,
};

/**
 * Tracking position
 * Forward-moving position with moderate drag
 * Similar to belly but with forward vector
 */
export const DRAG_TRACK: DragConfiguration = {
  name: 'track',
  Cd: 0.8,
  A: 0.6,
  k: 0.5 * 0.8 * 0.6, // 0.24
  terminalVelocitySeaLevel: 65,
};

// =============================================================================
// PARACHUTE PARAMETERS
// =============================================================================

/**
 * Ram-air parachute (main canopy)
 * Typical 7-cell sport canopy ~170-190 sq ft
 * Target descent rate: 4-6 m/s
 */
export const DRAG_PARACHUTE: DragConfiguration = {
  name: 'parachute',
  Cd: 0.8,
  A: 25, // ~25 m² projected area for ~170 sq ft canopy
  k: 0.5 * 0.8 * 25, // 10.0
  terminalVelocitySeaLevel: 5,
};

/** Parachute glide ratio (horizontal distance / vertical distance) */
export const PARACHUTE_GLIDE_RATIO = 2.5;

/** Base forward speed under canopy at full glide (m/s) */
export const PARACHUTE_FORWARD_SPEED = 12;

/** Descent rate under full brakes (m/s) */
export const PARACHUTE_BRAKE_DESCENT = 6;

/** Descent rate at full glide (m/s) */
export const PARACHUTE_GLIDE_DESCENT = 4;

// =============================================================================
// PARACHUTE DEPLOYMENT PARAMETERS
// =============================================================================

/** Total deployment duration (seconds) */
export const DEPLOYMENT_DURATION = 4.0;

/** Center point of sigmoid curve (seconds into deployment) */
export const DEPLOYMENT_SIGMOID_CENTER = 2.0;

/** Sigmoid steepness factor (higher = faster transition) */
export const DEPLOYMENT_SIGMOID_STEEPNESS = 3.0;

/** Minimum safe deployment altitude (m) - ~2500 ft */
export const MIN_DEPLOYMENT_ALTITUDE = 760;

/** Maximum recommended deployment altitude (m) - ~5500 ft */
export const MAX_DEPLOYMENT_ALTITUDE = 1675;

// =============================================================================
// JUMP PARAMETERS
// =============================================================================

/** Standard jump altitude (m) - 10,000 ft */
export const JUMP_ALTITUDE = 3048;

/** High altitude jump (m) - 14,000 ft */
export const HIGH_ALTITUDE = 4267;

/** Aircraft forward speed at jump (m/s) - ~100 knots */
export const AIRCRAFT_SPEED = 51.4;

// =============================================================================
// LANDING PARAMETERS
// =============================================================================

/** Perfect landing threshold (m/s) */
export const LANDING_PERFECT_THRESHOLD = 3;

/** Good landing threshold (m/s) */
export const LANDING_GOOD_THRESHOLD = 5;

/** Hard landing threshold (m/s) */
export const LANDING_HARD_THRESHOLD = 8;

/** Ground friction coefficient for landing */
export const GROUND_FRICTION = 0.8;

// =============================================================================
// CONTROL FORCES
// =============================================================================

/** Torque applied for body rotation in freefall (N·m) */
export const FREEFALL_ROTATION_TORQUE = 50;

/** Tracking forward thrust (N) */
export const TRACK_THRUST = 400;

/** Canopy turn rate (rad/s per unit input) */
export const CANOPY_TURN_RATE = 0.8;

/** Flare lift impulse (N) */
export const FLARE_LIFT_FORCE = 800;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate air density at a given altitude using exponential atmosphere model
 * @param altitude Height above sea level (m)
 * @returns Air density (kg/m³)
 */
export function getAirDensity(altitude: number): number {
  return RHO_SEA_LEVEL * Math.exp(-altitude / SCALE_HEIGHT);
}

/**
 * Calculate terminal velocity for a given drag configuration at specified altitude
 * @param config Drag configuration
 * @param altitude Height above sea level (m)
 * @param mass Object mass (kg)
 * @returns Terminal velocity (m/s)
 */
export function getTerminalVelocity(
  config: DragConfiguration,
  altitude: number = 0,
  mass: number = MASS_SKYDIVER
): number {
  const rho = getAirDensity(altitude);
  // v_t = sqrt(m * g / (rho * k))
  return Math.sqrt((mass * GRAVITY) / (rho * config.k));
}

/**
 * Calculate drag force magnitude
 * @param velocity Velocity magnitude (m/s)
 * @param config Drag configuration
 * @param altitude Height above sea level (m)
 * @returns Drag force magnitude (N)
 */
export function getDragForce(
  velocity: number,
  config: DragConfiguration,
  altitude: number = 0
): number {
  const rho = getAirDensity(altitude);
  // F = rho * v² * k (where k = 0.5 * Cd * A)
  return rho * velocity * velocity * config.k;
}

/**
 * Sigmoid function for smooth deployment curve
 * @param t Time since deployment started (s)
 * @returns Deployment factor 0-1
 */
export function getDeploymentFactor(t: number): number {
  // Sigmoid: 1 / (1 + e^(-steepness * (t - center)))
  return 1 / (1 + Math.exp(-DEPLOYMENT_SIGMOID_STEEPNESS * (t - DEPLOYMENT_SIGMOID_CENTER)));
}

/**
 * Interpolate between two drag configurations
 * @param from Starting configuration
 * @param to Ending configuration  
 * @param factor Interpolation factor 0-1
 * @returns Interpolated k value
 */
export function lerpDragK(from: DragConfiguration, to: DragConfiguration, factor: number): number {
  return from.k + (to.k - from.k) * factor;
}

