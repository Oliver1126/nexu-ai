'use client'

// ──────────────────────────────────────────────────────────────
// Nexu — the NodalNexus AI assistant mascot. A Pikachu-style head
// in the NodalNexus electric-cyan brand: pointy ears with dark tips,
// glowing "node" cheeks (a nexus motif instead of Pikachu's red ones),
// and a little node-graph emblem on the forehead.
// Pass `processing` to play the "analyzing" animation (bob, pulsing
// cheeks, sparks, faster blink).
// ──────────────────────────────────────────────────────────────

type Props = { size?: number; processing?: boolean; className?: string }

export default function NexuMascot({ size = 72, processing = false, className = '' }: Props) {
    return (
        <span className={`nexu ${processing ? 'is-processing' : ''} ${className}`} style={{ display: 'inline-block', width: size, height: size }}>
            <svg viewBox="0 0 100 100" width={size} height={size} className="nexu-svg" aria-label="Nexu AI">
                <defs>
                    <radialGradient id="nexuHead" cx="50%" cy="40%" r="70%">
                        <stop offset="0%" stopColor="#67e8f9" />
                        <stop offset="60%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#0e7490" />
                    </radialGradient>
                    <radialGradient id="nexuCheek" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#a5f3fc" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </radialGradient>
                </defs>

                {/* Ears */}
                <g className="nexu-ear nexu-ear-l">
                    <path d="M34 40 L22 6 L40 30 Z" fill="url(#nexuHead)" stroke="#0e7490" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M22 6 L27 19 L31 12 Z" fill="#0f172a" />
                </g>
                <g className="nexu-ear nexu-ear-r">
                    <path d="M66 40 L78 6 L60 30 Z" fill="url(#nexuHead)" stroke="#0e7490" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M78 6 L73 19 L69 12 Z" fill="#0f172a" />
                </g>

                {/* Sparks (only visible while processing) */}
                <g className="nexu-sparks" fill="#a5f3fc">
                    <circle className="spark s1" cx="16" cy="44" r="2" />
                    <circle className="spark s2" cx="84" cy="40" r="2.2" />
                    <circle className="spark s3" cx="20" cy="72" r="1.6" />
                    <circle className="spark s4" cx="82" cy="70" r="1.8" />
                </g>

                {/* Head */}
                <ellipse cx="50" cy="58" rx="31" ry="27" fill="url(#nexuHead)" stroke="#0e7490" strokeWidth="1.5" />

                {/* Forehead nexus emblem (node graph) */}
                <g className="nexu-emblem" stroke="#ecfeff" strokeWidth="1" opacity="0.85">
                    <line x1="50" y1="42" x2="42" y2="48" />
                    <line x1="50" y1="42" x2="58" y2="48" />
                    <line x1="42" y1="48" x2="58" y2="48" />
                    <circle cx="50" cy="42" r="1.8" fill="#ecfeff" stroke="none" />
                    <circle cx="42" cy="48" r="1.6" fill="#ecfeff" stroke="none" />
                    <circle cx="58" cy="48" r="1.6" fill="#ecfeff" stroke="none" />
                </g>

                {/* Eyes */}
                <g className="nexu-eyes">
                    <ellipse className="eye" cx="39" cy="58" rx="5" ry="6.5" fill="#0f172a" />
                    <ellipse className="eye" cx="61" cy="58" rx="5" ry="6.5" fill="#0f172a" />
                    <circle cx="40.6" cy="55.5" r="1.6" fill="#ecfeff" />
                    <circle cx="62.6" cy="55.5" r="1.6" fill="#ecfeff" />
                </g>

                {/* Nose + smile */}
                <path d="M48 64 L52 64 L50 66 Z" fill="#0f172a" />
                <path d="M44 69 Q50 74 56 69" fill="none" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />

                {/* Glowing node cheeks */}
                <circle className="nexu-cheek" cx="30" cy="67" r="6" fill="url(#nexuCheek)" />
                <circle className="nexu-cheek" cx="70" cy="67" r="6" fill="url(#nexuCheek)" />
                <circle cx="30" cy="67" r="1.8" fill="#083344" />
                <circle cx="70" cy="67" r="1.8" fill="#083344" />
            </svg>

            <style jsx>{`
                .nexu-svg { display: block; overflow: visible; }
                .nexu-cheek { transform-origin: center; transform-box: fill-box; }
                .spark { opacity: 0; }

                /* idle: gentle life — slow blink only */
                .eye { transform-origin: center; transform-box: fill-box; animation: nexu-blink 5s infinite; }

                @keyframes nexu-blink {
                    0%, 92%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes nexu-bob {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes nexu-pulse {
                    0%, 100% { opacity: 0.85; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 5px #22d3ee); }
                }
                @keyframes nexu-spark {
                    0% { opacity: 0; transform: scale(0.5); }
                    40% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0; transform: scale(0.5) translateY(-6px); }
                }
                @keyframes nexu-ear-twitch {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-6deg); }
                }

                /* processing: come alive */
                .is-processing .nexu-svg { animation: nexu-bob 0.9s ease-in-out infinite; }
                .is-processing .nexu-cheek { animation: nexu-pulse 0.8s ease-in-out infinite; }
                .is-processing .eye { animation: nexu-blink 1.4s infinite; }
                .is-processing .nexu-ear-l { transform-origin: 34px 40px; transform-box: fill-box; animation: nexu-ear-twitch 0.9s ease-in-out infinite; }
                .is-processing .nexu-ear-r { transform-origin: 66px 40px; transform-box: fill-box; animation: nexu-ear-twitch 0.9s ease-in-out infinite reverse; }
                .is-processing .spark { transform-origin: center; transform-box: fill-box; }
                .is-processing .s1 { animation: nexu-spark 1s ease-in-out infinite; }
                .is-processing .s2 { animation: nexu-spark 1s ease-in-out 0.25s infinite; }
                .is-processing .s3 { animation: nexu-spark 1s ease-in-out 0.5s infinite; }
                .is-processing .s4 { animation: nexu-spark 1s ease-in-out 0.75s infinite; }

                @media (prefers-reduced-motion: reduce) {
                    .nexu-svg, .nexu-cheek, .eye, .nexu-ear-l, .nexu-ear-r, .spark { animation: none !important; }
                }
            `}</style>
        </span>
    )
}
