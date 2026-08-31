import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMG, MEMOIR, STORY_PAGES } from "../data/family";
import { cn, formatDuration } from "../lib/utils";
import { Btn, Reveal, SectionHead, WaxSeal, toast } from "./ui";

/* ── Ambient pad engine (synthesised narration bed, real WebAudio) ────────── */

class PadEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): void {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 720;
    lp.connect(master);
    master.connect(ctx.destination);

    const voices: Array<[OscillatorType, number, number]> = [
      ["sine", 196, 0.5],
      ["sine", 294.3, 0.28],
      ["triangle", 98.2, 0.3],
    ];
    for (const [type, freq, vol] of voices) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      g.gain.value = vol;
      osc.connect(g);
      g.connect(lp);
      osc.start();
    }

    // gentle tape hiss
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3600;
    bp.Q.value = 0.4;
    const ng = ctx.createGain();
    ng.gain.value = 0.014;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start();

    // slow breathing on the master
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    this.ctx = ctx;
    this.master = master;
  }

  async play(): Promise<void> {
    this.ensure();
    if (!this.ctx || !this.master) return;
    await this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.11, this.ctx.currentTime, 0.4);
  }

  pause(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
  }

  dispose(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }
}

/* ── Ken Burns presets ─────────────────────────────────────────────────────── */

const KB = {
  zoomIn: { from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.18, x: -14, y: -10 } },
  zoomOut: { from: { scale: 1.2, x: 10, y: 6 }, to: { scale: 1.05, x: 0, y: 0 } },
  panRight: { from: { scale: 1.14, x: -26, y: 0 }, to: { scale: 1.14, x: 26, y: -6 } },
} as const;

/* ── Component ─────────────────────────────────────────────────────────────── */

export function Storybook({
  archiveSelected,
  onToggleArchive,
}: {
  archiveSelected: boolean;
  onToggleArchive: (id: string, on: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const pad = useRef<PadEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pageDurs = useMemo(() => STORY_PAGES.map((p) => p.segments.reduce((a, s) => a + s.d, 0)), []);
  const totalDur = useMemo(() => pageDurs.reduce((a, b) => a + b, 0), [pageDurs]);
  const pageDur = pageDurs[pageIdx] / speed;
  const page = STORY_PAGES[pageIdx];

  const segBounds = useMemo(() => {
    let acc = 0;
    return page.segments.map((s) => {
      const start = acc;
      acc += s.d / speed;
      return { start, end: acc };
    });
  }, [page, speed]);

  const activeSeg = segBounds.findIndex((b) => t >= b.start && t < b.end);
  const overall = useMemo(() => {
    const before = pageDurs.slice(0, pageIdx).reduce((a, b) => a + b, 0);
    return Math.min(1, (before + t * speed) / totalDur);
  }, [pageDurs, pageIdx, t, speed, totalDur]);

  useEffect(() => () => pad.current?.dispose(), []);

  // Drive the clock
  useAnimationFrame((_, delta) => {
    if (!playing) return;
    const next = t + delta / 1000;
    if (next >= pageDur) {
      if (pageIdx >= STORY_PAGES.length - 1) {
        setPlaying(false);
        setEnded(true);
        setT(pageDur);
        pad.current?.pause();
      } else {
        setPageIdx((p) => p + 1);
        setT(0);
      }
    } else {
      setT(next);
    }
  });

  // Auto-scroll transcript to the active line
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-seg="${activeSeg}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSeg]);

  const togglePlay = async () => {
    if (ended) {
      setEnded(false);
      setPageIdx(0);
      setT(0);
    }
    if (playing) {
      setPlaying(false);
      pad.current?.pause();
    } else {
      if (!pad.current) pad.current = new PadEngine();
      await pad.current.play();
      setPlaying(true);
    }
  };

  const jumpTo = (idx: number) => {
    setPageIdx(idx);
    setT(0);
    setEnded(false);
  };

  const seekSeg = (i: number) => setT(segBounds[i].start + 0.01);

  const kb = KB[page.kb];

  return (
    <section id="stories" className="relative py-24">
      <p className="ghost-num pointer-events-none absolute top-10 -left-8 hidden text-[20vw] lg:block" aria-hidden>
        1911
      </p>
      <div className="shell relative">
        <SectionHead
          index="02"
          eyebrow="Audio / visual memoirs"
          title={
            <>
              “{MEMOIR.title}” —<em className="text-gold-400 italic"> told by {MEMOIR.narrator}.</em>
            </>
          }
          lede={`${MEMOIR.recorded}. Whisper transcription, audio-timestamp synced to each photograph, with a slow Ken Burns drift the narrator approved of.`}
        />

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Viewer */}
          <Reveal className="lg:col-span-7">
            <div className="card overflow-hidden border-moss-600/60">
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={page.id}
                    className="absolute inset-0"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -14 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 10 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{ perspective: 900 }}
                  >
                    <motion.img
                      key={`${page.id}-${speed}`}
                      src={page.img}
                      alt={page.place}
                      className="h-full w-full object-cover"
                      initial={kb.from}
                      animate={playing || t > 0 ? kb.to : kb.from}
                      transition={{ duration: pageDur, ease: "linear" }}
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/30" />

                <p className="font-hand absolute bottom-4 left-5 text-2xl text-paper-50 drop-shadow-md">{page.place}</p>
                <span className="font-mono absolute right-5 bottom-4 rounded-full border border-paper-50/25 bg-ink-950/50 px-3 py-1 text-[10px] tracking-[0.2em] text-paper-100 uppercase">
                  Chapter {pageIdx + 1} / {STORY_PAGES.length}
                </span>

                {/* Play overlay */}
                {!playing ? (
                  <button
                    type="button"
                    onClick={() => void togglePlay()}
                    className="group absolute inset-0 flex items-center justify-center cursor-pointer"
                    aria-label="Play narration"
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold-400/60 bg-ink-950/60 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-400 group-hover:text-ink-950">
                      <svg width="26" height="28" viewBox="0 0 22 24" fill="none" className="translate-x-0.5 text-gold-400 transition-colors group-hover:text-ink-950">
                        <path d="M2 1.5l18 10.5L2 22.5v-21z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                ) : null}

                {/* End overlay */}
                <AnimatePresence>
                  {ended ? (
                    <motion.div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink-950/85 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <WaxSeal size={76} />
                      <p className="font-display text-2xl font-medium text-paper-50 italic">…they were the whole thing.</p>
                      <div className="flex gap-3">
                        <Btn variant="paper" onClick={() => void togglePlay()}>Replay story</Btn>
                        <Btn
                          variant={archiveSelected ? "wax" : "paper"}
                          onClick={() => {
                            onToggleArchive("memoir", !archiveSelected);
                            toast(
                              archiveSelected ? "Memoir removed from the archive bench" : "Memoir added to the archive bench",
                              "ok",
                            );
                          }}
                        >
                          {archiveSelected ? "In archive ✓" : "Save to archive"}
                        </Btn>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Transport */}
              <div className="flex items-center gap-4 border-t border-moss-700/60 bg-ink-900/70 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950 transition-transform hover:scale-105 cursor-pointer"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                      <rect x="1" y="1" width="3.4" height="11" rx="1" fill="currentColor" />
                      <rect x="6.6" y="1" width="3.4" height="11" rx="1" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" className="translate-x-[1px]">
                      <path d="M1 1l9 5.5L1 12V1z" fill="currentColor" />
                    </svg>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div className="h-full rounded-full bg-gold-400" style={{ width: `${overall * 100}%` }} />
                  </div>
                  <div className="font-mono tabular mt-1.5 flex justify-between text-[10px] text-cream-dim">
                    <span>{formatDuration(Math.min(totalDur, Math.round(overall * totalDur)))}</span>
                    <span className="flex items-center gap-1.5">
                      {playing ? (
                        <span className="flex items-end gap-[3px]" aria-hidden>
                          {[0, 1, 2, 3].map((i) => (
                            <motion.span
                              key={i}
                              className="w-[3px] rounded-full bg-sage-400"
                              animate={{ height: [4, 12, 5, 10, 4] }}
                              transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.14 }}
                            />
                          ))}
                        </span>
                      ) : null}
                      ambience pad · narration-synced
                    </span>
                    <span>{formatDuration(totalDur)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 overflow-hidden rounded-md border border-moss-700">
                  {([1, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={cn(
                        "font-mono px-2.5 py-1.5 text-[10px] transition-colors cursor-pointer",
                        speed === s ? "bg-gold-400 font-semibold text-ink-950" : "text-cream-dim hover:text-cream",
                      )}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chapter rail */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STORY_PAGES.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={cn(
                    "group relative overflow-hidden rounded-md border text-left transition-all duration-200 cursor-pointer",
                    i === pageIdx ? "border-gold-500/70 shadow-[0_8px_24px_-12px_rgba(231,185,95,0.5)]" : "border-moss-700/60 hover:border-moss-500",
                  )}
                >
                  <img src={p.img} alt="" className="h-16 w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
                  <span className="font-mono absolute bottom-0 left-0 w-full bg-ink-950/80 px-2 py-1 text-[9px] tracking-[0.14em] text-cream-dim uppercase">
                    Ch {i + 1} · {p.place}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          {/* Transcript */}
          <Reveal delay={0.12} className="lg:col-span-5">
            <div className="card flex h-full min-h-[420px] flex-col border-moss-600/60">
              <div className="flex items-center justify-between border-b border-moss-700/60 px-5 py-4">
                <div>
                  <p className="eyebrow">Whisper transcript</p>
                  <p className="font-mono mt-1 text-[10px] text-cream-dim">en · confidence 0.97 · 214 words</p>
                </div>
                <img src={IMG.heirloom} alt="" className="h-9 w-9 rounded-full border border-moss-600 object-cover" />
              </div>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-4">
                {page.segments.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    data-seg={i}
                    onClick={() => seekSeg(i)}
                    className={cn(
                      "block w-full rounded-md border-l-2 px-3 py-2 text-left text-[14px] leading-relaxed transition-all duration-300 cursor-pointer",
                      i === activeSeg
                        ? "border-gold-400 bg-gold-400/8 text-cream"
                        : i < activeSeg || (ended && i <= activeSeg)
                          ? "border-moss-700 text-cream-dim/60"
                          : "border-transparent text-cream-dim hover:border-moss-500 hover:text-cream",
                    )}
                  >
                    {s.text}
                  </button>
                ))}
                <p className="font-mono pt-3 text-[9px] tracking-[0.2em] text-moss-300 uppercase">
                  Tap a line to seek · synced to audio timestamps
                </p>
              </div>
              <div className="border-t border-moss-700/60 px-5 py-3">
                <p className="font-hand text-lg text-cream-dim">
                  “Keep the small hours.” — pinned above the archive desk
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
