'use client';

import { useEffect, useRef, useState } from "react";

import {
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeSectionHeaderRowClass,
  primeSectionTitleClass,
  primeSurfacePanelClass,
} from "@/lib/prime-sports";

type UploadState = {
  name: string;
  meta: string;
};

export default function CheckoutClient() {
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reference, setReference] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ocrTimerRef.current) {
        clearTimeout(ocrTimerRef.current);
      }

      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  function startOcrSimulation(file: File) {
    if (ocrTimerRef.current) {
      clearTimeout(ocrTimerRef.current);
    }

    setUpload({
      name: file.name || "receipt-screenshot.png",
      meta: `${file.size ? `${Math.round(file.size / 1024)}KB` : "[File size]"} · ${file.type || "image/png"}`,
    });
    setReference("");
    setIsReading(true);
    setIsDone(false);

    ocrTimerRef.current = setTimeout(() => {
      const nextReference = `PRS-${Math.floor(100000 + Math.random() * 900000)}`;
      setReference(nextReference);
      setIsReading(false);
      setIsDone(true);
      setIsFlashing(true);

      flashTimerRef.current = setTimeout(() => {
        setIsFlashing(false);
      }, 600);
    }, 2200);
  }

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    startOcrSimulation(file);
  }

  const containerClassName = `${primeContainerClasses.default} grid grid-cols-[1.1fr_1fr] gap-8 py-10 max-[980px]:grid-cols-1`;
  const panelClassName = primeSurfacePanelClass;

  return (
    <section className={containerClassName} data-od-id="checkout-payment">
      <div className={panelClassName}>
          <div className={primeSectionHeaderRowClass}>
            <div>
              <h2 className={primeSectionTitleClass}>Payment Channels</h2>
              <p className="mt-1.5 text-sm opacity-65">
                Scan any QR with your banking or e-wallet app. Account details are shown below each code.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
            {[
              { key: "GCash", label: "QR · GCash", account: "[Account name]\n[Account no.]" },
              { key: "Maya", label: "QR · Maya", account: "[Account name]\n[Account no.]" },
              { key: "Bank Transfer", label: "QR · Bank", account: "[Bank name]\n[Account no.]" },
            ].map((channel) => (
              <div key={channel.key} className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-surface-muted p-4 text-center">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius)] border border-accent-secondary bg-[repeating-linear-gradient(45deg,var(--surface)_0_6px,var(--canvas)_6px_12px)]">
                  <div className="absolute inset-3 rounded-[2px] border-[10px] border-transparent [background:linear-gradient(var(--foreground)_12%,transparent_12%_88%,var(--foreground)_88%)_0_0/100%_100%,linear-gradient(90deg,var(--foreground)_12%,transparent_12%_88%,var(--foreground)_88%)_0_0/100%_100%] opacity-85 [mask-composite:exclude] [-webkit-mask:linear-gradient(var(--background),var(--background))_content-box,linear-gradient(var(--background),var(--background))] [-webkit-mask-composite:xor]" />
                  <span className="relative text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/50">{channel.label}</span>
                </div>
                <span className="font-serif text-[15px] font-bold">{channel.key}</span>
                <span className="text-[11px] whitespace-pre-line opacity-60">
                  {channel.account}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[var(--radius)] border border-border bg-canvas p-4 text-foreground shadow-[var(--shadow-sm)]" data-od-id="account-callout">
            <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Corporate Account Details</h4>
            <div className="flex items-center justify-between gap-3 border-b border-border py-1 text-[13px] last:border-b-0">
              <span className="opacity-65">Account Name</span>
              <span className="font-semibold">[Corporate account name]</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border py-1 text-[13px] last:border-b-0">
              <span className="opacity-65">Account Number</span>
              <span className="font-semibold">[0000 0000 0000]</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
              <span className="opacity-65">Reference / Memo</span>
              <span className="font-semibold">[Your name + court date]</span>
            </div>
          </div>
      </div>

        <div className={panelClassName}>
          <div className={primeSectionHeaderRowClass}>
            <div>
              <h2 className={primeSectionTitleClass}>Receipt Validation</h2>
              <p className="mt-1.5 text-sm opacity-65">Drop your payment screenshot and confirm the extracted reference.</p>
            </div>
          </div>
          <button
            type="button"
            className={`w-full rounded-[var(--radius)] border-2 border-dashed px-6 py-10 text-center transition ${isDragging ? "border-accent-secondary bg-[rgba(212,163,89,0.12)]" : "border-border bg-surface-muted hover:border-accent-secondary hover:bg-[rgba(212,163,89,0.08)]"}`}
            id="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFile(event.dataTransfer.files[0]);
            }}
          >
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-[22px] text-accent" aria-hidden="true">
              +
            </div>
            <h3 className="mb-1 font-serif text-lg font-bold">Drop receipt here</h3>
            <p className="text-[13px] opacity-65">or click to browse · PNG, JPG up to 10MB</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          {upload ? (
            <div className="mt-4" id="uploadStatus">
              <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3">
                <div className="size-16 shrink-0 rounded-[var(--radius)] border border-border bg-[repeating-linear-gradient(45deg,var(--muted)_0_8px,var(--surface)_8px_16px)]" aria-hidden="true" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{upload.name}</div>
                  <div className="text-[11px] opacity-60">{upload.meta}</div>
                </div>
              </div>
              <div className={`mt-3 flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3.5 text-[13px] ${isDone ? "border-success bg-[rgba(34,197,94,0.12)] text-foreground shadow-[0_0_0_1px_rgba(34,197,94,0.22),0_0_26px_rgba(34,197,94,0.12)]" : "border-border bg-canvas text-foreground"}`} id="ocrStatus">
                {isReading ? <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-success" aria-hidden="true" /> : null}
                <span className="msg">
                  {isDone
                    ? `Reference extracted: ${reference}`
                    : "OCR reading reference number from image…"}
                </span>
                {isDone ? <span className="ml-auto font-bold text-success">✓</span> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-5" data-od-id="reference-field">
            <label htmlFor="refInput" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.06em]">
              Transaction Reference <span className="text-accent">required</span>
            </label>
            <input
              id="refInput"
              type="text"
              className={`min-h-12 w-full rounded-[var(--radius)] border-2 px-4 text-[15px] font-semibold tabular-nums tracking-[0.02em] text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent-secondary focus:shadow-[0_0_0_4px_rgba(212,163,89,0.12)] ${isFlashing ? "border-success bg-[rgba(34,197,94,0.12)]" : "border-border bg-surface-muted"}`}
              placeholder="PRS-XXXXXX"
              autoComplete="off"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <p className="mt-1.5 text-xs opacity-60">
              Auto-populated by OCR. <strong>Verify before submitting.</strong>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <p className="max-w-[40ch] text-xs opacity-60">
              By submitting, you authorize Prime Sports staff to match this reference against the club&apos;s bank statement. Approvals are manual.
            </p>
            <button
              type="button"
              className={primeButtonPrimaryClass}
              aria-disabled={!reference.trim()}
              disabled={!reference.trim()}
              onClick={() => window.alert(`Reservation submitted for verification. Reference: ${reference}`)}
            >
              Submit for Verification →
            </button>
          </div>
      </div>
    </section>
  );
}