import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { cn, countdownTo, pad2, useNow } from "../lib/utils";

/* ── Reveal on scroll ─────────────────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Section header ───────────────────────────────────────────────────────── */

export function SectionHead({
  index,
  eyebrow,
  title,
  lede,
  action,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className="mb-10 sm:mb-14">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] font-semibold text-wax-400">{index}</span>
        <span className="hairline w-10" />
        <span className="eyebrow">{eyebrow}</span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <h2 className="font-display mt-4 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight text-cream sm:text-5xl">
        {title}
      </h2>
      {lede ? <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-cream-dim">{lede}</p> : null}
    </Reveal>
  );
}

/* ── Chips & buttons ──────────────────────────────────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  tone = "moss",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "moss" | "gold";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-mono text-[11px] tracking-[0.14em] uppercase rounded-full border px-3.5 py-1.5 transition-all duration-200 cursor-pointer",
        active
          ? tone === "gold"
            ? "border-gold-400 bg-gold-400 text-ink-950 font-semibold shadow-[0_4px_18px_-6px_rgba(231,185,95,0.6)]"
            : "border-sage-400 bg-sage-400/15 text-sage-300"
          : "border-moss-700 bg-ink-850 text-cream-dim hover:border-moss-500 hover:text-cream",
      )}
    >
      {children}
    </button>
  );
}

export function Btn({
  variant = "gold",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "wax" | "paper";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-body text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
        variant === "gold" &&
          "bg-gold-400 px-5 py-2.5 text-ink-950 hover:bg-gold-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(231,185,95,0.55)] active:translate-y-0",
        variant === "ghost" &&
          "border border-moss-600 px-5 py-2.5 text-cream hover:border-gold-500/70 hover:text-gold-300 hover:-translate-y-0.5",
        variant === "wax" &&
          "bg-wax-500 px-5 py-2.5 text-paper-50 hover:bg-wax-400 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(158,59,51,0.6)]",
        variant === "paper" &&
          "bg-ink-900 px-5 py-2.5 text-paper-100 border border-paper-300/40 hover:border-paper-200 hover:-translate-y-0.5",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Toasts ───────────────────────────────────────────────────────────────── */

export type ToastKind = "ok" | "warn" | "err";
interface ToastMsg {
  id: number;
  kind: ToastKind;
  text: string;
}

let pushToast: ((t: ToastMsg) => void) | null = null;
let toastSeq = 0;

export function toast(text: string, kind: ToastKind = "ok"): void {
  pushToast?.({ id: ++toastSeq, kind, text });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    pushToast = (t) => {
      setItems((prev) => [...prev.slice(-3), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), 4200);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[90] flex w-[min(360px,90vw)] flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={cn(
              "card pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm",
              t.kind === "ok" && "border-sage-500/50",
              t.kind === "warn" && "border-gold-500/60",
              t.kind === "err" && "border-wax-500/70",
            )}
          >
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                t.kind === "ok" && "bg-sage-400",
                t.kind === "warn" && "bg-gold-400",
                t.kind === "err" && "bg-wax-400",
              )}
            />
            <p className="leading-snug text-cream">{t.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Countdown ────────────────────────────────────────────────────────────── */

function TickCell({ value, label, big }: { value: number; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "tabular font-mono font-semibold text-cream rounded-md border border-moss-700/70 bg-ink-900/80 px-1 text-center",
          big ? "min-w-[64px] py-2 text-3xl" : "min-w-[44px] py-1.5 text-lg",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {pad2(value)}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="font-mono mt-1 text-[9px] tracking-[0.22em] text-cream-dim uppercase">{label}</span>
    </div>
  );
}

export function Countdown({ to, big }: { to: number; big?: boolean }) {
  const now = useNow(1000);
  const p = countdownTo(to, now);
  return (
    <div className={cn("flex items-start justify-center", big ? "gap-3" : "gap-2")}>
      <TickCell value={p.days} label="days" big={big} />
      <span className="font-mono pt-2 text-xl text-gold-500/70">:</span>
      <TickCell value={p.hours} label="hrs" big={big} />
      <span className="font-mono pt-2 text-xl text-gold-500/70">:</span>
      <TickCell value={p.mins} label="min" big={big} />
      <span className="font-mono pt-2 text-xl text-gold-500/70">:</span>
      <TickCell value={p.secs} label="sec" big={big} />
    </div>
  );
}

/* ── Wax seal ─────────────────────────────────────────────────────────────── */

export function WaxSeal({ cracked, size = 92 }: { cracked?: boolean; size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]", !cracked && "seal-breathe")}
      animate={cracked ? { rotate: -7, scale: 0.96 } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <defs>
        <radialGradient id={cracked ? "waxc" : "waxi"} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#c05a4e" />
          <stop offset="55%" stopColor="#9e3b33" />
          <stop offset="100%" stopColor="#5f211d" />
        </radialGradient>
      </defs>
      <path
        d="M50 4c9-2 14 3 21 5s15-1 19 6 1 14 3 21 6 12 2 19-10 9-14 15-6 14-14 16-13-4-21-3-14 5-20 0-5-12-11-17S4 56 4 48s7-11 9-18 1-15 8-19 13 1 20 0 6-5 9-7z"
        fill={`url(#${cracked ? "waxc" : "waxi"})`}
      />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#5f211d" strokeWidth="2.5" opacity="0.8" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#c96f60" strokeWidth="1.2" opacity="0.7" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Fraunces, serif"
        fontSize="30"
        fontWeight="600"
        fill="#f2d5c8"
      >
        B
      </text>
      {cracked ? (
        <motion.path
          d="M14 30 L34 44 L28 56 L46 60 L40 74 L58 70 L66 84"
          fill="none"
          stroke="#0a120d"
          strokeWidth="3.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      ) : null}
    </motion.svg>
  );
}

/* ── Privacy badge ────────────────────────────────────────────────────────── */

export function PrivacyBadge({ tier }: { tier: "pin" | "family" | "contributor" | "public" }) {
  const map = {
    pin: { label: "PIN-locked", cls: "border-wax-500/60 text-blush-300 bg-wax-500/10" },
    family: { label: "Family only", cls: "border-sage-500/50 text-sage-300 bg-sage-500/10" },
    contributor: { label: "Contributors", cls: "border-lake-500/50 text-lake-300 bg-lake-500/10" },
    public: { label: "Public link", cls: "border-gold-500/50 text-gold-300 bg-gold-500/10" },
  } as const;
  const m = map[tier];
  return (
    <span className={cn("font-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] tracking-[0.14em] uppercase", m.cls)}>
      {tier === "pin" ? (
        <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
          <rect x="0.75" y="4.5" width="7.5" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <circle cx="4.5" cy="4.5" r="3.6" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {m.label}
    </span>
  );
}

/* ── Modal shell ──────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 34, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "card relative max-h-[88vh] w-full overflow-y-auto border-moss-600/60 bg-ink-850 p-6 sm:p-8",
              wide ? "max-w-3xl" : "max-w-lg",
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
