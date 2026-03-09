"use client";

import { API_BASE_URL } from "@/lib/api";
import { getAuthSession } from "@/lib/auth-storage";
import { formatPriceFromEuro, useCurrency } from "@/lib/currency";
import { getOrderStatusLabel, getOrderTypeLabel } from "@/lib/order-labels";
import type {
  AdminUser,
  ClientMessage,
  CustomerReview,
  MessageUserSummary,
  OrderSummary,
  Product,
  UserRole,
} from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Overview = {
  users: number;
  clients: number;
  orders: number;
  revenue: number;
  newsletterSubscribers: number;
};

const PARAPHARMACY_COLLECTIONS = [
  "Soins visage",
  "Hygiène & bébé",
  "Premiers secours",
  "Complément alimentaire",
  "Soin cicatrisant",
  "Shampoing antipelliculaire",
  "Shampooing anti chute",
  "Soin anti imperfections",
  "Écrans solaires",
];

const PARAPHARMACY_GRADE_OPTIONS = [
  "Standard",
  "Dermatologique",
  "Hypoallergénique",
  "Bio",
  "Professionnel",
];

const PARAPHARMACY_MODEL_OPTIONS = [
  "Crème",
  "Gel",
  "Sérum",
  "Lotion",
  "Shampooing",
  "Spray",
  "Tube",
  "Flacon",
];

const PARAPHARMACY_UNIT_OPTIONS = ["unité", "ml", "g", "kg", "L", "boîte"];

const PARAPHARMACY_COLOR_OPTIONS = [
  "Blanc",
  "Noir",
  "Bleu",
  "Vert",
  "Rouge",
  "Rose",
  "Beige",
  "Transparent",
  "Jaune",
  "Gris",
];

type AdminSection =
  | "overview"
  | "reports"
  | "products"
  | "orders"
  | "users"
  | "reviews"
  | "messages";

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState("Chargement...");
  const [actionStatus, setActionStatus] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("pending");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [selectedReportProductId, setSelectedReportProductId] = useState<
    number | null
  >(null);
  const [reportMonthFilter, setReportMonthFilter] = useState("all");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportColorFilter, setReportColorFilter] = useState("all");
  const [messageUsers, setMessageUsers] = useState<MessageUserSummary[]>([]);
  const [selectedMessageUserId, setSelectedMessageUserId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [messageUserSearch, setMessageUserSearch] = useState("");
  const [colorVariantRows, setColorVariantRows] = useState<
    Array<{ name: string; stock: string }>
  >([{ name: "", stock: "0" }]);
  const [productForm, setProductForm] = useState({
    slug: "",
    name: "",
    category: "Complément alimentaire",
    grade: "Standard",
    model: "Entier",
    unit: "kg",
    stock: "0",
    price: "0",
    min_order_qty: "1",
    colors: "",
    origin: "Algérie",
    image: "",
    description: "",
    featured: false,
  });
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const changeSection = useCallback(
    (nextSection: AdminSection) => {
      setActiveSection(nextSection);

      const params = new URLSearchParams(searchParams.toString());
      if (params.get("section") === nextSection) return;

      params.set("section", nextSection);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const sectionFromUrl = searchParams.get("section");
    if (!isAdminSection(sectionFromUrl)) return;
    setActiveSection((current) =>
      current === sectionFromUrl ? current : sectionFromUrl,
    );
  }, [searchParams]);

  const onClearProductImage = () => {
    setProductForm((prev) => ({ ...prev, image: "" }));
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setActionStatus("Image supprimée. Vous pouvez en sélectionner une autre.");
  };

  const getHeaders = (withJson = false): Record<string, string> | null => {
    const session = getAuthSession();
    if (!session) return null;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.token}`,
    };

    if (withJson) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  };

  const loadData = async () => {
    const session = getAuthSession();
    if (!session) {
      setStatus("Veuillez vous connecter en admin.");
      setHasLoadedData(false);
      return;
    }

    setCurrentRole(session.user.role);
    const headers = { Authorization: `Bearer ${session.token}` };
    const isSuperAdmin = session.user.role === "admin";

    const [ordersRes, productsRes, reviewsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/orders`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/products`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/reviews`, { headers }),
    ]);

    if (!ordersRes.ok || !productsRes.ok || !reviewsRes.ok) {
      throw new Error("Forbidden");
    }

    const ordersData = await ordersRes.json();
    const productsData = await productsRes.json();
    const reviewsData = await reviewsRes.json();

    setOrders(Array.isArray(ordersData) ? ordersData : []);
    setProducts(Array.isArray(productsData) ? productsData : []);
    setReviews(Array.isArray(reviewsData) ? reviewsData : []);

    if (isSuperAdmin) {
      const [overviewRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/overview`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
      ]);

      if (!overviewRes.ok || !usersRes.ok) {
        throw new Error("Forbidden");
      }

      const overviewData = await overviewRes.json();
      const usersData = await usersRes.json();

      setOverview(overviewData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } else {
      setOverview(null);
      setUsers([]);
      if (["overview", "reports", "users"].includes(activeSection)) {
        changeSection("orders");
      }
    }

    setStatus("");
    setHasLoadedData(true);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData().catch(() => {
        setStatus("Accès refusé. Connectez-vous avec un compte autorisé.");
        setHasLoadedData(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSection, changeSection]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setShowProductForm(false);
    setColorVariantRows([{ name: "", stock: "0" }]);
    setProductForm({
      slug: "",
      name: "",
      category: "Complément alimentaire",
      grade: "Standard",
      model: "Entier",
      unit: "kg",
      stock: "0",
      price: "0",
      min_order_qty: "1",
      colors: "",
      origin: "Algérie",
      image: "",
      description: "",
      featured: false,
    });
  };

  const onSubmitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus("Sauvegarde produit...");

    if (!productForm.image) {
      setActionStatus(
        "Veuillez ajouter une image avant de sauvegarder le produit.",
      );
      return;
    }

    const normalizedColorVariants = colorVariantRows
      .map((row) => ({
        name: String(row.name || "").trim(),
        stock: Math.max(0, Math.floor(Number(row.stock || 0))),
      }))
      .filter((row) => row.name);

    const payload = {
      ...productForm,
      colors: normalizedColorVariants.map((variant) => variant.name).join(", "),
      stock: Number(productForm.stock),
      price: Number(productForm.price),
      min_order_qty: Number(productForm.min_order_qty),
      colorVariants: normalizedColorVariants,
    };

    const endpoint = editingProductId
      ? `${API_BASE_URL}/api/admin/products/${editingProductId}`
      : `${API_BASE_URL}/api/admin/products`;

    const headers = getHeaders(true);
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: editingProductId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      setActionStatus("Erreur réseau lors de la sauvegarde produit.");
      return;
    }

    let data: { message?: string } = {};
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text?.slice(0, 180) };
    }

    if (!response.ok) {
      setActionStatus(data.message || "Erreur produit");
      return;
    }

    setActionStatus(editingProductId ? "Produit mis à jour" : "Produit créé");
    resetProductForm();
    await loadData();
  };

  const onEditProduct = (product: Product) => {
    const parsedColorVariants = parseColorVariantsCsv(
      serializeColorVariants(product),
    );

    setColorVariantRows(
      parsedColorVariants.length > 0
        ? parsedColorVariants.map((variant) => ({
            name: variant.name,
            stock: String(variant.stock),
          }))
        : [{ name: "", stock: "0" }],
    );

    changeSection("products");
    setShowProductForm(true);
    setEditingProductId(product.id);
    setProductForm({
      slug: product.slug,
      name: product.name,
      category: product.category,
      grade: product.grade,
      model: product.model,
      unit: product.unit,
      stock: String(product.stock),
      price: String(product.price),
      min_order_qty: String(product.min_order_qty),
      colors: serializeColorVariants(product),
      origin: product.origin,
      image: product.image,
      description: product.description,
      featured: Boolean(product.featured),
    });
  };

  const onDeleteProduct = async (productId: number) => {
    setActionStatus("Suppression produit...");
    const headers = getHeaders();
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      setActionStatus("Suppression impossible");
      return;
    }

    setActionStatus("Produit supprimé");
    await loadData();
  };

  const onUpdateOrderStatus = async (orderId: number, nextStatus: string) => {
    setActionStatus("Mise à jour commande...");
    const headers = getHeaders(true);
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders/${orderId}/status`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: nextStatus }),
      },
    );

    if (!response.ok) {
      setActionStatus("Erreur mise à jour commande");
      return;
    }

    setActionStatus("Commande mise à jour");
    await loadData();
  };

  const onPrintOrderTicket80mm = (order: OrderSummary) => {
    const html = buildAdminOrderThermalHtml(order, currency, productNameById);
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 800);
    };

    const runPrint = () => {
      const frameWindow = iframe.contentWindow;
      const frameDoc = iframe.contentDocument;
      if (!frameWindow || !frameDoc) {
        setActionStatus("Impossible d'initialiser l'impression du bordereau.");
        cleanup();
        return;
      }

      // Let the browser finish layout before printing to avoid blank pages.
      frameWindow.requestAnimationFrame(() => {
        frameWindow.requestAnimationFrame(() => {
          frameWindow.focus();
          frameWindow.print();
          cleanup();
        });
      });
    };

    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument;
    if (!frameDoc) {
      setActionStatus("Impossible de preparer le document d'impression.");
      cleanup();
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    window.setTimeout(runPrint, 80);
  };

  const onBlockUser = async (userId: number, blocked: boolean) => {
    setActionStatus(
      blocked ? "Blocage utilisateur..." : "Déblocage utilisateur...",
    );
    const headers = getHeaders(true);
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/admin/users/${userId}/block`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ blocked }),
      },
    );

    if (!response.ok) {
      setActionStatus("Erreur gestion utilisateur");
      return;
    }

    setActionStatus(blocked ? "Utilisateur bloqué" : "Utilisateur débloqué");
    await loadData();
  };

  const onDeleteUser = async (userId: number) => {
    setActionStatus("Suppression utilisateur...");
    const headers = getHeaders();
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      setActionStatus("Suppression utilisateur impossible");
      return;
    }

    setActionStatus("Utilisateur supprimé");
    await loadData();
  };

  const onToggleReviewVisibility = async (
    reviewId: number,
    approved: boolean,
  ) => {
    setActionStatus(approved ? "Affichage avis..." : "Masquage avis...");
    const headers = getHeaders(true);
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/admin/reviews/${reviewId}/visibility`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ approved }),
      },
    );

    if (!response.ok) {
      setActionStatus("Erreur gestion avis");
      return;
    }

    setActionStatus(approved ? "Avis affiché" : "Avis masqué");
    await loadData();
  };

  const onDeleteReview = async (reviewId: number) => {
    setActionStatus("Suppression avis...");
    const headers = getHeaders();
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/admin/reviews/${reviewId}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      setActionStatus("Erreur suppression avis");
      return;
    }

    setActionStatus("Avis supprimé");
    await loadData();
  };

  const onDownloadNewsletterEmails = async () => {
    setActionStatus("Preparation du fichier newsletter...");
    const headers = getHeaders();
    if (!headers) {
      setActionStatus("Session admin manquante");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/newsletter/export`,
        {
          headers,
        },
      );

      if (!response.ok) {
        setActionStatus("Export newsletter impossible");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `newsletter-emails-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setActionStatus("Export newsletter telecharge");
    } catch {
      setActionStatus("Erreur reseau pendant l'export newsletter");
    }
  };

  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const inferredMime = inferImageMimeFromName(file.name);
    const isImageByMime = file.type.startsWith("image/");

    if (!isImageByMime && !inferredMime) {
      setActionStatus(
        "Fichier non supporté. Sélectionnez un format image valide.",
      );
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      setActionStatus("Erreur de lecture du fichier image.");
    };

    reader.onload = async () => {
      const result = String(reader.result || "");
      if (!result) return;

      setProductForm((prev) => ({ ...prev, image: result }));
      setActionStatus("Image chargée depuis votre ordinateur");
    };

    if (isImageByMime) {
      reader.readAsDataURL(file);
      return;
    }

    const fallbackReader = new FileReader();
    fallbackReader.onerror = () => {
      setActionStatus("Erreur de lecture du fichier image.");
    };

    fallbackReader.onload = () => {
      const arrayBuffer = fallbackReader.result as ArrayBuffer;
      const base64 = arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:${inferredMime};base64,${base64}`;
      setProductForm((prev) => ({ ...prev, image: dataUrl }));
      setActionStatus("Image chargée depuis votre ordinateur");
    };

    fallbackReader.readAsArrayBuffer(file);
  };

  const loadMessageUsers = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/message-users`, {
        headers,
      });

      if (!response.ok) return;

      const data = await response.json();
      const users = Array.isArray(data) ? (data as MessageUserSummary[]) : [];
      setMessageUsers(users);

      if (
        users.length > 0 &&
        (selectedMessageUserId === null ||
          !users.some((item) => item.id === selectedMessageUserId))
      ) {
        setSelectedMessageUserId(users[0].id);
      }
    } catch {
      // Ignore silent messaging refresh errors
    }
  }, [selectedMessageUserId]);

  const loadMessagesForUser = useCallback(async (userId: number) => {
    const headers = getHeaders();
    if (!headers) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/messages?userId=${userId}`,
        { headers },
      );

      if (!response.ok) return;

      const data = await response.json();
      setMessages(Array.isArray(data) ? (data as ClientMessage[]) : []);
    } catch {
      // Ignore silent messaging refresh errors
    }
  }, []);

  const onSendAdminMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMessageUserId) {
      setMessageStatus("Sélectionnez un client.");
      return;
    }

    const trimmed = messageInput.trim();
    if (!trimmed) {
      setMessageStatus("Veuillez saisir un message.");
      return;
    }

    setMessageStatus("Envoi...");
    const headers = getHeaders(true);
    if (!headers) {
      setMessageStatus("Session admin manquante.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: selectedMessageUserId,
          message: trimmed,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessageStatus(data?.message || "Envoi impossible.");
        return;
      }

      setMessageInput("");
      setMessageStatus("Réponse envoyée.");
      await Promise.all([
        loadMessagesForUser(selectedMessageUserId),
        loadMessageUsers(),
      ]);
    } catch {
      setMessageStatus("Erreur réseau lors de l'envoi.");
    }
  };

  useEffect(() => {
    if (activeSection !== "messages") return;

    const timeoutId = window.setTimeout(() => {
      void loadMessageUsers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSection, loadMessageUsers]);

  useEffect(() => {
    if (activeSection !== "messages" || !selectedMessageUserId) return;

    const timeoutId = window.setTimeout(() => {
      void loadMessagesForUser(selectedMessageUserId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSection, selectedMessageUserId, loadMessagesForUser]);

  useEffect(() => {
    if (activeSection !== "messages") return;

    const intervalId = window.setInterval(() => {
      void loadMessageUsers();
      if (selectedMessageUserId) {
        void loadMessagesForUser(selectedMessageUserId);
      }
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeSection,
    selectedMessageUserId,
    loadMessageUsers,
    loadMessagesForUser,
  ]);

  const isProductFormOpen = showProductForm || editingProductId !== null;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      `${product.name} ${product.slug} ${product.category} ${product.model}`
        .toLowerCase()
        .includes(q),
    );
  }, [products, productSearch]);

  const adminCategoryOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...PARAPHARMACY_COLLECTIONS,
        ...products.map((p) => p.category),
      ]),
    );
  }, [products]);

  const adminGradeOptions = useMemo(() => {
    return Array.from(
      new Set([...PARAPHARMACY_GRADE_OPTIONS, ...products.map((p) => p.grade)]),
    );
  }, [products]);

  const adminModelOptions = useMemo(() => {
    return Array.from(
      new Set([...PARAPHARMACY_MODEL_OPTIONS, ...products.map((p) => p.model)]),
    );
  }, [products]);

  const adminUnitOptions = useMemo(() => {
    return Array.from(
      new Set([...PARAPHARMACY_UNIT_OPTIONS, ...products.map((p) => p.unit)]),
    );
  }, [products]);

  const adminColorOptions = useMemo(() => {
    const existingColors = products.flatMap((product) => {
      if (
        Array.isArray(product.colorVariants) &&
        product.colorVariants.length > 0
      ) {
        return product.colorVariants.map((variant) => variant.name);
      }
      return Array.isArray(product.colors) ? product.colors : [];
    });

    return Array.from(
      new Set([...PARAPHARMACY_COLOR_OPTIONS, ...existingColors]),
    );
  }, [products]);

  const updateColorVariantRow = (
    rowIndex: number,
    nextPatch: Partial<{ name: string; stock: string }>,
  ) => {
    setColorVariantRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex ? { ...row, ...nextPatch } : row,
      ),
    );
  };

  const addColorVariantRow = () => {
    setColorVariantRows((currentRows) => [
      ...currentRows,
      { name: "", stock: "0" },
    ]);
  };

  const removeColorVariantRow = (rowIndex: number) => {
    setColorVariantRows((currentRows) => {
      const remainingRows = currentRows.filter(
        (_, index) => index !== rowIndex,
      );
      return remainingRows.length > 0
        ? remainingRows
        : [{ name: "", stock: "0" }];
    });
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const statusOk =
        orderStatusFilter === "all" || order.status === orderStatusFilter;
      const typeOk =
        orderTypeFilter === "all" || order.order_type === orderTypeFilter;
      if (!statusOk || !typeOk) return false;

      if (!q) return true;
      return `${order.id} ${order.customer_name} ${order.email} ${order.status} ${getOrderStatusLabel(order.status)} ${order.order_type} ${getOrderTypeLabel(order.order_type)} ${order.city || ""} ${order.country || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [orders, orderSearch, orderStatusFilter, orderTypeFilter]);

  const productNameById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product.name]));
  }, [products]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role} ${user.blocked ? "bloque" : "actif"}`
        .toLowerCase()
        .includes(q),
    );
  }, [users, userSearch]);

  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((review) =>
      `${review.customer_name} ${review.message} ${review.rating} ${review.approved ? "visible" : "masque"}`
        .toLowerCase()
        .includes(q),
    );
  }, [reviews, reviewSearch]);

  const filteredMessageUsers = useMemo(() => {
    const q = messageUserSearch.trim().toLowerCase();
    if (!q) return messageUsers;

    return messageUsers.filter((user) =>
      `${user.name} ${user.email} ${user.last_message}`
        .toLowerCase()
        .includes(q),
    );
  }, [messageUsers, messageUserSearch]);

  const reportMatchingProducts = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      `${product.name} ${product.slug} ${product.category} ${product.model}`
        .toLowerCase()
        .includes(q),
    );
  }, [products, reportSearch]);

  const effectiveReportProductId = useMemo(() => {
    if (reportMatchingProducts.length === 0) return null;

    if (
      selectedReportProductId !== null &&
      reportMatchingProducts.some(
        (product) => product.id === selectedReportProductId,
      )
    ) {
      return selectedReportProductId;
    }

    return reportMatchingProducts[0].id;
  }, [reportMatchingProducts, selectedReportProductId]);

  const selectedReportProduct = useMemo(
    () =>
      products.find((product) => product.id === effectiveReportProductId) ||
      null,
    [products, effectiveReportProductId],
  );

  const reportMonthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const order of orders) {
      if (typeof order.created_at !== "string") continue;
      const month = order.created_at.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) {
        months.add(month);
      }
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const reportColorOptions = useMemo(() => {
    if (!selectedReportProduct) return [];
    if (
      Array.isArray(selectedReportProduct.colorVariants) &&
      selectedReportProduct.colorVariants.length > 0
    ) {
      return selectedReportProduct.colorVariants.map((variant) => variant.name);
    }
    return Array.isArray(selectedReportProduct.colors)
      ? selectedReportProduct.colors
      : [];
  }, [selectedReportProduct]);

  const effectiveReportColorFilter = useMemo(() => {
    if (reportColorFilter === "all") return "all";
    const stillExists = reportColorOptions.some(
      (color) => color.toLowerCase() === reportColorFilter.toLowerCase(),
    );
    return stillExists ? reportColorFilter : "all";
  }, [reportColorFilter, reportColorOptions]);

  const isOrderWithinReportPeriod = (order: OrderSummary) => {
    const orderCreatedAt = String(order.created_at || "");
    const orderMonth = orderCreatedAt.slice(0, 7);
    const orderDate = orderCreatedAt.slice(0, 10);

    if (reportMonthFilter !== "all" && orderMonth !== reportMonthFilter) {
      return false;
    }

    if (reportStartDate && orderDate && orderDate < reportStartDate) {
      return false;
    }

    if (reportEndDate && orderDate && orderDate > reportEndDate) {
      return false;
    }

    return true;
  };

  const productReport = useMemo(() => {
    if (!selectedReportProduct) return null;

    let ordersCount = 0;
    let totalQuantity = 0;
    let turnover = 0;
    const quantityByColor = new Map<string, number>();

    for (const order of orders) {
      if (!isOrderWithinReportPeriod(order)) {
        continue;
      }

      const lines = parseOrderItemsJson(order.items_json).filter(
        (line) => line.productId === selectedReportProduct.id,
      );

      const filteredLines =
        effectiveReportColorFilter === "all"
          ? lines
          : lines.filter(
              (line) =>
                String(line.color || "").toLowerCase() ===
                effectiveReportColorFilter.toLowerCase(),
            );

      if (filteredLines.length === 0) continue;

      ordersCount += 1;
      for (const line of filteredLines) {
        totalQuantity += line.quantity;
        turnover += Number(selectedReportProduct.price || 0) * line.quantity;

        const colorKey =
          typeof line.color === "string" && line.color.trim()
            ? line.color.trim()
            : "Sans couleur";
        quantityByColor.set(
          colorKey,
          Number(quantityByColor.get(colorKey) || 0) + line.quantity,
        );
      }
    }

    const avgQtyPerOrder = ordersCount > 0 ? totalQuantity / ordersCount : 0;
    const colorBreakdown = Array.from(quantityByColor.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    return {
      ordersCount,
      totalQuantity,
      turnover,
      avgQtyPerOrder,
      colorBreakdown,
    };
  }, [
    selectedReportProduct,
    orders,
    reportMonthFilter,
    reportStartDate,
    reportEndDate,
    effectiveReportColorFilter,
  ]);

  const productSalesRows = useMemo(() => {
    const rows = reportMatchingProducts
      .map((product) => {
        const orderIds = new Set<number>();
        let quantitySold = 0;
        let turnover = 0;

        for (const order of orders) {
          if (!isOrderWithinReportPeriod(order)) {
            continue;
          }

          const lines = parseOrderItemsJson(order.items_json).filter(
            (line) => line.productId === product.id,
          );

          if (lines.length === 0) continue;

          orderIds.add(order.id);
          for (const line of lines) {
            quantitySold += line.quantity;
            turnover += Number(product.price || 0) * line.quantity;
          }
        }

        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantitySold,
          ordersCount: orderIds.size,
          turnover,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold);

    return rows;
  }, [
    orders,
    reportMatchingProducts,
    reportMonthFilter,
    reportStartDate,
    reportEndDate,
  ]);

  const selectedProductSalesRows = useMemo(() => {
    if (!selectedReportProduct) return [];

    const rows: Array<{
      orderId: number;
      createdAt: string;
      quantity: number;
      color: string;
      lineTotal: number;
    }> = [];

    for (const order of orders) {
      if (!isOrderWithinReportPeriod(order)) {
        continue;
      }

      const lines = parseOrderItemsJson(order.items_json).filter(
        (line) => line.productId === selectedReportProduct.id,
      );

      const filteredLines =
        effectiveReportColorFilter === "all"
          ? lines
          : lines.filter(
              (line) =>
                String(line.color || "").toLowerCase() ===
                effectiveReportColorFilter.toLowerCase(),
            );

      for (const line of filteredLines) {
        rows.push({
          orderId: order.id,
          createdAt: String(order.created_at || ""),
          quantity: line.quantity,
          color: line.color || "Sans couleur",
          lineTotal: Number(selectedReportProduct.price || 0) * line.quantity,
        });
      }
    }

    return rows.sort((a, b) => b.orderId - a.orderId);
  }, [
    selectedReportProduct,
    orders,
    reportMonthFilter,
    reportStartDate,
    reportEndDate,
    effectiveReportColorFilter,
  ]);

  const selectedMessageUser = useMemo(() => {
    if (selectedMessageUserId === null) return null;
    return (
      messageUsers.find((user) => user.id === selectedMessageUserId) || null
    );
  }, [messageUsers, selectedMessageUserId]);

  const overviewIndicatorRows = useMemo(() => {
    const totalStock = products.reduce((sum, product) => {
      if (
        Array.isArray(product.colorVariants) &&
        product.colorVariants.length > 0
      ) {
        return (
          sum +
          product.colorVariants.reduce(
            (acc, variant) => acc + Number(variant.stock || 0),
            0,
          )
        );
      }
      return sum + Number(product.stock || 0);
    }, 0);

    return [
      {
        key: "clients",
        label: "Clients",
        value: Number(overview?.clients || 0),
      },
      {
        key: "orders",
        label: "Commandes",
        value: Number(overview?.orders || 0),
      },
      { key: "stocks", label: "Stocks", value: totalStock },
    ];
  }, [overview, products]);

  const overviewIndicatorChartData = useMemo(() => {
    const total = overviewIndicatorRows.reduce(
      (sum, row) => sum + row.value,
      0,
    );
    const colors = ["#0f172a", "#334155", "#475569", "#64748b"];

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const fractions = overviewIndicatorRows.map((row) =>
      total > 0 ? row.value / total : 0,
    );

    const slices = overviewIndicatorRows.map((row, index) => {
      const fraction = fractions[index];
      const startFraction = fractions
        .slice(0, index)
        .reduce((sum, value) => sum + value, 0);
      const dashLength = fraction * circumference;
      const dashOffset = -startFraction * circumference;

      return {
        ...row,
        fraction,
        percentage: total > 0 ? (row.value / total) * 100 : 0,
        color: colors[index % colors.length],
        dashArray: `${dashLength} ${circumference}`,
        dashOffset,
      };
    });

    return { total, slices, radius, circumference };
  }, [overviewIndicatorRows]);

  const isSuperAdmin = currentRole === "admin";

  if (status && !hasLoadedData) {
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
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Administration
          </p>
          <nav className="space-y-2">
            {isSuperAdmin ? (
              <>
                <SidebarButton
                  label="Vue générale"
                  active={activeSection === "overview"}
                  onClick={() => changeSection("overview")}
                />
                <SidebarButton
                  label="Rapports"
                  active={activeSection === "reports"}
                  onClick={() => changeSection("reports")}
                />
              </>
            ) : null}
            <SidebarButton
              label="Produits"
              active={activeSection === "products"}
              onClick={() => changeSection("products")}
            />
            <SidebarButton
              label="Commandes"
              active={activeSection === "orders"}
              onClick={() => changeSection("orders")}
            />
            {isSuperAdmin ? (
              <SidebarButton
                label="Utilisateurs"
                active={activeSection === "users"}
                onClick={() => changeSection("users")}
              />
            ) : null}
            <SidebarButton
              label="Avis clients"
              active={activeSection === "reviews"}
              onClick={() => changeSection("reviews")}
            />
            <SidebarButton
              label="Messagerie"
              active={activeSection === "messages"}
              onClick={() => changeSection("messages")}
            />
          </nav>
        </aside>

        <section className="space-y-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {isSuperAdmin ? "Compte admin" : "Espace pharmacien"}
          </h1>
          {actionStatus ? (
            <p className="text-sm text-slate-600">{actionStatus}</p>
          ) : null}

          {isSuperAdmin && overview && activeSection === "overview" ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Newsletter marketing
                    </p>
                    <p className="text-sm text-slate-600">
                      Exportez tous les emails collectes pour vos campagnes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDownloadNewsletterEmails}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Telecharger les emails (CSV)
                  </button>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card label="Utilisateurs" value={overview.users} />
                <Card label="Clients" value={overview.clients} />
                <Card label="Commandes" value={overview.orders} />
                <Card
                  label="Abonnes newsletter"
                  value={overview.newsletterSubscribers}
                />
                <Card
                  label={`CA (${currency})`}
                  value={formatPriceFromEuro(overview.revenue, currency)}
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Répartition Clients / Commandes / Stocks
                  </h2>
                  <div className="mt-4 flex items-center justify-center">
                    {overviewIndicatorChartData.total === 0 ? (
                      <p className="text-sm text-slate-600">
                        Aucune donnée disponible.
                      </p>
                    ) : (
                      <svg
                        viewBox="0 0 120 120"
                        className="h-56 w-56"
                        role="img"
                        aria-label="Répartition clients commandes stocks"
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r={overviewIndicatorChartData.radius}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="16"
                        />
                        {overviewIndicatorChartData.slices.map((slice) => (
                          <circle
                            key={slice.key}
                            cx="60"
                            cy="60"
                            r={overviewIndicatorChartData.radius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="16"
                            strokeDasharray={slice.dashArray}
                            strokeDashoffset={slice.dashOffset}
                            transform="rotate(-90 60 60)"
                            strokeLinecap="butt"
                          />
                        ))}
                      </svg>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Détail des indicateurs
                  </h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="px-2 py-2 font-medium">Indicateur</th>
                          <th className="px-2 py-2 font-medium">Valeur</th>
                          <th className="px-2 py-2 font-medium">Part</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewIndicatorChartData.slices.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-2 py-3 text-slate-600"
                            >
                              Aucune donnée disponible.
                            </td>
                          </tr>
                        ) : (
                          overviewIndicatorChartData.slices.map((slice) => (
                            <tr
                              key={slice.key}
                              className="border-b border-slate-100"
                            >
                              <td className="px-2 py-2 text-slate-800">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: slice.color }}
                                  />
                                  {slice.label}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-slate-700">
                                {slice.value}
                              </td>
                              <td className="px-2 py-2 text-slate-700">
                                {slice.percentage.toFixed(1)}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </>
          ) : null}

          {isSuperAdmin && activeSection === "reports" ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:p-5">
              <h2 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                Rapports & statistiques produit
              </h2>

              <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-end">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quantites vendues par produit
                  </p>

                  <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      <span>Date debut</span>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      <span>Date fin</span>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setReportStartDate("");
                        setReportEndDate("");
                      }}
                      className="h-fit rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:self-end"
                    >
                      Reinitialiser dates
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2 sm:hidden">
                  {productSalesRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
                      Aucune vente pour le filtre actuel.
                    </p>
                  ) : (
                    productSalesRows.map((row) => (
                      <article
                        key={`sales-mobile-${row.productId}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-semibold text-slate-900">
                          {row.productName}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                          <p>
                            Quantite: {row.quantitySold} {row.unit}
                          </p>
                          <p>Commandes: {row.ordersCount}</p>
                          <p className="col-span-2">
                            CA estime:{" "}
                            {formatPriceFromEuro(
                              Number(row.turnover || 0),
                              currency,
                            )}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="mt-2 hidden w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:block">
                  <table className="w-full min-w-[760px] table-auto text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="whitespace-nowrap px-2 py-2 font-medium">
                          Produit
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 font-medium">
                          Quantite vendue
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 font-medium">
                          Commandes
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 font-medium">
                          CA estime
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSalesRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="whitespace-nowrap px-2 py-3 text-slate-600"
                          >
                            Aucune vente pour le filtre actuel.
                          </td>
                        </tr>
                      ) : (
                        productSalesRows.map((row) => (
                          <tr
                            key={`sales-${row.productId}`}
                            className="border-b border-slate-100"
                          >
                            <td className="whitespace-nowrap px-2 py-2 text-slate-800">
                              {row.productName}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                              {row.quantitySold} {row.unit}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                              {row.ordersCount}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                              {formatPriceFromEuro(
                                Number(row.turnover || 0),
                                currency,
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Recherche produit</span>
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Nom, slug, catégorie..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Filtrer par mois</span>
                  <select
                    value={reportMonthFilter}
                    onChange={(e) => setReportMonthFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="all">Tous les mois</option>
                    {reportMonthOptions.map((month) => (
                      <option key={month} value={month}>
                        {formatMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Produits trouves ({reportMatchingProducts.length})
                </p>
                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto sm:max-h-52">
                  {reportMatchingProducts.slice(0, 20).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedReportProductId(product.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        effectiveReportProductId === product.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedReportProduct ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Compte rendu général
                      </p>
                      <p className="mt-1 break-words text-lg font-semibold text-slate-900">
                        {selectedReportProduct.name}
                      </p>
                      <p>
                        {selectedReportProduct.category} ·{" "}
                        {selectedReportProduct.model}
                      </p>
                      <p>
                        Prix unitaire:{" "}
                        {formatPriceFromEuro(
                          Number(selectedReportProduct.price),
                          currency,
                        )}
                      </p>
                      <p>
                        Stock actuel: {selectedReportProduct.stock}{" "}
                        {selectedReportProduct.unit}
                      </p>
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>Filtrer par couleur</span>
                        <select
                          value={effectiveReportColorFilter}
                          onChange={(e) => setReportColorFilter(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          disabled={reportColorOptions.length === 0}
                        >
                          <option value="all">Toutes les couleurs</option>
                          {reportColorOptions.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Card
                      label="Commandes"
                      value={productReport?.ordersCount || 0}
                    />
                    <Card
                      label={`Quantité (${selectedReportProduct.unit})`}
                      value={productReport?.totalQuantity || 0}
                    />
                    <Card
                      label={`CA estimé (${currency})`}
                      value={formatPriceFromEuro(
                        Number(productReport?.turnover || 0),
                        currency,
                      )}
                    />
                    <Card
                      label="Qté/commande"
                      value={(productReport?.avgQtyPerOrder || 0).toFixed(2)}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Détail par couleur
                    </p>
                    {productReport &&
                    productReport.colorBreakdown.length > 0 ? (
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {productReport.colorBreakdown.map(([color, qty]) => (
                          <p key={color}>
                            {color}: {qty} {selectedReportProduct.unit}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Aucune donnée de commande pour ce filtre.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ventes de ce produit par commande
                    </p>
                    <div className="mt-2 space-y-2 sm:hidden">
                      {selectedProductSalesRows.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
                          Aucune ligne de vente pour ce produit.
                        </p>
                      ) : (
                        selectedProductSalesRows.map((row, index) => (
                          <article
                            key={`selected-product-sale-mobile-${row.orderId}-${index}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                          >
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                              <p className="font-semibold text-slate-900">
                                Commande #{row.orderId}
                              </p>
                              <p className="text-right">
                                {row.createdAt || "-"}
                              </p>
                              <p>Couleur: {row.color}</p>
                              <p>
                                Quantite: {row.quantity}{" "}
                                {selectedReportProduct.unit}
                              </p>
                              <p className="col-span-2">
                                Montant ligne:{" "}
                                {formatPriceFromEuro(
                                  Number(row.lineTotal || 0),
                                  currency,
                                )}
                              </p>
                            </div>
                          </article>
                        ))
                      )}
                    </div>

                    <div className="mt-2 hidden w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:block">
                      <table className="w-full min-w-[780px] table-auto text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-500">
                            <th className="whitespace-nowrap px-2 py-2 font-medium">
                              Commande
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-medium">
                              Date
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-medium">
                              Couleur
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-medium">
                              Quantite
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-medium">
                              Montant ligne
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProductSalesRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="whitespace-nowrap px-2 py-3 text-slate-600"
                              >
                                Aucune ligne de vente pour ce produit.
                              </td>
                            </tr>
                          ) : (
                            selectedProductSalesRows.map((row, index) => (
                              <tr
                                key={`selected-product-sale-${row.orderId}-${index}`}
                                className="border-b border-slate-100"
                              >
                                <td className="whitespace-nowrap px-2 py-2 text-slate-800">
                                  #{row.orderId}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                                  {row.createdAt || "-"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                                  {row.color}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                                  {row.quantity} {selectedReportProduct.unit}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                                  {formatPriceFromEuro(
                                    Number(row.lineTotal || 0),
                                    currency,
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  Aucun produit sélectionné pour le rapport.
                </p>
              )}
            </section>
          ) : null}

          {activeSection === "products" ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Gestion des produits affichés
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setShowProductForm(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                    Ajouter produit
                  </button>
                  {(showProductForm || editingProductId) && (
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                      Fermer formulaire
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isProductFormOpen
                    ? "max-h-[2600px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <form
                  onSubmit={onSubmitProduct}
                  className="grid gap-3 md:grid-cols-2 pt-1"
                >
                  <Input
                    label="Slug"
                    value={productForm.slug}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, slug: value }))
                    }
                  />
                  <Input
                    label="Nom"
                    value={productForm.name}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, name: value }))
                    }
                    required
                  />
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Catégorie</span>
                    <input
                      type="text"
                      list="admin-category-options"
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm((s) => ({
                          ...s,
                          category: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <datalist id="admin-category-options">
                      {adminCategoryOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Type / Grade</span>
                    <input
                      type="text"
                      list="admin-grade-options"
                      value={productForm.grade}
                      onChange={(e) =>
                        setProductForm((s) => ({ ...s, grade: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <datalist id="admin-grade-options">
                      {adminGradeOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Modèle</span>
                    <input
                      type="text"
                      list="admin-model-options"
                      value={productForm.model}
                      onChange={(e) =>
                        setProductForm((s) => ({ ...s, model: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <datalist id="admin-model-options">
                      {adminModelOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Unité</span>
                    <input
                      type="text"
                      list="admin-unit-options"
                      value={productForm.unit}
                      onChange={(e) =>
                        setProductForm((s) => ({ ...s, unit: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <datalist id="admin-unit-options">
                      {adminUnitOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>
                  <Input
                    label="Stock"
                    value={productForm.stock}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, stock: value }))
                    }
                    type="number"
                    required
                  />
                  <Input
                    label="Prix"
                    value={productForm.price}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, price: value }))
                    }
                    type="number"
                    required
                  />
                  <Input
                    label="Quantité minimum"
                    value={productForm.min_order_qty}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, min_order_qty: value }))
                    }
                    type="number"
                    required
                  />
                  <label className="md:col-span-2 space-y-2 text-sm font-medium text-slate-700">
                    <span>Couleurs et stock par couleur</span>
                    <datalist id="admin-color-options">
                      {adminColorOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      {colorVariantRows.map((row, rowIndex) => (
                        <div
                          key={rowIndex}
                          className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
                        >
                          <input
                            type="text"
                            list="admin-color-options"
                            placeholder="Couleur"
                            value={row.name}
                            onChange={(event) =>
                              updateColorVariantRow(rowIndex, {
                                name: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="Stock"
                            value={row.stock}
                            onChange={(event) =>
                              updateColorVariantRow(rowIndex, {
                                stock: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                          <button
                            type="button"
                            onClick={() => removeColorVariantRow(rowIndex)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addColorVariantRow}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                          <path d="M12 8v8" />
                          <path d="M8 12h8" />
                        </svg>
                        Ajouter une couleur
                      </button>
                    </div>
                  </label>
                  <Input
                    label="Origine"
                    value={productForm.origin}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, origin: value }))
                    }
                    required
                  />
                  <Input
                    label="Image URL"
                    value={productForm.image}
                    onChange={(value) =>
                      setProductForm((s) => ({ ...s, image: value }))
                    }
                    required
                  />

                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Parcourir image (fichier local)</span>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*,.heic,.heif,.avif,.webp,.gif,.png,.jpg,.jpeg,.svg,.bmp,.tif,.tiff,.ico"
                      onChange={onPickImage}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  {productForm.image ? (
                    <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">
                          Prévisualisation image
                        </p>
                        <button
                          type="button"
                          onClick={onClearProductImage}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300 text-rose-600 transition hover:bg-rose-50"
                          aria-label="Supprimer l'image"
                          title="Supprimer l'image"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="m19 6-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                      <img
                        src={productForm.image}
                        alt="Prévisualisation"
                        className="h-36 w-36 rounded-lg object-cover"
                      />
                    </div>
                  ) : null}

                  <label className="md:col-span-2 space-y-1 text-sm font-medium text-slate-700">
                    <span>Description</span>
                    <textarea
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      required
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={productForm.featured}
                      onChange={(e) =>
                        setProductForm((s) => ({
                          ...s,
                          featured: e.target.checked,
                        }))
                      }
                    />
                    Produit vedette
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                        <path d="M17 21v-8H7v8" />
                        <path d="M7 3v5h8" />
                      </svg>
                      {editingProductId
                        ? "Mettre à jour produit"
                        : "Créer produit"}
                    </button>
                  </div>
                </form>
              </div>

              {!isProductFormOpen ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  Cliquez sur <strong>Ajouter produit</strong> pour afficher le
                  formulaire.
                </p>
              ) : null}

              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Recherche produit (nom, catégorie, slug...)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              />

              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="text-slate-600">
                        {product.category} ·{" "}
                        {formatPriceFromEuro(Number(product.price), currency)} ·
                        stock {product.stock}
                      </p>
                      {product.colorVariants.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          Variantes:{" "}
                          {product.colorVariants
                            .map(
                              (variant) => `${variant.name}:${variant.stock}`,
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                        </svg>
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(product.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 text-rose-700"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                        </svg>
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "orders" ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Commandes
              </h2>

              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Recherche commande (id, client, email, statut...)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="pending">En attente</option>
                  <option value="all">Tous les statuts</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="shipped">Expédiée</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>

                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Tout type</option>
                  <option value="retail">E-commerce</option>
                </select>
              </div>

              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">
                      Commande #{order.id}
                    </p>
                    <p>Client: {order.customer_name}</p>
                    <p>Email: {order.email}</p>
                    <p>Type: {getOrderTypeLabel(order.order_type)}</p>
                    <p>Statut actuel: {getOrderStatusLabel(order.status)}</p>
                    <p>
                      Total:{" "}
                      {formatPriceFromEuro(Number(order.total), currency)}
                    </p>
                    <p>Adresse: {order.address}</p>
                    <p>
                      Ville / Pays: {order.city} / {order.country}
                    </p>

                    <div className="mt-2 rounded-lg bg-slate-50 p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Détail articles
                      </p>
                      <div className="mt-1 text-xs text-slate-600">
                        {formatOrderItems(
                          order.items_json,
                          productNameById,
                        ).map((line, index) => (
                          <p key={`${order.id}-${index}`}>{line}</p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span>Statut:</span>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          onUpdateOrderStatus(order.id, e.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      >
                        <option value="pending">
                          {getOrderStatusLabel("pending")}
                        </option>
                        <option value="confirmed">
                          {getOrderStatusLabel("confirmed")}
                        </option>
                        <option value="shipped">
                          {getOrderStatusLabel("shipped")}
                        </option>
                        <option value="delivered">
                          {getOrderStatusLabel("delivered")}
                        </option>
                        <option value="cancelled">
                          {getOrderStatusLabel("cancelled")}
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onPrintOrderTicket80mm(order)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
                        Imprimer bordereau (104x100)
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {isSuperAdmin && activeSection === "users" ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Utilisateurs
              </h2>

              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Recherche utilisateur (nom, email, rôle, statut...)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              />

              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <article
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {user.name} ({user.role})
                      </p>
                      <p>{user.email}</p>
                      <p>
                        Commandes: {user.orders_count} · Statut:{" "}
                        {user.blocked ? "bloqué" : "actif"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.role === "client" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onBlockUser(user.id, !Boolean(user.blocked))
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="4" y="11" width="16" height="9" rx="2" />
                              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                            </svg>
                            {user.blocked ? "Débloquer" : "Bloquer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUser(user.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 text-rose-700"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                            </svg>
                            Supprimer
                          </button>
                        </>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          Compte equipe protege
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "reviews" ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Avis clients
              </h2>

              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="Recherche avis (nom, message, note...)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              />

              <div className="space-y-2">
                {filteredReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">
                      {review.customer_name}
                    </p>
                    <p className="text-amber-500">
                      {"★".repeat(review.rating)}
                    </p>
                    <p className="mt-1 text-slate-600">{review.message}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <span>Visibilité:</span>
                      <select
                        value={review.approved ? "visible" : "hidden"}
                        onChange={(e) =>
                          onToggleReviewVisibility(
                            review.id,
                            e.target.value === "visible",
                          )
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      >
                        <option value="visible">Afficher</option>
                        <option value="hidden">Masquer</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onDeleteReview(review.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1 text-rose-700"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                        </svg>
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "messages" ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Messagerie client
              </h2>

              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <aside className="max-h-[500px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="text"
                    value={messageUserSearch}
                    onChange={(e) => setMessageUserSearch(e.target.value)}
                    placeholder="Rechercher un client..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />

                  {messageUsers.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Aucune conversation pour le moment.
                    </p>
                  ) : filteredMessageUsers.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Aucun client ne correspond à votre recherche.
                    </p>
                  ) : (
                    filteredMessageUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedMessageUserId(user.id)}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                          selectedMessageUserId === user.id
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <p className="font-semibold">{user.name}</p>
                        <p className="truncate text-xs opacity-80">
                          {user.email}
                        </p>
                        <p className="mt-1 truncate text-xs opacity-80">
                          {user.last_message}
                        </p>
                      </button>
                    ))
                  )}
                </aside>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {selectedMessageUser ? (
                      <>
                        <p className="font-semibold text-slate-900">
                          {selectedMessageUser.name}
                        </p>
                        <p>{selectedMessageUser.email}</p>
                      </>
                    ) : (
                      <p>Sélectionnez un client pour afficher la discussion.</p>
                    )}
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {selectedMessageUserId && messages.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        Aucun message dans cette conversation.
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_role === "admin"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                              message.sender_role === "admin"
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <p className="whitespace-pre-line break-words">
                              {message.message}
                            </p>
                            <p
                              className={`mt-1 text-[11px] ${
                                message.sender_role === "admin"
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              {message.created_at}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={onSendAdminMessage} className="space-y-2">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      rows={3}
                      placeholder="Répondre au client..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={!selectedMessageUserId}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        Rafraîchissement automatique toutes les 3 secondes.
                      </p>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        disabled={!selectedMessageUserId}
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
                    </div>
                  </form>

                  {messageStatus ? (
                    <p className="text-sm text-slate-600">{messageStatus}</p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function inferImageMimeFromName(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeByExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    ico: "image/x-icon",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
  };

  return mimeByExt[extension] || null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function parseColorVariantsCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [namePart, stockPart] = entry.split(":");
      const name = String(namePart || "").trim();
      const stock = Math.max(0, Math.floor(Number(stockPart || 0)));
      return { name, stock };
    })
    .filter((variant) => variant.name);
}

function isAdminSection(value: string | null): value is AdminSection {
  if (!value) return false;
  return [
    "overview",
    "reports",
    "products",
    "orders",
    "users",
    "reviews",
    "messages",
  ].includes(value);
}

function parseOrderItemsJson(itemsJson?: string) {
  if (!itemsJson) return [];

  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((line) => {
        const productId = Number(line?.productId);
        const quantity = Math.max(0, Math.floor(Number(line?.quantity || 0)));
        const color =
          typeof line?.color === "string" && line.color.trim()
            ? line.color.trim()
            : undefined;

        if (!Number.isInteger(productId) || quantity <= 0) return null;
        return { productId, quantity, color };
      })
      .filter(Boolean) as Array<{
      productId: number;
      quantity: number;
      color?: string;
    }>;
  } catch {
    return [];
  }
}

function formatMonthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  const monthIndex = Number(monthPart || 0);
  const names = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  if (!year || monthIndex < 1 || monthIndex > 12) {
    return month;
  }

  return `${names[monthIndex - 1]} ${year}`;
}

function serializeColorVariants(product: Product) {
  if (
    Array.isArray(product.colorVariants) &&
    product.colorVariants.length > 0
  ) {
    return product.colorVariants
      .map((variant) => `${variant.name}:${variant.stock}`)
      .join(", ");
  }

  return Array.isArray(product.colors) ? product.colors.join(", ") : "";
}

function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-slate-900 font-semibold text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function formatOrderItems(
  itemsJson?: string,
  productNameById?: Map<number, string>,
) {
  if (!itemsJson) return ["Aucun détail article."];

  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return ["Aucun détail article."];
    }

    return parsed.map((item, index) => {
      const productId = item?.productId ?? "-";
      const quantity = item?.quantity ?? "-";
      const color =
        typeof item?.color === "string" && item.color.trim()
          ? item.color.trim()
          : "";
      const productName =
        typeof productId === "number"
          ? productNameById?.get(productId) || `Produit ID ${productId}`
          : `Produit ID ${productId}`;
      return `${index + 1}. ${productName} — Quantité ${quantity}${color ? ` — Couleur ${color}` : ""}`;
    });
  } catch {
    return ["Détail article invalide."];
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractOrderItemsForPrint(
  itemsJson?: string,
  productNameById?: Map<number, string>,
) {
  if (!itemsJson) {
    return [] as Array<{
      name: string;
      quantity: number | string;
      color: string;
    }>;
  }

  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const productId = item?.productId;
      const quantity = item?.quantity ?? "-";
      const color =
        typeof item?.color === "string" && item.color.trim()
          ? item.color.trim()
          : "";
      const name =
        typeof productId === "number"
          ? productNameById?.get(productId) || `Produit ID ${productId}`
          : `Produit ID ${productId ?? "-"}`;

      return { name, quantity, color };
    });
  } catch {
    return [];
  }
}

function buildAdminOrderThermalHtml(
  order: OrderSummary,
  currency: "DZD",
  productNameById?: Map<number, string>,
) {
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString("fr-FR")
    : "-";
  const items = extractOrderItemsForPrint(order.items_json, productNameById);

  const linesHtml =
    items.length > 0
      ? items
          .map((item, index) => {
            const colorPart = item.color ? ` - Couleur: ${item.color}` : "";
            return `
              <div class="line-item">
                <div>${index + 1}. ${escapeHtml(item.name)}</div>
                <div>Qte: ${escapeHtml(String(item.quantity))}${escapeHtml(colorPart)}</div>
              </div>
            `;
          })
          .join("")
      : '<div class="line-item">Aucun detail article.</div>';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bordereau commande #${order.id}</title>
    <style>
      @page { size: 104mm 100mm; margin: 4mm; }
      html, body { margin: 0; padding: 0; }
      body {
        width: 96mm;
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
  <body>
    <div class="title">PHARMACIE BENIDDIR MALIK</div>
    <div class="meta">
      <div>Commande: #${order.id}</div>
      <div>Date: ${escapeHtml(date)}</div>
      <div>Client: ${escapeHtml(order.customer_name || "-")}</div>
      <div>Email: ${escapeHtml(order.email || "-")}</div>
      <div>Statut: ${escapeHtml(getOrderStatusLabel(order.status))}</div>
      <div>Type: ${escapeHtml(getOrderTypeLabel(order.order_type))}</div>
      <div>Adresse: ${escapeHtml(`${order.address || "-"}, ${order.city || "-"}, ${order.country || "-"}`)}</div>
    </div>
    <div class="divider"></div>
    <div><strong>Articles</strong></div>
    ${linesHtml}
    <div class="divider"></div>
    <div class="total">TOTAL: ${escapeHtml(formatPriceFromEuro(Number(order.total || 0), currency))}</div>
    <div class="hint">Choisissez le format 104x100 sur votre XPrinter dans la fenetre d'impression.</div>
  </body>
</html>`;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 md:break-words md:text-xl md:leading-tight lg:break-normal lg:text-2xl">
        {value}
      </p>
    </article>
  );
}
