"use client";

import { API_BASE_URL } from "@/lib/api";
import { getAuthSession } from "@/lib/auth-storage";
import {
  clearCart,
  getCartItems,
  removeFromCart,
  setCartItemQuantity,
} from "@/lib/cart-storage";
import {
  formatPriceFromEuro,
  useCurrency,
  type CurrencyCode,
} from "@/lib/currency";
import type { AuthUser, CartItem, Product } from "@/lib/types";
import { jsPDF } from "jspdf";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ProductWithQty = Product & { quantity: number; color?: string };

type TicketData = {
  orderId?: number;
  orderDate: string;
  customerName: string;
  email: string;
  address: string;
  city: string;
  country: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    color?: string;
  }>;
  total: number;
};

export default function CartPage() {
  const pharmacyWhatsAppNumber = "213560049583";
  const { currency } = useCurrency();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("");
  const [lastTicket, setLastTicket] = useState<TicketData | null>(null);
  const [user] = useState<AuthUser | null>(
    () => getAuthSession()?.user || null,
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]));
  }, []);

  const detailedItems = useMemo<ProductWithQty[]>(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { ...product, quantity: item.quantity, color: item.color };
      })
      .filter(Boolean) as ProductWithQty[];
  }, [items, products]);

  const total = detailedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const onRemove = (productId: number, color?: string) => {
    removeFromCart(productId, color);
    setItems(getCartItems());
  };

  const onSetQuantity = (
    productId: number,
    quantity: number,
    color?: string,
  ) => {
    setCartItemQuantity(productId, quantity, color);
    setItems(getCartItems());
  };

  async function onCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (detailedItems.length === 0) {
      setStatus("Votre panier est vide.");
      return;
    }

    setStatus("Validation de commande...");
    setLastTicket(null);

    const formData = new FormData(form);
    const session = getAuthSession();
    const customerName = String(
      formData.get("customerName") || user?.name || "",
    );
    const email = String(formData.get("email") || user?.email || "");
    const address = String(formData.get("address") || "");
    const city = String(formData.get("city") || "");
    const country = String(formData.get("country") || "");

    const payload = {
      customerName,
      email,
      address,
      city,
      country,
      orderType: "retail",
      items: detailedItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        ...(item.color ? { color: item.color } : {}),
      })),
    };

    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    let responseJson: {
      total?: number;
      message?: string;
      orderId?: number;
    } | null = null;
    try {
      responseJson = await response.json();
    } catch {
      responseJson = null;
    }

    if (response.ok) {
      const finalTotal = Number(responseJson?.total ?? total);
      setLastTicket({
        orderId: Number(responseJson?.orderId || 0) || undefined,
        orderDate: new Date().toISOString(),
        customerName,
        email,
        address,
        city,
        country,
        items: detailedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: Number(item.price),
          lineTotal: Number(item.price) * item.quantity,
          ...(item.color ? { color: item.color } : {}),
        })),
        total: finalTotal,
      });

      clearCart();
      setItems([]);
      form.reset();
      setStatus("Commande enregistrée avec succès.");
      return;
    }

    setStatus(responseJson?.message || "Erreur lors de la commande.");
  }

  const onDownloadTicket = () => {
    if (!lastTicket) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const lines = buildOrderTicketPdfLines(lastTicket, currency);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const marginTop = 48;
    const lineHeight = 16;
    const maxTextWidth = pageWidth - marginX * 2;

    let y = marginTop;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PHARMACIE BENIDDIR MALIK", marginX, y);
    y += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Ticket de commande (PDF)", marginX, y);
    y += lineHeight + 6;

    for (const line of lines) {
      const wrapped = doc.splitTextToSize(normalizeForPdf(line), maxTextWidth);
      for (const chunk of wrapped) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(chunk, marginX, y);
        y += lineHeight;
      }
    }

    const footer = "Document genere automatiquement";
    doc.setFontSize(9);
    doc.text(footer, marginX, pageHeight - 20);

    const dateLabel = new Date(lastTicket.orderDate).toISOString().slice(0, 10);
    const reference = lastTicket.orderId ? `-${lastTicket.orderId}` : "";
    const fileName = `ticket-commande${reference}-${dateLabel}.pdf`;

    doc.save(fileName);
  };

  const onSendTicketToWhatsApp = () => {
    if (!lastTicket) return;

    const message = buildOrderTicketWhatsAppMessage(lastTicket, currency);
    const whatsappUrl = `https://wa.me/${pharmacyWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const onPrintTicket80mm = () => {
    if (!lastTicket) return;

    const printableWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printableWindow) {
      setStatus(
        "Impossible d'ouvrir la fenetre d'impression. Autorisez les pop-ups.",
      );
      return;
    }

    const html = buildOrderTicketThermalHtml(lastTicket, currency);
    printableWindow.document.open();
    printableWindow.document.write(html);
    printableWindow.document.close();
    printableWindow.focus();
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-8 text-4xl font-bold text-slate-900">
        Panier & Commande
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          {detailedItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">
              Aucun produit dans le panier.
            </p>
          ) : (
            detailedItems.map((item) => (
              <article
                key={`${item.id}-${item.color || "default"}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">
                    {formatPriceFromEuro(item.price, currency)} / {item.unit}
                  </p>
                  {item.color ? (
                    <p className="text-sm text-slate-500">
                      Couleur: {item.color}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={item.quantity}
                    onChange={(e) =>
                      onSetQuantity(item.id, Number(e.target.value), item.color)
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onRemove(item.id, item.color)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                  >
                    Retirer
                  </button>
                </div>
              </article>
            ))
          )}

          <p className="text-xl font-bold text-slate-900">
            Total: {formatPriceFromEuro(total, currency)}
          </p>
        </section>

        <form
          onSubmit={onCheckout}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Informations de livraison
          </h2>
          <Input
            name="customerName"
            label="Nom complet"
            required
            defaultValue={user?.name || ""}
          />
          <Input
            name="email"
            label="Email"
            type="email"
            required
            defaultValue={user?.email || ""}
          />
          <Input name="address" label="Adresse" required />
          <Input name="city" label="Ville" required />
          <Input name="country" label="Pays" required />

          <button
            type="submit"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </svg>
            Confirmer la commande
          </button>

          {lastTicket ? (
            <button
              type="button"
              onClick={onSendTicketToWhatsApp}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.31-1.66a11.84 11.84 0 0 0 5.75 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.43Zm-8.46 18.3h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.22-3.74.98 1-3.64-.24-.37a9.9 9.9 0 0 1-1.53-5.24c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.02 2.91a9.86 9.86 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.42c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.24-.46-2.36-1.48-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.58-.9-2.16-.24-.58-.49-.5-.66-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.01-1.04 2.47 0 1.45 1.07 2.86 1.22 3.06.15.2 2.1 3.2 5.09 4.48.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
              </svg>
              Envoyer le ticket sur WhatsApp
            </button>
          ) : null}

          {lastTicket ? (
            <button
              type="button"
              onClick={onDownloadTicket}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 4v11" />
                <path d="m7 11 5 5 5-5" />
                <path d="M5 20h14" />
              </svg>
              Télécharger le ticket de commande
            </button>
          ) : null}

          {lastTicket ? (
            <button
              type="button"
              onClick={onPrintTicket80mm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9V4h12v5" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v6H6z" />
              </svg>
              Imprimer le bordereau (XPrinter 80mm)
            </button>
          ) : null}

          {status ? <p className="text-sm text-slate-600">{status}</p> : null}
        </form>
      </div>
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

function buildOrderTicketPdfLines(ticket: TicketData, currency: CurrencyCode) {
  const date = new Date(ticket.orderDate).toLocaleString("fr-FR");
  const lines = [
    ...(ticket.orderId ? [`Reference commande: #${ticket.orderId}`] : []),
    `Date: ${date}`,
    `Client: ${ticket.customerName}`,
    `Email: ${ticket.email}`,
    `Adresse: ${ticket.address}, ${ticket.city}, ${ticket.country}`,
    "",
    "Articles:",
    ...ticket.items.map((item, index) => {
      const colorPart = item.color ? ` | Couleur: ${item.color}` : "";
      return `${index + 1}. ${item.name}${colorPart} | Qté: ${item.quantity} ${item.unit} | Prix: ${formatPriceFromEuro(item.unitPrice, currency)} | Ligne: ${formatPriceFromEuro(item.lineTotal, currency)}`;
    }),
    "",
    `TOTAL: ${formatPriceFromEuro(ticket.total, currency)}`,
  ];

  return lines;
}

function normalizeForPdf(text: string) {
  return text
    .replaceAll("€", "EUR")
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "OE")
    .replaceAll("’", "'")
    .replaceAll("–", "-");
}

function buildOrderTicketWhatsAppMessage(
  ticket: TicketData,
  currency: CurrencyCode,
) {
  const date = new Date(ticket.orderDate).toLocaleString("fr-FR");

  const lines = [
    "Bonjour, voici un ticket de commande :",
    `Date: ${date}`,
    `Client: ${ticket.customerName}`,
    `Email: ${ticket.email}`,
    `Adresse: ${ticket.address}, ${ticket.city}, ${ticket.country}`,
    "",
    "Articles:",
    ...ticket.items.map((item, index) => {
      const colorPart = item.color ? `, Couleur: ${item.color}` : "";
      return `${index + 1}) ${item.name}${colorPart}, Qté: ${item.quantity} ${item.unit}, Ligne: ${formatPriceFromEuro(item.lineTotal, currency)}`;
    }),
    "",
    `TOTAL: ${formatPriceFromEuro(ticket.total, currency)}`,
  ];

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOrderTicketThermalHtml(
  ticket: TicketData,
  currency: CurrencyCode,
) {
  const date = new Date(ticket.orderDate).toLocaleString("fr-FR");
  const lines = ticket.items
    .map((item, index) => {
      const colorPart = item.color ? ` - Couleur: ${item.color}` : "";
      return `
        <div class="line-item">
          <div>${index + 1}. ${escapeHtml(item.name)}</div>
          <div>Qte: ${item.quantity} ${escapeHtml(item.unit)}${escapeHtml(colorPart)}</div>
          <div>${escapeHtml(formatPriceFromEuro(item.lineTotal, currency))}</div>
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bordereau commande</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      html, body { margin: 0; padding: 0; }
      body {
        width: 72mm;
        margin: 0 auto;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.35;
        color: #000;
      }
      .title { text-align: center; font-weight: 700; margin-bottom: 8px; }
      .meta { margin-bottom: 8px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .line-item { margin-bottom: 6px; }
      .total { font-weight: 700; margin-top: 8px; }
      .hint { margin-top: 10px; font-size: 11px; }
      @media print {
        .hint { display: none; }
      }
    </style>
  </head>
  <body onload="window.print(); setTimeout(() => window.close(), 120);">
    <div class="title">PHARMACIE BENIDDIR MALIK</div>
    <div class="meta">
      ${ticket.orderId ? `<div>Commande: #${ticket.orderId}</div>` : ""}
      <div>Date: ${escapeHtml(date)}</div>
      <div>Client: ${escapeHtml(ticket.customerName)}</div>
      <div>Email: ${escapeHtml(ticket.email)}</div>
      <div>Adresse: ${escapeHtml(`${ticket.address}, ${ticket.city}, ${ticket.country}`)}</div>
    </div>
    <div class="divider"></div>
    <div><strong>Articles</strong></div>
    ${lines}
    <div class="divider"></div>
    <div class="total">TOTAL: ${escapeHtml(formatPriceFromEuro(ticket.total, currency))}</div>
    <div class="hint">Astuce: choisissez XPrinter 80mm dans la fenetre d'impression.</div>
  </body>
</html>`;
}
