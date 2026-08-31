import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ACTIVITY, ALBUMS, MEMBERS, STORAGE, IMG, type ActivityItem } from "../data/family";
import { cn, countdownTo, scrollToId, useNow } from "../lib/utils";
import { Btn, Modal, PrivacyBadge, Reveal, SectionHead, toast } from "./ui";

const ACT_ICON: Record<ActivityItem["kind"], string> = {
  upload: "#8fb0ba",
  narration: "#e7b95f",
  system: "#a3bd8e",
  guardian: "#d68f77",
  capsule: "#9e3b33",
  transcript: "#b3cdd4",
};

export function Dashboard({ demoUnlockAt, demoSealedAt }: { demoUnlockAt: number; demoSealedAt: number }) {
  const [feed, setFeed] = useState<ActivityItem[]>(ACTIVITY);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const now = useNow(1000);

  // Living feed — rotates a pulse every few seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      setFeed((prev) => [prev[prev.length - 1], ...prev.slice(0, prev.length - 1)]);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const cd = countdownTo(demoUnlockAt, now);
  const elapsedPct = Math.min(100, Math.max(2, ((now - demoSealedAt) / (demoUnlockAt - demoSealedAt)) * 100));

  return (
    <section id="dashboard" className="relative py-24">
      <div className="shell">
        <SectionHead
          index="01"
          eyebrow="Memory dashboard"
          title={
            <>
              The family command centre, <em className="text-gold-400 italic">at a glance.</em>
            </>
          }
          lede="Every module of the estate — albums, storage health, narration pipeline, guardians and the next scheduled unlock — on one wall."
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6 lg:auto-rows-[118px]">
          {/* Vault health */}
          <Reveal className="col-span-2 lg:row-span-2">
            <div className="card flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Vault health</p>
                <span className="pulse-dot h-2 w-2 rounded-full bg-sage-400" />
              </div>
              <div className="flex flex-1 items-center gap-6">
                <HealthRing pct={96} />
                <div className="space-y-2.5">
                  {[
                    ["3", "copies of everything"],
                    ["2", "media types (SSD + cloud)"],
                    ["1", "offsite, with Aunt Rose"],
                  ].map(([n, l]) => (
                    <p key={l} className="flex items-baseline gap-2 text-sm text-cream-dim">
                      <span className="font-display text-xl font-semibold text-sage-300">{n}</span> {l}
                    </p>
                  ))}
                  <p className="font-mono pt-1 text-[10px] tracking-[0.18em] text-moss-300 uppercase">
                    Last verified 26 min ago
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Next unlock */}
          <Reveal delay={0.08} className="col-span-2">
            <div className="card h-full p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Next unlock</p>
                <span className="font-mono text-[10px] tracking-[0.16em] text-blush-300 uppercase">ML-0113</span>
              </div>
              <p className="font-display mt-2 truncate text-lg font-medium text-cream">A letter from Grandma Eleanor</p>
              <p className="font-mono tabular mt-1 text-[11px] text-cream-dim">
                {cd.past ? "T_unlock reached — awaiting PIN" : `T−${cd.days}d ${String(cd.hours).padStart(2, "0")}h ${String(cd.mins).padStart(2, "0")}m ${String(cd.secs).padStart(2, "0")}s`}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-700">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-wax-500 to-gold-400"
                  initial={{ width: "2%" }}
                  whileInView={{ width: `${elapsedPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </div>
          </Reveal>

          {/* This day */}
          <Reveal delay={0.14} className="col-span-2">
            <div className="paper-card relative h-full overflow-hidden rounded-lg p-5">
              <span className="tape -top-1.5 right-6 rotate-6 scale-75" aria-hidden />
              <p className="font-mono text-[10px] tracking-[0.24em] text-[#8a6c35] uppercase">This day · 1968</p>
              <div className="mt-2 flex items-center gap-3">
                <img src={IMG.bikes1968} alt="Kids on bicycles, 1968" className="h-16 w-20 rounded-sm object-cover shadow-md" />
                <div>
                  <p className="font-hand text-xl leading-tight text-[#4c3b20]">
                    Sarah, Tom &amp; Ada — gone from breakfast till the streetlights.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Albums */}
          <Reveal delay={0.1} className="col-span-2 lg:row-span-2">
            <div className="card flex h-full flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Albums</p>
                <span className="font-mono text-[10px] text-cream-dim">{ALBUMS.length} collections</span>
              </div>
              <div className="flex flex-1 flex-col gap-2.5">
                {ALBUMS.map((a, i) => (
                  <motion.button
                    key={a.id}
                    type="button"
                    onClick={() => scrollToId("timeline")}
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    whileHover={{ x: 4 }}
                    className="group flex items-center gap-3 rounded-md border border-moss-700/50 bg-ink-900/60 p-2 text-left transition-colors hover:border-gold-500/40 cursor-pointer"
                  >
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded-sm">
                      <img
                        src={a.cover}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-2"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-cream">{a.title}</p>
                      <p className="font-mono text-[10px] text-cream-dim">
                        {a.count} items · {a.years}
                      </p>
                    </div>
                    <PrivacyBadge tier={a.privacy} />
                  </motion.button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Storage */}
          <Reveal delay={0.16} className="col-span-2">
            <div className="card h-full p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Storage</p>
                <span className="font-mono tabular text-[11px] text-cream-dim">
                  {STORAGE.usedTb.toFixed(2)} / {STORAGE.totalTb} TB
                </span>
              </div>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-ink-700">
                {STORAGE.segments.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                    style={{ background: s.color }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {STORAGE.segments.map((s) => (
                  <p key={s.label} className="flex items-center gap-1.5 font-mono text-[10px] text-cream-dim">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    {s.label} · {s.pct}%
                  </p>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Family tree */}
          <Reveal delay={0.12} className="col-span-2 lg:row-span-2">
            <div className="card h-full p-5">
              <p className="eyebrow mb-4">Family tree · 4 generations</p>
              <div className="relative space-y-4 pl-5">
                <span className="absolute top-2 bottom-2 left-[5px] w-px bg-moss-700" aria-hidden />
                {[1, 2, 3, 4].map((gen) => (
                  <div key={gen} className="relative">
                    <span className="absolute top-2 -left-[17px] h-2.5 w-2.5 rounded-full border-2 border-gold-500 bg-ink-900" aria-hidden />
                    <p className="font-mono text-[9px] tracking-[0.24em] text-moss-300 uppercase">Generation {gen}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {MEMBERS.filter((m) => m.gen === gen).map((m) => (
                        <span
                          key={m.id}
                          title={m.role}
                          className="rounded-full border border-moss-600/70 bg-ink-800 px-2.5 py-1 text-[11px] text-cream transition-colors hover:border-gold-500/50 hover:text-gold-300"
                        >
                          {m.name.split(" ")[0]}
                          <span className="ml-1 font-mono text-[9px] text-cream-dim">{m.years.replace("b. ", "’")}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="font-mono mt-4 border-t border-moss-700/60 pt-3 text-[10px] tracking-[0.16em] text-cream-dim uppercase">
                James Bennett · narrator in absentia, 1936–2019
              </p>
            </div>
          </Reveal>

          {/* Activity */}
          <Reveal delay={0.18} className="col-span-2 lg:row-span-2">
            <div className="card flex h-full flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Activity</p>
                <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] text-sage-300 uppercase">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sage-400" /> live
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                  {feed.slice(0, 5).map((a) => (
                    <motion.div
                      key={a.id}
                      layout
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="flex items-start gap-2.5 rounded-md border border-moss-700/40 bg-ink-900/50 px-3 py-2"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ACT_ICON[a.kind] }} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-cream">{a.text}</p>
                        <p className="font-mono text-[9px] tracking-[0.14em] text-cream-dim uppercase">{a.when}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          {/* Quick actions */}
          <Reveal delay={0.2} className="col-span-2">
            <div className="card h-full p-5">
              <p className="eyebrow mb-3">Quick actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="ghost" className="px-3 py-2 text-[12px]" onClick={() => setRecorderOpen(true)}>
                  <MicGlyph /> Record note
                </Btn>
                <Btn variant="ghost" className="px-3 py-2 text-[12px]" onClick={() => scrollToId("vault")}>
                  <SealGlyph /> Seal capsule
                </Btn>
                <Btn variant="ghost" className="px-3 py-2 text-[12px]" onClick={() => scrollToId("archive")}>
                  <BoxGlyph /> Export ZIP
                </Btn>
                <Btn variant="ghost" className="px-3 py-2 text-[12px]" onClick={() => toast("Invite drafted for rose@okafor.family — pending owner signature", "ok")}>
                  <MailGlyph /> Invite
                </Btn>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <Modal open={recorderOpen} onClose={() => setRecorderOpen(false)}>
        <VoiceRecorder
          onClose={() => setRecorderOpen(false)}
          onSaved={(secs) => {
            setFeed((prev) => [
              { id: `rec-${Date.now()}`, kind: "narration", text: `You recorded a voice note (0:${String(secs).padStart(2, "0")}) — Whisper queued`, when: "just now" },
              ...prev,
            ]);
            toast("Voice note archived to “Sarah's Scrapbook” · transcription queued", "ok");
          }}
        />
      </Modal>
    </section>
  );
}

/* ── Health ring ──────────────────────────────────────────────────────────── */

function HealthRing({ pct }: { pct: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#1e3125" strokeWidth="9" />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#healthGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - pct / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a3bd8e" />
            <stop offset="100%" stopColor="#e7b95f" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold text-cream">{pct}%</span>
        <span className="font-mono text-[8px] tracking-[0.22em] text-cream-dim uppercase">integrity</span>
      </div>
    </div>
  );
}

/* ── Voice recorder (real MediaRecorder + analyser meter) ─────────────────── */

function VoiceRecorder({ onClose, onSaved }: { onClose: () => void; onSaved: (secs: number) => void }) {
  const [phase, setPhase] = useState<"idle" | "rec" | "transcribing" | "done">("idle");
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState<number[]>([4, 4, 4, 4, 4]);
  const [url, setUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevels((prev) => [...prev.slice(1), Math.min(40, 4 + rms * 160)]);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        cancelAnimationFrame(rafRef.current);
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        setUrl(URL.createObjectURL(new Blob(chunks, { type: "audio/webm" })));
        setPhase("transcribing");
        window.setTimeout(() => setPhase("done"), 1600);
      };
      recRef.current = rec;
      rec.start();
      setSecs(0);
      setPhase("rec");
      timerRef.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      toast("Microphone unavailable — check browser permissions", "err");
    }
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="eyebrow">Voice narrative engine</p>
        <span className="font-mono text-[10px] text-cream-dim">Whisper-1 · en</span>
      </div>
      <h3 className="font-display mt-3 text-2xl font-semibold text-cream">Record a story for the archive</h3>
      <p className="mt-2 text-sm leading-relaxed text-cream-dim">
        Spoken memories are transcribed automatically, timestamped, and attachable to any photograph in the estate.
      </p>

      <div className="mt-6 rounded-md border border-moss-700/60 bg-ink-900/70 p-5">
        <div className="flex h-12 items-end justify-center gap-1.5">
          {levels.map((l, i) => (
            <motion.span
              key={i}
              className={cn("w-2 rounded-full", phase === "rec" ? "bg-wax-400" : "bg-moss-600")}
              animate={{ height: phase === "rec" ? l : 4 }}
              transition={{ duration: 0.12 }}
            />
          ))}
        </div>
        <p className="font-mono tabular mt-3 text-center text-2xl text-cream">
          {String(Math.floor(secs / 60))}:{String(secs % 60).padStart(2, "0")}
        </p>

        <div className="mt-4 flex justify-center gap-3">
          {phase === "idle" && <Btn variant="wax" onClick={() => void start()}><MicGlyph /> Start recording</Btn>}
          {phase === "rec" && <Btn variant="ghost" onClick={stop}>Stop &amp; transcribe</Btn>}
          {phase === "transcribing" && (
            <span className="font-mono flex items-center gap-2 text-[11px] tracking-[0.18em] text-gold-300 uppercase">
              <motion.span className="inline-block h-2 w-2 rounded-full bg-gold-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
              Whisper transcribing…
            </span>
          )}
          {phase === "done" && (
            <>
              <Btn onClick={() => { onSaved(secs); onClose(); }}>Save to archive</Btn>
              <Btn variant="ghost" onClick={() => { setPhase("idle"); setUrl(null); setSecs(0); setLevels([4, 4, 4, 4, 4]); }}>
                Discard
              </Btn>
            </>
          )}
        </div>

        {phase === "done" && url ? (
          <div className="mt-5 border-t border-moss-700/60 pt-4">
            <audio src={url} controls className="w-full" />
            <p className="font-mono mt-3 text-[10px] tracking-[0.18em] text-cream-dim uppercase">Auto-transcript (demo)</p>
            <p className="mt-1 text-sm text-cream italic">
              “…and the shop bell still rings true. I went back last Sunday and it sounded exactly like 1962.”
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Glyphs ───────────────────────────────────────────────────────────────── */

function MicGlyph() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <rect x="3.2" y="0.8" width="5.6" height="8" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 6.5a5 5 0 0 0 10 0M6 11.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SealGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
    </svg>
  );
}
function BoxGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.2 4L6.5 1l5.3 3v5L6.5 12 1.2 9V4zM1.2 4l5.3 3 5.3-3M6.5 7v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function MailGlyph() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
      <rect x="1" y="1" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 2l5 4.5L11.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

