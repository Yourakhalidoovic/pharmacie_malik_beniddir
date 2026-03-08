"use client";

import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  quickActions: [
    { label: "Catalogue", href: "/products" },
    { label: "Contact", href: "/b2b" },
    { label: "Panier", href: "/cart" },
    { label: "Compte client", href: "/account" },
  ],
  collections: [
    { label: "Soins visage", href: "/products?q=Soins%20visage" },
    {
      label: "Hygiène & bébé",
      href: "/products?q=Hygi%C3%A8ne%20%26%20b%C3%A9b%C3%A9",
    },
    { label: "Premiers secours", href: "/products?q=Premiers%20secours" },
    {
      label: "Complément alimentaire",
      href: "/products?q=Compl%C3%A9ment%20alimentaire",
    },
    { label: "Soin cicatrisant", href: "/products?q=Soin%20cicatrisant" },
    {
      label: "Shampoing antipelliculaire",
      href: "/products?q=Shampoing%20antipelliculaire",
    },
    {
      label: "Shampooing anti chute",
      href: "/products?q=Shampooing%20anti%20chute",
    },
    {
      label: "Soin anti imperfections",
      href: "/products?q=Soin%20anti%20imperfections",
    },
    { label: "Écrans solaires", href: "/products?q=%C3%89crans%20solaires" },
  ],
};

export function SiteFooter() {
  const phone = "+213560049583";
  const email = "pharmacie.boisdescars@yahoo.com";

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 md:px-5 lg:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 border-l border-white/20 pl-3">
              <Image
                src="/younes.png"
                alt="Logo Pharmacie Beniddir Malik"
                width={30}
                height={30}
                style={{ width: "auto", height: "auto" }}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-base font-semibold">
                Pharmacie Beniddir Malik
              </span>
            </div>

            <p className="mt-8 max-w-xs text-base leading-relaxed text-slate-300">
              Produits parapharmaceutiques sélectionnés, conseils pratiques et
              livraison rapide pour votre confort au quotidien.
            </p>
          </div>

          <div className="min-w-0">
            <h4 className="mb-5 text-lg font-semibold text-white">
              Actions rapides
            </h4>
            <ul className="space-y-4">
              {footerLinks.quickActions.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-slate-300 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="mb-5 text-lg font-semibold text-white">
              Collections
            </h4>
            <ul className="space-y-4">
              {footerLinks.collections.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-slate-300 transition-colors hover:text-white break-words"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="mb-5 text-xl font-semibold text-white">Contact</h4>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Tél: <a href={`tel:${phone}`}>{phone}</a>
              </p>
              <p>
                Email:{" "}
                <a href={`mailto:${email}`} className="break-all">
                  {email}
                </a>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href="https://www.instagram.com/pharmacie_beniddir_malik/reels/?ct-referrer=perplexity"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 font-semibold text-white transition hover:bg-white/10"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://wa.me/213560049583"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.31-1.66a11.84 11.84 0 0 0 5.75 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.43Zm-8.46 18.3h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.22-3.74.98 1-3.64-.24-.37a9.9 9.9 0 0 1-1.53-5.24c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.02 2.91a9.86 9.86 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.42c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.24-.46-2.36-1.48-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.58-.9-2.16-.24-.58-.49-.5-.66-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.01-1.04 2.47 0 1.45 1.07 2.86 1.22 3.06.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:flex-wrap md:items-center">
          <p>
            © {new Date().getFullYear()} Pharmacie Beniddir Malik. Tous droits
            réservés.
          </p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
