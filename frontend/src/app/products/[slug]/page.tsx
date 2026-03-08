import { BackToCatalogButton } from "@/components/back-to-catalog-button";
import { PriceDisplay } from "@/components/price-display";
import { ProductCard } from "@/components/product-card";
import { ProductVariantPurchase } from "@/components/product-variant-purchase";
import { getProductBySlug, getProducts } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const products = await getProducts();
    return products
      .map((product) => product.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();
  const sameCategoryProducts = allProducts.filter(
    (candidate) =>
      candidate.id !== product.id &&
      candidate.category.toLowerCase() === product.category.toLowerCase(),
  );

  const relatedProducts = sameCategoryProducts.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-5">
        <BackToCatalogButton />
      </div>

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
          <h1 className="text-4xl font-bold text-slate-900">{product.name}</h1>
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

      {relatedProducts.length > 0 ? (
        <section className="mt-12 space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Meme categorie
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Produits similaires
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} compact />
            ))}
          </div>
        </section>
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
