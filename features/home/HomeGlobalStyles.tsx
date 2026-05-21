export function HomeGlobalStyles() {
  return (
    <style jsx global>{`
      @keyframes prismPan {
        0% {
          background-position: 0% center;
        }
        100% {
          background-position: 200% center;
        }
      }
      .prism-text-overlay {
        position: relative;
        display: inline-block;
        color: rgba(255, 255, 255, 0.9);
      }
      .prism-text-overlay::after {
        content: attr(data-text);
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          135deg,
          transparent 25%,
          rgba(255, 100, 100, 0.7) 35%,
          rgba(255, 200, 100, 0.7) 45%,
          rgba(100, 255, 100, 0.7) 55%,
          rgba(100, 200, 255, 0.7) 65%,
          rgba(200, 100, 255, 0.7) 75%,
          transparent 85%
        );
        background-size: 200% auto;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        animation: prismPan 4s ease-in-out infinite;
        opacity: 1;
        filter: brightness(1.75);
      }
      .on-air-glow {
        box-shadow: 0 0 25px rgba(220, 38, 38, 0.6);
        text-shadow: 0 0 5px white;
      }
      @keyframes heroGlowPulse {
        0%,
        100% {
          opacity: 0.34;
          transform: scale(0.96);
        }
        50% {
          opacity: 0.72;
          transform: scale(1.08);
        }
      }
      @keyframes heroPrismDrift {
        0% {
          background-position: 0% 50%;
        }
        100% {
          background-position: 200% 50%;
        }
      }
      @keyframes titleSoftGlow {
        0%,
        100% {
          text-shadow: 0 0 30px rgba(59, 130, 246, 0.16);
        }
        50% {
          text-shadow: 0 0 46px rgba(59, 130, 246, 0.34);
        }
      }
      .auction-hero-title {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.2em;
      }
      .auction-hero-line {
        display: block;
        width: 100%;
      }
      .hero-title-wrap {
        position: relative;
        display: inline-block;
      }
      .hero-title-wrap::before {
        content: "";
        position: absolute;
        inset: -0.18em -0.08em -0.06em;
        background: radial-gradient(circle at 18% 28%, rgba(59, 130, 246, 0.2), transparent 40%),
          radial-gradient(circle at 72% 55%, rgba(168, 85, 247, 0.14), transparent 42%);
        filter: blur(26px);
        opacity: 0.46;
        animation: heroGlowPulse 5.8s ease-in-out infinite;
        pointer-events: none;
        z-index: -2;
      }
      .hero-glitch-title {
        position: relative;
        display: inline-block;
        isolation: isolate;
        text-shadow: 0 0 36px rgba(59, 130, 246, 0.18);
        animation: titleSoftGlow 7s ease-in-out infinite;
      }
      .hero-prism-text {
        background: linear-gradient(110deg, #3b82f6 0%, #60a5fa 26%, #a78bfa 48%, #facc15 62%, #3b82f6 100%);
        background-size: 200% auto;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        animation: heroPrismDrift 7s ease-in-out infinite;
        filter: drop-shadow(0 0 18px rgba(59, 130, 246, 0.16));
      }
    `}</style>
  );
}
