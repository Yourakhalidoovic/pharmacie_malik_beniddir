"use client";

import { API_BASE_URL } from "@/lib/api";
import { getAuthSession } from "@/lib/auth-storage";
import { withBasePath } from "@/lib/base-path";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ContactPharmacyPage() {
  const [status, setStatus] = useState("");
  const whatsappHref = "https://wa.me/213560049583";
  const mapsHref =
    "https://www.google.com/maps/place/Pharmacie+BENIDDIR+MALIK/@36.7542609,2.9769067,17z/data=!4m6!3m5!1s0x128fb1d2b34688b3:0x37c610ef771f0608!8m2!3d36.7544414!4d2.9775826!16s%2Fg%2F11c75yryd2?entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D";
  const mapsEmbedSrc =
    "https://www.google.com/maps?q=36.7544414,2.9775826&z=16&output=embed";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const session = getAuthSession();

    if (!session?.token) {
      setStatus(
        "Veuillez vous connecter pour envoyer un message à la pharmacie.",
      );
      return;
    }

    setStatus("Envoi en cours...");

    const formData = new FormData(form);
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const lines = [
      "[Formulaire contact pharmacie]",
      `Sujet: ${subject || "Sans sujet"}`,
      "Message:",
      message,
    ];

    const response = await fetch(`${API_BASE_URL}/api/account/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ message: lines.join("\n") }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data?.message || "Erreur d'envoi. Merci de réessayer.");
      return;
    }

    form.reset();
    setStatus(
      "Message envoyé. Vous le trouverez dans la messagerie de votre compte.",
    );
  }

  const session = getAuthSession();
  const isLoggedIn = Boolean(session?.token);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mx-auto flex w-full max-w-sm items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <Image
              src={withBasePath("/younes.png")}
              alt="Logo Pharmacie Beniddir Malik"
              width={420}
              height={180}
              unoptimized
              style={{ height: "auto" }}
              className="mx-auto h-auto w-full max-w-[320px] object-contain object-center"
              priority
            />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Contact pharmacie
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Pharmacie Beniddir Malik
          </h1>
          <p className="text-slate-600">
            Une question sur un produit parapharmaceutique, un conseil
            d&apos;usage ou une disponibilité ? Envoyez-nous votre message.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Email
              </p>
              <a
                href="mailto:pharmacie.boisdescars@yahoo.com"
                className="mt-1 block break-all font-semibold leading-tight text-slate-900 underline-offset-2 hover:underline"
              >
                pharmacie.boisdescars@yahoo.com
              </a>
              <p className="text-sm text-slate-600">Réponse sous 24h</p>
              <a
                href="mailto:pharmacie.boisdescars@yahoo.com"
                className="mt-1 inline-block text-sm font-medium text-slate-700 underline"
              >
                Envoyer un email
              </a>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Téléphone
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                00213 560049583
              </p>
              <p className="text-sm text-slate-600">Lun-Sam · 08:00 - 19:00</p>
              <a
                href="tel:+213560049583"
                className="mt-1 inline-block text-sm font-medium text-slate-700 underline"
              >
                Appeler maintenant
              </a>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Adresse
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                19 bois des cars 1 - Dely Brahim -Alger
              </p>
              <p className="text-sm text-slate-600">
                Service client parapharmacie
              </p>
            </article>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Localisation
              </h2>
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
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
                  <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Itinéraire vers la pharmacie
              </a>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <iframe
                title="Localisation Pharmacie Beniddir Malik"
                src={mapsEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full"
              />
            </div>
          </section>

          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {!isLoggedIn ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Connectez-vous pour envoyer un message. Votre demande sera
                visible dans la messagerie de votre compte et reçue par
                l&apos;administration.
              </p>
            ) : null}

            <Input
              name="fullName"
              label="Nom complet"
              defaultValue={session?.user?.name || ""}
              required
            />
            <Input
              name="email"
              label="Email"
              type="email"
              defaultValue={session?.user?.email || ""}
              required
            />
            <Input name="phone" label="Téléphone" />
            <Input name="subject" label="Sujet" required />

            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>Message</span>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
                placeholder="Expliquez votre besoin..."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!isLoggedIn}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
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
                Envoyer le message
              </button>
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
                  Se connecter
                </Link>
              ) : null}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7h18" />
                  <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                  <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                  <path d="M9 12h6" />
                </svg>
                Voir le catalogue
              </Link>
            </div>

            {status ? <p className="text-sm text-slate-600">{status}</p> : null}
          </form>
        </div>
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
