import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { GlassCard } from "@/components/admin/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  ChevronRight,
  MessageCircle as WhatsAppIcon,
  Copy,
  ExternalLink,
  Send,
  Loader2,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  BadgePercent,
  Clock,
  Hotel as HotelIcon,
  Sparkles,
  Train,
  Car,
  Plane,
  Ship,
  MapPin as PickupIcon,
  Bus,
  Upload,
  Check,
  Eye,
  Tag,
  UserCheck,
  Share2,
  Compass,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { quotationsService } from "@/services/quotations.service";
import { Quotation } from "@/types";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { ENV } from "@/config/environment";

const formatUrl = (url: any): string => {
  if (!url || typeof url !== "string") return "";
  if (
    url.startsWith("http") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  )
    return url;
  const apiBase = api.defaults.baseURL || "https://api.youthcamping.online/api";
  const serverBase = apiBase.replace("/api", "");
  return `${serverBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function QuotationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== "new";

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [hotelTierTab, setHotelTierTab] = useState<"standard" | "luxury">("standard");

  const [formData, setFormData] = useState<Partial<Quotation>>({
    id: uuidv4(),
    status: "Draft",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    tripTitle: "",
    destination: "",
    duration: "",
    travelDates: { from: "", to: "" },
    pax: 2,
    totalPrice: 0,
    discount: 0,
    finalPrice: 0,
    overview: "",
    itinerary: [],
    inclusions: [],
    exclusions: [],
    coverImage: "",
    heroImages: [],
    experiencePhotos: [],
    lowLevelHotels: [],
    highLevelHotels: [],
    staySummary: [],
    roomsInfo: "Double / Triple Sharing with Attached Washrooms",
    mealsInfo: "Breakfast & Dinner Included (MAP Plan)",
    travelling: [],
    expiryHours: 48,
    expert: {
      name: "Zeel Panchal",
      whatsapp: "918866699409",
      phone: "918866699409",
      designation: "YOUTHCAMPING Destination Expert",
      photo: "",
      avatar: "",
      description: "I'll guide you through your journey, customize your stays, and provide end-to-end trip support on WhatsApp.",
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      quotationsService
        .getById(id)
        .then((data) => {
          if (data) {
            setFormData((prev) => ({
              ...prev,
              ...data,
              expert: {
                name: data.expert?.name || prev.expert?.name || "Zeel Panchal",
                designation:
                  data.expert?.designation ||
                  prev.expert?.designation ||
                  "YOUTHCAMPING Destination Expert",
                whatsapp:
                  data.expert?.whatsapp ||
                  data.expert?.phone ||
                  prev.expert?.whatsapp ||
                  "918866699409",
                phone:
                  data.expert?.phone ||
                  data.expert?.whatsapp ||
                  prev.expert?.phone ||
                  "918866699409",
                photo: data.expert?.photo || data.expert?.avatar || "",
                avatar: data.expert?.avatar || data.expert?.photo || "",
                description:
                  data.expert?.description ||
                  prev.expert?.description ||
                  "I'll guide you through your journey, customize your stays, and provide end-to-end trip support on WhatsApp.",
              },
              lowLevelHotels: Array.isArray(data.lowLevelHotels)
                ? data.lowLevelHotels
                : [],
              highLevelHotels: Array.isArray(data.highLevelHotels)
                ? data.highLevelHotels
                : [],
              itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
              inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
              exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
              heroImages: Array.isArray(data.heroImages) ? data.heroImages : [],
              mealsInfo:
                data.mealsInfo ||
                prev.mealsInfo ||
                "Breakfast & Dinner Included (MAP Plan)",
              roomsInfo:
                data.roomsInfo ||
                prev.roomsInfo ||
                "Double / Triple Sharing with Attached Washrooms",
            }));
          }
          setLoading(false);
        })
        .catch(() => {
          toast.error("Failed to load quotation");
          navigate("/admin/quotations");
        });
    }
  }, [id, isEdit, navigate]);

  useEffect(() => {
    if (!isEdit) {
      const query = new URLSearchParams(window.location.search);
      const name = query.get("name") || "";
      const phone = query.get("phone") || "";
      const email = query.get("email") || "";
      const destination = query.get("destination") || "";

      const daysData = query.get("days");
      let initialItinerary: any[] = [];
      if (daysData) {
        try {
          const parsedDays = JSON.parse(decodeURIComponent(daysData));
          if (Array.isArray(parsedDays)) {
            initialItinerary = parsedDays.map((day: any, index: number) => ({
              id: uuidv4(),
              day: index + 1,
              title: day.location || `Day ${index + 1} Itinerary`,
              description: `${day.activity || ""}. Route: ${day.transfers || ""}`,
              meals: day.meals?.join(", ") || "B",
              stay: day.hotel || "Selected Stay",
              photos: [],
            }));
          }
        } catch (e) {
          console.error("Failed to parse itinerary days", e);
        }
      }

      if (
        name ||
        phone ||
        email ||
        destination ||
        initialItinerary.length > 0
      ) {
        setFormData((prev) => ({
          ...prev,
          customerName: name || prev.customerName,
          customerPhone: phone || prev.customerPhone,
          customerEmail: email || prev.customerEmail,
          destination: destination || prev.destination,
          tripTitle: destination
            ? `${destination} Tour Package`
            : prev.tripTitle,
          itinerary:
            initialItinerary.length > 0 ? initialItinerary : prev.itinerary,
        }));
      }
    }
  }, [isEdit]);

  // Auto-calculate final price
  useEffect(() => {
    const total = Number(formData.lowLevelPrice) || 0;
    const discount = Number(formData.discount) || 0;
    setFormData((prev) => {
      if (prev.totalPrice === total && prev.finalPrice === total - discount) {
        return prev;
      }
      return {
        ...prev,
        totalPrice: total,
        finalPrice: parseFloat((total - discount).toFixed(2)),
      };
    });
  }, [formData.lowLevelPrice, formData.discount]);

  const handleExtend = async () => {
    try {
      const res = await quotationsService.extend(formData.id!, 48);
      setFormData((prev) => ({ ...prev, expiresAt: res.expiresAt }));
      toast.success("Validity extended by 48 hours");
    } catch (error) {
      toast.error("Failed to extend validity");
    }
  };

  const handleSave = async (status: "Draft" | "Published" = "Draft") => {
    setIsSaving(true);
    try {
      if (!formData.customerName || !formData.tripTitle) {
        toast.error("Please fill in client name and proposal title");
        return;
      }

      const payload = {
        ...formData,
        status,
        slug:
          formData.slug ||
          formData.tripTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") +
            "-" +
            Math.random().toString(36).substring(2, 7),
      };

      const saved = await quotationsService.save(payload);
      setFormData(saved);
      toast.success(
        status === "Published"
          ? "Quotation Published Live!"
          : "Draft Saved Successfully",
      );
      if (!isEdit) navigate(`/admin/quotations/${saved.id}`);
    } catch (error: any) {
      toast.error("Failed to save quotation");
    } finally {
      setIsSaving(false);
    }
  };

  const getPublicQuoteUrl = () => {
    let baseUrl = ENV.FRONTEND_URL;
    if (
      typeof window !== "undefined" &&
      window.location.hostname.includes("localhost")
    ) {
      baseUrl = "http://localhost:3000";
    }
    const target = formData.slug || formData.id || "quote";
    const isDraft = formData.status?.toLowerCase() === "draft";
    const tokenPart =
      isDraft && formData.shareToken ? `?token=${formData.shareToken}` : "";
    return `${baseUrl}/quote/${target}${tokenPart}`;
  };

  const copyLink = () => {
    const url = getPublicQuoteUrl();
    navigator.clipboard.writeText(url);
    toast.success("Public quotation link copied to clipboard!");
  };

  const sendWhatsApp = () => {
    const quoteLink = getPublicQuoteUrl();
    const message = `Hi ${formData.customerName},

Greetings from YOUTHCAMPING Experiences!

We've prepared your customized travel proposal for ${formData.tripTitle || "your upcoming trip"}.

View your quotation here:
${quoteLink}

Best regards,
${formData.expert?.name || "YOUTHCAMPING Team"}
${formData.expert?.designation || "Destination Expert"}`;

    const encoded = encodeURIComponent(message);
    window.open(
      `https://wa.me/${formData.customerPhone}?text=${encoded}`,
      "_blank",
    );
  };

  const addItineraryDay = () => {
    const newDay = {
      id: uuidv4(),
      day: (formData.itinerary?.length || 0) + 1,
      title: `Day ${(formData.itinerary?.length || 0) + 1} - ${formData.destination || "Destination"} Exploration`,
      description: "",
      meals: "B, D",
      stay: "Selected Stay",
      photos: [],
    };
    setFormData({
      ...formData,
      itinerary: [...(formData.itinerary || []), newDay as any],
    });
  };

  const addHotel = (tier: "standard" | "luxury") => {
    const field = tier === "standard" ? "lowLevelHotels" : "highLevelHotels";
    const currentList = Array.isArray(formData[field]) ? formData[field]! : [];
    const newHotel = {
      id: uuidv4(),
      name: "",
      location: formData.destination || "",
      stars: tier === "standard" ? 3 : 4,
      rating: tier === "standard" ? 3 : 4,
      roomType: tier === "standard" ? "Deluxe Valley View Room" : "Executive Suite / Premium Cottage",
      meals: "Breakfast & Dinner Included",
      image: "",
      amenities: ["Mountain View", "WiFi", "Geyser", "Room Heater"],
    };
    setFormData({
      ...formData,
      [field]: [...currentList, newHotel],
    });
  };

  const updateHotel = (tier: "standard" | "luxury", idx: number, key: string, value: any) => {
    const field = tier === "standard" ? "lowLevelHotels" : "highLevelHotels";
    const currentList = [...(Array.isArray(formData[field]) ? formData[field]! : [])];
    if (currentList[idx]) {
      currentList[idx] = { ...currentList[idx], [key]: value };
      setFormData({ ...formData, [field]: currentList });
    }
  };

  const deleteHotel = (tier: "standard" | "luxury", idx: number) => {
    const field = tier === "standard" ? "lowLevelHotels" : "highLevelHotels";
    const currentList = [...(Array.isArray(formData[field]) ? formData[field]! : [])];
    currentList.splice(idx, 1);
    setFormData({ ...formData, [field]: currentList });
  };

  const autoPopulateHotelsFromItinerary = () => {
    if (!formData.itinerary || formData.itinerary.length === 0) {
      toast.error("Please add days to the itinerary first");
      return;
    }
    const standardList: any[] = [];
    const luxuryList: any[] = [];
    const uniqueStays = new Set<string>();

    formData.itinerary.forEach((d: any) => {
      const stayName = (d.stay || "").trim();
      if (stayName && stayName.toLowerCase() !== "selected stay" && !uniqueStays.has(stayName.toLowerCase())) {
        uniqueStays.add(stayName.toLowerCase());
        standardList.push({
          id: uuidv4(),
          name: stayName,
          location: d.title ? d.title.split("-")[0].trim() : formData.destination || "",
          stars: 3,
          rating: 3,
          roomType: "Deluxe Valley View Room",
          meals: d.meals || "Breakfast & Dinner Included",
          image: d.photos?.[0] || "",
          amenities: ["Mountain View", "Geyser", "WiFi", "Room Service"],
        });
        luxuryList.push({
          id: uuidv4(),
          name: `${stayName} (Premium / Luxury Wing)`,
          location: d.title ? d.title.split("-")[0].trim() : formData.destination || "",
          stars: 4,
          rating: 4,
          roomType: "Executive Suite / Luxury Cottage",
          meals: "All Meals Included (Buffet)",
          image: d.photos?.[0] || "",
          amenities: ["Panoramic View", "Heated Rooms", "WiFi", "Bonfire", "Spa / Jacuzzi"],
        });
      }
    });

    if (standardList.length === 0) {
      standardList.push({
        id: uuidv4(),
        name: `${formData.destination || "Mountain"} Resort & Spa`,
        location: formData.destination || "Destination",
        stars: 3,
        rating: 3,
        roomType: "Deluxe Valley View Room",
        meals: "Breakfast & Dinner Included",
        image: "",
        amenities: ["Mountain View", "Geyser", "WiFi", "Room Service"],
      });
      luxuryList.push({
        id: uuidv4(),
        name: `Grand ${formData.destination || "Mountain"} Luxury Retreat`,
        location: formData.destination || "Destination",
        stars: 5,
        rating: 5,
        roomType: "Luxury Suite with Balcony",
        meals: "All Meals Included (Buffet)",
        image: "",
        amenities: ["Panoramic Mountain View", "Heated Pool / Jacuzzi", "WiFi", "Bonfire", "Butler Service"],
      });
    }

    setFormData((prev) => ({
      ...prev,
      lowLevelHotels: standardList,
      highLevelHotels: luxuryList,
    }));
    toast.success(`Generated ${standardList.length} hotels from itinerary`);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4541A]" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Proposal Details...
        </p>
      </div>
    );

  return (
    <div className="admin-page pb-32">
      {/* Top Navigation & Action Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-40">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/quotations")}
            className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0B1528] tracking-tight">
                {isEdit ? "Refine Proposal" : "Compose New Quotation"}
              </h1>
              <span
                className={cn(
                  "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border",
                  formData.status === "Published"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200",
                )}
              >
                {formData.status || "Draft"}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Build client-facing interactive travel itineraries with standard &
              luxury pricing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {formData.slug && (
            <>
              <Button
                variant="outline"
                onClick={copyLink}
                className="h-8 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={14} className="text-green-600" /> Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(getPublicQuoteUrl(), "_blank");
                }}
                className="h-8 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={14} className="text-[#D4541A]" /> Preview
              </Button>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => handleSave("Draft")}
            disabled={isSaving}
            className="h-8 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save Draft
          </Button>

          <Button
            onClick={() => handleSave("Published")}
            disabled={isSaving}
            className="h-10 px-6 rounded-xl bg-[#D4541A] hover:bg-[#c24813] text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 transition-all"
          >
            <CheckCircle2 size={16} /> Publish Proposal
          </Button>
        </div>
      </div>

      {/* Main Form Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Form Sections) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Guest & Client Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-[#FF4D00]/5 text-[#D4541A] flex items-center justify-center font-bold">
                <Users size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B1528]">
                  Guest & Client Details
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Primary guest information for quotation delivery
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Guest Name *
                </Label>
                <Input
                  value={formData.customerName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="e.g. Rahul Mehta"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  WhatsApp / Contact Number *
                </Label>
                <Input
                  value={formData.customerPhone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  placeholder="e.g. 919876543210"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] font-bold text-slate-500">
                  Email Address
                </Label>
                <Input
                  value={formData.customerEmail || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  placeholder="guest@example.com"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Trip & Itinerary Basics */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B1528]">
                  Trip & Itinerary Basics
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Destination, duration, and group composition
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[11px] font-bold text-slate-500">
                  Proposal Title *
                </Label>
                <Input
                  value={formData.tripTitle || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, tripTitle: e.target.value })
                  }
                  placeholder="e.g. Spiti Valley Adventure Package"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-bold text-[#0B1528]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Destination / Region
                </Label>
                <Input
                  value={formData.destination || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  placeholder="e.g. Kaza, Himachal Pradesh"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Duration (Nights / Days)
                </Label>
                <Input
                  value={formData.duration || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  placeholder="e.g. 7 Days / 6 Nights"
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={formData.travelDates?.from || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      travelDates: {
                        ...formData.travelDates!,
                        from: e.target.value,
                      },
                    })
                  }
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={formData.travelDates?.to || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      travelDates: {
                        ...formData.travelDates!,
                        to: e.target.value,
                      },
                    })
                  }
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Passenger Count (PAX)
                </Label>
                <Input
                  type="number"
                  value={formData.pax}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pax: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Package Pricing & Investment Tiers */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                  <BadgePercent size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B1528]">
                    Package Pricing & Tiers
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    Configure standard and luxury package prices
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard Tier */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <Label className="text-xs font-extrabold text-slate-700">
                    Standard Tier Price
                  </Label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.lowLevelPrice || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowLevelPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-11 pl-8 bg-white border-slate-200 rounded-xl font-black text-base text-[#0B1528]"
                  />
                </div>
              </div>

              {/* Luxury Tier */}
              <div className="p-4 bg-gradient-to-br from-[#0B1329] to-[#1E293B] rounded-2xl border border-slate-800 text-white space-y-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <Label className="text-xs font-extrabold text-amber-300">
                    Luxury Tier Upgrade Price
                  </Label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.highLevelPrice || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        highLevelPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-11 pl-8 bg-white/10 border-white/20 rounded-xl font-black text-base text-white focus:bg-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Universal Discount (Flat Off)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-10 pl-8 bg-slate-50/70 border-slate-200 rounded-xl font-extrabold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500">
                  Effective Net Price
                </Label>
                <div className="h-10 flex items-center px-4 bg-green-50 text-green-700 rounded-xl font-extrabold text-xs border border-green-200">
                  Final Standard: ₹
                  {(
                    (formData.lowLevelPrice || 0) - (formData.discount || 0)
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Overview & Highlights */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <Label className="text-xs font-extrabold text-[#0B1528]">
              Trip Overview & Highlights
            </Label>
            <Textarea
              value={formData.overview}
              onChange={(e) =>
                setFormData({ ...formData, overview: e.target.value })
              }
              placeholder="Briefly describe the key attractions, landscape, and experience of this journey..."
              className="min-h-[120px] bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl p-4 text-xs font-medium leading-relaxed"
            />
          </div>

          {/* Section 5: Day-by-Day Itinerary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-[#0B1528]">
                Day-by-Day Detailed Itinerary
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItineraryDay}
                className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-slate-50 cursor-pointer"
              >
                <Plus size={14} className="mr-1" /> Add Day
              </Button>
            </div>

            <div className="space-y-4">
              {formData.itinerary?.map((day: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={day.id || idx}
                  className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4 relative group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const newList = [...formData.itinerary!];
                      newList.splice(idx, 1);
                      setFormData({ ...formData, itinerary: newList });
                    }}
                    className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-white flex items-center justify-center text-slate-400 hover:text-red-600 shadow-2xs border border-slate-200 transition-all cursor-pointer"
                    title="Delete Day"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center gap-3 pr-10">
                    <div className="w-10 h-10 bg-[#D4541A] text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      D{idx + 1}
                    </div>
                    <Input
                      value={day.title}
                      onChange={(e) => {
                        const newList = [...formData.itinerary!];
                        newList[idx].title = e.target.value;
                        setFormData({ ...formData, itinerary: newList });
                      }}
                      placeholder="Day Title (e.g. Arrival in Manali & Local Sightseeing)"
                      className="bg-white border-slate-200 rounded-xl h-10 font-extrabold text-xs text-[#0B1528]"
                    />
                  </div>

                  <Textarea
                    value={day.description}
                    onChange={(e) => {
                      const newList = [...formData.itinerary!];
                      newList[idx].description = e.target.value;
                      setFormData({ ...formData, itinerary: newList });
                    }}
                    placeholder="Describe the day's activities, transfer points, and sightseeing spots..."
                    className="bg-white rounded-xl p-3.5 text-xs min-h-[90px] border-slate-200 font-medium leading-relaxed"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">
                        Meals Provided
                      </Label>
                      <Input
                        value={day.meals}
                        onChange={(e) => {
                          const newList = [...formData.itinerary!];
                          newList[idx].meals = e.target.value;
                          setFormData({ ...formData, itinerary: newList });
                        }}
                        placeholder="e.g. Breakfast, Dinner"
                        className="rounded-xl h-9 bg-white border-slate-200 text-xs font-semibold px-3"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">
                        Overnight Hotel / Stay
                      </Label>
                      <Input
                        value={day.stay}
                        onChange={(e) => {
                          const newList = [...formData.itinerary!];
                          newList[idx].stay = e.target.value;
                          setFormData({ ...formData, itinerary: newList });
                        }}
                        placeholder="e.g. Snow Valley Resort"
                        className="rounded-xl h-9 bg-white border-slate-200 text-xs font-semibold px-3"
                      />
                    </div>
                  </div>

                  {/* Day Highlights & Sightseeing Photos */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <ImageIcon size={12} className="text-[#D4541A]" /> Day Photos & Sightseeing Highlights
                      </Label>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(day.photos || (day.image ? [day.image] : [])).length} Photos
                      </span>
                    </div>
                    <ImageUpload
                      value={day.photos || (day.image ? [day.image] : [])}
                      onChange={(urls) => {
                        const newList = [...formData.itinerary!];
                        newList[idx].photos = urls;
                        newList[idx].image = urls[0] || "";
                        setFormData({ ...formData, itinerary: newList });
                      }}
                      maxFiles={6}
                      multiple={true}
                      compact={false}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Section 6: Hotels & Stays (Accommodation Details) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF4D00]/5 text-[#D4541A] flex items-center justify-center font-bold">
                  <HotelIcon size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B1528]">
                    Hotels & Accommodations (Stay Details)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure properties, room types, meal plans, and amenities per tier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoPopulateHotelsFromItinerary}
                  className="h-8 px-3 rounded-lg border-[#FF4D00]/30 bg-[#FF4D00]/5/50 text-[#D4541A] font-extrabold text-xs hover:bg-[#FF4D00]/10 cursor-pointer"
                  title="Extract unique hotel names from itinerary days"
                >
                  <Sparkles size={13} className="mr-1.5" /> Auto-Sync from Itinerary
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addHotel(hotelTierTab)}
                  className="h-8 px-3 rounded-lg bg-[#0B1528] text-white font-extrabold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  <Plus size={14} className="mr-1" /> Add Stay
                </Button>
              </div>
            </div>

            {/* General Stay & Meals Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600">
                  Included Meals Plan
                </Label>
                <Input
                  value={formData.mealsInfo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, mealsInfo: e.target.value })
                  }
                  placeholder="e.g. Breakfast & Dinner Included (MAP Plan)"
                  className="h-9 bg-white border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600">
                  Room Configuration & Sharing
                </Label>
                <Input
                  value={formData.roomsInfo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, roomsInfo: e.target.value })
                  }
                  placeholder="e.g. Double / Triple Sharing with Attached Bath"
                  className="h-9 bg-white border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* Tier Switcher Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setHotelTierTab("standard")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                  hotelTierTab === "standard"
                    ? "bg-white text-[#0B1528] shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                Standard Stays ({(formData.lowLevelHotels || []).length})
              </button>
              <button
                type="button"
                onClick={() => setHotelTierTab("luxury")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                  hotelTierTab === "luxury"
                    ? "bg-[#D4541A] text-white shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                Luxury Upgrade Stays ({(formData.highLevelHotels || []).length})
              </button>
            </div>

            {/* Hotels List for Current Tier */}
            <div className="space-y-4">
              {((hotelTierTab === "standard"
                ? formData.lowLevelHotels
                : formData.highLevelHotels) || []).length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                  <HotelIcon size={28} className="mx-auto text-slate-300" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-700">
                      No {hotelTierTab === "standard" ? "Standard" : "Luxury"} Stays Added Yet
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Add hotels manually or click "Auto-Sync from Itinerary" to generate stay cards.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addHotel(hotelTierTab)}
                    className="h-8 text-xs font-extrabold rounded-lg border-slate-200 cursor-pointer"
                  >
                    <Plus size={14} className="mr-1" /> Add First Stay
                  </Button>
                </div>
              ) : (
                ((hotelTierTab === "standard"
                  ? formData.lowLevelHotels
                  : formData.highLevelHotels) || []).map((hotel: any, hIdx: number) => (
                  <div
                    key={hotel.id || hIdx}
                    className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4 relative group"
                  >
                    <button
                      type="button"
                      onClick={() => deleteHotel(hotelTierTab, hIdx)}
                      className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-white flex items-center justify-center text-slate-400 hover:text-red-600 shadow-2xs border border-slate-200 transition-all cursor-pointer"
                      title="Delete Hotel"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pr-10">
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Hotel / Property Name *
                        </Label>
                        <Input
                          value={hotel.name || ""}
                          onChange={(e) =>
                            updateHotel(hotelTierTab, hIdx, "name", e.target.value)
                          }
                          placeholder="e.g. Snow Valley Resort / Grand Retreat"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-extrabold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Location / City
                        </Label>
                        <Input
                          value={hotel.location || ""}
                          onChange={(e) =>
                            updateHotel(hotelTierTab, hIdx, "location", e.target.value)
                          }
                          placeholder="e.g. Manali / Kaza / Shimla"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Category / Star Rating
                        </Label>
                        <select
                          value={hotel.stars || hotel.rating || 3}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 3;
                            updateHotel(hotelTierTab, hIdx, "stars", val);
                            updateHotel(hotelTierTab, hIdx, "rating", val);
                          }}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold px-3 text-slate-800"
                        >
                          <option value="3">3-Star Hotel</option>
                          <option value="4">4-Star Premium Resort</option>
                          <option value="5">5-Star Luxury Palace</option>
                          <option value="2">Boutique Homestay / Cottage</option>
                          <option value="1">Luxury Swiss Camps</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Room Category
                        </Label>
                        <Input
                          value={hotel.roomType || ""}
                          onChange={(e) =>
                            updateHotel(hotelTierTab, hIdx, "roomType", e.target.value)
                          }
                          placeholder="e.g. Deluxe Room / Executive Suite"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Meals Provided
                        </Label>
                        <Input
                          value={hotel.meals || ""}
                          onChange={(e) =>
                            updateHotel(hotelTierTab, hIdx, "meals", e.target.value)
                          }
                          placeholder="e.g. Breakfast & Dinner Included"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">
                          Key Amenities (Comma Separated)
                        </Label>
                        <Input
                          value={Array.isArray(hotel.amenities) ? hotel.amenities.join(", ") : hotel.amenities || ""}
                          onChange={(e) =>
                            updateHotel(
                              hotelTierTab,
                              hIdx,
                              "amenities",
                              e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean),
                            )
                          }
                          placeholder="Mountain View, Geyser, WiFi, Bonfire"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Hotel Photo */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">
                        Hotel Photo / Cover Image URL
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          value={hotel.image || ""}
                          onChange={(e) =>
                            updateHotel(hotelTierTab, hIdx, "image", e.target.value)
                          }
                          placeholder="https://images.unsplash.com/... or upload image"
                          className="h-9 bg-white border-slate-200 rounded-xl text-xs font-mono flex-1"
                        />
                        <div className="w-32 shrink-0">
                          <ImageUpload
                            value={hotel.image ? [hotel.image] : []}
                            onChange={(urls) =>
                              updateHotel(hotelTierTab, hIdx, "image", urls[0] || "")
                            }
                            maxFiles={1}
                          />
                        </div>
                      </div>
                      {hotel.image && (
                        <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-200 mt-2">
                          <img
                            src={formatUrl(hotel.image)}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 7: Inclusions & Exclusions */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold text-green-700 uppercase">
                  Inclusions
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      inclusions: [...(formData.inclusions || []), ""],
                    })
                  }
                  className="h-7 px-2 rounded-lg text-green-700 font-extrabold text-[10px] uppercase hover:bg-green-50 cursor-pointer"
                >
                  <Plus size={12} className="mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {formData.inclusions?.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <CheckCircle2
                      size={16}
                      className="text-green-600 shrink-0"
                    />
                    <Input
                      value={item}
                      onChange={(e) => {
                        const next = [...(formData.inclusions || [])];
                        next[i] = e.target.value;
                        setFormData({ ...formData, inclusions: next });
                      }}
                      placeholder="Included service..."
                      className="h-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-medium px-3"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(formData.inclusions || [])];
                        next.splice(i, 1);
                        setFormData({ ...formData, inclusions: next });
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold text-red-600 uppercase">
                  Exclusions
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      exclusions: [...(formData.exclusions || []), ""],
                    })
                  }
                  className="h-7 px-2 rounded-lg text-red-600 font-extrabold text-[10px] uppercase hover:bg-red-50 cursor-pointer"
                >
                  <Plus size={12} className="mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {formData.exclusions?.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <XCircle size={16} className="text-red-600 shrink-0" />
                    <Input
                      value={item}
                      onChange={(e) => {
                        const next = [...(formData.exclusions || [])];
                        next[i] = e.target.value;
                        setFormData({ ...formData, exclusions: next });
                      }}
                      placeholder="Excluded service..."
                      className="h-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-medium px-3"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(formData.exclusions || [])];
                        next.splice(i, 1);
                        setFormData({ ...formData, exclusions: next });
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Media Uploads & Settings) */}
        <div className="space-y-6">
          {/* Premium Image Upload Card 1: Main Cover Photo */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon size={18} className="text-[#D4541A]" />
              <h3 className="font-extrabold text-sm text-[#0B1528]">
                Hero Main Cover Image
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Upload a high-resolution primary photo used in proposal cover
              header.
            </p>

            <div className="space-y-3">
              <ImageUpload
                label="Primary Cover Image"
                value={formData.coverImage ? [formData.coverImage] : []}
                onChange={(urls) =>
                  setFormData({ ...formData, coverImage: urls[0] || "" })
                }
                maxFiles={1}
              />
            </div>
          </div>

          {/* Premium Image Upload Card 2: Gallery & Slider Photos */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-[#0B1528]">
                Additional Hero Slider Photos
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {(formData.heroImages || []).length} Uploaded
              </span>
            </div>

            <ImageUpload
              value={formData.heroImages || []}
              onChange={(urls) =>
                setFormData({ ...formData, heroImages: urls })
              }
              maxFiles={10}
            />
          </div>

          {/* Proposal Validity & Expiry */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock size={18} className="text-slate-600" />
              <h3 className="font-extrabold text-sm text-[#0B1528]">
                Proposal Expiry Settings
              </h3>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600">
                Quote Expiry Period
              </Label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3 text-xs font-extrabold text-[#0B1528] focus:bg-white outline-none cursor-pointer"
                value={formData.expiryHours || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiryHours: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">Perpetual (No Expiry)</option>
                <option value="24">24 Hours</option>
                <option value="48">48 Hours (Recommended)</option>
                <option value="72">72 Hours</option>
                <option value="168">7 Days</option>
              </select>
              <p className="text-[11px] text-slate-400 font-medium">
                Expiry countdown starts when the proposal is published live.
              </p>
            </div>
          </div>

          {/* Destination Expert / Agent Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck size={18} className="text-green-600" />
              <h3 className="font-extrabold text-sm text-[#0B1528]">
                Curated By (Expert Profile)
              </h3>
            </div>

            {/* Expert Photo / Avatar Upload */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-500 block">
                Expert Profile Photo
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 font-extrabold text-lg">
                  {formData.expert?.photo || formData.expert?.avatar ? (
                    <img
                      src={formatUrl(formData.expert?.photo || formData.expert?.avatar)}
                      alt="Expert Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(formData.expert?.name || "E").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <ImageUpload
                    value={
                      formData.expert?.photo
                        ? [formData.expert.photo]
                        : formData.expert?.avatar
                          ? [formData.expert.avatar]
                          : []
                    }
                    onChange={(urls) => {
                      const newPhoto = urls[0] || "";
                      setFormData({
                        ...formData,
                        expert: {
                          ...(formData.expert || {}),
                          name: formData.expert?.name || "Zeel Panchal",
                          designation:
                            formData.expert?.designation ||
                            "YOUTHCAMPING Destination Expert",
                          whatsapp: formData.expert?.whatsapp || "918866699409",
                          phone: formData.expert?.phone || "918866699409",
                          photo: newPhoto,
                          avatar: newPhoto,
                        },
                      });
                    }}
                    maxFiles={1}
                  />
                  {(formData.expert?.photo || formData.expert?.avatar) && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          expert: {
                            ...(formData.expert || {}),
                            name: formData.expert?.name || "Zeel Panchal",
                            designation:
                              formData.expert?.designation ||
                              "YOUTHCAMPING Destination Expert",
                            whatsapp: formData.expert?.whatsapp || "918866699409",
                            phone: formData.expert?.phone || "918866699409",
                            photo: "",
                            avatar: "",
                          },
                        })
                      }
                      className="text-[10px] font-bold text-red-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">
                  Expert Name
                </Label>
                <Input
                  value={formData.expert?.name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expert: {
                        ...(formData.expert || {}),
                        name: e.target.value,
                        designation:
                          formData.expert?.designation ||
                          "YOUTHCAMPING Destination Expert",
                        whatsapp: formData.expert?.whatsapp || "918866699409",
                        phone: formData.expert?.phone || "918866699409",
                      },
                    })
                  }
                  placeholder="Zeel Panchal"
                  className="h-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">
                  Official Designation
                </Label>
                <Input
                  value={formData.expert?.designation || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expert: {
                        ...(formData.expert || {}),
                        name: formData.expert?.name || "Zeel Panchal",
                        designation: e.target.value,
                        whatsapp: formData.expert?.whatsapp || "918866699409",
                        phone: formData.expert?.phone || "918866699409",
                      },
                    })
                  }
                  placeholder="YOUTHCAMPING Destination Expert"
                  className="h-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">
                  WhatsApp / Contact Number
                </Label>
                <Input
                  value={
                    formData.expert?.whatsapp || formData.expert?.phone || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      expert: {
                        ...(formData.expert || {}),
                        name: formData.expert?.name || "Zeel Panchal",
                        designation:
                          formData.expert?.designation ||
                          "YOUTHCAMPING Destination Expert",
                        whatsapp: val,
                        phone: val,
                      },
                    });
                  }}
                  placeholder="8866699409"
                  className="h-9 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">
                  Bio / Message (Optional)
                </Label>
                <Textarea
                  value={formData.expert?.description || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expert: {
                        ...(formData.expert || {}),
                        name: formData.expert?.name || "Zeel Panchal",
                        designation:
                          formData.expert?.designation ||
                          "YOUTHCAMPING Destination Expert",
                        whatsapp: formData.expert?.whatsapp || "918866699409",
                        phone: formData.expert?.phone || "918866699409",
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="Personalized message from the expert to the client..."
                  className="bg-slate-50/70 border-slate-200 rounded-xl p-2.5 text-xs min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Quick Dispatch Button */}
          {formData.customerPhone && (
            <Button
              onClick={sendWhatsApp}
              className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-green-600/20 cursor-pointer"
            >
              <WhatsAppIcon size={18} /> Send Quotation via WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


