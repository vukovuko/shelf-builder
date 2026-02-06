"use client";

interface OrderSummaryTableProps {
  orderData: {
    materialName: string;
    materialProductCode: string | null;
    frontMaterialName: string;
    frontMaterialProductCode: string | null;
    backMaterialId: number | null;
    backMaterialName: string | null;
    backMaterialProductCode: string | null;
    totalArea: number;
    totalPrice: number;
    priceBreakdown: {
      korpus: { areaM2: number; price: number };
      front: { areaM2: number; price: number };
      back: { areaM2: number; price: number };
      handles?: { count: number; price: number };
    };
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
  formatPrice: (n: number) => string;
}

export function OrderSummaryTable({
  orderData,
  formatPrice,
}: OrderSummaryTableProps) {
  const areaM2 = orderData.totalArea / 10000;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Rezime porudžbine</h3>
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
          {orderData.dimensions.width} × {orderData.dimensions.height} ×{" "}
          {orderData.dimensions.depth} cm
        </span>
      </div>

      {/* Material breakdown table */}
      <div className="overflow-x-auto w-full min-w-0 -mx-4 px-4">
        <table className="w-full min-w-[480px] table-fixed text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="w-[40%] sm:w-[45%] text-left py-2 pr-2 font-medium">
                Materijal
              </th>
              <th className="w-[20%] sm:w-[20%] text-left py-2 px-2 font-medium">
                Šifra
              </th>
              <th className="w-[15%] sm:w-[15%] text-right py-2 pl-2 pr-3 font-medium whitespace-nowrap">
                m²
              </th>
              <th className="w-[25%] sm:w-[20%] text-right py-2 pl-3 font-medium">
                Cena
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {/* Korpus */}
            <tr>
              <td className="py-2.5 pr-2">
                <div className="text-muted-foreground text-xs">Korpus</div>
                <div
                  className="font-medium max-w-[140px] sm:max-w-full truncate"
                  title={orderData.materialName}
                >
                  {orderData.materialName}
                </div>
              </td>
              <td className="py-2.5 px-2 tabular-nums whitespace-nowrap">
                {orderData.materialProductCode || "-"}
              </td>
              <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                {orderData.priceBreakdown.korpus.areaM2.toFixed(2)}
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                {formatPrice(orderData.priceBreakdown.korpus.price)}
              </td>
            </tr>
            {/* Lica/Vrata */}
            <tr>
              <td className="py-2.5 pr-2">
                <div className="text-muted-foreground text-xs">Lica/Vrata</div>
                <div
                  className="font-medium max-w-[140px] sm:max-w-full truncate"
                  title={orderData.frontMaterialName}
                >
                  {orderData.frontMaterialName}
                </div>
              </td>
              <td className="py-2.5 px-2 tabular-nums whitespace-nowrap">
                {orderData.frontMaterialProductCode || "-"}
              </td>
              <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                {orderData.priceBreakdown.front.areaM2.toFixed(2)}
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                {formatPrice(orderData.priceBreakdown.front.price)}
              </td>
            </tr>
            {/* Leđa */}
            {orderData.backMaterialId && (
              <tr>
                <td className="py-2.5 pr-2">
                  <div className="text-muted-foreground text-xs">Leđa</div>
                  <div
                    className="font-medium max-w-[140px] sm:max-w-full truncate"
                    title={orderData.backMaterialName || ""}
                  >
                    {orderData.backMaterialName}
                  </div>
                </td>
                <td className="py-2.5 px-2 tabular-nums whitespace-nowrap">
                  {orderData.backMaterialProductCode || "-"}
                </td>
                <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                  {orderData.priceBreakdown.back.areaM2.toFixed(2)}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                  {formatPrice(orderData.priceBreakdown.back.price)}
                </td>
              </tr>
            )}
            {/* Ručke */}
            {orderData.priceBreakdown.handles &&
              orderData.priceBreakdown.handles.count > 0 && (
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="text-muted-foreground text-xs">Ručke</div>
                    <div className="font-medium">
                      {orderData.priceBreakdown.handles.count} kom
                    </div>
                  </td>
                  <td className="py-2.5 px-2 tabular-nums whitespace-nowrap">
                    -
                  </td>
                  <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                    -
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                    {formatPrice(orderData.priceBreakdown.handles.price)}
                  </td>
                </tr>
              )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="py-3 pr-2 font-semibold">Ukupno</td>
              <td className="py-3 pl-2 pr-3 text-right tabular-nums font-medium whitespace-nowrap">
                {areaM2.toFixed(2)} m²
              </td>
              <td className="py-3 pl-3 text-right">
                <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-1">
                  <span className="text-base sm:text-lg font-bold tabular-nums">
                    {formatPrice(orderData.totalPrice)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium">RSD</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
