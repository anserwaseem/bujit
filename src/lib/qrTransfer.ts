/**
 * QR transfer protocol for Bujit — device-to-device, no server.
 *
 * Payload framing:
 *
 *   BJT1|<vaultId>|<seq>|<total>|<checksumHex>|<base64Chunk>
 *
 *  - BJT1        magic + protocol version
 *  - vaultId     8 hex chars uniquely identifying this transfer session
 *  - seq         chunk index, 0-based
 *  - total       total number of chunks
 *  - checksumHex sha-256 of the full assembled binary (hex)
 *  - base64Chunk this chunk's bytes, base64 encoded
 *
 * The source device animates through frames sequentially (looping). The
 * receiver dedupes by seq index and completes when it has all `total` chunks.
 * Cycling means missed frames just come back on the next cycle.
 */
import { base64ToBytes, bytesToBase64, decodeVault, sha256Hex } from "./vault";
import type { VaultEnvelope } from "./vault";

export const FRAME_MAGIC = "BJT1";
/** Payload bytes per QR frame. ~1200 keeps QR density low enough for phone
 * cameras to lock on quickly, even in imperfect lighting. */
export const CHUNK_BYTES = 1200;

export interface FrameEncoder {
  vaultId: string;
  totalFrames: number;
  frames: string[]; // pre-encoded strings, one per chunk
}

export async function encodeFrames(bytes: Uint8Array): Promise<FrameEncoder> {
  const checksum = await sha256Hex(bytes);
  const vaultId = randomHex(4);
  const total = Math.max(1, Math.ceil(bytes.length / CHUNK_BYTES));
  const frames: string[] = [];
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_BYTES;
    const end = Math.min(start + CHUNK_BYTES, bytes.length);
    const chunk = bytes.subarray(start, end);
    const b64 = bytesToBase64(chunk);
    frames.push(`${FRAME_MAGIC}|${vaultId}|${i}|${total}|${checksum}|${b64}`);
  }
  return { vaultId, totalFrames: total, frames };
}

export interface ParsedFrame {
  vaultId: string;
  seq: number;
  total: number;
  checksum: string;
  bytes: Uint8Array;
}

export function parseFrame(raw: string): ParsedFrame | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith(FRAME_MAGIC + "|")) return null;
  // Only split on the first 5 pipes; base64 chunk may itself contain '=' but
  // never '|', so a plain split is fine, but limit=6 keeps us safe.
  const parts = raw.split("|");
  if (parts.length < 6) return null;
  const [, vaultId, seqStr, totalStr, checksum, ...rest] = parts;
  const b64 = rest.join("|");
  const seq = Number.parseInt(seqStr, 10);
  const total = Number.parseInt(totalStr, 10);
  if (
    !vaultId ||
    !checksum ||
    !Number.isFinite(seq) ||
    !Number.isFinite(total) ||
    seq < 0 ||
    total < 1 ||
    seq >= total
  ) {
    return null;
  }
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(b64);
  } catch {
    return null;
  }
  return { vaultId, seq, total, checksum, bytes };
}

/**
 * Accumulates parsed frames until the full byte payload is reconstructed.
 * Enforces a stable (vaultId, total, checksum) — frames from a different
 * session are ignored (so accidentally scanning a stray QR doesn't corrupt
 * the current transfer).
 */
export class FrameAssembler {
  private chunks: (Uint8Array | undefined)[] = [];
  private _vaultId: string | null = null;
  private _total = 0;
  private _checksum: string | null = null;
  private _received = 0;

  get vaultId(): string | null {
    return this._vaultId;
  }
  get total(): number {
    return this._total;
  }
  get received(): number {
    return this._received;
  }
  get complete(): boolean {
    return this._total > 0 && this._received === this._total;
  }

  /** Returns true if the frame was newly accepted (not a duplicate/rejected). */
  accept(raw: string): boolean {
    const f = parseFrame(raw);
    if (!f) return false;

    if (!this._vaultId) {
      this._vaultId = f.vaultId;
      this._total = f.total;
      this._checksum = f.checksum;
      this.chunks = new Array(f.total);
    } else if (
      f.vaultId !== this._vaultId ||
      f.total !== this._total ||
      f.checksum !== this._checksum
    ) {
      // frame from a different session — ignore
      return false;
    }

    if (this.chunks[f.seq]) return false; // duplicate
    this.chunks[f.seq] = f.bytes;
    this._received++;
    return true;
  }

  /** Concatenates chunks. Throws if not complete. */
  assemble(): { bytes: Uint8Array; checksum: string } {
    if (!this.complete || !this._checksum) {
      throw new Error("Cannot assemble — transfer incomplete");
    }
    let totalLen = 0;
    for (const c of this.chunks) totalLen += c ? c.length : 0;
    const out = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of this.chunks) {
      if (!c) throw new Error("Missing chunk during assemble");
      out.set(c, offset);
      offset += c.length;
    }
    return { bytes: out, checksum: this._checksum };
  }

  async assembleAndDecode(): Promise<VaultEnvelope> {
    const { bytes, checksum } = this.assemble();
    return decodeVault(bytes, checksum);
  }

  reset(): void {
    this.chunks = [];
    this._vaultId = null;
    this._total = 0;
    this._checksum = null;
    this._received = 0;
  }
}

function randomHex(nBytes: number): string {
  const b = new Uint8Array(nBytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}