import { useState } from "react";
import { scrollToId } from "../lib/utils";

const LINKS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "stories", label: "Stories" },
  { id: "timeline", label: "Timeline" },
  { id: "vault", label: "Vault" },
  { id: "archive", label: "Archive" },
  { id: "blueprint", label: "Blueprint" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[60] border-b border-moss-700/50 bg-ink-950/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center gap-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#122018" stroke="#2c4636" />
            <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#e7b95f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="23.5" r="2" fill="#9e3b33" />
          </svg>
          <span className="text-left leading-none">
            <span className="font-display block text-[17px] font-semibold tracking-tight text-cream">MemoryLane</span>
            <span className="font-mono block pt-0.5 text-[9px] tracking-[0.3em] text-cream-dim uppercase">family vault</span>
          </span>
        </button>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => scrollToId(l.id)}
              className="font-mono rounded px-3 py-1.5 text-[11px] tracking-[0.16em] text-cream-dim uppercase transition-colors hover:bg-ink-800 hover:text-gold-300 cursor-pointer"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 rounded-full border border-sage-500/40 bg-sage-500/10 py-1.5 pr-4 pl-3 sm:flex">
          <span className="pulse-dot h-2 w-2 rounded-full bg-sage-400" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-sage-300 uppercase">Vault sealed · AES-256</span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded border border-moss-700 p-2 text-cream lg:hidden cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            {open ? (
              <path d="M2 2l14 10M16 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M1 1.5h16M1 7h16M1 12.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <nav className="border-t border-moss-700/50 bg-ink-900 lg:hidden">
          {LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setOpen(false);
                scrollToId(l.id);
              }}
              className="font-mono block w-full px-6 py-3 text-left text-[12px] tracking-[0.2em] text-cream-dim uppercase hover:bg-ink-800 hover:text-gold-300 cursor-pointer"
            >
              {l.label}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-moss-700/50 bg-ink-900/60">
      <div className="shell grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#122018" stroke="#2c4636" />
              <path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#e7b95f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="23.5" r="2" fill="#9e3b33" />
            </svg>
            <span className="font-display text-lg font-semibold text-cream">MemoryLane</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream-dim">
            Private family albums, voice-narrated memoirs, and time-locked milestone vaults — engineered so the
            story outlives the service.
          </p>
          <p className="font-mono mt-6 text-[10px] leading-relaxed tracking-[0.14em] text-moss-300 uppercase">
            AES-256-GCM · PBKDF2-SHA256 · Argon2id
            <br />
            3-2-1 longevity compliant · zero-knowledge option
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2.5">
            {LINKS.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => scrollToId(l.id)}
                  className="text-sm text-cream-dim transition-colors hover:text-gold-300 cursor-pointer"
                >
                  {l.label === "Vault" ? "Milestone Vaults" : l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-4">Production blueprint</p>
          <ul className="font-mono space-y-2.5 text-[12px] text-cream-dim">
            <li>Next.js App Router · React 19 · TypeScript</li>
            <li>PostgreSQL + Prisma · S3 + Lambda pipelines</li>
            <li>OpenAI Whisper narration sync</li>
            <li>EventBridge scheduler → KMS key release</li>
            <li>Framer Motion · Tailwind v4 · shadcn/ui</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-moss-700/40">
        <div className="shell flex flex-col items-start justify-between gap-2 py-5 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] tracking-[0.2em] text-moss-300 uppercase">
            The Bennett estate · sealed since 1942
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-moss-300 uppercase">
            Keep the small hours — they were the whole thing
          </p>
        </div>
      </div>
    </footer>
  );
}
