import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import { GameScene } from './scenes/GameScene';
import { useGameStore, GamePhase } from './stores/useGameStore';
import {
  DRAG_BELLY,
  DRAG_DIVE,
  getTerminalVelocity,
  MIN_DEPLOYMENT_ALTITUDE,
} from './physics/constants';

const HUD = () => {
  const { 
    altitude, 
    speed, 
    acceleration, 
    phase, 
    landingQuality,
    telemetryEnabled,
    telemetry,
    toggleTelemetry,
    exportTelemetry,
  } = useGameStore();

  // Calculate expected terminal velocities for reference
  const termVelBelly = getTerminalVelocity(DRAG_BELLY, altitude);
  const termVelDive = getTerminalVelocity(DRAG_DIVE, altitude);

  // Altitude warning colors
  const getAltitudeColor = () => {
    if (altitude < MIN_DEPLOYMENT_ALTITUDE) return '#ff4444';
    if (altitude < MIN_DEPLOYMENT_ALTITUDE + 300) return '#ffaa00';
    return '#44ff44';
  };

  const handleExportTelemetry = () => {
    const csv = exportTelemetry();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skydive_telemetry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      position: 'absolute', 
      top: 20, 
      left: 20, 
      color: 'white', 
      fontFamily: 'JetBrains Mono, Consolas, monospace', 
      fontSize: '1.1em', 
      pointerEvents: 'auto', 
      zIndex: 10, 
      background: 'rgba(0,0,0,0.7)', 
      padding: '15px 20px', 
      borderRadius: '8px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      minWidth: '260px',
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '12px', 
        fontSize: '1.3em',
        letterSpacing: '2px',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        paddingBottom: '8px',
      }}>
        SKY DROP
      </div>
      
      {/* Primary Stats */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.7 }}>ALT</span>
          <span style={{ color: getAltitudeColor(), fontWeight: 'bold' }}>
            {altitude.toFixed(0)} m
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.7 }}>SPD</span>
          <span style={{ fontWeight: 'bold' }}>{speed.toFixed(1)} m/s</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.7 }}>G-FORCE</span>
          <span style={{ 
            color: acceleration > 3 ? '#ff4444' : acceleration > 1.5 ? '#ffaa00' : '#44ff44',
            fontWeight: 'bold'
          }}>
            {acceleration.toFixed(2)} G
          </span>
        </div>
      </div>

      {/* Phase indicator */}
      <div style={{ 
        background: phase === GamePhase.FREEFALL ? 'rgba(255,100,100,0.3)' :
                   phase === GamePhase.CANOPY ? 'rgba(100,255,100,0.3)' :
                   phase === GamePhase.LANDED ? 'rgba(100,100,255,0.3)' :
                   'rgba(255,255,255,0.1)',
        padding: '5px 10px',
        borderRadius: '4px',
        textAlign: 'center',
        marginBottom: '10px',
        fontWeight: 'bold',
      }}>
        {phase}
        {landingQuality && phase === GamePhase.LANDED && (
          <span style={{ 
            marginLeft: '10px',
            color: landingQuality === 'perfect' ? '#44ff44' :
                   landingQuality === 'good' ? '#aaff44' :
                   landingQuality === 'hard' ? '#ffaa00' : '#ff4444'
          }}>
            ({landingQuality.toUpperCase()})
          </span>
        )}
      </div>

      {/* Terminal velocity reference */}
      {(phase === GamePhase.FREEFALL || phase === GamePhase.READY) && (
        <div style={{ 
          fontSize: '0.85em', 
          opacity: 0.6, 
          marginBottom: '10px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '8px',
        }}>
          <div>Vt belly: {termVelBelly.toFixed(0)} m/s</div>
          <div>Vt dive: {termVelDive.toFixed(0)} m/s</div>
        </div>
      )}

      {/* Controls */}
      <div style={{ 
        fontSize: '0.8em', 
        opacity: 0.8, 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        paddingTop: '8px',
        lineHeight: '1.6',
      }}>
        <div><kbd>SPACE</kbd> Jump / Deploy</div>
        <div><kbd>W</kbd> Dive (fast)</div>
        <div><kbd>S</kbd> Arch (slow) / Flare</div>
        <div><kbd>A/D</kbd> Turn</div>
        <div><kbd>SHIFT</kbd> Track forward</div>
      </div>

      {/* Telemetry controls */}
      <div style={{ 
        marginTop: '10px', 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        paddingTop: '8px',
        fontSize: '0.8em',
      }}>
        <button 
          onClick={toggleTelemetry}
          style={{
            background: telemetryEnabled ? 'rgba(255,100,100,0.5)' : 'rgba(100,100,100,0.5)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '5px',
          }}
        >
          {telemetryEnabled ? '● REC' : '○ REC'}
        </button>
        {telemetry.length > 0 && (
          <button 
            onClick={handleExportTelemetry}
            style={{
              background: 'rgba(100,100,255,0.5)',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Export CSV ({telemetry.length})
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Telemetry recorder component - runs inside Canvas to access frame time
 */
const TelemetryRecorder = () => {
  const recordTelemetry = useGameStore((s) => s.recordTelemetry);
  
  useFrame((state) => {
    recordTelemetry(state.clock.elapsedTime);
  });
  
  return null;
};

function App() {
  return (
    <>
      <HUD />
      <Canvas shadows camera={{ position: [0, 3053, 15], fov: 60, far: 20000 }}>
        <Suspense fallback={null}>
          <GameScene />
          <TelemetryRecorder />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
