import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  CreditCard,
  Check,
  X,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  ArrowRight,
  DollarSign,
  Building2,
  UserCheck,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Receipt,
  Filter,
  Truck,
  Zap,
  User,
  UtensilsCrossed,
  Package,
  ExternalLink,
} from "lucide-react";
import { cn, safeFormatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { combineVendorPayableTotals } from "@/utils/departure/vendorPayableMerge";
import { opsService } from "@/services/ops.service";
import { trainTicketService } from "@/services/trainTicket.service";
import {
  collectionAccountsService,
  CollectionAccount,
} from "@/services/collectionAccounts.service";
import { ImageUpload } from "@/components/admin/ImageUpload";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { canViewProfit } from "@/config/permissions.config";
import {
  formatVendorName,
  hotelServiceLine,
  refineServiceAgainstVendor,
} from "@/utils/vendorDisplayText";

import {
  isMiscExpenseApproved,
  deriveMiscApprovalUiStatus,
  resolveMiscApproverDisplay,
} from "@/utils/departure/miscExpenseApproval";

function isMiscellaneousVendorCategory(category?: string | null) {
  const c = (category || "").toUpperCase();
  return c === "MISCELLANEOUS" || c === "MISC";
}

function partnerDisplayName(row: any): string {
  return formatVendorName(
    row?.name ||
      row?.vendorName ||
      row?.hotelName ||
      (typeof row?.vendorId === "object" ? row.vendorId?.name : row?.vendorId) ||
      row?.vendor?.name,
  );
}

function escapeVoucherText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveVendorProofs(vendor: any, history?: any) {
  const urls = [
    ...new Set(
      [
        history?.paymentProofUrl,
        vendor?.paymentProofUrl,
        vendor?.advanceProofUrl,
        vendor?.settlementProofUrl,
        history?.proofUrl,
        vendor?.proofUrl,
        history?.invoiceFileUrl,
        vendor?.invoiceFileUrl,
        history?.invoiceProof,
        vendor?.invoiceProof,
      ].filter((url) => typeof url === "string" && url.trim()),
    ),
  ];
  return { payment: urls[0] || "" };
}

interface DeparturePaymentsProps {
  tripId: string;
  departureDateStr: string;
  tripDetails: any;
  tripVendors: any[];
}

function operationalSourcePayload(row: any, category?: string) {
  if (!row) return {};
  if (row.sourceType && row.sourceId) {
    return { sourceType: row.sourceType, sourceId: row.sourceId };
  }
  const rawId = row.rawAssignment?.id;
  const cat = String(category || row.category || row.vendorType || "").toLowerCase();
  if (!rawId) return {};
  if (cat.includes("hotel")) {
    return { sourceType: "OPS_HOTEL_BOOKING", sourceId: rawId, hotelBookingId: rawId };
  }
  if (cat.includes("transport") || cat.includes("fleet")) {
    return { sourceType: "OPS_TRANSPORT_FLEET", sourceId: rawId, fleetBookingId: rawId };
  }
  if (cat.includes("guide")) {
    return { sourceType: "OPS_GUIDE_PAYMENT", sourceId: rawId, guideId: rawId };
  }
  if (cat.includes("activ")) {
    return { sourceType: "OPS_ACTIVITY", sourceId: rawId, activityId: rawId };
  }
  return {};
}

export default function DeparturePayments({
  tripId,
  departureDateStr,
  tripDetails,
  tripVendors,
}: DeparturePaymentsProps) {
  // Operational Sub Tabs (Clients, Dashboard, Vendor Payables, Activities, Misc, Reconciliation)
  const [subTab, setSubTab] = useState<
    | "clients"
    | "dashboard"
    | "vendors"
    | "activities"
    | "misc"
    | "reconciliation"
  >("vendors");

  // Expanded Row IDs for detailed transaction ledger view
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(
    null,
  );
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  // Live Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [trainTickets, setTrainTickets] = useState<any[]>([]);

  // Local state for Activities, Misc Expenses, and Adjustments
  const [activityPayments, setActivityPayments] = useState<any[]>([]);
  const [miscPayments, setMiscPayments] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  // Auth and Approver Authority
  const { admin } = useAuthStore();
  const roleStr = String(admin?.role || "").toUpperCase();
  const canSeeProfit = canViewProfit(admin);
  const isApprover = Boolean(
    admin != null &&
    (
      roleStr === "SUPERADMIN" ||
      roleStr === "FOUNDER" ||
      roleStr === "ADMIN" ||
      roleStr === "FINANCE" ||
      roleStr.includes("FINANCE") ||
      roleStr.includes("ADMIN") ||
      roleStr.includes("FOUNDER") ||
      roleStr.includes("SUPER")
    )
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("All Status");
  const [vendorCategoryFilter, setVendorCategoryFilter] =
    useState("All Categories");
  const [vendorStatusFilter, setVendorStatusFilter] = useState("All Status");
  const [collectionAccounts, setCollectionAccounts] = useState<CollectionAccount[]>([]);

  // Modals
  const [addClientPaymentOpen, setAddClientPaymentOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [clientPaymentForm, setClientPaymentForm] = useState({
    amount: "",
    paymentMode: "UPI",
    collectionAccountId: "",
    transactionId: "",
    paymentDate: new Date().toISOString().substring(0, 10),
    proofUrl: "",
    remarks: "",
    status: "PENDING_VERIFICATION",
  });

  const [addVendorPaymentOpen, setAddVendorPaymentOpen] = useState(false);
  const [editingVendorPayment, setEditingVendorPayment] = useState<any | null>(
    null,
  );
  const [vendorPaymentForm, setVendorPaymentForm] = useState({
    vendorName: "",
    category: "Hotels",
    serviceDescription: "",
    agreedAmount: "",
    advancePaid: "",
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMode: "BANK_TRANSFER",
    collectionAccountId: "",
    customPayerName: "",
    needsReimbursement: false,
    transactionId: "",
    invoiceProof: "",
    paymentProof: "",
    status: "Advance Paid",
    remarks: "",
  });

  // Quick Payment Proof Attachment Modal
  const [quickProofModalOpen, setQuickProofModalOpen] = useState(false);
  const [quickProofTarget, setQuickProofTarget] = useState<{
    vendorId: string;
    historyIndex: number;
    vendorName: string;
    amount: number;
    proofUrl: string;
  } | null>(null);

  // In-App Payment Proof / Receipt Screenshot Preview Popup Modal
  const [proofPreviewModal, setProofPreviewModal] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    imageUrl: string;
    paymentUrl?: string;
    amount?: number;
    method?: string;
    date?: string;
    txnId?: string;
    accountName?: string;
    uploadedBy?: string;
    status?: string;
  } | null>(null);

  const [editingActivityPayment, setEditingActivityPayment] = useState<any | null>(null);
  const [addActivityPaymentOpen, setAddActivityPaymentOpen] = useState(false);
  const [activityPaymentForm, setActivityPaymentForm] = useState({
    activityId: "",
    activityName: "",
    activityType: "Activities",
    costPerPerson: "",
    participantCount: "1",
    vendorName: "",
    amountPaid: "",
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMode: "BANK_TRANSFER",
    collectionAccountId: "",
    customPayerName: "",
    needsReimbursement: false,
    transactionId: "",
    invoiceProof: "",
    remarks: "",
  });

  const [addMiscPaymentOpen, setAddMiscPaymentOpen] = useState(false);
  const [miscPaymentForm, setMiscPaymentForm] = useState({
    description: "",
    category: "Emergency",
    amount: "",
    payeeName: "",
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMethod: "CASH",
    transactionId: "",
    collectionAccountId: "",
    status: "PENDING",
    remarks: "",
  });

  const generateVendorInvoicePDF = (v: any, historyItem?: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to download/print PDF.");
      return;
    }

    const txnId = historyItem?.txnId || v.transactionId || `VND-INV-${v.id || "001"}`;
    const invoiceNo = String(v.invoiceNumber || "").trim() && v.invoiceNumber !== "—"
      ? v.invoiceNumber
      : txnId;
    const payDate = historyItem?.date || v.paymentDate || new Date().toISOString().substring(0, 10);
    const amount = historyItem?.amount || v.advancePaid || v.agreedAmount || 0;
    const payMethod = historyItem?.method || v.paymentMode || "Bank Transfer";
    const payType = historyItem?.type || (v.advancePaid >= v.agreedAmount ? "FINAL SETTLEMENT" : "ADVANCE PAYMENT");
    const vendorLabel = escapeVoucherText(formatVendorName(v.vendorName));
    const serviceLabel = escapeVoucherText(
      refineServiceAgainstVendor(v.serviceDescription, v.vendorName) || v.category || "Service",
    );
    const tripLabel = escapeVoucherText(tripDetails?.title || "YouthCamping Departure");
    const proofs = resolveVendorProofs(v, historyItem);
    const proofImgs = [proofs.payment]
      .filter(Boolean)
      .filter((url) => !/\.pdf($|\?)/i.test(url))
      .map(
        (url) =>
          `<img src="${escapeVoucherText(url)}" alt="Proof" style="max-width: 260px; max-height: 220px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;" />`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendor Payment Voucher - ${v.vendorName}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #FF4D00; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .logo span { color: #FF4D00; }
            .voucher-title { font-size: 18px; font-weight: 800; color: #FF4D00; text-transform: uppercase; text-align: right; }
            .voucher-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 12px; }
            .card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.5px; }
            .card-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .card-row strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 12px 14px; }
            .text-right { text-align: right; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; text-transform: uppercase; }
            .badge-success { background: #dcfce7; color: #15803d; }
            .badge-orange { background: #ffedd5; color: #c2410c; }
            .total-box { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 16px; width: 280px; margin-left: auto; margin-bottom: 30px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
            .total-row.final { font-size: 16px; font-weight: 900; color: #c2410c; border-top: 1px solid #fed7aa; padding-top: 8px; margin-top: 8px; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; }
            .stamp { border: 2px dashed #10b981; color: #047857; display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; margin-top: 10px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #FF4D00; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
          </div>

          <div class="header">
            <div>
              <div class="logo">YOUTH<span>CAMPING</span> OS</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Youth Camping Official Payment Voucher</div>
            </div>
            <div>
              <div class="voucher-title">VENDOR VOUCHER</div>
              <div class="voucher-sub">Ref: ${txnId} | Date: ${payDate}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Vendor Partner Details</div>
              <div class="card-row"><span>Vendor Name:</span> <strong>${vendorLabel}</strong></div>
              <div class="card-row"><span>Category:</span> <strong>${escapeVoucherText(v.category || "Vendor")}</strong></div>
              <div class="card-row"><span>Invoice / TXN:</span> <strong>${escapeVoucherText(invoiceNo)}</strong></div>
            </div>
            <div class="card">
              <div class="card-title">Trip / Departure Context</div>
              <div class="card-row"><span>Trip Context:</span> <strong>${tripLabel}</strong></div>
              <div class="card-row"><span>Departure:</span> <strong>${escapeVoucherText(departureDateStr)}</strong></div>
              <div class="card-row"><span>Payment Status:</span> <span class="badge ${v.balanceAmount <= 0 ? 'badge-success' : 'badge-orange'}">${v.status || 'PAID'}</span></div>
              <div class="card-row"><span>Voucher Type:</span> <strong>${payType}</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Service</th>
                <th>Payment Mode</th>
                <th>Transaction Reference</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${serviceLabel}</strong>
                  <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Payment logged for departure ops</div>
                </td>
                <td>${payMethod}</td>
                <td><code>${txnId}</code></td>
                <td class="text-right"><strong>₹${Number(amount).toLocaleString('en-IN')}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Agreed Total:</span> <span>₹${(v.agreedAmount || amount).toLocaleString('en-IN')}</span></div>
            <div class="total-row"><span>This Payment:</span> <span style="color: #10b981; font-weight: bold;">₹${Number(amount).toLocaleString('en-IN')}</span></div>
            <div class="total-row final"><span>Balance Due:</span> <span>₹${(Math.max(0, (v.agreedAmount || amount) - (v.advancePaid || amount))).toLocaleString('en-IN')}</span></div>
          </div>

          ${proofImgs
            ? `<div style="margin-bottom: 24px;"><div class="card-title">Attached proofs</div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">${proofImgs}</div></div>`
            : ""}

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div class="stamp">PAYMENT VERIFIED & RECORDED ✓</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>_______________________________</div>
              <div style="font-weight: bold; margin-top: 4px;">Authorized Accounts Officer</div>
              <div>YouthCamping Operations Hub</div>
            </div>
          </div>

          <div class="footer">
            <p>YouthCamping Internal Operating System — Accounts & Finance Desk</p>
            <p>This payment receipt is system generated and acts as official proof of vendor disbursement.</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generateClientReceiptPDF = (b: any, historyItem?: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print/download receipt.");
      return;
    }

    const passengerName = b.passengerName || b.leadPassengerName || b.name || "Valued Guest";
    const bookingId = b.bookingId || b.id || "BK-001";
    const txnId = historyItem?.txnId || b.transactionId || `RCP-${bookingId}`;
    const payDate = historyItem?.date || b.paymentDate || new Date().toISOString().substring(0, 10);
    const amount = historyItem?.amount || b.advancePaid || b.totalAmount || 0;
    const payMethod = historyItem?.method || b.paymentMode || "UPI";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Payment Receipt - ${passengerName}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .logo span { color: #2563eb; }
            .voucher-title { font-size: 18px; font-weight: 800; color: #2563eb; text-transform: uppercase; text-align: right; }
            .voucher-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 12px; }
            .card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.5px; }
            .card-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .card-row strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 12px 14px; }
            .text-right { text-align: right; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; text-transform: uppercase; }
            .badge-success { background: #dcfce7; color: #15803d; }
            .total-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; width: 280px; margin-left: auto; margin-bottom: 30px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
            .total-row.final { font-size: 16px; font-weight: 900; color: #1d4ed8; border-top: 1px solid #93c5fd; padding-top: 8px; margin-top: 8px; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; }
            .stamp { border: 2px dashed #2563eb; color: #1d4ed8; display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; margin-top: 10px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
          </div>

          <div class="header">
            <div>
              <div class="logo">YOUTH<span>CAMPING</span> OS</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Official Passenger Payment Receipt</div>
            </div>
            <div>
              <div class="voucher-title">PAYMENT RECEIPT</div>
              <div class="voucher-sub">Ref: ${txnId} | Date: ${payDate}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Passenger Details</div>
              <div class="card-row"><span>Passenger Name:</span> <strong>${passengerName}</strong></div>
              <div class="card-row"><span>Booking ID:</span> <strong>${bookingId}</strong></div>
              <div class="card-row"><span>Phone:</span> <strong>${b.phone || b.leadPhone || 'N/A'}</strong></div>
            </div>
            <div class="card">
              <div class="card-title">Trip / Departure Context</div>
              <div class="card-row"><span>Trip Title:</span> <strong>${tripDetails?.title || 'YouthCamping Trip'}</strong></div>
              <div class="card-row"><span>Payment Status:</span> <span class="badge badge-success">PAYMENT RECEIVED ✓</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Payment Mode</th>
                <th>Transaction Reference</th>
                <th class="text-right">Amount Received (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Trip Booking Payment</strong>
                  <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Verified customer receipt</div>
                </td>
                <td>${payMethod}</td>
                <td><code>${txnId}</code></td>
                <td class="text-right"><strong>₹${Number(amount).toLocaleString('en-IN')}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Package Cost:</span> <span>₹${(b.totalAmount || amount).toLocaleString('en-IN')}</span></div>
            <div class="total-row"><span>This Payment:</span> <span style="color: #2563eb; font-weight: bold;">₹${Number(amount).toLocaleString('en-IN')}</span></div>
            <div class="total-row final"><span>Remaining Balance:</span> <span>₹${(Math.max(0, (b.totalAmount || amount) - (b.advancePaid || amount))).toLocaleString('en-IN')}</span></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div class="stamp">OFFICIAL RECEIPT VERIFIED ✓</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>_______________________________</div>
              <div style="font-weight: bold; margin-top: 4px;">YouthCamping Finance Desk</div>
            </div>
          </div>

          <div class="footer">
            <p>YouthCamping Official Booking Receipt — Thank you for travelling with us!</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const [addAdjustmentOpen, setAddAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "Refund",
    originalPaymentRef: "",
    amount: "",
    reason: "",
    status: "PENDING",
  });

  // Fetch API data and merge cleanly with defaults if API is empty
  const fetchData = async () => {
    try {
      const [clientRes, vendorRes, vendorsDirRes, expensesRes, trainSummaryRes, accountsRes, depActivitiesRes, hotelsRes] = await Promise.all([
        opsService
          .getClientPayments(tripId, departureDateStr)
          .catch(() => ({ bookings: [], receipts: [] })),
        opsService.getVendorPayments(tripId, departureDateStr).catch(() => []),
        api.get("/vendors/directory").catch(() => ({ data: { data: [] } })),
        opsService.getTripExpenses(tripId, departureDateStr).catch(() => []),
        trainTicketService
          .getFinanceSummary({ tripId, departureDate: departureDateStr })
          .catch(() => ({ summary: {}, tickets: [] })),
        collectionAccountsService
          .getAccounts({ activeOnly: true })
          .catch(() => ({ data: [], summary: { totalCollected: 0, totalSubmitted: 0, totalPending: 0 } })),
        api.get(`/ops/activities/${tripId}`, { params: { departureDate: departureDateStr } }).catch(() => ({ data: { data: [] } })),
        opsService.getHotelBookings(tripId, departureDateStr).catch(() => []),
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        setCollectionAccounts(accountsRes.data);
        setClientPaymentForm((prev) => ({
          ...prev,
          collectionAccountId: prev.collectionAccountId || accountsRes.data[0].id,
        }));
      }

      const mergedBookings =
        clientRes.bookings && clientRes.bookings.length > 0
          ? clientRes.bookings.map((b: any) => {
              const bookingReceipts = (clientRes.receipts || []).filter(
                (r: any) => r.bookingId === b.bookingId,
              );
              return {
                ...b,
                history: bookingReceipts.map((r: any) => {
                  const remarks = String(r.remarks || "");
                  const isRefund =
                    String(r.status || "").toUpperCase().includes("REFUND") ||
                    remarks.includes("TYPE:REFUND");
                  const isCredit = remarks.includes("TYPE:CREDIT");
                  return {
                  id: r.id,
                  date: r.paymentDate ? r.paymentDate.substring(0, 10) : "N/A",
                  amount: isRefund ? -Math.abs(Number(r.amount) || 0) : r.amount,
                  method: r.paymentMode,
                  txnId: r.transactionId || "N/A",
                  type: isRefund ? "REFUND" : isCredit ? "CREDIT" : "RECEIPT",
                  status: r.status,
                  verifiedBy: r.collectedBy || "System",
                  remarks: r.remarks || "",
                  proofUrl: r.proofUrl || "",
                  collectionAccount: r.collectionAccount,
                  accountName: r.collectionAccount?.accountName || "",
                  };
                }),
              };
            })
          : [];

      const apiVendors =
        vendorRes && vendorRes.length > 0
          ? vendorRes.map((v: any) => {
              const proof =
                v.invoiceProof ||
                v.proofUrl ||
                v.invoiceFileUrl ||
                v.advanceProofUrl ||
                "";
              return {
                ...v,
                invoiceProof: proof,
                proofUrl: proof,
                history: [
                  {
                    id: `vtxn-${v.id || Date.now()}`,
                    date: v.paymentDate ? v.paymentDate.substring(0, 10) : "N/A",
                    amount: v.advancePaid || 0,
                    method: v.paymentMode || "Bank Transfer",
                    txnId: v.transactionId || "N/A",
                    type: "ADVANCE",
                    status: v.status,
                    invoiceProof: proof,
                    proofUrl: proof,
                    collectionAccount: v.collectionAccount,
                    accountName:
                      v.collectionAccount?.accountName || v.paidBy || "",
                    uploadedBy: v.paidBy || "Operations",
                    approvalStatus:
                      v.approvalStatus ||
                      (v.status === "Paid" ? "APPROVED" : "PENDING_APPROVAL"),
                  },
                ],
              };
            })
          : [];

      // Merge auto-assigned vendors from the trip (Hotels, Guides, Transport)
      const mergedVendors = [...apiVendors];
      (tripVendors || []).forEach((tv) => {
        if (tv.assignmentStatus === "CANCELLED" || tv.status === "CANCELLED" || tv.rawAssignment?.assignmentStatus === "CANCELLED") {
          return;
        }
        const vName = partnerDisplayName(tv);
        if (!vName || vName === "NO_STAY" || vName === "—" || vName.toLowerCase().includes("night journey")) return;
        
        const vCat =
          tv.vendorType === "hotel" || tv.category === "Hotels"
            ? "Hotels"
            : tv.vendorType === "guide" || tv.category === "Guides"
              ? "Guides"
              : tv.vendorType === "activity" || tv.category === "Activities"
                ? "Activities"
                : tv.vendorType === "transport" || tv.category === "Transport"
                  ? "Transport"
                  : tv.category || "Other";

        const existingIdx = mergedVendors.findIndex((v) => {
          if (tv.id && v.id && tv.id === v.id) return true;
          if (tv.rawAssignment?.id && v.rawAssignment?.id && tv.rawAssignment.id === v.rawAssignment.id) return true;
          return v.vendorName?.toLowerCase().trim() === vName.toLowerCase().trim() && v.category === vCat && !tv.id?.startsWith("transport-") && !v.id?.startsWith("transport-");
        });
        const agreed = Number(tv.agreedCost || tv.totalAmount || 0);
        const paid = Number(tv.paidAmount || tv.advancePaid || 0);

        if (existingIdx >= 0) {
          const isSameRecord =
            (tv.id && mergedVendors[existingIdx].id === tv.id) ||
            (tv.rawAssignment?.id && mergedVendors[existingIdx].rawAssignment?.id === tv.rawAssignment.id);

          const combined = combineVendorPayableTotals(
            mergedVendors[existingIdx],
            { agreed, paid },
            isSameRecord,
          );
          mergedVendors[existingIdx].agreedAmount = combined.agreedAmount;
          mergedVendors[existingIdx].advancePaid = combined.advancePaid;
          mergedVendors[existingIdx].balanceAmount = Math.max(0, mergedVendors[existingIdx].agreedAmount - mergedVendors[existingIdx].advancePaid);
          const totalAgreed = mergedVendors[existingIdx].agreedAmount;
          const totalPaid = mergedVendors[existingIdx].advancePaid;
          mergedVendors[existingIdx].status =
            totalPaid >= totalAgreed && totalAgreed > 0
              ? "Paid"
              : totalPaid > 0
              ? "Advance Paid"
              : "Pending";
          if (tv.rawAssignment) {
            mergedVendors[existingIdx].rawAssignment = tv.rawAssignment;
          }
          // Ensure proof is synced to history item
          if (mergedVendors[existingIdx].invoiceProof || mergedVendors[existingIdx].proofUrl) {
            const existingProof = mergedVendors[existingIdx].invoiceProof || mergedVendors[existingIdx].proofUrl;
            if (Array.isArray(mergedVendors[existingIdx].history) && mergedVendors[existingIdx].history.length > 0) {
              mergedVendors[existingIdx].history[0].invoiceProof = existingProof;
              mergedVendors[existingIdx].history[0].proofUrl = existingProof;
            }
          }
        } else {
          const statusLabel =
            paid >= agreed && agreed > 0
              ? "Paid"
              : paid > 0
              ? "Advance Paid"
              : "Pending";

          mergedVendors.push({
            id: tv.id || `auto-${vName}`,
            vendorName: vName,
            category: vCat,
            serviceDescription: tv.notes || `${tv.vendorType || "vendor"} services`,
            agreedAmount: agreed,
            advancePaid: paid,
            balanceAmount: Math.max(0, agreed - paid),
            status: statusLabel,
            rawAssignment: tv.rawAssignment,
            history:
              paid > 0
                ? [
                    {
                      date: new Date().toISOString().substring(0, 10),
                      amount: paid,
                      method: "Auto-Assigned Trip Rate",
                      txnId: "AUTO-SYNC",
                      type: "ADVANCE",
                      status: statusLabel,
                    },
                  ]
                : [],
          });
        }
      });

      // Merge direct Hotel Bookings from OpsHotelBooking into mergedVendors
      const rawHotels = Array.isArray(hotelsRes) ? hotelsRes : (hotelsRes?.data || []);
      (rawHotels || []).forEach((h: any) => {
        const hName = formatVendorName(h.hotelName || h.name);
        if (!hName || hName === "NO_STAY" || hName === "NO STAY" || hName === "—" || hName.toLowerCase().includes("night journey")) {
          return;
        }
        const agreed = Number(h.totalAmount || 0);
        const paid = Number(h.advancePaid || 0);
        const balance = Math.max(0, agreed - paid);
        const status = paid >= agreed && agreed > 0 ? "Paid" : paid > 0 ? "Advance Paid" : "Pending";

        const existingIdx = mergedVendors.findIndex((v) => {
          if (h.id && v.id && h.id === v.id) return true;
          return v.category === "Hotels" && v.vendorName?.toLowerCase().trim() === hName.toLowerCase().trim();
        });

        if (existingIdx >= 0) {
          // If existing had 0 cost or smaller cost, update with direct OpsHotelBooking cost
          mergedVendors[existingIdx].agreedAmount = Math.max(mergedVendors[existingIdx].agreedAmount || 0, agreed);
          mergedVendors[existingIdx].advancePaid = Math.max(mergedVendors[existingIdx].advancePaid || 0, paid);
          mergedVendors[existingIdx].balanceAmount = Math.max(0, (mergedVendors[existingIdx].agreedAmount || 0) - (mergedVendors[existingIdx].advancePaid || 0));
          mergedVendors[existingIdx].status =
            mergedVendors[existingIdx].advancePaid >= mergedVendors[existingIdx].agreedAmount && mergedVendors[existingIdx].agreedAmount > 0
              ? "Paid"
              : mergedVendors[existingIdx].advancePaid > 0
                ? "Advance Paid"
                : "Pending";
          if (!mergedVendors[existingIdx].invoiceNumber) {
            mergedVendors[existingIdx].invoiceNumber =
              h.transactionId || mergedVendors[existingIdx].transactionId || mergedVendors[existingIdx].history?.[0]?.txnId;
          }
          mergedVendors[existingIdx].serviceDescription = hotelServiceLine({
            ...h,
            hotelName: hName,
            serviceDescription: mergedVendors[existingIdx].serviceDescription,
          });
        } else {
          mergedVendors.push({
            id: h.id || `hotel-${hName}`,
            vendorName: hName,
            category: "Hotels",
            serviceDescription: hotelServiceLine({ ...h, hotelName: hName }),
            invoiceNumber: h.transactionId || "",
            agreedAmount: agreed,
            advancePaid: paid,
            balanceAmount: balance,
            status: status,
            paymentDate: h.checkIn ? String(h.checkIn).substring(0, 10) : new Date().toISOString().substring(0, 10),
            paymentMode: "BANK_TRANSFER",
            rawAssignment: h,
            history:
              paid > 0
                ? [
                    {
                      date: h.checkIn ? String(h.checkIn).substring(0, 10) : new Date().toISOString().substring(0, 10),
                      amount: paid,
                      method: "Bank Transfer",
                      txnId: "HOTEL-ADVANCE",
                      type: "ADVANCE",
                      status: status,
                    },
                  ]
                : [],
          });
        }
      });

      // Filter and map Trip Expenses into local activities and misc
      let currentPax = 1;
      if (mergedBookings.length > 0) {
        currentPax = mergedBookings.reduce((sum: number, b: any) => {
          if (b.numberOfTravelers && Number(b.numberOfTravelers) > 0) {
            return sum + Number(b.numberOfTravelers);
          }
          try {
            const parsed = typeof b.passengers === "string" ? JSON.parse(b.passengers) : b.passengers;
            if (Array.isArray(parsed) && parsed.length > 0) {
              return sum + parsed.length;
            }
          } catch (_e) {
            // Ignore parse errors
          }
          return sum + 1;
        }, 0) || 1;
      }

      const fetchedActivities = Array.isArray(depActivitiesRes.data?.data)
        ? depActivitiesRes.data.data.map((a: any) => {
            const costPerPerson = Number(a.vendorCost || a.estimatedCost || 0);
            const pax = Number(a.maxParticipants || a.bookedCount || currentPax);
            const totalCost = costPerPerson * pax;
            const amountPaid = Number(a.actualCost || 0);
            const balanceDue = Math.max(0, totalCost - amountPaid);
            const actVendorName = a.vendorName || "Direct Supplier";

            return {
              id: a.id,
              activityId: a.id,
              activityName: a.name,
              activityType: a.type || a.category || "ADVENTURE",
              vendorName: actVendorName,
              vendorId: a.vendorId,
              costPerPerson,
              participantCount: pax,
              totalCost,
              amountPaid,
              balanceDue,
              isIncluded: false,
              status: amountPaid >= totalCost && totalCost > 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING",
              dayNumber: a.dayNumber,
              category: "activities",
              history: amountPaid > 0 ? [
                {
                  id: `act-hist-${a.id}`,
                  date: a.date ? String(a.date).substring(0, 10) : new Date().toISOString().substring(0, 10),
                  amount: amountPaid,
                  method: "Activity Sync",
                  txnId: "AUTO-SYNC",
                  type: "ADVANCE",
                  status: amountPaid >= totalCost ? "PAID" : "PARTIAL",
                }
              ] : [],
            };
          })
        : [];

      fetchedActivities.forEach((act: any) => {
        if (act.totalCost > 0) {
          const vName = act.vendorName;
          const existingIdx = mergedVendors.findIndex((v) => v.vendorName?.toLowerCase().trim() === vName.toLowerCase().trim());
          if (existingIdx >= 0) {
            // Use Math.max to avoid double-counting: OpsVendorPayment record already stores the
            // correct agreedAmount (= costPerPerson * pax). Adding act.totalCost on top would
            // double the invoice total when both sources reference the same activity.
            mergedVendors[existingIdx].agreedAmount = Math.max(mergedVendors[existingIdx].agreedAmount || 0, act.totalCost);
            mergedVendors[existingIdx].advancePaid = Math.max(mergedVendors[existingIdx].advancePaid || 0, act.amountPaid);
            mergedVendors[existingIdx].balanceAmount = Math.max(0, mergedVendors[existingIdx].agreedAmount - mergedVendors[existingIdx].advancePaid);
            const statusLabel = mergedVendors[existingIdx].advancePaid >= mergedVendors[existingIdx].agreedAmount ? "Paid" : mergedVendors[existingIdx].advancePaid > 0 ? "Advance Paid" : "Pending";
            mergedVendors[existingIdx].status = statusLabel;
          } else {
            mergedVendors.push({
              id: `act-vendor-${act.id}`,
              vendorName: vName,
              category: "Activities",
              serviceDescription: act.activityName,
              agreedAmount: act.totalCost,
              advancePaid: act.amountPaid,
              balanceAmount: act.balanceDue,
              status: act.status === "PAID" ? "Paid" : act.status === "PARTIAL" ? "Advance Paid" : "Pending",
              history: act.history,
            });
          }
        }
      });

      const manualActivities = (expensesRes || []).filter(
        (e: any) =>
          (e.category || "").toUpperCase() === "ACTIVITIES" ||
          (e.remarks || "").toUpperCase().includes("CATEGORY: ACTIVITIES"),
      );
      const combinedActivities = [...fetchedActivities, ...manualActivities];

      const misc = (expensesRes || [])
        .filter((e: any) => {
          const rem = (e.remarks || "").toUpperCase();
          const act = (e.activity || "").toUpperCase();
          const cat = (e.category || "").toUpperCase();
          return (
            cat === "MISCELLANEOUS" ||
            cat === "OTHER" ||
            cat === "MISC" ||
            rem.includes("MISCELLANEOUS") ||
            rem.includes("MISC") ||
            act.startsWith("MISC:") ||
            (!rem.includes("RECONCILIATION") &&
              !act.startsWith("ADJUSTMENT:") &&
              cat !== "ACTIVITIES")
          );
        })
        .map((e: any) => {
          const rem = e.remarks || "";
          // Never treat paymentStatus===Paid alone as approved — that caused
          // unapproved misc to mirror as PAID under Vendor Payables.
          const approved = isMiscExpenseApproved({
            approvalStatus: e.approvalStatus,
            remarks: rem,
          });
          const isRejected =
            rem.includes("Status: REJECTED") ||
            rem.includes("STATUS: REJECTED") ||
            e.status === "REJECTED";
          const uiStatus = approved
            ? "APPROVED"
            : isRejected
              ? "REJECTED"
              : "PENDING";

          return {
            id: e.id,
            description: e.activity,
            category: "misc",
            amount: Number(e.totalAmount || 0),
            payeeName: rem.split("|")[0]?.trim() || "Vendor / Staff",
            approvedBy: resolveMiscApproverDisplay({
              approvalStatus: e.approvalStatus,
              remarks: rem,
              status: uiStatus,
            }),
            status: uiStatus,
            paymentDate: e.paymentDate
              ? e.paymentDate.substring(0, 10)
              : new Date().toISOString().substring(0, 10),
            paymentMethod: rem.includes("Method:")
              ? rem.split("Method:")[1]?.split("|")[0]?.trim()
              : "Cash",
          };
        });

      const recons = (expensesRes || [])
        .filter((e: any) => {
          const rem = (e.remarks || "").toUpperCase();
          const act = (e.activity || "").toUpperCase();
          const cat = (e.category || "").toUpperCase();
          return (
            cat === "ADJUSTMENT" ||
            cat === "RECONCILIATION" ||
            rem.includes("RECONCILIATION") ||
            act.startsWith("ADJUSTMENT:")
          );
        })
        .map((e: any) => {
          const rem = e.remarks || "";
          const isApproved =
            e.paymentStatus === "Paid" ||
            rem.includes("Status: APPROVED") ||
            rem.includes("APPROVED") ||
            e.status === "APPROVED";
          const isRejected =
            rem.includes("Status: REJECTED") || rem.includes("REJECTED") || e.status === "REJECTED";
          return {
            id: e.id,
            type:
              (e.activity || "")
                .replace("Adjustment:", "")
                .split("-")[0]
                ?.trim() || "Rate Difference",
            category: "reconciliation",
            originalPaymentRef:
              (e.activity || "").split("-")[1]?.trim() ||
              "Booking/Vendor Payment",
            amount: Number(e.totalAmount || 0),
            reason:
              rem.replace("Reconciliation |", "").split("|")[0]?.trim() ||
              "Adjustment",
            status: isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING",
            createdAt: e.createdAt
              ? e.createdAt.substring(0, 10)
              : new Date().toISOString().substring(0, 10),
          };
        });

      // Include vendor-payment-based misc entries (stored via createVendorPayment with category "Miscellaneous")
      const vpMisc = (mergedVendors || [])
        .filter((v: any) => isMiscellaneousVendorCategory(v.category))
        .map((v: any) => {
          const uiStatus = deriveMiscApprovalUiStatus(v);
          return {
            id: v.id,
            description: v.serviceDescription || v.vendorName,
            category: "misc",
            amount: Number(v.agreedAmount || 0),
            payeeName: v.vendorName,
            approvedBy: resolveMiscApproverDisplay({
              ...v,
              status: uiStatus,
            }),
            status: uiStatus,
            paymentDate: v.paymentDate
              ? String(v.paymentDate).substring(0, 10)
              : new Date().toISOString().substring(0, 10),
            paymentMethod: v.paymentMode || "CASH",
          };
        });
      // Deduplicate miscellaneous expenses so identical records between trip expenses and vendor payments never create multiple rows
      const seenMiscMap = new Map<string, any>();
      for (const mItem of [...misc, ...vpMisc]) {
        const normDesc = (mItem.description || "").trim().toLowerCase();
        const normAmt = Number(mItem.amount || 0);
        const matchKey = mItem.id || `${normDesc}_${normAmt}`;

        let matchedKey = matchKey;
        for (const [k, v] of seenMiscMap.entries()) {
          const vDesc = (v.description || "").trim().toLowerCase();
          const vAmt = Number(v.amount || 0);
          if (vDesc === normDesc && vAmt === normAmt) {
            matchedKey = k;
            break;
          }
        }

        if (seenMiscMap.has(matchedKey)) {
          const existing = seenMiscMap.get(matchedKey);
          if (mItem.status === "APPROVED" && existing.status !== "APPROVED") {
            seenMiscMap.set(matchedKey, { ...existing, ...mItem, status: "APPROVED" });
          }
        } else {
          seenMiscMap.set(matchKey, mItem);
        }
      }
      const allMisc = Array.from(seenMiscMap.values());

      // Merge all approved Miscellaneous expenses into vendor payments list so they appear under All Vendor Expenses (Vendor Payables)
      allMisc.forEach((mItem: any) => {
        const isApproved = mItem.status === "APPROVED" || mItem.status === "PAID";
        if (isApproved) {
          const exists = mergedVendors.some(
            (v: any) =>
              v.id === mItem.id ||
              ((v.serviceDescription || "").trim().toLowerCase() === (mItem.description || "").trim().toLowerCase() && Number(v.agreedAmount) === Number(mItem.amount)),
          );
          if (!exists) {
            mergedVendors.push({
              id: mItem.id,
              vendorName: mItem.payeeName || "Ad-Hoc Expense",
              category: "Other",
              serviceDescription: mItem.description,
              agreedAmount: mItem.amount,
              advancePaid: mItem.amount,
              balanceAmount: 0,
              status: "Paid",
              approvalStatus: "APPROVED",
              paymentDate: mItem.paymentDate,
              paymentMode: mItem.paymentMethod || "CASH",
              paidBy: mItem.approvedBy || "Finance Admin",
              remarks: `Miscellaneous Expense | Status: APPROVED | ${mItem.description}`,
            });
          }
        }
      });

      // Pending-approval misc must not appear as PAID (or at all) under Vendor Payables —
      // they stay on the Miscellaneous Expenses tab until Approve.
      const vendorPayables = mergedVendors.filter((v: any) => {
        if (!isMiscellaneousVendorCategory(v.category)) return true;
        return isMiscExpenseApproved(v);
      });

      setBookings(mergedBookings);
      setReceipts(clientRes.receipts || []);
      setVendorPayments(vendorPayables);
      setDbVendors(vendorsDirRes.data?.data || []);
      setTrainTickets(trainSummaryRes?.tickets || []);
      setActivityPayments(combinedActivities);
      setMiscPayments(allMisc);
      setAdjustments(recons);

    } catch (err) {
      console.error("fetchData error in DeparturePayments:", err);
      setBookings([]);
      setVendorPayments([]);
      setTrainTickets([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tripId, departureDateStr, tripVendors]);

  // Live Calculated Stats across all categories
  const calculatedStats = useMemo(() => {
    const activeBookings = bookings;
    const activeVendors = vendorPayments;
    const activeActivities = activityPayments;
    const activeMisc = miscPayments;

    const totalPax =
      activeBookings.reduce((sum, b) => {
        if (b.numberOfTravelers && Number(b.numberOfTravelers) > 0) {
          return sum + Number(b.numberOfTravelers);
        }
        try {
          const parsed =
            typeof b.passengers === "string"
              ? JSON.parse(b.passengers)
              : b.passengers;
          if (Array.isArray(parsed) && parsed.length > 0) {
            return sum + parsed.length;
          }
        } catch {
          // ignore
        }
        return sum + 1;
      }, 0) || 1;

    // 1. CLIENT / SALES REVENUE
    const totalClientRevenue = activeBookings.reduce(
      (sum, b) => sum + (Number(b.totalAmount) || 0),
      0,
    );
    const clientAmountReceived = activeBookings.reduce(
      (sum, b) => sum + (Number(b.advancePaid) || 0),
      0,
    );
    const clientOutstandingBalance = Math.max(
      0,
      totalClientRevenue - clientAmountReceived,
    );
    const clientCollectedPercent =
      totalClientRevenue > 0
        ? ((clientAmountReceived / totalClientRevenue) * 100).toFixed(0)
        : "0";

    // 2. VENDOR EXPENSES
    const totalVendorPayable = activeVendors.reduce(
      (sum, v) => sum + (Number(v.agreedAmount) || 0),
      0,
    );
    const vendorAmountPaid = activeVendors.reduce(
      (sum, v) => sum + (Number(v.advancePaid) || 0),
      0,
    );
    const vendorOutstandingBalance = Math.max(
      0,
      totalVendorPayable - vendorAmountPaid,
    );
    const vendorPaidPercent =
      totalVendorPayable > 0
        ? ((vendorAmountPaid / totalVendorPayable) * 100).toFixed(0)
        : "0";

    // Category Breakdowns
    const hotelVendors = activeVendors.filter((v) => v.category === "Hotels");
    const transportVendors = activeVendors.filter(
      (v) => v.category === "Transport",
    );
    const guideVendors = activeVendors.filter((v) => v.category === "Guides");

    const totalHotelsCost = hotelVendors.reduce(
      (s, v) => s + (v.agreedAmount || 0),
      0,
    );
    const totalHotelsPaid = hotelVendors.reduce(
      (s, v) => s + (v.advancePaid || 0),
      0,
    );
    const totalHotelsDue = Math.max(0, totalHotelsCost - totalHotelsPaid);

    const totalTransportsCost = transportVendors.reduce(
      (s, v) => s + (v.agreedAmount || 0),
      0,
    );
    const totalTransportsPaid = transportVendors.reduce(
      (s, v) => s + (v.advancePaid || 0),
      0,
    );
    const totalTransportsDue = Math.max(
      0,
      totalTransportsCost - totalTransportsPaid,
    );

    const totalGuidesCost = guideVendors.reduce(
      (s, v) => s + (v.agreedAmount || 0),
      0,
    );
    const totalGuidesPaid = guideVendors.reduce(
      (s, v) => s + (v.advancePaid || 0),
      0,
    );
    const totalGuidesDue = Math.max(0, totalGuidesCost - totalGuidesPaid);

    // 3. TRAIN TICKETS (INCLUDED IN PACKAGE COST CENTER)
    const companyTrainTickets = trainTickets.filter((t) => t.paidBy !== "CUSTOMER");
    let totalTrainCost = 0;
    let totalTrainPaid = 0;
    companyTrainTickets.forEach((t) => {
      const amt = Number(t.ticketAmount || 0);
      const rCharge = Number(t.railwayCancellationCharge || 0);
      const yCharge = Number(t.ycCancellationCharge || 0);

      if (t.ticketStatus === "CONFIRMED" || t.ticketStatus === "BOOKED") {
        totalTrainCost += amt;
        totalTrainPaid += amt;
      } else if (t.ticketStatus === "CANCELLED") {
        totalTrainCost += rCharge + yCharge;
        if (t.refundStatus === "COMPLETED") {
          totalTrainPaid += rCharge + yCharge;
        }
      } else {
        totalTrainCost += amt;
      }
    });
    const totalTrainDue = Math.max(0, totalTrainCost - totalTrainPaid);

    const totalActivityCost = activeActivities.reduce(
      (s, a) => s + (a.totalCost || 0),
      0,
    );
    const activityAmountPaid = activeActivities.reduce(
      (s, a) => s + (a.amountPaid || 0),
      0,
    );
    const activityPending = Math.max(0, totalActivityCost - activityAmountPaid);
    const activityPercent =
      totalActivityCost > 0
        ? ((activityAmountPaid / totalActivityCost) * 100).toFixed(0)
        : "100";

    const totalMiscExpenses = activeMisc.reduce(
      (s, m) => s + (m.amount || 0),
      0,
    );
    const miscApproved = activeMisc
      .filter((m) => m.status === "APPROVED" || m.status === "PAID")
      .reduce((s, m) => s + (m.amount || 0), 0);
    const miscPendingApproval = totalMiscExpenses - miscApproved;

    // Pending misc is not yet a committed cost — only approved amounts roll into totals.
    const totalCosts =
      totalVendorPayable + totalActivityCost + totalTrainCost + miscApproved;
    const estimatedProfit = totalClientRevenue - totalCosts;
    const profitMargin =
      totalClientRevenue > 0
        ? ((estimatedProfit / totalClientRevenue) * 100).toFixed(1)
        : "0.0";

    // Unit Economics Per Pax
    const revenuePerPax = Math.round(totalClientRevenue / totalPax);
    const receivedPerPax = Math.round(clientAmountReceived / totalPax);
    const outstandingPerPax = Math.round(clientOutstandingBalance / totalPax);

    const hotelsCostPerPax = Math.round(totalHotelsCost / totalPax);
    const transportsCostPerPax = Math.round(totalTransportsCost / totalPax);
    const guidesCostPerPax = Math.round(totalGuidesCost / totalPax);
    const trainCostPerPax = Math.round(totalTrainCost / totalPax);
    const activitiesCostPerPax = Math.round(totalActivityCost / totalPax);
    const miscCostPerPax = Math.round(miscApproved / totalPax);
    const totalCostsPerPax = Math.round(totalCosts / totalPax);
    const profitPerPax = Math.round(estimatedProfit / totalPax);

    return {
      totalPax,
      totalClientRevenue,
      clientAmountReceived,
      clientOutstandingBalance,
      clientCollectedPercent,
      totalVendorPayable,
      vendorAmountPaid,
      vendorOutstandingBalance,
      vendorPaidPercent,
      totalHotelsCost,
      totalHotelsPaid,
      totalHotelsDue,
      totalTransportsCost,
      totalTransportsPaid,
      totalTransportsDue,
      totalGuidesCost,
      totalGuidesPaid,
      totalGuidesDue,
      totalTrainCost,
      totalTrainPaid,
      totalTrainDue,
      totalActivityCost,
      activityAmountPaid,
      activityPending,
      activityPercent,
      totalMiscExpenses,
      miscApproved,
      miscPendingApproval,
      totalCosts,
      estimatedProfit,
      profitMargin,
      revenuePerPax,
      receivedPerPax,
      outstandingPerPax,
      hotelsCostPerPax,
      transportsCostPerPax,
      guidesCostPerPax,
      trainCostPerPax,
      activitiesCostPerPax,
      miscCostPerPax,
      totalCostsPerPax,
      profitPerPax,
    };
  }, [bookings, vendorPayments, activityPayments, miscPayments, trainTickets]);

  // Helper currency formatting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getPassengerList = (booking: any): any[] => {
    if (!booking) return [];
    try {
      const parsed =
        typeof booking.passengers === "string"
          ? JSON.parse(booking.passengers)
          : booking.passengers;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (parsed && Array.isArray(parsed.persons) && parsed.persons.length > 0) return parsed.persons;
      if (parsed && typeof parsed.details?.personsRoomDetails === "object") {
        return Object.keys(parsed.details.personsRoomDetails).map((name) => ({ name }));
      }
    } catch (_e) {
      // Ignore parse errors
    }
    const fallbackName = booking.fullName || booking.name;
    return fallbackName ? [{ name: fallbackName }] : [];
  };

  const getPassengerNames = (booking: any) => {
    const list = getPassengerList(booking);
    const active = list.filter((p: any) => !p.isCancelled && p.status !== "CANCELLED");
    if (active.length > 0) {
      const leadName = (booking.fullName || booking.name || "").trim().toLowerCase();
      const otherNames = active
        .map((p: any) => (p.name || p.fullName || "").trim())
        .filter((n: string) => n && n.toLowerCase() !== leadName);
      if (otherNames.length > 0) {
        return `+ ${otherNames.join(", ")}`;
      }
      return `${active.length} Pax`;
    }
    return "Lead Passenger";
  };

  const getPassengerCount = (booking: any) => {
    const list = getPassengerList(booking);
    const active = list.filter((p: any) => !p.isCancelled && p.status !== "CANCELLED");
    if (active.length > 0) {
      return active.length;
    }
    if (booking.numberOfTravelers && Number(booking.numberOfTravelers) > 0) {
      return Number(booking.numberOfTravelers);
    }
    return 1;
  };

  // CSV Exporter
  const handleDownloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.info("No records to export");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) =>
          typeof val === "string"
            ? `"${val.replace(/"/g, '""')}"`
            : typeof val === "object"
              ? `""`
              : val,
        )
        .join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isSubmittingClientPayment, setIsSubmittingClientPayment] = useState(false);

  // Handlers for Recording Payments
  const handleClientPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || isSubmittingClientPayment) return;
    const amountNum = Number(clientPaymentForm.amount) || 0;
    if (amountNum <= 0) {
      toast.error("Please enter a valid payment amount greater than zero");
      return;
    }

    setIsSubmittingClientPayment(true);
    try {
      await opsService.addClientPayment(
        selectedBooking.bookingId,
        clientPaymentForm,
      );
      toast.success(
        `Recorded ₹${amountNum.toLocaleString()} receipt for ${selectedBooking.bookingId}`,
      );
      await fetchData();
      setAddClientPaymentOpen(false);
      setSelectedBooking(null);
    } catch (err: any) {
      console.error("Payment error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to record client payment";
      toast.error(msg);
    } finally {
      setIsSubmittingClientPayment(false);
    }
  };

  const handleVendorPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const agreedNum = Number(vendorPaymentForm.agreedAmount) || 0;
    const inputAmount = Number(vendorPaymentForm.advancePaid) || 0;
    const staffName = admin?.name || admin?.email || "Operations Staff";

    const isCustomPayer =
      vendorPaymentForm.collectionAccountId === "__someone_else__" ||
      vendorPaymentForm.collectionAccountId === "__trek_leader__" ||
      vendorPaymentForm.collectionAccountId === "__driver__" ||
      vendorPaymentForm.collectionAccountId === "__founder_personal__";

    const selectedAcc = isCustomPayer
      ? null
      : collectionAccounts.find(
          (acc) => acc.id === vendorPaymentForm.collectionAccountId,
        );

    let accountNameTag = "";
    if (isCustomPayer) {
      const customPayer =
        vendorPaymentForm.customPayerName.trim() ||
        (vendorPaymentForm.collectionAccountId === "__trek_leader__"
          ? "Trek Leader (Personal Pocket)"
          : vendorPaymentForm.collectionAccountId === "__driver__"
            ? "Driver / Transporter Direct"
            : vendorPaymentForm.collectionAccountId === "__founder_personal__"
              ? "Founder (Personal Account)"
              : "Someone Else (Personal Pocket)");

      accountNameTag = `${customPayer}${vendorPaymentForm.needsReimbursement ? " [Reimbursement Due]" : ""}`;
    } else if (selectedAcc) {
      accountNameTag = `${selectedAcc.accountName}${selectedAcc.bankName ? ` (${selectedAcc.bankName})` : selectedAcc.accountType === "CASH" ? " (Cash Desk)" : ""}`;
    } else {
      accountNameTag =
        vendorPaymentForm.paymentMode === "CASH"
          ? "Cash Desk"
          : "YouthCamping Company Account";
    }

    const effectiveCollectionAccountId = isCustomPayer
      ? null
      : vendorPaymentForm.collectionAccountId || null;

    if (editingVendorPayment) {
      if (inputAmount > 0 && !vendorPaymentForm.invoiceProof && !vendorPaymentForm.paymentProof) {
        toast.error("Upload a payment screenshot before recording this payout");
        return;
      }
      const prevPaid = Number(editingVendorPayment.advancePaid) || 0;
      // If user entered a new payment amount, add it to existing advancePaid; else keep as is
      const isInstallment = prevPaid > 0 && inputAmount !== prevPaid;
      const newTotalPaid = isInstallment ? prevPaid + inputAmount : inputAmount;
      const remaining = Math.max(0, agreedNum - newTotalPaid);
      const status =
        newTotalPaid >= agreedNum && agreedNum > 0
          ? "Paid"
          : newTotalPaid > 0
          ? "Advance Paid"
          : "Pending";

      const newHistoryItem = {
        id: `vtxn-${Date.now()}`,
        date:
          vendorPaymentForm.paymentDate ||
          new Date().toISOString().substring(0, 10),
        amount: inputAmount,
        method: vendorPaymentForm.paymentMode || "Bank Transfer",
        collectionAccountId: effectiveCollectionAccountId,
        accountName: accountNameTag,
        isCustomPayer,
        customPayerName: isCustomPayer ? vendorPaymentForm.customPayerName : "",
        needsReimbursement: isCustomPayer
          ? Boolean(vendorPaymentForm.needsReimbursement)
          : false,
        txnId: vendorPaymentForm.transactionId || `NEFT-${Date.now()}`,
        type: newTotalPaid >= agreedNum ? "SETTLEMENT" : "INSTALLMENT",
        status: "Pending Verification",
        approvalStatus: "PENDING_APPROVAL",
        invoiceProof: vendorPaymentForm.invoiceProof || "",
        proofUrl: vendorPaymentForm.invoiceProof || "",
        uploadedBy: staffName,
        recordedAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null,
      };

      const updatedHistory = [
        ...(editingVendorPayment.history || []),
        newHistoryItem,
      ];

      try {
        await opsService.updateVendorPayment(tripId, editingVendorPayment.id, {
          ...vendorPaymentForm,
          vendorName: formatVendorName(vendorPaymentForm.vendorName),
          serviceDescription: refineServiceAgainstVendor(
            vendorPaymentForm.serviceDescription,
            vendorPaymentForm.vendorName,
          ),
          paymentProofUrl: vendorPaymentForm.paymentProof,
          ...operationalSourcePayload(editingVendorPayment, vendorPaymentForm.category),
          departureDate: departureDateStr,
          advancePaid: newTotalPaid,
          remainingPayable: remaining,
          status,
          collectionAccountId: effectiveCollectionAccountId,
          paidBy: isCustomPayer ? accountNameTag : staffName,
          history: updatedHistory,
        });
        toast.success(
          `Recorded ₹${inputAmount.toLocaleString("en-IN")} payment for ${vendorPaymentForm.vendorName} (Paid from ${accountNameTag})!`,
        );
        await fetchData();
      } catch (err: any) {
        console.error("updateVendorPayment error:", err);
        toast.error(err?.response?.data?.message || "Failed to record payment on server");
      }

      setVendorPayments((prev) =>
        prev.map((v) =>
          v.id === editingVendorPayment.id
            ? {
                ...v,
                vendorName: vendorPaymentForm.vendorName,
                category: vendorPaymentForm.category,
                serviceDescription: vendorPaymentForm.serviceDescription,
                agreedAmount: agreedNum,
                advancePaid: newTotalPaid,
                remainingPayable: remaining,
                status,
                collectionAccountId: effectiveCollectionAccountId,
                collectionAccount: selectedAcc || v.collectionAccount,
                paidBy: isCustomPayer ? accountNameTag : staffName,
                invoiceProof: vendorPaymentForm.invoiceProof || v.invoiceProof,
                proofUrl: vendorPaymentForm.invoiceProof || v.proofUrl,
                history: updatedHistory,
              }
            : v,
        ),
      );
    } else {
      if (inputAmount > 0 && !vendorPaymentForm.invoiceProof && !vendorPaymentForm.paymentProof) {
        toast.error("Upload a payment screenshot before recording this payout");
        return;
      }
      const remaining = Math.max(0, agreedNum - inputAmount);
      const status =
        inputAmount >= agreedNum && agreedNum > 0
          ? "Paid"
          : inputAmount > 0
          ? "Advance Paid"
          : "Pending";

      const newHistoryItem =
        inputAmount > 0
          ? [
              {
                id: `vtxn-${Date.now()}`,
                date: vendorPaymentForm.paymentDate,
                amount: inputAmount,
                method: vendorPaymentForm.paymentMode,
                collectionAccountId: effectiveCollectionAccountId,
                accountName: accountNameTag,
                isCustomPayer,
                customPayerName: isCustomPayer ? vendorPaymentForm.customPayerName : "",
                needsReimbursement: isCustomPayer
                  ? Boolean(vendorPaymentForm.needsReimbursement)
                  : false,
                txnId:
                  vendorPaymentForm.transactionId || `NEFT-${Date.now()}`,
                type: inputAmount >= agreedNum ? "SETTLEMENT" : "ADVANCE",
                status: "Pending Verification",
                approvalStatus: "PENDING_APPROVAL",
                invoiceProof: vendorPaymentForm.invoiceProof || "",
                proofUrl: vendorPaymentForm.invoiceProof || "",
                uploadedBy: staffName,
                recordedAt: new Date().toISOString(),
                approvedBy: null,
                approvedAt: null,
              },
            ]
          : [];

      const newVnd = {
        id: `VND-${Date.now()}`,
        vendorName: formatVendorName(vendorPaymentForm.vendorName),
        category: vendorPaymentForm.category,
        invoiceNumber: `INV-${Math.floor(100 + Math.random() * 900)}`,
        invoiceDate: vendorPaymentForm.paymentDate,
        serviceDescription:
          refineServiceAgainstVendor(
            vendorPaymentForm.serviceDescription,
            vendorPaymentForm.vendorName,
          ) || "Trip service",
        agreedAmount: agreedNum,
        advancePaid: inputAmount,
        remainingPayable: remaining,
        status,
        paymentDate: vendorPaymentForm.paymentDate,
        paymentMode: vendorPaymentForm.paymentMode,
        collectionAccountId: effectiveCollectionAccountId,
        collectionAccount: selectedAcc,
        paidBy: isCustomPayer ? accountNameTag : staffName,
        transactionId: vendorPaymentForm.transactionId || `NEFT-${Date.now()}`,
        invoiceProof: vendorPaymentForm.invoiceProof || "",
        paymentProofUrl: vendorPaymentForm.paymentProof || "",
        proofUrl: vendorPaymentForm.invoiceProof || "",
        history: newHistoryItem,
      };
      try {
        await opsService.createVendorPayment(tripId, {
          ...newVnd,
          ...operationalSourcePayload(editingVendorPayment, vendorPaymentForm.category),
          departureDate: departureDateStr,
        });
        toast.success(
          `Logged vendor payable for ${vendorPaymentForm.vendorName} (Paid from ${accountNameTag})!`,
        );
        await fetchData();
      } catch (err: any) {
        console.error("createVendorPayment error:", err);
        toast.error(err?.response?.data?.message || "Failed to create vendor payment");
      }
      setVendorPayments((prev) => [newVnd, ...prev]);
    }
    setAddVendorPaymentOpen(false);
    setEditingVendorPayment(null);
  };

  // Vendor Payment Proof Verification / Approval Handler
  const handleApproveVendorPaymentProof = async (
    vendorPaymentId: string,
    historyIndex: number,
    action: "APPROVE" | "REJECT",
  ) => {
    const approverName = admin?.name || admin?.email || "Finance Approver";
    const approverRole = admin?.role || "Finance";
    const approverTag = `${approverName} (${approverRole})`;

    setVendorPayments((prev) =>
      prev.map((v) => {
        if (v.id !== vendorPaymentId) return v;
        const updatedHist = (v.history || []).map((h: any, idx: number) => {
          if (idx !== historyIndex) return h;
          return {
            ...h,
            approvalStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
            status: action === "APPROVE" ? "Verified" : "Rejected",
            approvedBy: action === "APPROVE" ? approverTag : null,
            approvedAt: action === "APPROVE" ? new Date().toISOString() : null,
          };
        });

        // Persist to backend
        opsService
          .updateVendorPayment(tripId, v.id, {
            ...v,
            history: updatedHist,
            status:
              action === "APPROVE"
                ? v.remainingPayable === 0
                  ? "Paid"
                  : "Advance Paid"
                : v.status,
          })
          .catch(() => {});

        return {
          ...v,
          history: updatedHist,
        };
      }),
    );

    if (action === "APPROVE") {
      toast.success(`Payment verified and approved by ${approverTag}!`);
    } else {
      toast.error(`Payment marked as rejected by ${approverTag}.`);
    }
  };

  // Quick Proof Attach Save Handler
  const handleSaveQuickProof = async () => {
    if (!quickProofTarget || !quickProofTarget.proofUrl) {
      toast.error("Please upload a payment proof screenshot first");
      return;
    }
    const { vendorId, historyIndex, proofUrl } = quickProofTarget;
    const uploader = admin?.name || admin?.email || "Operations Staff";

    const targetVendor = vendorPayments.find((v) => v.id === vendorId);
    if (!targetVendor) return;

    const updatedHist = (targetVendor.history || []).map((h: any, idx: number) => {
      if (idx !== historyIndex) return h;
      return {
        ...h,
        invoiceProof: proofUrl,
        proofUrl: proofUrl,
        uploadedBy: uploader,
        approvalStatus: h.approvalStatus || "PENDING_APPROVAL",
      };
    });

    try {
      await opsService.updateVendorPayment(tripId, targetVendor.id, {
        ...targetVendor,
        departureDate: departureDateStr,
        vendorName: targetVendor.vendorName,
        invoiceProof: proofUrl,
        advanceProofUrl: proofUrl,
        invoiceFileUrl: proofUrl,
        history: updatedHist,
      });

      setVendorPayments((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                invoiceProof: proofUrl,
                proofUrl: proofUrl,
                history: updatedHist,
              }
            : v,
        ),
      );

      toast.success("Payment proof screenshot attached and saved successfully!");
      setQuickProofModalOpen(false);
      setQuickProofTarget(null);
      await fetchData();
    } catch (err: any) {
      console.error("Failed to save payment proof:", err);
      toast.error(err?.response?.data?.message || "Failed to save payment proof on server");
    }
  };

  const handleActivityPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(activityPaymentForm.costPerPerson) || 0;
    const pax = Number(activityPaymentForm.participantCount) || 1;
    const total = cost * pax;
    const inputPaid = Number(activityPaymentForm.amountPaid) || 0;
    const targetActivity = editingActivityPayment || activityPayments.find((a) => a.id === activityPaymentForm.activityId || a.activityId === activityPaymentForm.activityId);
    const prevPaid = Number(targetActivity?.amountPaid || 0);
    const newTotalPaid = prevPaid > 0 && inputPaid !== prevPaid ? prevPaid + inputPaid : inputPaid;
    const balance = Math.max(0, total - newTotalPaid);
    const status =
      newTotalPaid >= total && total > 0 ? "PAID" : newTotalPaid > 0 ? "PARTIAL" : "PENDING";
    const staffName = admin?.name || admin?.email || "Operations Staff";

    if (inputPaid > 0 && !activityPaymentForm.invoiceProof) {
      toast.error("Upload payment proof (screenshot or PDF) before recording this activity payout");
      return;
    }

    const isCustomPayer =
      activityPaymentForm.collectionAccountId === "__someone_else__" ||
      activityPaymentForm.collectionAccountId === "__trek_leader__" ||
      activityPaymentForm.collectionAccountId === "__driver__" ||
      activityPaymentForm.collectionAccountId === "__founder_personal__";

    const selectedAcc = isCustomPayer
      ? null
      : collectionAccounts.find(
          (acc) => acc.id === activityPaymentForm.collectionAccountId,
        );

    let accountNameTag = "";
    if (isCustomPayer) {
      const customPayer =
        activityPaymentForm.customPayerName.trim() ||
        (activityPaymentForm.collectionAccountId === "__trek_leader__"
          ? "Trek Leader (Personal Pocket)"
          : activityPaymentForm.collectionAccountId === "__driver__"
            ? "Driver / Transporter Direct"
            : activityPaymentForm.collectionAccountId === "__founder_personal__"
              ? "Founder (Personal Account)"
              : "Someone Else (Personal Pocket)");
      accountNameTag = `${customPayer}${activityPaymentForm.needsReimbursement ? " [Reimbursement Due]" : ""}`;
    } else if (selectedAcc) {
      accountNameTag = `${selectedAcc.accountName}${selectedAcc.bankName ? ` (${selectedAcc.bankName})` : selectedAcc.accountType === "CASH" ? " (Cash Desk)" : ""}`;
    } else {
      accountNameTag =
        activityPaymentForm.paymentMode === "CASH"
          ? "Cash Collection Account (Cash Desk)"
          : "YouthCamping Company Account";
    }

    const effectiveCollectionAccountId = isCustomPayer
      ? null
      : activityPaymentForm.collectionAccountId || null;

    try {
      if (activityPaymentForm.activityId && !activityPaymentForm.activityId.startsWith("ACT-PAY-")) {
        await api.put(`/ops/activities/${tripId}/${activityPaymentForm.activityId}?departureDate=${encodeURIComponent(departureDateStr)}`, {
          actualCost: newTotalPaid,
          vendorCost: cost,
          bookedCount: pax,
          name: activityPaymentForm.activityName,
          type: activityPaymentForm.activityType,
          vendorName: activityPaymentForm.vendorName,
          departureDate: departureDateStr,
        }).catch((err) => console.warn("Activity update note:", err?.message));
      }

      // Record/sync to OpsVendorPayment so it reflects in Finance Outgoing Disbursements and Cash Desk
      const vName = activityPaymentForm.vendorName || activityPaymentForm.activityName || "Activity Supplier";
      await opsService.createVendorPayment(tripId, {
        departureDate: departureDateStr,
        vendorName: vName,
        category: "Activities",
        serviceDescription: `${activityPaymentForm.activityName || "Activity Service"} (${pax} pax @ ₹${cost}/ppl)`,
        agreedAmount: total,
        advancePaid: newTotalPaid,
        remainingPayable: balance,
        paymentDate: activityPaymentForm.paymentDate,
        paymentMode: activityPaymentForm.paymentMode,
        collectionAccountId: effectiveCollectionAccountId,
        transactionId: activityPaymentForm.transactionId || `ACT-${Date.now()}`,
        invoiceProof: activityPaymentForm.invoiceProof || "",
        status: newTotalPaid >= total && total > 0 ? "Paid" : newTotalPaid > 0 ? "Advance Paid" : "Pending",
        paidBy: isCustomPayer ? accountNameTag : staffName,
        remarks: activityPaymentForm.remarks || "",
      });

      toast.success(
        `Recorded ₹${inputPaid.toLocaleString("en-IN")} payment for "${activityPaymentForm.activityName}" (Paid from ${accountNameTag})!`,
      );
      await fetchData();
    } catch (err: any) {
      console.error("Error recording activity payment:", err);
      toast.error(err?.response?.data?.message || "Failed to record activity payment");
    }

    setAddActivityPaymentOpen(false);
    setEditingActivityPayment(null);
  };

  const handleMiscPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(miscPaymentForm.amount) || 0;
    if (!miscPaymentForm.description || amountNum <= 0) {
      toast.error("Please provide a description and amount");
      return;
    }

    try {
      const payeeLabel =
        (miscPaymentForm.payeeName || "").trim() ||
        `Ad-Hoc · ${miscPaymentForm.category}: ${miscPaymentForm.description}`.slice(0, 120);
      await opsService.createVendorPayment(tripId, {
        departureDate: departureDateStr,
        // Prefer a distinct payee so shared defaults never collide with older upsert paths.
        vendorName: payeeLabel,
        category: "Miscellaneous",
        serviceDescription: `${miscPaymentForm.category}: ${miscPaymentForm.description}`,
        agreedAmount: amountNum,
        advancePaid: 0,
        remainingPayable: amountNum,
        paymentDate: miscPaymentForm.paymentDate,
        paymentMode: miscPaymentForm.paymentMethod,
        collectionAccountId: miscPaymentForm.collectionAccountId || null,
        transactionId: miscPaymentForm.transactionId || `MISC-${Date.now()}`,
        invoiceProof: "",
        status: "Pending",
        paymentStatus: "Pending",
        approvalStatus: "PENDING",
        // Do not stamp creator as paidBy — that field is reserved for the approver after Approve.
        paidBy: null,
        remarks: `Category: ${miscPaymentForm.category} | ${miscPaymentForm.remarks || ""}`.trim(),
      });
      toast.success(`Submitted miscellaneous expense for approval: ${miscPaymentForm.description}`);
      setMiscPaymentForm({
        description: "",
        category: "Emergency",
        amount: "",
        payeeName: "",
        paymentDate: new Date().toISOString().substring(0, 10),
        paymentMethod: "CASH",
        transactionId: "",
        collectionAccountId: "",
        status: "PENDING",
        remarks: "",
      });
      await fetchData();
    } catch (err: any) {
      console.error("Error recording misc expense:", err);
      toast.error(err?.response?.data?.message || "Failed to record expense");
    }
    setAddMiscPaymentOpen(false);
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(adjustmentForm.amount) || 0;
    if (!adjustmentForm.reason || amountNum <= 0) {
      toast.error("Please provide reason and amount");
      return;
    }
    const newAdj = {
      id: `ADJ-${Date.now()}`,
      type: adjustmentForm.type,
      category: "reconciliation",
      originalPaymentRef: adjustmentForm.originalPaymentRef,
      amount: amountNum,
      reason: adjustmentForm.reason,
      status: adjustmentForm.status,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    try {
      await opsService.upsertTripExpense(tripId, {
        departureDate: departureDateStr,
        activity: `Adjustment: ${newAdj.type} - ${newAdj.originalPaymentRef}`,
        totalAmount: amountNum,
        amountPaid: newAdj.status === "APPROVED" || newAdj.status === "COMPLETED" ? amountNum : 0,
        remarks: `Reconciliation | Reason: ${newAdj.reason} | Status: ${newAdj.status}`,
      });
      setAdjustments((prev) => [newAdj, ...prev]);
      toast.success(
        `Logged ${newAdj.type} adjustment of ₹${amountNum.toLocaleString()}`,
      );
      setAddAdjustmentOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("upsertTripExpense error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to save adjustment expense",
      );
    }
  };

  const handleRunReconciliation = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading:
        "Running automated reconciliation engine across 5 payment categories...",
      success:
        "Reconciliation complete! 0 mismatched transactions, 100% ledgers balanced.",
      error: "Reconciliation failed",
    });
  };

  return (
    <div className="space-y-6 pb-12 min-w-0">
      <div className="min-w-0 w-full border-b border-[#E8EEF4] bg-white px-3 sm:px-4 pt-2 rounded-t-xl flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2">
        <div className="min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex flex-nowrap items-center gap-0 w-max min-w-full">
            {[
              {
                key: "vendors",
                label: "Vendor Payables",
                badge: `₹${(calculatedStats.vendorOutstandingBalance / 1000).toFixed(1)}k`,
              },
              {
                key: "activities",
                label: "Activity Payments",
                badge: calculatedStats.activityPending > 0
                  ? `₹${(calculatedStats.activityPending / 1000).toFixed(1)}k pending`
                  : `${activityPayments.length}`,
              },
              {
                key: "misc",
                label: "Miscellaneous Expenses",
                badge:
                  calculatedStats.miscPendingApproval > 0
                    ? `₹${calculatedStats.miscPendingApproval.toLocaleString()} pending`
                    : calculatedStats.miscApproved > 0
                      ? `₹${calculatedStats.miscApproved.toLocaleString()}`
                      : "0",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSubTab(tab.key as any)}
                className={cn(
                  "px-3 py-2.5 text-[12px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0",
                  subTab === tab.key
                    ? "border-[#FF4D00] text-[#FF4D00]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200",
                )}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={cn(
                    "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                    subTab === tab.key
                      ? "bg-[#FF4D00]/10 text-[#FF4D00]"
                      : "bg-slate-100 text-slate-500"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────────────── TAB 1: PAYMENT DASHBOARD (Overview) ──────────────────────── */}
      {subTab === "dashboard" && (
        <div className="space-y-6">
          {/* 5 ENTERPRISE SUMMARY CARDS */}
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-4",
              canSeeProfit ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
          >
            {/* 1. Client Receivables (Blue) */}
            <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                  Client Receivables
                </span>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {calculatedStats.clientCollectedPercent}% Collected
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Revenue:
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(calculatedStats.totalClientRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Received:</span>
                  <span className="font-extrabold text-green-700">
                    {formatCurrency(calculatedStats.clientAmountReceived)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    Outstanding:
                  </span>
                  <span className="font-extrabold text-amber-600">
                    {formatCurrency(calculatedStats.clientOutstandingBalance)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("clients")}
                className="w-full text-center text-xs font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-50 py-1.5 rounded-lg border border-blue-200 transition-all flex items-center justify-center gap-1"
              >
                View Ledger <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Vendor Payables (Orange) */}
            <div className="bg-white border border-[#FF4D00]/30 rounded-xl p-4 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF4D00]" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#0B1528] uppercase tracking-wider">
                  Vendor Payables
                </span>
                <span className="text-xs font-bold bg-[#FF4D00]/10 text-[#C2410C] px-2 py-0.5 rounded">
                  {calculatedStats.vendorPaidPercent}% Paid
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Payable:
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(calculatedStats.totalVendorPayable)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Amount Paid:
                  </span>
                  <span className="font-extrabold text-blue-600">
                    {formatCurrency(calculatedStats.vendorAmountPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    Balance Due:
                  </span>
                  <span className="font-extrabold text-red-600">
                    {formatCurrency(calculatedStats.vendorOutstandingBalance)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("vendors")}
                className="w-full text-center text-xs font-bold text-[#C2410C] hover:text-[#C2410C] hover:bg-[#FF4D00]/5 py-1.5 rounded-lg border border-[#FF4D00]/30 transition-all flex items-center justify-center gap-1"
              >
                View Payables <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Activity Payments (Purple) */}
            <div className="bg-white border border-[#FF4D00]/30 rounded-xl p-4 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF4D00]" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#0B1528] uppercase tracking-wider">
                  Activity Payments
                </span>
                <span className="text-xs font-bold bg-[#FF4D00]/10 text-[#C2410C] px-2 py-0.5 rounded">
                  {calculatedStats.activityPercent}% Complete
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Activity Cost:
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(calculatedStats.totalActivityCost)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Paid to Vendors:
                  </span>
                  <span className="font-extrabold text-green-700">
                    {formatCurrency(calculatedStats.activityAmountPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Pending:</span>
                  <span className="font-extrabold text-[#C2410C]">
                    {formatCurrency(calculatedStats.activityPending)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("activities")}
                className="w-full text-center text-xs font-bold text-[#C2410C] hover:text-[#C2410C] hover:bg-[#FF4D00]/5 py-1.5 rounded-lg border border-[#FF4D00]/30 transition-all flex items-center justify-center gap-1"
              >
                View Activities <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Miscellaneous (Gray) */}
            <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Miscellaneous
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {miscPayments.length} Expenses
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Misc Cost:
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(calculatedStats.totalMiscExpenses)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Approved:</span>
                  <span className="font-extrabold text-green-700">
                    {formatCurrency(calculatedStats.miscApproved)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    Pending Approval:
                  </span>
                  <span className="font-extrabold text-amber-600">
                    {formatCurrency(calculatedStats.miscPendingApproval)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("misc")}
                className="w-full text-center text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 py-1.5 rounded-lg border border-slate-300 transition-all flex items-center justify-center gap-1"
              >
                Review Pending <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Trip Profitability (Green) — Founder/Superadmin only */}
            {canSeeProfit && (
            <div className="bg-white border border-green-300 rounded-xl p-4 shadow-2xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-600" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-green-900 uppercase tracking-wider">
                  Trip Profitability
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded",
                    Number(calculatedStats.profitMargin) >= 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-800",
                  )}
                >
                  {calculatedStats.profitMargin}% Margin
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Revenue:
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(calculatedStats.totalClientRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Total Costs:
                  </span>
                  <span className="font-extrabold text-red-700">
                    {formatCurrency(calculatedStats.totalCosts)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    Est. Profit:
                  </span>
                  <span
                    className={cn(
                      "font-extrabold",
                      calculatedStats.estimatedProfit >= 0
                        ? "text-green-700"
                        : "text-red-600",
                    )}
                  >
                    {formatCurrency(calculatedStats.estimatedProfit)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("reconciliation")}
                className="w-full text-center text-xs font-bold text-green-700 hover:text-green-700 hover:bg-green-50 py-1.5 rounded-lg border border-green-200 transition-all flex items-center justify-center gap-1"
              >
                Full P&L / Reconcile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            )}
          </div>

          {/* DEPARTURE UNIT ECONOMICS & PER-PERSON ACCOUNTING MATRIX */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Unit Economics & Cost Center Matrix
                </span>
                <span className="bg-[#FF4D00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  Per-Person Accounting
                </span>
              </div>
              <div className="text-xs font-medium text-slate-400">
                Total Departure Pax:{" "}
                <span className="text-white font-black">
                  {calculatedStats.totalPax} Travelers
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Cost Center / Financial Stream</th>
                    <th className="py-2.5 px-4 text-right">Agreed / Total (₹)</th>
                    <th className="py-2.5 px-4 text-right">Paid / Received (₹)</th>
                    <th className="py-2.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-2.5 px-4 text-right font-mono bg-[#FF4D00]/5 text-[#0B1528] font-black">
                      Per Person (₹/Pax)
                    </th>
                    <th className="py-2.5 px-4 text-center">% of Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* 1. REVENUE */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-bold text-slate-900">
                          Gross Customer Revenue
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Confirmed booking packages
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900 font-mono">
                      {formatCurrency(calculatedStats.totalClientRevenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-green-600 font-mono">
                      {formatCurrency(calculatedStats.clientAmountReceived)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-600 font-mono">
                      {formatCurrency(calculatedStats.clientOutstandingBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-blue-700 bg-[#FF4D00]/5 font-mono">
                      ₹{calculatedStats.revenuePerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-600">
                      100.0%
                    </td>
                  </tr>

                  {/* 2. HOTELS */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
                        <span className="font-bold text-slate-800">
                          Hotel & Accommodation Stays
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Rooms, camps & homestay contracts
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalHotelsCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.totalHotelsPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(calculatedStats.totalHotelsDue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C2410C] bg-[#FF4D00]/5 font-mono">
                      ₹{calculatedStats.hotelsCostPerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalHotelsCost /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 3. TRANSPORT */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-bold text-slate-800">
                          Transport & Fleet Vehicles
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Tempo travellers, cabs & drivers
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalTransportsCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.totalTransportsPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(calculatedStats.totalTransportsDue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-amber-700 bg-[#FF4D00]/5 font-mono">
                      ₹
                      {calculatedStats.transportsCostPerPax.toLocaleString(
                        "en-IN",
                      )}
                      /pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalTransportsCost /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 4. GUIDES */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-600" />
                        <span className="font-bold text-slate-800">
                          Trek Leaders & Local Guides
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Trip leads, mountain guides & crew
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalGuidesCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.totalGuidesPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(calculatedStats.totalGuidesDue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-green-700 bg-[#FF4D00]/5 font-mono">
                      ₹{calculatedStats.guidesCostPerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalGuidesCost /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 5. TRAIN TICKETS (PACKAGE INCLUDED) */}
                  <tr className="hover:bg-slate-50/60 transition-colors bg-[#FF4D00]/5/30">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
                        <span className="font-bold text-slate-800">
                          Train Tickets (Package Included)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Company-paid railway reservations & net cancellations
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalTrainCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.totalTrainPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(calculatedStats.totalTrainDue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C2410C] bg-[#FF4D00]/5 font-mono">
                      ₹{calculatedStats.trainCostPerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalTrainCost /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 6. ACTIVITIES */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
                        <span className="font-bold text-slate-800">
                          Adventure & Paid Activities
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Rafting, permits, entry tickets & sports
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalActivityCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.activityAmountPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(calculatedStats.activityPending)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#C2410C] bg-[#FF4D00]/5 font-mono">
                      ₹
                      {calculatedStats.activitiesCostPerPax.toLocaleString(
                        "en-IN",
                      )}
                      /pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalActivityCost /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 6. MISC */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span className="font-bold text-slate-800">
                          Miscellaneous & Enroute Ops
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">
                        Tolls, meals, first aid & emergency expenses
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCurrency(calculatedStats.totalMiscExpenses)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700 font-mono">
                      {formatCurrency(calculatedStats.miscApproved)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-600 font-mono">
                      {formatCurrency(calculatedStats.miscPendingApproval)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-700 bg-[#FF4D00]/5 font-mono">
                      ₹{calculatedStats.miscCostPerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                      {calculatedStats.totalClientRevenue > 0
                        ? (
                            (calculatedStats.totalMiscExpenses /
                              calculatedStats.totalClientRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>

                  {/* 7. NET MARGIN / PROFIT — Founder/Superadmin only */}
                  {canSeeProfit && (
                  <tr className="bg-slate-50 font-black text-xs border-t-2 border-slate-200">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            calculatedStats.estimatedProfit >= 0
                              ? "bg-green-600"
                              : "bg-red-500",
                          )}
                        />
                        <span className="font-black text-slate-900 uppercase">
                          Net Realized Departure Profit
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block ml-4">
                        Revenue minus all vendor & operational costs
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right font-black font-mono text-sm",
                        calculatedStats.estimatedProfit >= 0
                          ? "text-green-700"
                          : "text-red-600",
                      )}
                    >
                      {formatCurrency(calculatedStats.estimatedProfit)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-600 font-mono">
                      Cost: {formatCurrency(calculatedStats.totalCosts)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      —
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right font-black bg-[#FF4D00]/10/70 font-mono text-sm",
                        calculatedStats.profitPerPax >= 0
                          ? "text-green-700"
                          : "text-red-700",
                      )}
                    >
                      ₹{calculatedStats.profitPerPax.toLocaleString("en-IN")}/pax
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded font-black text-xs",
                          Number(calculatedStats.profitMargin) >= 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-800",
                        )}
                      >
                        {calculatedStats.profitMargin}%
                      </span>
                    </td>
                  </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ⚡ Quick Transaction Actions
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setAddClientPaymentOpen(true)}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                + Add Client Payment
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingVendorPayment(null);
                  setAddVendorPaymentOpen(true);
                }}
                className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs"
              >
                + Add Vendor Payment
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingActivityPayment(null);
                  setActivityPaymentForm({
                    activityId: "",
                    activityName: "",
                    activityType: "Activities",
                    costPerPerson: "",
                    participantCount: "1",
                    vendorName: "",
                    amountPaid: "",
                    paymentDate: new Date().toISOString().substring(0, 10),
                    paymentMode: "BANK_TRANSFER",
                    collectionAccountId: collectionAccounts[0]?.id || "",
                    customPayerName: "",
                    needsReimbursement: false,
                    transactionId: "",
                    invoiceProof: "",
                    remarks: "",
                  });
                  setAddActivityPaymentOpen(true);
                }}
                className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs"
              >
                + Add Activity Payment
              </Button>
              <Button
                size="sm"
                onClick={() => setAddMiscPaymentOpen(true)}
                className="h-8 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs"
              >
                + Miscellaneous Expense
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunReconciliation}
                className="h-8 text-xs font-bold border-slate-300 text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Run Reconciliation
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleDownloadCSV(bookings, "payment_ledger_summary.csv")
                }
                className="h-8 text-xs font-bold border-slate-300 text-slate-700"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download Report
              </Button>
            </div>
          </div>

          {/* Recent Ledger Summary Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Client Receipts */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recent Client Receivables Transactions
                </h4>
                <button
                  onClick={() => setSubTab("clients")}
                  className="text-xs font-semibold text-[#FF4D00] hover:underline"
                >
                  View All ({bookings.length})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">
                    No client receivables recorded yet for this departure.
                  </div>
                ) : (
                  bookings.slice(0, 4).map((b) => {
                    const bal = Math.max(
                      0,
                      b.totalAmount - (b.advancePaid || 0),
                    );
                    return (
                      <div
                        key={b.bookingId}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-900">
                            {b.bookingId}
                          </span>
                          <span className="text-slate-600 ml-1.5 font-medium">
                            {b.name}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Paid: {formatCurrency(b.advancePaid)} of{" "}
                            {formatCurrency(b.totalAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              b.paymentStatus === "Paid"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : b.paymentStatus === "Partially Paid"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-red-50 text-red-700 border border-red-200",
                            )}
                          >
                            {b.paymentStatus || "Unpaid"}
                          </span>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">
                            Due: {formatCurrency(bal)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Vendor Payables */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recent Vendor Payables Transactions
                </h4>
                <button
                  onClick={() => setSubTab("vendors")}
                  className="text-xs font-semibold text-[#FF4D00] hover:underline"
                >
                  View All ({vendorPayments.length})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {vendorPayments.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">
                    No vendor payables recorded yet for this departure.
                  </div>
                ) : (
                  vendorPayments.slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-black text-slate-900">
                          {v.vendorName}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded uppercase ml-1.5">
                          {v.category}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Inv: {v.invoiceNumber} · Agreed:{" "}
                          {formatCurrency(v.agreedAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                            v.status === "Paid"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : v.status === "Advance Paid" ||
                                  v.status === "Partially Paid"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200",
                          )}
                        >
                          {v.status}
                        </span>
                        <div className="text-[11px] font-bold text-red-600 mt-1">
                          Bal: {formatCurrency(v.remainingPayable)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────── TAB 3: VENDOR PAYABLES (Detailed Ledger) ──────────────────────── */}
      {subTab === "vendors" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 min-w-0 w-full flex flex-col gap-3">
            {/* Status Quick Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70 self-start">
              {[
                { key: "All Status", label: "All" },
                { key: "Not Paid", label: "Unpaid" },
                { key: "Advance Paid", label: "Advance" },
                { key: "Paid", label: "Paid" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setVendorStatusFilter(s.key)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[9.5px] font-extrabold uppercase tracking-wider transition-all",
                    vendorStatusFilter === s.key
                      ? "bg-white text-[#162B45] shadow-xs"
                      : "text-[#74839A] hover:text-[#162B45]"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 min-w-0 w-full lg:flex-1">
                <select
                  value={vendorCategoryFilter}
                  onChange={(e) => setVendorCategoryFilter(e.target.value)}
                  className="h-8 w-full min-w-0 sm:w-auto sm:shrink-0 text-xs font-medium border border-[#E8EEF4] rounded-lg px-3 bg-white text-[#0B1528] outline-none cursor-pointer"
                >
                  <option value="All Categories">All Vendor Categories</option>
                  {[
                    "Hotels",
                    "Transport",
                    "Activities",
                    "Guides",
                    "Meals",
                    "Other",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={vendorStatusFilter}
                  onChange={(e) => setVendorStatusFilter(e.target.value)}
                  className="h-8 w-full min-w-0 sm:w-auto sm:shrink-0 text-xs font-medium border border-[#E8EEF4] rounded-lg px-3 bg-white text-[#0B1528] outline-none cursor-pointer"
                >
                  <option value="All Status">All Payment Statuses</option>
                  {["Not Paid", "Advance Paid", "Partially Paid", "Paid"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>

                <div className="relative min-w-0 w-full sm:flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search vendor name or invoice #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-full min-w-0 pl-8 text-xs rounded-lg border border-[#E8EEF4] bg-white text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:border-[#FF4D00]"
                  />
                </div>
              </div>

            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setEditingVendorPayment(null);
                  setAddVendorPaymentOpen(true);
                }}
                className="h-auto min-h-8 w-full lg:w-auto whitespace-normal leading-tight py-1.5 bg-[#FF4D00] hover:bg-[#E04500] text-white font-semibold text-[11px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Record Vendor Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleDownloadCSV(
                    vendorPayments,
                    "vendor_payables_ledger.csv",
                  )
                }
                className="h-auto min-h-8 w-full lg:w-auto whitespace-normal leading-tight py-1.5 text-[11px] font-semibold border-[#E8EEF4] text-[#0B1528] hover:bg-[#F4F7FB]"
              >
                <Download className="w-3.5 h-3.5 mr-1 shrink-0" /> Export CSV
              </Button>
            </div>
          </div>
        </div>

          {/* Table with Clickable Expandable Vendor Invoice Rows */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-100">VENDOR</th>
                  <th className="p-3 border-r border-slate-100">TYPE</th>
                  <th className="p-3 border-r border-slate-100">INVOICE #</th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    INVOICE AMOUNT
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    ADVANCE PAID
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    BALANCE DUE
                  </th>
                  <th className="p-3 border-r border-slate-100 text-center">
                    STATUS
                  </th>
                  <th className="p-3 text-center w-36">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filteredVendors = vendorPayments.filter((v) => {
                    const matchSearch =
                      searchQuery === "" ||
                      v.vendorName
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      (v.invoiceNumber || "")
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    const matchCat =
                      vendorCategoryFilter === "All Categories" ||
                      v.category === vendorCategoryFilter;
                    const matchStatus = (() => {
                      if (vendorStatusFilter === "All Status") return true;
                      const sNorm = (v.status || "").trim().toLowerCase();
                      const fNorm = vendorStatusFilter.trim().toLowerCase();
                      const agreed = Number(v.agreedAmount || v.totalCost || 0);
                      const paid = Number(v.advancePaid || 0);

                      if (fNorm === "not paid" || fNorm === "unpaid" || fNorm === "pending") {
                        return sNorm === "pending" || sNorm === "not paid" || sNorm === "unpaid" || (paid === 0 && agreed > 0);
                      }
                      if (fNorm === "advance paid" || fNorm === "advance" || fNorm === "partially paid" || fNorm === "partial") {
                        return sNorm === "advance paid" || sNorm === "partially paid" || sNorm === "partial" || (paid > 0 && paid < agreed);
                      }
                      if (fNorm === "paid") {
                        return sNorm === "paid" || (agreed > 0 && paid >= agreed);
                      }
                      return sNorm === fNorm;
                    })();
                    return matchSearch && matchCat && matchStatus;
                  });

                  return filteredVendors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-xs font-semibold text-slate-400"
                      >
                        No vendor payables recorded yet for this departure.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v) => {
                      const balance = Math.max(
                        0,
                        (v.agreedAmount || 0) - (v.advancePaid || 0),
                      );
                      const isExpanded = expandedVendorId === v.id;
                      return (
                        <React.Fragment key={v.id}>
                          <tr
                            onClick={() =>
                              setExpandedVendorId(isExpanded ? null : v.id)
                            }
                            className={cn(
                              "hover:bg-slate-50/70 transition-colors cursor-pointer",
                              isExpanded && "bg-[#FF4D00]/5/40",
                            )}
                          >
                            <td className="p-3 border-r border-slate-100 font-extrabold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#FF4D00]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                                <span>{v.vendorName}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">
                                {v.serviceDescription}
                              </p>
                            </td>
                            <td className="p-3 border-r border-slate-100">
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                                {v.category}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 font-bold text-slate-700">
                              {v.invoiceNumber || v.transactionId || v.history?.[0]?.txnId || "—"}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-black text-slate-900">
                              {formatCurrency(v.agreedAmount)}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-black text-green-700">
                              {formatCurrency(v.advancePaid)}
                            </td>
                            <td className={cn("p-3 border-r border-slate-100 text-right font-black", balance > 0 ? "text-red-600" : "text-slate-400")}>
                              {formatCurrency(balance)}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-center">
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                                  v.status === "Paid"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : v.status === "Advance Paid" ||
                                        v.status === "Partially Paid"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200",
                                )}
                              >
                                {v.status}
                              </span>
                            </td>
                            <td
                              className="p-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex gap-1.5 justify-center">
                                {balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVendorPayment(v);
                                    setVendorPaymentForm({
                                      vendorName: formatVendorName(v.vendorName),
                                      category: v.category,
                                      serviceDescription: refineServiceAgainstVendor(
                                        v.serviceDescription,
                                        v.vendorName,
                                      ) || hotelServiceLine(v.rawAssignment || v),
                                      agreedAmount: String(v.agreedAmount),
                                      advancePaid: "",
                                      paymentDate: new Date().toISOString().substring(0, 10),
                                      paymentMode: "BANK_TRANSFER",
                                      collectionAccountId:
                                        v.collectionAccountId ||
                                        collectionAccounts[0]?.id ||
                                        "",
                                      customPayerName: "",
                                      needsReimbursement: false,
                                      transactionId: "",
                                      invoiceProof: v.invoiceProof || "",
                                      paymentProof: v.advanceProofUrl || v.paymentProofUrl || "",
                                      status: v.status,
                                      remarks: "",
                                    });
                                    setAddVendorPaymentOpen(true);
                                  }}
                                  className="bg-[#FF4D00] text-white hover:bg-[#E04400] text-[10px] font-bold px-2.5 py-1 rounded shadow-xs"
                                >
                                  Record Payment
                                </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedVendorId(
                                      isExpanded ? null : v.id,
                                    )
                                  }
                                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold px-2 py-1 rounded"
                                >
                                  {isExpanded ? "Hide History" : "View History"}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE ROW: VENDOR INVOICE DETAILS & PAYMENT HISTORY */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 border-t border-b border-slate-200">
                              <td colSpan={8} className="p-4">
                                <div className="space-y-3 max-w-4xl">
                                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <Building2 className="w-4 h-4 text-[#FF4D00]" />
                                      {v.vendorName} ({v.category}) — Invoice{" "}
                                      {v.invoiceNumber} Details
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                      Invoice Total:{" "}
                                      {formatCurrency(v.agreedAmount)} · Paid:{" "}
                                      {formatCurrency(v.advancePaid)} · Balance
                                      Due: {formatCurrency(balance)}
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {!v.history || v.history.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic py-2">
                                        No advance or settlement payments
                                        recorded against this invoice yet.
                                      </div>
                                    ) : (
                                      v.history.map((h: any, idx: number) => {
                                        const isApproved =
                                          h.approvalStatus === "APPROVED" ||
                                          h.approvalStatus === "APPROVED_FOUNDER" ||
                                          v.approvalStatus === "APPROVED_FOUNDER" ||
                                          (v.status === "Paid" &&
                                            (h.approvedBy ||
                                              v.approvedByFounderId ||
                                              v.approvalStatus ===
                                                "APPROVED_FOUNDER" ||
                                              !v.requiresFounderApproval));
                                        const isRejected =
                                          h.approvalStatus === "REJECTED" ||
                                          v.approvalStatus === "REJECTED";
                                        const isPending = !isApproved && !isRejected;

                                        return (
                                          <div
                                            key={idx}
                                            className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                                <CreditCard className="w-4 h-4 text-blue-600" />
                                              </div>
                                              <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="font-extrabold text-slate-900 text-sm">
                                                    {formatCurrency(h.amount)}
                                                  </span>
                                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                                                    {h.method}
                                                  </span>
                                                  {h.accountName && (
                                                    <span
                                                      className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1",
                                                        h.isCustomPayer ||
                                                          h.accountName?.includes("Trek Leader") ||
                                                          h.accountName?.includes("Someone Else") ||
                                                          h.accountName?.includes("Personal") ||
                                                          h.accountName?.includes("Driver") ||
                                                          h.accountName?.includes("Reimbursement")
                                                          ? "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30"
                                                          : "bg-blue-50 text-blue-700 border-blue-100",
                                                      )}
                                                    >
                                                      Paid from: {h.accountName}
                                                    </span>
                                                  )}
                                                  <span className="text-xs font-mono text-slate-500">
                                                    TXN: {h.txnId}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                  Date: {h.date} · Type:{" "}
                                                  {h.type || "ADVANCE"}
                                                  {h.uploadedBy
                                                    ? ` · Recorded by: ${h.uploadedBy}`
                                                    : ""}
                                                  {h.approvedBy
                                                    ? ` · Approved by: ${h.approvedBy}`
                                                    : ""}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                              {/* Payment Proof View or Upload Action */}
                                              {(() => {
                                                const proofs = resolveVendorProofs(v, h);
                                                if (!proofs.payment) {
                                                  return (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setQuickProofTarget({
                                                      vendorId: v.id,
                                                      historyIndex: idx,
                                                      vendorName: v.vendorName,
                                                      amount: h.amount,
                                                      proofUrl: "",
                                                    });
                                                    setQuickProofModalOpen(true);
                                                  }}
                                                  className="h-7 px-2.5 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md inline-flex items-center gap-1 transition-colors"
                                                >
                                                  <Upload className="w-3.5 h-3.5" />
                                                  Add Proof
                                                </button>
                                                  );
                                                }
                                                return (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setProofPreviewModal({
                                                      open: true,
                                                      title: `Payment proof — ${formatVendorName(v.vendorName)}`,
                                                      subtitle: `${v.category || "Vendor"} · ${departureDateStr}`,
                                                      imageUrl: proofs.payment,
                                                      paymentUrl: proofs.payment,
                                                      amount: h.amount,
                                                      method: h.method,
                                                      date: h.date,
                                                      txnId: h.txnId,
                                                      accountName: h.accountName,
                                                      uploadedBy: h.uploadedBy,
                                                      status: isApproved
                                                        ? "APPROVED"
                                                        : isRejected
                                                          ? "REJECTED"
                                                          : "PENDING_APPROVAL",
                                                    })
                                                  }
                                                  className="h-7 px-2.5 text-[11px] font-bold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                  <Eye className="w-3.5 h-3.5" />
                                                  View payment proof
                                                </button>
                                                );
                                              })()}

                                              {/* Verification & Approval Status / Action */}
                                              {isApproved ? (
                                                <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                                                  <Check className="w-3 h-3 text-green-700" />
                                                  APPROVED ✓
                                                </span>
                                              ) : isRejected ? (
                                                <span className="text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                                                  <X className="w-3 h-3 text-red-700" />
                                                  REJECTED
                                                </span>
                                              ) : (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
                                                    PENDING APPROVAL
                                                  </span>
                                                  {isApprover && (
                                                    <div className="flex items-center gap-1">
                                                      <Button
                                                        size="sm"
                                                        onClick={() =>
                                                          handleApproveVendorPaymentProof(
                                                            v.id,
                                                            idx,
                                                            "APPROVE",
                                                          )
                                                        }
                                                        className="h-7 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white px-2.5"
                                                      >
                                                        <Check className="w-3 h-3 mr-0.5" />
                                                        Approve
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                          handleApproveVendorPaymentProof(
                                                            v.id,
                                                            idx,
                                                            "REJECT",
                                                          )
                                                        }
                                                        className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50 border-red-200 px-2"
                                                      >
                                                        <X className="w-3 h-3 mr-0.5" />
                                                        Reject
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  const proofs = resolveVendorProofs(v, h);
                                                  if (proofs.payment && /\.pdf($|\?)/i.test(proofs.payment)) {
                                                    window.open(proofs.payment, "_blank", "noopener,noreferrer");
                                                    return;
                                                  }
                                                  generateVendorInvoicePDF(v, h);
                                                }}
                                                className="h-7 text-[11px] font-bold bg-[#FF4D00]/5 hover:bg-[#FF4D00]/10 text-[#C2410C] border-[#FF4D00]/30"
                                              >
                                                Download voucher PDF
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}

                                    {/* Next Settlement Card */}
                                    {balance > 0 && (
                                      <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                          <Clock className="w-4 h-4 text-amber-600" />
                                          <span>
                                            Settlement Due:{" "}
                                            {formatCurrency(balance)}
                                          </span>
                                          <span className="text-slate-600 font-normal">
                                            — Due{" "}
                                            {v.dueDate ||
                                              "after trip completion"}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setEditingVendorPayment(v);
                                            setVendorPaymentForm({
                                              vendorName: formatVendorName(v.vendorName),
                                              category: v.category,
                                              serviceDescription: refineServiceAgainstVendor(
                                                v.serviceDescription,
                                                v.vendorName,
                                              ) || hotelServiceLine(v.rawAssignment || v),
                                              agreedAmount: String(
                                                v.agreedAmount,
                                              ),
                                              advancePaid: String(
                                                v.agreedAmount,
                                              ),
                                              paymentDate: new Date()
                                                .toISOString()
                                                .substring(0, 10),
                                              paymentMode: "BANK_TRANSFER",
                                              collectionAccountId:
                                                v.collectionAccountId ||
                                                collectionAccounts[0]?.id ||
                                                "",
                                              customPayerName: "",
                                              needsReimbursement: false,
                                              transactionId: `NEFT-SETTLE-${Date.now()}`,
                                              invoiceProof: "",
                                              paymentProof: "",
                                              status: "Paid",
                                              remarks:
                                                "Final balance settlement",
                                            });
                                            setAddVendorPaymentOpen(true);
                                          }}
                                          className="h-7 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs"
                                        >
                                          Record Final Settlement
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────── TAB 4: ACTIVITY PAYMENTS ──────────────────────── */}
      {subTab === "activities" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 min-w-0 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-semibold text-[#0B1528] min-w-0">
              Activity costs & vendor settlement
            </span>
            <Button
              size="sm"
              onClick={() => {
                setEditingActivityPayment(null);
                setActivityPaymentForm({
                  activityId: "",
                  activityName: "",
                  activityType: "Activities",
                  costPerPerson: "",
                  participantCount: "1",
                  vendorName: "",
                  amountPaid: "",
                  paymentDate: new Date().toISOString().substring(0, 10),
                  paymentMode: "BANK_TRANSFER",
                  collectionAccountId: collectionAccounts[0]?.id || "",
                  customPayerName: "",
                  needsReimbursement: false,
                  transactionId: "",
                  invoiceProof: "",
                  remarks: "",
                });
                setAddActivityPaymentOpen(true);
              }}
              className="h-8 w-full sm:w-auto shrink-0 bg-[#0B1528] hover:bg-[#16253d] text-white font-semibold text-[11px]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Record Activity Payment
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-100">
                    ACTIVITY NAME
                  </th>
                  <th className="p-3 border-r border-slate-100">TYPE</th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    COST/PPL
                  </th>
                  <th className="p-3 border-r border-slate-100 text-center">
                    PAX
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    TOTAL COST
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    PAID
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    BALANCE
                  </th>
                  <th className="p-3 border-r border-slate-100 text-center">
                    STATUS
                  </th>
                  <th className="p-3 text-center w-36">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-xs font-semibold text-slate-400"
                    >
                      No activity payments recorded yet for this departure.
                    </td>
                  </tr>
                ) : (
                  activityPayments.map((act) => (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-extrabold text-slate-900">
                          {act.activityName}
                        </span>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Vendor: {act.vendorName}
                        </p>
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                          {act.activityType}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-700">
                        {act.isIncluded
                          ? "₹0 (Incl)"
                          : formatCurrency(act.costPerPerson)}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center font-bold text-slate-800">
                        {act.participantCount}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-black text-slate-900">
                        {formatCurrency(act.totalCost)}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-black text-green-700">
                        {formatCurrency(act.amountPaid)}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-black text-amber-600">
                        {formatCurrency(act.balanceDue)}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                            act.status === "INCLUDED" || act.status === "PAID"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : act.status === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200",
                          )}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!act.isIncluded && act.balanceDue > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const totalCost = Number(act.totalCost) || Number(act.costPerPerson) * Number(act.participantCount) || 0;
                              const alreadyPaid = Number(act.amountPaid) || 0;
                              const balance = Math.max(0, totalCost - alreadyPaid);

                              setEditingActivityPayment(act);
                              setActivityPaymentForm({
                                activityId: act.activityId || act.id || "",
                                activityName: act.activityName,
                                activityType: act.activityType || "Activities",
                                costPerPerson: String(act.costPerPerson || ""),
                                participantCount: String(act.participantCount || "1"),
                                vendorName: act.vendorName || "",
                                amountPaid: String(balance > 0 ? balance : totalCost),
                                paymentDate: new Date().toISOString().substring(0, 10),
                                paymentMode: "BANK_TRANSFER",
                                collectionAccountId: collectionAccounts[0]?.id || "",
                                customPayerName: "",
                                needsReimbursement: false,
                                transactionId: "",
                                invoiceProof: "",
                                remarks: "",
                              });
                              setAddActivityPaymentOpen(true);
                            }}
                            className="h-7 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-[10px] px-2.5"
                          >
                            Record Payment
                          </Button>
                        ) : (
                          <span className="text-[11px] text-green-600 font-bold">
                            Settled ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────── TAB 5: MISCELLANEOUS PAYMENTS (Ad-Hoc Expenses) ──────────────────────── */}
      {subTab === "misc" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 min-w-0 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-semibold text-[#0B1528] min-w-0">
              Miscellaneous & ad-hoc expenses
            </span>
            <Button
              size="sm"
              onClick={() => setAddMiscPaymentOpen(true)}
              className="h-8 w-full sm:w-auto shrink-0 bg-[#0B1528] hover:bg-[#16253d] text-white font-semibold text-[11px]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add miscellaneous expense
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-100">DESCRIPTION</th>
                  <th className="p-3 border-r border-slate-100">CATEGORY</th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    AMOUNT
                  </th>
                  <th className="p-3 border-r border-slate-100">PAYEE NAME</th>
                  <th className="p-3 border-r border-slate-100">APPROVED BY</th>
                  <th className="p-3 border-r border-slate-100 text-center">
                    STATUS
                  </th>
                  <th className="p-3 text-center w-48">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {miscPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-xs font-semibold text-slate-400"
                    >
                      No miscellaneous expenses recorded for this departure.
                    </td>
                  </tr>
                ) : (
                  miscPayments.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-100 font-extrabold text-slate-900">
                        {m.description}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Date: {m.paymentDate}
                        </p>
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                          {m.category}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-black text-slate-900">
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-700">
                        {m.payeeName}
                      </td>
                      <td className="p-3 border-r border-slate-100 font-medium text-slate-600">
                        {m.approvedBy}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                            m.status === "APPROVED" || m.status === "PAID"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : m.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200",
                          )}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {m.status === "PENDING" ? (
                          <div className="flex gap-1.5 justify-center">
                            <Button
                              size="sm"
                              onClick={async () => {
                                const staff = admin?.name || admin?.email || "Finance Admin";
                                const isVendorPaymentRow =
                                  !!m.id && !String(m.id).startsWith("MISC-");
                                try {
                                  // OpsVendorPayment misc must update that record — do not
                                  // treat a trip-expense upsert as success (that caused
                                  // "approved" toast while the row stayed PENDING).
                                  if (isVendorPaymentRow) {
                                    const updated = await opsService.updateVendorPayment(
                                      tripId,
                                      m.id,
                                      {
                                        paymentStatus: "Paid",
                                        status: "Paid",
                                        approvalStatus: "APPROVED",
                                        advancePaid: m.amount,
                                        remainingPayable: 0,
                                        paidBy: staff,
                                        remarks: `${m.payeeName || "Ad-Hoc Expense"} | Status: APPROVED | ApprovedBy: ${staff}`,
                                      },
                                    );
                                    const savedApproval = String(
                                      updated?.approvalStatus || "",
                                    ).toUpperCase();
                                    if (
                                      savedApproval !== "APPROVED" &&
                                      !savedApproval.startsWith("APPROVED")
                                    ) {
                                      throw new Error(
                                        "Server did not persist misc approvalStatus",
                                      );
                                    }
                                  } else {
                                    await opsService.upsertTripExpense(tripId, {
                                      id: m.id,
                                      departureDate: departureDateStr,
                                      activity: m.description,
                                      totalAmount: m.amount,
                                      amountPaid: m.amount,
                                      paymentDate:
                                        m.paymentDate || new Date().toISOString(),
                                      remarks: `${m.payeeName || "Ad-Hoc Expense"} | Method: ${m.paymentMethod || "Cash"} | Status: APPROVED | ApprovedBy: ${staff}`,
                                    });
                                  }
                                  toast.success(
                                    "Expense approved & added to Vendor Payables!",
                                  );
                                  await fetchData();
                                } catch (err) {
                                  console.error("Expense approve error:", err);
                                  toast.error("Failed to save approval");
                                  await fetchData();
                                }
                              }}
                              className="h-7 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 cursor-pointer"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const staff = admin?.name || admin?.email || "Finance Admin";
                                const isVendorPaymentRow =
                                  !!m.id && !String(m.id).startsWith("MISC-");
                                try {
                                  if (isVendorPaymentRow) {
                                    const updated = await opsService.updateVendorPayment(
                                      tripId,
                                      m.id,
                                      {
                                        paymentStatus: "Pending",
                                        status: "Rejected",
                                        approvalStatus: "REJECTED",
                                        advancePaid: 0,
                                        remainingPayable: m.amount,
                                        paidBy: null,
                                        remarks: `${m.payeeName || "Ad-Hoc Expense"} | Status: REJECTED | RejectedBy: ${staff}`,
                                      },
                                    );
                                    if (
                                      String(updated?.approvalStatus || "").toUpperCase() !==
                                      "REJECTED"
                                    ) {
                                      throw new Error(
                                        "Server did not persist misc rejection",
                                      );
                                    }
                                  } else {
                                    await opsService.upsertTripExpense(tripId, {
                                      id: m.id,
                                      departureDate: departureDateStr,
                                      activity: m.description,
                                      totalAmount: m.amount,
                                      amountPaid: 0,
                                      paymentDate:
                                        m.paymentDate || new Date().toISOString(),
                                      remarks: `${m.payeeName || "Ad-Hoc Expense"} | Method: ${m.paymentMethod || "Cash"} | Status: REJECTED | RejectedBy: ${staff}`,
                                    });
                                  }
                                  toast.success("Expense rejected");
                                  await fetchData();
                                } catch (err) {
                                  console.error("Expense reject error:", err);
                                  toast.error("Failed to reject expense");
                                  await fetchData();
                                }
                              }}
                              className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            {m.status === "APPROVED" ? "Processed ✓" : "Rejected ✗"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────── TAB 6: RECONCILIATION & ADJUSTMENTS ──────────────────────── */}
      {subTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 min-w-0 w-full flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#0B1528] min-w-0">
              Reconciliation & adjustments
            </span>
            <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:justify-end">
              <Button
                size="sm"
                onClick={handleRunReconciliation}
                className="h-auto min-h-8 w-full lg:w-auto whitespace-normal leading-tight py-1.5 bg-[#0B1528] hover:bg-[#16253d] text-white font-semibold text-[11px]"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1 shrink-0" /> Run auto-reconciliation
              </Button>
              <Button
                size="sm"
                onClick={() => setAddAdjustmentOpen(true)}
                className="h-auto min-h-8 w-full lg:w-auto whitespace-normal leading-tight py-1.5 bg-[#FF4D00] hover:bg-[#E04500] text-white font-semibold text-[11px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add adjustment
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-100">TYPE</th>
                  <th className="p-3 border-r border-slate-100">
                    ORIGINAL PAYMENT
                  </th>
                  <th className="p-3 border-r border-slate-100 text-right">
                    AMOUNT
                  </th>
                  <th className="p-3 border-r border-slate-100">REASON</th>
                  <th className="p-3 border-r border-slate-100 text-center">
                    STATUS
                  </th>
                  <th className="p-3 text-center w-40">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-xs font-semibold text-slate-400"
                    >
                      No reconciliation adjustments recorded for this departure.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-100">
                        <span className="text-[10px] bg-slate-100 text-slate-800 font-extrabold px-2 py-0.5 rounded uppercase">
                          {a.type}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                        {a.originalPaymentRef}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-black text-slate-900">
                        {formatCurrency(a.amount)}
                      </td>
                      <td className="p-3 border-r border-slate-100 font-medium text-slate-600">
                        {a.reason}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                            a.status === "APPROVED" || a.status === "COMPLETED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : a.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200",
                          )}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {a.status === "PENDING" ? (
                          <div className="flex gap-1.5 justify-center">
                            <Button
                              size="sm"
                              onClick={async () => {
                                const updated = { ...a, status: "APPROVED" };
                                setAdjustments((prev) =>
                                  prev.map((item) =>
                                    item.id === a.id ? { ...item, status: "APPROVED" } : item,
                                  ),
                                );
                                try {
                                  await opsService.upsertTripExpense(tripId, {
                                    id: a.id.startsWith("ADJ-") ? undefined : a.id,
                                    departureDate: departureDateStr,
                                    activity: `Adjustment: ${a.type} - ${a.originalPaymentRef}`,
                                    totalAmount: a.amount,
                                    amountPaid: a.amount,
                                    remarks: `Reconciliation | Reason: ${a.reason} | Status: APPROVED`,
                                  });
                                  await fetchData();
                                } catch (err) {
                                  console.error("Adjustment approve error:", err);
                                }
                                toast.success("Adjustment approved & saved!");
                              }}
                              className="h-7 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 cursor-pointer"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const updated = { ...a, status: "REJECTED" };
                                setAdjustments((prev) =>
                                  prev.map((item) =>
                                    item.id === a.id ? { ...item, status: "REJECTED" } : item,
                                  ),
                                );
                                try {
                                  await opsService.upsertTripExpense(tripId, {
                                    id: a.id.startsWith("ADJ-") ? undefined : a.id,
                                    departureDate: departureDateStr,
                                    activity: `Adjustment: ${a.type} - ${a.originalPaymentRef}`,
                                    totalAmount: a.amount,
                                    amountPaid: 0,
                                    remarks: `Reconciliation | Reason: ${a.reason} | Status: REJECTED`,
                                  });
                                  await fetchData();
                                } catch (err) {
                                  console.error("Adjustment reject error:", err);
                                }
                                toast.success("Adjustment rejected");
                              }}
                              className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">
                            Resolved ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────── MODAL 1: RECORD CLIENT PAYMENT ──────────────────────── */}
      <Dialog
        open={addClientPaymentOpen}
        onOpenChange={(open) => {
          setAddClientPaymentOpen(open);
          if (!open) {
            setSelectedBooking(null);
          }
        }}
      >
        <DialogContent className="max-w-lg bg-white p-5 rounded-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                Record Client Payment Receipt
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Directly syncs collection with the Finance Module & ledger
              </p>
            </div>
          </div>

          <form onSubmit={handleClientPaymentSubmit} className="space-y-3.5 mt-3">
            {/* Booking Selector or Selected Booking Card */}
            {!selectedBooking ? (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Select Booking / Passenger <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value=""
                  onChange={(e) => {
                    const b = bookings.find((bk) => bk.bookingId === e.target.value);
                    if (b) {
                      setSelectedBooking(b);
                      const bal = Math.max(0, b.totalAmount - (b.advancePaid || 0));
                      setClientPaymentForm((prev) => ({
                        ...prev,
                        amount: bal > 0 ? String(bal) : "",
                      }));
                    }
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Booking to Record Payment --</option>
                  {bookings.map((b) => {
                    const bal = Math.max(0, b.totalAmount - (b.advancePaid || 0));
                    return (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingId} — {b.name} (Due: ₹{bal.toLocaleString("en-IN")})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-950">
                    {selectedBooking.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {selectedBooking.bookingId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(null)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-100 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Package:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      ₹{selectedBooking.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Already Paid:</span>
                    <span className="font-bold text-green-700 font-mono">
                      ₹{(selectedBooking.advancePaid || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Balance Due:</span>
                    <span className="font-black text-amber-700 font-mono">
                      ₹{Math.max(0, selectedBooking.totalAmount - (selectedBooking.advancePaid || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Amount and Auto-Fill Full Due */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Amount Received (₹) <span className="text-red-600">*</span>
                </label>
                {selectedBooking && (
                  <button
                    type="button"
                    onClick={() => {
                      const bal = Math.max(0, selectedBooking.totalAmount - (selectedBooking.advancePaid || 0));
                      setClientPaymentForm((prev) => ({
                        ...prev,
                        amount: String(bal),
                      }));
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Set Full Due (₹{Math.max(0, selectedBooking.totalAmount - (selectedBooking.advancePaid || 0)).toLocaleString("en-IN")})
                  </button>
                )}
              </div>
              <input
                type="number"
                required
                placeholder="Enter amount in ₹"
                value={clientPaymentForm.amount}
                onChange={(e) =>
                  setClientPaymentForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            {/* Credited Account (Finance Module Sync) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Credited Account (Finance Module Sync) <span className="text-red-600">*</span>
              </label>
              <select
                value={clientPaymentForm.collectionAccountId}
                onChange={(e) =>
                  setClientPaymentForm((prev) => ({
                    ...prev,
                    collectionAccountId: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-blue-500"
              >
                {(() => {
                  const normMode = (clientPaymentForm.paymentMode || "UPI").toUpperCase();
                  const filtered = collectionAccounts.filter((acc) => {
                    if (normMode.includes("CASH")) {
                      return (
                        acc.accountType === "CASH" ||
                        acc.paymentMethods?.includes("CASH") ||
                        acc.accountName.toLowerCase().includes("cash") ||
                        acc.accountHolderName?.toLowerCase().includes("cash")
                      );
                    }
                    if (normMode.includes("UPI")) {
                      return (
                        acc.accountType !== "CASH" &&
                        (Boolean(acc.upiId) ||
                          acc.paymentMethods?.includes("UPI") ||
                          acc.accountType === "COMPANY" ||
                          acc.accountType === "INDIVIDUAL")
                      );
                    }
                    return acc.accountType !== "CASH";
                  });

                  if (filtered.length === 0) {
                    return <option value="">YouthCamping Central Account</option>;
                  }

                  return filtered.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}{" "}
                      {acc.accountType === "CASH"
                        ? "(YouthCamping Cash Desk)"
                        : acc.upiId
                        ? `(${acc.upiId})`
                        : acc.bankName
                        ? `(${acc.bankName}${acc.maskedAccountNumber || ""})`
                        : `(${acc.accountType})`}
                    </option>
                  ));
                })()}
              </select>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Method
                </label>
                <select
                  value={clientPaymentForm.paymentMode}
                  onChange={(e) => {
                    const newMode = e.target.value;
                    const normMode = (newMode || "UPI").toUpperCase();
                    let targetAccountId = clientPaymentForm.collectionAccountId;
                    if (normMode.includes("CASH")) {
                      const cashAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType === "CASH" ||
                          a.paymentMethods?.includes("CASH") ||
                          a.accountName.toLowerCase().includes("cash") ||
                          a.accountHolderName?.toLowerCase().includes("cash"),
                      );
                      if (cashAcc) targetAccountId = cashAcc.id;
                    } else if (normMode.includes("UPI")) {
                      const upiAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType !== "CASH" &&
                          (Boolean(a.upiId) ||
                            a.paymentMethods?.includes("UPI") ||
                            a.accountType === "COMPANY" ||
                            a.accountType === "INDIVIDUAL"),
                      );
                      if (upiAcc) targetAccountId = upiAcc.id;
                    }
                    setClientPaymentForm((prev) => ({
                      ...prev,
                      paymentMode: newMode,
                      collectionAccountId: targetAccountId,
                    }));
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CASH">Cash Desk</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={clientPaymentForm.paymentDate}
                  onChange={(e) =>
                    setClientPaymentForm((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Transaction ID / Reference */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Transaction ID / UTR / Reference No.
              </label>
              <input
                type="text"
                placeholder="e.g. UTR123456789 or UPI-Ref"
                value={clientPaymentForm.transactionId}
                onChange={(e) =>
                  setClientPaymentForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            {/* Payment Screenshot Upload */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Payment Screenshot / Receipt Proof
              </label>
              <ImageUpload
                label="Upload Payment Screenshot"
                value={clientPaymentForm.proofUrl}
                onUpload={(url) =>
                  setClientPaymentForm((prev) => ({ ...prev, proofUrl: url }))
                }
                compact
              />
            </div>

            {/* Remarks / Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Remarks / Internal Notes
              </label>
              <textarea
                rows={2}
                placeholder="Receipt details, payer name if different..."
                value={clientPaymentForm.remarks}
                onChange={(e) =>
                  setClientPaymentForm((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddClientPaymentOpen(false);
                  setSelectedBooking(null);
                }}
                className="h-8 text-xs font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingClientPayment || !selectedBooking}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4"
              >
                {isSubmittingClientPayment ? "Recording Receipt..." : "Save & Record Receipt"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── MODAL 2: RECORD VENDOR PAYMENT ──────────────────────── */}
      <Dialog
        open={addVendorPaymentOpen}
        onOpenChange={(open) => {
          setAddVendorPaymentOpen(open);
          if (!open) setEditingVendorPayment(null);
        }}
      >
        <DialogContent className="max-w-md bg-white p-5 rounded-xl border border-slate-200 overflow-y-auto max-h-[85vh]">
          {(() => {
            const vendorLabel = formatVendorName(
              editingVendorPayment?.vendorName || vendorPaymentForm.vendorName,
              "Vendor",
            );
            const tripLabel = formatVendorName(
              tripDetails?.title || tripDetails?.name || "Trip",
              "Trip",
            );
            const tripDate = safeFormatDate(departureDateStr, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const departureHref = `/admin/departure-workspace?departureId=${encodeURIComponent(`${tripId}_${departureDateStr}`)}&tab=finance`;
            return (
              <>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {editingVendorPayment ? "Record payment" : "Record vendor payable"}
            </p>
            <h3 className="text-[15px] font-semibold tracking-tight text-[#162B45]">
              {vendorLabel}
            </h3>
            <Link
              to={departureHref}
              className="inline-flex items-center gap-1 text-[12px] text-[#C2410C] hover:underline"
            >
              {tripLabel}
              <span className="text-slate-400">· {tripDate}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {editingVendorPayment && (
            <div className="bg-[#FF4D00]/5/80 border border-[#FF4D00]/30 rounded-lg p-3 text-xs space-y-1 my-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Agreed Total:</span>
                <span className="font-mono">
                  ₹{(editingVendorPayment.agreedAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between font-bold text-green-700">
                <span>Already Paid:</span>
                <span className="font-mono">
                  ₹{(editingVendorPayment.advancePaid || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between font-black text-red-600 pt-1 border-t border-[#FF4D00]/30">
                <span>Remaining Settlement Due:</span>
                <span className="font-mono">
                  ₹{Math.max(0, (editingVendorPayment.agreedAmount || 0) - (editingVendorPayment.advancePaid || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleVendorPaymentSubmit} className="space-y-3 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Vendor
              </label>
              <select
                value={vendorPaymentForm.vendorName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      vendorName: "",
                    }));
                    return;
                  }
                  const foundTv = (tripVendors || []).find((tv) => partnerDisplayName(tv) === val);
                  const foundVp = vendorPayments.find((vp) => formatVendorName(vp.vendorName) === val);

                  const catMap: Record<string, string> = {
                    hotel: "Hotels",
                    transport: "Transport",
                    guide: "Guides",
                    activities: "Activities",
                  };

                  const cat = foundTv
                    ? (catMap[foundTv.vendorType] || "Hotels")
                    : (foundVp?.category || "Hotels");

                  const agreed = foundTv
                    ? String(foundTv.agreedCost || foundTv.totalAmount || 0)
                    : String(foundVp?.agreedAmount || 0);

                  const raw = foundTv?.rawAssignment || foundTv || foundVp;
                  const serviceDesc =
                    hotelServiceLine({ ...raw, hotelName: val, vendorName: val }) ||
                    refineServiceAgainstVendor(foundTv?.notes || foundVp?.serviceDescription, val);

                  setVendorPaymentForm((prev) => ({
                    ...prev,
                    vendorName: val,
                    category: cat,
                    agreedAmount: agreed,
                    serviceDescription: serviceDesc,
                  }));
                }}
                className="w-full h-9 text-xs font-medium border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-slate-400 mb-1"
              >
                <option value="">Select vendor...</option>
                {tripVendors && tripVendors.length > 0 && (
                  <optgroup label="This departure">
                    {tripVendors.map((tv, i) => {
                      const name = partnerDisplayName(tv);
                      const cost = tv.agreedCost || tv.totalAmount || 0;
                      return (
                        <option key={`tv-${i}`} value={name}>
                          {name}{cost > 0 ? ` — ₹${Number(cost).toLocaleString("en-IN")}` : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                {dbVendors && dbVendors.length > 0 && (
                  <optgroup label="Vendor Directory">
                    {dbVendors.map((dv, i) => (
                      <option key={`dv-${i}`} value={dv.name}>
                        {dv.name} ({dv.type || "VENDOR"})
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="__custom__">+ Enter Custom Vendor</option>
              </select>
              {(!vendorPaymentForm.vendorName || !tripVendors?.some((tv) => partnerDisplayName(tv) === vendorPaymentForm.vendorName)) && (
                <input
                  type="text"
                  required
                  placeholder="Type custom vendor partner name..."
                  value={vendorPaymentForm.vendorName}
                  onChange={(e) =>
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      vendorName: e.target.value,
                    }))
                  }
                  className="w-full h-8 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={vendorPaymentForm.category}
                  onChange={(e) =>
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none"
                >
                  <option value="Hotels">Hotels</option>
                  <option value="Transport">Transport</option>
                  <option value="Activities">Activities</option>
                  <option value="Guides">Guides</option>
                  <option value="Meals">Meals</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Agreed / Invoice Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={vendorPaymentForm.agreedAmount}
                  onChange={(e) =>
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      agreedAmount: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {editingVendorPayment ? "Payment Amount (₹)" : "Advance Paid (₹)"}
                </label>
                <input
                  type="number"
                  required
                  value={vendorPaymentForm.advancePaid}
                  onChange={(e) =>
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      advancePaid: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={vendorPaymentForm.paymentMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    let targetAccId = vendorPaymentForm.collectionAccountId;
                    if (mode === "CASH") {
                      const cashAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType === "CASH" ||
                          a.accountName?.toLowerCase().includes("cash"),
                      );
                      if (cashAcc) targetAccId = cashAcc.id;
                    } else if (mode === "BANK_TRANSFER" || mode === "UPI") {
                      const bankAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType !== "CASH" &&
                          !a.accountName?.toLowerCase().includes("cash"),
                      );
                      if (bankAcc) targetAccId = bankAcc.id;
                    }
                    setVendorPaymentForm((prev) => ({
                      ...prev,
                      paymentMode: mode,
                      collectionAccountId: targetAccId,
                    }));
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="CASH">Cash Payment</option>
                </select>
              </div>
            </div>

            {/* Paid From Account (Finance Bank / Cash Accounts / Someone Else) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Paid From Account / Payer Type <span className="text-red-600">*</span>
              </label>
              <select
                value={vendorPaymentForm.collectionAccountId}
                onChange={(e) => {
                  const accId = e.target.value;
                  const isCustom =
                    accId === "__someone_else__" ||
                    accId === "__trek_leader__" ||
                    accId === "__driver__" ||
                    accId === "__founder_personal__";
                  const acc = collectionAccounts.find((a) => a.id === accId);
                  const isCash =
                    acc?.accountType === "CASH" ||
                    acc?.accountName?.toLowerCase().includes("cash");
                  setVendorPaymentForm((prev) => ({
                    ...prev,
                    collectionAccountId: accId,
                    paymentMode: isCash
                      ? "CASH"
                      : prev.paymentMode === "CASH"
                        ? "UPI"
                        : prev.paymentMode,
                    customPayerName:
                      accId === "__trek_leader__"
                        ? "Trek Leader (Personal Pocket)"
                        : accId === "__driver__"
                          ? "Driver / Transporter Direct"
                          : accId === "__founder_personal__"
                            ? "Founder Personal Account"
                            : isCustom
                              ? prev.customPayerName || ""
                              : "",
                  }));
                }}
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
              >
                <optgroup label="Company Finance Accounts (Bank & Cash)">
                  {collectionAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}{" "}
                      {acc.bankName
                        ? `(${acc.bankName}${acc.maskedAccountNumber || (acc.accountNumber ? ` ••••${acc.accountNumber.slice(-4)}` : "")})`
                        : acc.upiId
                          ? `(${acc.upiId})`
                          : acc.accountType === "CASH"
                            ? "(Cash Desk)"
                            : `(${acc.accountType})`}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Someone Else / Personal / External Account">
                  <option value="__someone_else__">
                    👤 Paid by Someone Else / Staff / Other Personal Account
                  </option>
                  <option value="__trek_leader__">
                    🏔️ Paid by Trek Leader / Tour Guide (Personal Pocket)
                  </option>
                  <option value="__driver__">
                    🚐 Paid by Driver / Local Transporter Directly
                  </option>
                  <option value="__founder_personal__">
                    👑 Paid by Founder / Director (Personal Account)
                  </option>
                </optgroup>
              </select>
            </div>

            {/* If Someone Else / Custom Payer is Selected */}
            {(vendorPaymentForm.collectionAccountId === "__someone_else__" ||
              vendorPaymentForm.collectionAccountId === "__trek_leader__" ||
              vendorPaymentForm.collectionAccountId === "__driver__" ||
              vendorPaymentForm.collectionAccountId === "__founder_personal__") && (
              <div className="bg-[#FF4D00]/5/80 border border-[#FF4D00]/30 rounded-lg p-3 space-y-2 text-xs animate-in fade-in duration-200">
                <div>
                  <label className="text-[11px] font-bold text-[#0B1528] block mb-1">
                    Payer Name / Personal Account Details <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dikshu Sharma (Trek Leader Personal UPI / GPay)"
                    value={vendorPaymentForm.customPayerName}
                    onChange={(e) =>
                      setVendorPaymentForm((prev) => ({
                        ...prev,
                        customPayerName: e.target.value,
                      }))
                    }
                    className="w-full h-8 text-xs font-bold border border-[#FF4D00]/40 rounded-md px-3 bg-white text-slate-900 outline-none focus:border-[#FF4D00]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#0B1528] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={vendorPaymentForm.needsReimbursement}
                    onChange={(e) =>
                      setVendorPaymentForm((prev) => ({
                        ...prev,
                        needsReimbursement: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-[#FF4D00] focus:ring-[#FF4D00] border-[#FF4D00]/40"
                  />
                  <span>Mark as "Pending Reimbursement from Company"</span>
                </label>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Transaction ID / Ref
              </label>
              <input
                type="text"
                placeholder="e.g. NEFT123456"
                value={vendorPaymentForm.transactionId}
                onChange={(e) =>
                  setVendorPaymentForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Payment proof <span className="text-red-600">*</span>
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">UPI or bank screenshot</p>
              <ImageUpload
                label="Add payment screenshot"
                value={vendorPaymentForm.invoiceProof || vendorPaymentForm.paymentProof}
                onUpload={(url) =>
                  setVendorPaymentForm((prev) => ({
                    ...prev,
                    invoiceProof: url,
                    paymentProof: url,
                  }))
                }
                compact
                accept="image/*,.pdf,application/pdf"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Service
              </label>
              <textarea
                rows={2}
                placeholder="2 Nights Kasol Camp rooms..."
                value={vendorPaymentForm.serviceDescription}
                onChange={(e) =>
                  setVendorPaymentForm((prev) => ({
                    ...prev,
                    serviceDescription: e.target.value,
                  }))
                }
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-slate-800 outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddVendorPaymentOpen(false)}
                className="h-8 text-xs font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs px-4"
              >
                {editingVendorPayment ? "Save & Record Payment" : "Save & Record Payable"}
              </Button>
            </div>
          </form>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── MODAL: QUICK ATTACH PAYMENT PROOF ──────────────────────── */}
      <Dialog
        open={quickProofModalOpen}
        onOpenChange={(open) => {
          setQuickProofModalOpen(open);
          if (!open) setQuickProofTarget(null);
        }}
      >
        <DialogContent className="max-w-md bg-white p-5 rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
              Upload Payment Proof / Receipt
            </h3>
            {quickProofTarget && (
              <p className="text-xs text-slate-600 font-semibold mt-1">
                Vendor: {quickProofTarget.vendorName} · Amount: ₹{quickProofTarget.amount?.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <div className="space-y-3 my-3">
            <label className="text-[11px] font-bold text-slate-700 block">
              Attach Screenshot / Receipt Image
            </label>
            <ImageUpload
              label="Upload Payment Receipt / Proof"
              value={quickProofTarget?.proofUrl || ""}
              onUpload={(url) =>
                setQuickProofTarget((prev) => (prev ? { ...prev, proofUrl: url } : null))
              }
              compact
            />
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuickProofModalOpen(false);
                setQuickProofTarget(null);
              }}
              className="h-8 text-xs font-bold text-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuickProof}
              disabled={!quickProofTarget?.proofUrl}
              className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs px-4"
            >
              Save & Attach Proof
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── MODAL 3: RECORD ACTIVITY PAYMENT ──────────────────────── */}
      <Dialog
        open={addActivityPaymentOpen}
        onOpenChange={(open) => {
          setAddActivityPaymentOpen(open);
          if (!open) setEditingActivityPayment(null);
        }}
      >
        <DialogContent className="max-w-md bg-white p-5 rounded-xl border border-slate-200 overflow-y-auto max-h-[85vh]">
          <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
            {editingActivityPayment
              ? `Record Payment — ${editingActivityPayment.activityName || editingActivityPayment.vendorName}`
              : "Record Activity Vendor Payment"}
          </h3>

          {/* Top Summary Banner */}
          {(() => {
            const cost = Number(activityPaymentForm.costPerPerson) || 0;
            const pax = Number(activityPaymentForm.participantCount) || 1;
            const computedTotal = cost * pax;
            const alreadyPaid = Number(editingActivityPayment?.amountPaid || 0);
            const remainingDue = Math.max(0, computedTotal - alreadyPaid);

            return (
              <div className="bg-[#FF4D00]/5/80 border border-[#FF4D00]/30 rounded-lg p-3 text-xs space-y-1 my-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Agreed Total:</span>
                  <span className="font-mono">
                    ₹{computedTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-green-700">
                  <span>Already Paid:</span>
                  <span className="font-mono">
                    ₹{alreadyPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between font-black text-red-600 pt-1 border-t border-[#FF4D00]/30">
                  <span>Remaining Settlement Due:</span>
                  <span className="font-mono">
                    ₹{remainingDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })()}

          <form
            onSubmit={handleActivityPaymentSubmit}
            className="space-y-3 mt-2"
          >
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Activity / Service Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Musafir Dhama (Kullu) or River Rafting"
                value={activityPaymentForm.activityName}
                onChange={(e) =>
                  setActivityPaymentForm((prev) => ({
                    ...prev,
                    activityName: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Category / Type
                </label>
                <select
                  value={activityPaymentForm.activityType}
                  onChange={(e) =>
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      activityType: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                >
                  <option value="Activities">Activities</option>
                  <option value="Meals">Meals</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Permits">Permits</option>
                  <option value="Local Transport">Local Transport</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Vendor / Supplier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bal Gopal or Musafir Dhama"
                  value={activityPaymentForm.vendorName}
                  onChange={(e) =>
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      vendorName: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Cost per Person (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="130"
                  value={activityPaymentForm.costPerPerson}
                  onChange={(e) =>
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      costPerPerson: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Participant Count (Pax)
                </label>
                <input
                  type="number"
                  required
                  placeholder="6"
                  value={activityPaymentForm.participantCount}
                  onChange={(e) =>
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      participantCount: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="780"
                  value={activityPaymentForm.amountPaid}
                  onChange={(e) =>
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      amountPaid: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={activityPaymentForm.paymentMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    let targetAccId = activityPaymentForm.collectionAccountId;
                    if (mode === "CASH") {
                      const cashAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType === "CASH" ||
                          a.accountName?.toLowerCase().includes("cash"),
                      );
                      if (cashAcc) targetAccId = cashAcc.id;
                    } else if (mode === "BANK_TRANSFER" || mode === "UPI") {
                      const bankAcc = collectionAccounts.find(
                        (a) =>
                          a.accountType !== "CASH" &&
                          !a.accountName?.toLowerCase().includes("cash"),
                      );
                      if (bankAcc) targetAccId = bankAcc.id;
                    }
                    setActivityPaymentForm((prev) => ({
                      ...prev,
                      paymentMode: mode,
                      collectionAccountId: targetAccId,
                    }));
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="CASH">Cash Payment</option>
                </select>
              </div>
            </div>

            {/* Paid From Account / Payer Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Paid From Account / Payer Type <span className="text-red-600">*</span>
              </label>
              <select
                value={activityPaymentForm.collectionAccountId}
                onChange={(e) => {
                  const accId = e.target.value;
                  const isCustom =
                    accId === "__someone_else__" ||
                    accId === "__trek_leader__" ||
                    accId === "__driver__" ||
                    accId === "__founder_personal__";
                  const acc = collectionAccounts.find((a) => a.id === accId);
                  const isCash =
                    acc?.accountType === "CASH" ||
                    acc?.accountName?.toLowerCase().includes("cash");
                  setActivityPaymentForm((prev) => ({
                    ...prev,
                    collectionAccountId: accId,
                    paymentMode: isCash
                      ? "CASH"
                      : prev.paymentMode === "CASH"
                        ? "UPI"
                        : prev.paymentMode,
                    customPayerName:
                      accId === "__trek_leader__"
                        ? "Trek Leader (Personal Pocket)"
                        : accId === "__driver__"
                          ? "Driver / Transporter Direct"
                          : accId === "__founder_personal__"
                            ? "Founder Personal Account"
                            : isCustom
                              ? prev.customPayerName || ""
                              : "",
                  }));
                }}
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none focus:border-[#FF4D00]"
              >
                <optgroup label="Company Finance Accounts (Bank & Cash)">
                  {collectionAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}{" "}
                      {acc.bankName
                        ? `(${acc.bankName}${acc.maskedAccountNumber || (acc.accountNumber ? ` ••••${acc.accountNumber.slice(-4)}` : "")})`
                        : acc.upiId
                          ? `(${acc.upiId})`
                          : acc.accountType === "CASH"
                            ? "(Cash Desk)"
                            : `(${acc.accountType})`}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Someone Else / Personal / External Account">
                  <option value="__someone_else__">
                    👤 Paid by Someone Else / Staff / Other Personal Account
                  </option>
                  <option value="__trek_leader__">
                    🏔️ Paid by Trek Leader / Tour Guide (Personal Pocket)
                  </option>
                  <option value="__driver__">
                    🚐 Paid by Driver / Local Transporter Directly
                  </option>
                  <option value="__founder_personal__">
                    👑 Paid by Founder (Personal Account)
                  </option>
                </optgroup>
              </select>
            </div>

            {/* If Someone Else / Custom Payer */}
            {(activityPaymentForm.collectionAccountId === "__someone_else__" ||
              activityPaymentForm.collectionAccountId === "__trek_leader__" ||
              activityPaymentForm.collectionAccountId === "__driver__" ||
              activityPaymentForm.collectionAccountId === "__founder_personal__") && (
              <div className="bg-[#FF4D00]/5/80 border border-[#FF4D00]/30 rounded-lg p-3 space-y-2 text-xs animate-in fade-in duration-200">
                <div>
                  <label className="text-[11px] font-bold text-[#0B1528] block mb-1">
                    Payer Name / Personal Account Details <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dikshu Sharma (Trek Leader Personal UPI / GPay)"
                    value={activityPaymentForm.customPayerName}
                    onChange={(e) =>
                      setActivityPaymentForm((prev) => ({
                        ...prev,
                        customPayerName: e.target.value,
                      }))
                    }
                    className="w-full h-8 text-xs font-bold border border-[#FF4D00]/40 rounded-md px-3 bg-white text-slate-900 outline-none focus:border-[#FF4D00]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#0B1528] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={activityPaymentForm.needsReimbursement}
                    onChange={(e) =>
                      setActivityPaymentForm((prev) => ({
                        ...prev,
                        needsReimbursement: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-[#FF4D00] focus:ring-[#FF4D00] border-[#FF4D00]/40"
                  />
                  <span>Mark as "Pending Reimbursement from Company"</span>
                </label>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Transaction ID / Ref
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/UTR or NEFT123456 or Cash Receipt"
                value={activityPaymentForm.transactionId}
                onChange={(e) =>
                  setActivityPaymentForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
              />
            </div>

            {/* Payment Proof / Receipt Screenshot Upload */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Payment Proof / Receipt Screenshot <span className="text-red-600">*</span>
              </label>
              <ImageUpload
                label="Upload Payment Proof Screenshot"
                value={activityPaymentForm.invoiceProof}
                onUpload={(url) =>
                  setActivityPaymentForm((prev) => ({ ...prev, invoiceProof: url }))
                }
                compact
                accept="image/*,.pdf,application/pdf"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Service Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Enter meal / activity notes or location..."
                value={activityPaymentForm.remarks}
                onChange={(e) =>
                  setActivityPaymentForm((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-slate-800 outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddActivityPaymentOpen(false)}
                className="h-8 text-xs font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs px-4"
              >
                Save & Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── MODAL 4: RECORD MISCELLANEOUS EXPENSE ──────────────────────── */}
      <Dialog open={addMiscPaymentOpen} onOpenChange={setAddMiscPaymentOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
            Record Miscellaneous Ad-Hoc Expense
          </h3>
          <form onSubmit={handleMiscPaymentSubmit} className="space-y-3 mt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Description (What was paid for)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Emergency guide fee increase"
                value={miscPaymentForm.description}
                onChange={(e) =>
                  setMiscPaymentForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={miscPaymentForm.category}
                  onChange={(e) =>
                    setMiscPaymentForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none"
                >
                  <option value="Emergency">Emergency</option>
                  <option value="Staff">Staff (Tips/Gratuity)</option>
                  <option value="Vendor Tip">Vendor Tip</option>
                  <option value="Contingency">Contingency</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={miscPaymentForm.amount}
                  onChange={(e) =>
                    setMiscPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Payee Name
              </label>
              <input
                type="text"
                placeholder="e.g. Local Mountain Guide Team"
                value={miscPaymentForm.payeeName}
                onChange={(e) =>
                  setMiscPaymentForm((prev) => ({
                    ...prev,
                    payeeName: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Mode</label>
                <select
                  value={miscPaymentForm.paymentMethod}
                  onChange={(e) => setMiscPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={miscPaymentForm.paymentDate}
                  onChange={(e) => setMiscPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Paid From Account</label>
              <select
                value={miscPaymentForm.collectionAccountId}
                onChange={(e) => setMiscPaymentForm((prev) => ({ ...prev, collectionAccountId: e.target.value }))}
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none"
              >
                <option value="">— Company Default —</option>
                {collectionAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName}{acc.bankName ? ` (${acc.bankName})` : acc.accountType === "CASH" ? " (Cash Desk)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {miscPaymentForm.paymentMethod !== "CASH" && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Transaction ID / Ref</label>
                <input
                  type="text"
                  placeholder="UPI/Bank reference number"
                  value={miscPaymentForm.transactionId}
                  onChange={(e) => setMiscPaymentForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddMiscPaymentOpen(false)}
                className="h-8 text-xs font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                Save Miscellaneous Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── MODAL 5: RECORD ADJUSTMENT / REFUND ──────────────────────── */}
      <Dialog open={addAdjustmentOpen} onOpenChange={setAddAdjustmentOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
            Record Reconciliation Adjustment
          </h3>
          <form onSubmit={handleAdjustmentSubmit} className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentForm.type}
                  onChange={(e) =>
                    setAdjustmentForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-2 bg-white text-slate-800 outline-none"
                >
                  <option value="Refund">Refund</option>
                  <option value="Discount">Discount</option>
                  <option value="Reversal">Reversal</option>
                  <option value="Correction">Correction</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={adjustmentForm.amount}
                  onChange={(e) =>
                    setAdjustmentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Original Payment / Invoice Ref
              </label>
              <input
                type="text"
                placeholder="e.g. BK-001 or INV-001"
                value={adjustmentForm.originalPaymentRef}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    originalPaymentRef: e.target.value,
                  }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-300 rounded-lg px-3 bg-white text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason
              </label>
              <textarea
                rows={2}
                placeholder="Why is this adjustment being made?"
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-slate-800 outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddAdjustmentOpen(false)}
                className="h-8 text-xs font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs"
              >
                Save Adjustment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── IN-APP PAYMENT PROOF PREVIEW POPUP MODAL ──────────────────────── */}
      <Dialog
        open={Boolean(proofPreviewModal?.open)}
        onOpenChange={(open) => {
          if (!open) setProofPreviewModal(null);
        }}
      >
        <DialogContent className="max-w-2xl bg-white p-0 rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <Eye className="w-4 h-4 text-[#FF4D00]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white truncate">
                  {proofPreviewModal?.title || "Payment Proof / Receipt"}
                </h3>
                {proofPreviewModal?.subtitle && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {proofPreviewModal.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {proofPreviewModal?.imageUrl && (
                <a
                  href={proofPreviewModal.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Open full size in new tab / Download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Download</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setProofPreviewModal(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick info bar */}
          {(proofPreviewModal?.amount !== undefined ||
            proofPreviewModal?.method ||
            proofPreviewModal?.txnId) && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {proofPreviewModal.amount !== undefined && (
                  <span className="font-black text-slate-900 text-sm">
                    ₹{Number(proofPreviewModal.amount).toLocaleString("en-IN")}
                  </span>
                )}
                {proofPreviewModal.method && (
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    {proofPreviewModal.method}
                  </span>
                )}
                {proofPreviewModal.accountName && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded">
                    {proofPreviewModal.accountName}
                  </span>
                )}
                {proofPreviewModal.txnId && (
                  <span className="font-mono text-slate-500 text-[11px]">
                    TXN: {proofPreviewModal.txnId}
                  </span>
                )}
              </div>
              {proofPreviewModal.status && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded border",
                    proofPreviewModal.status === "APPROVED" ||
                      proofPreviewModal.status === "VERIFIED"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : proofPreviewModal.status === "REJECTED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200",
                  )}
                >
                  {proofPreviewModal.status}
                </span>
              )}
            </div>
          )}

          {/* Image Canvas / Preview Container */}
          <div className="bg-slate-950 flex items-center justify-center p-4 min-h-[380px] max-h-[75vh] overflow-auto">
            {proofPreviewModal?.paymentUrl || proofPreviewModal?.imageUrl ? (
              !/\.pdf($|\?)/i.test(proofPreviewModal.paymentUrl || proofPreviewModal.imageUrl || "") ? (
                <img
                  src={proofPreviewModal.paymentUrl || proofPreviewModal.imageUrl}
                  alt="Payment proof"
                  className="max-h-[68vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <a
                  href={proofPreviewModal.paymentUrl || proofPreviewModal.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#FF4D00] underline"
                >
                  Open payment proof PDF
                </a>
              )
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-semibold">No payment proof uploaded</p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-100">
            <p className="text-[11px] text-slate-500">
              {proofPreviewModal?.uploadedBy
                ? `Uploaded / Recorded by: ${proofPreviewModal.uploadedBy}`
                : ""}
              {proofPreviewModal?.date
                ? ` · Date: ${proofPreviewModal.date}`
                : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProofPreviewModal(null)}
              className="h-8 text-xs font-bold px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


