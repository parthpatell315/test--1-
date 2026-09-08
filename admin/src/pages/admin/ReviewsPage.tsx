import { useEffect, useState, useCallback, useMemo } from "react";
import { reviewsService } from "@/services/reviews.service";
import { tripsService } from "@/services/trips.service";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  MessageSquare,
  MapPin,
  X,
  Sparkles,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/ImageUpload";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedTripFilter, setSelectedTripFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [formData, setFormData] = useState({
    userName: "",
    city: "",
    tripId: "",
    tripName: "",
    tripType: "Joined Group Trip",
    comment: "",
    rating: 5,
    userImage: "",
    photo: "",
    isFeatured: true,
    photos: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revs, tps] = await Promise.all([
        reviewsService.getAll(),
        tripsService.getAll(),
      ]);
      setReviews(revs || []);
      setTrips(tps || []);
    } catch (error) {
      toast.error("Failed to load reviews data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      userName: "",
      city: "",
      tripId: "",
      tripName: "",
      tripType: "Joined Group Trip",
      comment: "",
      rating: 5,
      userImage: "",
      photo: "",
      isFeatured: true,
      photos: [],
    });
    setModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setFormData({
      userName: r.userName || "",
      city: r.city || "",
      tripId: r.tripId || "",
      tripName: r.tripName || "",
      tripType: r.tripType || "Joined Group Trip",
      comment: r.comment || "",
      rating: r.rating || 5,
      userImage: r.userImage || "",
      photo: r.photo || (r.photos && r.photos[0]) || "",
      isFeatured: r.isFeatured !== false,
      photos: r.photos || [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.userName) return toast.error("Customer name is required");
    if (!formData.comment) return toast.error("Review comment is required");

    const finalPhotos = [...(formData.photos || [])];
    if (formData.photo && !finalPhotos.includes(formData.photo)) {
      finalPhotos.unshift(formData.photo);
    }

    const payload: any = {
      ...formData,
      photos: finalPhotos,
      rating: Number(formData.rating) || 5,
    };
    delete payload.photo;

    try {
      if (editing) {
        await reviewsService.update(editing._id || editing.id, payload);
        toast.success("Review updated successfully");
      } else {
        await reviewsService.create(payload);
        toast.success("New review created successfully");
      }
      setModalOpen(false);
      load();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to save review";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await reviewsService.remove(id);
      toast.success("Review deleted");
      load();
    } catch (error) {
      toast.error("Failed to delete review");
    }
  };

  const toggleFeatured = async (r: any) => {
    try {
      await reviewsService.update(r.id || r._id, { isFeatured: !r.isFeatured });
      toast.success(
        r.isFeatured ? "Unpublished from featured" : "Featured on website",
      );
      load();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchTrip =
        selectedTripFilter === "all" ||
        r.tripId === selectedTripFilter ||
        r.tripName === selectedTripFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (r.userName || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q) ||
        (r.tripName || "").toLowerCase().includes(q);
      return matchTrip && matchSearch;
    });
  }, [reviews, selectedTripFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = reviews.length;
    const featured = reviews.filter((r) => r.isFeatured).length;
    const avgRating =
      total > 0
        ? (
            reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / total
          ).toFixed(1)
        : "5.0";
    const uniqueTrips = new Set(reviews.map((r) => r.tripName).filter(Boolean))
      .size;
    return { total, featured, avgRating, uniqueTrips };
  }, [reviews]);

  return (
    <div className="admin-page animate-fade-in">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/30/80 flex items-center justify-center shrink-0 shadow-2xs">
            <MessageSquare className="w-5 h-5 text-[#FF5400]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-montserrat">
                Customer Reviews Hub
              </h1>
              <span className="bg-green-100 text-green-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                Synced Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage customer testimonials, trip photos, and website featured
              reviews
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="h-10 px-5 rounded-xl font-extrabold text-xs bg-[#FF5400] hover:bg-[#d44500] text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0"
        >
          <Plus className="h-4 w-4" /> Add New Review
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Reviews
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {stats.total}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Featured on Web
            </p>
            <p className="text-2xl font-black text-green-600 mt-1">
              {stats.featured}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Average Rating
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-2xl font-black text-slate-900">
                {stats.avgRating}
              </p>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center font-bold">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Trips Covered
            </p>
            <p className="text-2xl font-black text-[#FF4D00] mt-1">
              {stats.uniqueTrips}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/5 text-[#FF4D00] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Trip Selector Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setSelectedTripFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedTripFilter === "all"
                  ? "bg-[#FF5400] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Reviews ({reviews.length})
            </button>
            {trips.map((t) => {
              const count = reviews.filter(
                (r) => r.tripId === (t.id || t._id) || r.tripName === t.title,
              ).length;
              return (
                <button
                  key={t.id || t._id}
                  onClick={() => setSelectedTripFilter(t.id || t._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedTripFilter === (t.id || t._id)
                      ? "bg-[#FF5400] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.title} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64 shrink-0">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, city, or text..."
              className="h-9 rounded-xl text-xs font-medium border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Reviews Grid Cards Display */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-2xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Loading customer reviews...
          </p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-extrabold text-slate-700">
            No Reviews Match Current Filter
          </p>
          <p className="text-xs text-slate-400">
            Click "Add New Review" above to publish traveler feedback for this
            trip.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((r: any) => {
            const ratingCount = Math.min(5, Math.max(1, Number(r.rating) || 5));
            return (
              <div
                key={r.id || r._id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group ${
                  r.isFeatured
                    ? "border-green-200 bg-green-50/20"
                    : "border-slate-200/80"
                }`}
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      {r.userImage ? (
                        <img
                          src={r.userImage}
                          alt={r.userName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center uppercase shrink-0 border border-slate-200">
                          {(r.userName || "U").slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {r.userName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.city && (
                            <span className="text-[10px] font-bold text-[#FF5400] bg-[#FF4D00]/5 border border-[#FF4D00]/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {r.city}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-500 truncate">
                            {r.tripName || "Trip Review"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(r)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id || r._id)}
                        className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Rating Stars & Comment */}
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(ratingCount)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1.5">
                        {ratingCount}.0
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium line-clamp-3">
                      "{r.comment}"
                    </p>

                    {/* Attached Photos Preview Grid */}
                    {((r.photos && r.photos.length > 0) || r.photo) && (
                      <div className="pt-2 grid grid-cols-3 gap-1.5">
                        {(r.photos && r.photos.length > 0
                          ? r.photos.slice(0, 3)
                          : [r.photo]
                        ).map((pUrl: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200/60"
                          >
                            <img
                              src={pUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.isFeatured}
                      onCheckedChange={() => toggleFeatured(r)}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${r.isFeatured ? "text-green-700" : "text-slate-400"}`}
                    >
                      {r.isFeatured ? "Featured" : "Hidden"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Review Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full rounded-2xl p-6 border border-slate-200 shadow-xl max-h-[92dvh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight font-montserrat flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF5400]" />
              {editing ? "Edit Customer Review" : "Add New Customer Review"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Customer Name *
                </Label>
                <Input
                  className="rounded-xl h-10 text-xs font-bold"
                  value={formData.userName}
                  onChange={(e) =>
                    setFormData({ ...formData, userName: e.target.value })
                  }
                  placeholder="e.g. Bhumit Rabadiya"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Customer City / State
                </Label>
                <Input
                  className="rounded-xl h-10 text-xs font-bold"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="e.g. Ahmedabad, Gujarat"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Map to Trip *
                </Label>
                <Select
                  value={formData.tripId}
                  onValueChange={(val) => {
                    const selected = trips.find((t) => (t.id || t._id) === val);
                    setFormData({
                      ...formData,
                      tripId: val,
                      tripName: selected?.title || "",
                    });
                  }}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Select Trip" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {trips.map((t) => (
                      <SelectItem key={t.id || t._id} value={t.id || t._id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Star Rating (1 - 5 Stars)
                </Label>
                <Select
                  value={String(formData.rating)}
                  onValueChange={(val) =>
                    setFormData({ ...formData, rating: Number(val) })
                  }
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Select Rating" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="5">
                      ⭐⭐⭐⭐⭐ (5.0 Excellent)
                    </SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ (4.0 Good)</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ (3.0 Average)</SelectItem>
                    <SelectItem value="2">⭐⭐ (2.0 Below Average)</SelectItem>
                    <SelectItem value="1">⭐ (1.0 Poor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Review Comment / Feedback *
              </Label>
              <Textarea
                className="rounded-xl min-h-[100px] p-3 text-xs font-medium leading-relaxed"
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                placeholder="Paste traveler's feedback story..."
              />
            </div>

            {/* Photo Uploaders Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-montserrat flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF5400]" /> Review Photos
                &amp; Media Uploaders
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    1. Customer Profile Avatar
                  </Label>
                  <p className="text-[10px] text-slate-400">
                    Small face avatar photo displayed next to name
                  </p>
                  <ImageUpload
                    value={formData.userImage}
                    onUpload={(url) =>
                      setFormData({ ...formData, userImage: url })
                    }
                  />
                </div>

                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    2. Main Cover Photo
                  </Label>
                  <p className="text-[10px] text-slate-400">
                    Landscape hero photo at top of card
                  </p>
                  <ImageUpload
                    value={formData.photo}
                    onUpload={(url) => setFormData({ ...formData, photo: url })}
                  />
                </div>
              </div>

              {/* Multiple Gallery Photos Uploader */}
              <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                      3. Multiple Trip Gallery Photos
                    </Label>
                    <p className="text-[10px] text-slate-400">
                      Upload multiple photos taken by customer during the trip
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#FF4D00]/5 border border-[#FF4D00]/30/80 text-[#FF5400] px-2.5 py-0.5 rounded-full">
                    {formData.photos?.length || 0} Photos Uploaded
                  </span>
                </div>

                {/* Uploaded Gallery Thumbnails */}
                {formData.photos && formData.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1 pb-2">
                    {formData.photos.map((pUrl: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group shadow-2xs"
                      >
                        <img
                          src={pUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.photos.filter(
                              (_, i) => i !== idx,
                            );
                            setFormData({ ...formData, photos: updated });
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-Photo Uploader Dropzone */}
                <ImageUpload
                  multiple
                  onUpload={(urls) => {
                    const newUrls = Array.isArray(urls) ? urls : [urls];
                    setFormData({
                      ...formData,
                      photos: [...(formData.photos || []), ...newUrls],
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mt-1">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Publish &amp; Feature on Website
                </p>
                <p className="text-[10px] text-slate-400">
                  Display this review in the "WHAT TRAVELERS SAY" section on
                  website
                </p>
              </div>
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, isFeatured: v })
                }
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto rounded-xl h-9 px-5 font-extrabold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto rounded-xl h-9 px-6 font-extrabold text-xs bg-[#FF5400] hover:bg-[#d44500] text-white shadow-md"
            >
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

