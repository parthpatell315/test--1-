import React, { useState } from "react";
import { X, Plus, Compass, MapPin, Calendar, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { tripsService } from "@/services/trips.service";
import { travelDeskService } from "@/services/travelDesk.service";
import { toast } from "sonner";

interface TravelDeskCreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
}

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

export const TravelDeskCreateTripModal: React.FC<
  TravelDeskCreateTripModalProps
> = ({ isOpen, onClose, onTripCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields (Cleaned up: Hero Image, Duration, Starting Price, and Max Group Size removed)
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Domestic");
  const [location, setLocation] = useState("");
  const [difficulty, setDifficulty] = useState("Easy to Moderate");
  const [startEnd, setStartEnd] = useState("Mar - Oct");
  const [overview, setOverview] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      toast.error("Trip title and destination location are required");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Trip Master Record
      const cleanSlug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") +
        "-" +
        Math.floor(1000 + Math.random() * 9000);

      const newTrip = await tripsService.create({
        title: title.trim(),
        slug: cleanSlug,
        description:
          overview.trim() || `${title} expedition exploring ${location}.`,
        shortName: code.trim() || title.slice(0, 4).toUpperCase() + "-1",
        category,
        tripType: category.toLowerCase().includes("international")
          ? "international"
          : "domestic",
        location: location.trim(),
        duration: "5 Days / 4 Nights",
        price: 14999,
        difficulty,
        maxGroupSize: 30,
        startEnd,
        heroImage: DEFAULT_HERO_IMAGE,
        status: "ACTIVE",
      } as any);

      toast.success(`Destination "${title}" created successfully!`);

      // 2. Initialize Travel Desk Workspace
      const tripId = newTrip.id;
      await travelDeskService.feedWorkspaces([tripId]);
      toast.success("Travel Desk workspace initialized!");

      // 3. Callback to parent & close modal
      onTripCreated(tripId);
      onClose();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to create destination trip",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCode("");
    setLocation("");
    setOverview("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-white rounded-xl overflow-hidden border border-[#E2E8F0] shadow-xl font-sans">
        {/* Header */}
        <div className="bg-[#0A192F] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FF4D00] text-white rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white leading-tight">
                Add New Destination Trip
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Register a destination & initialize its Travel Desk workspace
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
        >
          {/* Title & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Trip / Destination Title *
              </label>
              <Input
                required
                placeholder="e.g. Spiti Valley Circuit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs border-[#E2E8F0] text-[#0A192F] placeholder:text-[#64748B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Trip Code
              </label>
              <Input
                placeholder="e.g. SPT-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-8 text-xs border-[#E2E8F0] font-mono text-[#0A192F] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 bg-white border border-[#E2E8F0] rounded-md px-3 text-xs font-medium text-[#0A192F] outline-none focus:ring-1 focus:ring-[#FF4D00]"
              >
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
                <option value="Trekking">Trekking & Expeditions</option>
                <option value="Weekend Getaway">Weekend Getaway</option>
                <option value="Backpacking">Backpacking Trip</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Destination Location / Region *
              </label>
              <Input
                required
                placeholder="e.g. Himachal Pradesh & Ladakh"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-8 text-xs border-[#E2E8F0] text-[#0A192F] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          {/* Difficulty & Season */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full h-9 bg-white border border-[#E2E8F0] rounded-md px-3 text-xs font-medium text-[#0A192F] outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Easy to Moderate">Easy to Moderate</option>
                <option value="Moderate">Moderate</option>
                <option value="Challenging">Challenging / High Altitude</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0A192F]">
                Best Season
              </label>
              <Input
                placeholder="e.g. May - October"
                value={startEnd}
                onChange={(e) => setStartEnd(e.target.value)}
                className="h-8 text-xs border-[#E2E8F0] text-[#0A192F]"
              />
            </div>
          </div>

          {/* Brief Overview */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0A192F]">
              Destination Overview & Highlights
            </label>
            <Textarea
              rows={3}
              placeholder="Enter brief description to initialize the Knowledge Hub overview..."
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              className="text-xs border-[#E2E8F0] text-[#0A192F] placeholder:text-[#64748B]"
            />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs font-bold border-[#E2E8F0] text-[#0A192F]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-bold px-5 rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF4D00]" />
              {isSubmitting
                ? "Creating & Initializing..."
                : "Create & Open Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

