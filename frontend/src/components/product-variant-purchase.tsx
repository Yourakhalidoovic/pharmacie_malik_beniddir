"use client";

import { AddToCartButton } from "@/components/add-to-cart-button";
import type { ColorVariant } from "@/lib/types";
import { useMemo, useState } from "react";

export function ProductVariantPurchase({
  productId,
  colorVariants,
}: {
  productId: number;
  colorVariants: ColorVariant[];
}) {
  const normalizedVariants = useMemo(
    () =>
      colorVariants
        .map((variant) => ({
          name: variant.name.trim(),
          stock: Math.max(0, Math.floor(Number(variant.stock || 0))),
          inStock: Boolean(variant.inStock),
        }))
        .filter((variant) => variant.name),
    [colorVariants],
  );

  const hasVariants = normalizedVariants.length > 0;
  const firstAvailable = normalizedVariants.find((variant) => variant.inStock);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    hasVariants ? (firstAvailable?.name ?? normalizedVariants[0].name) : null,
  );

  const selectedVariant = normalizedVariants.find(
    (variant) => variant.name === selectedColor,
  );

  const selectedOutOfStock =
    hasVariants && selectedVariant ? selectedVariant.stock <= 0 : false;

  return (
    <div className="space-y-4">
      {hasVariants ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {normalizedVariants.map((variant) => {
              const active = selectedColor === variant.name;
              const unavailable = variant.stock <= 0;
              return (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => setSelectedColor(variant.name)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : unavailable
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: colorToHex(variant.name) }}
                  />
                  {variant.name}
                  {unavailable ? (
                    <span className="text-xs opacity-90">(Rupture)</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selectedColor ? (
            <p className="text-xs text-slate-500">
              Variante sélectionnée: {selectedColor}
            </p>
          ) : null}
        </div>
      ) : null}

      <AddToCartButton
        productId={productId}
        selectedColor={selectedColor}
        disabled={Boolean(selectedOutOfStock)}
        disabledMessage={
          selectedOutOfStock
            ? "Cette couleur est en rupture de stock."
            : undefined
        }
      />
    </div>
  );
}

function colorToHex(color: string) {
  const map: Record<string, string> = {
    blanc: "#ffffff",
    white: "#ffffff",
    noir: "#111827",
    black: "#111827",
    bleu: "#2563eb",
    blue: "#2563eb",
    rouge: "#dc2626",
    red: "#dc2626",
    rose: "#ec4899",
    pink: "#ec4899",
    vert: "#16a34a",
    green: "#16a34a",
    gris: "#6b7280",
    gray: "#6b7280",
    argent: "#9ca3af",
    silver: "#9ca3af",
    doré: "#ca8a04",
    dore: "#ca8a04",
    gold: "#ca8a04",
  };

  return map[color.toLowerCase()] || "#94a3b8";
}
