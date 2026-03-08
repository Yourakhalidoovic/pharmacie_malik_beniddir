"use client";

import {
  clearAuthSession,
  getAuthChangeEventName,
  getAuthSession,
} from "@/lib/auth-storage";
import { getCartChangeEventName, getCartItemsCount } from "@/lib/cart-storage";
import type { AuthUser } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/products", label: "Catalogue" },
  { href: "/b2b", label: "Contact" },
];

export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const syncAuth = () => {
      const session = getAuthSession();
      setUser(session?.user || null);
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener(getAuthChangeEventName(), syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener(getAuthChangeEventName(), syncAuth);
    };
  }, []);

  useEffect(() => {
    const syncCart = () => {
      setCartCount(getCartItemsCount());
    };

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener(getCartChangeEventName(), syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener(getCartChangeEventName(), syncCart);
    };
  }, []);

  const onLogout = () => {
    clearAuthSession();
    setUser(null);
    window.location.href = "/";
  };

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = String(formData.get("q") || "").trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  const onNavigateFromMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const onLogoutFromMobileMenu = () => {
    setIsMobileMenuOpen(false);
    onLogout();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 md:gap-3 md:px-4 lg:gap-4 lg:px-6 lg:py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-slate-900"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 shadow-sm">
            <Image
              src="/younes.png"
              alt="Logo Pharmacie Beniddir Malik"
              width={44}
              height={44}
              unoptimized
              style={{ width: "auto", height: "auto" }}
              className="h-11 w-11 object-cover"
              priority
            />
          </span>
          <span className="max-w-[130px] truncate text-[13px] font-bold tracking-tight sm:max-w-[170px] md:max-w-[190px] md:text-sm lg:max-w-none lg:text-lg">
            Pharmacie Beniddir Malik
          </span>
        </Link>

        <form
          onSubmit={onSearch}
          className="mx-1 hidden min-w-0 flex-1 md:block lg:mx-2"
        >
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              name="q"
              placeholder="Rechercher un produit paramédical..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-xs text-slate-700 outline-none ring-slate-300 focus:ring md:text-sm"
            />
          </label>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
          <Link
            href="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100"
            aria-label="Panier"
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span className="pointer-events-none absolute right-0 top-0 z-10 inline-flex min-h-5 min-w-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-slate-900 px-1 text-[11px] font-semibold leading-none text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
            aria-label="Ouvrir le menu"
            aria-expanded={isMobileMenuOpen}
          >
            <MenuIcon />
          </button>
        </div>

        <nav className="hidden ml-auto items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="hidden transition hover:text-slate-900 lg:inline"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center transition hover:text-slate-900"
            aria-label="Panier"
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span className="pointer-events-none absolute right-0 top-0 z-10 inline-flex min-h-5 min-w-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-slate-900 px-1 text-[11px] font-semibold leading-none text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>

          <Link
            href={
              !user
                ? "/login"
                : ["admin", "pharmacien"].includes(user.role)
                  ? "/admin"
                  : "/account"
            }
            className="transition hover:text-slate-900"
            aria-label="Compte"
          >
            <UserIcon />
          </Link>

          {user ? (
            <>
              <Link
                href={
                  ["admin", "pharmacien"].includes(user.role)
                    ? "/admin"
                    : "/account"
                }
                className="hidden transition hover:text-slate-900 lg:inline"
              >
                {["admin", "pharmacien"].includes(user.role)
                  ? "Espace equipe"
                  : "Compte client"}
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100"
                aria-label="Déconnexion"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
                Déconnexion
              </button>
            </>
          ) : null}
        </nav>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white px-6 py-3 lg:hidden">
          <nav className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <Link
                key={`mobile-${link.href}-${link.label}`}
                href={link.href}
                onClick={onNavigateFromMobileMenu}
                className="rounded-lg px-3 py-2 transition hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={
                !user
                  ? "/login"
                  : ["admin", "pharmacien"].includes(user.role)
                    ? "/admin"
                    : "/account"
              }
              onClick={onNavigateFromMobileMenu}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100"
            >
              <UserIcon />
              Compte
            </Link>

            {user ? (
              <>
                <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {["admin", "pharmacien"].includes(user.role)
                    ? "Espace equipe connecté"
                    : "Compte client connecté"}
                </p>
                <p className="px-3 text-sm text-slate-600">
                  Bienvenue, {user.name}
                </p>
                <button
                  type="button"
                  onClick={onLogoutFromMobileMenu}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  Déconnexion
                </button>
              </>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.6 10.4a2 2 0 0 0 1.94 1.6h8.66a2 2 0 0 0 1.94-1.51L22 7H7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
