"use client";

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LinkPending } from "@/components/PendingContent";

const menuItems: { id: string; name: string; href: string }[] = [
  { id: "home", name: "Početna", href: "/" },
  { id: "design", name: "Konfigurator", href: "/design" },
  { id: "blog", name: "Blog", href: "/blog" },
  { id: "contact", name: "Kontakt", href: "/contact" },
];

// Animation constants
const ANIMATION_DURATION = 0.2;
const STAGGER_DELAY = 0.05;
const EASE_OUT_QUART_X1 = 0.22;
const EASE_OUT_QUART_Y1 = 1;
const EASE_OUT_QUART_X2 = 0.36;
const EASE_OUT_QUART_Y2 = 1;
const EASE_OUT_QUART = [
  EASE_OUT_QUART_X1,
  EASE_OUT_QUART_Y1,
  EASE_OUT_QUART_X2,
  EASE_OUT_QUART_Y2,
] as const;
const ROTATION_ANGLE = 180;
const SCALE_MIN = 0;
const SCALE_MAX = 1;
const TRANSLATE_Y_OFFSET = -10;
const TRANSLATE_X_OFFSET = -10;

export const HeroHeader = () => {
  const [menuState, setMenuState] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="relative">
      <header>
        <nav
          aria-label="Glavna navigacija"
          className="absolute top-0 left-0 z-20 w-full transition-all duration-300"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative flex flex-wrap items-center justify-between gap-6 py-6 transition-all duration-200 lg:gap-0">
              <div className="flex w-full items-center justify-between gap-6 lg:w-auto">
                <Link
                  aria-label="Ormani po meri"
                  className="flex items-center gap-3"
                  href="/"
                >
                  <Image
                    alt=""
                    className="h-10 w-auto sm:h-11 dark:hue-rotate-180 dark:invert"
                    height={256}
                    priority
                    src="/ormani-po-meri-mark.webp"
                    width={209}
                  />
                  <span className="flex flex-col">
                    <span className="font-bold text-2xl leading-none tracking-tight sm:text-[1.75rem]">
                      Ormani <span className="text-primary">po meri</span>
                    </span>
                    <span className="mt-1.5 font-medium text-[9px] text-muted-foreground uppercase leading-none tracking-[0.25em] sm:text-[10px] sm:tracking-[0.3em]">
                      3D konfigurator ormana
                    </span>
                  </span>
                </Link>

                <button
                  aria-label={menuState ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                  onClick={() => setMenuState(!menuState)}
                  type="button"
                >
                  <div className="relative size-6">
                    <motion.div
                      animate={{
                        opacity: menuState ? 0 : 1,
                        rotate: menuState ? 90 : 0,
                      }}
                      className="absolute inset-0"
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="size-6" />
                    </motion.div>
                    <motion.div
                      animate={{
                        opacity: menuState ? 1 : 0,
                        rotate: menuState ? 0 : -90,
                      }}
                      className="absolute inset-0"
                      transition={{ duration: 0.15 }}
                    >
                      <X className="size-6" />
                    </motion.div>
                  </div>
                </button>
              </div>

              <div className="hidden items-center gap-6 lg:flex">
                <ul className="flex gap-1">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          aria-current={
                            isActive(item.href) ? "page" : undefined
                          }
                          className="text-base hover:text-primary focus-visible:text-primary"
                          href={item.href}
                        >
                          <LinkPending>{item.name}</LinkPending>
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button asChild>
                  <Link href="/design">
                    <LinkPending>Započnite dizajn</LinkPending>
                  </Link>
                </Button>
              </div>

              <AnimatePresence>
                {menuState && (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: SCALE_MAX }}
                    className="mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:hidden dark:shadow-none"
                    exit={{ opacity: 0, y: TRANSLATE_Y_OFFSET, scale: 0.95 }}
                    initial={{ opacity: 0, y: TRANSLATE_Y_OFFSET, scale: 0.95 }}
                    transition={{
                      duration: ANIMATION_DURATION,
                      ease: EASE_OUT_QUART,
                    }}
                  >
                    <div>
                      <ul className="space-y-6 text-base">
                        {menuItems.map((item, index) => (
                          <motion.li
                            animate={{ opacity: 1, x: 0 }}
                            initial={{ opacity: 0, x: TRANSLATE_X_OFFSET }}
                            key={item.id}
                            transition={{
                              delay: index * STAGGER_DELAY,
                              duration: ANIMATION_DURATION,
                              ease: EASE_OUT_QUART,
                            }}
                          >
                            <Link
                              aria-current={
                                isActive(item.href) ? "page" : undefined
                              }
                              className="block py-1 text-muted-foreground duration-150 hover:text-accent-foreground focus-visible:text-primary"
                              href={item.href}
                              onClick={() => setMenuState(false)}
                            >
                              <span>{item.name}</span>
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit"
                      initial={{ opacity: 0, y: 10 }}
                      transition={{
                        delay: menuItems.length * STAGGER_DELAY + STAGGER_DELAY,
                        duration: ANIMATION_DURATION,
                        ease: EASE_OUT_QUART,
                      }}
                    >
                      <Button asChild size="sm" type="button">
                        <Link href="/design">
                          <LinkPending>Započnite dizajn</LinkPending>
                        </Link>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
};
