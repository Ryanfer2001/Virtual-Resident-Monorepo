"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CardTipo = "visitor" | "diaspora" | "business" | "student";

export type RouletteCard = {
  id: string;
  tipo: CardTipo;
  plano: string;
  preco: string;
};

interface CardRouletteProps {
  onSelect?: (card: RouletteCard) => void;
}

const TIPO_LABEL: Record<CardTipo, string> = {
  visitor: "Visitor",
  diaspora: "Diaspora",
  business: "Business",
  student: "Student",
};

const CARDS: RouletteCard[] = [
  { id: "visitor-basico", tipo: "visitor", plano: "Visitor Básico", preco: "0 CVE" },
  { id: "diaspora-start", tipo: "diaspora", plano: "Diaspora Start", preco: "2.500 CVE" },
  { id: "business-starter", tipo: "business", plano: "Business Starter", preco: "5.000 CVE" },
  { id: "student-essencial", tipo: "student", plano: "Student Essencial", preco: "0 CVE" },
  { id: "visitor-standard", tipo: "visitor", plano: "Visitor Standard", preco: "1.500 CVE" },
  { id: "diaspora-completo", tipo: "diaspora", plano: "Diaspora Completo", preco: "5.000 CVE" },
  { id: "business-growth", tipo: "business", plano: "Business Growth", preco: "10.000 CVE" },
  { id: "student-ativo", tipo: "student", plano: "Student Ativo", preco: "1.000 CVE" },
  { id: "visitor-plus", tipo: "visitor", plano: "Visitor Plus", preco: "3.000 CVE" },
  { id: "diaspora-premium", tipo: "diaspora", plano: "Diaspora Premium", preco: "10.000 CVE" },
  { id: "business-elite", tipo: "business", plano: "Business Elite", preco: "20.000 CVE" },
  { id: "student-pro", tipo: "student", plano: "Student Pro", preco: "2.000 CVE" },
];

const N = CARDS.length;
const BASE_ANGLE = (2 * Math.PI) / N;
const ROTATION_SPEED = (2 * Math.PI) / 26; // uma volta completa a cada ~26s
const REFERENCE_WIDTH = 680;
const REFERENCE_HEIGHT = 560;
const PX_PER_UNIT = 120; // pixels por unidade do círculo x²+y²=4
const CARD_W = 280;
const CARD_H = CARD_W / (85.6 / 53.98);
const SCALE_MIN = 0.4;
const SCALE_MAX = 1.25;
const OPACITY_MIN = 0.18;
const OPACITY_MAX = 1;
const BLUR_MAX = 7;
const VISIBLE_CUTOFF = 0.28;

function normalizeAngle(angle: number) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

export default function CardRoulette({ onSelect }: CardRouletteProps) {
  const [t0, setT0] = useState(0);
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const t0Ref = useRef(0);
  const targetT0Ref = useRef<number | null>(null);

  useEffect(() => {
    t0Ref.current = t0;
  }, [t0]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      if (targetT0Ref.current !== null) {
        const remaining = targetT0Ref.current - t0Ref.current;
        if (Math.abs(remaining) < 0.002) {
          t0Ref.current = targetT0Ref.current;
          targetT0Ref.current = null;
        } else {
          t0Ref.current += remaining * Math.min(1, dt * 6);
        }
        setT0(t0Ref.current);
      } else if (!pausedRef.current) {
        t0Ref.current += ROTATION_SPEED * dt;
        setT0(t0Ref.current);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setStageScale(Math.min(1, width / REFERENCE_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    return CARDS.map((card, i) => {
      const angle = normalizeAngle(i * BASE_ANGLE + t0);
      const x = 2 * Math.cos(angle);
      const y = 2 * Math.sin(angle);
      const proximity = (1 + Math.cos(angle - Math.PI)) / 2; // 1 junto de (-2,0) · 0 junto de (2,0)

      const scale = SCALE_MIN + proximity * (SCALE_MAX - SCALE_MIN);
      const opacity =
        proximity < VISIBLE_CUTOFF ? 0 : OPACITY_MIN + proximity * (OPACITY_MAX - OPACITY_MIN);
      const blur = (1 - proximity) * BLUR_MAX;

      return {
        card,
        index: i,
        xPx: x * PX_PER_UNIT,
        yPx: -y * PX_PER_UNIT,
        scale,
        opacity,
        blur,
        zIndex: Math.round(proximity * 1000),
        proximity,
      };
    });
  }, [t0]);

  const focalIndex = useMemo(
    () => layout.reduce((best, item) => (item.proximity > layout[best].proximity ? item.index : best), 0),
    [layout]
  );

  function goToIndex(index: number) {
    const targetIndex = ((index % N) + N) % N;
    const desiredT0 = Math.PI - targetIndex * BASE_ANGLE;
    const delta =
      (((desiredT0 - t0Ref.current + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    targetT0Ref.current = t0Ref.current + delta;
  }

  function handleCardClick(index: number, card: RouletteCard) {
    if (index === focalIndex) {
      onSelect?.(card);
    } else {
      goToIndex(index);
    }
  }

  return (
    <div className="roulette-container" ref={containerRef}>
      <div
        className="roulette-stage"
        style={{
          width: REFERENCE_WIDTH,
          height: REFERENCE_HEIGHT,
          transform: `scale(${stageScale})`,
        }}
      >
        {layout.map(({ card, index, xPx, yPx, scale, opacity, blur, zIndex }) => {
          const isFocal = index === focalIndex;
          return (
            <button
              type="button"
              key={card.id}
              className={`roulette-card roulette-card--${card.tipo}${isFocal ? " is-focal" : ""}`}
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: `translate(-50%, -50%) translate(${xPx}px, ${yPx}px) scale(${scale})`,
                opacity,
                filter: `blur(${blur}px)`,
                zIndex,
                pointerEvents: opacity === 0 ? "none" : "auto",
              }}
              onClick={() => handleCardClick(index, card)}
              onMouseEnter={() => (pausedRef.current = true)}
              onMouseLeave={() => (pausedRef.current = false)}
              aria-label={`${TIPO_LABEL[card.tipo]} · ${card.plano} · ${card.preco}`}
              aria-current={isFocal}
              tabIndex={opacity === 0 ? -1 : 0}
            >
              <div className="roulette-card-top">
                <span className="roulette-card-brand">Virtual Resident</span>
                <span className="roulette-card-badge">{TIPO_LABEL[card.tipo]}</span>
              </div>
              <div className="roulette-card-body">
                <strong className="roulette-card-plan">{card.plano}</strong>
                <span className="roulette-card-price">{card.preco}</span>
              </div>
              <div className="roulette-card-footer">
                <span className="roulette-card-chip" aria-hidden="true" />
                <span className="roulette-card-country">Cabo Verde</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="roulette-arrows">
        <button
          type="button"
          className="roulette-arrow roulette-arrow--prev"
          onClick={() => goToIndex(focalIndex - 1)}
          aria-label="Cartão anterior"
        >
          
          ↑
        </button>
        <button
          type="button"
          className="roulette-arrow roulette-arrow--next"
          onClick={() => goToIndex(focalIndex + 1)}
          aria-label="Próximo cartão"
        >
          ↓
        </button>
      </div>

      <div className="roulette-dots">
        {CARDS.map((card, i) => (
          <button
            type="button"
            key={card.id}
            className={`roulette-dot${i === focalIndex ? " is-active" : ""}`}
            onClick={() => goToIndex(i)}
            aria-label={`Ir para ${card.plano}`}
          />
        ))}
      </div>
    </div>
  );
}
