# Sky Drop 🪂

A premium, browser-based 3D skydiving visualization. Experience the thrill of free fall with physics-based flight dynamics.

## 🎮 Controls

| Phase | Key | Action |
| :--- | :--- | :--- |
| **All** | `Mouse` | Look Around |
| **Plane** | `Space` | Jump |
| **Free Fall** | `W` | Dive (Head Down / Faster) |
| | `S` | Arch (Belly Down / Slower) |
| | `A / D` | Turn |
| | `Shift` | Track (Forward movement) |
| | `Space` | Deploy Parachute |
| **Canopy** | `W` | Full Glide |
| | `S` | Brake / Flare |
| | `A / D` | Turn |

## 🛠️ Development

### Prerequisites
- Node.js v18+
- WebGL 2.0 compatible browser

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Architecture

- **Engine:** Three.js + React Three Fiber
- **Physics:** Rapier (WASM)
- **State:** Zustand
- **Build:** Vite
