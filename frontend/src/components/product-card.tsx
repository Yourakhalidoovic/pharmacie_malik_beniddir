import type { Product } from "@/lib/types";
import Link from "next/link";
import { PriceDisplay } from "./price-display";

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        compact ? "text-sm" : ""
      }`}
    >
      <img
        src={product.image}
        alt={product.name}
        className={
          compact ? "h-36 w-full object-cover" : "h-52 w-full object-cover"
        }
      />
      <div
        className={
          compact
            ? "flex flex-1 flex-col space-y-2 p-3"
            : "flex flex-1 flex-col space-y-3 p-5"
        }
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {product.category}
          </span>
        </div>

        <h3
          className={
            compact
              ? "h-[42px] line-clamp-2 text-sm font-semibold text-slate-900"
              : "h-[56px] line-clamp-2 text-lg font-semibold text-slate-900"
          }
        >
          {product.name}
        </h3>
        <p
          className={
            compact
              ? "h-[40px] line-clamp-2 text-xs text-slate-600"
              : "h-[52px] line-clamp-2 text-sm text-slate-600"
          }
        >
          {product.description}
        </p>

        <div
          className={
            compact
              ? "h-[56px] overflow-hidden flex flex-wrap content-start gap-1.5"
              : "h-[70px] overflow-hidden flex flex-wrap content-start gap-2"
          }
        >
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            Type: {product.grade}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            Modèle: {product.model}
          </span>
          {product.colors.length > 0 ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              Couleurs: {product.colors.length}
            </span>
          ) : null}
        </div>

        <div
          className={
            compact
              ? "mt-auto flex flex-col gap-2 pt-1"
              : "mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-end sm:justify-between"
          }
        >
          <PriceDisplay
            amountInEuro={product.price}
            unit={product.unit}
            className={
              compact
                ? "whitespace-nowrap text-base font-bold text-slate-900"
                : "whitespace-nowrap text-base font-bold text-slate-900 sm:text-lg"
            }
          />
          <Link
            href={`/products/details?slug=${encodeURIComponent(product.slug)}`}
            className={
              compact
                ? "inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold leading-none text-white transition hover:bg-slate-700"
                : "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 sm:min-w-[110px] sm:w-auto sm:px-4 sm:text-sm"
            }
          >
            {compact ? null : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
            Voir produit
          </Link>
        </div>
      </div>
    </article>
  );
}
