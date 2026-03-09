"use client";

import { ProductCard } from "@/components/product-card";
import { API_BASE_URL, HAS_PUBLIC_API } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PARAPHARMACY_COLLECTIONS = [
  "Soins visage",
  "Hygiène & bébé",
  "Premiers secours",
  "Complément alimentaire",
  "Soin cicatrisant",
  "Shampoing antipelliculaire",
  "Shampooing anti chute",
  "Soin anti imperfections",
  "Écrans solaires",
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    const query = new URLSearchParams(window.location.search);
    return query.get("q") || "";
  });
  const [categoryInput, setCategoryInput] = useState("Toutes les catégories");
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    if (!HAS_PUBLIC_API) {
      setProducts([]);
      setStatus(
        "Catalogue detaille indisponible en mode demo. Il sera active avec le backend VPS.",
      );
      return;
    }

    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data: Product[]) => {
        setProducts(data);
        setStatus("");
      })
      .catch(() => {
        setProducts([]);
        setStatus("Impossible de charger le catalogue pour le moment.");
      });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const q = searchParams.get("q") || "";
      setSearch(q);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchParams]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...PARAPHARMACY_COLLECTIONS,
        ...products.map((p) => p.category),
      ]),
    );
  }, [products]);

  const normalizedCategoryFilter = useMemo(() => {
    const value = categoryInput.trim().toLowerCase();
    if (!value || value === "toutes les catégories") return "";
    return value;
  }, [categoryInput]);

  const filtered = useMemo(() => {
    let output = products.filter((p) => {
      const text = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      const bySearch = text.includes(search.toLowerCase());
      const byCategory =
        !normalizedCategoryFilter ||
        p.category.toLowerCase().includes(normalizedCategoryFilter);
      return bySearch && byCategory;
    });

    if (sortBy === "price-asc") {
      output = [...output].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      output = [...output].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      output = [...output].sort((a, b) => a.name.localeCompare(b.name));
    }

    return output;
  }, [products, search, normalizedCategoryFilter, sortBy]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/80">
        <div className="relative h-44 border-b border-slate-200">
          <div className="absolute inset-0 opacity-35">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="absolute left-0 right-0 border-t border-slate-300"
                style={{ top: `${56 + index * 14}px` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 px-8 py-7">
          <p className="text-sm text-slate-500">Home &nbsp;›&nbsp; Catalogue</p>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Produits
          </h1>
        </div>
      </section>

      <section className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
        />

        <select
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
        >
          <option value="Toutes les catégories">Toutes les catégories</option>
          {categoryOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
        >
          <option value="latest">Tri: plus récents</option>
          <option value="name">Tri: nom A-Z</option>
          <option value="price-asc">Tri: prix croissant</option>
          <option value="price-desc">Tri: prix décroissant</option>
        </select>
      </section>

      <section className="mb-6 flex items-center justify-end text-sm text-slate-500">
        {filtered.length} produits
      </section>

      {status ? (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {status}
        </section>
      ) : null}

      <section className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  );
}
