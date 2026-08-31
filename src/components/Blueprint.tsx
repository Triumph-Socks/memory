import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/utils";
import { Btn, Reveal, SectionHead, toast } from "./ui";

/**
 * The three production artifacts live as real source files in src/server/.
 * We reference them as static assets (new URL + import.meta.url) and fetch
 * their text at runtime. This keeps them out of the JS module graph — no
 * `?raw` module scripts, so nothing can fail MIME / module resolution.
 */
const SCHEMA_URL = new URL("../server/schema.prisma", import.meta.url).href;
const SERVICE_URL = new URL("../server/time-lock.service.ts", import.meta.url).href;
const EXPORT_URL = new URL("../server/export-archive.ts", import.meta.url).href;

interface FileTab {
  name: string;
  lang: string;
  path: string;
  url: string;
  body: string;
  note: string;
}

interface FileMeta {
  name: string;
  lang: string;
  path: string;
  url: string;
  note: string;
}

const NEXT_WIRING = `// app/vaults/[capsuleId]/page.tsx — App Router wiring (production)
//
// Server component reads the capsule envelope; the client island below
// (this site's Vault module) performs zero-knowledge decryption in-browser.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CapsuleDashboard } from "@/components/vault/CapsuleDashboard";
import { TimeLockService } from "@/server/time-lock.service";

export default async function CapsulePage({ params }: Props) {
  const capsule = await prisma.timeCapsule.findUnique({
    where: { id: params.capsuleId },
    include: { contents: true, unlockJob: true, releaseLog: true },
  });
  if (!capsule) notFound();

  return (
    <CapsuleDashboard
      envelope={{
        code: capsule.id,
        unlockAt: capsule.unlockAt.toISOString(),
        kdf: capsule.kdfParams,            // ZK: params only, never keys
        fingerprint: capsule.fingerprint,  // public audit anchor
        status: capsule.status,
      }}
      scheduledJob={capsule.unlockJob?.jobId ?? null}
    />
  );
}

// Route handler: scheduled worker callback (EventBridge → Lambda → API)
// POST /api/vaults/[capsuleId]/release
//   1. verify signature (scheduler IAM role)
//   2. TimeLockService.executeScheduledRelease(capsuleId, workerId)
//   3. 202 Accepted — receipt appended to release_log
`;

const FILE_META: FileMeta[] = [
  {
    name: "schema.prisma",
    lang: "prisma",
    path: "src/server/schema.prisma",
    url: SCHEMA_URL,
    note: "13 models — family graph, permission links, media pipeline, memoir transcripts, capsules, guardians.",
  },
  {
    name: "time-lock.service.ts",
    lang: "ts",
    path: "src/server/time-lock.service.ts",
    url: SERVICE_URL,
    note: "Seal → schedule → verify → release → notify. Dual control with KMS; 2-of-2 guardian override.",
  },
  {
    name: "export-archive.ts",
    lang: "ts",
    path: "src/server/export-archive.ts",
    url: EXPORT_URL,
    note: "Longevity packager: manifest.json + offline HTML viewer + CSV + originals. 3-2-1 ritual in README.",
  },
  {
    name: "vault-dashboard.tsx",
    lang: "tsx",
    path: "app/vaults/[capsuleId]/page.tsx",
    url: "",
    note: "Next.js App Router wiring — server component fetches the envelope, client island decrypts ZK.",
  },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const HL =
  /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|of|in|new|await|async|import|from|export|interface|class|implements|extends|private|public|readonly|static|try|catch|throw|null|undefined|true|false|this|type|enum|model|datasource|generator|default)\b|(@{1,2}[\w]+)/g;

function highlight(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(HL)) {
    const idx = m.index ?? 0;
    out += escapeHtml(code.slice(last, idx));
    const full = m[0];
    const cls = m[1] || m[2] ? "text-moss-300 italic" : m[3] ? "text-sage-300" : m[4] ? "text-gold-400" : "text-blush-300";
    out += `<span class="${cls}">${escapeHtml(full)}</span>`;
    last = idx + full.length;
  }
  return out + escapeHtml(code.slice(last));
}

export function Blueprint() {
  const [tab, setTab] = useState(0);
  const [bodies, setBodies] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetchable = FILE_META.filter((f) => f.url);
        const texts = await Promise.all(
          fetchable.map((f) => fetch(f.url).then((r) => (r.ok ? r.text() : Promise.reject(r.statusText)))),
        );
        const map: Record<string, string> = {};
        fetchable.forEach((f, i) => {
          map[f.name] = texts[i];
        });
        if (!cancelled) setBodies(map);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const FILES: FileTab[] = useMemo(
    () =>
      FILE_META.map((f) => ({
        ...f,
        body: f.name === "vault-dashboard.tsx" ? NEXT_WIRING : bodies?.[f.name] ?? "",
      })),
    [bodies],
  );

  const file = FILES[tab];
  const html = useMemo(() => highlight(file.body), [file]);
  const lines = file.body ? file.body.split("\n").length : 0;

  return (
    <section id="blueprint" className="relative py-24">
      <div className="shell">
        <SectionHead
          index="06"
          eyebrow="Architecture blueprint"
          title={
            <>
              The vault, <em className="text-gold-400 italic">wires and all.</em>
            </>
          }
          lede="Four production artifacts ship with this build: the Prisma schema, the time-lock service, the longevity exporter, and the App Router wiring. Everything below is the real source — browse, copy, deploy."
        />

        <Pipeline />

        <Reveal className="mt-10">
          <div className="card overflow-hidden border-moss-600/60">
            {/* tab bar */}
            <div className="flex flex-wrap items-center gap-1 border-b border-moss-700/60 bg-ink-900/80 px-3 pt-3">
              {FILES.map((f, i) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setTab(i)}
                  className={cn(
                    "font-mono rounded-t-md border-x border-t px-4 py-2 text-[11px] transition-colors cursor-pointer",
                    i === tab
                      ? "border-moss-600 bg-ink-850 text-gold-300"
                      : "border-transparent text-cream-dim hover:text-cream",
                  )}
                >
                  {f.name}
                </button>
              ))}
              <div className="ml-auto hidden items-center gap-3 pb-1 sm:flex">
                <span className="font-mono text-[9px] tracking-[0.16em] text-cream-dim uppercase">{file.path}</span>
                <Btn
                  variant="ghost"
                  className="px-3 py-1 text-[11px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(file.body).then(
                      () => toast(`${file.name} copied to clipboard`, "ok"),
                      () => toast("Clipboard unavailable in this browser", "err"),
                    );
                  }}
                >
                  Copy
                </Btn>
              </div>
            </div>
            <p className="border-b border-moss-700/40 bg-ink-900/40 px-5 py-2.5 font-mono text-[10px] tracking-[0.1em] text-moss-300 uppercase">
              {lines} lines · {file.note}
            </p>
            {/* code */}
            <div className="max-h-[520px] overflow-auto bg-[#0c150f]">
              {bodies === null && !failed ? (
                <div className="flex h-[320px] flex-col items-center justify-center gap-3">
                  <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-sage-400" />
                  <p className="font-mono text-[10px] tracking-[0.22em] text-cream-dim uppercase">
                    Loading {file.name}…
                  </p>
                </div>
              ) : failed ? (
                <div className="flex h-[320px] items-center justify-center px-8 text-center">
                  <p className="font-mono text-[11px] leading-relaxed text-blush-300">
                    Couldn't fetch {file.path} from the build output. The source still ships in the
                    repository — open it in your editor.
                  </p>
                </div>
              ) : (
                <pre className="p-5 font-mono text-[12px] leading-[1.7] whitespace-pre text-cream/90">
                  <code dangerouslySetInnerHTML={{ __html: html }} />
                </pre>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Pipeline diagram ──────────────────────────────────────────────────────── */

const FLOW_NODES: Array<{ x: number; y: number; w: number; title: string; sub: string; tone: string }> = [
  { x: 20, y: 26, w: 150, title: "Batch ingest", sub: "EXIF strip · thumbs", tone: "#e7b95f" },
  { x: 250, y: 26, w: 150, title: "Lambda", sub: "compress · derivatives", tone: "#e7b95f" },
  { x: 480, y: 26, w: 150, title: "S3 + KMS", sub: "AES-256 envelope", tone: "#e7b95f" },
  { x: 20, y: 108, w: 150, title: "Voice recorder", sub: "MediaRecorder", tone: "#8fb0ba" },
  { x: 250, y: 108, w: 150, title: "Whisper API", sub: "word timestamps", tone: "#8fb0ba" },
  { x: 480, y: 108, w: 150, title: "Transcript sync", sub: "photo highlights", tone: "#8fb0ba" },
  { x: 20, y: 190, w: 150, title: "Scheduler", sub: "EventBridge · cron", tone: "#d68f77" },
  { x: 250, y: 190, w: 150, title: "KMS release", sub: "dual control @ T", tone: "#d68f77" },
  { x: 480, y: 190, w: 150, title: "Notify + ledger", sub: "recipient · guardians", tone: "#d68f77" },
];

const FLOW_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8],
];

function Pipeline() {
  return (
    <Reveal delay={0.08}>
      <div className="card overflow-x-auto border-moss-600/60 p-5">
        <svg viewBox="0 0 660 264" className="min-w-[640px] w-full" role="img" aria-label="Processing pipeline diagram">
          {FLOW_EDGES.map(([a, b]) => {
            const n1 = FLOW_NODES[a];
            const n2 = FLOW_NODES[b];
            return (
              <line
                key={`${a}-${b}`}
                x1={n1.x + n1.w}
                y1={n1.y + 26}
                x2={n2.x}
                y2={n2.y + 26}
                stroke="#4c6d55"
                strokeWidth="1.6"
                className="dashflow"
              />
            );
          })}
          {/* guardian fallback branch */}
          <path d="M325 242 C 325 258, 560 258, 560 242" fill="none" stroke="#9e3b33" strokeWidth="1.4" className="dashflow" />
          <text x="443" y="258" textAnchor="middle" fontFamily="Spline Sans Mono, monospace" fontSize="9" fill="#d68f77" letterSpacing="2">
            GUARDIAN 2-OF-2 FALLBACK
          </text>

          {FLOW_NODES.map((n) => (
            <g key={n.title}>
              <rect x={n.x} y={n.y} width={n.w} height={52} rx={7} fill="#122018" stroke="#2c4636" />
              <rect x={n.x} y={n.y} width={3} height={52} rx={1.5} fill={n.tone} />
              <text x={n.x + 14} y={n.y + 22} fontFamily="Archivo, sans-serif" fontSize="12.5" fontWeight="600" fill="#f0e9d8">
                {n.title}
              </text>
              <text x={n.x + 14} y={n.y + 39} fontFamily="Spline Sans Mono, monospace" fontSize="9" fill="#93b297" letterSpacing="0.6">
                {n.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Reveal>
  );
}
