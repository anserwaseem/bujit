import { useEffect, useRef, useState } from "react";
import { X, Camera, Upload, CheckCircle2, Loader2 } from "lucide-react";
import jsQR from "jsqr";
import { FrameAssembler } from "@/lib/qrTransfer";
import {
  decodeVault,
  importVault,
  base64ToBytes,
  type ImportSummary,
  type VaultEnvelope,
} from "@/lib/vault";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TransferInScreenProps {
  onImported: () => void;
  onClose: () => void;
}

type Phase = "idle" | "scanning" | "preview" | "done";

export function TransferInScreen({ onImported, onClose }: TransferInScreenProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assemblerRef = useRef<FrameAssembler>(new FrameAssembler());
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [received, setReceived] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("merge");
  const [importing, setImporting] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startScanning = async () => {
    setError(null);
    assemblerRef.current.reset();
    setReceived(0);
    setTotal(0);
    setEnvelope(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("scanning");
      scanLoop();
    } catch (e) {
      setError(
        "Camera unavailable: " +
          (e as Error).message +
          ". Try importing a .bujit file instead."
      );
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const step = () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        const accepted = assemblerRef.current.accept(code.data);
        if (accepted) {
          setReceived(assemblerRef.current.received);
          setTotal(assemblerRef.current.total);
          if (assemblerRef.current.complete) {
            handleComplete();
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const handleComplete = async () => {
    stopCamera();
    try {
      const env = await assemblerRef.current.assembleAndDecode();
      setEnvelope(env);
      setPhase("preview");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const wrapper = JSON.parse(text) as {
        magic?: string;
        v?: number;
        checksum?: string;
        bytes?: string;
      };
      if (wrapper.magic !== "bujit-vault" || !wrapper.bytes) {
        throw new Error("Not a valid .bujit file");
      }
      const bytes = base64ToBytes(wrapper.bytes);
      const env = await decodeVault(bytes, wrapper.checksum);
      setEnvelope(env);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (!envelope) return;
    setImporting(true);
    try {
      const s = importVault(envelope, mode);
      setSummary(s);
      setPhase("done");
      toast({
        title: "Data imported",
        description:
          mode === "replace"
            ? `Replaced with ${s.transactions.total} transactions.`
            : `Added ${s.transactions.added} new, skipped ${s.transactions.skipped}.`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleDone = () => {
    onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl animate-scale-in max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Receive from another device</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Point your camera at the other device's QR, or import a .bujit file.
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".bujit,application/json"
            onChange={handleFileChange}
            className="absolute -z-10 opacity-0 pointer-events-none"
            aria-hidden="true"
          />

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {phase === "idle" && (
            <div className="space-y-3">
              <button
                onClick={startScanning}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium
                           bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Camera className="w-5 h-5" />
                Scan QR from other device
              </button>
              <button
                onClick={handleFilePick}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium
                           bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Import .bujit file
              </button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Everything happens on this device. No network, no accounts.
              </p>
            </div>
          )}

          {phase === "scanning" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Progress overlay */}
                <div className="absolute bottom-3 inset-x-3 p-2 rounded-lg bg-black/60 text-white text-xs backdrop-blur-sm">
                  {total > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span>
                          {received} / {total} frames
                        </span>
                        <span>{Math.round((received / total) * 100)}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(received / total) * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      Point camera at the animated QR…
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setPhase("idle");
                }}
                className="w-full py-2.5 rounded-lg font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {phase === "preview" && envelope && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Received successfully
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <div>Transactions</div>
                  <div className="text-right font-medium text-foreground">
                    {envelope.transactions.length}
                  </div>
                  <div>Goals</div>
                  <div className="text-right font-medium text-foreground">
                    {envelope.goals.length}
                  </div>
                  <div>Recurring</div>
                  <div className="text-right font-medium text-foreground">
                    {envelope.recurring.length}
                  </div>
                  <div>Payment modes</div>
                  <div className="text-right font-medium text-foreground">
                    {envelope.paymentModes.length}
                  </div>
                  <div>From</div>
                  <div className="text-right font-medium text-foreground">
                    {new Date(envelope.ts).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">
                  How should we import?
                </div>
                <div className="space-y-2">
                  <ModeOption
                    active={mode === "merge"}
                    onClick={() => setMode("merge")}
                    label="Merge with existing data"
                    hint="Adds new items, keeps existing ones. Incoming wins on ID conflicts."
                  />
                  <ModeOption
                    active={mode === "replace"}
                    onClick={() => setMode("replace")}
                    label="Replace everything on this device"
                    hint="Wipes current data and restores the received vault. Cannot be undone."
                    danger
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEnvelope(null);
                    setPhase("idle");
                  }}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg font-medium transition-opacity",
                    "bg-primary text-primary-foreground hover:opacity-90",
                    importing && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : mode === "replace" ? (
                    "Replace"
                  ) : (
                    "Merge"
                  )}
                </button>
              </div>
            </div>
          )}

          {phase === "done" && summary && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 font-medium mb-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Import complete
                </div>
                <SummaryRow label="Transactions" data={summary.transactions} />
                <SummaryRow label="Goals" data={summary.goals} />
                <SummaryRow label="Recurring" data={summary.recurring} />
                <SummaryRow
                  label="Payment modes"
                  data={summary.paymentModes}
                />
              </div>
              <button
                onClick={handleDone}
                className="w-full py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  label,
  hint,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        active
          ? danger
            ? "border-destructive bg-destructive/10"
            : "border-primary bg-primary/10"
          : "border-border hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "text-sm font-medium",
          active && danger && "text-destructive"
        )}
      >
        {label}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
    </button>
  );
}

function SummaryRow({
  label,
  data,
}: {
  label: string;
  data: { added: number; skipped: number; total: number };
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        <span className="text-primary">+{data.added}</span>
        {data.skipped > 0 && (
          <span className="text-muted-foreground"> · {data.skipped} existed</span>
        )}
        <span className="text-muted-foreground"> · {data.total} total</span>
      </span>
    </div>
  );
}