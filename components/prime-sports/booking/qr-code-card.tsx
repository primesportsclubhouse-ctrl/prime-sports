'use client';

import { Download } from "lucide-react";
import { useRef } from "react";

import { createQrPixelGrid, primeToolbarTextButtonClass } from "@/lib/prime-sports";

const GRID_SIZE = 21;
const EXPORT_PX = 512;

type QrCodeCardProps = {
  channelKey: string;
  label: string;
  account: string;
  seed: number;
  /** Real QR image URL from `payment_channels.qr_image_path` (public
   *  `payment-qr-codes` Storage bucket) — see /api/payment-channels. `null`/
   *  `undefined` (no real image uploaded yet for this channel) falls back to
   *  the decorative placeholder pixel-grid render below, the same
   *  "graceful fallback until real content exists" pattern facility media's
   *  club-crest fallback already uses — never a broken image. */
  qrImageUrl?: string | null;
};

export default function QrCodeCard({ channelKey, label, account, seed, qrImageUrl }: QrCodeCardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const grid = createQrPixelGrid(seed, GRID_SIZE);
  const slug = channelKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  async function handleSaveQr() {
    if (qrImageUrl) {
      try {
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `prime-sports-${slug}-qr${blob.type === "image/png" ? ".png" : blob.type === "image/webp" ? ".webp" : ".jpg"}`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        // Fall back to just opening it in a new tab if the fetch/blob path
        // fails for any reason (e.g. a transient network error) — still
        // lets the staff/customer get to the image.
        window.open(qrImageUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_PX;
      canvas.height = EXPORT_PX;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#f5efe6";
        ctx.fillRect(0, 0, EXPORT_PX, EXPORT_PX);
        ctx.drawImage(image, 0, 0, EXPORT_PX, EXPORT_PX);

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `prime-sports-${slug}-qr.png`;
        link.click();
      }

      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-surface-muted p-4 text-center text-foreground justify-between">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius)] border border-accent-secondary bg-[#f5efe6] p-3">
        {qrImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a Next-optimizable local/remote asset worth configuring next/image for a single small QR graphic.
          <img src={qrImageUrl} alt={label} className="h-full w-full object-contain" />
        ) : (
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            width={EXPORT_PX}
            height={EXPORT_PX}
            viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
            className="h-full w-full"
            role="img"
            aria-label={label}
          >
            <rect x={0} y={0} width={GRID_SIZE} height={GRID_SIZE} fill="#f5efe6" />
            {grid.map((row, rowIndex) =>
              row.map((filled, colIndex) =>
                filled ? (
                  <rect
                    key={`${rowIndex}-${colIndex}`}
                    x={colIndex}
                    y={rowIndex}
                    width={1}
                    height={1}
                    fill="#0b1b2b"
                  />
                ) : null,
              ),
            )}
          </svg>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="[font-family:var(--font-heading)] text-[15px] font-extrabold uppercase tracking-[0.05em]">{channelKey}</span>
        <span className="text-[11px] whitespace-pre-line opacity-60">{account}</span>
      </div>
      <button
        type="button"
        className={`${primeToolbarTextButtonClass} w-full justify-center gap-1.5`}
        onClick={handleSaveQr}
      >
        <Download size={13} aria-hidden="true" />
        Save QR
      </button>
    </div>
  );
}
