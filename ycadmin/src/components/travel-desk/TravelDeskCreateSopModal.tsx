import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { travelDeskService } from "@/services/travelDesk.service";

interface CreateSopModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: (newSop: any) => void;
}

export const TravelDeskCreateSopModal: React.FC<CreateSopModalProps> = ({
  tripId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("ClipboardList");
  const [items, setItems] = useState<{ title: string; content: string }[]>([
    { title: "", content: "" },
  ]);

  const handleAddItem = () => {
    setItems([...items, { title: "", content: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: "title" | "content",
    value: string,
  ) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !category || !description) {
      setError("Please fill in all required fields.");
      return;
    }

    const validItems = items.filter(
      (item) => item.title.trim() !== "" && item.content.trim() !== "",
    );
    if (validItems.length === 0) {
      setError("Please add at least one SOP step.");
      return;
    }

    try {
      setLoading(true);
      const newSop = await travelDeskService.createSop({
        tripId,
        title,
        category,
        description,
        icon,
        items: validItems,
      });
      onSuccess(newSop);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create SOP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Create New SOP
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Add standard operating procedures for this trip
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form
            id="create-sop-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  SOP Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
                  placeholder="e.g. Check-in Process"
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
                  <option value="">Select Category</option>
                  <option value="Operations">Operations</option>
                  <option value="Ticketing">Ticketing</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Finance">Finance</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all min-h-[80px]"
                placeholder="Brief summary of what this SOP covers"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  SOP Steps
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-[#FF6B00] text-xs font-bold flex items-center gap-1 hover:text-[#E66000]"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-200"
                  >
                    <div className="w-6 h-6 shrink-0 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-black">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          handleItemChange(index, "title", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 outline-none"
                        placeholder="Step Title"
                      />
                      <textarea
                        value={item.content}
                        onChange={(e) =>
                          handleItemChange(index, "content", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none min-h-[60px]"
                        placeholder="Step Details/Instructions"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-sop-form"
            disabled={loading}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#E66000] text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Create SOP"}
          </button>
        </div>
      </div>
    </div>
  );
};

