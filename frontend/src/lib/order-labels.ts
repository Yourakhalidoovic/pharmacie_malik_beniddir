const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  shipped: "Expediee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  retail: "E-commerce",
  b2b: "B2B",
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[String(status || "").toLowerCase()] || status;
}

export function getOrderTypeLabel(orderType: string): string {
  return ORDER_TYPE_LABELS[String(orderType || "").toLowerCase()] || orderType;
}
