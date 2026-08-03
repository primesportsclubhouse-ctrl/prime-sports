import Link from "next/link";
import type { ReactNode } from "react";

type SkewCtaSize = "default" | "compact";

type SkewCtaProps = {
  href: string;
  children: ReactNode;
  /** `compact` trims the height and padding for tight surfaces like the mobile menu. */
  size?: SkewCtaSize;
  className?: string;
  onClick?: () => void;
};

/**
 * The house call-to-action: a slight parallelogram with a folded-corner detail that
 * fills red on hover. Shared by the hero, the desktop header and the mobile menu so the
 * shape, skew angle and hover timing stay identical everywhere.
 */
const skewCtaBaseClass =
  "group relative inline-flex skew-x-[-11deg] items-center justify-center overflow-hidden bg-foreground text-canvas transition-colors duration-300 ease-out [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)] hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary";

const skewCtaSizeClasses: Record<SkewCtaSize, string> = {
  // Matches the mobile step-down the hero already used at the 640px breakpoint.
  default: "min-h-12 px-8 text-[13px] max-[640px]:min-h-11 max-[640px]:px-6",
  compact: "min-h-11 px-5 text-[12px]",
};

export default function SkewCta({
  href,
  children,
  size = "default",
  className,
  onClick,
}: SkewCtaProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[skewCtaBaseClass, skewCtaSizeClasses[size], className].filter(Boolean).join(" ")}
    >
      <span className="skew-x-[11deg] font-bold uppercase tracking-[0.16em]">{children}</span>
      {/* Folded-corner / ribbon detail */}
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 size-4 bg-canvas/25 transition-colors duration-300 ease-out [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover:bg-foreground/30"
      />
    </Link>
  );
}