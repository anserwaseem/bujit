
# Device-to-Device Transfer via QR — No Server, No Cloud

## Short Answer

**Yes, it's possible, and it's the right shape for Bujit's ethos.** The only real constraint is data size: one QR code holds at most ~2.9 KB of binary. A real Bujit vault (transactions + goals + recurring + settings) will exceed that within a few months of use. The solution is **animated QR** — the source device cycles through a sequence of QR frames, the destination device's camera reads them until it has all the pieces.

This is a well-trodden pattern (Bitcoin hardware wallets, Signal contact transfer, `txqr`, `qrloop`) and works fully offline, screen-to-camera. No network, no relay, no accounts.

## What This Feature Is (and Isn't)

**Is:** A one-shot **migration / handoff** tool. Move your data from Phone A to Phone B (new phone, spouse's phone, laptop-in-browser).

**Is not:** Continuous multi-device sync. If both devices keep editing after transfer, they diverge — that's the tradeoff for zero infrastructure. We'll handle this with clear UX: the receiving device can **merge** or **replace**, and we'll surface an obvious warning when both devices have been edited since the last transfer.

For 90% of the pain (new phone, backup restore, one-time share with spouse), this is enough. For continuous two-way sync, that would be a separate future decision.

## User Flow

**Source device (has data):**
1. Settings → "Transfer to another device"
2. Screen shows: total items, estimated transfer time, and a big animated QR code cycling frames (~5-10 fps)
3. Progress indicator: "Frame 3 of 24 — keep camera pointed"

**Destination device (empty or existing):**
1. Settings → "Receive from another device" → camera opens
2. Point at source screen. As frames are captured, a progress ring fills ("18 of 24 unique frames")
3. Once all frames captured + checksum verified, show a preview: "Received 847 transactions, 12 goals, 3 recurring rules. What do you want to do?"
   - **Replace everything on this device** (default for empty device)
   - **Merge with existing data** (default when device has data — dedupes by transaction ID)
   - **Cancel**
4. Confirm → data lands in localStorage, done.

**If the receiver already has data**, we also show a subtle post-merge summary ("214 new, 12 already existed, 0 conflicts").

## Why This Works Technically

### Data size reality check

A Bujit transaction serialized as compact JSON is roughly 80–120 bytes. Compressed with gzip/deflate, closer to 30–50 bytes amortized. Rough capacity:

| Dataset | Raw | Compressed | QR frames (2 KB each) |
|---|---|---|---|
| 100 transactions + goals | ~12 KB | ~4 KB | 2 frames |
| 1000 transactions | ~110 KB | ~35 KB | 18 frames |
| 5000 transactions (heavy user, several years) | ~550 KB | ~170 KB | 85 frames |

At 8 fps with a fountain-code scheme (see below), even 85 frames transfers in **~15–25 seconds** of holding the phones together. Acceptable.

### Frame protocol: fountain codes, not sequential

Naive approach: frame 1, frame 2, ..., frame N in a loop. Problem: if the camera misses frame 7, receiver has to wait a full cycle for it to come back around. Slow and frustrating.

Better approach: **fountain / LT codes** (Luby Transform). Each QR frame is a random XOR combination of source chunks. The receiver only needs slightly more than N frames total, regardless of which specific ones it captured. This is exactly what `txqr` and Bitcoin's animated QR standards (BCUR / UR) do. Every frame the receiver sees adds information; nothing is wasted.

Practical impact: you don't have to hold the phones perfectly still or wait for a specific frame — as long as camera keeps seeing new frames, you converge.

### Encoding

- Vault JSON → gzip → binary → fountain-encode → each chunk becomes a QR frame with a small header `{ vaultId, totalChunks, chunkSeed, checksum }`
- Final assembled blob validated by SHA-256 checksum before being written to localStorage
- All in-browser: `pako` for gzip, a small fountain-code lib, `qrcode` for encoding, `jsQR` or `@zxing/browser` for decoding, plus native `BarcodeDetector` where available (faster on Android)

### Camera access

Modern mobile browsers support `getUserMedia` in PWAs. iOS Safari and Android Chrome both work. On iOS, the app must be added to the home screen to get reliable camera permissions — Bujit is already a PWA so this is fine.

## Security & Privacy Considerations

Even though it's local, the data is briefly "visible" on-screen as QR codes:

- **Shoulder-surfing:** the QR frames are theoretically photographable by a third camera. Mitigation: brief on-screen warning ("This QR contains your financial data. Only show it to a device you own."). Optional passphrase encryption on the source device (user types a passphrase, receiver types the same passphrase) as a paranoid mode. Default off since it adds friction; on-by-default only if user has enabled "privacy mode" already.
- **Bystander screenshots:** the animated frames cycle fast enough that a single photo captures only a fraction. Not perfect, but a meaningful friction.
- **No key material to protect:** unlike the earlier E2E-encrypted-relay proposal, there's no persistent shared secret. Nothing to leak later.

## What We're Explicitly Not Building

- ❌ Any server, edge function, or Lovable Cloud table
- ❌ WebRTC / Bluetooth / WebUSB — even though peer-to-peer, WebRTC needs a signaling server (violates spirit)
- ❌ Google Sheets or Drive sync as the transfer channel
- ❌ Continuous background sync between devices
- ❌ Account creation, pairing phrases, recovery codes

## Implementation Plan

Broken into small, shippable steps. Each is roughly one focused session.

### Step 1 — Vault serialization + integrity
- `src/lib/vault.ts`: `exportVault()` gathers all `bujit_*` localStorage keys → compact JSON → gzip via `pako` → returns `Uint8Array` + SHA-256 checksum
- `importVault(bytes, mode: 'replace' | 'merge')`: validates checksum, ungzips, parses, and writes back to storage
- Merge logic: dedupe by transaction `id`, goal `id`, recurring rule `id`; last-write-wins for edits by `updatedAt` if present, else source wins for new items
- Unit tests: round-trip export/import, merge dedupe, corrupted checksum rejection

### Step 2 — Fountain-code framing + QR generation
- `src/lib/qrTransfer.ts`: chunker that splits gzipped vault into ~1.5 KB pieces, fountain-encodes into frames using an LT-code scheme (small hand-rolled, or `luby-transform` npm), wraps each in a header envelope
- Frame envelope: `{ v: 1, id: vaultId, n: totalChunks, seed, data: base64 }`
- Encoder produces an infinite iterator of QR-friendly strings

### Step 3 — Source screen: "Transfer to another device"
- New route/modal `src/components/TransferOutScreen.tsx`
- Renders animated QR at ~8 fps via `qrcode` lib into a canvas
- Shows: vault stats (X transactions, Y goals), progress hint, warning banner
- Pauses when tab hidden (battery)

### Step 4 — Destination screen: "Receive from another device"
- `src/components/TransferInScreen.tsx`
- Camera preview via `getUserMedia` with rear-camera preference on mobile
- Frame decoding using `BarcodeDetector` where supported, `jsQR` fallback
- Fountain decoder accumulates chunks until vault is reconstructable
- Progress ring showing unique-frames-received / needed
- On completion: preview + Replace/Merge/Cancel dialog

### Step 5 — Settings integration + polish
- Add both entry points to Settings under a new "Transfer data" section
- Post-transfer toast summary
- Handle "camera denied" and "no camera" fallbacks (offer paste-from-file as an emergency escape, using the same exported blob written to a `.bujit` file — reuses vault serialization)
- Written test coverage on `vault.ts` and `qrTransfer.ts` (framing round-trip, fountain decode with dropped frames)

### Step 6 — Optional: passphrase mode
- If time allows: checkbox on source ("Encrypt with passphrase"), receiver prompted for same passphrase before merge preview
- AES-GCM with PBKDF2-derived key, no crypto surface outside browser SubtleCrypto

## Dependencies to Add

Small, well-maintained:
- `pako` (gzip in browser, ~45 KB)
- `qrcode` (QR encoding, ~50 KB)
- `jsQR` **or** `@zxing/browser` (QR decoding fallback for browsers without `BarcodeDetector`)
- No new services, no backend, no accounts

## Risks & Honest Caveats

1. **iOS camera in PWA** can be finicky. We should test on a real iPhone before shipping. Fallback: "paste-from-file" mode using the same exported blob saved as `.bujit` and shared via iOS share sheet — no camera needed.
2. **Very large vaults** (>200 KB compressed, i.e. tens of thousands of transactions) will take a minute+. We'll warn users and offer the `.bujit` file fallback for those cases.
3. **Merge semantics on edits.** Editing the same transaction on both devices between transfers is an edge case. Current plan: last-write-wins by `updatedAt`. We may want to surface a "N conflicts resolved" line in the post-merge summary later.
4. **This does not solve continuous multi-device use.** If you want to log on phone AND laptop daily, you'll still be re-transferring periodically. That's the honest tradeoff of zero infrastructure. Most users transfer once (new phone) and never again.

## What Success Looks Like

- New-phone migration takes under a minute, works fully airplane-mode on both devices
- No new backend, no accounts, no keys to remember
- Merge mode makes household sharing viable (spouse's initial import from your phone)
- The `.bujit` file fallback covers edge cases (camera issues, huge vaults, sharing over email/AirDrop for the paranoid)

Ready to build once you approve.
