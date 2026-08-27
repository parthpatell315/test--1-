import { useState } from "react";
import { mockMedia } from "@/services/mock-data";
import type { MediaItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>(mockMedia);

  const handleUpload = () => {
    const item: MediaItem = {
      id: Date.now().toString(),
      url: `https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&t=${Date.now()}`,
      name: `upload-${Date.now()}.jpg`,
      size: Math.floor(Math.random() * 500000),
      type: "image/jpeg",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setMedia((prev) => [item, ...prev]);
    toast.success("Image uploaded");
  };

  const handleDelete = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    toast.success("Image deleted");
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ImageIcon className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Media Library
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Upload & manage images
            </p>
          </div>
        </div>
        <Button
          onClick={handleUpload}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3" />
          <p>No media files</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-md border border-slate-200 bg-white overflow-hidden shadow-sm"
            >
              <img
                src={item.url}
                alt={item.name}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-2">
                <p className="text-xs text-card-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(item.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

