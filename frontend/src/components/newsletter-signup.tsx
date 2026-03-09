"use client";

import { API_BASE_URL, HAS_PUBLIC_API } from "@/lib/api";
import { FormEvent, useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!HAS_PUBLIC_API) {
      setStatus(
        "Newsletter indisponible en mode demo. Elle sera active avec le backend VPS.",
      );
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setStatus("Veuillez saisir votre email.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Inscription en cours...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, source: "homepage" }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.message || "Inscription impossible pour le moment.");
        setIsSubmitting(false);
        return;
      }

      setEmail("");
      setStatus(
        data.message ||
          "Merci. Votre email a ete ajoute pour les prochaines offres.",
      );
    } catch {
      setStatus("Erreur reseau. Merci de reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Newsletter
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          Recevez nos offres et conseils par email
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Abonnez-vous pour recevoir nos offres promotionnelles, nouveautes
          parapharmacie et conseils de prevention en priorite.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-5 flex flex-col gap-3 md:flex-row"
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="votre.email@exemple.com"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none ring-slate-300 focus:ring"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Inscription..." : "Je m'abonne"}
          </button>
        </form>

        {status ? (
          <p className="mt-3 text-sm text-slate-600">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
