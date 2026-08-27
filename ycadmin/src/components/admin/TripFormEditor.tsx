import AboutTripCmsEditor from "@/components/admin/trips/AboutTripCmsEditor";
import VariantsManager from "@/components/admin/trips/VariantsManager";
import ModernTripCalendar from "@/components/admin/trips/ModernTripCalendar";
import TripSopEditorTab from "@/components/admin/trips/TripSopEditorTab";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminModal } from "./AdminModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Trip, TripFormData, ItineraryDay, FAQ } from "@/types";
import {
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  ImagePlus,
  Image as ImageIcon,
  X,
  HelpCircle,
  Star,
  CheckCircle,
  XCircle,
  FileText,
  Globe,
  Upload,
  Plane,
  Car,
  Train,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  MapPin,
  Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "./RichTextEditor";
import { settingsService } from "@/services/settings.service";
import { sopsService } from "@/services/sops.service";
import { ImageUpload } from "./ImageUpload";
import { attractionsService, Attraction } from "@/services/attractions.service";
import api from "@/services/api";
import { cn } from "@/lib/utils";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyDay = (day: number): ItineraryDay => ({
  day,
  title: "",
  description: "",
  location: "",
  activities: [],
  stay: "",
  meals: "",
  photos: [],
});

const deleteServerFile = async (url: string) => {
  if (
    !url ||
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    !url.startsWith("/uploads/")
  )
    return;
  try {
    await api.delete("/upload/photo", { data: { url } });
  } catch (err) {
    console.error("Failed to delete file from server:", url, err);
  }
};

const emptyFaq = (): FAQ => ({ question: "", answer: "" });

interface CustomSection {
  id: string;
  type: string;
  title: string;
  content: any;
}

interface SEOData {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  ogImage: string;
  canonicalUrl: string;
  faqSchema: any[];
}

const defaultForm: TripFormData & {
  customSections?: CustomSection[];
  seo?: SEOData;
} = {
  title: "",
  slug: "",
  description: "",
  heroImage: "",
  price: 0,
  location: "",
  duration: "",
  category: "",
  images: [],
  itinerary: [],
  highlights: [],
  inclusions: [],
  exclusions: [],
  faqs: [],
  availableDates: [],
  variants: [],
  pickupCities: [],
  travelOptions: [],
  roomOptions: [],
  addons: [],
  status: "draft",
  maxGroupSize: 20,
  difficulty: "moderate",
  departureCity: "",
  ageLimit: "",
  bookingUrl: "",
  customSections: [],
  attractions: [],
  activities: [],
  accommodations: [],
  popupDetails: {
    cancellation: [],
    terms: [],
    carry: [],
    etiquette: [],
  },
  route: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    focusKeyword: "",
    ogImage: "",
    canonicalUrl: "",
    faqSchema: [],
  },
};

const CATEGORIES = [
  "Himalayan",
  "Beach",
  "Adventure",
  "Cultural",
  "Wildlife",
  "Luxury",
  "City",
  "Backpacking",
  "Road Trip",
  "Trekking",
  "Pilgrimage",
  "Bike Expedition",
  "Workation",
  "Spiritual",
];

const TabBtn = ({ value, label }: { value: string; label: string }) => (
  <TabsTrigger
    value={value}
    className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
               data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
  >
    {label}
  </TabsTrigger>
);

interface TripFormEditorProps {
  editing: Trip | null;
  onSave: (data: TripFormData, editingId?: string) => Promise<void>;
  onCancel: () => void;
}

export default function TripFormEditor({
  editing,
  onSave,
  onCancel,
}: TripFormEditorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (newTab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", newTab);
    setSearchParams(next, { replace: true });
  };

  const [form, setForm] = useState<any>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [customFields, setCustomFields] = useState([]);
  const [globalAttractions, setGlobalAttractions] = useState<Attraction[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const [newHighlight, setNewHighlight] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [newPickupPoint, setNewPickupPoint] = useState("");
  const [newSkipDays, setNewSkipDays] = useState(0);
  const [newDeduction, setNewDeduction] = useState(0);
  const [previewCityIndex, setPreviewCityIndex] = useState<number | "">("");
  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const [repeatFreq, setRepeatFreq] = useState("weekly");
  const [repeatCount, setRepeatCount] = useState(4);
  const [repeatStartDate, setRepeatStartDate] = useState("");

  // 1. Fetch Global Custom Field Definitions
  useEffect(() => {
    settingsService.get().then((res) => {
      setCustomFields(res.tripCustomFields || []);
    });
    attractionsService.getAll().then((res) => {
      setGlobalAttractions(res || []);
    });
  }, []);

  // 2. Sync Form Data when Editing state changes
  useEffect(() => {
    const ensureArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      return [];
    };

    if (editing) {
      const rawGallery =
        editing.gallery && editing.gallery.length > 0
          ? editing.gallery
          : editing.highlights && editing.highlights.length > 0
            ? editing.highlights
            : editing.images && editing.images.length > 0
              ? editing.images
              : [];

      const initialGallery = rawGallery
        .map((img: any, i: number) => ({
          url:
            typeof img === "string"
              ? img
              : img.url || img.image || img.img || img.src || img.path || "",
          alt:
            typeof img === "string"
              ? ""
              : img.alt || img.name || img.title || "",
          order: Number(img.order || i),
        }))
        .filter((img: any) => img.url);

      setForm({
        ...editing,
        gallery: initialGallery,
        itinerary: ensureArray(editing.itinerary),
        highlights: editing.highlights || [],
        inclusions: editing.inclusions || [],
        exclusions: editing.exclusions || [],
        faqs: editing.faqs || [],
        availableDates: editing.availableDates || [],
        variants: editing.variants || [],
        pickupCities: (editing as any).pickupCities || [],
        addons: editing.addons || [],
        travelOptions: editing.travelOptions || [],
        roomOptions: editing.roomOptions || [],
        customSections: (editing as any).customSections || [],
        activities: (editing as any).activities || [],
        accommodations: (editing as any).accommodations || [],
        reviews: (editing as any).reviews || [],
        departurePriceOverrides: (editing as any).departurePriceOverrides || [],
        reels: (editing as any).reels || [],
        seo: {
          ...defaultForm.seo,
          ...(editing as any).seo,
        },
      });
    } else {
      setForm(defaultForm);
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalize = (data: any) => {
        const cleanDoc = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(cleanDoc);
          if (
            obj !== null &&
            typeof obj === "object" &&
            !(obj instanceof Date)
          ) {
            const { _id, id, createdAt, updatedAt, __v, ...rest } = obj;
            const result: any = {};
            for (const key in rest) {
              result[key] = cleanDoc(rest[key]);
            }
            return result;
          }
          return obj;
        };

        const clean = cleanDoc(data);
        if (clean.difficulty) clean.difficulty = clean.difficulty.toLowerCase();
        if (clean.status) clean.status = clean.status.toLowerCase();
        if (clean.price) clean.price = Number(clean.price);
        if (clean.maxGroupSize) clean.maxGroupSize = Number(clean.maxGroupSize);

        if (clean.availableDates) {
          clean.availableDates = clean.availableDates.map((d: any) => ({
            date: d.date || d,
            capacity: Number(d.capacity || 20),
            bookedCount: Number(d.bookedCount || 0),
          }));
        }

        const rawGallery =
          clean.gallery && clean.gallery.length > 0
            ? clean.gallery
            : clean.highlights && clean.highlights.length > 0
              ? clean.highlights
              : clean.images && clean.images.length > 0
                ? clean.images
                : [];

        clean.gallery = rawGallery
          .map((img: any, i: number) => ({
            url:
              typeof img === "string"
                ? img
                : img.url || img.image || img.img || img.src || img.path || "",
            alt:
              typeof img === "string"
                ? ""
                : img.alt || img.name || img.title || "",
            order: Number(img.order || i),
          }))
          .filter((img: any) => img.url);

        if (clean.accommodations) {
          clean.accommodations = clean.accommodations.map((acc: any) => ({
            ...acc,
            gallery: (acc.gallery || [])
              .map((g: any) => {
                if (typeof g === "string") return { url: g, category: "All" };
                return { url: g.url || "", category: g.category || "All" };
              })
              .filter((g: any) => g.url),
          }));
        }

        if (clean.reviews) {
          clean.reviews = clean.reviews
            .filter(
              (rev: any) =>
                rev.userName &&
                rev.comment &&
                String(rev.userName).trim() !== "" &&
                String(rev.comment).trim() !== "",
            )
            .map((rev: any) => {
              const original = (form.reviews || []).find(
                (r: any) => r.userName === rev.userName,
              );
              return {
                ...rev,
                id: original?.id || original?._id || undefined,
                _id: original?._id || original?.id || undefined,
              };
            });
        }
        if (clean.pickupCities) {
          clean.pickupCities = clean.pickupCities.map((pc: any) => ({
            cityName: pc.cityName || "",
            pickupPoint: pc.pickupPoint || "",
            skipDays: Number(pc.skipDays || 0),
            deductionAmount: Number(pc.deductionAmount || 0),
          }));
        }
        return clean;
      };

      const cleanData = normalize(form);
      if (cleanData.gallery && cleanData.gallery.length > 0) {
        cleanData.highlights = cleanData.gallery.map((g: any) => ({
          name: g.alt || "Trip Glimpse",
          image: typeof g === "string" ? g : g.url || g.image || g.img || "",
          url: typeof g === "string" ? g : g.url || g.image || g.img || "",
          description: "",
        }));
      }

      // Remove UI-only or unsupported fields to prevent Prisma validation errors
      delete cleanData.emailNotifications;
      delete cleanData.pdfSettings;
      delete cleanData.minGroupSize;

      const editingId = editing?.id || (editing as any)?._id;
      await onSave(cleanData, editingId);

      // Persist Operations SOP Tasks for this specific Trip
      if (cleanData.sopTasks && Array.isArray(cleanData.sopTasks) && cleanData.sopTasks.length > 0) {
        try {
          const targetTripId = editingId || cleanData.id || cleanData.slug;
          if (targetTripId) {
            let template = await sopsService.getSopByTrip(targetTripId);
            if (!template) {
              template = await sopsService.createSopTemplate({
                tripId: targetTripId,
                name: `${cleanData.title || "Trip"} Operations SOP`,
                description: `Standard Operating Procedure for ${cleanData.title}`,
              });
            }
            if (template && template.activeVersionId) {
              const activeVersion =
                template.versions?.find((v) => v.id === template.activeVersionId) ||
                null;
              if (activeVersion) {
                for (const task of cleanData.sopTasks) {
                  await sopsService.createTaskTemplate(activeVersion.id, task);
                }
              }
            }
          }
        } catch (sopErr) {
          console.error("Error persisting SOP tasks during Trip Save:", sopErr);
        }
      }

      onCancel();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatUrl = (url: string | undefined) => {
    if (!url) return "";
    const cleanUrl = url.split("|")[0];
    if (cleanUrl.startsWith("http")) return cleanUrl;
    const apiBase =
      api.defaults.baseURL || "https://api.youthcamping.online/api";
    const serverBase = apiBase.split("/api")[0];
    return `${serverBase}${cleanUrl}`;
  };

  // List helpers
  const addToList = (
    field: "highlights" | "inclusions" | "exclusions",
    value: string,
    setter: (v: string) => void,
  ) => {
    if (!value.trim()) return;
    const items = value
      .split(/[,\n]/)
      .map((s) => s.trim().replace(/^[•\-\*]\s*/, ""))
      .filter(Boolean);
    setForm({ ...form, [field]: [...form[field], ...items] });
    setter("");
  };

  const removeFromList = (
    field: "highlights" | "inclusions" | "exclusions",
    index: number,
  ) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const addDay = () =>
    setForm({
      ...form,
      itinerary: [...form.itinerary, emptyDay(form.itinerary.length + 1)],
    });
  const updateDay = (index: number, field: keyof ItineraryDay, value: any) => {
    const updated = [...form.itinerary];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, itinerary: updated });
  };
  const removeDay = (index: number) => {
    const updated = form.itinerary
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day: i + 1 }));
    setForm({ ...form, itinerary: updated });
  };
  const addDayPhoto = (index: number) => {
    const url = prompt("Enter image URL:");
    if (!url) return;
    const updated = [...form.itinerary];
    updated[index] = {
      ...updated[index],
      photos: [...(updated[index].photos || []), url],
    };
    setForm({ ...form, itinerary: updated });
  };
  const removeDayPhoto = async (dayIndex: number, photoIndex: number) => {
    const rawPhoto = form.itinerary[dayIndex].photos[photoIndex];
    if (!rawPhoto) return;
    const [url] = rawPhoto.split("|");
    if (confirm("Permanently delete this photo from the server?")) {
      await deleteServerFile(url);
      const updated = [...form.itinerary];
      updated[dayIndex] = {
        ...updated[dayIndex],
        photos: (updated[dayIndex].photos || []).filter(
          (_, i) => i !== photoIndex,
        ),
      };
      setForm({ ...form, itinerary: updated });
    }
  };

  const updateDayPhoto = (
    dayIndex: number,
    photoIndex: number,
    newTitle?: string,
    newTag?: string,
  ) => {
    const updated = [...form.itinerary];
    const photos = [...(updated[dayIndex].photos || [])];
    const rawPhoto = photos[photoIndex] || "";
    const parts = rawPhoto.split("|");
    const url = parts[0];
    const title = newTitle !== undefined ? newTitle : parts[1] || "";
    const tag = newTag !== undefined ? newTag : parts[2] || "none";

    if (tag && tag !== "none") {
      photos[photoIndex] = `${url}|${title}|${tag}`;
    } else if (title) {
      photos[photoIndex] = `${url}|${title}`;
    } else {
      photos[photoIndex] = url;
    }
    updated[dayIndex] = { ...updated[dayIndex], photos };
    setForm({ ...form, itinerary: updated });
  };

  const addFaq = () => setForm({ ...form, faqs: [...form.faqs, emptyFaq()] });
  const updateFaq = (index: number, field: keyof FAQ, value: string) => {
    const updated = [...form.faqs];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, faqs: updated });
  };
  const removeFaq = (index: number) =>
    setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== index) });

  const generateRepeatDates = () => {
    if (!repeatStartDate) return;
    const start = new Date(repeatStartDate);
    const newDates = [{ date: repeatStartDate, capacity: 99, bookedCount: 0 }];
    for (let i = 1; i < repeatCount; i++) {
      const next = new Date(start);
      if (repeatFreq === "weekly") next.setDate(start.getDate() + i * 7);
      else if (repeatFreq === "monthly") next.setMonth(start.getMonth() + i);
      newDates.push({
        date: next.toISOString().split("T")[0],
        capacity: 99,
        bookedCount: 0,
      });
    }
    setForm({
      ...form,
      availableDates: [...new Set([...form.availableDates, ...newDates])].sort(
        (a: any, b: any) => a.date.localeCompare(b.date),
      ),
    });
  };

  const footer = (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Current Status
          </span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                form.status === "published" ? "bg-green-500" : "bg-amber-500",
              )}
            />
            <span className="text-sm font-bold uppercase tracking-tight text-slate-900">
              {form.status || "Draft"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => onCancel()}
          className="rounded-xl h-12 px-6 font-bold text-slate-600 border-slate-200"
        >
          Discard
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 rounded-xl bg-[#FF4D00] px-10 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-[#E04400]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {editing ? "Update Experience" : "Create Experience"}
        </Button>
      </div>
    </div>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="min-h-0 min-w-0 w-full bg-slate-50/50"
    >
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-bold uppercase tracking-wider text-[10px] sm:text-[11px] shrink-0"
          >
            &larr; Products
          </button>
          <div className="h-4 w-px bg-slate-200 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[140px] sm:max-w-xs">
            {form.title || (editing ? "Edit Product" : "New Product")}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            className="h-8 px-3 sm:px-4 rounded-lg border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 bg-white"
            onClick={onCancel}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-4 sm:px-5 rounded-lg bg-[#FF5400] hover:bg-[#e04a00] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </header>

      {/* ─── MAIN PAGE SPLIT LAYOUT ─── */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-3 sm:py-6 flex flex-col md:flex-row gap-3 sm:gap-6 text-xs">
        {/* TAB BAR NAVIGATION */}
        <div className="w-full md:w-56 lg:w-60 shrink-0">
          {/* MOBILE HORIZONTAL SWIPEABLE PILL BAR (<768px) */}
          <div className="block md:hidden overflow-x-auto no-scrollbar pb-2 sticky top-[48px] z-30 bg-slate-50/95 py-1.5 backdrop-blur-xs">
            <TabsList className="flex flex-row h-auto w-max bg-slate-200/60 p-1 rounded-xl gap-1">
              <TabsTrigger
                value="overview"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                OVERVIEW
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                BASIC DETAILS
              </TabsTrigger>
              <TabsTrigger
                value="ops-sop"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                OPERATIONS SOP & CHECKLIST
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                PRICES & RATES
              </TabsTrigger>
              <TabsTrigger
                value="dates"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                CALENDAR
              </TabsTrigger>
              <TabsTrigger
                value="glimpses"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                TRIP GLIMPSES
              </TabsTrigger>
              <TabsTrigger
                value="stay"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                STAY &amp; ACCOMMODATIONS
              </TabsTrigger>
              <TabsTrigger
                value="faqs"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                FAQS &amp; QUESTIONS
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                REVIEWS &amp; TESTIMONIALS
              </TabsTrigger>
              <TabsTrigger
                value="policies"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                POLICIES &amp; POPUP DETAILS
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                E-MAIL
              </TabsTrigger>
              <TabsTrigger
                value="pdf"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                PDF SETTINGS
              </TabsTrigger>
              <TabsTrigger
                value="multicity"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                LOCATION
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                ADVANCED
              </TabsTrigger>
              <TabsTrigger
                value="experimental"
                className="whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-xs"
              >
                EXPERIMENTAL
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DESKTOP SIDEBAR TAB BAR (>=768px) */}
          <div className="hidden md:block">
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-1">
              <TabsTrigger
                value="overview"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                OVERVIEW
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                BASIC DETAILS
              </TabsTrigger>
              <TabsTrigger
                value="ops-sop"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                OPERATIONS SOP & CHECKLIST
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                PRICES & RATES
              </TabsTrigger>
              <TabsTrigger
                value="dates"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                CALENDAR
              </TabsTrigger>
              <TabsTrigger
                value="itinerary"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                DETAILED ITINERARY
              </TabsTrigger>
              <TabsTrigger
                value="glimpses"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                TRIP GLIMPSES &amp; GALLERY
              </TabsTrigger>
              <TabsTrigger
                value="stay"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-[#FF5400] transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                STAY &amp; ACCOMMODATIONS
              </TabsTrigger>
              <TabsTrigger
                value="faqs"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-[#FF5400] transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                FAQS &amp; QUESTIONS
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-[#FF5400] transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                REVIEWS &amp; TESTIMONIALS
              </TabsTrigger>
              <TabsTrigger
                value="policies"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                POLICIES &amp; POPUP DETAILS
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                E-MAIL NOTIFICATIONS
              </TabsTrigger>
              <TabsTrigger
                value="pdf"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                PDF SETTINGS
              </TabsTrigger>
              <TabsTrigger
                value="multicity"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                LOCATION
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                ADVANCED SETTINGS
              </TabsTrigger>
              <TabsTrigger
                value="experimental"
                className="w-full justify-start py-2 px-3 text-left text-xs font-semibold text-slate-500 rounded-md hover:bg-slate-100 hover:text-[#FF5400] transition-all data-[state=active]:bg-white data-[state=active]:text-[#FF5400] data-[state=active]:shadow-2xs border border-transparent data-[state=active]:border-slate-200"
              >
                EXPERIMENTAL
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* MIDDLE CONTENT PANEL */}
        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 shadow-2xs min-h-[70vh]">
          {/* OPERATIONS SOP TAB CONTENT */}
          <TabsContent
            value="ops-sop"
            className="mt-0 space-y-6 animate-fade-in"
          >
            <TripSopEditorTab
              tripId={form.id || editing?.id}
              tripTitle={form.title}
              sopEnabled={form.sopEnabled !== false}
              onToggleSopEnabled={(enabled) =>
                setForm({ ...form, sopEnabled: enabled })
              }
              taskTemplates={form.sopTasks || []}
              onUpdateTasks={(tasks) =>
                setForm({ ...form, sopTasks: tasks })
              }
            />
          </TabsContent>

          {/* OVERVIEW TAB CONTENT */}
          <TabsContent
            value="overview"
            className="mt-0 space-y-6 animate-fade-in"
          >
            {/* Minimal Banner */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-transparent rounded-xl border border-[#FF4D00]/20">
              <div className="bg-[#FF5400] text-white font-black px-2 py-1 rounded text-[8px] uppercase tracking-widest shrink-0 shadow-sm">
                Tip
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                You can now set a <strong>payment deadline</strong> for each
                tour.{" "}
                <a
                  href="#"
                  className="text-[#FF5400] font-bold hover:underline"
                >
                  Configure deadlines &rarr;
                </a>
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-widest">
                    {form.shortName || form.id || "BKTH"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5400] flex items-center gap-1">
                    <Globe className="w-3 h-3" /> INR / Asia/Kolkata
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {form.title || "Untitled Trip"}
                </h3>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Advertised Price
                  </span>
                  <div className="text-lg font-black text-slate-800">
                    ₹{Number(form.price || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Min/Max Capacity
                  </span>
                  <div className="text-xs font-bold text-slate-600 pt-1">
                    {form.minGroupSize || 1} to {form.maxGroupSize || 30} pax
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Booking Lead Time
                  </span>
                  <div className="text-xs font-bold text-slate-600 pt-1">
                    Last moment allowed
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Min Deposit
                  </span>
                  <div className="text-xs font-bold text-slate-600 pt-1">
                    100% upfront
                  </div>
                </div>
              </div>

              {/* Calendar Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Departure Calendar Overview
                  </h4>
                  <span className="text-[10px] font-bold text-[#FF5400] bg-[#FF4D00]/5 px-2 py-0.5 rounded">
                    {form.availableDates?.length || 0} Scheduled
                  </span>
                </div>

                <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-1">
                  <div className="grid grid-cols-7 gap-1 text-center font-black text-slate-300 text-[9px] py-2 uppercase tracking-widest border-b border-slate-100/50 mx-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>

                  <div className="space-y-1 max-h-[140px] overflow-y-auto no-scrollbar p-2">
                    {form.availableDates?.length > 0 ? (
                      form.availableDates.map((dateObj: any, idx: number) => {
                        const d =
                          typeof dateObj === "string"
                            ? new Date(dateObj)
                            : new Date(dateObj.date);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-100/50 hover:border-slate-200 transition-colors"
                          >
                            <span className="font-bold text-xs text-slate-700">
                              {d.toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[10px] font-black tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                              Cap: {dateObj.capacity || 20}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-slate-400 italic py-6 text-[11px] font-medium">
                        No departure dates scheduled yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="details"
            className="mt-0 space-y-6 animate-fade-in"
          >
            {/* ─── Basic Details Fields ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="space-y-1.5">
                <Label
                  htmlFor="title"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  Trip Name
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: slugify(e.target.value),
                    })
                  }
                  className="h-8 text-sm font-bold border-0 border-b border-transparent hover:border-slate-200 focus-visible:border-[#FF5400] focus-visible:ring-0 rounded-none px-0 shadow-none bg-transparent"
                  placeholder="Enter trip name..."
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="tripCode"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  Trip Code
                </Label>
                <Input
                  id="tripCode"
                  value={form.shortName || form.id || ""}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setForm({
                      ...form,
                      id: val,
                      shortName: val,
                      tripCode: val,
                    });
                  }}
                  placeholder="e.g. MKA-1"
                  autoComplete="off"
                  className="h-8 text-sm font-bold uppercase border-0 border-b border-transparent hover:border-slate-200 focus-visible:border-[#FF5400] focus-visible:ring-0 rounded-none px-0 shadow-none bg-transparent text-[#FF5400]"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Duration
                </Label>
                <div className="h-8 flex items-center">
                  {(() => {
                    const durationStr = String(form.duration || "");
                    const nightsMatch = durationStr.match(
                      /(\d+)\s*(?:Nights?|N)/i,
                    );
                    const daysMatch = durationStr.match(/(\d+)\s*(?:Days?|D)/i);
                    const nightsVal = nightsMatch ? nightsMatch[1] : "";
                    const daysVal = daysMatch ? daysMatch[1] : "";
                    const updateDuration = (n: string, d: string) => {
                      setForm({ ...form, duration: `${n} Nights / ${d} Days` });
                    };
                    return (
                      <div className="flex gap-1 items-center">
                        <Input
                          type="number"
                          value={nightsVal}
                          placeholder="0"
                          onChange={(e) =>
                            updateDuration(e.target.value, daysVal)
                          }
                          className="h-7 w-10 p-0 text-center text-sm font-bold border-0 bg-slate-50 hover:bg-slate-100 focus-visible:ring-0 rounded-md shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 px-1">
                          Nights
                        </span>
                        <span className="text-slate-300 mx-1">/</span>
                        <Input
                          type="number"
                          value={daysVal}
                          placeholder="0"
                          onChange={(e) =>
                            updateDuration(nightsVal, e.target.value)
                          }
                          className="h-7 w-10 p-0 text-center text-sm font-bold border-0 bg-slate-50 hover:bg-slate-100 focus-visible:ring-0 rounded-md shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 px-1">
                          Days
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Min/Max Participants */}
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Participants (Min - Max)
                </Label>
                <div className="h-8 flex gap-1 items-center">
                  <span className="text-[10px] font-black text-slate-400 pr-1">
                    MIN
                  </span>
                  <Input
                    type="number"
                    value={form.minGroupSize || 1}
                    onChange={(e) =>
                      setForm({ ...form, minGroupSize: Number(e.target.value) })
                    }
                    className="h-7 w-12 p-0 text-center text-sm font-bold border-0 bg-slate-50 hover:bg-slate-100 focus-visible:ring-0 rounded-md shadow-none"
                  />
                  <span className="text-slate-300 mx-1">—</span>
                  <span className="text-[10px] font-black text-slate-400 pr-1">
                    MAX
                  </span>
                  <Input
                    type="number"
                    value={form.maxGroupSize || 30}
                    onChange={(e) =>
                      setForm({ ...form, maxGroupSize: Number(e.target.value) })
                    }
                    className="h-7 w-12 p-0 text-center text-sm font-bold border-0 bg-slate-50 hover:bg-slate-100 focus-visible:ring-0 rounded-md shadow-none"
                  />
                </div>
              </div>

              {/* Category Collection */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Collection
                </Label>
                <div className="h-8 flex items-center">
                  <Select
                    value={form.category?.toLowerCase()}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[140px] px-3 text-[11px] font-black uppercase tracking-wide border-0 bg-slate-50 hover:bg-slate-100 focus:ring-0 rounded-md shadow-none whitespace-nowrap text-[#FF5400]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c.toLowerCase()}
                          className="text-xs font-bold"
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display Order */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="order"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  Display Order
                </Label>
                <div className="h-8 flex items-center">
                  <Input
                    id="order"
                    type="number"
                    value={form.order || 0}
                    onChange={(e) =>
                      setForm({ ...form, order: Number(e.target.value) })
                    }
                    className="h-7 w-16 p-0 text-center text-sm font-bold border-0 bg-slate-50 hover:bg-slate-100 focus-visible:ring-0 rounded-md shadow-none"
                  />
                </div>
              </div>
            </div>

            {/* Overview Rich Text Editor */}
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Overview Details
              </Label>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-100 [&_.ql-container]:border-0">
                <RichTextEditor
                  content={form.description || ""}
                  onChange={(content) =>
                    setForm({ ...form, description: content })
                  }
                  placeholder="Join us for an unforgettable adventure..."
                />
              </div>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="pt-6 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Inclusions & Exclusions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-800">
                    Inclusions
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add inclusion..."
                      value={newInclusion}
                      onChange={(e) => setNewInclusion(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        addToList("inclusions", newInclusion, setNewInclusion)
                      }
                      className="h-8 text-xs rounded border-slate-200 focus-visible:ring-[#FF5400] focus-visible:border-[#FF5400]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        addToList("inclusions", newInclusion, setNewInclusion)
                      }
                      className="h-8 px-3 rounded border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {form.inclusions?.map((item: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-medium text-slate-700">
                            {item}
                          </span>
                        </div>
                        <X
                          className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-red-600"
                          onClick={() => removeFromList("inclusions", i)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-800">
                    Exclusions
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add exclusion..."
                      value={newExclusion}
                      onChange={(e) => setNewExclusion(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        addToList("exclusions", newExclusion, setNewExclusion)
                      }
                      className="h-8 text-xs rounded border-slate-200 focus-visible:ring-[#FF5400] focus-visible:border-[#FF5400]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        addToList("exclusions", newExclusion, setNewExclusion)
                      }
                      className="h-8 px-3 rounded border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {form.exclusions?.map((item: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                          <span className="font-medium text-slate-700">
                            {item}
                          </span>
                        </div>
                        <X
                          className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-red-600"
                          onClick={() => removeFromList("exclusions", i)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Trip Highlights
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      highlights: [
                        ...(form.highlights || []),
                        { name: "", image: "", description: "" },
                      ],
                    })
                  }
                  className="h-7 text-[9px] font-black uppercase border-dashed rounded-xl text-slate-500 hover:text-slate-800"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Highlight
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                {form.highlights?.map((h: any, i: number) => {
                  const isStr = typeof h === "string";
                  const item = isStr
                    ? { name: h, image: "", description: "" }
                    : h;
                  return (
                    <div
                      key={i}
                      className="group relative bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 shadow-sm hover:border-slate-300 transition-all"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => {
                            const updated = form.highlights.filter(
                              (_: any, idx: number) => idx !== i,
                            );
                            setForm({ ...form, highlights: updated });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border bg-slate-50">
                        <ImageUpload
                          compact
                          value={item.image || ""}
                          onUpload={(url) => {
                            const updated = [...form.highlights];
                            const currentItem =
                              typeof updated[i] === "string"
                                ? {
                                    name: updated[i],
                                    image: "",
                                    description: "",
                                  }
                                : { ...updated[i] };
                            currentItem.image = url;
                            updated[i] = currentItem;
                            setForm({ ...form, highlights: updated });
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={item.name || ""}
                          placeholder="Title"
                          onChange={(e) => {
                            const updated = [...form.highlights];
                            const currentItem =
                              typeof updated[i] === "string"
                                ? {
                                    name: updated[i],
                                    image: "",
                                    description: "",
                                  }
                                : { ...updated[i] };
                            currentItem.name = e.target.value;
                            currentItem.slug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)/g, "");
                            updated[i] = currentItem;
                            setForm({ ...form, highlights: updated });
                          }}
                          className="h-6 text-xs font-bold border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent"
                        />
                        <Input
                          value={item.description || ""}
                          placeholder="Short description..."
                          onChange={(e) => {
                            const updated = [...form.highlights];
                            const currentItem =
                              typeof updated[i] === "string"
                                ? {
                                    name: updated[i],
                                    image: "",
                                    description: "",
                                  }
                                : { ...updated[i] };
                            currentItem.description = e.target.value;
                            updated[i] = currentItem;
                            setForm({ ...form, highlights: updated });
                          }}
                          className="h-5 text-[10px] border-0 px-0 focus-visible:ring-0 text-slate-500 shadow-none bg-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Photos & Videos Cover & Gallery */}
            <div className="pt-6 border-t space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Photos & Videos
                </h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Manage cover visuals and explorer gallery
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Main Experience Image
                </Label>
                <ImageUpload
                  label="Main Visual Cover"
                  value={form.heroImage}
                  onUpload={(url) => setForm({ ...form, heroImage: url })}
                />
              </div>

              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Label className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                      Trip Cover Images (Shown on Card Auto-Slider & Details
                      Grid)
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload or paste URLs for cover photos. These photos
                      auto-slide on homepage trip cards!
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = [...(form.images || [])];
                      updated.push("");
                      setForm({ ...form, images: updated });
                    }}
                    className="h-8 text-xs font-bold text-[#FF5400] border-[#FF5400]/30 hover:bg-[#FF5400]/10 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Cover Photo Slot
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {(form.images && form.images.length > 0
                    ? form.images
                    : ["", "", "", ""]
                  ).map((currentUrl, slot) => {
                    return (
                      <div
                        key={slot}
                        className="space-y-2 p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm relative group"
                      >
                        {currentUrl ? (
                          <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900 border group/img">
                            <img
                              src={formatUrl(currentUrl)}
                              className="w-full h-full object-cover"
                              alt=""
                            />

                            {/* ACTION BUTTONS OVERLAY */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition-all">
                              <Label
                                htmlFor={`cover-upload-replace-${slot}`}
                                className="bg-white/90 hover:bg-white text-zinc-900 text-[10px] font-bold px-2.5 py-1.5 rounded cursor-pointer flex items-center gap-1 shadow-md"
                              >
                                <Upload className="w-3 h-3 text-[#FF5400]" />
                                Replace
                              </Label>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(form.images || [])];
                                  updated.splice(slot, 1);
                                  setForm({ ...form, images: updated });
                                }}
                                className="bg-destructive hover:bg-destructive/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-md"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>

                            {/* TOP RIGHT QUICK REMOVE CROSS */}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(form.images || [])];
                                updated.splice(slot, 1);
                                setForm({ ...form, images: updated });
                              }}
                              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Label
                              htmlFor={`cover-upload-details-${slot}`}
                              className="flex flex-col items-center justify-center aspect-video rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 cursor-pointer hover:bg-[#FF4D00]/5/50 hover:border-[#FF5400]/50 transition-all"
                            >
                              <Upload className="w-5 h-5 text-zinc-400 group-hover:text-[#FF5400] mb-1" />
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">
                                Upload Photo {slot + 1}
                              </span>
                            </Label>
                          </div>
                        )}

                        {/* HIDDEN INPUT FOR REPLACEMENT */}
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`cover-upload-replace-${slot}`}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append("image", file);
                            try {
                              const res = await api.post("/upload/single", fd, {
                                headers: {
                                  "Content-Type": "multipart/form-data",
                                },
                              });
                              if (res.data.success) {
                                const updated = [...(form.images || [])];
                                while (updated.length <= slot) updated.push("");
                                updated[slot] = res.data.url;
                                setForm({ ...form, images: updated });
                              }
                            } catch (err) {
                              console.error(err);
                            }
                            e.target.value = "";
                          }}
                        />

                        {/* HIDDEN INPUT FOR ADD NEW */}
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`cover-upload-details-${slot}`}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append("image", file);
                            try {
                              const res = await api.post("/upload/single", fd, {
                                headers: {
                                  "Content-Type": "multipart/form-data",
                                },
                              });
                              if (res.data.success) {
                                const updated = [...(form.images || [])];
                                while (updated.length <= slot) updated.push("");
                                updated[slot] = res.data.url;
                                setForm({ ...form, images: updated });
                              }
                            } catch (err) {
                              console.error(err);
                            }
                            e.target.value = "";
                          }}
                        />

                        {/* URL INPUT FIELD */}
                        <Input
                          value={currentUrl}
                          placeholder="Or paste photo URL..."
                          onChange={(e) => {
                            const updated = [...(form.images || [])];
                            while (updated.length <= slot) updated.push("");
                            updated[slot] = e.target.value;
                            setForm({ ...form, images: updated });
                          }}
                          className="h-8 text-[10px] bg-white border-zinc-250 focus-visible:ring-[#FF5400]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Extended Gallery
                  </Label>
                  <Input
                    type="file"
                    id="details-gallery-upload"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const formData = new FormData();
                      for (let i = 0; i < files.length; i++)
                        formData.append("images", files[i]);
                      try {
                        const res = await api.post(
                          "/upload/multiple",
                          formData,
                          {
                            headers: { "Content-Type": "multipart/form-data" },
                          },
                        );
                        if (res.data.success) {
                          const existingGallery = form.gallery || [];
                          const newItems = res.data.urls.map(
                            (url: string, idx: number) => ({
                              url,
                              alt: "",
                              order: existingGallery.length + idx,
                            }),
                          );
                          setForm({
                            ...form,
                            gallery: [...existingGallery, ...newItems],
                          });
                        }
                      } catch (err) {
                        console.error(err);
                      }
                      e.target.value = "";
                    }}
                  />
                  <Label
                    htmlFor="details-gallery-upload"
                    className="h-8 px-4 bg-slate-900 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Photos
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto p-3 bg-zinc-50 rounded border border-zinc-150 pr-1">
                  {(form.gallery || []).map((img: any, i: number) => (
                    <div
                      key={i}
                      className="flex gap-3 items-center bg-white p-2.5 rounded border border-zinc-150 relative group"
                    >
                      <div className="relative h-12 w-12 rounded overflow-hidden border bg-zinc-50">
                        <img
                          src={formatUrl(
                            typeof img === "string" ? img : img.url,
                          )}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[8px] uppercase opacity-45">
                            Alt Description
                          </Label>
                          <Input
                            value={img.alt || ""}
                            placeholder="Alt text"
                            onChange={(e) => {
                              const updated = [...form.gallery];
                              updated[i] = {
                                ...updated[i],
                                alt: e.target.value,
                              };
                              setForm({ ...form, gallery: updated });
                            }}
                            className="h-7 text-[10px] border-zinc-200"
                          />
                        </div>
                        <div>
                          <Label className="text-[8px] uppercase opacity-45">
                            Sort Order
                          </Label>
                          <Input
                            type="number"
                            value={img.order || 0}
                            placeholder="Order"
                            onChange={(e) => {
                              const updated = [...form.gallery];
                              updated[i] = {
                                ...updated[i],
                                order: Number(e.target.value),
                              };
                              setForm({ ...form, gallery: updated });
                            }}
                            className="h-7 text-[10px] border-zinc-200"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8 hover:bg-destructive/5 rounded-full"
                        onClick={() =>
                          setForm({
                            ...form,
                            gallery: form.gallery.filter(
                              (_: any, idx: number) => idx !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(form.gallery || []).length === 0 && (
                    <p className="text-center py-8 text-[10px] font-medium text-slate-400 italic">
                      No gallery photos added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="multicity">
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Multi-City Pickup Points
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Allow users to join from other cities and automatically
                    calculate deductions and skipped days.
                  </p>
                </div>
              </div>

              {/* Add City Form */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Add Pickup City
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="cityName"
                      className="text-[10px] font-black uppercase tracking-widest opacity-50"
                    >
                      City Name *
                    </Label>
                    <Input
                      id="cityName"
                      placeholder="e.g. Ahmedabad"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="pickupPoint"
                      className="text-[10px] font-black uppercase tracking-widest opacity-50"
                    >
                      Pickup Point *
                    </Label>
                    <Input
                      id="pickupPoint"
                      placeholder="e.g. Kalupur Railway Station Platform 1"
                      value={newPickupPoint}
                      onChange={(e) => setNewPickupPoint(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="skipDays"
                      className="text-[10px] font-black uppercase tracking-widest opacity-50"
                    >
                      Skip Days *
                    </Label>
                    <Input
                      id="skipDays"
                      type="number"
                      placeholder="e.g. 2"
                      value={newSkipDays}
                      onChange={(e) =>
                        setNewSkipDays(parseInt(e.target.value) || 0)
                      }
                      className="h-9 text-xs rounded-xl"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                      Number of itinerary days to omit from trip start
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="deductionAmount"
                      className="text-[10px] font-black uppercase tracking-widest opacity-50"
                    >
                      Deduction Amount (₹) *
                    </Label>
                    <Input
                      id="deductionAmount"
                      type="number"
                      placeholder="e.g. 1500"
                      value={newDeduction}
                      onChange={(e) =>
                        setNewDeduction(parseFloat(e.target.value) || 0)
                      }
                      className="h-9 text-xs rounded-xl font-mono text-green-600 font-bold"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                      Deducted from base package price
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newCityName.trim() || !newPickupPoint.trim()) {
                        alert("City Name and Pickup Point are required!");
                        return;
                      }
                      if (newSkipDays < 0) {
                        alert("Skip Days must be non-negative!");
                        return;
                      }
                      if (newSkipDays >= form.itinerary.length) {
                        alert(
                          `Cannot skip ${newSkipDays} days! The total trip duration is only ${form.itinerary.length} days.`,
                        );
                        return;
                      }
                      if (newDeduction < 0) {
                        alert("Deduction amount must be non-negative!");
                        return;
                      }
                      if (newDeduction > form.price) {
                        alert(
                          `Deduction amount (₹${newDeduction}) cannot exceed the base price (₹${form.price})!`,
                        );
                        return;
                      }

                      // Append to list
                      const newCity = {
                        cityName: newCityName.trim(),
                        pickupPoint: newPickupPoint.trim(),
                        skipDays: Number(newSkipDays),
                        deductionAmount: Number(newDeduction),
                      };

                      setForm({
                        ...form,
                        pickupCities: [...(form.pickupCities || []), newCity],
                      });

                      // Clear fields
                      setNewCityName("");
                      setNewPickupPoint("");
                      setNewSkipDays(0);
                      setNewDeduction(0);
                    }}
                    className="bg-primary text-black font-black uppercase text-[10px] tracking-widest h-9 px-6 rounded-xl"
                  >
                    Add City Configuration
                  </Button>
                </div>
              </div>

              {/* Configure List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Configured Pickup Cities ({form.pickupCities?.length || 0})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.pickupCities?.map((city: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-slate-200 bg-white rounded-2xl p-5 relative group flex flex-col justify-between hover:border-primary/30 transition-all"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="absolute top-3 right-3 h-8 w-8 text-destructive hover:bg-destructive/5 rounded-xl"
                        onClick={() => {
                          setForm({
                            ...form,
                            pickupCities: form.pickupCities.filter(
                              (_: any, i: number) => i !== idx,
                            ),
                          });
                          if (previewCityIndex === idx) {
                            setPreviewCityIndex("");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-3">
                        <div>
                          <span className="inline-block bg-primary/10 text-primary font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full mb-1">
                            ₹{city.deductionAmount} Deduction
                          </span>
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                            {city.cityName}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {city.pickupPoint}
                          </p>
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400 font-mono">
                          <span>Skip Days: {city.skipDays}</span>
                          <span>·</span>
                          <span>
                            Adjusted Price: ₹
                            {(
                              form.price - city.deductionAmount
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t flex justify-end">
                        <Button
                          variant={
                            previewCityIndex === idx ? "default" : "outline"
                          }
                          size="sm"
                          type="button"
                          onClick={() =>
                            setPreviewCityIndex(
                              previewCityIndex === idx ? "" : idx,
                            )
                          }
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest h-8 rounded-lg",
                            previewCityIndex === idx
                              ? "bg-slate-900 text-white"
                              : "",
                          )}
                        >
                          {previewCityIndex === idx
                            ? "Close Preview"
                            : "Preview Itinerary"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!form.pickupCities || form.pickupCities.length === 0) && (
                    <div className="col-span-full border border-dashed border-slate-200 p-8 rounded-2xl text-center space-y-2">
                      <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        No custom pickup cities configured yet.
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium">
                        Use the form above to add pickup cities with specific
                        deductions and skipped itinerary days.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Itinerary Preview for selected city */}
              {previewCityIndex !== "" &&
                form.pickupCities?.[previewCityIndex] && (
                  <div className="pt-6 border-t space-y-4">
                    {(() => {
                      const selCity = form.pickupCities[previewCityIndex];
                      const skipped = selCity.skipDays;
                      const remainingItinerary = (form.itinerary || []).slice(
                        skipped,
                      );

                      return (
                        <div className="bg-slate-900 text-white rounded-[32px] p-8 space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-4">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                Live Preview
                              </span>
                              <h4 className="text-xl font-bold uppercase tracking-tight">
                                Joining From: {selCity.cityName}
                              </h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                Adjusted Pricing
                              </p>
                              <p className="text-2xl font-black text-primary">
                                ₹
                                {(
                                  form.price - selCity.deductionAmount
                                ).toLocaleString()}{" "}
                                <span className="text-xs font-bold text-white/40 line-through">
                                  ₹{form.price.toLocaleString()}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                              Adjusted Day-Wise Itinerary (Skipped first{" "}
                              {skipped} days)
                            </p>
                            {remainingItinerary.map(
                              (day: any, dIdx: number) => (
                                <div
                                  key={dIdx}
                                  className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-1"
                                >
                                  <span className="bg-white/10 text-white/80 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded">
                                    Day {dIdx + 1} (Orig Day {day.day})
                                  </span>
                                  <h5 className="text-sm font-bold">
                                    {day.title}
                                  </h5>
                                  <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2">
                                    {day.description}
                                  </p>
                                </div>
                              ),
                            )}
                            {remainingItinerary.length === 0 && (
                              <p className="text-xs text-amber-400 italic">
                                No remaining itinerary days. Try reducing skip
                                days.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                  Location Variants
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [
                        ...form.variants,
                        {
                          location: "",
                          duration: "",
                          originalPrice: 0,
                          discountedPrice: 0,
                          image: "",
                        },
                      ],
                    })
                  }
                  className="rounded-xl h-8 text-[10px] font-black uppercase"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Variant
                </Button>
              </div>
              <div className="space-y-4">
                {form.variants?.map((v: any, i: number) => (
                  <div
                    key={i}
                    className="group relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() =>
                          setForm({
                            ...form,
                            variants: form.variants.filter(
                              (_: any, idx: number) => idx !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border bg-slate-50">
                        <ImageUpload
                          compact
                          value={v.image}
                          onUpload={(url) => {
                            const updated = [...form.variants];
                            updated[i].image = url;
                            setForm({ ...form, variants: updated });
                          }}
                        />
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <Input
                            value={v.location}
                            placeholder="Location (e.g. Delhi)"
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].location = e.target.value;
                              setForm({ ...form, variants: updated });
                            }}
                            className="h-8 text-xs font-semibold shadow-none border-slate-200"
                          />
                          <Input
                            value={v.duration}
                            placeholder="Duration (e.g. 5D/4N)"
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].duration = e.target.value;
                              setForm({ ...form, variants: updated });
                            }}
                            className="h-8 text-xs font-semibold shadow-none border-slate-200"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          <Input
                            type="number"
                            value={v.originalPrice}
                            placeholder="Orig. Price"
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].originalPrice = Number(e.target.value);
                              setForm({ ...form, variants: updated });
                            }}
                            className="h-8 text-xs shadow-none border-slate-200"
                          />
                          <Input
                            type="number"
                            value={v.discountedPrice}
                            placeholder="Disc. Price"
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].discountedPrice = Number(
                                e.target.value,
                              );
                              setForm({ ...form, variants: updated });
                            }}
                            className="h-8 text-xs shadow-none border-slate-200"
                          />
                          <Input
                            type="number"
                            value={v.skipDays || 0}
                            placeholder="Skip Days"
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].skipDays = Number(e.target.value);
                              setForm({ ...form, variants: updated });
                            }}
                            className="h-8 text-xs shadow-none border-slate-200 col-span-2 sm:col-span-1"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id={`excludeTravel-editor-${i}`}
                            checked={v.excludeTravel || false}
                            onChange={(e) => {
                              const updated = [...form.variants];
                              updated[i].excludeTravel = e.target.checked;
                              setForm({ ...form, variants: updated });
                            }}
                            className="accent-[#FF5400] h-4 w-4 cursor-pointer"
                          />
                          <label
                            htmlFor={`excludeTravel-editor-${i}`}
                            className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                          >
                            Direct Join (Exclude Travel/Train Options)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Travel Options Section */}
              <div className="pt-6 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Plane className="w-3 h-3" /> Travelling Options
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        travelOptions: [
                          ...(form.travelOptions || []),
                          { label: "", priceDelta: 0, description: "" },
                        ],
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Option
                  </Button>
                </div>
                <div className="space-y-3">
                  {(form.travelOptions || []).map((opt: any, i: number) => (
                    <div
                      key={i}
                      className="bg-muted/30 p-4 rounded-xl space-y-2 relative group border border-transparent hover:border-primary/20"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          const updated = form.travelOptions.filter(
                            (_: any, idx: number) => idx !== i,
                          );
                          setForm({ ...form, travelOptions: updated });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={opt.label}
                          placeholder="Label (e.g. AC Sleeper)"
                          onChange={(e) => {
                            const updated = [...form.travelOptions];
                            updated[i].label = e.target.value;
                            setForm({ ...form, travelOptions: updated });
                          }}
                          className="h-8 text-xs font-bold"
                        />
                        <Input
                          type="number"
                          value={opt.priceDelta}
                          placeholder="Price Delta (+)"
                          onChange={(e) => {
                            const updated = [...form.travelOptions];
                            updated[i].priceDelta = Number(e.target.value);
                            setForm({ ...form, travelOptions: updated });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Input
                        value={opt.description}
                        placeholder="Short Description"
                        onChange={(e) => {
                          const updated = [...form.travelOptions];
                          updated[i].description = e.target.value;
                          setForm({ ...form, travelOptions: updated });
                        }}
                        className="h-7 text-[10px] bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Options Section */}
              <div className="pt-6 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Star className="w-3 h-3" /> Room Sharing Options
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        roomOptions: [
                          ...(form.roomOptions || []),
                          { label: "", priceDelta: 0 },
                        ],
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Option
                  </Button>
                </div>
                <div className="space-y-3">
                  {(form.roomOptions || []).map((opt: any, i: number) => (
                    <div
                      key={i}
                      className="bg-muted/30 p-3 rounded-xl flex gap-3 items-center relative group"
                    >
                      <Input
                        value={opt.label}
                        placeholder="e.g. Triple Sharing"
                        onChange={(e) => {
                          const updated = [...form.roomOptions];
                          updated[i].label = e.target.value;
                          setForm({ ...form, roomOptions: updated });
                        }}
                        className="h-8 text-xs font-bold"
                      />
                      <Input
                        type="number"
                        value={opt.priceDelta}
                        placeholder="+ Price"
                        onChange={(e) => {
                          const updated = [...form.roomOptions];
                          updated[i].priceDelta = Number(e.target.value);
                          setForm({ ...form, roomOptions: updated });
                        }}
                        className="h-8 text-xs w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          const updated = form.roomOptions.filter(
                            (_: any, idx: number) => idx !== i,
                          );
                          setForm({ ...form, roomOptions: updated });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departure Date Overrides Section */}
              <div className="pt-6 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-[#FF5400] flex items-center gap-2">
                      Departure Date Pricing Overrides
                    </Label>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Set peak pricing for specific dates without creating
                      duplicate trips.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        departurePriceOverrides: [
                          ...(form.departurePriceOverrides || []),
                          {
                            departureDate: "",
                            overrideType: "EXTRA_CHARGE",
                            amount: 0,
                            reason: "",
                            isActive: true,
                          },
                        ],
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Override
                  </Button>
                </div>

                {form.departurePriceOverrides?.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      <div className="col-span-3">Departure Date</div>
                      <div className="col-span-3">Override Type</div>
                      <div className="col-span-2">Amount (₹)</div>
                      <div className="col-span-3">Reason / Note</div>
                      <div className="col-span-1 text-center">Status</div>
                    </div>
                    {(form.departurePriceOverrides || []).map(
                      (override: any, i: number) => (
                        <div
                          key={i}
                          className={`grid grid-cols-12 gap-3 items-center p-3 rounded-xl border transition-all ${override.isActive ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}
                        >
                          <div className="col-span-3">
                            <Input
                              type="date"
                              value={override.departureDate}
                              onChange={(e) => {
                                const updated = [
                                  ...form.departurePriceOverrides,
                                ];
                                updated[i].departureDate = e.target.value;
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                              className="h-8 text-xs font-semibold shadow-none border-slate-200"
                            />
                          </div>
                          <div className="col-span-3">
                            <select
                              value={override.overrideType}
                              onChange={(e) => {
                                const updated = [
                                  ...form.departurePriceOverrides,
                                ];
                                updated[i].overrideType = e.target.value;
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                              className="w-full h-8 px-2 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="EXTRA_CHARGE">
                                Extra Charge (+)
                              </option>
                              <option value="FIXED_PRICE">
                                Fixed Price (=)
                              </option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              value={override.amount}
                              onChange={(e) => {
                                const updated = [
                                  ...form.departurePriceOverrides,
                                ];
                                updated[i].amount = Number(e.target.value);
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                              className="h-8 text-xs shadow-none border-slate-200"
                              placeholder="e.g. 1500"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              value={override.reason || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...form.departurePriceOverrides,
                                ];
                                updated[i].reason = e.target.value;
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                              className="h-8 text-xs shadow-none border-slate-200"
                              placeholder="e.g. Christmas Eve"
                            />
                          </div>
                          <div className="col-span-1 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [
                                  ...form.departurePriceOverrides,
                                ];
                                updated[i].isActive = !updated[i].isActive;
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${override.isActive ? "bg-green-500" : "bg-slate-300"}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${override.isActive ? "translate-x-3" : "translate-x-0"}`}
                              />
                            </button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full ml-1"
                              onClick={() => {
                                const updated =
                                  form.departurePriceOverrides.filter(
                                    (_: any, idx: number) => idx !== i,
                                  );
                                setForm({
                                  ...form,
                                  departurePriceOverrides: updated,
                                });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Star className="w-3 h-3" /> Sticky Action Card
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Sticky Price (₹)
                    </Label>
                    <Input
                      type="number"
                      value={form.stickyCardPrice || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stickyCardPrice: Number(e.target.value),
                        })
                      }
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Sticky Label
                    </Label>
                    <Input
                      value={form.stickyCardLabel || ""}
                      onChange={(e) =>
                        setForm({ ...form, stickyCardLabel: e.target.value })
                      }
                      placeholder="e.g. per person"
                      className="rounded-xl h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Star className="w-3 h-3" /> Booking Form Labels
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Joining Point Title
                    </Label>
                    <Input
                      value={form.bookingFormLabels?.joiningPoint || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bookingFormLabels: {
                            ...form.bookingFormLabels,
                            joiningPoint: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Joining Point"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Travelers Manifest Title
                    </Label>
                    <Input
                      value={form.bookingFormLabels?.travelers || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bookingFormLabels: {
                            ...form.bookingFormLabels,
                            travelers: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Traveler Manifest"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Travel Option Title
                    </Label>
                    <Input
                      value={form.bookingFormLabels?.travelOption || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bookingFormLabels: {
                            ...form.bookingFormLabels,
                            travelOption: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Train Ticket Option"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase font-black opacity-50">
                      Room Sharing Option Title
                    </Label>
                    <Input
                      value={form.bookingFormLabels?.roomSharing || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bookingFormLabels: {
                            ...form.bookingFormLabels,
                            roomSharing: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Room Sharing Option"
                      className="rounded-xl h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* E-MAIL NOTIFICATIONS TAB CONTENT */}
          <TabsContent value="email" className="mt-0 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              E-Mail Notification Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 border rounded">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Booking Confirmation E-Mail
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Send an automated email receipt and itinerary to travelers
                    immediately upon successful booking.
                  </p>
                </div>
                <Switch
                  checked={form.emailNotifications?.bookingConfirm !== false}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      emailNotifications: {
                        ...(form.emailNotifications || {}),
                        bookingConfirm: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 border rounded">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Inquiry Automated Response
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Auto-reply to website inquiries with a customizable welcome
                    message and brochure.
                  </p>
                </div>
                <Switch
                  checked={form.emailNotifications?.inquiryAutoReply === true}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      emailNotifications: {
                        ...(form.emailNotifications || {}),
                        inquiryAutoReply: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 border rounded">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Payment Due Reminder
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Send automatic payment reminders to customers with partial
                    deposits 3 days before their deadline.
                  </p>
                </div>
                <Switch
                  checked={form.emailNotifications?.paymentReminders !== false}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      emailNotifications: {
                        ...(form.emailNotifications || {}),
                        paymentReminders: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-800">
                  Notification Recipients
                </Label>
                <Input
                  value={
                    form.emailNotifications?.recipients ||
                    "admin@youthcamping.in"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emailNotifications: {
                        ...(form.emailNotifications || {}),
                        recipients: e.target.value,
                      },
                    })
                  }
                  placeholder="Enter email addresses separated by commas"
                  className="h-9 text-xs rounded"
                />
                <p className="text-[10px] text-slate-400">
                  Receive alerts at these email addresses whenever a new booking
                  or inquiry is made.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* PDF SETTINGS TAB CONTENT */}
          <TabsContent value="pdf" className="mt-0 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Brochure & PDF Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 border rounded">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Show Price in PDF Brochure
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Include the advertised base package price on the generated
                    PDF cover page.
                  </p>
                </div>
                <Switch
                  checked={form.pdfSettings?.showPrice !== false}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      pdfSettings: {
                        ...(form.pdfSettings || {}),
                        showPrice: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 border rounded">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Include Terms & Cancellation Rules
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Append terms and cancellation policy rules at the end of the
                    generated itinerary PDF.
                  </p>
                </div>
                <Switch
                  checked={form.pdfSettings?.includePolicies !== false}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      pdfSettings: {
                        ...(form.pdfSettings || {}),
                        includePolicies: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800">
                    PDF Cover Subtitle
                  </Label>
                  <Input
                    value={
                      form.pdfSettings?.subtitle || "YouthCamping Adventures"
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pdfSettings: {
                          ...(form.pdfSettings || {}),
                          subtitle: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Expedition Guide"
                    className="h-9 text-xs rounded"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800">
                    PDF Accent Theme Color
                  </Label>
                  <Select
                    value={form.pdfSettings?.themeColor || "orange"}
                    onValueChange={(val) =>
                      setForm({
                        ...form,
                        pdfSettings: {
                          ...(form.pdfSettings || {}),
                          themeColor: val,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange">
                        Brand Orange (#FF5400)
                      </SelectItem>
                      <SelectItem value="navy">Navy Blue (#1E3148)</SelectItem>
                      <SelectItem value="green">
                        Forest Green (#10B981)
                      </SelectItem>
                      <SelectItem value="slate">
                        Slate Gray (#64748B)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CALENDAR TAB CONTENT */}
          <TabsContent value="dates" className="mt-0 space-y-6">
            <div className="space-y-6">
              {/* Calendar header controls */}
              {(() => {
                const monthNames = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                const daysInMonth = new Date(
                  calYear,
                  calMonth + 1,
                  0,
                ).getDate();
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                // Adjust so Monday is 0, Sunday is 6
                const startOffset = firstDay === 0 ? 6 : firstDay - 1;

                const handleDateClick = (dayNum: number) => {
                  const formattedDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const exists = form.availableDates?.some((d: any) => {
                    const dStr = typeof d === "string" ? d : d.date;
                    return dStr === formattedDate;
                  });

                  if (exists) {
                    setForm({
                      ...form,
                      availableDates: form.availableDates.filter((d: any) => {
                        const dStr = typeof d === "string" ? d : d.date;
                        return dStr !== formattedDate;
                      }),
                    });
                  } else {
                    const newDateObj = {
                      date: formattedDate,
                      capacity: 99,
                      bookedCount: 0,
                    };
                    setForm({
                      ...form,
                      availableDates: [
                        ...(form.availableDates || []),
                        newDateObj,
                      ].sort((a: any, b: any) => a.date.localeCompare(b.date)),
                    });
                  }
                };

                return (
                  <div className="space-y-6">
                    <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Active Calendar View:
                          </span>
                          <h4 className="text-[11px] font-black text-[#FF5400] uppercase tracking-widest">
                            {monthNames[calMonth]} {calYear}
                          </h4>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              calYear < new Date().getFullYear() ||
                              (calYear === new Date().getFullYear() &&
                                calMonth <= new Date().getMonth())
                            }
                            className="h-8 px-4 rounded-xl text-[10px] font-bold bg-white disabled:opacity-50"
                            onClick={() => {
                              if (calMonth === 0) {
                                setCalMonth(11);
                                setCalYear((y) => y - 1);
                              } else {
                                setCalMonth((m) => m - 1);
                              }
                            }}
                          >
                            &larr; Prev
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-4 rounded-xl text-[10px] font-bold bg-white"
                            onClick={() => {
                              if (calMonth === 11) {
                                setCalMonth(0);
                                setCalYear((y) => y + 1);
                              } else {
                                setCalMonth((m) => m + 1);
                              }
                            }}
                          >
                            Next &rarr;
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-4 text-center text-[10px] font-black text-slate-300 uppercase pb-4">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </div>
                      <div className="grid grid-cols-7 gap-3">
                        {Array.from({ length: startOffset }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="aspect-square bg-transparent"
                          />
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const dayNum = idx + 1;
                          const formattedDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                          const isScheduled = form.availableDates?.some(
                            (d: any) => {
                              const dStr = typeof d === "string" ? d : d.date;
                              return dStr === formattedDate;
                            },
                          );

                          const activeOverride =
                            form.departurePriceOverrides?.find(
                              (o: any) =>
                                o.departureDate === formattedDate && o.isActive,
                            );

                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isPastDate =
                            new Date(calYear, calMonth, dayNum) < today;

                          return (
                            <button
                              key={dayNum}
                              type="button"
                              disabled={isPastDate}
                              onClick={() => handleDateClick(dayNum)}
                              className={cn(
                                "aspect-square rounded-2xl flex flex-col items-center justify-center text-[13px] font-bold transition-all border relative",
                                isPastDate
                                  ? "opacity-30 cursor-not-allowed bg-slate-50 border-transparent text-slate-400"
                                  : isScheduled
                                    ? activeOverride
                                      ? "bg-red-50 text-red-600 border-red-200 font-black shadow-sm hover:bg-red-100"
                                      : "bg-[#FF5400]/5 text-[#FF5400] border-[#FF5400]/20 font-black shadow-sm hover:bg-[#FF5400]/10"
                                    : "bg-white text-slate-700 border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md",
                              )}
                            >
                              <span>{dayNum}</span>
                              {isScheduled && activeOverride ? (
                                <span className="w-1 h-1 bg-red-500 rounded-full absolute bottom-2" />
                              ) : isScheduled ? (
                                <span className="w-1 h-1 bg-[#FF5400] rounded-full absolute bottom-2" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-8 text-center font-medium flex items-center justify-center gap-1">
                        <span className="text-amber-400">💡</span> Click any
                        calendar cell above to toggle departure scheduling for
                        that date.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Bulk generate and date list */}
              <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm space-y-6 mt-6">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                  Bulk Generate Dates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50 tracking-widest">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={repeatStartDate}
                      onChange={(e) => setRepeatStartDate(e.target.value)}
                      className="h-10 text-xs rounded-xl border-slate-200 shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50 tracking-widest">
                      Frequency
                    </Label>
                    <Select value={repeatFreq} onValueChange={setRepeatFreq}>
                      <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50 tracking-widest">
                      Repeat Count
                    </Label>
                    <Input
                      type="number"
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Number(e.target.value))}
                      className="h-10 text-xs rounded-xl border-slate-200 shadow-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="default"
                      className="w-full h-10 text-[11px] font-black uppercase rounded-xl bg-slate-900 text-white hover:bg-slate-800 tracking-wider shadow-none"
                      onClick={generateRepeatDates}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t mt-8">
                {(() => {
                  if (
                    !form.availableDates ||
                    form.availableDates.length === 0
                  ) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4">
                          <div className="h-px w-12 bg-primary/30 relative">
                            <div className="w-1 h-3 bg-primary absolute -top-1.5 left-0" />
                            <div className="w-1 h-3 bg-primary absolute -top-1.5 right-0" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-widest text-slate-800">
                            Group Departure Dates
                          </h3>
                          <div className="h-px w-12 bg-primary/30 relative">
                            <div className="w-1 h-3 bg-primary absolute -top-1.5 left-0" />
                            <div className="w-1 h-3 bg-primary absolute -top-1.5 right-0" />
                          </div>
                        </div>
                        <p className="text-center text-[10px] font-medium opacity-50 italic">
                          No dates configured
                        </p>
                      </div>
                    );
                  }

                  // Group by year and month
                  const grouped: Record<number, Record<number, number[]>> = {};
                  form.availableDates.forEach((d: any) => {
                    const dStr = typeof d === "string" ? d : d.date || d;
                    if (!dStr) return;
                    const parts = dStr.split("-");
                    if (parts.length === 3) {
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]) - 1;
                      const day = parseInt(parts[2]);
                      if (!grouped[year]) grouped[year] = {};
                      if (!grouped[year][month]) grouped[year][month] = [];
                      if (!grouped[year][month].includes(day)) {
                        grouped[year][month].push(day);
                      }
                    }
                  });

                  const monthNames = [
                    "JAN",
                    "FEB",
                    "MAR",
                    "APR",
                    "MAY",
                    "JUN",
                    "JUL",
                    "AUG",
                    "SEP",
                    "OCT",
                    "NOV",
                    "DEC",
                  ];
                  const years = Object.keys(grouped)
                    .map(Number)
                    .sort((a, b) => a - b);

                  return (
                    <div className="flex flex-col gap-6 w-full pb-8">
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-primary/80 relative">
                          <div className="w-1 h-2 bg-primary absolute -top-1 left-0" />
                          <div className="w-1 h-2 bg-primary absolute -top-1 right-0" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-widest text-slate-800">
                          Group Departure Dates
                        </h3>
                        <div className="h-px w-12 bg-primary/80 relative">
                          <div className="w-1 h-2 bg-primary absolute -top-1 left-0" />
                          <div className="w-1 h-2 bg-primary absolute -top-1 right-0" />
                        </div>
                      </div>

                      <div className="flex gap-8 max-w-2xl mx-auto w-full flex-col md:flex-row relative">
                        {/* Vertical divider on desktop */}
                        {years.length > 1 && (
                          <div className="hidden md:block absolute left-1/2 top-8 bottom-4 w-px bg-slate-300 -translate-x-1/2" />
                        )}

                        {years.map((year) => (
                          <div key={year} className="flex-1 space-y-4">
                            <h4 className="flex items-center justify-center md:justify-start gap-2 text-lg font-black text-slate-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />{" "}
                              {year}
                            </h4>
                            <div className="space-y-2">
                              {Object.keys(grouped[year])
                                .map(Number)
                                .sort((a, b) => a - b)
                                .map((month) => (
                                  <div
                                    key={month}
                                    className="flex gap-4 items-center bg-white border border-slate-300 rounded-xl px-4 py-2.5 shadow-sm transition-all hover:border-slate-400"
                                  >
                                    <div className="shrink-0 flex items-center justify-center">
                                      <CalendarDays className="w-6 h-6 text-slate-800 stroke-[2.5]" />
                                    </div>
                                    <div className="flex-1 flex items-baseline gap-2 flex-wrap">
                                      <span className="text-sm font-bold text-[#FF5400] w-9">
                                        {monthNames[month]}
                                      </span>
                                      <span className="text-[13px] font-semibold text-slate-800">
                                        {grouped[year][month]
                                          .sort((a, b) => a - b)
                                          .map((day) =>
                                            String(day).padStart(2, "0"),
                                          )
                                          .join(", ")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="itinerary">
            <div className="space-y-0 pt-4 border-l-2 border-slate-100 ml-3">
              {form.itinerary?.map((day: any, idx: number) => (
                <div key={idx} className="group relative pl-6 pb-8">
                  <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300 group-hover:border-[#FF5400] transition-colors" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5400] shrink-0 pt-0.5">
                          Day {day.day}
                        </span>
                        <Input
                          value={day.title}
                          placeholder="Headline (e.g. Arrival in Manali)"
                          onChange={(e) =>
                            updateDay(idx, "title", e.target.value)
                          }
                          className="h-7 text-sm font-extrabold border-transparent px-0 bg-transparent focus-visible:bg-slate-50 focus-visible:ring-0 focus-visible:border-slate-200 shadow-none"
                        />
                      </div>
                      <Textarea
                        value={day.description}
                        placeholder="Write the day's details..."
                        onChange={(e) =>
                          updateDay(idx, "description", e.target.value)
                        }
                        className="text-xs min-h-[40px] border-transparent px-0 bg-transparent focus-visible:bg-slate-50 focus-visible:ring-0 focus-visible:border-slate-200 shadow-none resize-y"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-300 hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeDay(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Quick Options Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1 pr-2">
                      <select
                        value={
                          day.stay === "Night Journey" ? "journey" : "stay"
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value === "journey"
                              ? "Night Journey"
                              : "Stay Included";
                          updateDay(idx, "stay", val);
                          if (e.target.value === "journey")
                            updateDay(idx, "location", "—");
                        }}
                        className="h-6 text-[10px] font-bold bg-transparent focus:outline-none cursor-pointer text-slate-600"
                      >
                        <option value="stay">🏨 Stay</option>
                        <option value="journey">🚌 Night Journey</option>
                      </select>
                      {day.stay !== "Night Journey" && (
                        <>
                          <div className="w-px h-3 bg-slate-200 mx-1" />
                          <Input
                            value={day.location || ""}
                            placeholder="Location..."
                            onChange={(e) =>
                              updateDay(idx, "location", e.target.value)
                            }
                            className="h-6 text-[10px] font-bold border-0 p-0 w-24 bg-transparent focus-visible:ring-0 shadow-none"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1 px-2">
                      <span className="text-[10px] font-bold text-slate-500">
                        🍽️ Meals:
                      </span>
                      <Input
                        value={day.meals}
                        placeholder="e.g. B, D"
                        onChange={(e) =>
                          updateDay(idx, "meals", e.target.value)
                        }
                        className="h-6 text-[10px] font-bold border-0 p-0 w-16 bg-transparent focus-visible:ring-0 shadow-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Photos & Captions */}
                  <div className="pt-3">
                    <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Day Photos &amp; Captions
                    </Label>
                    <div className="flex flex-wrap gap-2.5 items-center">
                      {day.photos?.map((p: string, pIdx: number) => {
                        const parts = p.split("|");
                        const url = parts[0];
                        const photoName = parts[1] || "";
                        const photoTag = parts[2] || "none";
                        return (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 pr-2.5 shadow-2xs group/photo"
                          >
                            <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white relative">
                              <img
                                src={formatUrl(url)}
                                className="w-full h-full object-cover"
                                alt={photoName || "Day Photo"}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Input
                                value={photoName}
                                placeholder="Photo name / title..."
                                onChange={(e) =>
                                  updateDayPhoto(
                                    idx,
                                    pIdx,
                                    e.target.value,
                                    photoTag,
                                  )
                                }
                                className="h-5 text-[10px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white w-28 sm:w-36 px-2"
                              />
                              <select
                                value={photoTag}
                                onChange={(e) =>
                                  updateDayPhoto(
                                    idx,
                                    pIdx,
                                    photoName,
                                    e.target.value,
                                  )
                                }
                                className="h-5 text-[9px] font-bold border border-slate-200 rounded bg-white px-1 text-slate-700 focus:outline-none focus:border-[#FF6B00]"
                              >
                                <option value="none">No Badge (Nothing)</option>
                                <option value="included">✅ Included</option>
                                <option value="self-paid">🪙 Self Paid</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDayPhoto(idx, pIdx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors shrink-0"
                              title="Delete photo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      <div className="w-20 h-11 shrink-0">
                        <ImageUpload
                          compact
                          multiple
                          onUpload={(url) =>
                            updateDay(idx, "photos", [
                              ...(day.photos || []),
                              url,
                            ])
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="relative pl-6 pb-2">
                <div className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-50 border-2 border-slate-200" />
                <Button
                  onClick={addDay}
                  className="h-8 rounded-lg text-xs border-dashed"
                  variant="outline"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Add Day
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TRIP GLIMPSES & GALLERY TAB */}
          <TabsContent value="glimpses">
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Trip Glimpses &amp; Explorer Gallery
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Upload high-resolution photos to display in the Trip
                    Glimpses marquee slider on the product page.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#FF4D00]/5 text-[#FF6B00] border border-[#FF4D00]/30 text-xs font-bold px-3 py-1 rounded-full">
                    {(form.gallery || []).length} Photos Uploaded
                  </span>
                </div>
              </div>

              {/* Drag and Drop Uploader */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Add New Glimpse Photos
                </Label>
                <ImageUpload
                  multiple
                  label="Upload Glimpse Photos"
                  onUpload={() => {}}
                  onMultipleUpload={(urls) => {
                    const existingGallery = form.gallery || [];
                    const newItems = urls.map((url, idx) => ({
                      url,
                      alt: "",
                      order: existingGallery.length + idx,
                    }));
                    setForm({
                      ...form,
                      gallery: [...existingGallery, ...newItems],
                    });
                  }}
                />
              </div>

              {/* Photos Grid */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Uploaded Glimpses ({(form.gallery || []).length})
                  </Label>
                  {(form.gallery || []).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Remove all glimpse photos?")) {
                          setForm({ ...form, gallery: [] });
                        }
                      }}
                      className="text-xs text-red-600 hover:bg-red-50 h-7"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[500px] overflow-y-auto p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  {(form.gallery || []).map((img: any, i: number) => {
                    const imgUrl = typeof img === "string" ? img : img.url;
                    const altText =
                      typeof img === "string" ? "" : img.alt || "";
                    return (
                      <div
                        key={i}
                        className="group relative bg-white border border-slate-200/80 rounded-xl p-2 flex flex-col gap-2 shadow-2xs hover:border-[#FF6B00]/40 transition-all"
                      >
                        <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          <img
                            src={formatUrl(imgUrl)}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = form.gallery.filter(
                                (_: any, idx: number) => idx !== i,
                              );
                              setForm({ ...form, gallery: updated });
                            }}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <Input
                          value={altText}
                          placeholder="Photo Caption / Alt Text..."
                          onChange={(e) => {
                            const updated = [...form.gallery];
                            updated[i] = {
                              ...(typeof updated[i] === "string"
                                ? { url: updated[i] }
                                : updated[i]),
                              alt: e.target.value,
                            };
                            setForm({ ...form, gallery: updated });
                          }}
                          className="h-6 text-[10px] font-semibold border-slate-200 focus:border-[#FF6B00] bg-white"
                        />
                      </div>
                    );
                  })}

                  {(form.gallery || []).length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        No Glimpse Photos Uploaded Yet
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Use the upload box above to add photos to the marquee
                        slider.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="highlights">
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Trip Highlights
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      highlights: [
                        ...(form.highlights || []),
                        { name: "", image: "", description: "" },
                      ],
                    })
                  }
                  className="h-7 text-[9px] font-black uppercase border-dashed rounded-xl"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Highlight
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {form.highlights?.map((h: any, i: number) => {
                  const item =
                    typeof h === "string"
                      ? { name: h, image: "", description: "" }
                      : h;
                  return (
                    <div
                      key={i}
                      className="group relative bg-white border border-slate-200/80 rounded-xl p-3 flex items-center gap-3.5 shadow-2xs hover:border-[#FF6B00]/40 transition-all"
                    >
                      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <ImageUpload
                          compact
                          value={item.image || ""}
                          onUpload={(url) => {
                            const updated = [...form.highlights];
                            updated[i] = { ...item, image: url };
                            setForm({ ...form, highlights: updated });
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1 pr-6">
                        <Input
                          value={item.name || ""}
                          placeholder="Highlight Title"
                          onChange={(e) => {
                            const updated = [...form.highlights];
                            updated[i] = { ...item, name: e.target.value };
                            setForm({ ...form, highlights: updated });
                          }}
                          className="h-7 text-xs font-bold text-slate-900 border-slate-200 focus:border-[#FF6B00]"
                        />
                        <Input
                          value={item.description || ""}
                          placeholder="Short description..."
                          onChange={(e) => {
                            const updated = [...form.highlights];
                            updated[i] = {
                              ...item,
                              description: e.target.value,
                            };
                            setForm({ ...form, highlights: updated });
                          }}
                          className="h-7 text-[11px] font-medium border-slate-200 text-slate-600 focus:border-[#FF6B00]"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2.5 right-2.5 h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => {
                          const updated = form.highlights.filter(
                            (_: any, idx: number) => idx !== i,
                          );
                          setForm({ ...form, highlights: updated });
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inclexcl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-green-600">
                  Inclusions
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      addToList("inclusions", newInclusion, setNewInclusion)
                    }
                    className="rounded-xl h-9 text-xs"
                  />
                  <Button
                    size="icon"
                    onClick={() =>
                      addToList("inclusions", newInclusion, setNewInclusion)
                    }
                    className="rounded-xl h-9 w-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {form.inclusions?.map((item: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-green-50/30 rounded-xl border border-green-100 text-[10px]"
                    >
                      <span className="font-bold text-green-800">{item}</span>
                      <X
                        className="h-3 w-3 text-green-400 cursor-pointer"
                        onClick={() => removeFromList("inclusions", i)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-red-600">
                  Exclusions
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      addToList("exclusions", newExclusion, setNewExclusion)
                    }
                    className="rounded-xl h-9 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() =>
                      addToList("exclusions", newExclusion, setNewExclusion)
                    }
                    className="rounded-xl h-9 w-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {form.exclusions?.map((item: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-red-50/30 rounded-xl border border-red-100 text-[10px]"
                    >
                      <span className="font-bold text-red-800">{item}</span>
                      <X
                        className="h-3 w-3 text-red-400 cursor-pointer"
                        onClick={() => removeFromList("exclusions", i)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faqs">
            <div className="space-y-4 pt-4">
              {form.faqs?.map((faq: any, i: number) => (
                <div
                  key={i}
                  className="border bg-muted/10 p-4 rounded-2xl space-y-2 relative group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => removeFaq(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    value={faq.question}
                    placeholder="Question"
                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                    className="h-9 text-xs font-bold"
                  />
                  <Textarea
                    value={faq.answer}
                    placeholder="Answer"
                    onChange={(e) => updateFaq(i, "answer", e.target.value)}
                    className="text-xs min-h-[60px]"
                  />
                </div>
              ))}
              <Button
                onClick={addFaq}
                className="w-full h-12 border-dashed rounded-2xl"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New FAQ
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="attractions">
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                  Local Attractions
                </Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(slug) => {
                      const found = globalAttractions.find(
                        (a) => a.slug === slug,
                      );
                      if (found) {
                        setForm({
                          ...form,
                          attractions: [
                            ...(form.attractions || []),
                            {
                              name: found.name,
                              image: found.image,
                              slug: found.slug,
                              description: found.description,
                              order: form.attractions?.length || 0,
                            },
                          ],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-[10px] font-black uppercase tracking-widest rounded-xl bg-muted/50 border-none">
                      <SelectValue placeholder="PULL FROM LIBRARY" />
                    </SelectTrigger>
                    <SelectContent>
                      {globalAttractions.map((a) => (
                        <SelectItem key={a.slug} value={a.slug}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        attractions: [
                          ...(form.attractions || []),
                          {
                            name: "",
                            image: "",
                            slug: "",
                            description: "",
                            order: form.attractions?.length || 0,
                          },
                        ],
                      })
                    }
                    className="rounded-xl h-8 text-[10px] font-black uppercase"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Custom
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {(form.attractions || []).map((item: any, i: number) => (
                  <div
                    key={i}
                    className="border bg-muted/20 rounded-2xl p-6 space-y-4 relative group"
                  >
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => {
                          if (i === 0) return;
                          const updated = [...form.attractions];
                          [updated[i - 1], updated[i]] = [
                            updated[i],
                            updated[i - 1],
                          ];
                          setForm({ ...form, attractions: updated });
                        }}
                        disabled={i === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => {
                          if (i === form.attractions.length - 1) return;
                          const updated = [...form.attractions];
                          [updated[i], updated[i + 1]] = [
                            updated[i + 1],
                            updated[i],
                          ];
                          setForm({ ...form, attractions: updated });
                        }}
                        disabled={i === form.attractions.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() =>
                          setForm({
                            ...form,
                            attractions: form.attractions.filter(
                              (_: any, idx: number) => idx !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-4">
                      <ImageUpload
                        value={item.image}
                        className="w-48 shrink-0"
                        onUpload={(url) => {
                          const updated = [...form.attractions];
                          updated[i].image = url;
                          setForm({ ...form, attractions: updated });
                        }}
                      />
                      <div className="flex-1 space-y-3">
                        <Input
                          value={item.name}
                          placeholder="Attraction Name"
                          onChange={(e) => {
                            const updated = [...form.attractions];
                            updated[i].name = e.target.value;
                            updated[i].slug = slugify(e.target.value);
                            setForm({ ...form, attractions: updated });
                          }}
                          className="h-10 text-xs font-bold"
                        />
                        <Textarea
                          value={item.description}
                          placeholder="Short details..."
                          onChange={(e) => {
                            const updated = [...form.attractions];
                            updated[i].description = e.target.value;
                            setForm({ ...form, attractions: updated });
                          }}
                          className="h-20 text-[10px] font-medium"
                        />
                        <Input
                          value={item.slug}
                          placeholder="Slug"
                          readOnly
                          className="h-8 text-[10px] bg-muted/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="policies">
            <div className="space-y-8 pt-4">
              {/* Cancellation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Cancellation Policy Rules
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          cancellation: [
                            ...(form.popupDetails?.cancellation || []),
                            { label: "", val: "" },
                          ],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Rule
                  </Button>
                </div>
                <div className="space-y-2">
                  {(form.popupDetails?.cancellation || []).map(
                    (c: any, i: number) => (
                      <div key={i} className="flex gap-2 group">
                        <Input
                          value={c.label}
                          placeholder="Timeline (e.g. 30+ Days)"
                          onChange={(e) => {
                            const updated = [...form.popupDetails.cancellation];
                            updated[i].label = e.target.value;
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                cancellation: updated,
                              },
                            });
                          }}
                          className="h-8 text-xs"
                        />
                        <Input
                          value={c.val}
                          placeholder="Deduction (e.g. 10%)"
                          onChange={(e) => {
                            const updated = [...form.popupDetails.cancellation];
                            updated[i].val = e.target.value;
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                cancellation: updated,
                              },
                            });
                          }}
                          className="h-8 text-xs w-32"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated =
                              form.popupDetails.cancellation.filter(
                                (_: any, idx: number) => idx !== i,
                              );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                cancellation: updated,
                              },
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Carry */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Things to Carry (Categorical)
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          carry: [
                            ...(form.popupDetails?.carry || []),
                            { category: "", items: [] },
                          ],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Category
                  </Button>
                </div>
                <div className="space-y-6">
                  {(form.popupDetails?.carry || []).map(
                    (cat: any, catIdx: number) => (
                      <div
                        key={catIdx}
                        className="bg-muted/20 p-4 rounded-2xl border border-zinc-100 space-y-4 relative group"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated = form.popupDetails.carry.filter(
                              (_: any, idx: number) => idx !== catIdx,
                            );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                carry: updated,
                              },
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase opacity-40">
                            Category Name
                          </Label>
                          <Input
                            value={cat.category}
                            placeholder="e.g. Mandatory Requirements"
                            onChange={(e) => {
                              const updated = [...form.popupDetails.carry];
                              updated[catIdx].category = e.target.value;
                              setForm({
                                ...form,
                                popupDetails: {
                                  ...form.popupDetails,
                                  carry: updated,
                                },
                              });
                            }}
                            className="h-9 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-2 pl-4 border-l-2 border-zinc-100">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-[8px] font-black uppercase opacity-40">
                              Items
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = [...form.popupDetails.carry];
                                updated[catIdx].items = [
                                  ...(updated[catIdx].items || []),
                                  { text: "", link: "", linkText: "" },
                                ];
                                setForm({
                                  ...form,
                                  popupDetails: {
                                    ...form.popupDetails,
                                    carry: updated,
                                  },
                                });
                              }}
                              className="h-5 text-[8px] font-black uppercase"
                            >
                              + Add Item
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(cat.items || []).map(
                              (item: any, itemIdx: number) => (
                                <div
                                  key={itemIdx}
                                  className="flex gap-2 items-start"
                                >
                                  <Input
                                    value={item.text}
                                    placeholder="Item text"
                                    onChange={(e) => {
                                      const updated = [
                                        ...form.popupDetails.carry,
                                      ];
                                      updated[catIdx].items[itemIdx].text =
                                        e.target.value;
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          carry: updated,
                                        },
                                      });
                                    }}
                                    className="h-8 text-[10px] flex-1"
                                  />
                                  <Input
                                    value={item.linkText}
                                    placeholder="Link Text"
                                    onChange={(e) => {
                                      const updated = [
                                        ...form.popupDetails.carry,
                                      ];
                                      updated[catIdx].items[itemIdx].linkText =
                                        e.target.value;
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          carry: updated,
                                        },
                                      });
                                    }}
                                    className="h-8 text-[10px] w-24"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      const updated = [
                                        ...form.popupDetails.carry,
                                      ];
                                      updated[catIdx].items = updated[
                                        catIdx
                                      ].items.filter(
                                        (_: any, idx: number) =>
                                          idx !== itemIdx,
                                      );
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          carry: updated,
                                        },
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Gears (Categorical) */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Rented Gears (Categorical)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.popupDetails?.showRentedGears !== false}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            popupDetails: {
                              ...(form.popupDetails || {}),
                              showRentedGears: checked,
                            },
                          })
                        }
                      />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Visible on Trip Details
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          gears: [
                            ...(form.popupDetails?.gears || []),
                            { category: "", items: [] },
                          ],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Gear Category
                  </Button>
                </div>
                <div className="space-y-6">
                  {(form.popupDetails?.gears || []).map(
                    (cat: any, catIdx: number) => (
                      <div
                        key={catIdx}
                        className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4 relative group"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated = form.popupDetails.gears.filter(
                              (_: any, idx: number) => idx !== catIdx,
                            );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                gears: updated,
                              },
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase opacity-40">
                            Category Name
                          </Label>
                          <Input
                            value={cat.category}
                            placeholder="e.g. Trekking Essentials"
                            onChange={(e) => {
                              const updated = [...form.popupDetails.gears];
                              updated[catIdx].category = e.target.value;
                              setForm({
                                ...form,
                                popupDetails: {
                                  ...form.popupDetails,
                                  gears: updated,
                                },
                              });
                            }}
                            className="h-9 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-[8px] font-black uppercase opacity-40">
                              Items & Pricing
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = [...form.popupDetails.gears];
                                updated[catIdx].items = [
                                  ...(updated[catIdx].items || []),
                                  { item: "", price: "" },
                                ];
                                setForm({
                                  ...form,
                                  popupDetails: {
                                    ...form.popupDetails,
                                    gears: updated,
                                  },
                                });
                              }}
                              className="h-5 text-[8px] font-black uppercase"
                            >
                              + Add Item
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(cat.items || []).map(
                              (item: any, itemIdx: number) => (
                                <div
                                  key={itemIdx}
                                  className="flex gap-2 items-start"
                                >
                                  <Input
                                    value={item.item}
                                    placeholder="Gear Item"
                                    onChange={(e) => {
                                      const updated = [
                                        ...form.popupDetails.gears,
                                      ];
                                      updated[catIdx].items[itemIdx].item =
                                        e.target.value;
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          gears: updated,
                                        },
                                      });
                                    }}
                                    className="h-8 text-[10px] flex-1"
                                  />
                                  <Input
                                    value={item.price}
                                    placeholder="Price"
                                    onChange={(e) => {
                                      const updated = [
                                        ...form.popupDetails.gears,
                                      ];
                                      updated[catIdx].items[itemIdx].price =
                                        e.target.value;
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          gears: updated,
                                        },
                                      });
                                    }}
                                    className="h-8 text-[10px] w-24"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      const updated = [
                                        ...form.popupDetails.gears,
                                      ];
                                      updated[catIdx].items = updated[
                                        catIdx
                                      ].items.filter(
                                        (_: any, idx: number) =>
                                          idx !== itemIdx,
                                      );
                                      setForm({
                                        ...form,
                                        popupDetails: {
                                          ...form.popupDetails,
                                          gears: updated,
                                        },
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Terms & Conditions
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          terms: [...(form.popupDetails?.terms || []), ""],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Term
                  </Button>
                </div>
                <div className="space-y-2">
                  {(form.popupDetails?.terms || []).map(
                    (t: string, i: number) => (
                      <div key={i} className="flex gap-2 group">
                        <Textarea
                          value={t}
                          placeholder="Enter term..."
                          onChange={(e) => {
                            const updated = [...form.popupDetails.terms];
                            updated[i] = e.target.value;
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                terms: updated,
                              },
                            });
                          }}
                          className="text-xs min-h-[40px] flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated = form.popupDetails.terms.filter(
                              (_: any, idx: number) => idx !== i,
                            );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                terms: updated,
                              },
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Etiquette */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Local Etiquette & Rules
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          etiquette: [
                            ...(form.popupDetails?.etiquette || []),
                            { title: "", desc: "" },
                          ],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Rule
                  </Button>
                </div>
                <div className="space-y-3">
                  {(form.popupDetails?.etiquette || []).map(
                    (e: any, i: number) => (
                      <div
                        key={i}
                        className="bg-muted/30 p-3 rounded-xl space-y-2 relative group"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated = form.popupDetails.etiquette.filter(
                              (_: any, idx: number) => idx !== i,
                            );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                etiquette: updated,
                              },
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Input
                          value={e.title}
                          placeholder="Title"
                          onChange={(val) => {
                            const updated = [...form.popupDetails.etiquette];
                            updated[i].title = val.target.value;
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                etiquette: updated,
                              },
                            });
                          }}
                          className="h-8 text-xs font-bold"
                        />
                        <Textarea
                          value={e.desc}
                          placeholder="Description"
                          onChange={(val) => {
                            const updated = [...form.popupDetails.etiquette];
                            updated[i].desc = val.target.value;
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                etiquette: updated,
                              },
                            });
                          }}
                          className="text-[10px] min-h-[50px]"
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Custom Policies */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Custom Policy Sections
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        popupDetails: {
                          ...form.popupDetails,
                          customPolicies: [
                            ...(form.popupDetails?.customPolicies || []),
                            { label: "", type: "simple", content: "" },
                          ],
                        },
                      })
                    }
                    className="h-7 text-[9px] font-black uppercase"
                  >
                    Add Custom Section
                  </Button>
                </div>
                <div className="space-y-4">
                  {(form.popupDetails?.customPolicies || []).map(
                    (cp: any, i: number) => (
                      <div
                        key={i}
                        className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3 relative group"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updated =
                              form.popupDetails.customPolicies.filter(
                                (_: any, idx: number) => idx !== i,
                              );
                            setForm({
                              ...form,
                              popupDetails: {
                                ...form.popupDetails,
                                customPolicies: updated,
                              },
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase opacity-40">
                            Section Title
                          </Label>
                          <Input
                            value={cp.label}
                            placeholder="e.g. Health & Safety"
                            onChange={(val) => {
                              const updated = [
                                ...form.popupDetails.customPolicies,
                              ];
                              updated[i].label = val.target.value;
                              setForm({
                                ...form,
                                popupDetails: {
                                  ...form.popupDetails,
                                  customPolicies: updated,
                                },
                              });
                            }}
                            className="h-9 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase opacity-40">
                            Content (Simple List - One per line)
                          </Label>
                          <Textarea
                            value={
                              Array.isArray(cp.content)
                                ? cp.content.join("\n")
                                : cp.content
                            }
                            placeholder="Enter points..."
                            onChange={(val) => {
                              const updated = [
                                ...form.popupDetails.customPolicies,
                              ];
                              updated[i].content = val.target.value
                                .split("\n")
                                .filter(Boolean);
                              setForm({
                                ...form,
                                popupDetails: {
                                  ...form.popupDetails,
                                  customPolicies: updated,
                                },
                              });
                            }}
                            className="text-xs min-h-[100px]"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="videos">
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                  YouTube Video Gallery
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      videos: [...(form.videos || []), { id: "", title: "" }],
                    })
                  }
                  className="rounded-xl h-8 text-[10px] font-black uppercase"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Video
                </Button>
              </div>
              <div className="space-y-4">
                {(form.videos || []).map((video: any, i: number) => (
                  <div
                    key={i}
                    className="border bg-muted/20 rounded-2xl p-4 space-y-3 relative group"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() =>
                        setForm({
                          ...form,
                          videos: form.videos.filter(
                            (_: any, idx: number) => idx !== i,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex gap-4">
                      <div className="w-24 aspect-video bg-black rounded-lg overflow-hidden shrink-0">
                        {video.id && (
                          <img
                            src={`https://img.youtube.com/vi/${video.id}/default.jpg`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={video.id}
                          placeholder="YouTube Video ID (e.g. j6hb-iOZalE)"
                          onChange={(e) => {
                            const updated = [...form.videos];
                            updated[i].id = e.target.value;
                            setForm({ ...form, videos: updated });
                          }}
                          className="h-8 text-[10px] font-bold"
                        />
                        <Input
                          value={video.title}
                          placeholder="Video Title"
                          onChange={(e) => {
                            const updated = [...form.videos];
                            updated[i].title = e.target.value;
                            setForm({ ...form, videos: updated });
                          }}
                          className="h-8 text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="space-y-6 pt-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold tracking-tight">
                        Customer Reviews &amp; Testimonials Hub
                      </h3>
                      <span className="bg-[#FF5400] text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase">
                        Global + Tripwise
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Reviews on YouthCamping are managed in the central{" "}
                      <strong>Reviews Hub</strong>. You can create customer
                      reviews, assign ratings, set featured status, and map
                      reviews directly to{" "}
                      <span className="text-[#FF5400] font-bold">
                        {form.title || "this trip"}
                      </span>
                      .
                    </p>
                  </div>
                  <a
                    href="/admin/reviews"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#FF5400] hover:bg-[#d44500] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0"
                  >
                    Open Reviews Manager <Globe className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. Create Review
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Add traveler name, city, avatar, star rating (1-5), and
                    written story.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Link to Trip
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select <strong>{form.title || "Trip Name"}</strong> in the
                    Trip dropdown to display it here.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Feature on Web
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Toggle <strong>Is Featured</strong> to publish on website
                    trip detail page instantly.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo">
            <div className="space-y-8 pt-6">
              <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Globe className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">
                    Search Engine Master
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">
                    Control how this trip appears on Google & Social Media
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Meta Title
                  </Label>
                  <Input
                    value={form.seo?.metaTitle || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        seo: { ...form.seo, metaTitle: e.target.value },
                      })
                    }
                    className="rounded-2xl font-bold border-2 focus:border-primary h-12"
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-[9px] font-black text-primary uppercase">
                      {form.seo?.metaTitle?.length || 0}/60 Characters
                    </div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">
                      Ideal: 50-60
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Meta Description
                  </Label>
                  <Textarea
                    value={form.seo?.metaDescription || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        seo: { ...form.seo, metaDescription: e.target.value },
                      })
                    }
                    className="rounded-2xl font-medium min-h-[120px] border-2 focus:border-primary text-xs"
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-[9px] font-black text-primary uppercase">
                      {form.seo?.metaDescription?.length || 0}/160 Characters
                    </div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">
                      Ideal: 150-160
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      Focus Keyword
                    </Label>
                    <Input
                      value={form.seo?.focusKeyword || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          seo: { ...form.seo, focusKeyword: e.target.value },
                        })
                      }
                      className="rounded-xl border-none bg-muted/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      URL Slug
                    </Label>
                    <Input
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: slugify(e.target.value) })
                      }
                      className="rounded-xl border-none bg-muted/50 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-widest">
                      JSON-LD FAQ Schema
                    </h5>
                    <p className="text-[9px] text-muted-foreground">
                      Boost CTR with rich search results
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const schema = [
                        ...(form.seo?.faqSchema || []),
                        { question: "", answer: "" },
                      ];
                      setForm({
                        ...form,
                        seo: { ...form.seo, faqSchema: schema },
                      });
                    }}
                    className="rounded-xl h-8 text-[9px] font-black uppercase"
                  >
                    Add FAQ Row
                  </Button>
                </div>

                <div className="space-y-3">
                  {(form.seo?.faqSchema || []).map((faq: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/30 rounded-2xl relative group border"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => {
                          const schema = form.seo.faqSchema.filter(
                            (_: any, i: number) => i !== idx,
                          );
                          setForm({
                            ...form,
                            seo: { ...form.seo, faqSchema: schema },
                          });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Input
                        value={faq.question}
                        onChange={(e) => {
                          const schema = [...form.seo.faqSchema];
                          schema[idx].question = e.target.value;
                          setForm({
                            ...form,
                            seo: { ...form.seo, faqSchema: schema },
                          });
                        }}
                        placeholder="Question"
                        className="bg-transparent border-none font-bold mb-1 p-0 h-auto focus-visible:ring-0 text-xs"
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const schema = [...form.seo.faqSchema];
                          schema[idx].answer = e.target.value;
                          setForm({
                            ...form,
                            seo: { ...form.seo, faqSchema: schema },
                          });
                        }}
                        placeholder="Answer"
                        className="bg-transparent border-none text-[10px] font-medium p-0 h-auto min-h-[40px] focus-visible:ring-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="advanced">
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Departure City
                  </Label>
                  <Input
                    value={form.departureCity}
                    onChange={(e) =>
                      setForm({ ...form, departureCity: e.target.value })
                    }
                    placeholder="e.g. Ahmedabad"
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Age Limit
                  </Label>
                  <Input
                    value={form.ageLimit}
                    onChange={(e) =>
                      setForm({ ...form, ageLimit: e.target.value })
                    }
                    placeholder="e.g. 15-35 Years"
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Max Group Size
                  </Label>
                  <Input
                    type="number"
                    value={form.maxGroupSize}
                    onChange={(e) =>
                      setForm({ ...form, maxGroupSize: Number(e.target.value) })
                    }
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    Difficulty
                  </Label>
                  <Select
                    value={form.difficulty}
                    onValueChange={(v: any) =>
                      setForm({ ...form, difficulty: v })
                    }
                  >
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                  External Booking URL
                </Label>
                <Input
                  value={form.bookingUrl}
                  onChange={(e) =>
                    setForm({ ...form, bookingUrl: e.target.value })
                  }
                  placeholder="https://external-booking.com/..."
                  className="rounded-xl h-10"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stay">
            <div className="space-y-5 pt-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Stay & Accommodations
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Define the hotels, camps, and stays for each leg of this
                    trip.
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      accommodations: [
                        ...(form.accommodations || []),
                        {
                          name: "",
                          location: "",
                          nights: "",
                          type: "",
                          starRating: "",
                          roomType: "",
                          meals: "",
                          image: "",
                          gallery: [],
                        },
                      ],
                    })
                  }
                  className="rounded-xl h-8 text-[10px] font-black uppercase border-dashed"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add Property
                </Button>
              </div>

              {(form.accommodations || []).length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    No Stays Defined Yet
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Click "Add Property" to add accommodation details for this
                    trip.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {(form.accommodations || []).map((item: any, i: number) => (
                  <div
                    key={i}
                    className="group relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs hover:border-[#FF6B00]/30 transition-all"
                  >
                    {/* Header row: thumbnail + property details */}
                    <div className="flex gap-4 p-4 pb-3">
                      {/* Small thumbnail */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
                        {item.image ? (
                          <>
                            <img
                              src={formatUrl(item.image)}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.accommodations];
                                updated[i].image = "";
                                setForm({ ...form, accommodations: updated });
                              }}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <ImageUpload
                            compact
                            onUpload={(url) => {
                              const updated = [...form.accommodations];
                              updated[i].image = url;
                              setForm({ ...form, accommodations: updated });
                            }}
                          />
                        )}
                      </div>

                      {/* Property info grid */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 min-w-0">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Property Name
                          </Label>
                          <Input
                            value={item.name || ""}
                            placeholder="e.g. Sandy Waves Resort"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].name = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Nights
                          </Label>
                          <Input
                            value={item.nights || ""}
                            placeholder="e.g. 2"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].nights = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Star Rating / Type
                          </Label>
                          <Input
                            value={item.starRating || ""}
                            placeholder="e.g. 4 Star"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].starRating = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Room Category
                          </Label>
                          <Input
                            value={item.roomType || ""}
                            placeholder="e.g. Premium Room"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].roomType = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Meals Included
                          </Label>
                          <Input
                            value={item.meals || ""}
                            placeholder="e.g. Breakfast, Dinner"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].meals = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Location
                          </Label>
                          <Input
                            value={item.location || ""}
                            placeholder="e.g. Havelock Island"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              updated[i].location = e.target.value;
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-3 space-y-0.5 mt-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                            Key Stay Highlights / Amenities (Comma Separated)
                          </Label>
                          <Input
                            value={
                              Array.isArray(item.amenities)
                                ? item.amenities.join(", ")
                                : item.amenities || ""
                            }
                            placeholder="e.g. Air Conditioning, Free Wi-Fi, Swimming Pool, Mountain View, Buffet Breakfast"
                            onChange={(e) => {
                              const updated = [...form.accommodations];
                              const val = e.target.value;
                              updated[i].amenities = val
                                ? val
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                : [];
                              setForm({ ...form, accommodations: updated });
                            }}
                            className="h-7 text-[11px] font-bold border-amber-200 focus:border-[#FF6B00] bg-amber-50/30 px-2 rounded-lg"
                          />
                        </div>

                        {/* Food & Meals Breakdown */}
                        <div className="col-span-2 md:col-span-3 space-y-1.5 mt-2 pt-2 border-t border-slate-200/80">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">
                            Food & Meals Menu Breakdown
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                              <Label className="text-[8px] font-bold uppercase text-slate-500">
                                Breakfast Menu
                              </Label>
                              <Input
                                value={item.mealsBreakdown?.breakfast || ""}
                                placeholder="e.g. Stuffed Paratha, Poori & Baji, Tea"
                                onChange={(e) => {
                                  const updated = [...form.accommodations];
                                  updated[i].mealsBreakdown = {
                                    ...(updated[i].mealsBreakdown || {}),
                                    breakfast: e.target.value,
                                  };
                                  setForm({ ...form, accommodations: updated });
                                }}
                                className="h-7 text-[11px] font-semibold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[8px] font-bold uppercase text-slate-500">
                                Lunch Menu
                              </Label>
                              <Input
                                value={item.mealsBreakdown?.lunch || ""}
                                placeholder="e.g. Rajma Rice, Dal, Aloo Mattar, Roti"
                                onChange={(e) => {
                                  const updated = [...form.accommodations];
                                  updated[i].mealsBreakdown = {
                                    ...(updated[i].mealsBreakdown || {}),
                                    lunch: e.target.value,
                                  };
                                  setForm({ ...form, accommodations: updated });
                                }}
                                className="h-7 text-[11px] font-semibold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-[8px] font-bold uppercase text-slate-500">
                                Dinner Menu
                              </Label>
                              <Input
                                value={item.mealsBreakdown?.dinner || ""}
                                placeholder="e.g. Paneer Dish, Dal, Rice, Roti, Dessert"
                                onChange={(e) => {
                                  const updated = [...form.accommodations];
                                  updated[i].mealsBreakdown = {
                                    ...(updated[i].mealsBreakdown || {}),
                                    dinner: e.target.value,
                                  };
                                  setForm({ ...form, accommodations: updated });
                                }}
                                className="h-7 text-[11px] font-semibold border-slate-200 focus:border-[#FF6B00] bg-white px-2 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            accommodations: form.accommodations.filter(
                              (_: any, idx: number) => idx !== i,
                            ),
                          })
                        }
                        className="self-start text-slate-300 hover:text-red-600 p-1 rounded transition-colors shrink-0"
                        title="Remove property"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Gallery section */}
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Gallery Photos ({(item.gallery || []).length})
                        </Label>
                        <div className="w-24">
                          <ImageUpload
                            compact
                            multiple
                            onMultipleUpload={(urls: string[]) => {
                              const updated = [...form.accommodations];
                              const newImgs = urls.map((url) => ({
                                url,
                                category: "Interior",
                              }));
                              updated[i].gallery = [
                                ...(updated[i].gallery || []),
                                ...newImgs,
                              ];
                              setForm({ ...form, accommodations: updated });
                            }}
                            onUpload={(url: string) => {
                              const updated = [...form.accommodations];
                              updated[i].gallery = [
                                ...(updated[i].gallery || []),
                                { url, category: "Interior" },
                              ];
                              setForm({ ...form, accommodations: updated });
                            }}
                          />
                        </div>
                      </div>

                      {(item.gallery || []).length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {(item.gallery || []).map(
                            (img: any, gidx: number) => (
                              <div
                                key={gidx}
                                className="relative rounded-lg overflow-hidden border border-slate-200 bg-white group/photo"
                              >
                                <div className="aspect-square">
                                  <img
                                    src={formatUrl(
                                      typeof img === "string" ? img : img.url,
                                    )}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                                {/* Category selector overlay at bottom */}
                                <select
                                  value={img.category || "Interior"}
                                  onChange={(e) => {
                                    const updated = [...form.accommodations];
                                    const gal = [...(updated[i].gallery || [])];
                                    gal[gidx] = {
                                      ...(typeof gal[gidx] === "string"
                                        ? { url: gal[gidx] }
                                        : gal[gidx]),
                                      category: e.target.value,
                                    };
                                    updated[i].gallery = gal;
                                    setForm({
                                      ...form,
                                      accommodations: updated,
                                    });
                                  }}
                                  className="w-full text-[8px] font-bold text-slate-600 bg-slate-50 border-t border-slate-200 px-1.5 py-1 focus:outline-none focus:bg-white cursor-pointer"
                                >
                                  <option value="Exterior">Exterior</option>
                                  <option value="Interior">
                                    Interior / Rooms
                                  </option>
                                  <option value="Premium Room">
                                    Premium Room
                                  </option>
                                  <option value="Bathroom">Bathroom</option>
                                  <option value="Swimming Pool">
                                    Swimming Pool
                                  </option>
                                  <option value="Dining">Dining Area</option>
                                  <option value="Property & Views">
                                    Property & Views
                                  </option>
                                </select>
                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...form.accommodations];
                                    updated[i].gallery = updated[
                                      i
                                    ].gallery.filter(
                                      (_: any, idx: number) => idx !== gidx,
                                    );
                                    setForm({
                                      ...form,
                                      accommodations: updated,
                                    });
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/photo:opacity-100 transition-all shadow-sm"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg bg-white">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            No gallery photos yet — upload above
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="experimental">
            <div className="space-y-6 pt-4">
              <Accordion type="single" collapsible className="w-full">
                {/* Activities */}
                <AccordionItem value="activities">
                  <AccordionTrigger className="text-xs font-bold uppercase">
                    Trip Activities
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                          Trip Activities
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={(slug) => {
                              const found = globalAttractions.find(
                                (a) => a.slug === slug,
                              );
                              if (found) {
                                setForm({
                                  ...form,
                                  activities: [
                                    ...(form.activities || []),
                                    {
                                      name: found.name,
                                      image: found.image,
                                      slug: found.slug,
                                      description: found.description,
                                      order: form.activities?.length || 0,
                                    },
                                  ],
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-[10px] font-black uppercase tracking-widest rounded-xl bg-muted/50 border-none">
                              <SelectValue placeholder="PULL FROM LIBRARY" />
                            </SelectTrigger>
                            <SelectContent>
                              {globalAttractions.map((a) => (
                                <SelectItem key={a.slug} value={a.slug}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            type="button"
                            size="sm"
                            onClick={() =>
                              setForm({
                                ...form,
                                activities: [
                                  ...(form.activities || []),
                                  {
                                    name: "",
                                    image: "",
                                    slug: "",
                                    description: "",
                                    order: form.activities?.length || 0,
                                  },
                                ],
                              })
                            }
                            className="rounded-xl h-8 text-[10px] font-black uppercase"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Custom
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {(form.activities || []).map((item: any, i: number) => (
                          <div
                            key={i}
                            className="border bg-muted/20 rounded-2xl p-6 space-y-4 relative group"
                          >
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => {
                                  if (i === 0) return;
                                  const updated = [...form.activities];
                                  [updated[i - 1], updated[i]] = [
                                    updated[i],
                                    updated[i - 1],
                                  ];
                                  setForm({ ...form, activities: updated });
                                }}
                                disabled={i === 0}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => {
                                  if (i === form.activities.length - 1) return;
                                  const updated = [...form.activities];
                                  [updated[i], updated[i + 1]] = [
                                    updated[i + 1],
                                    updated[i],
                                  ];
                                  setForm({ ...form, activities: updated });
                                }}
                                disabled={i === form.activities.length - 1}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-6 w-6 text-destructive"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    activities: form.activities.filter(
                                      (_: any, idx: number) => idx !== i,
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex gap-4">
                              <ImageUpload
                                value={item.image}
                                className="w-48 shrink-0"
                                onUpload={(url) => {
                                  const updated = [...form.activities];
                                  updated[i].image = url;
                                  setForm({ ...form, activities: updated });
                                }}
                              />
                              <div className="flex-1 space-y-3">
                                <Input
                                  value={item.name}
                                  placeholder="Activity Name"
                                  onChange={(e) => {
                                    const updated = [...form.activities];
                                    updated[i].name = e.target.value;
                                    updated[i].slug = slugify(e.target.value);
                                    setForm({ ...form, activities: updated });
                                  }}
                                  className="h-10 text-xs font-bold"
                                />
                                <Textarea
                                  value={item.description}
                                  placeholder="Short details..."
                                  onChange={(e) => {
                                    const updated = [...form.activities];
                                    updated[i].description = e.target.value;
                                    setForm({ ...form, activities: updated });
                                  }}
                                  className="h-20 text-[10px] font-medium"
                                />
                                <Input
                                  value={item.slug}
                                  placeholder="Slug"
                                  readOnly
                                  className="h-8 text-[10px] bg-muted/50"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Traveler Reels */}
                <AccordionItem value="reels">
                  <AccordionTrigger className="text-xs font-bold uppercase">
                    Traveler Reels
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                            Traveler Reels
                          </Label>
                          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                            Add vertical videos to showcase real moments
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              reels: [
                                ...(form.reels || []),
                                { url: "", thumbnail: "", caption: "" },
                              ],
                            })
                          }
                          className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
                        >
                          <Plus className="w-3 h-3 mr-2" /> Add Reel
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {(form.reels || []).map((reel: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-zinc-50 rounded-[32px] p-6 border border-zinc-100 relative group transition-all hover:border-[#FF5400]/30"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.reels];
                                updated.splice(idx, 1);
                                setForm({ ...form, reels: updated });
                              }}
                              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-all z-10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="space-y-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                  Reel URL (YouTube/Insta/MP4)
                                </Label>
                                <Input
                                  value={reel.url}
                                  onChange={(e) => {
                                    const updated = [...form.reels];
                                    updated[idx].url = e.target.value;
                                    setForm({ ...form, reels: updated });
                                  }}
                                  placeholder="Enter video link..."
                                  className="rounded-2xl font-bold bg-white h-11"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    Cover Image
                                  </Label>
                                  <div className="flex flex-col gap-3">
                                    {reel.thumbnail && (
                                      <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden border shadow-inner bg-black flex items-center justify-center">
                                        <img
                                          src={reel.thumbnail}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <ImageUpload
                                      onUpload={(url) => {
                                        const updated = [...form.reels];
                                        updated[idx].thumbnail = url;
                                        setForm({ ...form, reels: updated });
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2 flex flex-col">
                                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    Caption
                                  </Label>
                                  <Textarea
                                    value={reel.caption}
                                    onChange={(e) => {
                                      const updated = [...form.reels];
                                      updated[idx].caption = e.target.value;
                                      setForm({ ...form, reels: updated });
                                    }}
                                    placeholder="Brief moment description..."
                                    className="rounded-2xl font-bold flex-1 resize-none bg-white p-4"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!form.reels || form.reels.length === 0) && (
                          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-[40px] border-zinc-100 bg-zinc-50/50">
                            <p className="text-zinc-400 font-black uppercase italic text-[10px] tracking-widest">
                              Share the magic! Add your first traveler reel.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Trip Reviews */}
                <AccordionItem value="reviews">
                  <AccordionTrigger className="text-xs font-bold uppercase">
                    Trip Reviews
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-xs font-black uppercase tracking-widest opacity-50">
                            Trip Reviews
                          </Label>
                          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                            Manage authentic feedback for this expedition
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              reviews: [
                                ...(form.reviews || []),
                                {
                                  userName: "",
                                  city: "",
                                  comment: "",
                                  rating: 5,
                                  userImage: "",
                                  photos: [],
                                  tripType: "Joined Group Trip",
                                },
                              ],
                            })
                          }
                          className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
                        >
                          <Plus className="w-3 h-3 mr-2" /> Add Review
                        </Button>
                      </div>

                      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-10">
                        {(form.reviews || []).map((rev: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200/80 rounded-2xl p-5 relative group shadow-2xs space-y-4"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">
                                  Review #{idx + 1}
                                </span>
                                {(!rev.userName || !rev.comment) && (
                                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                                    Fill name &amp; comment to save
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updated = [...form.reviews];
                                  updated.splice(idx, 1);
                                  setForm({ ...form, reviews: updated });
                                }}
                                className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Left side: Basic Info */}
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                      Reviewer Name
                                    </Label>
                                    <Input
                                      value={rev.userName}
                                      onChange={(e) => {
                                        const updated = [...form.reviews];
                                        updated[idx].userName = e.target.value;
                                        setForm({ ...form, reviews: updated });
                                      }}
                                      placeholder="e.g. Deep Bhuvar"
                                      className="rounded-xl font-bold bg-zinc-50 h-11"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                      City
                                    </Label>
                                    <Input
                                      value={rev.city}
                                      onChange={(e) => {
                                        const updated = [...form.reviews];
                                        updated[idx].city = e.target.value;
                                        setForm({ ...form, reviews: updated });
                                      }}
                                      placeholder="e.g. Ahmedabad"
                                      className="rounded-xl font-bold bg-zinc-50 h-11"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                      Trip Type Label
                                    </Label>
                                    <Input
                                      value={rev.tripType}
                                      onChange={(e) => {
                                        const updated = [...form.reviews];
                                        updated[idx].tripType = e.target.value;
                                        setForm({ ...form, reviews: updated });
                                      }}
                                      placeholder="e.g. Joined Group Trip"
                                      className="rounded-xl font-bold bg-zinc-50 h-11"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                      Rating (1-5)
                                    </Label>
                                    <div className="flex gap-1 h-11 items-center px-4 bg-zinc-50 rounded-xl border border-input">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          onClick={() => {
                                            const updated = [...form.reviews];
                                            updated[idx].rating = star;
                                            setForm({
                                              ...form,
                                              reviews: updated,
                                            });
                                          }}
                                          className={`w-4 h-4 cursor-pointer transition-all ${star <= rev.rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-300 hover:text-yellow-200"}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center justify-between">
                                    Feedback / Comment
                                    <span className="text-[8px] text-[#FF5400]">
                                      Required
                                    </span>
                                  </Label>
                                  <Textarea
                                    value={rev.comment}
                                    onChange={(e) => {
                                      const updated = [...form.reviews];
                                      updated[idx].comment = e.target.value;
                                      setForm({ ...form, reviews: updated });
                                    }}
                                    placeholder="Write the review here..."
                                    className="rounded-2xl font-medium leading-relaxed bg-zinc-50 h-32 p-4"
                                  />
                                </div>
                              </div>

                              {/* Right side: Photos */}
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    Reviewer Image
                                  </Label>
                                  <div className="flex items-center gap-4">
                                    {rev.userImage && (
                                      <div className="w-12 h-12 rounded-full overflow-hidden border shadow-sm">
                                        <img
                                          src={rev.userImage}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <ImageUpload
                                      onUpload={(url) => {
                                        const updated = [...form.reviews];
                                        updated[idx].userImage = url;
                                        setForm({ ...form, reviews: updated });
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    Review Gallery (Up to 4)
                                  </Label>
                                  <div className="grid grid-cols-4 gap-2 mb-2">
                                    {(rev.photos || []).map(
                                      (p: string, pidx: number) => (
                                        <div
                                          key={pidx}
                                          className="relative aspect-square rounded-lg overflow-hidden border bg-zinc-100 group/img"
                                        >
                                          <img
                                            src={p}
                                            className="w-full h-full object-cover"
                                          />
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const url = rev.photos[pidx];
                                              if (
                                                confirm(
                                                  "Permanently delete this photo from the server?",
                                                )
                                              ) {
                                                await deleteServerFile(url);
                                                const updated = [
                                                  ...form.reviews,
                                                ];
                                                updated[idx].photos = updated[
                                                  idx
                                                ].photos.filter(
                                                  (_: any, pi: number) =>
                                                    pi !== pidx,
                                                );
                                                setForm({
                                                  ...form,
                                                  reviews: updated,
                                                });
                                              }
                                            }}
                                            className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-all"
                                          >
                                            <X className="w-2 h-2" />
                                          </button>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <ImageUpload
                                    multiple
                                    onUpload={(urls) => {
                                      const updated = [...form.reviews];
                                      const newPhotos = [
                                        ...(updated[idx].photos || []),
                                        ...(Array.isArray(urls)
                                          ? urls
                                          : [urls]),
                                      ].slice(0, 4);
                                      updated[idx].photos = newPhotos;
                                      setForm({ ...form, reviews: updated });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!form.reviews || form.reviews.length === 0) && (
                          <div className="py-12 text-center border-2 border-dashed rounded-[40px] border-zinc-100 bg-zinc-50/20">
                            <p className="text-zinc-400 font-bold uppercase italic text-[10px] tracking-widest">
                              No reviews added for this trip yet
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}

