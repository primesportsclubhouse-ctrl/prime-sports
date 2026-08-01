import FaqMonochrome, { type FaqItem } from "@/components/ui/faq-monochrome";

export type { FaqItem };

type HomeFaqProps = {
  items: FaqItem[];
};

export default function HomeFaq({ items }: HomeFaqProps) {
  return <FaqMonochrome id="faq" items={items} badgeLabel="Court Desk FAQ" />;
}
