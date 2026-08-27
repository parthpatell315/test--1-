export type AdminRole = 'superadmin' | 'admin' | 'sales' | 'operations' | 'finance' | 'finance_controller' | 'guide' | 'viewer';

export interface Admin {
  id: string;
  email: string | null;
  name: string;
  role: AdminRole;
  isActive: boolean;
  tokenVersion?: number;
  phone?: string;
  avatarUrl?: string;
  designation?: string;
  notificationPreferences?: NotificationPreferences;
  uiSettings?: UISettings;
  lastLoginAt?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  permissions?: string[];
  customPermissions?: string[];
}

export interface NotificationPreferences {
  dailyDigest?: boolean;
  bookingAlerts?: boolean;
  paymentConfirmations?: boolean;
  departureReminders?: boolean;
  staffAnnouncements?: boolean;
  inAppNotifications?: boolean;
  notificationSound?: boolean;
  frequency?: 'real-time' | 'hourly' | 'daily';
  [key: string]: any;
}

export interface UserPreferences {
  defaultTripFilter?: string;
  defaultSort?: string;
  autoSaveDrafts?: boolean;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  dashboardWidgets?: string[];
  [key: string]: any;
}

export interface UISettings {
  theme?: 'light' | 'dark';
  themePreset?: 'ocean-blue' | 'forest-green' | 'sunset-orange' | 'modern-purple';
  fontSize?: 'small' | 'normal' | 'large';
  listView?: 'compact' | 'detailed';
  location?: string;
  bio?: string;
  preferences?: UserPreferences;
  cookiePreferences?: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  [key: string]: any;
}

export interface LoginSession {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export interface APIKeyItem {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  permissions: string[];
  isExpired: boolean;
  expiresAt?: string | null;
  keyPreview: string;
}

export interface IntegrationItem {
  service: 'whatsapp' | 'sms' | 'email' | 'payment' | string;
  status: 'connected' | 'disconnected';
  provider: string;
  connectedPhoneNumber?: string;
  lastTested?: string | null;
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  admin: Admin;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  location: string;
  activities: string[];
  stay: string;
  meals: string;
  photos: string[];
  departureTime?: string;
  arrivalTime?: string;
  distance?: string;
  drivingHours?: string;
  assignedVehicle?: string;
}

export interface FAQ {
  question: string;
  answer: string;
  order?: number;
}

export interface TripVariant {
  location: string;
  duration: string;
  originalPrice: number;
  discountedPrice: number;
  image: string;
  skipDays?: number;
  excludeTravel?: boolean;
}

export interface PickupCity {
  cityName: string;
  pickupPoint: string;
  skipDays: number;
  deductionAmount: number;
}

export interface TravelOption {
  label: string;
  priceDelta: number;
  description?: string;
}

export interface TripAddon {
  id?: string;
  name: string;
  rate: number;
  description: string;
  minQuantity: number;
  maxQuantity: number;
}

export interface RoomOption {
  label: string;
  priceDelta: number;
}

export interface Trip {
  id: string;
  title: string;
  shortName?: string;
  slug: string;
  description: string;
  heroImage: string;
  price: number;
  location: string;
  duration: string;
  category: string;
  images: string[];
  gallery?: { url: string; alt: string; order: number }[];
  stickyCardPrice?: number;
  stickyCardLabel?: string;
  itinerary: ItineraryDay[];
  itineraryVersions?: any[];
  highlights: any[];
  inclusions: string[];
  exclusions: string[];
  faqs: FAQ[];
  availableDates: string[];
  variants: TripVariant[];
  pickupCities?: PickupCity[];
  travelOptions: TravelOption[];
  roomOptions: RoomOption[];
  bookingFormLabels?: {
    joiningPoint?: string;
    travelers?: string;
    travelOption?: string;
    roomSharing?: string;
  };
  addons: TripAddon[];
  departurePriceOverrides?: {
    departureDate: string;
    overrideType: string;
    amount: number;
    isActive: boolean;
    reason?: string;
  }[];
  attractions?: { name: string; image: string; slug: string; description?: string }[];
  activities?: { name: string; image: string; slug: string; description?: string }[];
  accommodations?: { 
    name: string; 
    location: string;
    nights: string;
    type: string; 
    starRating: string;
    roomType: string;
    meals: string;
    image: string; 
    gallery: string[];
  }[];
  route?: { label: string; icon: "plane" | "car" | "train" }[];
  ageGroup?: string;
  maxAltitude?: string;
  tripType?: string;
  startEnd?: string;
  pickupMode?: string;
  popupDetails?: {
    cancellation: { label: string; val: string }[];
    terms: string[];
    carry: { label: string; val: string }[];
    etiquette: { title: string; desc: string }[];
    showRentedGears?: boolean;
  };
  status: "draft" | "published";
  maxGroupSize?: number;
  difficulty?: "easy" | "moderate" | "hard";
  departureCity?: string;
  ageLimit?: string;
  bookingUrl?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainTicket {
  pnr: string;
  trainNo: string;
  trainName: string;
  from: string;
  to: string;
  departureDate?: string;
  arrivalDate?: string;
  coach: string;
  seat: string;
  status: string;
  ticketUrl?: string;
}

// ─── BOOKING SYSTEM TYPES ───

export interface BookingTrip {
  id: string;
  tripCode: string;
  tripName: string;
  isActive: boolean;
  formLink?: string;
  price?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPassenger {
  id?: string;
  name?: string;
  age?: number | string | null;
  gender?: string;
  phone?: string;
  email?: string;
  roomSharing?: string;
  foodPreference?: string;
  dob?: string | null;
  [key: string]: unknown;
}

/**
 * Booking passengers JSON payload — the backend stores this as a Prisma Json
 * column. Historically it can be either a plain array (legacy) or a
 * `{ details, persons }` object (current). Both shapes are supported here;
 * normalize at the service layer.
 */
export type BookingPassengersPayload =
  | BookingPassenger[]
  | {
      details?: Record<string, unknown>;
      persons?: BookingPassenger[];
    };

/**
 * Canonical Booking type — mirrors the backend Prisma `Booking` model
 * response (see backend/prisma/schema.prisma) plus normalized/derived
 * compatibility fields surfaced by `bookingsService.normalizeBooking`.
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | (string & {});

export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | (string & {});

export interface BookingSalesAdminRef {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface Booking {
  id: string;
  tenantId?: string;
  bookingId: string;
  tripId: string;
  tripName?: string | null;
  status: BookingStatus;
  // Customer contact (authoritative backend fields)
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  // Financials
  numberOfTravelers?: number | null;
  baseAmount?: number | null;
  gstAmount?: number | null;
  depositGst?: number | null;
  totalAmount: number;
  amount?: number | null;
  advancePaid: number;
  remainingAmount: number;
  paymentMode?: string | null;
  paymentStatus?: PaymentStatus | null;
  payment_status?: string | null;
  payment_method?: string | null;
  upi_reference?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  // Ownership / attribution
  sourceBookingLinkId?: string | null;
  salesAdminId?: string | null;
  salesAdmin?: BookingSalesAdminRef | null;
  sourceMeta?: Record<string, unknown> | null;
  // Operational
  departureDate?: string | null;
  pickupCity?: string | null;
  skipDays?: number | null;
  adjustedPrice?: number | null;
  joiningDate?: string | null;
  reminderSent?: boolean;
  passengers?: BookingPassengersPayload | null;
  trainTicketRequired?: boolean;
  trainTicketStatus?: string | null;
  createdAt: string;
  updatedAt?: string;
  // Relations (when the backend includes them)
  tripRef?: {
    id?: string;
    title?: string;
    slug?: string;
    price?: number;
    duration?: string | null;
    [key: string]: unknown;
  } | null;
  // ── Normalized / derived compatibility fields ──
  // Populated by bookingsService.normalizeBooking from the raw API response.
  trainClass?: string;
  ticketStatus?: string;
  roomType?: string;
  roomSharing?: string;
  foodPreference?: string;
  leadSource?: string;
  source?: string;
  createdByName?: string;
  discountAmount?: number;
  duration?: string;
}

export type BookingFormData = Omit<
  Booking,
  | "id"
  | "bookingId"
  | "remainingAmount"
  | "createdAt"
  | "updatedAt"
  | "tenantId"
  | "sourceBookingLinkId"
  | "salesAdminId"
  | "salesAdmin"
  | "sourceMeta"
>;

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  tripTitle?: string;
  date?: string;
  count?: number;
  read: boolean;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  isDuplicate?: boolean;
  convertedAmount?: number;
  adminNotes?: string;
  responseTimeMinutes?: number;
  createdAt: string;
}

export interface ThemeSettings {
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  primaryFont: string;
  handwritingFont?: string;
  headerTitle?: string;
}

export interface DimensionsSettings {
  heroHeight: number;
  containerWidth: number;
  sectionSpacing: number;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    linkedin: string;
  };
  logo: string;
  favicon: string;
  theme: ThemeSettings;
  dimensions: DimensionsSettings;
  organization: {
    name: string;
    logo: string;
    website: string;
    supportEmail: string;
    supportPhone: string;
    mailingAddress: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    isEnabled: boolean;
  };
}

export interface DashboardStats {
  totalTrips: number;
  totalBookings: number;
  todayBookings?: number;
  bookingsThisMonth?: number;
  pendingBookingsCount?: number;
  totalRevenue: number;
  currentMonthRevenue?: number;
  totalInquiries: number;
  pendingPayments: number;
  totalVendorCost: number;
  totalVendorPaid: number;
  pendingVendorPayments: number;
  totalProfit: number;
  upcomingTrips: { id: string; title: string; location: string; duration: string; nextDate?: string }[];
  recentBookings: (Booking & { paidAmount?: number; paymentStatus?: string })[];
  monthlyRevenue: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
  tasksTotal?: number;
  tasksCompleted?: number;
  tasksOverdue?: number;
  tasksPending?: number;
  employeeStatus?: { online: string[]; offline: string[] };
  employeeWorkload?: { name: string; state: string; pct: number; color: string }[];
  pendingVendorsCost?: number;
  pendingVendorsCount?: number;
  attentionItems?: { label: string; count: number; color: string; urgent?: boolean; path: string }[];
  tripsRunningNow?: { code: string; name: string; size: number; stay: string }[];
  tripsDepartingNext7Days?: { name: string; date: string; count: string; status: string }[];
  todaysSchedule?: { time: string; label: string; color: string }[];
  cashFlow?: { collectionToday: number; paymentsToday: number; netCashInflow: number };
}

export type TripFormData = Omit<Trip, "id" | "createdAt" | "updatedAt">;

export interface BlogHighlight {
  title: string;
  desc: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  category?: string;
  intro?: string;
  author: string;
  authorImage?: string;
  authorRole?: string;
  content: string;
  image: string;
  gallery?: string[];
  highlights?: BlogHighlight[];
  tips?: string[];
  readTime: string;
  hasVideo: boolean;
  status: "draft" | "published";
  createdAt: string;
}

export type BlogFormData = Omit<Blog, "id" | "createdAt">;

export interface Payment {
  id: string;
  _id?: string;
  bookingId: string;
  amount: number;
  paymentMode: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
  paymentDate: string;
  reference?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  transactionId?: string | null;
  proofUrl?: string | null;
  proofFileUrl?: string | null;
  proofUrls?: string[] | null;
  proofFileName?: string | null;
  proofFileType?: string | null;
  proofUploadedAt?: string | null;
}

export interface PaymentSummary {
  totalPaid: number;
  paymentsCount: number;
}

export interface Vendor {
  id: string;
  _id?: string;
  name: string;
  type: 'hotel' | 'transport' | 'guide' | 'meals' | 'equipment' | 'other';
  phone?: string;
  email?: string;
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TripVendor {
  id: string;
  _id?: string;
  tripId: string;
  vendorId: Vendor | string;
  agreedCost: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount: number;
  notes?: string;
  outgoingPaymentMode?: string;
  onlinePersonAccount?: string;
  cashDepositorName?: string;
  depositAccountName?: string;
  createdAt: string;
}

export interface TripVendorSummary {
  totalVendorCost: number;
  totalPaidToVendors: number;
  pendingVendorPayments: number;
  count: number;
}

export interface QuotationHotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  description: string;
  roomType: string;
  meals?: string;
  photos: string[];
}

export interface QuotationDay {
  id: string;
  day: number;
  title: string;
  description: string;
  activities: string[];
  meals?: string;
  stay?: string;
  photos: string[];
}

export interface QuotationCustomSection {
  id: string;
  heading: string;
  description: string;
  image?: string;
  isVisible: boolean;
}

export interface Quotation {
  id: string;
  _id?: string;
  slug: string;
  status: "Draft" | "Published" | "Sent" | "Cancelled";
  shareToken?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  tripTitle: string;
  destination: string;
  duration: string;
  travelDates: {
    from: string;
    to: string;
  };
  pax: number;
  totalPrice: number;
  discount: number;
  finalPrice: number;
  overview: string;
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  coverImage: string;
  heroImages?: string[];
  experiencePhotos?: string[];
  lowLevelHotels?: any[];
  highLevelHotels?: any[];
  lowLevelPrice?: number;
  highLevelPrice?: number;
  expiryHours?: number | null;
  expiresAt?: string;
  expert?: {
    name: string;
    whatsapp: string;
    phone?: string;
    designation: string;
    photo?: string;
    avatar?: string;
    description?: string;
  };
  staySummary?: { nights: number; location: string }[];
  roomsInfo?: string;
  mealsInfo?: string;
  travelling?: { label: string; icon: string }[];
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompactTrip {
  id: string;
  code: string | null;
  title: string;
  status: string;
  destination?: string | null;
  availableDates?: string[];
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  actorUserId?: string | null;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  action: string;
  module?: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
  location?: string | null;
  userAgent?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
}

// ── Finance Control Center & Verification Types ──

export interface FinanceControlCenterStats {
  todayCollections: number;
  pendingVerificationCount: number;
  cashPendingAmount: number;
  cashPendingCount: number;
  outgoingPendingAmount: number;
  outgoingPendingCount: number;
  ticketingPendingCount: number;
  discrepanciesCount: number;
  updatedAt: string;
}

export interface CashSubmissionItem {
  id: string;
  salespersonId?: string;
  salespersonName: string;
  salespersonEmail?: string;
  salespersonPhone?: string;
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  tripName: string;
  departureDate?: string;
  expectedAmount: number;
  submittedAmount: number;
  difference: number;
  hasDiscrepancy: boolean;
  paymentDate: string;
  receiptNumber: string;
  receiptUrl?: string | null;
  notes: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'DISCREPANCY' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | string;
  rejectionReason?: string | null;
  adjustmentNote?: string | null;
  submittedAt: string;
  verifiedAt?: string;
  actionedBy?: { name: string; role: string } | null;
}

export interface IncomingPaymentItem {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  tripName: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string;
  collectionAccountName: string;
  bankName: string;
  upiId?: string;
  notes?: string;
  status: string;
  submittedBy: string;
  actionedBy?: string | null;
  createdAt: string;
  bookingDate?: string | null;
  tripDepartureDate?: string | null;
}

export interface VendorPaymentRequestItem {
  id: string;
  tripId: string;
  tripTitle: string;
  tripLocation: string;
  vendorId?: string;
  vendorName: string;
  vendorType: string;
  vendorPhone?: string;
  agreedTariff: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'verified' | string;
  outgoingPaymentMode?: string;
  depositAccountName?: string;
  notes?: string;
  createdAt: string;
  sourceType?: string;
  sourceId?: string | null;
  operationalLinked?: boolean;
  departureHref?: string | null;
  departureDate?: string | null;
  serviceDescription?: string;
  tripName?: string;
  category?: string;
  approvalStatus?: string;
  status?: string;
  totalCost?: number;
  overpaidAmount?: number;
  isOverpaid?: boolean;
  requiresFounderApproval?: boolean;
  billReference?: string;
  proofUrl?: string | null;
  invoiceProof?: string | null;
  invoiceFileUrl?: string | null;
  invoiceProofUrl?: string | null;
  paymentProofUrl?: string | null;
  proofUrls?: string[];
  approvedByName?: string | null;
  approvedAt?: string | null;
  paidBy?: string | null;
}

export interface TicketFinanceAuditItem {
  id: string;
  bookingId: string;
  customerName: string;
  tripName: string;
  departureDate?: string;
  paxCount: number;
  pnr: string;
  trainNo: string;
  fromStation: string;
  toStation: string;
  journeyDate?: string;
  preferredClass: string;
  baseFare: number;
  actualTicketCost: number;
  packageAllowance: number;
  ticketingMargin: number;
  variance: number;
  status: string;
  specialNotes?: string;
  updatedAt?: string;
}

export interface DiscrepancyItem {
  id: string;
  type: string;
  sourceRef: string;
  salespersonName: string;
  customerName: string;
  tripName: string;
  expectedAmount: number;
  submittedAmount: number;
  difference: number;
  reason: string;
  status: string;
  createdAt: string;
}

export interface FinancialAuditLogItem {
  id: string;
  action: string;
  notes?: string;
  actorName: string;
  actorRole: string;
  bookingId: string;
  customerName: string;
  tripName: string;
  amount: number;
  paymentMode: string;
  status: string;
  timestamp: string;
}

export interface DeparturePayoutItem {
  id: string;
  type: string;
  title: string;
  recipient: string;
  tripCode: string;
  amount: number;
  status: string;
  submittedBy: string;
  submittedAt: string;
  notes?: string;
}

export interface MiscellaneousExpenseItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string;
  receiptUrl?: string;
  submittedBy: string;
  submittedById?: string;
  submittedAt: string;
  status: string;
  notes?: string;
  type?: "MISCELLANEOUS" | "ACTIVITY";
}

export interface RefundTransactionItem {
  id: string;
  tenantId?: string;
  bookingId: string;
  booking?: {
    id: string;
    bookingId: string;
    fullName?: string;
    name?: string;
    phone?: string;
    totalAmount?: number;
    advancePaid?: number;
    tripName?: string;
  };
  refundReason: string;
  refundMethod: 'CASH_REFUND' | 'CREDIT_NOTE' | 'HYBRID' | string;
  refundAmount: number;
  creditNoteAmount: number;
  creditNoteCode?: string | null;
  creditNoteStatus?: 'ACTIVE' | 'PARTIALLY_USED' | 'FULLY_USED' | 'EXPIRED' | string;
  creditNoteExpiresAt?: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED' | string;
  refundReference?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string; email: string };
  approvedById?: string | null;
  approvedBy?: { id: string; name: string; email: string };
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  creditUsages?: CreditNoteUsageItem[];
}

export interface CreditNoteUsageItem {
  id: string;
  refundTransactionId: string;
  targetBookingId: string;
  targetBooking?: { id: string; bookingId: string; fullName?: string; tripName?: string };
  amountUsed: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string | null;
  appliedById?: string | null;
  appliedBy?: { id: string; name: string; email: string };
  createdAt: string;
}

export interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number | null;
  applicableTripIds?: string[] | null;
  maxUsesTotal?: number | null;
  maxUsesPerUser?: number | null;
  currentUsesCount: number;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | string;
  createdById?: string | null;
  createdBy?: { id: string; name: string; email: string };
  _count?: { redemptions: number };
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTicketItem {
  id: string;
  bookingId?: string | null;
  booking?: {
    bookingId: string;
    fullName?: string;
    name?: string;
    phone?: string;
    tripName?: string;
    departureDate?: string;
  };
  type: 'TRAIN' | 'FLIGHT' | 'BUS' | 'CAB' | 'OTHER' | string;
  pnr?: string | null;
  ticketNumber?: string | null;
  passengers?: any;
  documentUrl?: string | null;
  provider: string;
  journeyDate?: string | null;
  arrivalDate?: string | null;
  source?: string | null;
  destination?: string | null;
  cost: number;
  packageAllowance?: number | null;
  ticketingMargin?: number | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISCREPANCY' | 'REJECTED' | string;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string; email: string };
  verifiedById?: string | null;
  verifiedBy?: { id: string; name: string; email: string };
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRegistryItem {
  id: string;
  bookingId: string;
  serviceType: 'TRAIN' | 'FLIGHT' | 'VISA' | 'HOTEL' | 'INSURANCE' | 'TRANSPORT' | 'OTHER' | string;
  serviceName: string;
  vendorId?: string | null;
  costPrice: number;
  sellingPrice: number;
  confirmationRef?: string | null;
  notes?: string | null;
  assignedStaffId?: string | null;
  assignedStaff?: { id: string; name: string; email: string };
  status: 'PENDING' | 'BOOKED' | 'VERIFIED' | 'CANCELLED' | string;
  verifiedById?: string | null;
  verifiedBy?: { id: string; name: string; email: string };
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAllotmentItem {
  id: string;
  title: string;
  description?: string | null;
  taskType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED' | string;
  assignedToId: string;
  assignedTo?: { id: string; name: string; email: string };
  assignedById?: string | null;
  assignedBy?: { id: string; name: string; email: string };
  bookingId?: string | null;
  booking?: { bookingId: string; fullName?: string; tripName?: string };
  tripId?: string | null;
  vendorId?: string | null;
  serviceId?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  comments?: TaskCommentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskCommentItem {
  id: string;
  taskId: string;
  authorId: string;
  author?: { id: string; name: string; role?: string };
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TaskDashboardData {
  totalTasks: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  blockedCount: number;
  cancelledCount: number;
  overdueCount: number;
  completionRate: number;
  workloadByPerson: Array<{
    personId: string;
    personName: string;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }>;
}

export interface AuditLogItem {
  id: string;
  tenantId?: string;
  actorUserId?: string | null;
  changedBy?: string | null;
  bookingId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changeSummary?: string | null;
  beforeData?: any;
  afterData?: any;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface TripPnLData {
  tripId: string;
  tripTitle: string;
  departureDate: string;
  passengerSummary: {
    totalBookings: number;
    totalPax: number;
  };
  revenue: {
    grossSellingPrice: number;
    totalCouponDiscounts: number;
    totalCashRefunds: number;
    totalCreditsIssued: number;
    netRevenue: number;
    totalCollected: number;
    totalDue: number;
  };
  directCosts: {
    vendorContractCost: number;
    vendorPaid: number;
    guideCost: number;
    guidePaid: number;
    miscCost: number;
    tripActivityCost: number;
    ticketingCost: number;
    totalDirectCost: number;
  };
  profitability: {
    grossProfit: number;
    profitMarginPercent: number;
    isProfitable: boolean;
  };
}

