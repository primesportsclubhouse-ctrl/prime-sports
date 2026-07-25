type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
};

export default function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
  className,
}: SectionIntroProps) {
  return (
    <div
      className={[
        centered ? "mx-auto max-w-[60ch] text-center" : "max-w-[60ch]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="mb-3 inline-block text-xs font-bold uppercase tracking-[0.14em] text-accent">
        {eyebrow}
      </span>
      <h2 className="font-serif text-[clamp(32px,5vw,52px)] font-bold leading-[1.05] tracking-[-0.02em]">
        {title}
      </h2>
      {description ? <p className="mt-3.5 text-base leading-[1.6] opacity-70">{description}</p> : null}
    </div>
  );
}