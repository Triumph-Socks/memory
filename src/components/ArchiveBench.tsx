import { AnimatePresence, motion } from "framer-motion";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { ALBUMS, EVENTS, IMG, MEMOIR } from "../data/family";
import { ArchiveExportService, type LaneItem, type MediaStore, type ZipSink, type ZipSinkFactory } from "../server/export-archive";
import { cn, formatBytes } from "../lib/utils";
import { Btn, Reveal, SectionHead, toast } from "./ui";

/* Run the production export module in the browser:
   JSZip as the sink, fetch as the media store. */
class JsZipSink implements ZipSink {
  zip = new JSZip();
  addFile(path: string, data: Uint8Array | string): void {
    this.zip.file(path, data);
  }
  async finalize(): Promise<Uint8Array> {
    return this.zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }
}
const zipFactory: ZipSinkFactory = { create: () => new JsZipSink() };
const fetchStore: MediaStore = {
  async read(key: string): Promise<Uint8Array> {
    const res = await fetch(key);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
};
const service = new ArchiveExportService(fetchStore, zipFactory);

type Phase = "idle" | "building" | "done";

export function ArchiveBench({
  selection,
  onToggle,
  onClear,
}: {
  selection: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [wantHtml, setWantHtml] = useState(true);
  const [wantCsv, setWantCsv] = useState(true);
  const [wantMedia, setWantMedia] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ files: { path: string; bytes: number }[]; total: number; blob: Blob } | null>(null);

  const items = useMemo<LaneItem[]>(() => {
    const evts = EVENTS.filter((e) => selection.has(e.id)).map((e) => ({
      id: e.id,
      title: e.title,
      year: e.year,
      decade: e.decade,
      kind: e.kind,
      mediaKey: e.img ?? null,
      caption: e.caption ?? null,
      tags: e.tags,
      sha256: null,
    }));
    const extra: LaneItem[] = [];
    if (selection.has("memoir")) {
      extra.push({
        id: "memoir",
        title: MEMOIR.title,
        year: 2024,
        decade: "2020s",
        kind: "voice",
        mediaKey: IMG.heirloom,
        caption: `Narrated by ${MEMOIR.narrator}`,
        tags: ["memoir", "whisper-transcript"],
        sha256: null,
      });
    }
    const albums = ALBUMS.filter((a) => selection.has(`album:${a.id}`)).map((a) => ({
      id: a.id,
      title: a.title,
      year: Number(a.years.slice(0, 4)),
      decade: `${a.years.slice(0, 4)}s`,
      kind: "photo" as const,
      mediaKey: a.cover,
      caption: a.blurb,
      tags: ["album", a.privacy],
      sha256: null,
    }));
    return [...evts, ...extra, ...albums];
  }, [selection]);

  const STEPS = [
    "Reading originals from the media store…",
    "Writing manifest.json (content-addressed)…",
    wantHtml ? "Rendering the offline HTML viewer…" : "",
    wantCsv ? "Emitting index.csv for archivists…" : "",
    wantMedia ? "Bundling media into media/…" : "",
    "Finalising ZIP (DEFLATE)…",
  ].filter(Boolean);

  const build = async () => {
    if (items.length === 0) {
      toast("Select at least one memory lane first", "warn");
      return;
    }
    setPhase("building");
    setStep(0);
    setResult(null);
    const tick = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 500);
    try {
      const res = await service.packageLane({
        familyId: "bennett-estate",
        items,
        includeHtmlViewer: wantHtml,
        includeCsvIndex: wantCsv,
        includeMedia: wantMedia,
      });
      window.clearInterval(tick);
      setStep(STEPS.length);
      const blob = new Blob([res.bytes as unknown as BlobPart], { type: "application/zip" });
      setResult({ files: res.files, total: res.bytes.length, blob });
      setPhase("done");
      toast(`Longevity bundle ready — ${res.files.length} files, ${formatBytes(res.bytes.length)}`, "ok");
    } catch {
      window.clearInterval(tick);
      setPhase("idle");
      toast("Export failed — a media asset was unreachable. Try again with media disabled.", "err");
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(result.blob);
    a.download = `memorylane-bennett-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section id="archive" className="relative py-24">
      <p className="ghost-num pointer-events-none absolute top-20 -left-6 hidden text-[18vw] lg:block" aria-hidden>
        3·2·1
      </p>
      <div className="shell relative">
        <SectionHead
          index="05"
          eyebrow="Export & longevity"
          title={
            <>
              Outlive the cloud. <em className="text-gold-400 italic">Take it with you.</em>
            </>
          }
          lede="The 3-2-1 ritual: three copies, two media, one offsite. Package any memory lane into manifest.json, an offline HTML viewer, CSV and the originals — the production exporter runs right here in your browser."
        />

        <div className="grid gap-4 lg:grid-cols-5">
          {/* Lane picker */}
          <Reveal className="lg:col-span-3">
            <div className="card h-full p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Memory lanes</p>
                <button
                  type="button"
                  onClick={onClear}
                  className="font-mono text-[10px] tracking-[0.16em] text-cream-dim uppercase transition-colors hover:text-blush-300 cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <p className="font-mono mt-4 mb-2 text-[9px] tracking-[0.2em] text-moss-300 uppercase">From the timeline</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {EVENTS.map((e) => (
                  <label
                    key={e.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-all duration-200",
                      selection.has(e.id) ? "border-gold-500/60 bg-gold-400/5" : "border-moss-700/50 hover:border-moss-500",
                    )}
                  >
                    <input type="checkbox" className="accent-[#e7b95f]" checked={selection.has(e.id)} onChange={() => onToggle(e.id)} />
                    <span className="font-mono text-[11px] text-gold-400">{e.year}</span>
                    <span className="truncate text-[12px] text-cream">{e.title}</span>
                  </label>
                ))}
              </div>

              <p className="font-mono mt-5 mb-2 text-[9px] tracking-[0.2em] text-moss-300 uppercase">Memoir & albums</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-all duration-200",
                    selection.has("memoir") ? "border-gold-500/60 bg-gold-400/5" : "border-moss-700/50 hover:border-moss-500",
                  )}
                >
                  <input type="checkbox" className="accent-[#e7b95f]" checked={selection.has("memoir")} onChange={() => onToggle("memoir")} />
                  <span className="font-mono text-[11px] text-gold-400">2024</span>
                  <span className="truncate text-[12px] text-cream">{MEMOIR.title}</span>
                </label>
                {ALBUMS.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-all duration-200",
                      selection.has(`album:${a.id}`) ? "border-gold-500/60 bg-gold-400/5" : "border-moss-700/50 hover:border-moss-500",
                    )}
                  >
                    <input type="checkbox" className="accent-[#e7b95f]" checked={selection.has(`album:${a.id}`)} onChange={() => onToggle(`album:${a.id}`)} />
                    <span className="truncate text-[12px] text-cream">{a.title}</span>
                    <span className="font-mono ml-auto text-[10px] text-cream-dim">{a.count} items</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-moss-700/50 pt-4">
                <p className="font-mono text-[10px] tracking-[0.16em] text-cream-dim uppercase">
                  {items.length} lane item(s) selected
                </p>
                <Btn variant="ghost" className="px-4 py-2 text-[12px]" onClick={() => EVENTS.forEach((e) => !selection.has(e.id) && onToggle(e.id))}>
                  Select all timeline
                </Btn>
              </div>
            </div>
          </Reveal>

          {/* Bundle builder */}
          <Reveal delay={0.1} className="lg:col-span-2">
            <div className="card flex h-full flex-col p-6">
              <p className="eyebrow">Longevity bundle</p>
              <div className="mt-4 space-y-2">
                <FormatRow locked label="manifest.json" desc="the contract — always included" checked disabled />
                <FormatRow label="index.html" desc="offline viewer, zero dependencies" checked={wantHtml} onChange={() => setWantHtml((v) => !v)} />
                <FormatRow label="index.csv" desc="spreadsheet-safe inventory" checked={wantCsv} onChange={() => setWantCsv((v) => !v)} />
                <FormatRow label="media/" desc="original JPEGs, content-addressed" checked={wantMedia} onChange={() => setWantMedia((v) => !v)} />
              </div>

              <div className="mt-5 flex-1">
                {phase === "idle" ? (
                  <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-md border border-dashed border-moss-600 p-5 text-center">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-cream-dim uppercase">
                      {items.length === 0 ? "No lanes selected yet" : `${items.length} item(s) ready to package`}
                    </p>
                  </div>
                ) : phase === "building" ? (
                  <div className="space-y-2">
                    {STEPS.map((s, i) => (
                      <div key={s} className={cn("flex items-center gap-2.5 font-mono text-[10px] tracking-[0.08em] transition-opacity", i <= step ? "opacity-100" : "opacity-30")}>
                        {i < step ? (
                          <span className="text-sage-400">✓</span>
                        ) : i === step ? (
                          <motion.span className="inline-block h-2.5 w-2.5 rounded-full border border-gold-400 border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                        ) : (
                          <span className="inline-block h-2.5 w-2.5 rounded-full border border-moss-600" />
                        )}
                        <span className="text-cream-dim">{s}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AnimatePresence>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                      {result?.files.map((f) => (
                        <div key={f.path} className="flex items-center justify-between rounded border border-moss-700/50 bg-ink-900/50 px-3 py-1.5">
                          <span className="font-mono text-[11px] text-cream">{f.path}</span>
                          <span className="font-mono tabular text-[10px] text-cream-dim">{formatBytes(f.bytes)}</span>
                        </div>
                      ))}
                      <p className="font-mono pt-1 text-[10px] tracking-[0.16em] text-sage-300 uppercase">
                        {result?.files.length} files · {result ? formatBytes(result.total) : ""} · sha256 in manifest
                      </p>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <div className="mt-5 flex gap-2 border-t border-moss-700/50 pt-4">
                <Btn className="flex-1" onClick={() => void build()} disabled={phase === "building"}>
                  {phase === "done" ? "Rebuild bundle" : "Build .zip bundle"}
                </Btn>
                {phase === "done" && result ? (
                  <Btn variant="wax" onClick={download}>
                    Download
                    <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
                      <path d="M6 1v8M2.5 5.5L6 9l3.5-3.5M1.5 11.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Btn>
                ) : null}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FormatRow({
  label,
  desc,
  checked,
  onChange,
  locked,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: () => void;
  locked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-md border px-3.5 py-2.5 transition-colors",
        locked ? "border-moss-700/60 bg-ink-900/40" : "cursor-pointer border-moss-700/50 hover:border-gold-500/40",
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="accent-[#e7b95f]" />
      <span className="font-mono text-[12px] text-cream">{label}</span>
      <span className="ml-auto text-[10px] text-cream-dim">{desc}</span>
      {locked ? <span className="font-mono text-[8px] tracking-[0.16em] text-gold-400 uppercase">always</span> : null}
    </label>
  );
}
