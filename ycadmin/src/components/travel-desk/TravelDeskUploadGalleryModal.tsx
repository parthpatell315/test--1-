import React, { useState, useRef } from "react";
import { X, UploadCloud, Image as ImageIcon } from "lucide-react";
import { travelDeskService } from "@/services/travelDesk.service";

interface UploadGalleryModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: (newImages: any[]) => void;
}

export const TravelDeskUploadGalleryModal: React.FC<
  UploadGalleryModalProps
> = ({ tripId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Marketing");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size exceeds 5MB limit.");
        return;
      }
      setSelectedFile(file);
      setError("");

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("Please select an image file to upload.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("tripId", tripId);
      formData.append("caption", caption);
      formData.append("category", category);
      formData.append("files", selectedFile);

      const res = await travelDeskService.uploadGallery(formData);
      onSuccess(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Upload Gallery Image
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Add marketing photos, banners, and location highlights
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 flex-1 overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Image File *
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed ${preview ? "border-transparent bg-slate-100 p-2" : "border-slate-300 p-8"} rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-[#FF6B00] transition-all overflow-hidden relative group min-h-[160px]`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
              />
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <p className="text-white text-sm font-bold">Change Image</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    Click to select image
                  </p>
                  <p className="text-xs text-slate-500 text-center">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Caption (Optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
              placeholder="e.g. Campsite view at sunrise"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
            >
              <option value="Marketing">Marketing & Social Media</option>
              <option value="Accommodation">Accommodation / Hotel</option>
              <option value="Activity">Activity / Experience</option>
              <option value="Transport">Transport / Vehicle</option>
            </select>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !selectedFile}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#E66000] text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </div>
    </div>
  );
};
