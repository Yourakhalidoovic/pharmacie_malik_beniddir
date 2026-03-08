import type { CartItem } from "@/lib/types";

const CART_KEY = "pharmacie-malik-beniddir-cart";
const CART_CHANGE_EVENT = "pharmacie-malik-beniddir-cart-change";

function dispatchCartChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}

export function getCartChangeEventName() {
  return CART_CHANGE_EVENT;
}

export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function getCartItemsCount(): number {
  return getCartItems().reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
    0,
  );
}

function normalizeColorKey(color?: string) {
  return String(color || "")
    .trim()
    .toLowerCase();
}

export function addToCart(productId: number, quantity: number, color?: string) {
  const items = getCartItems();
  const colorKey = normalizeColorKey(color);
  const existing = items.find(
    (item) =>
      item.productId === productId &&
      normalizeColorKey(item.color) === colorKey,
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId,
      quantity,
      ...(color ? { color: color.trim() } : {}),
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartChange();
}

export function removeFromCart(productId: number, color?: string) {
  const colorKey = normalizeColorKey(color);
  const items = getCartItems().filter(
    (item) =>
      !(
        item.productId === productId &&
        normalizeColorKey(item.color) === colorKey
      ),
  );
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartChange();
}

export function setCartItemQuantity(
  productId: number,
  quantity: number,
  color?: string,
) {
  const safeQuantity = Math.max(1, quantity);
  const colorKey = normalizeColorKey(color);
  const items = getCartItems().map((item) =>
    item.productId === productId && normalizeColorKey(item.color) === colorKey
      ? { ...item, quantity: safeQuantity }
      : item,
  );
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartChange();
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  dispatchCartChange();
}
