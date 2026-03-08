"use client";

import { BackToCatalogButton } from "@/components/back-to-catalog-button";
import { PriceDisplay } from "@/components/price-display";
import { ProductVariantPurchase } from "@/components/product-variant-purchase";
import { API_BASE_URL, HAS_PUBLIC_API } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductDetailsPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!HAS_PUBLIC_API) {
        setError(
          "Detail indisponible en mode demo. Le backend sera active sur le VPS.",
        );
        setLoading(false);
        return;
      }

      if (!slug) {
        setError("Produit introuvable.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${slug}`);
        if (!response.ok) {
          throw new Error("Produit introuvable.");
        }

        const data = (await response.json()) as Product;
        if (active) {
          setProduct(data);
        }
      } catch {
        if (active) {
          setError("Impossible de charger ce produit.");
          setProduct(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-5">
        <BackToCatalogButton />
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-700">
          Chargement du produit...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && product ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <img
            src={product.image}
            alt={product.name}
            className="h-[420px] w-full rounded-2xl object-cover"
          />

          <div className="space-y-5">
            <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {product.category}
            </span>
            <h1 className="text-4xl font-bold text-slate-900">
              {product.name}
            </h1>
            <p className="text-slate-600">{product.description}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Origine" value={product.origin} />
              <Info label="Grade" value={product.grade} />
              <Info label="Modèle" value={product.model} />
              <Info
                label="Quantité conseillée"
                value={`${product.min_order_qty} ${product.unit}`}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-end justify-between gap-4">
                <PriceDisplay
                  amountInEuro={product.price}
                  unit={product.unit}
                  className="text-3xl font-bold text-slate-900"
                />
              </div>

              <ProductVariantPurchase
                productId={product.id}
                colorVariants={product.colorVariants}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
