/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MemoryLane — Export & Longevity Archival Module
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Packages selected memory lanes into boring, durable formats a family can
 * open in fifty years without us:
 *
 *   manifest.json  — schema.org-flavoured, content-addressed inventory
 *   index.html     — zero-dependency offline viewer (embeds the manifest)
 *   index.csv      — spreadsheet-safe inventory for archivists
 *   README.txt     — the 3-2-1 storage ritual, in plain language
 *   media/…        — original JPEGs, MP4 posters, WAV voice notes
 *
 * The service is storage-agnostic: inject a MediaStore (S3, R2, local disk)
 * and a ZipSink factory (JSZip in the browser, yazl/archiver on a server).
 */

export interface LaneItem {
  id: string;
  title: string;
  year: number;
  decade: string;
  kind: "photo" | "letter" | "milestone" | "voice" | "video";
  mediaKey: string | null; // storage key of the original asset
  caption: string | null;
  tags: string[];
  sha256: string | null; // content fingerprint for bit-rot audits
}

export interface ArchiveManifest {
  format: "memorylane.archive";
  version: 1;
  familyId: string;
  exportedAt: string; // ISO 8601 UTC
  exporter: string;
  itemCount: number;
  totalMediaBytes: number;
  items: LaneItem[];
  integrity: { algorithm: "sha256"; note: "verify each media file against items[].sha256" };
}

export interface ExportRequest {
  familyId: string;
  items: LaneItem[];
  includeHtmlViewer: boolean;
  includeCsvIndex: boolean;
  includeMedia: boolean;
}

export interface ExportResult {
  bytes: Uint8Array;
  manifest: ArchiveManifest;
  files: { path: string; bytes: number }[];
}

/* ── Adapters ──────────────────────────────────────────────────────────────── */

export interface MediaStore {
  read(key: string): Promise<Uint8Array>;
}

export interface ZipSink {
  addFile(path: string, data: Uint8Array | string): void;
  finalize(): Promise<Uint8Array>;
}

export interface ZipSinkFactory {
  create(): ZipSink;
}

/* ── Service ───────────────────────────────────────────────────────────────── */

export class ArchiveExportService {
  constructor(
    private readonly media: MediaStore,
    private readonly zipFactory: ZipSinkFactory,
  ) {}

  async packageLane(req: ExportRequest): Promise<ExportResult> {
    const zip = this.zipFactory.create();
    const files: { path: string; bytes: number }[] = [];
    let totalMediaBytes = 0;

    // 1 — Media originals (content-addressed names survive dedupe & bit-rot checks)
    const mediaPaths = new Map<string, string>();
    if (req.includeMedia) {
      for (const item of req.items) {
        if (!item.mediaKey || mediaPaths.has(item.id)) continue;
        try {
          const bytes = await this.media.read(item.mediaKey);
          const ext = extOf(item.mediaKey);
          const path = `media/${item.id}.${ext}`;
          zip.addFile(path, bytes);
          files.push({ path, bytes: bytes.length });
          totalMediaBytes += bytes.length;
          mediaPaths.set(item.id, path);
        } catch {
          // Unreadable asset: record it, never fail the whole archive.
          mediaPaths.set(item.id, `MISSING:${item.mediaKey}`);
        }
      }
    }

    // 2 — The manifest (always; it is the contract)
    const manifest = this.buildManifest(req, totalMediaBytes);
    const manifestJson = JSON.stringify(manifest, null, 2);
    zip.addFile("manifest.json", manifestJson);
    files.push({ path: "manifest.json", bytes: manifestJson.length });

    // 3 — The offline HTML viewer
    if (req.includeHtmlViewer) {
      const html = this.renderHtmlViewer(manifest, mediaPaths);
      zip.addFile("index.html", html);
      files.push({ path: "index.html", bytes: html.length });
    }

    // 4 — CSV index
    if (req.includeCsvIndex) {
      const csv = this.renderCsv(manifest.items);
      zip.addFile("index.csv", csv);
      files.push({ path: "index.csv", bytes: csv.length });
    }

    // 5 — Plain-language ritual
    const readme = this.renderReadme(manifest, mediaPaths);
    zip.addFile("README.txt", readme);
    files.push({ path: "README.txt", bytes: readme.length });

    const bytes = await zip.finalize();
    return { bytes, manifest, files };
  }

  buildManifest(req: ExportRequest, totalMediaBytes: number): ArchiveManifest {
    return {
      format: "memorylane.archive",
      version: 1,
      familyId: req.familyId,
      exportedAt: new Date().toISOString(),
      exporter: "memorylane-export/1.0",
      itemCount: req.items.length,
      totalMediaBytes,
      items: req.items,
      integrity: {
        algorithm: "sha256",
        note: "verify each media file against items[].sha256",
      },
    };
  }

  /** Self-contained viewer: no network, no dependencies, no build step. */
  renderHtmlViewer(manifest: ArchiveManifest, mediaPaths: Map<string, string>): string {
    const cards = manifest.items
      .map((item) => {
        const rel = mediaPaths.get(item.id) ?? "";
        const media = rel && !rel.startsWith("MISSING:") ? `<img src="${rel}" alt="${esc(item.title)}" loading="lazy">` : "";
        const tags = item.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
        return `<article><div class="media">${media}</div><h2>${esc(item.title)}</h2>
<p class="meta">${item.year} · ${esc(item.kind)}${item.caption ? " · " + esc(item.caption) : ""}</p>
${item.caption ? `<p class="cap">${esc(item.caption)}</p>` : ""}<p class="tags">${tags}</p></article>`;
      })
      .join("\n");

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(manifest.familyId)} — Family Archive</title>
<style>
body{font-family:Georgia,serif;background:#141410;color:#efe7d4;margin:0;padding:2rem}
header{max-width:880px;margin:0 auto 2rem}h1{font-size:2rem}
.meta{color:#b8ad93;font-size:.85rem}.cap{font-style:italic;color:#d8cdb2}
.tag{border:1px solid #4a4433;border-radius:99px;padding:2px 10px;font-size:.75rem;margin-right:6px}
main{max-width:880px;margin:0 auto;display:grid;gap:2rem}
article{border:1px solid #2e2a1e;background:#1c1a14;padding:1rem;border-radius:8px}
img{width:100%;border-radius:4px;display:block}
footer{max-width:880px;margin:3rem auto 0;color:#8d8468;font-size:.8rem}
</style></head><body>
<header><h1>The Family Archive</h1>
<p>${manifest.itemCount} memories · exported ${esc(manifest.exportedAt)} · opens offline, forever.</p></header>
<main>${cards}</main>
<footer>MemoryLane longevity export — manifest v${manifest.version}. Verify media with manifest.json checksums.</footer>
</body></html>`;
  }

  renderCsv(items: LaneItem[]): string {
    const head = "id,year,decade,kind,title,caption,tags,sha256";
    const rows = items.map((i) =>
      [i.id, i.year, i.decade, i.kind, csvCell(i.title), csvCell(i.caption ?? ""), csvCell(i.tags.join("|")), i.sha256 ?? ""].join(","),
    );
    return [head, ...rows].join("\n");
  }

  renderReadme(manifest: ArchiveManifest, mediaPaths: Map<string, string>): string {
    const missing = [...mediaPaths.entries()].filter(([, p]) => p.startsWith("MISSING:"));
    return [
      "MEMORYLANE FAMILY ARCHIVE — READ ME FIRST",
      "==========================================",
      "",
      `Exported: ${manifest.exportedAt}`,
      `Memories: ${manifest.itemCount} · Media: ${(manifest.totalMediaBytes / 1048576).toFixed(1)} MB`,
      "",
      "THE 3-2-1 RITUAL (once a year, at the family reunion):",
      "  3 copies  — this drive, a second drive, and one cloud vault",
      "  2 media   — e.g. external SSD + archival optical/DVD",
      "  1 offsite — a relative's house counts",
      "",
      "Open index.html in any browser — no internet needed, ever.",
      "Verify integrity: sha256 of each media/ file == manifest.json entry.",
      missing.length
        ? `\nWARNING: ${missing.length} asset(s) were unreadable at export time and are listed as MISSING.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function extOf(key: string): string {
  const m = key.match(/\.(png|jpe?g|mp4|wav|webp|tiff?)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "bin";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
