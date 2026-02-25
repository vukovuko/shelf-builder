"use client";

import { faqItems, type FaqItem } from "@/lib/faq-data";
import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

export interface FaqSearchableProps {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  faqs?: FaqItem[];
}

export function FaqSearchable({
  title = "Često postavljana pitanja",
  description = "Pretražite odgovore na najčešća pitanja o konfiguratoru",
  searchPlaceholder = "Pretražite pitanja...",
  noResultsText = "Nema rezultata. Pokušajte sa drugim pojmom.",
  faqs = faqItems,
}: FaqSearchableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqs;
    }
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query),
    );
  }, [faqs, searchQuery]);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.25, bounce: 0.05 };

  const contentTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.25, bounce: 0 };

  return (
    <section id="faq" className="py-10 lg:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="mb-12 text-center"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          transition={springTransition}
        >
          <h2 className="mb-4 font-bold text-3xl text-foreground lg:text-4xl">
            {title}
          </h2>
          <p className="mx-auto max-w-2xl text-foreground/70 text-lg">
            {description}
          </p>
        </motion.div>

        <motion.div
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="relative mb-8"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          transition={{
            ...springTransition,
            delay: shouldReduceMotion ? 0 : 0.1,
          }}
        >
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-foreground/40" />
          <input
            aria-label="Search frequently asked questions"
            className="w-full rounded-xl border border-border bg-background py-4 pr-4 pl-12 text-foreground transition-colors placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenIndex(null);
            }}
            placeholder={searchPlaceholder}
            type="text"
            value={searchQuery}
          />
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length === 0 ? (
              <motion.div
                animate={
                  shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                }
                className="rounded-xl border border-border bg-background/50 py-12 text-center"
                exit={
                  shouldReduceMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { opacity: 0, scale: 0.95 }
                }
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, scale: 0.95 }
                }
                key="no-results"
                transition={springTransition}
              >
                <p className="text-foreground/60">{noResultsText}</p>
              </motion.div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const originalIndex = faqs.indexOf(faq);
                const isOpen = openIndex === originalIndex;

                return (
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, y: 0, scale: 1 }
                    }
                    className="group overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-primary"
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, transition: { duration: 0 } }
                        : { opacity: 0, scale: 0.95, y: -10 }
                    }
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 20, scale: 0.95 }
                    }
                    key={faq.question}
                    layout={!shouldReduceMotion}
                    transition={{
                      ...springTransition,
                      delay: shouldReduceMotion ? 0 : index * 0.05,
                    }}
                  >
                    <button
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-background/50"
                      onClick={() => toggleAccordion(originalIndex)}
                      type="button"
                    >
                      <h3 className="pr-4 font-medium text-foreground">
                        {faq.question}
                      </h3>
                      <motion.div
                        animate={{
                          rotate: isOpen ? 180 : 0,
                        }}
                        className="flex-shrink-0"
                        transition={springTransition}
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className="h-5 w-5 text-foreground/60"
                        />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          animate={
                            shouldReduceMotion
                              ? { height: "auto", opacity: 1 }
                              : { height: "auto", opacity: 1 }
                          }
                          className="overflow-hidden"
                          exit={
                            shouldReduceMotion
                              ? {
                                  height: 0,
                                  opacity: 0,
                                  transition: { duration: 0 },
                                }
                              : { height: 0, opacity: 0 }
                          }
                          initial={
                            shouldReduceMotion
                              ? { height: "auto", opacity: 1 }
                              : { height: 0, opacity: 0 }
                          }
                          transition={contentTransition}
                        >
                          <div className="px-5 pb-5">
                            <p className="text-foreground/70 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default FaqSearchable;
