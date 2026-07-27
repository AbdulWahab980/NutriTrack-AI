"use client";

import { useActionState, useRef, useState } from "react";
import { analyzePhoto } from "@/app/scan/actions";
import type { LogState } from "@/app/log/actions";
import { DraftReview } from "@/components/log/DraftReview";
import { ScanIcon } from "@/components/icons";

/**
 * Photo food-scanning. Capture uses a file input with capture="environment",
 * which opens the native camera on iOS Safari and Android Chrome and a file
 * picker on desktop — far more reliable across platforms than getUserMedia.
 * The image is downscaled in-browser before upload to keep it small and cheap.
 */
const MAX_DIM = 1024;
const JPEG_QUALITY = 0.7;

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function ScanFlow() {
  const [state, action, analyzing] = useActionState<LogState, FormData>(
    analyzePhoto,
    {},
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrepError(null);
    setBusy(true);
    try {
      setPreview(await downscale(file));
    } catch {
      setPrepError("Couldn't read that image. Try a different photo.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPreview(null);
    setPrepError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Once analysed, hand off to the shared review/confirm step.
  if (state.draft) {
    return <DraftReview draft={state.draft} message={state.message ?? ""} onRedo={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      {/* hidden native camera/file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
        aria-hidden
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card py-12 text-center transition-colors hover:border-primary/50 disabled:opacity-60"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-primary">
            <ScanIcon className="h-7 w-7" />
          </span>
          <span className="text-sm font-semibold">
            {busy ? "Preparing…" : "Take or choose a photo"}
          </span>
          <span className="max-w-xs text-xs text-muted">
            On your phone this opens the camera. Snap your plate and I&apos;ll
            identify the food — you confirm before anything is logged.
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Meal to analyse"
            className="max-h-72 w-full rounded-2xl border border-border object-cover"
          />
          <form action={action}>
            <input type="hidden" name="image" value={preview} />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={analyzing}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {analyzing ? "Analysing photo…" : "Analyse this photo"}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={analyzing}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted"
              >
                Retake
              </button>
            </div>
          </form>
        </div>
      )}

      {(prepError || state.error) && (
        <p role="alert" className="text-sm text-warning">
          {prepError ?? state.error}
        </p>
      )}

      <p className="text-xs text-muted">
        Portion sizes from a photo are estimated, so double-check the amounts on
        the next screen. Calorie numbers still come from the food database, never
        guessed.
      </p>
    </div>
  );
}
