import { CustomerReviews } from "@/components/customer-reviews";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts, getStats } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const [featuredProducts, stats] = await Promise.all([
    getFeaturedProducts(),
    getStats(),
  ]);

  return (
    <main>
      <section className="bg-black text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
              Pharmacie Beniddir Malik
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Pharmacie Malik Beniddir, votre espace parapharmacie de confiance
            </h1>
            <p className="max-w-xl text-zinc-300">
              Découvrez nos soins du quotidien, produits d&apos;hygiène,
              compléments, orthopédie légère et matériel médical avec conseil
              personnalisé.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Explorer le catalogue
              </Link>
              <Link
                href="/b2b"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 4.18 2 2 0 0 1 5 2h2.09a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L8.3 9.4a16 16 0 0 0 6.3 6.3l.95-.95a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92Z" />
                </svg>
                Contacter la pharmacie
              </Link>
            </div>
          </div>

          <Image
            src="/pharma.png"
            alt="Espace parapharmacie"
            width={1200}
            height={800}
            className="h-[390px] w-full rounded-2xl object-cover"
            priority
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-10 md:grid-cols-5">
        <Stat label="Références actives" value={String(stats.markets)} />
        <Stat label="Produits" value={String(stats.products)} />
        <Stat
          label="Clients servis"
          value={String(stats.restaurantsInAlgeria)}
        />
        <Stat label="Avis clients" value={String(stats.reviews)} />
        <Stat label="Commandes" value={String(stats.orders)} />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sélection
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Produits vedettes
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            Voir tout le catalogue
          </Link>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <CustomerReviews />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
