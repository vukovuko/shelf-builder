"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "../shared";
import styles from "./hero-grid.module.css";

const CELL_SIZE = 120; // px
const COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function SubGrid() {
  const [cellColors, setCellColors] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const leaveTimeouts = useRef<(NodeJS.Timeout | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  function handleHover(cellIdx: number) {
    const timeout = leaveTimeouts.current[cellIdx];
    if (timeout) {
      clearTimeout(timeout);
      leaveTimeouts.current[cellIdx] = null;
    }
    setCellColors((prev) =>
      prev.map((c, i) => (i === cellIdx ? getRandomColor() : c)),
    );
  }
  function handleLeave(cellIdx: number) {
    leaveTimeouts.current[cellIdx] = setTimeout(() => {
      setCellColors((prev) => prev.map((c, i) => (i === cellIdx ? null : c)));
      leaveTimeouts.current[cellIdx] = null;
    }, 120);
  }
  useEffect(
    () => () => {
      for (const t of leaveTimeouts.current) {
        if (t) {
          clearTimeout(t);
        }
      }
    },
    [],
  );

  return (
    <div className={styles.subgrid} style={{ pointerEvents: "none" }}>
      {[0, 1, 2, 3].map((cellIdx) => (
        <div
          className={styles.cell}
          key={cellIdx}
          onMouseEnter={() => handleHover(cellIdx)}
          onMouseLeave={() => handleLeave(cellIdx)}
          style={{
            background: cellColors[cellIdx] || "transparent",
            pointerEvents: "auto",
          }}
        />
      ))}
    </div>
  );
}

function InteractiveGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState({ columns: 0, rows: 0 });

  const updateGrid = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setGrid({
        columns: Math.ceil(width / CELL_SIZE),
        rows: Math.ceil(height / CELL_SIZE),
      });
    }
  }, []);

  useEffect(() => {
    updateGrid();
    let rafId = 0;
    function onResize() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateGrid);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, [updateGrid]);

  const total = grid.columns * grid.rows;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    >
      <div
        className={styles.mainGrid}
        style={
          {
            gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
            gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
            "--grid-cell-size": `${CELL_SIZE}px`,
            width: "100%",
            height: "100%",
          } as React.CSSProperties
        }
      >
        {Array.from({ length: total }, (_, idx) => (
          <SubGrid key={`subgrid-${grid.columns}-${grid.rows}-${idx}`} />
        ))}
      </div>
    </div>
  );
}

export function HeroGrid() {
  return (
    <div className="relative">
      <HeroHeader />
      <div>
        <section className="relative overflow-hidden py-24 lg:py-36">
          {/* Interactive animated grid background */}
          <InteractiveGrid />
          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="mb-6 text-pretty font-bold text-3xl tracking-tight lg:text-5xl">
                Polica <span className="text-primary">po meri</span>
              </h1>
              <p className="mx-auto max-w-3xl text-muted-foreground lg:text-xl">
                Konfigurator koji vam omogućava da kreirate savršen orman za vaš
                prostor. Izaberite dimenzije, materijale, vrata i dodatke — sve
                na jednom mestu.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline" size="lg">
                <a href="#faq">Kako funkcioniše?</a>
              </Button>
              <Button asChild size="lg">
                <Link href="/design">Započnite dizajn</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HeroGrid;
