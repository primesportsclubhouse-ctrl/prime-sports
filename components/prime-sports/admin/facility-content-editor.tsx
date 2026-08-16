'use client';

import { useEffect, useState } from "react";

import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  primeButtonOutlineClass,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeSectionTitleClass,
  primeSurfaceCardClass,
} from "@/lib/prime-sports";

type MediaType = "image" | "video";

type MediaItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mediaType: MediaType;
  src: string | null;
  alt: string | null;
  meta: string | null;
  sortOrder: number;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
};

type PaymentChannel = {
  key: string;
  displayKey: string;
  label: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
};

type Settings = {
  addressLine: string;
  addressArea: string;
  hoursValue: string;
  hoursNote: string;
  parkingSlots: number | null;
  parkingNote: string | null;
  landmarkNote: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

const EMPTY_SETTINGS: Settings = {
  addressLine: "",
  addressArea: "",
  hoursValue: "",
  hoursNote: "",
  parkingSlots: null,
  parkingNote: null,
  landmarkNote: null,
  contactPhone: null,
  contactEmail: null,
};

const TABS = [
  { key: "media", label: "Media" },
  { key: "faq", label: "FAQ" },
  { key: "payment-channels", label: "Payment Channels" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const textInputClassName =
  "min-h-11 w-full rounded-[var(--radius)] border-2 border-border bg-surface-muted px-3 text-[15px] font-medium text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent-secondary focus:shadow-[0_0_0_4px_rgba(212,163,89,0.12)]";

const textAreaClassName = `${textInputClassName} min-h-20 resize-y py-2`;

const numberInputClassName = `${textInputClassName} [font-family:var(--font-mono)] tabular-nums`;

const fieldLabelClassName = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted";

const cardShellClassName = `${primeSurfaceCardClass} p-5`;

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function FacilityContentEditor() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("media");
  const [isLoading, setIsLoading] = useState(true);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [mediaRes, faqRes, channelsRes, settingsRes] = await Promise.all([
          fetch("/api/facility-media"),
          fetch("/api/faq-items"),
          fetch("/api/payment-channels"),
          fetch("/api/facility-settings"),
        ]);
        const [mediaData, faqData, channelsData, settingsData] = await Promise.all([
          mediaRes.json().catch(() => null),
          faqRes.json().catch(() => null),
          channelsRes.json().catch(() => null),
          settingsRes.json().catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        if (mediaRes.ok && Array.isArray(mediaData?.media)) {
          setMedia(mediaData.media);
        }
        if (faqRes.ok && Array.isArray(faqData?.faq)) {
          setFaq(faqData.faq);
        }
        if (channelsRes.ok && Array.isArray(channelsData?.channels)) {
          setPaymentChannels(channelsData.channels);
        }
        if (settingsRes.ok && settingsData?.settings) {
          setSettings(settingsData.settings);
        }

        if (!mediaRes.ok || !faqRes.ok || !channelsRes.ok || !settingsRes.ok) {
          showToast({
            title: "Some content failed to load",
            description: "Refresh to try again — anything that did load is still safe to edit.",
          });
        }
      } catch {
        if (!cancelled) {
          showToast({
            title: "Could not load facility content",
            description: "Network error — failed to load media, FAQ, payment channels, and settings.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount, same as rates-editor's own initial load
  }, []);

  const containerClassName = primeContainerClasses.wide;

  return (
    <section className={`${containerClassName} py-7`} data-od-id="admin-content">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={primeSectionTitleClass}>Facility Content</h2>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Gallery photos, FAQ copy, and address/hours/contact info shown on the public homepage.
        </div>
      </div>

      <div className="mb-5" role="tablist" aria-label="Facility content section">
        <div className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                  isActive
                    ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-10 text-center text-sm opacity-60">
          Loading facility content…
        </div>
      ) : (
        <>
          {activeTab === "media" ? <MediaTab media={media} setMedia={setMedia} showToast={showToast} /> : null}
          {activeTab === "faq" ? <FaqTab faq={faq} setFaq={setFaq} showToast={showToast} /> : null}
          {activeTab === "payment-channels" ? (
            <PaymentChannelsTab paymentChannels={paymentChannels} setPaymentChannels={setPaymentChannels} showToast={showToast} />
          ) : null}
          {activeTab === "settings" ? (
            <SettingsTab
              settings={settings}
              setSettings={setSettings}
              isDirty={settingsDirty}
              setIsDirty={setSettingsDirty}
              isSaving={savingSettings}
              setIsSaving={setSavingSettings}
              showToast={showToast}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

type ShowToast = ReturnType<typeof useToast>["showToast"];

// ---------------------------------------------------------------------------
// Media tab
// ---------------------------------------------------------------------------

function MediaTab({
  media,
  setMedia,
  showToast,
}: {
  media: MediaItem[];
  setMedia: (next: MediaItem[]) => void;
  showToast: ShowToast;
}) {
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [newCard, setNewCard] = useState({
    slug: "",
    title: "",
    description: "",
    mediaType: "image" as MediaType,
    src: "",
    alt: "",
    meta: "",
    sortOrder: String(media.length),
  });
  const [creating, setCreating] = useState(false);

  function updateRow(id: string, patch: Partial<MediaItem>) {
    setMedia(media.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveRow(row: MediaItem) {
    setSavingIds((prev) => new Set(prev).add(row.id));
    try {
      const response = await fetch(`/api/facility-media/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: row.slug,
          title: row.title,
          description: row.description,
          mediaType: row.mediaType,
          src: row.src,
          alt: row.alt,
          meta: row.meta,
          sortOrder: row.sortOrder,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not save card", description: data?.error ?? "Failed to save this card." });
        return;
      }

      if (Array.isArray(data?.media)) {
        setMedia(data.media);
      }
      showToast({ title: "Card saved", description: `${row.title} updated.`, variant: "success" });
    } catch {
      showToast({ title: "Could not save card", description: "Network error — failed to save this card." });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function deleteRow(row: MediaItem) {
    setSavingIds((prev) => new Set(prev).add(row.id));
    try {
      const response = await fetch(`/api/facility-media/${row.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not delete card", description: data?.error ?? "Failed to delete this card." });
        return;
      }

      if (Array.isArray(data?.media)) {
        setMedia(data.media);
      }
      showToast({ title: "Card deleted", description: `${row.title} removed.`, variant: "success" });
    } catch {
      showToast({ title: "Could not delete card", description: "Network error — failed to delete this card." });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function createCard() {
    if (!newCard.slug.trim() || !newCard.title.trim() || !newCard.description.trim()) {
      showToast({ title: "Missing fields", description: "Slug, title, and description are required." });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/facility-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newCard.slug,
          title: newCard.title,
          description: newCard.description,
          mediaType: newCard.mediaType,
          src: newCard.src || null,
          alt: newCard.alt || null,
          meta: newCard.meta || null,
          sortOrder: toNullableInt(newCard.sortOrder) ?? media.length,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not add card", description: data?.error ?? "Failed to add this card." });
        return;
      }

      if (Array.isArray(data?.media)) {
        setMedia(data.media);
      }
      setNewCard({
        slug: "",
        title: "",
        description: "",
        mediaType: "image",
        src: "",
        alt: "",
        meta: "",
        sortOrder: String(media.length + 1),
      });
      showToast({ title: "Card added", description: `${newCard.title} added to the gallery.`, variant: "success" });
    } catch {
      showToast({ title: "Could not add card", description: "Network error — failed to add this card." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-[70ch] text-xs opacity-60">
        Photo/video URL is a plain link field in this slice, not a file uploader — paste a URL to an already-hosted
        image or video (or a path under <code>/prime-sports/…</code> once the asset is added to the repo). Leave it
        blank to keep the card on the club-crest fallback.
      </p>

      {media.map((row) => {
        const isSaving = savingIds.has(row.id);
        return (
          <div key={row.id} className={cardShellClassName}>
            <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
              <div>
                <span className={fieldLabelClassName}>Slug</span>
                <input
                  className={textInputClassName}
                  value={row.slug}
                  onChange={(event) => updateRow(row.id, { slug: event.target.value })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Title</span>
                <input
                  className={textInputClassName}
                  value={row.title}
                  onChange={(event) => updateRow(row.id, { title: event.target.value })}
                />
              </div>
              <div className="col-span-2">
                <span className={fieldLabelClassName}>Description</span>
                <textarea
                  className={textAreaClassName}
                  value={row.description}
                  onChange={(event) => updateRow(row.id, { description: event.target.value })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Media Type</span>
                <select
                  className={textInputClassName}
                  value={row.mediaType}
                  onChange={(event) => updateRow(row.id, { mediaType: event.target.value as MediaType })}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <span className={fieldLabelClassName}>Sort Order</span>
                <input
                  type="number"
                  className={numberInputClassName}
                  value={row.sortOrder}
                  onChange={(event) => updateRow(row.id, { sortOrder: toNullableInt(event.target.value) ?? 0 })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Photo/Video URL</span>
                <input
                  className={textInputClassName}
                  placeholder="https://… (leave blank for crest fallback)"
                  value={row.src ?? ""}
                  onChange={(event) => updateRow(row.id, { src: event.target.value || null })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Alt Text</span>
                <input
                  className={textInputClassName}
                  value={row.alt ?? ""}
                  onChange={(event) => updateRow(row.id, { alt: event.target.value || null })}
                />
              </div>
              <div className="col-span-2">
                <span className={fieldLabelClassName}>Meta Badge (optional, e.g. &quot;7 courts&quot;)</span>
                <input
                  className={textInputClassName}
                  value={row.meta ?? ""}
                  onChange={(event) => updateRow(row.id, { meta: event.target.value || null })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                className={primeButtonOutlineClass}
                disabled={isSaving}
                onClick={() => void deleteRow(row)}
              >
                Delete
              </button>
              <button
                type="button"
                className={primeButtonPrimaryClass}
                disabled={isSaving}
                onClick={() => void saveRow(row)}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}

      <div className={cardShellClassName}>
        <p className={`${primeMetaLabelClass} mb-3`}>Add New Card</p>
        <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
          <div>
            <span className={fieldLabelClassName}>Slug</span>
            <input
              className={textInputClassName}
              value={newCard.slug}
              onChange={(event) => setNewCard({ ...newCard, slug: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Title</span>
            <input
              className={textInputClassName}
              value={newCard.title}
              onChange={(event) => setNewCard({ ...newCard, title: event.target.value })}
            />
          </div>
          <div className="col-span-2">
            <span className={fieldLabelClassName}>Description</span>
            <textarea
              className={textAreaClassName}
              value={newCard.description}
              onChange={(event) => setNewCard({ ...newCard, description: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Media Type</span>
            <select
              className={textInputClassName}
              value={newCard.mediaType}
              onChange={(event) => setNewCard({ ...newCard, mediaType: event.target.value as MediaType })}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <span className={fieldLabelClassName}>Sort Order</span>
            <input
              type="number"
              className={numberInputClassName}
              value={newCard.sortOrder}
              onChange={(event) => setNewCard({ ...newCard, sortOrder: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Photo/Video URL</span>
            <input
              className={textInputClassName}
              placeholder="https://…"
              value={newCard.src}
              onChange={(event) => setNewCard({ ...newCard, src: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Alt Text</span>
            <input
              className={textInputClassName}
              value={newCard.alt}
              onChange={(event) => setNewCard({ ...newCard, alt: event.target.value })}
            />
          </div>
          <div className="col-span-2">
            <span className={fieldLabelClassName}>Meta Badge (optional)</span>
            <input
              className={textInputClassName}
              value={newCard.meta}
              onChange={(event) => setNewCard({ ...newCard, meta: event.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button type="button" className={primeButtonPrimaryClass} disabled={creating} onClick={() => void createCard()}>
            {creating ? "Adding…" : "Add Card"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ tab
// ---------------------------------------------------------------------------

function FaqTab({
  faq,
  setFaq,
  showToast,
}: {
  faq: FaqItem[];
  setFaq: (next: FaqItem[]) => void;
  showToast: ShowToast;
}) {
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState({
    question: "",
    answer: "",
    category: "",
    sortOrder: String(faq.length),
  });
  const [creating, setCreating] = useState(false);

  function updateRow(id: string, patch: Partial<FaqItem>) {
    setFaq(faq.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveRow(row: FaqItem) {
    setSavingIds((prev) => new Set(prev).add(row.id));
    try {
      const response = await fetch(`/api/faq-items/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: row.question,
          answer: row.answer,
          category: row.category,
          sortOrder: row.sortOrder,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not save FAQ item", description: data?.error ?? "Failed to save this item." });
        return;
      }

      if (Array.isArray(data?.faq)) {
        setFaq(data.faq);
      }
      showToast({ title: "FAQ item saved", variant: "success" });
    } catch {
      showToast({ title: "Could not save FAQ item", description: "Network error — failed to save this item." });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function deleteRow(row: FaqItem) {
    setSavingIds((prev) => new Set(prev).add(row.id));
    try {
      const response = await fetch(`/api/faq-items/${row.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not delete FAQ item", description: data?.error ?? "Failed to delete this item." });
        return;
      }

      if (Array.isArray(data?.faq)) {
        setFaq(data.faq);
      }
      showToast({ title: "FAQ item deleted", variant: "success" });
    } catch {
      showToast({ title: "Could not delete FAQ item", description: "Network error — failed to delete this item." });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function createItem() {
    if (!newItem.question.trim() || !newItem.answer.trim()) {
      showToast({ title: "Missing fields", description: "Question and answer are required." });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/faq-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newItem.question,
          answer: newItem.answer,
          category: newItem.category || null,
          sortOrder: toNullableInt(newItem.sortOrder) ?? faq.length,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not add FAQ item", description: data?.error ?? "Failed to add this item." });
        return;
      }

      if (Array.isArray(data?.faq)) {
        setFaq(data.faq);
      }
      setNewItem({ question: "", answer: "", category: "", sortOrder: String(faq.length + 1) });
      showToast({ title: "FAQ item added", variant: "success" });
    } catch {
      showToast({ title: "Could not add FAQ item", description: "Network error — failed to add this item." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {faq.map((row) => {
        const isSaving = savingIds.has(row.id);
        return (
          <div key={row.id} className={cardShellClassName}>
            <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
              <div className="col-span-2">
                <span className={fieldLabelClassName}>Question</span>
                <input
                  className={textInputClassName}
                  value={row.question}
                  onChange={(event) => updateRow(row.id, { question: event.target.value })}
                />
              </div>
              <div className="col-span-2">
                <span className={fieldLabelClassName}>Answer</span>
                <textarea
                  className={textAreaClassName}
                  value={row.answer}
                  onChange={(event) => updateRow(row.id, { answer: event.target.value })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Category</span>
                <input
                  className={textInputClassName}
                  value={row.category ?? ""}
                  onChange={(event) => updateRow(row.id, { category: event.target.value || null })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Sort Order</span>
                <input
                  type="number"
                  className={numberInputClassName}
                  value={row.sortOrder}
                  onChange={(event) => updateRow(row.id, { sortOrder: toNullableInt(event.target.value) ?? 0 })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                className={primeButtonOutlineClass}
                disabled={isSaving}
                onClick={() => void deleteRow(row)}
              >
                Delete
              </button>
              <button
                type="button"
                className={primeButtonPrimaryClass}
                disabled={isSaving}
                onClick={() => void saveRow(row)}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}

      <div className={cardShellClassName}>
        <p className={`${primeMetaLabelClass} mb-3`}>Add New FAQ Item</p>
        <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
          <div className="col-span-2">
            <span className={fieldLabelClassName}>Question</span>
            <input
              className={textInputClassName}
              value={newItem.question}
              onChange={(event) => setNewItem({ ...newItem, question: event.target.value })}
            />
          </div>
          <div className="col-span-2">
            <span className={fieldLabelClassName}>Answer</span>
            <textarea
              className={textAreaClassName}
              value={newItem.answer}
              onChange={(event) => setNewItem({ ...newItem, answer: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Category</span>
            <input
              className={textInputClassName}
              value={newItem.category}
              onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}
            />
          </div>
          <div>
            <span className={fieldLabelClassName}>Sort Order</span>
            <input
              type="number"
              className={numberInputClassName}
              value={newItem.sortOrder}
              onChange={(event) => setNewItem({ ...newItem, sortOrder: event.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button type="button" className={primeButtonPrimaryClass} disabled={creating} onClick={() => void createItem()}>
            {creating ? "Adding…" : "Add FAQ Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Channels tab
// ---------------------------------------------------------------------------

function PaymentChannelsTab({
  paymentChannels,
  setPaymentChannels,
  showToast,
}: {
  paymentChannels: PaymentChannel[];
  setPaymentChannels: (next: PaymentChannel[]) => void;
  showToast: ShowToast;
}) {
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());

  function updateRow(key: string, patch: Partial<PaymentChannel>) {
    setPaymentChannels(paymentChannels.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function saveRow(row: PaymentChannel) {
    setSavingKeys((prev) => new Set(prev).add(row.key));
    try {
      const response = await fetch(`/api/payment-channels/${row.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: row.label,
          accountName: row.accountName,
          accountNumber: row.accountNumber,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not save channel", description: data?.error ?? "Failed to save this channel." });
        return;
      }

      if (Array.isArray(data?.channels)) {
        setPaymentChannels(data.channels);
      }
      showToast({ title: "Channel saved", description: `${row.displayKey} updated.`, variant: "success" });
    } catch {
      showToast({ title: "Could not save channel", description: "Network error — failed to save this channel." });
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
    }
  }

  async function uploadQrImage(row: PaymentChannel, file: File) {
    setUploadingKeys((prev) => new Set(prev).add(row.key));
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/payment-channels/${row.key}/qr-image`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not upload QR image", description: data?.error ?? "Failed to upload this image." });
        return;
      }

      if (Array.isArray(data?.channels)) {
        setPaymentChannels(data.channels);
      }
      showToast({ title: "QR image uploaded", description: `${row.displayKey} now shows the real QR at checkout.`, variant: "success" });
    } catch {
      showToast({ title: "Could not upload QR image", description: "Network error — failed to upload this image." });
    } finally {
      setUploadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
    }
  }

  async function removeQrImage(row: PaymentChannel) {
    setUploadingKeys((prev) => new Set(prev).add(row.key));
    try {
      const response = await fetch(`/api/payment-channels/${row.key}/qr-image`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not remove QR image", description: data?.error ?? "Failed to remove this image." });
        return;
      }

      if (Array.isArray(data?.channels)) {
        setPaymentChannels(data.channels);
      }
      showToast({
        title: "QR image removed",
        description: `${row.displayKey} falls back to the placeholder QR at checkout until a new image is uploaded.`,
        variant: "success",
      });
    } catch {
      showToast({ title: "Could not remove QR image", description: "Network error — failed to remove this image." });
    } finally {
      setUploadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-[70ch] text-xs opacity-60">
        Account details shown at checkout, plus the real GCash/Maya/bank QR image for each channel — upload the
        image the business already has on file. Leave it unset to keep showing the decorative placeholder QR
        instead of a broken image. Channels themselves are fixed to these 3 — adding a genuinely new channel
        requires a developer migration, not just this editor.
      </p>

      {paymentChannels.map((row) => {
        const isSaving = savingKeys.has(row.key);
        const isUploading = uploadingKeys.has(row.key);
        return (
          <div key={row.key} className={cardShellClassName}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={primeMetaLabelClass}>{row.displayKey}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
              <div>
                <span className={fieldLabelClassName}>Label</span>
                <input
                  className={textInputClassName}
                  value={row.label}
                  onChange={(event) => updateRow(row.key, { label: event.target.value })}
                />
              </div>
              <div>
                <span className={fieldLabelClassName}>Account Name</span>
                <input
                  className={textInputClassName}
                  value={row.accountName}
                  onChange={(event) => updateRow(row.key, { accountName: event.target.value })}
                />
              </div>
              <div className="col-span-2">
                <span className={fieldLabelClassName}>Account Number</span>
                <input
                  className={textInputClassName}
                  value={row.accountNumber}
                  onChange={(event) => updateRow(row.key, { accountNumber: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-surface-muted">
                {row.qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, admin preview thumbnail.
                  <img src={row.qrImageUrl} alt={`${row.displayKey} QR`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] uppercase opacity-50">No image</span>
                )}
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <label className={`${primeButtonOutlineClass} cursor-pointer`}>
                  {isUploading ? "Uploading…" : row.qrImageUrl ? "Replace QR Image" : "Upload QR Image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) {
                        void uploadQrImage(row, file);
                      }
                    }}
                  />
                </label>
                {row.qrImageUrl ? (
                  <button
                    type="button"
                    className={primeButtonOutlineClass}
                    disabled={isUploading}
                    onClick={() => void removeQrImage(row)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <button
                type="button"
                className={primeButtonPrimaryClass}
                disabled={isSaving}
                onClick={() => void saveRow(row)}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({
  settings,
  setSettings,
  isDirty,
  setIsDirty,
  isSaving,
  setIsSaving,
  showToast,
}: {
  settings: Settings;
  setSettings: (next: Settings) => void;
  isDirty: boolean;
  setIsDirty: (next: boolean) => void;
  isSaving: boolean;
  setIsSaving: (next: boolean) => void;
  showToast: ShowToast;
}) {
  function update(patch: Partial<Settings>) {
    setSettings({ ...settings, ...patch });
    setIsDirty(true);
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/facility-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({ title: "Could not save settings", description: data?.error ?? "Failed to save settings." });
        return;
      }

      if (data?.settings) {
        setSettings(data.settings);
      }
      setIsDirty(false);
      showToast({
        title: "Settings saved",
        description: "The homepage footer and location panel both read this live.",
        variant: "success",
      });
    } catch {
      showToast({ title: "Could not save settings", description: "Network error — failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={cardShellClassName}>
      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        <div>
          <span className={fieldLabelClassName}>Address Line</span>
          <input
            className={textInputClassName}
            value={settings.addressLine}
            onChange={(event) => update({ addressLine: event.target.value })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Address Area (city/postal)</span>
          <input
            className={textInputClassName}
            value={settings.addressArea}
            onChange={(event) => update({ addressArea: event.target.value })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Hours Value</span>
          <input
            className={textInputClassName}
            value={settings.hoursValue}
            onChange={(event) => update({ hoursValue: event.target.value })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Hours Note</span>
          <input
            className={textInputClassName}
            value={settings.hoursNote}
            onChange={(event) => update({ hoursNote: event.target.value })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Parking Slots</span>
          <input
            type="number"
            className={numberInputClassName}
            value={settings.parkingSlots ?? ""}
            onChange={(event) => update({ parkingSlots: toNullableInt(event.target.value) })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Parking Note</span>
          <input
            className={textInputClassName}
            value={settings.parkingNote ?? ""}
            onChange={(event) => update({ parkingNote: event.target.value || null })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Landmark Note</span>
          <input
            className={textInputClassName}
            value={settings.landmarkNote ?? ""}
            onChange={(event) => update({ landmarkNote: event.target.value || null })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Contact Phone</span>
          <input
            className={textInputClassName}
            value={settings.contactPhone ?? ""}
            onChange={(event) => update({ contactPhone: event.target.value || null })}
          />
        </div>
        <div>
          <span className={fieldLabelClassName}>Contact Email</span>
          <input
            className={textInputClassName}
            value={settings.contactEmail ?? ""}
            onChange={(event) => update({ contactEmail: event.target.value || null })}
          />
        </div>
      </div>

      <p className="mt-4 max-w-[70ch] text-xs opacity-60">
        Parking and landmark notes aren&apos;t shown anywhere on the public site yet — location-panel.tsx&apos;s
        layout has no slot for them today. They save here regardless, ready for whenever that UI is added.
      </p>

      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <button
          type="button"
          className={primeButtonPrimaryClass}
          disabled={!isDirty || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
