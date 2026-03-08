"use client";

import { addToCart } from "@/lib/cart-storage";
import { useState } from "react";

export function AddToCartButton({
  productId,
  selectedColor,
  disabled = false,
  disabledMessage,
}: {
  productId: number;
  selectedColor?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  const onAdd = () => {
    if (quantity < 1 || disabled) return;
    addToCart(productId, quantity, selectedColor || undefined);
    setMessage("Produit ajouté au panier.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={disabled}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
            <path d="M2 3h3l2.6 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H7" />
          </svg>
          Ajouter au panier
        </button>
      </div>
      {disabled && disabledMessage ? (
        <p className="text-sm text-rose-600">{disabledMessage}</p>
      ) : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
