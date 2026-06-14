/**
 * Centralized client for the unified Rinzo backend.
 *
 * All order-related data now comes from the Rinzo backend (not the
 * admin panel's own Express server).  Auth uses Firebase ID tokens
 * sent as Authorization: Bearer <token>.
 */

import { getFirebaseAuth } from "./firebase";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://api.rinzo.app";

// ── Error class ──────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ── Generic request helper ───────────────────────────────

async function request<T = unknown>(
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const headers: Record<string, string> = {};

  // Obtain a fresh Firebase ID token for every request.
  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const raw = await res.json().catch(() => ({ message: res.statusText }));
    // Backend errors are nested: { error: { code, message } }
    const body = raw?.error && typeof raw.error === "object" ? raw.error : raw;

    // Force logout on auth failures
    if (res.status === 401 || res.status === 403) {
      if (auth?.currentUser) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      }
      throw new ApiError(
        res.status,
        "Authentication failed — please login again",
        body.code,
      );
    }

    throw new ApiError(
      res.status,
      body.message || `${res.status}: ${res.statusText}`,
      body.code,
    );
  }

  return res.json();
}

// ── Types matching the real backend responses ────────────

export interface BackendOrder {
  id: string;
  customerId: string;
  shopId: string;
  riderId: string | null;
  items: { serviceId?: string; serviceName: string; price: number; quantity: number }[];
  totalAmount: number;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendOrderWithItems extends BackendOrder {
  /** Joined order_items when fetched via GET /api/orders/:id */
  items: { serviceId?: string; serviceName: string; price: number; quantity: number }[];
  /** Payment info (null for legacy orders) */
  payment: BackendPayment | null;
}

export interface BackendPayment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  collectedBy: string | null;
  collectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  actorId: string;
  createdAt: string;
}

// ── Mapped order type for the admin UI ───────────────────

export interface AdminOrder {
  id: string;
  customerId: string;
  shopId: string;
  riderId: string | null;
  customerName: string;
  shopName: string;
  riderName: string | null;
  items: string;
  totalAmount: number;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapOrder(raw: BackendOrder): AdminOrder {
  // items is a JSONB array — derive a summary string
  const itemSummary = Array.isArray(raw.items)
    ? raw.items.map((i) => `${i.quantity}× ${i.serviceName}`).join(", ")
    : String(raw.items);

  return {
    id: raw.id,
    customerId: raw.customerId,
    shopId: raw.shopId,
    riderId: raw.riderId,
    customerName: raw.customerId?.substring(0, 8) ?? "—",
    shopName: raw.shopId?.substring(0, 8) ?? "—",
    riderName: raw.riderId ? raw.riderId.substring(0, 8) : null,
    items: itemSummary,
    totalAmount: raw.totalAmount,
    status: raw.status,
    pickupAddress: raw.pickupAddress,
    deliveryAddress: raw.deliveryAddress,
    rejectionReason: raw.rejectionReason,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Pagination wrapper type ──────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── API functions ────────────────────────────────────────

/** GET /api/admin/orders — all orders (paginated) */
export async function fetchAdminOrders(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<AdminOrder>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  const res = await request<PaginatedResponse<BackendOrder>>("GET", `/api/admin/orders${query ? `?${query}` : ""}`);
  return {
    data: res.data.map(mapOrder),
    pagination: res.pagination,
  };
}

/** GET /api/orders/:id — single order with items */
export async function fetchOrderDetail(
  id: string,
): Promise<BackendOrderWithItems> {
  return request<BackendOrderWithItems>("GET", `/api/orders/${id}`);
}

/** GET /api/orders/:id/events — event log */
export async function fetchOrderEvents(
  id: string,
): Promise<OrderEvent[]> {
  return request<OrderEvent[]>("GET", `/api/orders/${id}/events`);
}

/** POST /api/admin/orders/:id/assign-pickup */
export async function assignPickup(
  orderId: string,
  riderId: string,
): Promise<BackendOrder> {
  return request<BackendOrder>(
    "POST",
    `/api/admin/orders/${orderId}/assign-pickup`,
    { riderId },
  );
}

/** POST /api/admin/orders/:id/assign-delivery */
export async function assignDelivery(
  orderId: string,
): Promise<BackendOrder> {
  return request<BackendOrder>(
    "POST",
    `/api/admin/orders/${orderId}/assign-delivery`,
  );
}

// ── User management types ────────────────────────────────

export interface BackendUser {
  id: string;
  firebaseUid: string | null;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

// ── User management API functions ────────────────────────

/** GET /api/admin/users?status=...&role=...&page=...&limit=... */
export async function fetchAdminUsers(
  params?: { status?: string; role?: string; page?: number; limit?: number },
): Promise<PaginatedResponse<BackendUser>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.role) qs.set("role", params.role);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<PaginatedResponse<BackendUser>>(
    "GET",
    `/api/admin/users${query ? `?${query}` : ""}`,
  );
}

/** POST /api/admin/users/:id/approve */
export async function approveUser(userId: string): Promise<BackendUser> {
  return request<BackendUser>("POST", `/api/admin/users/${userId}/approve`);
}

/** POST /api/admin/users/:id/reject */
export async function rejectUser(userId: string): Promise<BackendUser> {
  return request<BackendUser>("POST", `/api/admin/users/${userId}/reject`);
}

/** POST /api/admin/users/:id/suspend */
export async function suspendUser(userId: string): Promise<BackendUser> {
  return request<BackendUser>("POST", `/api/admin/users/${userId}/suspend`);
}

// ── Suspension impact ────────────────────────────────────

export interface UserImpact {
  role: string;
  totalActiveOrders: number;
  byStatus: Record<string, number>;
  placedWillBeCancelled: number;
}

/** GET /api/admin/users/:id/impact — active orders affected by suspension */
export async function fetchUserImpact(userId: string): Promise<UserImpact> {
  return request<UserImpact>("GET", `/api/admin/users/${userId}/impact`);
}

// ── Shop & Rider management API functions ────────────────

export interface BackendShop {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  /** Owner name — derived from the users row */
  ownerName: string;
  /** Fields that may be absent when reading from the users table */
  category?: string;
  address?: string;
}

export type DocumentsStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export interface BackendRider {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  dlImageUrl?: string | null;
  rcImageUrl?: string | null;
  selfieUrl?: string | null;
  documentsStatus?: DocumentsStatus;
  documentsRejectionReason?: string | null;
}

function mapUserToShop(u: BackendUser): BackendShop {
  return {
    id: u.id,
    name: u.name,
    ownerName: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    createdAt: u.createdAt,
  };
}

function mapUserToRider(u: BackendUser): BackendRider {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    createdAt: u.createdAt,
    vehicleType: (u as any).vehicleType ?? undefined,
    vehicleNumber: (u as any).vehicleNumber ?? undefined,
    licenseNumber: (u as any).licenseNumber ?? undefined,
    dlImageUrl: (u as any).dlImageUrl ?? null,
    rcImageUrl: (u as any).rcImageUrl ?? null,
    selfieUrl: (u as any).selfieUrl ?? null,
    documentsStatus: (u as any).documentsStatus ?? "NOT_SUBMITTED",
    documentsRejectionReason: (u as any).documentsRejectionReason ?? null,
  };
}

/** GET /api/admin/users?role=SHOP_OWNER — all shop owners (paginated) */
export async function fetchAdminShops(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<BackendShop>> {
  const res = await fetchAdminUsers({ role: "SHOP_OWNER", ...params });
  return {
    data: res.data.map(mapUserToShop),
    pagination: res.pagination,
  };
}

/** GET /api/admin/users?role=RIDER — all riders (paginated) */
export async function fetchAdminRiders(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<BackendRider>> {
  const res = await fetchAdminUsers({ role: "RIDER", ...params });
  return {
    data: res.data.map(mapUserToRider),
    pagination: res.pagination,
  };
}

/** POST /api/admin/users/:id/approve — approve shop */
export async function approveShop(shopId: string): Promise<BackendUser> {
  return approveUser(shopId);
}

/** POST /api/admin/users/:id/reject — reject shop */
export async function rejectShop(shopId: string): Promise<BackendUser> {
  return rejectUser(shopId);
}

/** POST /api/admin/users/:id/suspend — suspend shop */
export async function suspendShop(shopId: string): Promise<BackendUser> {
  return suspendUser(shopId);
}

/** POST /api/admin/users/:id/approve — approve rider */
export async function approveRider(riderId: string): Promise<BackendUser> {
  return approveUser(riderId);
}

/** POST /api/admin/users/:id/reject — reject rider */
export async function rejectRider(riderId: string): Promise<BackendUser> {
  return rejectUser(riderId);
}

/** POST /api/admin/users/:id/suspend — suspend rider */
export async function suspendRider(riderId: string): Promise<BackendUser> {
  return suspendUser(riderId);
}

/** POST /api/admin/riders/:id/reject-documents — ask a rider to re-upload KYC */
export async function rejectRiderDocuments(
  riderUserId: string,
  reason?: string,
): Promise<{ ok: boolean; documentsStatus: DocumentsStatus; reason: string }> {
  return request("POST", `/api/admin/riders/${riderUserId}/reject-documents`, {
    reason,
  });
}

/** POST /api/admin/users/:id/verify-email — operator override for the email gate */
export async function verifyUserEmail(
  userId: string,
): Promise<{ ok: boolean; emailVerified: boolean }> {
  return request("POST", `/api/admin/users/${userId}/verify-email`);
}

/** POST /api/admin/users/:id/delete — admin removes a user/shop/rider */
export async function deleteUserByAdmin(
  userId: string,
): Promise<{ ok: boolean; deleted: boolean }> {
  return request("POST", `/api/admin/users/${userId}/delete`);
}

// ── Platform settings (pricing + timeouts) ──────────────

export interface PlatformSettings {
  id: string;
  deliveryRatePerKm: number;
  minDeliveryFee: number;
  fallbackDeliveryFee: number;
  riderPayoutPerKm: number;
  platformFee: number;
  commissionBps: number;
  placedTimeoutMin: number;
  noRiderTimeoutMin: number;
  updatedAt: string;
}

/** GET /api/admin/settings */
export async function fetchSettings(): Promise<PlatformSettings> {
  return request<PlatformSettings>("GET", "/api/admin/settings");
}

/** PATCH /api/admin/settings */
export async function updateSettings(
  patch: Partial<Omit<PlatformSettings, "id" | "updatedAt">>,
): Promise<PlatformSettings> {
  return request<PlatformSettings>("PATCH", "/api/admin/settings", patch);
}

// ── Dispute management types ─────────────────────────────

export type DisputeStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
export type RaisedByType = "CUSTOMER" | "SHOP" | "RIDER";

export interface BackendDispute {
  id: string;
  raisedByType: RaisedByType;
  raisedById: string;
  raisedByName: string;
  orderId: string | null;
  category: string;
  description: string;
  status: DisputeStatus;
  internalNotes: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ── Dispute management API functions ─────────────────────

/** GET /api/admin/disputes?status=...&raisedByType=...&page=...&limit=... */
export async function fetchAdminDisputes(
  params?: { status?: string; raisedByType?: string; page?: number; limit?: number },
): Promise<PaginatedResponse<BackendDispute>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.raisedByType) qs.set("raisedByType", params.raisedByType);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<PaginatedResponse<BackendDispute>>(
    "GET",
    `/api/admin/disputes${query ? `?${query}` : ""}`,
  );
}

/** PATCH /api/admin/disputes/:id  — update status / notes / resolution */
export async function updateAdminDispute(
  disputeId: string,
  data: { status?: string; internalNotes?: string; resolution?: string },
): Promise<BackendDispute> {
  return request<BackendDispute>(
    "PATCH",
    `/api/admin/disputes/${disputeId}`,
    data,
  );
}

// ── Payment management API functions ──────────────────

/** POST /api/admin/payments/:id/mark-collected */
export async function markPaymentCollected(
  paymentId: string,
): Promise<BackendPayment> {
  return request<BackendPayment>(
    "POST",
    `/api/admin/payments/${paymentId}/mark-collected`,
  );
}

/** POST /api/admin/payments/:id/settle — cash received from the rider */
export async function settlePayment(
  paymentId: string,
): Promise<BackendPayment> {
  return request<BackendPayment>(
    "POST",
    `/api/admin/payments/${paymentId}/settle`,
  );
}
