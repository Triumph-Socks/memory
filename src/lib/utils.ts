import { useEffect, useRef, useState } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/** Ticking clock hook — re-renders on the given interval. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface CountdownParts {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  totalMs: number;
  past: boolean;
}

export function countdownTo(target: number, now: number): CountdownParts {
  const totalMs = target - now;
  const clamped = Math.max(0, totalMs);
  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000);
  const mins = Math.floor((clamped % 3_600_000) / 60_000);
  const secs = Math.floor((clamped % 60_000) / 1000);
  return { days, hours, mins, secs, totalMs, past: totalMs <= 0 };
}

export function formatDate(iso: string | number, withTime = false): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${m}:${pad2(s)}`;
}

export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Fires a callback exactly once when `now` crosses `target`. */
export function useExpiry(target: number | undefined, onExpire: () => void): void {
  const fired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;
  useEffect(() => {
    if (target === undefined) return;
    const id = window.setInterval(() => {
      if (!fired.current && Date.now() >= target) {
        fired.current = true;
        cb.current();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [target]);
}
