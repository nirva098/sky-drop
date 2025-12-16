import { OrbitControls, Sky } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';

export const GameScene = () => {
  return (
    <>
      <OrbitControls makeDefault />
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      <Physics debug>
        {/* Ground */}
        <RigidBody type="fixed" colliders="cuboid">
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </RigidBody>

        {/* Player Placeholder */}
        <RigidBody position={[0, 5, 0]} colliders="cuboid">
          <mesh castShadow>
            <boxGeometry />
            <meshStandardMaterial color="orange" />
          </mesh>
        </RigidBody>
      </Physics>
    </>
  );
};
