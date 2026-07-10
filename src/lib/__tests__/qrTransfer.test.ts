import { describe, it, expect, beforeEach } from "vitest";
import {
  encodeFrames,
  parseFrame,
  FrameAssembler,
  CHUNK_BYTES,
  FRAME_MAGIC,
} from "../qrTransfer";
import { exportVault, decodeVault } from "../vault";

describe("qrTransfer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("encodes a small payload into at least one frame", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const enc = await encodeFrames(bytes);
    expect(enc.totalFrames).toBe(1);
    expect(enc.frames[0].startsWith(FRAME_MAGIC + "|")).toBe(true);
  });

  it("splits large payloads across multiple frames", async () => {
    const bytes = new Uint8Array(CHUNK_BYTES * 3 + 50).fill(7);
    const enc = await encodeFrames(bytes);
    expect(enc.totalFrames).toBe(4);
  });

  it("parseFrame rejects malformed frames", () => {
    expect(parseFrame("nope")).toBeNull();
    expect(parseFrame("BJT1|x|1|2")).toBeNull();
    expect(parseFrame("")).toBeNull();
  });

  it("FrameAssembler reconstructs bytes from all frames in order", async () => {
    const original = new Uint8Array(CHUNK_BYTES * 2 + 17);
    for (let i = 0; i < original.length; i++) original[i] = i & 0xff;
    const enc = await encodeFrames(original);
    const asm = new FrameAssembler();
    for (const f of enc.frames) expect(asm.accept(f)).toBe(true);
    expect(asm.complete).toBe(true);
    const { bytes } = asm.assemble();
    expect(bytes.length).toBe(original.length);
    expect(Array.from(bytes)).toEqual(Array.from(original));
  });

  it("FrameAssembler reconstructs from out-of-order + duplicate frames", async () => {
    const original = new Uint8Array(CHUNK_BYTES * 3).fill(9);
    const enc = await encodeFrames(original);
    const asm = new FrameAssembler();
    // shuffled + duplicated
    const order = [2, 0, 2, 1, 0];
    for (const i of order) asm.accept(enc.frames[i]);
    expect(asm.received).toBe(enc.totalFrames);
    expect(asm.complete).toBe(true);
    const { bytes } = asm.assemble();
    expect(bytes.length).toBe(original.length);
  });

  it("FrameAssembler ignores frames from a different session", async () => {
    const a = await encodeFrames(new Uint8Array([1, 2, 3]));
    const b = await encodeFrames(new Uint8Array([4, 5, 6]));
    const asm = new FrameAssembler();
    expect(asm.accept(a.frames[0])).toBe(true);
    // second session has different vaultId+checksum
    expect(asm.accept(b.frames[0])).toBe(false);
  });

  it("end-to-end: export vault → frames → reassemble → decodeVault", async () => {
    localStorage.setItem(
      "bujit_transactions",
      JSON.stringify([
        {
          id: "t1",
          date: "2026-01-01T10:00:00.000Z",
          reason: "coffee",
          amount: 200,
          paymentMode: "C",
          type: "expense",
          necessity: "want",
        },
      ])
    );
    const blob = await exportVault();
    const enc = await encodeFrames(blob.bytes);
    const asm = new FrameAssembler();
    for (const f of enc.frames) asm.accept(f);
    const { bytes, checksum } = asm.assemble();
    const env = await decodeVault(bytes, checksum);
    expect(env.transactions).toHaveLength(1);
    expect(env.transactions[0].reason).toBe("coffee");
  });
});