"use client";

import { API_BASE_URL } from "@/lib/api";
import { getAuthSession } from "@/lib/auth-storage";
import { formatPriceFromEuro, useCurrency } from "@/lib/currency";
import { getOrderStatusLabel, getOrderTypeLabel } from "@/lib/order-labels";
import type { AuthUser, ClientMessage, OrderSummary } from "@/lib/types";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AccountSection = "orders" | "messages";

export default function AccountPage() {
  const { currency } = useCurrency();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [status, setStatus] = useState("Chargement...");
  const [activeSection, setActiveSection] = useState<AccountSection>("orders");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderMonthFilter, setOrderMonthFilter] = useState("all");
  const [messageInput, setMessageInput] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [messageError, setMessageError] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      setStatus("Veuillez vous connecter.");
      return;
    }

    setUser(session.user);

    const load = async () => {
      try {
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user || session.user);
        }

        const ordersRes = await fetch(`${API_BASE_URL}/api/account/orders`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (!ordersRes.ok) {
          throw new Error("orders-failed");
        }

        const ordersData = await ordersRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);

        const messagesRes = await fetch(
          `${API_BASE_URL}/api/account/messages`,
          {
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(Array.isArray(messagesData) ? messagesData : []);
        }

        setStatus("");
      } catch {
        setStatus(
          "Compte chargé. Impossible de synchroniser les commandes pour le moment.",
        );
      }
    };

    load();
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) return;

    const interval = window.setInterval(async () => {
      try {
        const messagesRes = await fetch(
          `${API_BASE_URL}/api/account/messages`,
          {
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );
        if (!messagesRes.ok) return;
        const data = await messagesRes.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        // Ignore silent polling errors
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const orderMonthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const order of orders) {
      const month = String(order.created_at || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) {
        return false;
      }

      const orderMonth = String(order.created_at || "").slice(0, 7);
      if (orderMonthFilter !== "all" && orderMonth !== orderMonthFilter) {
        return false;
      }

      if (!q) return true;

      return `${order.id} ${order.status} ${getOrderStatusLabel(order.status)} ${order.order_type} ${getOrderTypeLabel(order.order_type)} ${order.total} ${order.created_at || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [orders, orderSearch, orderStatusFilter, orderMonthFilter]);

  const onSubmitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = getAuthSession();
    if (!session) {
      setMessageError(true);
      setMessageStatus("Session expirée. Reconnectez-vous.");
      return;
    }

    const trimmed = messageInput.trim();
    if (!trimmed) {
      setMessageError(true);
      setMessageStatus("Veuillez saisir un message.");
      return;
    }

    setMessageError(false);
    setMessageStatus("Envoi du message...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/account/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessageError(true);
        setMessageStatus(data?.message || "Envoi impossible.");
        return;
      }

      setMessageInput("");
      setMessageStatus("Message envoyé à l'administration.");

      const messagesRes = await fetch(`${API_BASE_URL}/api/account/messages`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(Array.isArray(messagesData) ? messagesData : []);
      }
    } catch {
      setMessageError(true);
      setMessageStatus("Erreur réseau lors de l'envoi.");
    }
  };

  if (status && !user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-slate-700">{status}</p>
        <Link
          href="/login"
          className="mt-3 inline-block font-semibold underline"
        >
          Aller à la connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <p className="mb-2 text-lg font-semibold text-slate-900">
            Compte client
          </p>
          <p className="mb-4 text-sm text-slate-600">
            {user?.name}
            <br />
            {user?.email}
          </p>
          <nav className="space-y-2">
            <button
              type="button"
              onClick={() => setActiveSection("orders")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeSection === "orders"
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Mes commandes
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("messages")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeSection === "messages"
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Messages admin
            </button>
          </nav>
        </aside>

        <section className="space-y-4">
          {activeSection === "orders" ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Mes commandes
              </h2>

              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Recherche (id, statut, type...)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="shipped">Expédiée</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>

                <select
                  value={orderMonthFilter}
                  onChange={(e) => setOrderMonthFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Tous les mois</option>
                  {orderMonthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                  Aucune commande pour ce filtre.
                </p>
              ) : (
                filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      Commande #{order.id}
                    </p>
                    <p className="text-sm text-slate-600">
                      Type: {getOrderTypeLabel(order.order_type)} · Statut:{" "}
                      {getOrderStatusLabel(order.status)}
                    </p>
                    <p className="text-sm text-slate-600">
                      Total:{" "}
                      {formatPriceFromEuro(Number(order.total), currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Date: {order.created_at}
                    </p>
                  </article>
                ))
              )}
            </section>
          ) : null}

          {activeSection === "messages" ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Discussion avec l&apos;administration
              </h2>

              <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Aucun message. Envoyez votre première demande.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.sender_role === "client"
                          ? "ml-auto bg-slate-900 text-white"
                          : "mr-auto bg-white text-slate-800 border border-slate-200"
                      }`}
                    >
                      <p className="whitespace-pre-line break-words">
                        {msg.message}
                      </p>
                      <p
                        className={`mt-1 text-[11px] ${
                          msg.sender_role === "client"
                            ? "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {msg.sender_role === "client"
                          ? "Vous"
                          : "Administration"}{" "}
                        · {msg.created_at}
                      </p>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={onSubmitMessage} className="space-y-2">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  rows={3}
                  placeholder="Écrivez votre message à l'administration..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-slate-300 focus:ring"
                />
                <div className="flex items-center gap-3">
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
                    Envoyer
                  </button>
                  {messageStatus ? (
                    <p
                      className={`text-sm ${messageError ? "text-rose-600" : "text-slate-600"}`}
                    >
                      {messageStatus}
                    </p>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
