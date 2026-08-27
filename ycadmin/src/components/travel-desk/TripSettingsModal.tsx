import React, { useState, useEffect } from "react";
import { X, Save, Loader2, AlertCircle } from "lucide-react";
import { Trip } from "@/types";
import api from "@/services/api";
import { toast } from "sonner";

interface TripSettingsModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedTrip: Trip) => void;
}

const DIFFICULTY_OPTIONS = ["Easy", "Moderate", "Difficult", "Challenging"];
const CATEGORY_OPTIONS = [
  "Domestic Trip",
  "International",
  "Backpacking",
  "Adventure",
  "Cultural",
  "Wildlife",
  "Beach",
];

export const TripSettingsModal: React.FC<TripSettingsModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [form, setForm] = useState({
    title: "",
    code: "",
    duration: "",
    location: "",
    difficulty: "",
    category: "",
    maxGroupSize: "",
    heroImage: "",
    description: "",
    slug: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      setForm({
        title: trip.title || "",
        code: (trip as any).code || "",
        duration: trip.duration || "",
        location: trip.location || "",
        difficulty: trip.difficulty || "",
        category: (trip as any).category || "",
        maxGroupSize: trip.maxGroupSize ? String(trip.maxGroupSize) : "",
        heroImage: trip.heroImage || "",
        description: (trip as any).description || "",
        slug: (trip as any).slug || "",
      });
    }
  }, [trip, isOpen]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        maxGroupSize: form.maxGroupSize ? Number(form.maxGroupSize) : undefined,
      };
      const res = await api.put(`/trips/${trip.id}`, payload);
      const updatedTrip = res.data?.data || res.data;
      toast.success("Trip settings saved!");
      onUpdated(updatedTrip);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to save trip settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Trip Settings
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Edit details for{" "}
              <span className="text-[#FF4D00] font-bold">{trip.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Trip Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. Bali Adventure"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Trip Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. MKA-1"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                URL Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. bali-adventure"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. 5 Days / 4 Nights"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. Bali, Indonesia"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => handleChange("difficulty", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition bg-white"
              >
                <option value="">Select difficulty</option>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition bg-white"
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Group Size */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Max Group Size
              </label>
              <input
                type="number"
                value={form.maxGroupSize}
                onChange={(e) => handleChange("maxGroupSize", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="e.g. 45"
                min={1}
              />
            </div>

            {/* Hero Image URL */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Hero Image URL
              </label>
              <input
                type="url"
                value={form.heroImage}
                onChange={(e) => handleChange("heroImage", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition"
                placeholder="https://..."
              />
              {form.heroImage && (
                <div className="mt-2 rounded-lg overflow-hidden h-24 border border-slate-200">
                  <img
                    src={form.heroImage}
                    alt="Hero preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60 transition resize-none"
                placeholder="Short description of the trip..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF4D00] hover:bg-[#FF4D00] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
