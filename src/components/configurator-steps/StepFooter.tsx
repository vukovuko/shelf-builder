"use client";

interface StepFooterProps {
  totalArea: number;
  totalCost: number;
  onOrderClick: () => void;
  fmt2: (n: number) => string;
}

export function StepFooter({
  totalArea,
  totalCost,
  onOrderClick,
  fmt2,
}: StepFooterProps) {
  return (
    <div className="flex-shrink-0 sticky bottom-0 bg-sidebar z-10 px-4 py-3 border-t space-y-2">
      {/* Kvadratura row */}
      <div className="flex items-center justify-between">
        <span className="text-base text-muted-foreground">
          Ukupna kvadratura
        </span>
        <span className="text-lg font-bold">{fmt2(totalArea)} m²</span>
      </div>

      {/* Poruči button with price */}
      <button
        onClick={onOrderClick}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors cursor-pointer"
      >
        <span className="text-base font-bold uppercase">Poruči</span>
        <span className="text-xl font-bold">{fmt2(totalCost)} RSD</span>
      </button>
    </div>
  );
}
