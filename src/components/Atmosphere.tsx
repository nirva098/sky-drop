import { Cloud } from '@react-three/drei';

export const Atmosphere = () => {
    return (
        <group>
            {/* High Altitude Clouds */}
            <Cloud position={[-100, 8000, -100]} opacity={0.5} speed={0.4} bounds={[100, 10, 100]} segments={20} />
            <Cloud position={[100, 7500, 100]} opacity={0.5} speed={0.3} bounds={[100, 10, 100]} segments={20} />

            {/* Mid Layers */}
            <Cloud position={[0, 4000, 0]} opacity={0.8} speed={0.8} bounds={[200, 50, 200]} segments={30} />

            {/* Lower Deck */}
            <Cloud position={[-50, 1200, 50]} opacity={1} speed={1} bounds={[50, 20, 50]} segments={10} color="#e0e0e0" />
        </group>
    );
};
