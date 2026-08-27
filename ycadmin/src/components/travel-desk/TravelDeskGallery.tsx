import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { travelDeskService } from "@/services/travelDesk.service";
import { Image as ImageIcon, Trash2, Download } from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";
import { TravelDeskUploadGalleryModal } from "./TravelDeskUploadGalleryModal";

import { toast } from "sonner";

interface TravelDeskGalleryProps {
  trip: Trip;
}

export const TravelDeskGallery: React.FC<TravelDeskGalleryProps> = ({
  trip,
}) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await travelDeskService.getGallery(trip.id);
        setImages(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [trip.id]);

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      await travelDeskService.deleteGalleryItem(id);
      setImages(images.filter((img) => img.id !== id));
      toast.success("Media item deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete media item");
    }
  };

  if (loading) return <TravelDeskLoadingState message="Loading Gallery..." />;

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Trip Gallery & Assets
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Manage marketing images and visual assets
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E66000] shadow-sm flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" /> Upload Media
        </button>
      </div>

      {!images || images.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Gallery Assets"
            description="Upload marketing images, banners, and promotional content here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((img: any) => (
            <div
              key={img.id}
              className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
            >
              <img
                src={img.url}
                alt={img.caption || "Trip asset"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <p className="text-white text-xs font-bold line-clamp-2">
                  {img.caption || "No caption"}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-white/70 font-semibold">
                    {img.category}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded backdrop-blur-sm text-white transition-colors"
                      title="View/Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded backdrop-blur-sm text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TravelDeskUploadGalleryModal
          tripId={trip.id}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newImages) => {
            setImages([...newImages, ...images]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
