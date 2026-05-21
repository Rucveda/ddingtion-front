"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const TITLE = "아이템";
const SLOT_GLYPHS = "★◆◇아이템7665".split("");

type ReelPlan = {
  char: string;
  strip: string[];
  index: number;
};

function buildReelStrip(finalChar: string, spinLength: number): string[] {
  const strip: string[] = [];
  for (let i = 0; i < spinLength - 1; i += 1) {
    strip.push(SLOT_GLYPHS[Math.floor(Math.random() * SLOT_GLYPHS.length)] ?? "★");
  }
  strip.push(finalChar);
  return strip;
}

function buildReels(spinGeneration: number): ReelPlan[] {
  return [...TITLE].map((char, index) => {
    if (char === " ") {
      return { char, strip: [" "], index };
    }
    return {
      char,
      strip: buildReelStrip(char, 10 + (spinGeneration % 3) + index),
      index,
    };
  });
}

type AuctionJackpotTitleProps = {
  onSpin?: () => void;
};

export default function AuctionJackpotTitle({ onSpin }: AuctionJackpotTitleProps) {
  const [spinGeneration, setSpinGeneration] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);

  const reels = useMemo(() => buildReels(spinGeneration), [spinGeneration]);

  const respin = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinGeneration((value) => value + 1);
    onSpin?.();
  }, [isSpinning, onSpin]);

  const maxDelay = reels.reduce((max, reel) => {
    if (reel.char === " ") return max;
    return Math.max(max, 0.06 * reel.index);
  }, 0);
  const spinDuration = 0.95;
  useEffect(() => {
    setIsSpinning(true);
    const timer = window.setTimeout(() => setIsSpinning(false), (spinDuration + maxDelay + 0.15) * 1000);
    return () => window.clearTimeout(timer);
  }, [spinGeneration, maxDelay, spinDuration]);

  return (
    <span
      role="button"
      tabIndex={0}
      onMouseEnter={respin}
      onFocus={respin}
      onClick={respin}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          respin();
        }
      }}
      className={`auction-slot-phrase ${isSpinning ? "auction-slot-phrase--spinning" : "auction-slot-phrase--landed"}`}
      aria-label="아이템 — 마우스를 올리면 슬롯이 다시 돌아갑니다"
    >
      <span className="auction-slot-reels">
      {reels.map((reel) => {
        if (reel.char === " ") {
          return <span key={`space-${spinGeneration}-${reel.index}`}> </span>;
        }

        const cellCount = reel.strip.length;
        const delay = 0.06 * reel.index;

        return (
          <span
            key={`${spinGeneration}-${reel.index}-${reel.char}`}
            className="auction-slot-reel"
            style={{ ["--slot-cells" as string]: cellCount }}
          >
            <span
              className="auction-slot-reel-strip"
              style={{
                animationDuration: `${spinDuration}s`,
                animationDelay: `${delay}s`,
              }}
            >
              {reel.strip.map((glyph, glyphIndex) => (
                <span key={`${glyph}-${glyphIndex}`} className="auction-slot-reel-cell">
                  {glyph}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      </span>
    </span>
  );
}
