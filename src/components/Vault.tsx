import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ACCESS_MATRIX,
  CAPSULE_PRESETS,
  DEMO_PIN,
  GUARDIANS,
  IMG,
  INACTIVITY_LADDER,
  MATRIX_COLS,
  type MatrixMark,
} from "../data/family";
import {
  fingerprint as makeFingerprint,
  makeCode,
  openSecret,
  sealSecret,
  type SealedCapsuleMeta,
} from "../lib/timelock";
import { cn, countdownTo, formatDate, useExpiry, useNow } from "../lib/utils";
import { Btn, Countdown, Modal, Reveal, SectionHead, WaxSeal, toast } from "./ui";

const LS_KEY = "ml.usercapsules.v1";

function loadUserCapsules(): SealedCapsuleMeta[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SealedCapsuleMeta[]) : [];
  } catch {
    return [];
  }
}

export function Vault({ demoMeta, onDemoOpened }: { demoMeta: SealedCapsuleMeta | null; onDemoOpened: () => void }) {
  const [userCapsules, setUserCapsules] = useState<SealedCapsuleMeta[]>(() => loadUserCapsules());
  const [pinTarget, setPinTarget] = useState<SealedCapsuleMeta | null>(null);
  const [letter, setLetter] = useState<{ title: string; recipient: string; text: string; photos: string[]; demo?: boolean } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(userCapsules));
  }, [userCapsules]);

  useExpiry(demoMeta && !demoMeta.opened ? demoMeta.unlockAt : undefined, () =>
    toast("Capsule ML-0113 has reached T_unlock — the seal is ready to break", "warn"),
  );

  const handleOpened = (capsule: SealedCapsuleMeta, text: string) => {
    if (capsule.demo) onDemoOpened();
    else setUserCapsules((prev) => prev.map((c) => (c.id === capsule.id ? { ...c, opened: true } : c)));
    setPinTarget(null);
    setLetter({ title: capsule.title, recipient: capsule.recipient, text, photos: capsule.photos, demo: capsule.demo });
  };

  return (
    <section id="vault" className="relative py-24">
      <p className="ghost-num pointer-events-none absolute top-16 -right-6 hidden text-[20vw] lg:block" aria-hidden>
        2032
      </p>
      <div className="shell relative">
        <SectionHead
          index="04"
          eyebrow="Milestone vaults · time-lock engine"
          title={
            <>
              Sealed now. <em className="text-gold-400 italic">Unstoppable later.</em>
            </>
          }
          lede="Each capsule is AES-256-GCM sealed under a PIN-derived key and scheduled for automatic release at T_unlock. The platform holds ciphertext — never the memory itself."
          action={
            <Btn variant="wax" onClick={() => setWizardOpen(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Seal a new capsule
            </Btn>
          }
        />

        {/* Capsule grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CAPSULE_PRESETS.map((c, i) => (
            <PresetCapsuleCard key={c.code} preset={c} index={i} onOverride={() =>
              toast(`Early access to ${c.code} requires 2-of-2 guardian approval — request dispatched to Rose & David`, "warn")
            } />
          ))}
          <DemoCapsuleCard meta={demoMeta} onOpen={() => demoMeta && setPinTarget(demoMeta)} />
          {userCapsules.map((c) => (
            <UserCapsuleCard
              key={c.id}
              meta={c}
              onOpen={() => setPinTarget(c)}
              onDelete={() => {
                setUserCapsules((prev) => prev.filter((x) => x.id !== c.id));
                toast(`Capsule ${c.code} revoked and shredded (log entry written)`, "ok");
              }}
            />
          ))}
        </div>

        {/* Access matrix + ZK strip */}
        <div className="mt-16 grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="card p-6">
              <p className="eyebrow">Access control matrix</p>
              <p className="mt-1 text-sm text-cream-dim">Granular roles, enforced at the API and the key boundary.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-3 text-left font-mono text-[9px] font-medium tracking-[0.2em] text-cream-dim uppercase">Role</th>
                      {MATRIX_COLS.map((c) => (
                        <th key={c} className="px-2 pb-3 text-center font-mono text-[9px] font-medium tracking-[0.14em] text-cream-dim uppercase">
                          {c.replace(" ", "\u00A0")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ACCESS_MATRIX.map((row) => (
                      <tr key={row.role} className="group border-t border-moss-700/50 transition-colors hover:bg-ink-800/60">
                        <td className="py-3 pr-2">
                          <p className="text-[13px] font-semibold text-cream">{row.role}</p>
                          <p className="font-mono text-[9px] text-cream-dim">{row.note}</p>
                        </td>
                        {row.marks.map((m, i) => (
                          <td key={i} className="px-2 py-3 text-center">
                            <MarkIcon mark={m} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-5 border-t border-moss-700/50 pt-4">
                <Legend dot="bg-gold-400" label="Full" />
                <Legend dot="bg-sage-400" label="Limited / scoped" />
                <Legend dot="bg-blush-500" label="Denied" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <div className="card flex h-full flex-col p-6">
              <p className="eyebrow">Zero-knowledge sealing</p>
              <div className="mt-4 space-y-4">
                {[
                  { n: "01", t: "Key born client-side", d: "PBKDF2-SHA256 (150k iterations) derives an AES-256 key from the family PIN. It never leaves the device." },
                  { n: "02", t: "AES-256-GCM envelope", d: "Letters and voice notes are encrypted in the browser with authenticated encryption — tampering is detectable." },
                  { n: "03", t: "We store only noise", d: "The vault keeps ciphertext + KDF params + a SHA-256 fingerprint. Even a full breach yields nothing readable." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4 rounded-md border border-moss-700/50 bg-ink-900/50 p-4 transition-colors hover:border-gold-500/40">
                    <span className="font-display text-xl font-semibold text-gold-400/80 italic">{s.n}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-cream">{s.t}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-cream-dim">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="font-mono mt-auto border-t border-moss-700/50 pt-4 text-[9px] leading-relaxed tracking-[0.16em] text-moss-300 uppercase">
                Server path: KMS envelope keys · EventBridge at T_unlock
                <br />
                ZK path: client holds the only key that ever existed
              </p>
            </div>
          </Reveal>
        </div>

        {/* Guardians */}
        <GuardianBlock />
      </div>

      <PinModal
        capsule={pinTarget}
        onClose={() => setPinTarget(null)}
        onSuccess={(text) => pinTarget && handleOpened(pinTarget, text)}
      />

      <Modal open={letter !== null} onClose={() => setLetter(null)} wide>
        {letter ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Decrypted · AES-256-GCM verified</p>
              <span className="font-mono text-[10px] text-cream-dim">for {letter.recipient}</span>
            </div>
            <div className="paper-card relative rounded-lg p-7 sm:p-9">
              <span className="tape -top-2 left-10 -rotate-3" aria-hidden />
              <span className="tape -top-2 right-10 rotate-6" aria-hidden />
              <h3 className="font-display text-2xl font-semibold text-[#33291a] sm:text-3xl">{letter.title}</h3>
              <p className="font-hand mt-1 text-xl text-[#7a5c2a]">opened {formatDate(Date.now())} · seal intact since sealing</p>
              <p className="mt-5 text-[15px] leading-[1.8] whitespace-pre-line text-[#3d3120]">{letter.text}</p>
              {letter.photos.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {letter.photos.map((p) => (
                    <img key={p} src={p} alt="" className="h-24 w-28 rounded-sm border border-[#c2ab77] object-cover shadow-md" />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Btn
                onClick={() => {
                  const blob = new Blob([`${letter.title}\nfor ${letter.recipient}\n\n${letter.text}`], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${letter.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Download .txt
              </Btn>
              <Btn variant="ghost" onClick={() => setLetter(null)}>Return to the vault</Btn>
              {letter.demo ? (
                <span className="font-mono self-center text-[10px] tracking-[0.16em] text-cream-dim uppercase">
                  Demo PIN was {DEMO_PIN} — Grandmother's birth year class
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <SealWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSealed={(meta) => {
          setUserCapsules((prev) => [meta, ...prev]);
          setWizardOpen(false);
          toast(`Capsule ${meta.code} sealed — unlock job scheduled for ${formatDate(meta.unlockAt, true)}`, "ok");
        }}
      />
    </section>
  );
}

/* ── Capsule cards ─────────────────────────────────────────────────────────── */

function PresetCapsuleCard({ preset, index, onOverride }: { preset: (typeof CAPSULE_PRESETS)[number]; index: number; onOverride: () => void }) {
  return (
    <Reveal delay={index * 0.08}>
      <div className="card group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-moss-500">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-cream-dim uppercase">{preset.code} · sealed</p>
            <h3 className="font-display mt-1.5 text-xl leading-tight font-semibold text-cream">{preset.title}</h3>
            <p className="mt-1 text-[12px] text-cream-dim">
              for <span className="text-gold-300">{preset.recipient}</span> · {preset.milestone}
            </p>
          </div>
          <WaxSeal size={64} />
        </div>
        <div className="my-5">
          <Countdown to={preset.unlockAt} />
        </div>
        <ul className="space-y-1.5">
          {preset.items.map((it) => (
            <li key={it} className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-cream-dim uppercase">
              <span className="h-1 w-1 rounded-full bg-moss-400" /> {it}
            </li>
          ))}
        </ul>
        <div className="font-mono mt-4 border-t border-moss-700/50 pt-3 text-[9px] tracking-[0.14em] text-moss-300 uppercase">
          {preset.zk ? "Zero-knowledge · client key" : "KMS envelope · scheduled release"} · T_unlock {formatDate(preset.unlockAt, true)}
        </div>
        <Btn variant="ghost" className="mt-4 w-full py-2 text-[12px]" onClick={onOverride}>
          Request early access
        </Btn>
      </div>
    </Reveal>
  );
}

function DemoCapsuleCard({ meta, onOpen }: { meta: SealedCapsuleMeta | null; onOpen: () => void }) {
  const now = useNow(1000);
  if (!meta) {
    return (
      <div className="card flex h-full min-h-[300px] items-center justify-center p-6">
        <motion.span
          className="font-mono text-[11px] tracking-[0.2em] text-cream-dim uppercase"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          Deriving demo key…
        </motion.span>
      </div>
    );
  }
  const due = now >= meta.unlockAt;
  const pct = Math.min(100, ((now - meta.sealedAt) / (meta.unlockAt - meta.sealedAt)) * 100);
  return (
    <Reveal delay={0.12}>
      <div className={cn("card relative flex h-full flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1", due ? "border-gold-500/70 shadow-[0_20px_60px_-24px_rgba(231,185,95,0.35)]" : "border-wax-500/40")}>
        <span className="font-mono absolute top-4 right-4 rounded-full border border-gold-500/50 bg-gold-400/10 px-2.5 py-0.5 text-[9px] tracking-[0.18em] text-gold-300 uppercase">
          live demo
        </span>
        <div className="flex items-start justify-between pr-20">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-cream-dim uppercase">{meta.code} · {due && !meta.opened ? "seal ready" : meta.opened ? "opened" : "sealed"}</p>
            <h3 className="font-display mt-1.5 text-xl leading-tight font-semibold text-cream">{meta.title}</h3>
            <p className="mt-1 text-[12px] text-cream-dim">
              for <span className="text-gold-300">{meta.recipient}</span>
            </p>
          </div>
        </div>
        <div className="absolute top-14 right-5">
          <WaxSeal size={64} cracked={due || meta.opened} />
        </div>
        <div className="my-5">
          {meta.opened ? (
            <p className="font-mono text-center text-[11px] tracking-[0.2em] text-sage-300 uppercase">Decrypted · GCM auth tag verified</p>
          ) : due ? (
            <p className="font-mono text-center text-[11px] tracking-[0.2em] text-gold-300 uppercase">T_unlock reached — enter PIN</p>
          ) : (
            <Countdown to={meta.unlockAt} />
          )}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-gradient-to-r from-wax-500 via-gold-500 to-sage-400 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <div className="font-mono mt-3 text-[9px] break-all tracking-[0.1em] text-moss-300 uppercase">
          sha256 {meta.fingerprint.slice(0, 22)}…
        </div>
        <Btn variant={due || meta.opened ? "gold" : "ghost"} className="mt-4 w-full py-2 text-[12px]" onClick={onOpen}>
          {meta.opened ? "Read again" : due ? "Break the seal — enter PIN" : "Owner override (PIN)"}
        </Btn>
        <p className="font-mono mt-2 text-center text-[9px] tracking-[0.18em] text-cream-dim uppercase">demo PIN {DEMO_PIN} · real AES-256-GCM in your browser</p>
      </div>
    </Reveal>
  );
}

function UserCapsuleCard({ meta, onOpen, onDelete }: { meta: SealedCapsuleMeta; onOpen: () => void; onDelete: () => void }) {
  const now = useNow(1000);
  const due = now >= meta.unlockAt;
  const cd = countdownTo(meta.unlockAt, now);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="card flex h-full flex-col p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-cream-dim uppercase">{meta.code} · yours</p>
          <h3 className="font-display mt-1.5 text-xl leading-tight font-semibold text-cream">{meta.title}</h3>
          <p className="mt-1 text-[12px] text-cream-dim">
            for <span className="text-gold-300">{meta.recipient}</span> · {meta.milestone}
          </p>
        </div>
        <WaxSeal size={64} cracked={meta.opened} />
      </div>
      <div className="my-5">
        {meta.opened ? (
          <p className="font-mono text-center text-[11px] tracking-[0.2em] text-sage-300 uppercase">Opened by owner</p>
        ) : due ? (
          <p className="font-mono text-center text-[11px] tracking-[0.2em] text-gold-300 uppercase">T_unlock reached</p>
        ) : (
          <p className="font-mono tabular text-center text-lg text-cream">
            {cd.days}d {String(cd.hours).padStart(2, "0")}h {String(cd.mins).padStart(2, "0")}m
          </p>
        )}
      </div>
      <div className="font-mono text-[9px] break-all tracking-[0.1em] text-moss-300 uppercase">
        sha256 {meta.fingerprint.slice(0, 22)}…
        <br />
        unlocks {formatDate(meta.unlockAt, true)} · {meta.photos.length} photo(s) attached
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <Btn variant={due || meta.opened ? "gold" : "ghost"} className="flex-1 py-2 text-[12px]" onClick={onOpen}>
          {meta.opened ? "Read" : "Unlock (PIN)"}
        </Btn>
        <Btn variant="ghost" className="px-3 py-2 text-[12px] text-blush-300 hover:border-wax-500" onClick={onDelete}>
          Revoke
        </Btn>
      </div>
    </motion.div>
  );
}

/* ── PIN modal ─────────────────────────────────────────────────────────────── */

function PinModal({ capsule, onClose, onSuccess }: { capsule: SealedCapsuleMeta | null; onClose: () => void; onSuccess: (text: string) => void }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(0);
  const [shake, setShake] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setDigits(["", "", "", ""]);
    setBusy(false);
    setFail(0);
  }, [capsule]);

  const submit = async (pin: string) => {
    if (!capsule || pin.length !== 4 || busy) return;
    setBusy(true);
    try {
      const text = await openSecret(capsule.payload, pin);
      onSuccess(text);
    } catch {
      setFail((f) => f + 1);
      setShake((s) => s + 1);
      setDigits(["", "", "", ""]);
      refs.current[0]?.focus();
      toast(fail >= 2 ? "3 failed attempts — guardian escalation path armed" : "PIN incorrect — attempt logged to the release ledger", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={capsule !== null} onClose={onClose}>
      {capsule ? (
        <div className="text-center">
          <div className="mx-auto w-fit"><WaxSeal size={70} cracked /></div>
          <p className="eyebrow mt-4">Break the seal</p>
          <h3 className="font-display mt-2 text-2xl font-semibold text-cream">{capsule.title}</h3>
          <p className="font-mono mt-1 text-[10px] tracking-[0.16em] text-cream-dim uppercase">
            PBKDF2-SHA256 · {capsule.payload.iterations.toLocaleString()} iterations · AES-256-GCM
          </p>
          <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -7, 7, 0] } : {}} transition={{ duration: 0.4 }} className="mt-6 flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                maxLength={1}
                autoFocus={i === 0}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(-1);
                  const next = [...digits];
                  next[i] = v;
                  setDigits(next);
                  if (v && i < 3) refs.current[i + 1]?.focus();
                  if (next.every((x) => x !== "")) void submit(next.join(""));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                className={cn(
                  "tabular font-mono h-14 w-12 rounded-md border bg-ink-900 text-center text-2xl text-gold-300 outline-none transition-colors",
                  fail && !d ? "border-wax-500/70" : "border-moss-600 focus:border-gold-400",
                )}
                aria-label={`PIN digit ${i + 1}`}
              />
            ))}
          </motion.div>
          <p className="font-mono mt-4 text-[10px] tracking-[0.16em] text-cream-dim uppercase">
            {busy ? "Deriving key…" : capsule.demo ? `Demo PIN: ${DEMO_PIN}` : "Enter the 4-digit family PIN"}
          </p>
          {fail >= 3 ? (
            <p className="mt-3 rounded-md border border-wax-500/50 bg-wax-500/10 px-4 py-2 text-[12px] text-blush-300">
              Attempt cap nearing — in production this arms the guardian 2-of-2 recovery path.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

/* ── Guardians ─────────────────────────────────────────────────────────────── */

function GuardianBlock() {
  const [rung, setRung] = useState(-1);
  const [running, setRunning] = useState(false);
  const timer = useRef(0);

  const runDrill = () => {
    if (running) return;
    setRunning(true);
    setRung(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= INACTIVITY_LADDER.length) {
        clearInterval(timer.current);
        setRunning(false);
        toast("Inactivity drill complete — both guardians acknowledged within policy", "ok");
      } else {
        setRung(i);
      }
    }, 900);
  };

  useEffect(() => () => clearInterval(timer.current), []);

  return (
    <div className="mt-16 grid gap-4 lg:grid-cols-5">
      <Reveal className="lg:col-span-2">
        <div className="card h-full p-6">
          <p className="eyebrow">Legacy guardians</p>
          <p className="mt-1 text-sm text-cream-dim">Two humans who can — and must both agree to — open the estate in an emergency.</p>
          <div className="mt-4 space-y-3">
            {GUARDIANS.map((g) => (
              <div key={g.id} className="flex items-center gap-4 rounded-md border border-moss-700/50 bg-ink-900/50 p-4 transition-colors hover:border-sage-500/40">
                <span className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-500/50 bg-ink-800 text-lg font-semibold text-gold-300">
                  {g.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-cream">{g.name}</p>
                  <p className="font-mono text-[10px] text-cream-dim">{g.relation}</p>
                  <p className="font-mono mt-1 text-[9px] tracking-[0.12em] text-moss-300 uppercase">
                    {g.since} · {g.lastVerified} · {g.channel}
                  </p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-sage-300 uppercase">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sage-400" /> active
                </span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="lg:col-span-3">
        <div className="card flex h-full flex-col p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Inheritance protocol · inactivity ladder</p>
              <p className="mt-1 text-sm text-cream-dim">If the account goes quiet, escalation climbs automatically — never silently.</p>
            </div>
            <Btn variant="ghost" className="px-4 py-2 text-[12px]" onClick={runDrill}>
              {running ? "Drill running…" : "Run inactivity drill"}
            </Btn>
          </div>
          <div className="mt-6 grid flex-1 gap-3 sm:grid-cols-4">
            {INACTIVITY_LADDER.map((r, i) => (
              <motion.div
                key={r.days}
                animate={rung >= i && running ? { borderColor: "rgba(231,185,95,0.7)", y: -4 } : rung === -1 ? {} : { borderColor: "rgba(44,70,54,0.7)", y: 0 }}
                className="relative rounded-md border border-moss-700/60 bg-ink-900/50 p-4"
              >
                <span className="font-display text-2xl font-semibold text-gold-400">{r.days}</span>
                <span className="font-mono ml-1 text-[9px] tracking-[0.18em] text-cream-dim uppercase">days</span>
                <p className="mt-2 text-[12px] font-semibold text-cream">{r.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-cream-dim">{r.detail}</p>
                {rung >= i && running ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-ink-950"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3">
                      <path d="M2 6.5L4.8 9 10 3.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.span>
                ) : null}
              </motion.div>
            ))}
          </div>
          <p className="font-mono mt-5 border-t border-moss-700/50 pt-4 text-[9px] leading-relaxed tracking-[0.16em] text-moss-300 uppercase">
            Emergency release = 2-of-2 guardian approvals + evidence hash on the release ledger · time-lock otherwise immutable
          </p>
        </div>
      </Reveal>
    </div>
  );
}

/* ── Seal wizard ───────────────────────────────────────────────────────────── */

const PHOTO_CHOICES = [
  { id: IMG.wedding1948, label: "Wedding, 1948" },
  { id: IMG.heirloom, label: "The watch" },
  { id: IMG.reunion2019, label: "Reunion" },
  { id: IMG.bikes1968, label: "Bicycles, '68" },
];

function SealWizard({ open, onClose, onSealed }: { open: boolean; onClose: () => void; onSealed: (m: SealedCapsuleMeta) => void }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [milestone, setMilestone] = useState("18th birthday");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [sealStage, setSealStage] = useState(-1);

  useEffect(() => {
    if (open) {
      setStep(0); setErr(""); setSealStage(-1);
      setTitle(""); setRecipient(""); setMessage(""); setPhotos([]); setPin(""); setPin2(""); setAgree(false);
      setDate(new Date(Date.now() + 2 * 60_000).toISOString().slice(0, 16));
    }
  }, [open]);

  const next = () => {
    setErr("");
    if (step === 0) {
      if (!title.trim() || !recipient.trim()) return setErr("Title and recipient are required.");
      if (!date) return setErr("Choose an unlock date.");
      if (new Date(date).getTime() <= Date.now()) return setErr("T_unlock must be in the future — time only moves one way.");
    }
    if (step === 1 && !message.trim()) return setErr("Write at least a line — future-you is counting on it.");
    if (step === 2) {
      if (!/^\d{4}$/.test(pin)) return setErr("PIN must be exactly 4 digits.");
      if (pin !== pin2) return setErr("PINs don't match.");
      if (!agree) return setErr("Acknowledge the guardian policy to continue.");
    }
    setStep((s) => s + 1);
    if (step === 2) void runSeal();
  };

  const runSeal = async () => {
    setSealStage(0);
    await wait(450);
    const payload = await sealSecret(
      JSON.stringify({ message, recipient, milestone, sealedAt: new Date().toISOString() }),
      pin,
    );
    setSealStage(1);
    await wait(400);
    const fp = await makeFingerprint(payload);
    setSealStage(2);
    await wait(400);
    setSealStage(3);
    await wait(500);
    onSealed({
      id: `uc-${Date.now()}`,
      code: makeCode(),
      title: title.trim(),
      recipient: recipient.trim(),
      milestone,
      unlockAt: new Date(date).getTime(),
      sealedAt: Date.now(),
      payload,
      fingerprint: fp,
      photos,
    });
  };

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="mb-5 flex items-center justify-between">
        <p className="eyebrow">Seal a milestone capsule</p>
        <span className="font-mono text-[10px] text-cream-dim">step {Math.min(step + 1, 4)} / 4</span>
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-gold-400" : "bg-ink-700")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <WizardStep key="s0" title="Name the moment">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capsule title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Daniel's 18th Birthday" className={inputCls} />
              </Field>
              <Field label="Recipient">
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Daniel Cole" className={inputCls} />
              </Field>
              <Field label="Milestone">
                <select value={milestone} onChange={(e) => setMilestone(e.target.value)} className={inputCls}>
                  {["18th birthday", "21st birthday", "Graduation day", "Wedding morning", "First home", "Custom date"].map((m) => (
                    <option key={m} className="bg-ink-900">{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="T_unlock — unlocks at">
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </WizardStep>
        ) : step === 1 ? (
          <WizardStep key="s1" title="Fill the envelope">
            <Field label="The letter (encrypted client-side)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Dear future you — by the time you read this…"
                className={cn(inputCls, "resize-none leading-relaxed")}
              />
            </Field>
            <Field label="Attach photographs (optional)">
              <div className="grid grid-cols-4 gap-2">
                {PHOTO_CHOICES.map((p) => {
                  const on = photos.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhotos((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
                      className={cn(
                        "group relative overflow-hidden rounded-md border-2 transition-all duration-200 cursor-pointer",
                        on ? "border-gold-400 shadow-[0_8px_24px_-10px_rgba(231,185,95,0.6)]" : "border-moss-700 hover:border-moss-500",
                      )}
                    >
                      <img src={p.id} alt={p.label} className="h-16 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {on ? (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-400 text-ink-950">
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6.5L4.8 9 10 3.5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
                        </span>
                      ) : null}
                      <span className="font-mono absolute bottom-0 w-full bg-ink-950/80 px-1 py-0.5 text-[8px] tracking-[0.1em] text-cream-dim uppercase">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </WizardStep>
        ) : step === 2 ? (
          <WizardStep key="s2" title="Choose the key">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="4-digit PIN">
                <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••" className={cn(inputCls, "font-mono tracking-[0.5em]")} />
              </Field>
              <Field label="Confirm PIN">
                <input value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••" className={cn(inputCls, "font-mono tracking-[0.5em]")} />
              </Field>
            </div>
            <div className="mt-4 rounded-md border border-moss-700/60 bg-ink-900/60 p-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-sage-300 uppercase">Zero-knowledge by default</p>
              <p className="mt-1 text-[12px] leading-relaxed text-cream-dim">
                The key is derived from this PIN on your device (PBKDF2-SHA256, 150k iterations) and never transmitted.
                MemoryLane stores ciphertext only. If the PIN is lost, only the guardian 2-of-2 path remains.
              </p>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-[12px] leading-relaxed text-cream-dim">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#e7b95f]" />
              I understand the seal is immutable until T_unlock, and that early release requires my PIN or both legacy guardians.
            </label>
          </WizardStep>
        ) : (
          <WizardStep key="s3" title="Sealing…">
            <div className="space-y-3">
              {["Deriving AES-256 key — PBKDF2-SHA256, 150,000 iterations", "Encrypting envelope — AES-256-GCM, 96-bit IV", "Writing manifest & scheduling unlock worker", "Capsule sealed — T_lock committed to the ledger"].map((s, i) => (
                <div key={s} className={cn("flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-300", sealStage >= i ? "border-sage-500/50 bg-sage-500/5" : "border-moss-700/50 opacity-40")}>
                  {sealStage > i ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-400 text-ink-950">
                      <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2 6.5L4.8 9 10 3.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  ) : sealStage === i ? (
                    <motion.span className="h-5 w-5 rounded-full border-2 border-gold-400 border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-moss-600" />
                  )}
                  <span className="font-mono text-[11px] tracking-[0.08em] text-cream">{s}</span>
                </div>
              ))}
            </div>
          </WizardStep>
        )}
      </AnimatePresence>

      {step < 3 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Btn variant="ghost" onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}>
            {step === 0 ? "Cancel" : "Back"}
          </Btn>
          <div className="flex items-center gap-3">
            {err ? <span className="text-[12px] text-blush-300">{err}</span> : null}
            <Btn onClick={next}>{step === 2 ? "Seal the capsule" : "Continue"}</Btn>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

const inputCls =
  "w-full rounded-md border border-moss-600 bg-ink-900 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-dim/50 outline-none transition-colors focus:border-gold-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono mb-1.5 block text-[9px] tracking-[0.2em] text-cream-dim uppercase">{label}</span>
      {children}
    </label>
  );
}

function WizardStep({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
      <h3 className="font-display mb-4 text-2xl font-semibold text-cream">{title}</h3>
      {children}
    </motion.div>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

function MarkIcon({ mark }: { mark: MatrixMark }) {
  if (mark === "full")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="inline-block text-gold-400" aria-label="full">
        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.16" />
        <path d="M4.5 8.5L7 11l4.5-5.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (mark === "limited")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="inline-block text-sage-400" aria-label="limited">
        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.14" />
        <path d="M4.5 8h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="inline-block text-blush-500" aria-label="denied">
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.12" />
      <path d="M5.5 5.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-cream-dim uppercase">
      <span className={cn("h-2 w-2 rounded-full", dot)} /> {label}
    </span>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
