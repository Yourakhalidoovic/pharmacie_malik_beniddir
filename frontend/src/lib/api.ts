import type { ColorVariant, Product, StoreStats } from "@/lib/types";

const IS_STATIC_EXPORT = process.env.NEXT_STATIC_EXPORT === "true";

const SERVER_FETCH_OPTIONS: RequestInit = IS_STATIC_EXPORT
  ? { cache: "force-cache" }
  : { cache: "no-store" };

function resolveApiBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envBaseUrl) return envBaseUrl;

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

const API_BASE_URL = resolveApiBaseUrl();

function normalizeProduct(raw: unknown): Product {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  let parsedVariants: unknown = [];
  if (Array.isArray(source.colorVariants)) {
    parsedVariants = source.colorVariants;
  } else if (typeof source.colors_json === "string") {
    try {
      parsedVariants = JSON.parse(source.colors_json);
    } catch {
      parsedVariants = [];
    }
  } else if (Array.isArray(source.colors)) {
    parsedVariants = source.colors;
  }

  const colorVariants: ColorVariant[] = Array.isArray(parsedVariants)
    ? parsedVariants
        .map((entry) => {
          if (typeof entry === "string") {
            const name = entry.trim();
            if (!name) return null;
            return {
              name,
              stock: Number(source.stock || 0),
              inStock: Number(source.stock || 0) > 0,
            } satisfies ColorVariant;
          }

          if (!entry || typeof entry !== "object") return null;
          const shape = entry as Record<string, unknown>;
          const name = String(shape.name ?? shape.color ?? "").trim();
          if (!name) return null;

          const stock = Math.max(0, Math.floor(Number(shape.stock ?? 0)));
          const inStock =
            typeof shape.inStock === "boolean" ? shape.inStock : stock > 0;

          return { name, stock, inStock } satisfies ColorVariant;
        })
        .filter((variant): variant is ColorVariant => Boolean(variant))
    : [];

  const colors = colorVariants.map((variant) => variant.name);

  const stock =
    colorVariants.length > 0
      ? colorVariants.reduce((sum, variant) => sum + variant.stock, 0)
      : Math.max(0, Math.floor(Number(source.stock || 0)));

  return {
    ...source,
    stock,
    colors,
    colorVariants,
  } as Product;
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/products`,
    SERVER_FETCH_OPTIONS,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeProduct) : [];
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/products?featured=true`,
    SERVER_FETCH_OPTIONS,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch featured products");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeProduct) : [];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/products/${slug}`,
    SERVER_FETCH_OPTIONS,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch product");
  }

  const data = await response.json();
  return data ? normalizeProduct(data) : null;
}

export async function getStats(): Promise<StoreStats> {
  const response = await fetch(
    `${API_BASE_URL}/api/stats`,
    SERVER_FETCH_OPTIONS,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }
  return response.json();
}

export { API_BASE_URL };
