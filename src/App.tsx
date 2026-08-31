import { useCallback, useEffect, useState } from "react";
import { ArchiveBench } from "./components/ArchiveBench";
import { Blueprint } from "./components/Blueprint";
import { Footer, Nav } from "./components/Chrome";
import { Dashboard } from "./components/Dashboard";
import { MemoryWall } from "./components/MemoryWall";
import { Storybook } from "./components/Storybook";
import { Timeline } from "./components/Timeline";
import { ToastHost } from "./components/ui";
import { Vault } from "./components/Vault";
import { DEMO_LETTER, DEMO_PIN, IMG } from "./data/family";
import { fingerprint as makeFingerprint, sealSecret, type SealedCapsuleMeta } from "./lib/timelock";

const DEMO_LS = "ml.demo.v2";
const DEMO_SEAL_WINDOW_MS = 90_000; // the live demo capsule unlocks 90s after first visit

function seedDemo(): SealedCapsuleMeta | null {
  try {
    const raw = localStorage.getItem(DEMO_LS);
    if (raw) return JSON.parse(raw) as SealedCapsuleMeta;
  } catch {
    /* fall through to fresh seal */
  }
  return null;
}

export default function App() {
  const [demoMeta, setDemoMeta] = useState<SealedCapsuleMeta | null>(() => seedDemo());
  const [selection, setSelection] = useState<Set<string>>(new Set(["ev-1948", "ev-2019"]));

  // First visit: genuinely seal the demo letter under the demo PIN.
  useEffect(() => {
    if (demoMeta) return;
    let cancelled = false;
    (async () => {
      const payload = await sealSecret(DEMO_LETTER, DEMO_PIN);
      const fp = await makeFingerprint(payload);
      if (cancelled) return;
      const meta: SealedCapsuleMeta = {
        id: "demo-0113",
        code: "ML-0113",
        title: "A letter from Grandma Eleanor",
        recipient: "Priya Cole",
        milestone: "Sealing ceremony · live demo",
        unlockAt: Date.now() + DEMO_SEAL_WINDOW_MS,
        sealedAt: Date.now(),
        payload,
        fingerprint: fp,
        photos: [IMG.heirloom, IMG.wedding1948],
        demo: true,
      };
      localStorage.setItem(DEMO_LS, JSON.stringify(meta));
      setDemoMeta(meta);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDemoOpened = useCallback(() => {
    setDemoMeta((prev) => {
      if (!prev) return prev;
      const next = { ...prev, opened: true };
      localStorage.setItem(DEMO_LS, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setArchived = useCallback((id: string, on: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="noise-overlay" aria-hidden />
      <Nav />
      <main>
        <MemoryWall demoUnlockAt={demoMeta?.unlockAt ?? Date.now() + DEMO_SEAL_WINDOW_MS} />
        <div className="hairline shell" />
        <Dashboard demoUnlockAt={demoMeta?.unlockAt ?? Date.now() + DEMO_SEAL_WINDOW_MS} demoSealedAt={demoMeta?.sealedAt ?? Date.now()} />
        <div className="hairline shell" />
        <Storybook archiveSelected={selection.has("memoir")} onToggleArchive={setArchived} />
        <div className="hairline shell" />
        <Timeline selection={selection} onToggle={toggleSelection} />
        <div className="hairline shell" />
        <Vault demoMeta={demoMeta} onDemoOpened={markDemoOpened} />
        <div className="hairline shell" />
        <ArchiveBench selection={selection} onToggle={toggleSelection} onClear={() => setSelection(new Set())} />
        <div className="hairline shell" />
        <Blueprint />
      </main>
      <Footer />
      <ToastHost />
    </div>
  );
}
