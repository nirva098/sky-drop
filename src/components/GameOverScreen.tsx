import { Html } from '@react-three/drei';
import { useGameStore, GamePhase } from '../stores/useGameStore';

export const GameOverScreen = () => {
    const { phase, score, landingQuality, reset } = useGameStore();

    if (phase !== GamePhase.LANDED) return null;

    // Landing quality styling and messages
    const qualityConfig = {
        perfect: {
            color: '#22cc44',
            title: 'PERFECT LANDING!',
            message: 'Textbook touchdown!',
            emoji: '🎯',
        },
        good: {
            color: '#88cc22',
            title: 'GOOD LANDING',
            message: 'Solid performance.',
            emoji: '👍',
        },
        hard: {
            color: '#ccaa22',
            title: 'HARD LANDING',
            message: 'Bit rough on the knees...',
            emoji: '😬',
        },
        crash: {
            color: '#cc4422',
            title: 'CRASH!',
            message: 'Call the medic!',
            emoji: '🚑',
        },
    };

    const config = landingQuality ? qualityConfig[landingQuality] : qualityConfig.good;

    // Score rating
    const getScoreRating = (dist: number) => {
        if (dist < 5) return { text: 'BULLSEYE!', stars: 5 };
        if (dist < 15) return { text: 'Excellent', stars: 4 };
        if (dist < 30) return { text: 'Good', stars: 3 };
        if (dist < 60) return { text: 'Okay', stars: 2 };
        return { text: 'Practice more', stars: 1 };
    };

    const rating = getScoreRating(score);

    return (
        <Html center>
            <div style={{ 
                background: 'linear-gradient(135deg, rgba(20,30,40,0.95) 0%, rgba(40,50,60,0.95) 100%)',
                padding: '40px 50px', 
                borderRadius: '20px', 
                textAlign: 'center', 
                color: '#fff',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(100,150,255,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minWidth: '320px',
            }}>
                {/* Landing Quality Header */}
                <div style={{ 
                    fontSize: '3em', 
                    marginBottom: '5px',
                }}>
                    {config.emoji}
                </div>
                <h1 style={{ 
                    margin: '0 0 5px 0', 
                    fontSize: '2em',
                    color: config.color,
                    textShadow: `0 0 20px ${config.color}40`,
                }}>
                    {config.title}
                </h1>
                <p style={{ 
                    margin: '0 0 25px 0', 
                    opacity: 0.7,
                    fontSize: '1.1em',
                }}>
                    {config.message}
                </p>

                {/* Score Section */}
                <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '20px', 
                    borderRadius: '12px',
                    marginBottom: '25px',
                }}>
                    <div style={{ 
                        fontSize: '0.9em', 
                        opacity: 0.6,
                        marginBottom: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                    }}>
                        Distance to Target
                    </div>
                    <div style={{ 
                        fontSize: '2.5em', 
                        fontWeight: 'bold',
                        marginBottom: '10px',
                    }}>
                        {score.toFixed(1)} <span style={{ fontSize: '0.5em', opacity: 0.7 }}>meters</span>
                    </div>
                    
                    {/* Star Rating */}
                    <div style={{ marginBottom: '5px' }}>
                        {[...Array(5)].map((_, i) => (
                            <span 
                                key={i} 
                                style={{ 
                                    fontSize: '1.5em',
                                    color: i < rating.stars ? '#ffd700' : '#333',
                                    textShadow: i < rating.stars ? '0 0 10px #ffd700' : 'none',
                                }}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                    <div style={{ 
                        fontSize: '0.9em',
                        color: '#ffd700',
                        fontWeight: 'bold',
                    }}>
                        {rating.text}
                    </div>
                </div>

                {/* Jump Again Button */}
                <button
                    onClick={reset}
                    style={{ 
                        background: 'linear-gradient(135deg, #4080ff 0%, #2060dd 100%)',
                        color: 'white', 
                        border: 'none', 
                        padding: '16px 40px', 
                        fontSize: '1.2em', 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 20px rgba(64,128,255,0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 30px rgba(64,128,255,0.6)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(64,128,255,0.4)';
                    }}
                >
                    Jump Again
                </button>

                {/* Keyboard hint */}
                <div style={{ 
                    marginTop: '15px', 
                    fontSize: '0.8em', 
                    opacity: 0.5,
                }}>
                    Press <kbd style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                    }}>SPACE</kbd> to jump
                </div>
            </div>
        </Html>
    );
};
