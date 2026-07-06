import { useEffect, useMemo, useRef, useState } from "react";
import { X, Download, ShieldAlert, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { exportVault, type VaultEnvelope, bytesToBase64 } from "@/lib/vault";
import { encodeFrames, type FrameEncoder } from "@/lib/qrTransfer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TransferOutScreenProps {
  onClose: () => void;
}

/** Framerate for cycling QR frames. Lower = easier for camera to lock. */
const FRAME_INTERVAL_MS = 180; // ~5.5 fps

export function TransferOutScreen({ onClose }: TransferOutScreenProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [encoder, setEncoder] = useState<FrameEncoder | null>(null);
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(null);
  const [byteLen, setByteLen] = useState(0);
  const [checksum, setChecksum] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const rawBytesRef = useRef<Uint8Array | null>(null);

  // Build the vault once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await exportVault();
        if (cancelled) return;
        rawBytesRef.current = blob.bytes;
        setEnvelope(blob.envelope);
        setByteLen(blob.bytes.length);
        setChecksum(blob.checksum);
        const enc = await encodeFrames(blob.bytes);
        if (cancelled) return;
        setEncoder(enc);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cycle frames
  useEffect(() => {
    if (!encoder) return;
    let raf = 0;
    let last = performance.now();
    let idx = 0;

    const tick = (now: number) => {
      if (document.hidden) {
        // pause when tab hidden to save battery
        last = now;
      } else if (now - last >= FRAME_INTERVAL_MS) {
        idx = (idx + 1) % encoder.totalFrames;
        setCurrentFrame(idx);
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [encoder]);

  // Render current QR frame to canvas
  useEffect(() => {
    if (!encoder || !canvasRef.current) return;
    const frame = encoder.frames[currentFrame];
    QRCode.toCanvas(canvasRef.current, frame, {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 320,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch((err) => {
      console.error("QR render failed", err);
    });
  }, [encoder, currentFrame]);

  const stats = useMemo(() => {
    if (!envelope) return null;
    return {
      transactions: envelope.transactions.length,
      goals: envelope.goals.length,
      recurring: envelope.recurring.length,
      paymentModes: envelope.paymentModes.length,
    };
  }, [envelope]);

  const estSeconds = encoder
    ? Math.max(3, Math.round((encoder.totalFrames * FRAME_INTERVAL_MS) / 1000))
    : 0;

  const handleDownloadFile = () => {
    if (!rawBytesRef.current || !envelope) return;
    // Wrap the raw bytes + checksum in a tiny JSON so importers know what they have
    const wrapper = {
      magic: "bujit-vault",
      v: 1,
      checksum,
      bytes: bytesToBase64(rawBytesRef.current),
    };
    const blob = new Blob([JSON.stringify(wrapper)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `bujit-vault-${date}.bujit`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Vault saved",
      description: "Import this file on your other device.",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-scale-in max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Transfer to another device</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show this QR to your other device. No server, no cloud.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              This QR contains your financial data. Only show it to a device you
              own or trust.
            </div>
          </div>

          {/* QR canvas */}
          <div className="flex items-center justify-center">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              {encoder ? (
                <canvas
                  ref={canvasRef}
                  className="block"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="w-[320px] h-[320px] flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {encoder && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Frame {currentFrame + 1} of {encoder.totalFrames}
                </span>
                <span>~{estSeconds}s per cycle</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${((currentFrame + 1) / encoder.totalFrames) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Keep this screen on until the other device says "Received".
                Frames loop, so missed ones come back around.
              </p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatCell label="Transactions" value={stats.transactions} />
              <StatCell label="Goals" value={stats.goals} />
              <StatCell label="Recurring" value={stats.recurring} />
              <StatCell label="Payment modes" value={stats.paymentModes} />
              <div
                className={cn(
                  "col-span-2 p-2 rounded-lg bg-muted/50 text-muted-foreground text-center"
                )}
              >
                {(byteLen / 1024).toFixed(1)} KB compressed · checksum {" "}
                <span className="font-mono">{checksum.slice(0, 8)}…</span>
              </div>
            </div>
          )}

          {/* File fallback */}
          <div className="border-t border-border pt-4">
            <button
              onClick={handleDownloadFile}
              disabled={!envelope}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors",
                envelope
                  ? "bg-muted text-foreground hover:bg-muted/80"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4" />
              Save as .bujit file instead
            </button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              For camera trouble or very large vaults. Share via AirDrop, email,
              or messaging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}