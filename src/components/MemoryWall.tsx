import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { IMG } from "../data/family";
import { cn, scrollToId } from "../lib/utils";
import { Btn, Countdown, WaxSeal } from "./ui";

interface ScatterCard {
  id: string;
  img?: string;
  caption: string;
  note?: boolean;
  cls: string;
  rot: number;
  depth: number; // parallax strength
  w: string;
}

const CARDS: ScatterCard[] = [
  { id: "c1", img: IMG.wedding1948, caption: "City Hall steps — it rained, 1948", cls: "left-[2%] top-[4%]", rot: -5, depth: 14, w: "w-[46%]" },
  { id: "c2", img: IMG.bikes1968, caption: "The summer of bicycles, '68", cls: "right-[4%] top-[0%]", rot: 4, depth: 22, w: "w-[38%]" },
  { id: "c3", img: IMG.birthday1979, caption: "Sarah turns ten — the leaning cake", cls: "left-[8%] bottom-[6%]", rot: 3, depth: 26, w: "w-[40%]" },
  { id: "c4", note: true, caption: "Grandpa's watch, wound every Sunday", cls: "right-[30%] top-[38%]", rot: -3, depth: 34, w: "w-[26%]" },
  { id: "c5", img: IMG.reunion2019, caption: "Four generations, one backyard", cls: "right-[0%] bottom-[2%]", rot: -6, depth: 18, w: "w-[42%]" },
];

const MARQUEE = [
  "ML-0113 · A letter from Grandma Eleanor · unlocks soon",
  "1,284 photographs preserved",
  "63 voice stories transcribed",
  "Whisper sync · chapter 3 ready",
  "3-2-1 verification passed 26 min ago",
  "ML-1911 · Daniel's 18th birthday · sealed until 2032",
  "Guardian drill passed · 2 of 2",
  "Envelope keys rotated · zero downtime",
];

export function MemoryWall({ demoUnlockAt }: { demoUnlockAt: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  return (
    <section id="wall" className="relative overflow-hidden">
      <div className="dotted-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <p className="ghost-num pointer-events-none absolute -top-6 right-[-2%] hidden text-[26vw] select-none lg:block" aria-hidden>
        1942
      </p>

      <div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
          my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        className="shell relative grid gap-14 pt-16 pb-10 lg:grid-cols-12 lg:gap-8 lg:pt-24"
      >
        {/* dust */}
        <span className="dust left-[20%] top-[30%]" aria-hidden />
        <span className="dust left-[55%] top-[18%] [animation-delay:2s]" aria-hidden />
        <span className="dust left-[75%] top-[55%] [animation-delay:4s]" aria-hidden />
        <span className="dust left-[38%] top-[70%] [animation-delay:1.2s]" aria-hidden />

        {/* Copy */}
        <div className="relative z-10 lg:col-span-5 lg:pt-10">
          <div className="flex items-center gap-3">
            <span className="hairline w-12" />
            <p className="eyebrow">The Bennett family archive · est. 1942</p>
          </div>
          <h1 className="font-display mt-6 text-[44px] leading-[0.98] font-semibold tracking-tight text-cream sm:text-6xl xl:text-[68px]">
            Eighty-four years,
            <br />
            <em className="font-medium text-gold-400 italic">one sealed vault.</em>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-cream-dim">
            MemoryLane keeps this family's photographs, voices and letters in a cryptographically sealed
            archive — with milestone capsules that unlock themselves on a wedding morning, an eighteenth
            birthday, decades from now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn onClick={() => scrollToId("vault")}>
              Open the vault
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Btn>
            <Btn variant="ghost" onClick={() => scrollToId("stories")}>
              <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                <path d="M1.5 1.5l8 4.5-8 4.5v-9z" fill="currentColor" />
              </svg>
              Play Eleanor's story
            </Btn>
          </div>

          <div className="mt-12 grid max-w-md grid-cols-2 gap-x-6 gap-y-5 border-t border-moss-700/60 pt-6 sm:grid-cols-4">
            {[
              ["1,284", "photographs"],
              ["63", "voice stories"],
              ["3", "sealed capsules"],
              ["4", "generations"],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-3xl font-semibold text-cream">{n}</p>
                <p className="font-mono mt-1 text-[9px] tracking-[0.22em] text-cream-dim uppercase">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scattered postcards */}
        <div className="relative h-[520px] sm:h-[600px] lg:col-span-7">
          {CARDS.map((c, i) => (
            <ScatterItem key={c.id} card={c} index={i} sx={sx} sy={sy}>
              {c.note ? (
                <div className="card rotate-0 border-wax-500/40 bg-ink-800 p-4 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[9px] tracking-[0.24em] text-blush-300 uppercase">Sealed · ML-0113</p>
                    <div className="-mr-1 -mt-3">
                      <WaxSeal size={54} />
                    </div>
                  </div>
                  <p className="font-display mt-2 text-[15px] leading-snug font-medium text-cream">
                    A letter from Grandma Eleanor
                  </p>
                  <p className="font-hand mt-1 text-[15px] text-cream-dim">{c.caption}</p>
                  <div className="mt-3 border-t border-moss-700/60 pt-3">
                    <p className="font-mono mb-2 text-[9px] tracking-[0.22em] text-cream-dim uppercase">Unlocks in</p>
                    <Countdown to={demoUnlockAt} />
                  </div>
                </div>
              ) : (
                <figure className="postcard">
                  <span className="tape -top-2.5 left-1/2 -translate-x-1/2 -rotate-2" aria-hidden />
                  <div className="overflow-hidden">
                    <motion.img
                      src={c.img}
                      alt={c.caption}
                      className="w-full object-cover"
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 16 + i * 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <figcaption className="font-hand pt-2 pb-0.5 text-center text-[17px] text-[#4c3b20]">{c.caption}</figcaption>
                </figure>
              )}
            </ScatterItem>
          ))}
        </div>
      </div>

      {/* Marquee strip */}
      <div className="relative border-y border-moss-700/60 bg-ink-900/80 py-3">
        <div className="flex overflow-hidden">
          <div className="marquee-track flex shrink-0 items-center gap-10 pr-10 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-10">
                <span className="font-mono text-[11px] tracking-[0.18em] text-cream-dim uppercase">{m}</span>
                <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden>
                  <rect x="1" y="1" width="5" height="5" transform="rotate(45 3.5 3.5)" fill="#e7b95f" opacity="0.5" />
                </svg>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** One scattered card — reads the shared pointer springs with its own depth. */
function ScatterItem({
  card,
  index,
  sx,
  sy,
  children,
}: {
  card: ScatterCard;
  index: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  children: ReactNode;
}) {
  const px = useTransform(sx, (v) => v * card.depth);
  const py = useTransform(sy, (v) => v * card.depth * 0.6);
  return (
    <motion.div
      className={cn("absolute", card.cls, card.w)}
      style={{ zIndex: card.note ? 20 : 10 + index }}
      initial={{ opacity: 0, y: 40, rotate: card.rot - 4 }}
      animate={{ opacity: 1, y: 0, rotate: card.rot }}
      transition={{ delay: 0.25 + index * 0.14, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div style={{ x: px, y: py }}>
        <motion.div whileHover={{ scale: 1.04, rotate: card.rot / 2, zIndex: 40 }}>{children}</motion.div>
      </motion.div>
    </motion.div>
  );
}
