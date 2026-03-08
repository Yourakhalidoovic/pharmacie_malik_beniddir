export type ColorVariant = {
  name: string;
  stock: number;
  inStock: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  grade: string;
  model: string;
  unit: string;
  stock: number;
  price: number;
  min_order_qty: number;
  origin: string;
  image: string;
  description: string;
  featured: number;
  colors: string[];
  colorVariants: ColorVariant[];
};

export type StoreStats = {
  products: number;
  reviews: number;
  orders: number;
  markets: number;
  restaurantsInAlgeria: number;
};

export type CartItem = {
  productId: number;
  quantity: number;
  color?: string;
};

export type UserRole = "admin" | "pharmacien" | "client";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type OrderSummary = {
  id: number;
  customer_name: string;
  email: string;
  address?: string;
  city?: string;
  country?: string;
  total: number;
  status: string;
  order_type: string;
  items_json?: string;
  created_at: string;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  blocked: number;
  orders_count: number;
  created_at: string;
};

export type CustomerReview = {
  id: number;
  customer_name: string;
  rating: number;
  message: string;
  approved: number;
  created_at: string;
};

export type ClientMessage = {
  id: number;
  user_id: number;
  sender_role: "client" | "admin";
  message: string;
  created_at: string;
};

export type MessageUserSummary = {
  id: number;
  name: string;
  email: string;
  last_message_at: string;
  last_message: string;
};
