"use client";

import { formatPriceFromEuro, useCurrency } from "@/lib/currency";

export function PriceDisplay({
  amountInEuro,
  unit,
  className,
}: {
  amountInEuro: number;
  unit?: string;
  className?: string;
}) {
  const { currency } = useCurrency();

  return (
    <span className={className}>
      {formatPriceFromEuro(amountInEuro, currency)}
      {unit ? ` / ${unit}` : ""}
    </span>
  );
}
