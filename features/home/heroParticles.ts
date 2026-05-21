export const HERO_SPARKLE_GOLD = ["#facc15", "#fde047", "#eab308", "#fbbf24"] as const;
export const HERO_SPARKLE_SILVER = ["#f4f4f5", "#e4e4e7", "#d4d4d8", "#cbd5e1"] as const;
export const HERO_BURST_WORDS = [
  { label: "귀중한", chars: ["귀", "중", "한"] },
  { label: "아이템", chars: ["아", "이", "템"] },
] as const;

export type BurstParticleOpts = {
  speedMin: number;
  speedMax: number;
  sizeMin: number;
  sizeMax: number;
  gravity: number;
  timeScale: number;
  peakRatio?: number;
};

export type HeroParticle = {
  id: number;
  xPeak: number;
  yPeak: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  peakTime: number;
  originX: number;
  originY: number;
};

const pickSparkleColor = () =>
  Math.random() < 0.62
    ? HERO_SPARKLE_GOLD[Math.floor(Math.random() * HERO_SPARKLE_GOLD.length)]
    : HERO_SPARKLE_SILVER[Math.floor(Math.random() * HERO_SPARKLE_SILVER.length)];

export const buildBurstParticles = (count: number, idBase: number, opts: BurstParticleOpts) => {
  const peakRatio = opts.peakRatio ?? 0.3;
  return Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.75;
    const speed = opts.speedMin + Math.random() * (opts.speedMax - opts.speedMin);
    const duration = 0.9 + Math.random() * 0.55;
    const peakAt = Math.min(0.45, peakRatio + Math.random() * 0.1);
    const ts = opts.timeScale;

    const vx = Math.cos(angle) * speed;
    const vy0 = Math.sin(angle) * speed;
    const tPeak = duration * peakAt;
    const tEnd = duration;

    const xPeak = vx * tPeak * ts;
    const yPeak = vy0 * tPeak * ts;
    const xEnd = vx * tEnd * ts;
    const yEnd = vy0 * tEnd * ts + 0.5 * opts.gravity * tEnd * tEnd * ts * ts;

    return {
      id: idBase + i,
      xPeak,
      yPeak,
      x: xEnd,
      y: yEnd,
      size: opts.sizeMin + Math.random() * (opts.sizeMax - opts.sizeMin),
      color: pickSparkleColor(),
      duration,
      peakTime: peakAt,
    };
  });
};

export const withOrigins = (
  particles: Omit<HeroParticle, "originX" | "originY">[],
  origin: { x: number; y: number },
  jitter = 10,
): HeroParticle[] =>
  particles.map((p) => ({
    ...p,
    originX: origin.x + (Math.random() - 0.5) * jitter,
    originY: origin.y + (Math.random() - 0.5) * jitter * 0.7,
  }));

export const HERO_BURST_STAGE1: BurstParticleOpts = {
  speedMin: 165,
  speedMax: 360,
  sizeMin: 3,
  sizeMax: 6.5,
  gravity: 640,
  timeScale: 0.58,
  peakRatio: 0.28,
};

export const HERO_BURST_STAGE2: BurstParticleOpts = {
  speedMin: 115,
  speedMax: 265,
  sizeMin: 5,
  sizeMax: 10,
  gravity: 580,
  timeScale: 0.52,
  peakRatio: 0.3,
};
