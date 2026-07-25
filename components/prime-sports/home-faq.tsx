'use client';

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type HomeFaqProps = {
  items: FaqItem[];
};

export default function HomeFaq({ items }: HomeFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[760px]" id="faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={item.question} className="border-b border-border first:border-t first:border-border">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-1 py-6 text-left font-serif text-[19px] font-semibold tracking-[-0.005em]"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex((current) => (current === index ? null : index))}
            >
              <span>{item.question}</span>
              <span
                className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-base font-normal transition ${isOpen ? "rotate-45 border-accent-secondary bg-accent-secondary text-canvas" : "border-border bg-transparent text-foreground"}`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div className="faq-a" hidden={!isOpen}>
              <div className="max-w-[62ch] px-0 pb-6 text-[15px] leading-[1.65] opacity-75">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}