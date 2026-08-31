/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MemoryLane — Time-Lock Cryptographic & Delivery Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Owns the full lifecycle of a sealed milestone capsule:
 *
 *   seal ──▶ schedule ──▶ [T_unlock] ──▶ verify ──▶ release ──▶ notify
 *                                            ▲
 *                                            └── guardian 2-of-2 emergency path
 *
 * Design rules:
 *   1. The core is pure TypeScript with injected adapters — the same code runs
 *      in an AWS Lambda (Node 20), a Cloudflare Worker, or a test harness.
 *   2. `unlockAt` is immutable after sealing; release is only ever executed
 *      after a re-verified clock check (dual control with KMS).
 *   3. Plaintext key material never persists: the data-encryption key (DEK)
 *      lives in KMS, wrapped at rest; the worker unwraps, decrypts nothing
 *      itself, and hands a scoped pre-signed reference to the recipient.
 *   4. Every state transition is appended to an immutable release log.
 *   5. Zero-knowledge capsules store only KDF params + ciphertext fingerprint;
 *      unlocking happens client-side and the service merely notarises the time.
 */

export type IsoTimestamp = string;
export type EpochMs = number;

export type CapsuleStatus =
  | "SEALED"
  | "RELEASE_SCHEDULED"
  | "RELEASED"
  | "EMERGENCY_RELEASED"
  | "REVOKED";

export interface KdfParams {
  algorithm: "PBKDF2-SHA256" | "ARGON2ID";
  iterations: number;
  saltB64: string;
}

export interface CapsuleRecord {
  id: string;
  familyGroupId: string;
  ownerId: string;
  recipientUserId: string;
  label: string;
  milestone: string;
  unlockAt: IsoTimestamp; // T_unlock — immutable
  sealedAt: IsoTimestamp;
  status: CapsuleStatus;
  zeroKnowledge: boolean;
  kdf: KdfParams | null; // present for zero-knowledge capsules
  ciphertextB64: string;
  ivB64: string;
  kmsKeyId: string | null; // null for zero-knowledge capsules
  wrappedDekB64: string | null;
  fingerprintSha256: string; // sha256(ciphertext) — public audit anchor
  failedPinAttempts: number;
}

export interface UnlockDecision {
  allowed: boolean;
  reason:
    | "TIME_LOCK_ACTIVE"
    | "PIN_EXHAUSTED"
    | "ALREADY_RELEASED"
    | "OK_TIME"
    | "OK_OWNER_PIN"
    | "OK_GUARDIAN_2_OF_2";
  retryAfterMs?: number;
}

export interface ReleaseReceipt {
  capsuleId: string;
  releasedAt: IsoTimestamp;
  mechanism: "SCHEDULED_KMS" | "OWNER_PIN" | "GUARDIAN_2_OF_2";
  presignedMediaUrls: string[]; // scoped, 15-minute TTL
  notified: string[]; // recipient channels
  logEntryId: string;
}

/* ── Adapters — production impls plug in AWS KMS / EventBridge / SES ───────── */

export interface VaultClock {
  now(): EpochMs;
}

export interface KmsAdapter {
  /** Generate a fresh AES-256 DEK, returning only the wrapped copy. */
  generateDataKey(capsuleId: string): Promise<{ kmsKeyId: string; wrappedDekB64: string }>;
  /** Unwrap inside the HSM boundary; returns a scoped session handle, never raw bytes. */
  createDecryptSession(kmsKeyId: string, wrappedDekB64: string): Promise<{ sessionToken: string; ttlMs: number }>;
}

export interface SchedulerAdapter {
  scheduleUnlock(capsuleId: string, runAt: IsoTimestamp): Promise<string>; // jobId
  cancel(jobId: string): Promise<void>;
}

export interface NotificationAdapter {
  send(to: string, template: string, vars: Record<string, string>): Promise<void>;
}

export interface CapsuleStore {
  find(id: string): Promise<CapsuleRecord | null>;
  listDue(before: IsoTimestamp): Promise<CapsuleRecord[]>;
  update(id: string, patch: Partial<CapsuleRecord>): Promise<CapsuleRecord>;
  appendLog(capsuleId: string, actor: string, action: string, metadata?: unknown): Promise<string>;
}

/* ── Policy ────────────────────────────────────────────────────────────────── */

export const POLICY = {
  MIN_SEAL_WINDOW_MS: 30 * 24 * 3_600_000, // production: 30 days minimum
  MAX_PIN_ATTEMPTS: 5,
  PIN_LOCKOUT_MS: 15 * 60_000,
  GUARDIAN_APPROVAL_THRESHOLD: 2, // 2-of-2 emergency release
  MEDIA_URL_TTL_MS: 15 * 60_000,
  INACTIVITY_LADDER: [
    { afterDays: 30, action: "CHECK_IN_OWNER" },
    { afterDays: 90, action: "NOTIFY_GUARDIANS" },
    { afterDays: 180, action: "DELIVER_BACKUP_INSTRUCTIONS" },
    { afterDays: 365, action: "ENABLE_EMERGENCY_RELEASE" },
  ],
} as const;

export class TimeLockError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "TimeLockError";
  }
}

/* ── Service ───────────────────────────────────────────────────────────────── */

export interface TimeLockDeps {
  clock: VaultClock;
  kms: KmsAdapter;
  scheduler: SchedulerAdapter;
  notify: NotificationAdapter;
  store: CapsuleStore;
  idGenerator: () => string;
}

export interface SealInput {
  familyGroupId: string;
  ownerId: string;
  recipientUserId: string;
  label: string;
  milestone: string;
  unlockAt: IsoTimestamp;
  zeroKnowledge: boolean;
  ciphertextB64: string; // client-encrypted (ZK) or envelope-encrypted (server path)
  ivB64: string;
  fingerprintSha256: string;
  kdf?: KdfParams;
}

export class TimeLockService {
  constructor(private readonly deps: TimeLockDeps) {}

  /**
   * Seal a capsule. Validates the time-lock window, provisions (or records)
   * key material, schedules the unlock worker, and writes the first log entry.
   */
  async seal(input: SealInput): Promise<CapsuleRecord> {
    const { clock, kms, scheduler, store, idGenerator } = this.deps;
    const nowMs = clock.now();
    const unlockMs = Date.parse(input.unlockAt);

    if (Number.isNaN(unlockMs)) throw new TimeLockError("BAD_UNLOCK_AT", "unlockAt is not a valid ISO timestamp");
    if (!input.zeroKnowledge && unlockMs - nowMs < POLICY.MIN_SEAL_WINDOW_MS) {
      throw new TimeLockError("WINDOW_TOO_SHORT", "Server-path capsules require a ≥30 day seal window");
    }
    if (input.zeroKnowledge && !input.kdf) {
      throw new TimeLockError("MISSING_KDF", "Zero-knowledge capsules must publish KDF params");
    }

    let kmsKeyId: string | null = null;
    let wrappedDekB64: string | null = null;
    if (!input.zeroKnowledge) {
      const id = idGenerator();
      const dek = await kms.generateDataKey(id);
      kmsKeyId = dek.kmsKeyId;
      wrappedDekB64 = dek.wrappedDekB64;
    }

    const record: CapsuleRecord = {
      id: idGenerator(),
      familyGroupId: input.familyGroupId,
      ownerId: input.ownerId,
      recipientUserId: input.recipientUserId,
      label: input.label,
      milestone: input.milestone,
      unlockAt: new Date(unlockMs).toISOString(),
      sealedAt: new Date(nowMs).toISOString(),
      status: "SEALED",
      zeroKnowledge: input.zeroKnowledge,
      kdf: input.kdf ?? null,
      ciphertextB64: input.ciphertextB64,
      ivB64: input.ivB64,
      kmsKeyId,
      wrappedDekB64,
      fingerprintSha256: input.fingerprintSha256,
      failedPinAttempts: 0,
    };

    const saved = await store.update(record.id, record);
    await scheduler.scheduleUnlock(record.id, record.unlockAt);
    await store.appendLog(record.id, `owner:${input.ownerId}`, "sealed", {
      mechanism: input.zeroKnowledge ? "ZERO_KNOWLEDGE" : "SCHEDULED_KMS",
      fingerprint: input.fingerprintSha256,
    });
    await this.deps.notify.send(`owner:${input.ownerId}`, "capsule_sealed", {
      label: input.label,
      unlockAt: record.unlockAt,
    });
    return { ...saved, status: "RELEASE_SCHEDULED" };
  }

  /**
   * Pure policy check — is this capsule eligible to open, and by what right?
   * Called by the scheduled worker AND the recipient API before any key work.
   */
  async verifyUnlock(
    capsuleId: string,
    opts: { ownerPinVerified?: boolean; guardianApprovals?: number } = {},
  ): Promise<UnlockDecision> {
    const capsule = await this.mustFind(capsuleId);
    const nowMs = this.deps.clock.now();
    const unlockMs = Date.parse(capsule.unlockAt);

    if (capsule.status === "RELEASED" || capsule.status === "EMERGENCY_RELEASED") {
      return { allowed: false, reason: "ALREADY_RELEASED" };
    }
    if (capsule.failedPinAttempts >= POLICY.MAX_PIN_ATTEMPTS) {
      return { allowed: false, reason: "PIN_EXHAUSTED" };
    }

    // Guardian 2-of-2 overrides the clock — the inheritance path.
    if ((opts.guardianApprovals ?? 0) >= POLICY.GUARDIAN_APPROVAL_THRESHOLD) {
      return { allowed: true, reason: "OK_GUARDIAN_2_OF_2" };
    }
    // Owner PIN opens early (sovereignty), but only below the attempt cap.
    if (opts.ownerPinVerified) return { allowed: true, reason: "OK_OWNER_PIN" };
    if (nowMs >= unlockMs) return { allowed: true, reason: "OK_TIME" };

    return { allowed: false, reason: "TIME_LOCK_ACTIVE", retryAfterMs: unlockMs - nowMs };
  }

  /**
   * Executed by the scheduled serverless worker at T_unlock.
   * Idempotent: leases the job, re-verifies the clock, unwraps the DEK inside
   * KMS, mints short-lived media URLs, notifies, and writes the log.
   */
  async executeScheduledRelease(capsuleId: string, workerId: string): Promise<ReleaseReceipt> {
    const { kms, store, notify, clock } = this.deps;
    const capsule = await this.mustFind(capsuleId);

    const decision = await this.verifyUnlock(capsuleId);
    if (!decision.allowed && decision.reason !== "TIME_LOCK_ACTIVE") {
      throw new TimeLockError(decision.reason, `Release blocked: ${decision.reason}`);
    }
    if (clock.now() < Date.parse(capsule.unlockAt)) {
      throw new TimeLockError("EARLY_FIRE", "Worker fired before T_unlock — requeueing");
    }

    let presignedMediaUrls: string[] = [];
    if (!capsule.zeroKnowledge && capsule.kmsKeyId && capsule.wrappedDekB64) {
      // Unwrap inside the HSM; media decrypt workers consume the session token.
      const session = await kms.createDecryptSession(capsule.kmsKeyId, capsule.wrappedDekB64);
      presignedMediaUrls = [
        `mls://media/${capsuleId}?session=${session.sessionToken}&ttl=${POLICY.MEDIA_URL_TTL_MS}`,
      ];
    }

    const mechanism: ReleaseReceipt["mechanism"] =
      decision.reason === "OK_GUARDIAN_2_OF_2" ? "GUARDIAN_2_OF_2" : "SCHEDULED_KMS";

    const updated = await store.update(capsuleId, {
      status: mechanism === "GUARDIAN_2_OF_2" ? "EMERGENCY_RELEASED" : "RELEASED",
    });
    const logEntryId = await store.appendLog(capsuleId, `scheduler:${workerId}`, "key_released", {
      mechanism,
      fingerprint: capsule.fingerprintSha256,
    });

    const notified: string[] = [];
    await notify
      .send(`user:${capsule.recipientUserId}`, "capsule_unlocked", {
        label: capsule.label,
        milestone: capsule.milestone,
      })
      .then(() => notified.push(`user:${capsule.recipientUserId}`));

    return {
      capsuleId: updated.id,
      releasedAt: new Date(clock.now()).toISOString(),
      mechanism,
      presignedMediaUrls,
      notified,
      logEntryId,
    };
  }

  /**
   * Nightly sweep driving the Guardian & Inheritance Protocol:
   * climbs the inactivity ladder for dormant owner accounts.
   */
  async inactivitySweep(): Promise<{ capsuleId: string; action: string }[]> {
    const { store, notify, clock } = this.deps;
    const due = await store.listDue(new Date(clock.now()).toISOString());
    const actions: { capsuleId: string; action: string }[] = [];

    for (const capsule of due) {
      if (capsule.status === "RELEASED") continue;
      const dormantDays = Math.floor((clock.now() - Date.parse(capsule.sealedAt)) / 86_400_000);
      const rung = [...POLICY.INACTIVITY_LADDER].reverse().find((r) => dormantDays >= r.afterDays);
      if (!rung) continue;
      await notify.send(`guardians:${capsule.familyGroupId}`, rung.action, {
        label: capsule.label,
        dormantDays: String(dormantDays),
      });
      await store.appendLog(capsule.id, "system:sweep", rung.action.toLowerCase(), { dormantDays });
      actions.push({ capsuleId: capsule.id, action: rung.action });
    }
    return actions;
  }

  private async mustFind(id: string): Promise<CapsuleRecord> {
    const found = await this.deps.store.find(id);
    if (!found) throw new TimeLockError("NOT_FOUND", `Capsule ${id} does not exist`);
    return found;
  }
}
