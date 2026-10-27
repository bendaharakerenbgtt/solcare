// Data access contract. The UI only talks to this interface.
// - LocalRepo  (src/data/local)  : demo mode, data in the browser. Implemented.
// - SupabaseRepo (planned)       : production, enforced by Postgres RLS + RPC.
//   See docs/SUPABASE.md and supabase/migrations/0001_init.sql.
import type {
  Announcement,
  AuditLog,
  Customer,
  EstimateHistoryEntry,
  Fragrance,
  ID,
  ISODateTime,
  Order,
  OrderPhoto,
  OrderProductLine,
  OrderServiceLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  PublicOrderView,
  Role,
  Service,
  Settings,
  StaffUser,
  StatusHistoryEntry,
} from './types';

export interface OrderInput {
  customer: { id?: ID | null; name: string; phone: string };
  itemType: string;
  brand: string;
  model: string;
  color: string;
  conditionNotes: string;
  services: OrderServiceLine[];
  products: OrderProductLine[];
  fragranceId: ID | null;
  receivedAt: ISODateTime;
  estimate: {
    earliestAt: ISODateTime | null;
    estimatedAt: ISODateTime | null;
    source: 'auto' | 'manual';
    /** Automatic value shown to staff before a manual override (for history). */
    autoAt: ISODateTime | null;
    reason: string;
  };
  payment: PaymentInput;
  internalNotes: string;
}

export interface PaymentInput {
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: ISODateTime | null;
  /** Staff explicitly confirmed full payment was received. Required for status "lunas". */
  confirmed: boolean;
}

export type TrackResult =
  | { ok: true; order: PublicOrderView }
  | { ok: false; error: 'invalid' | 'not_found' | 'rate_limited'; message: string };

export interface PhotoIntegrationStatus {
  provider: 'local' | 'gdrive';
  configured: boolean;
  label: string;
  detail: string;
}

export interface CollageMeta {
  labels: string[];
  caption: string;
  width: number;
  height: number;
}

export interface RetentionItem {
  photo: OrderPhoto;
  orderCode: string | null;
  expiresAt: ISODateTime | null;
  eligible: boolean;
  reason: string;
  result?: 'deleted' | 'failed';
  error?: string;
}

export interface RetentionReport {
  ranAt: ISODateTime;
  dryRun: boolean;
  checked: number;
  items: RetentionItem[];
  deleted: number;
  failed: number;
}

export type SaveInput<T extends { id: ID }> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: ID };

export interface Repo {
  readonly mode: 'local' | 'supabase';

  // --- Auth (staff) ---
  needsSetup(): Promise<boolean>;
  setupFirstAdmin(input: { name: string; email: string; password: string }): Promise<StaffUser>;
  signIn(email: string, password: string): Promise<StaffUser>;
  signOut(): Promise<void>;
  currentUser(): Promise<StaffUser | null>;
  listStaff(): Promise<StaffUser[]>;
  createStaff(input: { name: string; email: string; password: string; role: Role }): Promise<StaffUser>;
  updateStaff(id: ID, patch: Partial<Pick<StaffUser, 'name' | 'role' | 'active'>>): Promise<StaffUser>;
  changePassword(id: ID, newPassword: string): Promise<void>;

  // --- Settings (read is public) ---
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  // --- Catalog (active items are public) ---
  listServices(includeInactive?: boolean): Promise<Service[]>;
  saveService(s: SaveInput<Service>): Promise<Service>;
  deleteService(id: ID): Promise<void>;
  listProducts(includeInactive?: boolean): Promise<Product[]>;
  saveProduct(p: SaveInput<Product>): Promise<Product>;
  deleteProduct(id: ID): Promise<void>;
  listFragrances(includeInactive?: boolean): Promise<Fragrance[]>;
  saveFragrance(f: SaveInput<Fragrance>): Promise<Fragrance>;
  deleteFragrance(id: ID): Promise<void>;

  // --- Customers ---
  listCustomers(): Promise<Customer[]>;
  saveCustomer(c: SaveInput<Customer>): Promise<Customer>;
  deleteCustomer(id: ID): Promise<void>;

  // --- Orders ---
  listOrders(): Promise<Order[]>;
  getOrder(id: ID): Promise<Order | null>;
  createOrder(input: OrderInput): Promise<Order>;
  updateOrder(id: ID, input: OrderInput): Promise<Order>;
  deleteOrder(id: ID): Promise<void>;
  updateStatus(id: ID, to: OrderStatus, note: string): Promise<Order>;
  adjustEstimate(id: ID, input: { estimatedAt: ISODateTime; earliestAt?: ISODateTime | null; reason: string }): Promise<Order>;
  recordPayment(id: ID, input: PaymentInput & { total?: number }): Promise<Order>;
  statusHistory(orderId: ID): Promise<StatusHistoryEntry[]>;
  estimateHistory(orderId: ID): Promise<EstimateHistoryEntry[]>;

  // --- Photos ---
  photoIntegration(): PhotoIntegrationStatus;
  listPhotos(orderId?: ID): Promise<OrderPhoto[]>;
  uploadCollage(orderId: ID, blob: Blob, meta: CollageMeta): Promise<OrderPhoto>;
  photoUrl(photoId: ID): Promise<string | null>;
  deletePhoto(photoId: ID, note: string): Promise<OrderPhoto>;
  runRetention(dryRun: boolean, now?: Date): Promise<RetentionReport>;

  // --- Announcements ---
  listAnnouncements(): Promise<Announcement[]>;
  listPublicAnnouncements(): Promise<Announcement[]>;
  saveAnnouncement(a: SaveInput<Announcement>): Promise<Announcement>;
  deleteAnnouncement(id: ID): Promise<void>;

  // --- Public tracking (no login) ---
  trackOrder(code: string, phoneSuffix?: string): Promise<TrackResult>;
  publicPhotoUrl(code: string, photoId: ID, phoneSuffix?: string): Promise<string | null>;

  // --- Audit ---
  listAudit(limit?: number): Promise<AuditLog[]>;
}
