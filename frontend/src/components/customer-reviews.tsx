"use client";

import { API_BASE_URL } from "@/lib/api";
import type { CustomerReview } from "@/lib/types";
import { FormEvent, useEffect, useState } from "react";

export function CustomerReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState(5);

  const loadReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Envoi de votre avis...");

    const formData = new FormData(form);
    const payload = {
      customerName: String(formData.get("customerName") || "").trim(),
      rating,
      message: String(formData.get("message") || "").trim(),
    };

    const response = await fetch(`${API_BASE_URL}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.message || "Impossible d'envoyer votre avis.");
      return;
    }

    form.reset();
    setRating(5);
    setStatus(
      "Merci. Votre avis a été envoyé et sera affiché après validation.",
    );
    await loadReviews();
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Avis clients
        </p>
        <h2 className="text-3xl font-bold text-slate-900">
          Ce que disent nos clients
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Aucun avis publié pour le moment.
            </p>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {review.customer_name}
                  </p>
                  <p className="text-amber-500">{"★".repeat(review.rating)}</p>
                </div>
                <p className="text-sm text-slate-600">{review.message}</p>
              </article>
            ))
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            Laisser un avis
          </h3>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Nom / Société</span>
            <input
              name="customerName"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Note</span>
            <div className="flex items-center gap-2 text-2xl text-amber-500">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`leading-none transition ${
                    value <= rating ? "opacity-100" : "opacity-30"
                  }`}
                  aria-label={`Noter ${value} sur 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Avis</span>
            <textarea
              name="message"
              rows={4}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
              placeholder="Partagez votre expérience avec Pharmacie Beniddir Malik..."
            />
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
            </svg>
            Envoyer mon avis
          </button>

          {status ? <p className="text-sm text-slate-600">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
