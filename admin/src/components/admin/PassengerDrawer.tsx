import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NormalizedPassenger, formatDOBForInput } from "@/utils/passengerUtils";
import { trainTicketService } from "@/services/trainTicket.service";
import ENV from "@/config/environment";
import {
  Save,
  User,
  Heart,
  MapPin,
  Train,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building,
  Tag,
} from "lucide-react";
import { PassengerTimeline } from "./PassengerTimeline";

interface PassengerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: NormalizedPassenger | null;
  booking: any;
  onSave: (passengerId: string, updatedData: Partial<NormalizedPassenger>) => void;
}

const getGenderSelectionTone = (gender: "M" | "F" | "O") => {
  if (gender === "F")
    return "border-red-200 bg-red-50 font-semibold text-red-700 shadow-2xs";
  if (gender === "M")
    return "border-sky-200 bg-sky-50 font-semibold text-sky-700 shadow-2xs";
  return "border-violet-200 bg-violet-50 font-semibold text-violet-700 shadow-2xs";
};

export function PassengerDrawer({
  isOpen,
  onClose,
  passenger,
  booking,
  onSave,
}: PassengerDrawerProps) {
  const [formData, setFormData] = useState<Partial<NormalizedPassenger>>({});
  const [activeTab, setActiveTab] = useState("profile");
  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view (Requirement 7)
  useEffect(() => {
    if (tabsListRef.current) {
      const activeEl = tabsListRef.current.querySelector('[data-state="active"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  }, [activeTab]);

  // Invalidate & reset state whenever selected passenger changes (Requirement 2)
  useEffect(() => {
    if (passenger) {
      setFormData({ ...passenger });
      setActiveTab("profile");
      setActiveStep(undefined);

      // Fetch real train tickets for this booking
      if (booking?.id) {
        trainTicketService
          .getTicketsByBooking(booking.id)
          .then((res) => setTickets(res || []))
          .catch(() => setTickets([]));
      }
    } else {
      setFormData({});
      setTickets([]);
    }
  }, [passenger?.id, booking?.id]);

  const handleChange = (field: keyof NormalizedPassenger, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!passenger) return;
    setIsSaving(true);
    try {
      await onSave(passenger.id, formData);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter train tickets matching this passenger name
  const passengerTickets = tickets.filter((t: any) => {
    if (!t.travelerName || !passenger?.name) return false;
    const pName = passenger.name.toLowerCase();
    const tName = t.travelerName.toLowerCase();
    return pName.includes(tName) || tName.includes(pName);
  });

  // Handle Document Upload via /api/upload/single
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingDoc(true);
    try {
      const newDocs: any[] = [];
      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append("image", file);

        const res = await fetch(`${ENV.API_BASE_URL}/api/upload/single`, {
          method: "POST",
          body: uploadData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          newDocs.push({
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: file.name,
            url: data.url,
            fileUrl: data.url,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          console.warn("Failed upload for file:", file.name, data.message);
        }
      }

      if (newDocs.length > 0) {
        const updatedDocs = [...(formData.documents || []), ...newDocs];
        setFormData((prev) => ({
          ...prev,
          documents: updatedDocs,
          aadhaarUrl: newDocs[newDocs.length - 1].url,
          idProofUrl: newDocs[newDocs.length - 1].url,
        }));
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleRemoveDoc = (docId: string) => {
    const updatedDocs = (formData.documents || []).filter((d: any) => d.id !== docId);
    setFormData((prev) => ({ ...prev, documents: updatedDocs }));
  };

  const paymentStatusText =
    booking?.paymentStatus || booking?.payment_status || "Pending";
  const isPaid =
    paymentStatusText === "Paid" ||
    paymentStatusText === "Completed" ||
    paymentStatusText === "completed" ||
    (booking?.remainingAmount !== undefined && booking.remainingAmount <= 0);

  if (!passenger && !isOpen) return null;

  // Aggregate all passenger documents from all available sources
  const allPassengerDocs = (() => {
    const list: any[] = [];
    const pId = String(passenger?.id || "");

    const getFullDocUrl = (url?: string, docId?: string) => {
      if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:"))) {
        return url;
      }
      if (url && url.startsWith("/")) {
        return `${ENV.API_BASE_URL}${url}`;
      }
      if (docId && booking?.id) {
        return `${ENV.API_BASE_URL}/api/bookings/${booking.id}/documents/${docId}`;
      }
      return url || "";
    };

    if (Array.isArray(formData.documents)) {
      formData.documents.forEach((d: any) => {
        if (d && (d.url || d.fileUrl || d.id)) {
          const finalUrl = getFullDocUrl(d.url || d.fileUrl, d.id);
          list.push({
            id: d.id || `doc-${d.url || Math.random()}`,
            title: d.title || d.originalFileName || "Aadhaar / ID Proof",
            url: finalUrl,
            fileUrl: finalUrl,
            mimeType: d.mimeType,
          });
        }
      });
    }

    if (Array.isArray(passenger?.documents)) {
      passenger.documents.forEach((d: any) => {
        if (d && (d.url || d.fileUrl || d.id)) {
          const finalUrl = getFullDocUrl(d.url || d.fileUrl, d.id);
          list.push({
            id: d.id || `pdoc-${d.url || Math.random()}`,
            title: d.title || d.originalFileName || "Aadhaar / ID Proof",
            url: finalUrl,
            fileUrl: finalUrl,
            mimeType: d.mimeType,
          });
        }
      });
    }

    if (Array.isArray((booking as any)?.documents)) {
      (booking as any).documents.forEach((d: any) => {
        if (
          String(d.passengerId) === pId ||
          (pId === "primary" && (!d.passengerId || d.passengerId === "primary" || d.passengerId === "main")) ||
          (pId === "main" && (!d.passengerId || d.passengerId === "primary" || d.passengerId === "main"))
        ) {
          const finalUrl = getFullDocUrl(d.url || d.fileUrl, d.id);
          list.push({
            id: d.id,
            title: d.originalFileName || d.title || "Aadhaar / ID Proof",
            url: finalUrl,
            fileUrl: finalUrl,
            mimeType: d.mimeType,
          });
        }
      });
    }

    const directIdUrl =
      (formData as any).aadhaarUrl ||
      (formData as any).idProofUrl ||
      (formData as any).idProof ||
      formData.aadhaar ||
      (passenger as any)?.aadhaarUrl ||
      (passenger as any)?.idProofUrl ||
      (passenger as any)?.idProof ||
      passenger?.aadhaar;

    if (
      directIdUrl &&
      typeof directIdUrl === "string" &&
      (directIdUrl.startsWith("http") || directIdUrl.startsWith("/") || directIdUrl.startsWith("data:"))
    ) {
      const finalUrl = getFullDocUrl(directIdUrl);
      list.push({
        id: `direct-idproof-${pId}`,
        title: "Aadhaar / ID Proof",
        url: finalUrl,
        fileUrl: finalUrl,
      });
    }

    return list.filter(
      (doc, idx, self) =>
        doc &&
        doc.url &&
        self.findIndex((d) => d.url === doc.url || (d.id && d.id === doc.id)) === idx,
    );
  })();

  const displayName = formData.name || passenger?.name || "Passenger";
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "P";

  const cardCls =
    "rounded-xl border border-[#E8EEF4] bg-white shadow-[0_1px_2px_rgba(11,21,40,0.04)]";
  const labelCls = "text-[11px] font-medium text-slate-500";
  const inputCls =
    "h-9 rounded-lg border-[#E8EEF4] bg-white px-3 text-xs shadow-none focus-visible:border-[#FF4D00] focus-visible:ring-2 focus-visible:ring-[#FF4D00]/15";
  const textareaCls =
    "rounded-lg border-[#E8EEF4] bg-white text-xs focus-visible:border-[#FF4D00] focus-visible:ring-2 focus-visible:ring-[#FF4D00]/15 focus-visible:ring-offset-0";
  const tabTriggerCls =
    "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528] data-[state=active]:bg-[#0B1528] data-[state=active]:text-white data-[state=active]:shadow-sm";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full max-h-[100dvh] w-full flex-col gap-0 overflow-hidden border-l border-[#E8EEF4] bg-[#F4F7FB] p-0 shadow-2xl sm:max-w-[560px] [&>button:last-of-type]:z-30 [&>button:last-of-type]:text-white/60 [&>button:last-of-type]:hover:text-white">
        <SheetHeader className="relative shrink-0 space-y-0 bg-[#0B1528] px-5 pb-4 pt-5 text-left">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FF4D00] via-[#FF8A3D] to-[#0B1528]" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-xs font-semibold tracking-wide text-white/90">
                {initials}
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[17px] font-semibold text-white">
                  {displayName}
                </SheetTitle>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/55">
                  <span>
                    {formData.formattedAgeGender ||
                      passenger?.formattedAgeGender ||
                      "Age not set"}
                  </span>
                  <span className="text-white/25">•</span>
                  <span className="font-mono">
                    {formData.phone || passenger?.phone || "No phone"}
                  </span>
                  {booking?.bookingId && (
                    <>
                      <span className="text-white/25">•</span>
                      <span className="font-mono">{booking.bookingId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="mr-8 h-8 shrink-0 gap-1.5 rounded-lg bg-[#FF4D00] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#E64500]"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* Stepper Timeline */}
        <div className={cn(cardCls, "px-3.5 pb-3.5 pt-3")}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-[#0B1528]">
              Readiness
            </h3>
            <span className="text-[10px] text-slate-400">
              Select a step for detail
            </span>
          </div>
          <PassengerTimeline
            passenger={{ ...formData, documents: allPassengerDocs } as NormalizedPassenger}
            booking={booking}
            activeStep={activeStep}
            onSelectStep={(stepIdx) => {
              setActiveStep((prev) => (prev === stepIdx ? undefined : stepIdx));
              // Switch relevant tab on step click
              if (stepIdx === 1) setActiveTab("docs");
              else if (stepIdx === 3) setActiveTab("train");
              else if (stepIdx === 4 || stepIdx === 5) setActiveTab("logistics");
              else if (stepIdx === 0) setActiveTab("profile");
            }}
          />
        </div>

        {/* Interactive Step Detail Card (Toggleable & Dismissible) */}
        {activeStep !== undefined && (
          <div className={cn(cardCls, "relative space-y-2 border-l-2 border-l-[#FF4D00]/50 p-3.5 text-xs")}>
            <button
              type="button"
              onClick={() => setActiveStep(undefined)}
              className="absolute right-2.5 top-2.5 rounded p-1 text-[11px] text-slate-400 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528]"
              title="Close step detail"
            >
              ✕
            </button>
            {activeStep === 0 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <ShieldCheck className="w-4 h-4 text-[#FF4D00]" /> Booking overview
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[11px] text-slate-500">
                  <div>Booking ID <span className="font-mono font-semibold text-[#0B1528]">{booking?.bookingId}</span></div>
                  <div>Status <span className="font-semibold text-green-700">{booking?.status}</span></div>
                  <div>Trip <span className="font-semibold text-[#0B1528]">{booking?.tripName || booking?.tripId}</span></div>
                  <div>Departure <span className="font-mono font-semibold text-[#0B1528]">{booking?.departureDate ? new Date(booking.departureDate).toLocaleDateString() : "Flexible"}</span></div>
                  <div>Travellers <span className="font-semibold text-[#0B1528]">{booking?.numberOfTravelers || 1} pax</span></div>
                  <div>Sales owner <span className="font-semibold text-[#0B1528]">{booking?.salesAdmin?.name || "Web Direct"}</span></div>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <FileText className="w-4 h-4 text-[#FF4D00]" /> ID proof & documents
                </h4>
                <p className="text-[11px] text-slate-500">
                  {allPassengerDocs.length > 0
                    ? `${allPassengerDocs.length} document(s) attached for this passenger.`
                    : "No documents uploaded yet for this passenger."}
                </p>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <CreditCard className="w-4 h-4 text-[#FF4D00]" /> Payment status
                </h4>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] px-2.5 py-2">
                    <span className="block text-[10px] font-medium text-slate-400">Total</span>
                    <span className="font-mono text-[13px] font-semibold text-[#0B1528]">₹{booking?.totalAmount || booking?.amount || 0}</span>
                  </div>
                  <div className="rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] px-2.5 py-2">
                    <span className="block text-[10px] font-medium text-slate-400">Paid</span>
                    <span className="font-mono text-[13px] font-semibold text-green-700">₹{booking?.advancePaid || 0}</span>
                  </div>
                  <div className="rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] px-2.5 py-2">
                    <span className="block text-[10px] font-medium text-slate-400">Due</span>
                    <span className="font-mono text-[13px] font-semibold text-[#FF4D00]">₹{booking?.remainingAmount || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <Train className="w-4 h-4 text-[#FF4D00]" /> Train tickets
                </h4>
                <div className="text-[11px] text-slate-500">
                  {passengerTickets.length > 0 ? (
                    <span>{passengerTickets.length} ticket(s) found for {formData.name || "passenger"}.</span>
                  ) : formData.trainDetails ? (
                    <span>Train PNR details: {formData.trainDetails}</span>
                  ) : booking?.trainTicketRequired === false || booking?.trainTicketStatus === "NOT_REQUIRED" ? (
                    <span className="flex items-center gap-1.5 font-medium text-green-700">
                      <CheckCircle2 className="inline w-3.5 h-3.5" /> No train ticket required for this journey.
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-medium text-[#9A3412]">
                      <AlertCircle className="inline w-3.5 h-3.5 text-[#FF4D00]" /> No passenger ticket issued yet — action required.
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <Building className="w-4 h-4 text-[#FF4D00]" /> Sharing & occupancy
                </h4>
                <p className="text-[11px] text-slate-500">
                  Type <span className="font-semibold text-[#0B1528]">{formData.roomSharing || "Triple Sharing"}</span>
                  {formData.sharingWith && (
                    <span className="mt-0.5 block">Sharing with <span className="font-semibold text-[#0B1528]">{formData.sharingWith}</span></span>
                  )}
                </p>
              </div>
            )}

            {activeStep === 5 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <MapPin className="w-4 h-4 text-[#FF4D00]" /> Transport & pickup
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5 text-[11px] text-slate-500">
                  <div>Vehicle <span className="font-semibold text-[#0B1528]">{formData.tempoAllocation || "Not assigned"}</span></div>
                  <div>Seat <span className="font-semibold text-[#0B1528]">{formData.seatNumber || "Unassigned"}</span></div>
                  <div className="col-span-2">Pickup point <span className="font-semibold text-[#0B1528]">{formData.pickupPoint || booking?.pickupCity || "TBD"}</span></div>
                </div>
              </div>
            )}

            {activeStep === 6 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <User className="w-4 h-4 text-[#FF4D00]" /> Guide assignment
                </h4>
                <p className="text-[11px] text-slate-500">
                  Trip captain <span className="font-semibold text-[#0B1528]">{booking?.guideName || booking?.tripRef?.guideAssignments?.[0]?.guideAdmin?.name || "Assigned closer to departure"}</span>
                </p>
              </div>
            )}

            {activeStep === 7 && (
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-[11px] font-semibold text-[#0B1528]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF4D00]" /> Departure readiness
                </h4>
                <p className="text-[11px] text-slate-500">
                  Derived from operational requirements: booking status, payment settlement, ID proof, transport, and guide assignment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            ref={tabsListRef}
            className={cn(
              cardCls,
              "mb-3 flex h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap p-1 scrollbar-none",
            )}
          >
            <TabsTrigger value="profile" className={tabTriggerCls}><User className="w-3.5 h-3.5"/> Profile</TabsTrigger>
            <TabsTrigger value="health" className={tabTriggerCls}><Heart className="w-3.5 h-3.5"/> Health</TabsTrigger>
            <TabsTrigger value="logistics" className={tabTriggerCls}><MapPin className="w-3.5 h-3.5"/> Logistics</TabsTrigger>
            <TabsTrigger value="train" className={tabTriggerCls}><Train className="w-3.5 h-3.5"/> Train</TabsTrigger>
            <TabsTrigger value="notes" className={tabTriggerCls}><FileText className="w-3.5 h-3.5"/> Notes</TabsTrigger>
            <TabsTrigger value="docs" className={tabTriggerCls}><CreditCard className="w-3.5 h-3.5"/> Documents</TabsTrigger>
          </TabsList>

          {/* 1. PROFILE TAB */}
          <TabsContent value="profile" className={cn(cardCls, "mt-0 space-y-4 p-4")}>
            <h4 className="text-[11px] font-semibold text-[#0B1528]">Personal details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Full name *</Label>
                <Input className={inputCls} value={formData.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Phone</Label>
                <Input className={cn(inputCls, "font-mono")} value={formData.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Email</Label>
                <Input className={inputCls} value={formData.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Date of birth</Label>
                <Input type="date" className={cn(inputCls, "font-mono")} value={formatDOBForInput(formData.dob) || ""} onChange={(e) => handleChange("dob", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className={labelCls}>Gender</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] p-1">
                  {[
                    { label: "Male", code: "M" as const, full: "Male" },
                    { label: "Female", code: "F" as const, full: "Female" },
                    { label: "Other", code: "O" as const, full: "Other" },
                  ].map((g) => {
                    const isSelected =
                      formData.gender === g.code ||
                      formData.genderFull?.toLowerCase() === g.full.toLowerCase();
                    return (
                      <button
                        key={g.code}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            gender: g.code,
                            genderFull: g.full,
                            formattedAgeGender: `${prev.age !== null && prev.age !== undefined ? prev.age + "y" : "N/A"} / ${g.code}`,
                          }));
                        }}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-center text-xs font-medium transition-all",
                          isSelected
                            ? `border ${getGenderSelectionTone(g.code)}`
                            : "text-slate-500 hover:bg-white/70 hover:text-[#0B1528]",
                        )}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className={labelCls}>Food preference</Label>
                <Input className={inputCls} value={formData.foodPreference || ""} onChange={(e) => handleChange("foodPreference", e.target.value)} placeholder="e.g. Normal food, Jain food" />
              </div>
            </div>
          </TabsContent>

          {/* 2. HEALTH TAB */}
          <TabsContent value="health" className={cn(cardCls, "mt-0 space-y-3.5 p-4")}>
            <h4 className="text-[11px] font-semibold text-[#0B1528]">Health & emergency</h4>
            <div className="space-y-1.5">
              <Label className={labelCls}>Emergency contact (name & number)</Label>
              <Input className={inputCls} value={formData.emergencyContact || ""} onChange={(e) => handleChange("emergencyContact", e.target.value)} placeholder="e.g. Parent name (9876543210)" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Medical conditions, allergies or physical requirements</Label>
              <Textarea className={textareaCls} value={formData.medicalConditions || ""} onChange={(e) => handleChange("medicalConditions", e.target.value)} rows={4} placeholder="e.g. Asthma, peanut allergy, low BP" />
            </div>
          </TabsContent>

          {/* 3. LOGISTICS TAB */}
          <TabsContent value="logistics" className={cn(cardCls, "mt-0 space-y-3.5 p-4")}>
            <h4 className="text-[11px] font-semibold text-[#0B1528]">Rooming & transport</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Sharing type (occupancy)</Label>
                <select 
                  className="flex h-9 w-full rounded-lg border border-[#E8EEF4] bg-white px-3 py-1 text-xs font-medium text-[#0B1528] focus:border-[#FF4D00] focus:outline-none"
                  value={formData.roomSharing || "Triple Sharing"} 
                  onChange={(e) => handleChange("roomSharing", e.target.value)}
                >
                  <option value="Single Sharing">Single Sharing</option>
                  <option value="Double Sharing">Double Sharing</option>
                  <option value="Triple Sharing">Triple Sharing</option>
                  <option value="Quad Sharing">Quad Sharing</option>
                  <option value="Family Sharing">Family Sharing</option>
                  <option value="Dormitory">Dormitory</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Sharing with (partners)</Label>
                <Input className={inputCls} placeholder="e.g. Rahul, Amit" value={formData.sharingWith || ""} onChange={(e) => handleChange("sharingWith", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Tempo / vehicle</Label>
                <Input className={inputCls} placeholder="e.g. Tempo 1" value={formData.tempoAllocation || ""} onChange={(e) => handleChange("tempoAllocation", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Seat number</Label>
                <Input className={cn(inputCls, "font-mono")} placeholder="e.g. 4B" value={formData.seatNumber || ""} onChange={(e) => handleChange("seatNumber", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className={labelCls}>Pickup point</Label>
                <Input className={inputCls} value={formData.pickupPoint || booking?.pickupCity || ""} onChange={(e) => handleChange("pickupPoint", e.target.value)} placeholder="e.g. Ahmedabad / Gandhinagar" />
              </div>
            </div>
          </TabsContent>

          {/* 4. TRAIN TAB */}
          <TabsContent value="train" className={cn(cardCls, "mt-0 space-y-3.5 p-4")}>
            {passengerTickets.length > 0 ? (
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-semibold text-[#0B1528]">Issued train tickets</h4>
                {passengerTickets.map((t: any) => (
                  <div key={t.id} className="space-y-1.5 rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0B1528]">{t.trainName || "Train"} ({t.trainNumber || "N/A"})</span>
                      <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B1528] shadow-2xs">
                        {t.ticketStatus}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>PNR <strong className="font-mono font-semibold text-[#0B1528]">{t.pnr || "—"}</strong></span>
                      <span className="text-[10px] text-slate-400">{t.passengerReference || "Journey"}</span>
                    </div>
                    {t.sourceStation && (
                      <div className="text-[10px] text-slate-400">
                        {t.sourceStation} &rarr; {t.destinationStation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : booking?.trainTicketRequired === false || booking?.trainTicketStatus === "NOT_REQUIRED" ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/70 p-3 text-xs font-medium text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                No train ticket required for this journey.
              </div>
            ) : (
              <div className="space-y-1 rounded-lg border border-[#FF4D00]/20 bg-[#FF4D00]/[0.06] p-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#9A3412]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FF4D00]" />
                  Action required
                </div>
                <p className="pl-6 text-[11px] text-[#9A3412]/80">
                  No passenger-specific ticket has been issued yet.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={labelCls}>Train details & PNR</Label>
              <Input className={cn(inputCls, "font-mono")} value={formData.trainDetails || ""} onChange={(e) => handleChange("trainDetails", e.target.value)} placeholder="e.g. PNR 1234567890 (Confirmed)" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Activity / tour add-on selection</Label>
              <Textarea className={textareaCls} value={formData.activitySelection || ""} onChange={(e) => handleChange("activitySelection", e.target.value)} placeholder="e.g. Scuba, paragliding, rafting" />
            </div>
          </TabsContent>

          {/* 5. NOTES TAB */}
          <TabsContent value="notes" className={cn(cardCls, "mt-0 space-y-3.5 p-4")}>
            <div className="space-y-1.5">
              <Label className={labelCls}>Passenger remarks (visible on operations manifest)</Label>
              <Textarea className={textareaCls} value={formData.remarks || ""} onChange={(e) => handleChange("remarks", e.target.value)} placeholder="e.g. Needs lower berth, prefers veg meals" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Internal notes (admin & team only)</Label>
              <Textarea className={cn(textareaCls, "border-[#FF4D00]/20 bg-[#FF4D00]/[0.04]")} value={formData.internalNotes || ""} onChange={(e) => handleChange("internalNotes", e.target.value)} placeholder="e.g. Customer requested special follow-up" rows={3} />
            </div>
          </TabsContent>

          {/* 6. DOCUMENTS TAB */}
          <TabsContent value="docs" className={cn(cardCls, "mt-0 space-y-3.5 p-4")}>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] font-semibold text-[#0B1528]">Documents & ID proof</Label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0B1528] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-[#0B1528]/90">
                {uploadingDoc ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Upload document
                <input type="file" accept="image/*,.pdf" className="hidden" multiple onChange={handleFileUpload} />
              </label>
            </div>

            {uploadingDoc && (
              <div className="flex animate-pulse items-center gap-1.5 text-[11px] font-medium text-[#9A3412]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading file to server...
              </div>
            )}

            {allPassengerDocs.length > 0 ? (
              <div className="space-y-2">
                {allPassengerDocs.map((doc: any) => {
                  const docUrl = doc.url || doc.fileUrl;
                  const isPdf = docUrl?.toLowerCase().includes(".pdf") || doc.mimeType?.includes("pdf");
                  return (
                    <div key={doc.id || docUrl} className="flex items-center justify-between rounded-lg border border-[#E8EEF4] bg-[#F4F7FB] p-2.5 text-xs transition-colors hover:border-[#FF4D00]/25">
                      <div
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden"
                        onClick={() => setPreviewModalDoc({ url: docUrl, title: doc.title || "Aadhaar / ID Proof" })}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FF4D00]/10 text-[#FF4D00]">
                          <CreditCard className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate font-medium text-[#0B1528] hover:text-[#FF4D00]">{doc.title || "Aadhaar / ID Proof"}</span>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewModalDoc({ url: docUrl, title: doc.title || "Aadhaar / ID Proof" })}
                          className="flex items-center gap-1 rounded-md border border-[#E8EEF4] bg-white px-2 py-1 text-[10px] font-semibold text-[#0B1528] transition-colors hover:border-[#FF4D00]/30 hover:text-[#FF4D00]"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </button>
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-[#0B1528]"
                          title="Open in new tab"
                        >
                          ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="px-1.5 py-0.5 text-slate-400 transition-colors hover:text-red-600"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#E8EEF4] bg-[#F4F7FB] p-5 text-center text-[11px] text-slate-400">
                No documents uploaded yet. Use “Upload document” to add an Aadhaar or ID proof.
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>

        {/* In-drawer Document Preview Modal */}
        {previewModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1528]/70 p-4 backdrop-blur-xs">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#E8EEF4] bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#E8EEF4] bg-[#F4F7FB] p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <CreditCard className="w-4 h-4 shrink-0 text-[#FF4D00]" />
                  <span className="truncate text-sm font-semibold text-[#0B1528]">{previewModalDoc.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={previewModalDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-[#E8EEF4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0B1528] transition-colors hover:border-[#FF4D00]/30 hover:text-[#FF4D00]"
                  >
                    Open original <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewModalDoc(null)}
                    className="px-2 py-0.5 text-base text-slate-400 transition-colors hover:text-[#0B1528]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-[#F4F7FB] p-4">
                {previewModalDoc.url.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={previewModalDoc.url}
                    className="h-[500px] w-full rounded-lg border border-[#E8EEF4] bg-white"
                    title={previewModalDoc.title}
                  />
                ) : (
                  <img
                    src={previewModalDoc.url}
                    alt={previewModalDoc.title}
                    className="max-h-[500px] max-w-full object-contain rounded shadow-xs"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

