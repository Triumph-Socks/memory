import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { DECADES, EVENTS, LINES, type EventKind, type FamilyLine } from "../data/family";
import { cn } from "../lib/utils";
import { Chip, Reveal, SectionHead } from "./ui";

const KIND_LABEL: Record<EventKind, string> = { photo: "Photo", letter: "Letter", milestone: "Milestone" };
const KIND_COLOR: Record<EventKind, string> = {
  photo: "text-gold-400 border-gold-500/50",
  letter: "text-blush-300 border-blush-400/50",
  milestone: "text-lake-300 border-lake-400/50",
};

export function Timeline({
  selection,
  onToggle,
}: {
  selection: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [decade, setDecade] = useState<string>("All");
  const [line, setLine] = useState<"All" | FamilyLine>("All");
  const [kind, setKind] = useState<"All" | EventKind>("All");

  const filtered = useMemo(
    () =>
      EVENTS.filter(
        (e) =>
          (decade === "All" || e.decade === decade) &&
          (line === "All" || e.line === line) &&
          (kind === "All" || e.kind === kind),
      ),
    [decade, line, kind],
  );

  return (
    <section id="timeline" className="relative py-24">
      <p className="ghost-num pointer-events-none absolute top-24 right-0 hidden text-[18vw] lg:block" aria-hidden>
        '68
      </p>
      <div className="shell relative">
        <SectionHead
          index="03"
          eyebrow="Time-travel timeline"
          title={
            <>
              Scroll eighty-four years <em className="text-gold-400 italic">like a shoebox.</em>
            </>
          }
          lede="Every memory is decade-indexed, family-lined and story-tagged. Select anything and it joins your longevity export on the archive bench below."
          action={
            selection.size > 0 ? (
              <span className="font-mono rounded-full border border-gold-500/60 bg-gold-400/10 px-3.5 py-1.5 text-[10px] tracking-[0.18em] text-gold-300 uppercase">
                {selection.size} selected for export
              </span>
            ) : undefined
          }
        />

        {/* Filters */}
        <Reveal className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono mr-1 text-[10px] tracking-[0.2em] text-cream-dim uppercase">Decade</span>
            <Chip active={decade === "All"} onClick={() => setDecade("All")}>All</Chip>
            {DECADES.map((d) => (
              <Chip key={d} active={decade === d} onClick={() => setDecade(d)}>{d}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono mr-1 text-[10px] tracking-[0.2em] text-cream-dim uppercase">Line</span>
            <Chip tone="gold" active={line === "All"} onClick={() => setLine("All")}>All</Chip>
            {LINES.map((l) => (
              <Chip key={l} tone="gold" active={line === l} onClick={() => setLine(l)}>{l}</Chip>
            ))}
            <span className="mx-3 hidden h-4 w-px bg-moss-700 sm:block" />
            <span className="font-mono mr-1 text-[10px] tracking-[0.2em] text-cream-dim uppercase">Type</span>
            {(["photo", "letter", "milestone"] as const).map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>
            ))}
          </div>
        </Reveal>

        {/* Spine */}
        <div className="relative">
          <span className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-gold-500/50 via-moss-600 to-transparent sm:left-[11px]" aria-hidden />
          <AnimatePresence mode="popLayout">
            {filtered.map((e, i) => {
              const selected = selection.has(e.id);
              return (
                <motion.article
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.55, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative mb-5 pl-8 sm:pl-14"
                >
                  <span
                    className={cn(
                      "absolute top-6 left-0 h-[15px] w-[15px] rounded-full border-2 bg-ink-950 transition-colors sm:h-[23px] sm:w-[23px]",
                      selected ? "border-gold-400 bg-gold-400" : "border-moss-500 group-hover:border-gold-500",
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <svg viewBox="0 0 12 12" className="h-full w-full p-[3px] text-ink-950">
                        <path d="M2 6.5L4.8 9 10 3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>

                  <div
                    className={cn(
                      "card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-moss-500 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]",
                      selected && "border-gold-500/60",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {e.img ? (
                        <div className="relative h-44 shrink-0 overflow-hidden sm:h-auto sm:w-64">
                          <img
                            src={e.img}
                            alt={e.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-[2.4s] ease-out group-hover:scale-110"
                          />
                          {e.caption ? (
                            <span className="font-hand absolute bottom-2 left-3 text-lg text-paper-50 drop-shadow-md">{e.caption}</span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-44 shrink-0 items-center justify-center border-b border-moss-700/50 bg-ink-800/60 sm:h-auto sm:w-64 sm:border-r sm:border-b-0">
                          {e.kind === "letter" ? (
                            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="text-blush-400/70">
                              <rect x="6" y="10" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
                              <path d="M6 12l16 12 16-12" stroke="currentColor" strokeWidth="2" />
                              <path d="M12 27h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                            </svg>
                          ) : (
                            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="text-lake-400/70">
                              <circle cx="22" cy="22" r="15" stroke="currentColor" strokeWidth="2" />
                              <path d="M22 13v9l6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-2xl font-semibold text-gold-400">{e.year}</span>
                          <span className={cn("font-mono rounded-full border px-2 py-0.5 text-[9px] tracking-[0.16em] uppercase", KIND_COLOR[e.kind])}>
                            {KIND_LABEL[e.kind]}
                          </span>
                          <span className="font-mono text-[10px] tracking-[0.14em] text-cream-dim uppercase">{e.line} line</span>
                        </div>
                        <h3 className="font-display mt-1.5 text-xl font-medium text-cream">{e.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{e.desc}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {e.tags.map((t) => (
                            <span key={t} className="font-mono rounded-full bg-ink-700/70 px-2.5 py-0.5 text-[9px] tracking-[0.12em] text-moss-300 uppercase">
                              #{t}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => onToggle(e.id)}
                            className={cn(
                              "font-mono ml-auto rounded-full border px-3 py-1 text-[9px] tracking-[0.16em] uppercase transition-all duration-200 cursor-pointer",
                              selected
                                ? "border-gold-400 bg-gold-400 font-semibold text-ink-950"
                                : "border-moss-600 text-cream-dim hover:border-gold-500 hover:text-gold-300",
                            )}
                          >
                            {selected ? "✓ In archive" : "+ Add to archive"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div className="card ml-8 p-10 text-center sm:ml-14">
              <p className="font-display text-xl text-cream-dim italic">No memories match this filter…</p>
              <p className="font-mono mt-2 text-[11px] tracking-[0.16em] text-moss-300 uppercase">…but the archive keeps everything else safe.</p>
              <button
                type="button"
                onClick={() => {
                  setDecade("All");
                  setLine("All");
                  setKind("All");
                }}
                className="font-mono mt-4 text-[11px] tracking-[0.16em] text-gold-400 uppercase underline-offset-4 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
