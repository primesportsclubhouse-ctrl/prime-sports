import { ReactNode } from "react";

import { ContainerVariant, getPrimeContainerClassName } from "@/lib/prime-sports";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  containerVariant?: ContainerVariant;
  sectionClassName?: string;
  layoutClassName?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actions?: ReactNode;
  centered?: boolean;
};

export default function PageIntro({
  eyebrow,
  title,
  description,
  containerVariant = "default",
  sectionClassName = "border-b border-border px-0 py-12",
  layoutClassName,
  eyebrowClassName = "mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent",
  titleClassName = "font-serif text-[clamp(36px,6vw,56px)] font-bold leading-[1.05] tracking-[-0.02em]",
  descriptionClassName = "mt-3 max-w-[60ch] text-base opacity-70",
  actions,
  centered = false,
}: PageIntroProps) {
  const containerClassName = getPrimeContainerClassName(containerVariant);
  const contentClassName = centered ? "mx-auto max-w-[60ch] text-center" : "";

  return (
    <section className={sectionClassName}>
      <div className={[containerClassName, layoutClassName].filter(Boolean).join(" ")}>
        <div className={contentClassName}>
          <p className={eyebrowClassName}>{eyebrow}</p>
          <h1 className={titleClassName}>{title}</h1>
          {description ? <p className={descriptionClassName}>{description}</p> : null}
        </div>
        {actions}
      </div>
    </section>
  );
}