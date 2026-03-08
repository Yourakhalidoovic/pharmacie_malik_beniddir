"use client";

import { API_BASE_URL } from "@/lib/api";
import { setAuthSession } from "@/lib/auth-storage";
import { withBasePath } from "@/lib/base-path";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsError(false);
    setStatus("Connexion en cours...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "")
        .trim()
        .toLowerCase(),
      password: String(formData.get("password") || ""),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setStatus(data.message || "Connexion impossible");
        setIsSubmitting(false);
        return;
      }

      setAuthSession(data.token, data.user);
      setStatus("Connexion réussie. Redirection...");
      router.push(
        ["admin", "pharmacien"].includes(data.user.role)
          ? "/admin"
          : "/account",
      );
      router.refresh();
    } catch {
      setIsError(true);
      setStatus("Erreur réseau. Vérifiez votre connexion puis réessayez.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Espace client
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Image
              src={withBasePath("/younes.png")}
              alt="Logo Pharmacie Beniddir Malik"
              width={560}
              height={260}
              unoptimized
              style={{ height: "auto" }}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Connectez-vous pour suivre vos commandes, gérer vos informations et
            accéder rapidement à votre panier.
          </p>
        </article>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Connexion</h1>
            <p className="text-sm text-slate-600">
              Accédez à votre compte pour suivre vos commandes et gérer votre
              profil.
            </p>
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="exemple@domaine.com"
            required
          />

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Mot de passe</span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-24 outline-none ring-slate-300 focus:ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>

          <p className="text-sm text-slate-600">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-semibold underline">
              Inscription
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            Admin démo : admin@pharmaciebeniddirmalik.dz / Admin@123
          </p>
          <p className="text-xs text-slate-500">
            Pharmacien : pharmacien@pharmaciebeniddirmalik.dz / Pharmacien@123
          </p>
          {status ? (
            <p
              className={`text-sm ${isError ? "text-rose-600" : "text-emerald-600"}`}
            >
              {status}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
      />
    </label>
  );
}
