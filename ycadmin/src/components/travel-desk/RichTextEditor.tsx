import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  RemoveFormatting,
  Save,
  Send,
  RotateCcw,
  Clock,
} from "lucide-react";

export interface RichTextEditorProps {
  tripId: string;
  section: string;
  itemId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  tripId,
  section,
  itemId,
  onSave,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [charCount, setCharCount] = useState<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Existing Item if itemId is provided
  const { data: itemData, isLoading: isFetching } = useQuery({
    queryKey: ["knowledge-item", tripId, section, itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const res = await api.get(`/trips/${tripId}/knowledge/${section}`);
      const items = res.data?.data?.items || [];
      return items.find((x: any) => x.id === itemId) || null;
    },
    enabled: !!itemId,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#FF4D00] underline font-semibold" },
      }),
      Placeholder.configure({
        placeholder: "Write knowledge content, instructions, or guide...",
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setCharCount(text.length);
    },
  });

  // Populate data when fetched
  useEffect(() => {
    if (itemData) {
      setTitle(itemData.title || "");
      setStatus(itemData.status || "draft");
      setVersion(itemData.version || 1);
      const initialHtml = itemData.body || "";
      setLastSavedContent(initialHtml);
      setLastSavedTime(
        new Date(itemData.updatedAt || Date.now()).toLocaleTimeString(),
      );
      if (editor && editor.getHTML() !== initialHtml) {
        editor.commands.setContent(initialHtml);
      }
    }
  }, [itemData, editor]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (overrideStatus?: "draft" | "published") => {
      const bodyHtml = editor ? editor.getHTML() : "";
      const payload = {
        title: title.trim() || "Untitled Section",
        body: bodyHtml,
        contentType: "text",
        status: overrideStatus || status,
      };

      if (itemId) {
        return api.put(`/trips/${tripId}/knowledge/${itemId}`, payload);
      }
      return api.post(`/trips/${tripId}/knowledge/${section}`, payload);
    },
    onSuccess: (res, overrideStatus) => {
      const updated = res.data?.data;
      if (updated) {
        setVersion(updated.version || version + 1);
        setStatus(updated.status || overrideStatus || status);
      }
      const currentHtml = editor ? editor.getHTML() : "";
      setLastSavedContent(currentHtml);
      setLastSavedTime(new Date().toLocaleTimeString());
      queryClient.invalidateQueries({
        queryKey: ["trip-knowledge", tripId, section],
      });
      toast.success(
        overrideStatus === "published"
          ? "Published successfully!"
          : "Saved draft successfully!",
      );
      if (onSave) onSave();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save item");
    },
  });

  // 30-Second Auto Save Interval
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (editor && title.trim()) {
        const currentHtml = editor.getHTML();
        if (currentHtml !== lastSavedContent && !saveMutation.isPending) {
          saveMutation.mutate("draft");
        }
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [editor, title, lastSavedContent, saveMutation]);

  const handleCancel = () => {
    if (editor) {
      editor.commands.setContent(lastSavedContent);
    }
    toast.info("Changes discarded, reverted to last saved version.");
    if (onCancel) onCancel();
  };

  const addLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (isFetching) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl animate-pulse space-y-3">
        <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
        <div className="h-40 bg-slate-100 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col font-sans">
      {/* ─── Top Metadata & Action Bar ─── */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Section Title..."
            className="w-full text-base font-black text-[#0A192F] bg-transparent border-b border-transparent focus:border-[#FF4D00] focus:outline-none transition-colors"
          />
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-medium">
            <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
              v{version}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {lastSavedTime
                ? `Last saved at ${lastSavedTime}`
                : "Not saved yet"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            onClick={() => saveMutation.mutate("draft")}
            disabled={saveMutation.isPending || charCount > 5000}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => saveMutation.mutate("published")}
            disabled={saveMutation.isPending || charCount > 5000}
            className="px-4 py-1.5 bg-[#FF4D00] hover:bg-[#e06100] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>
        </div>
      </div>

      {/* ─── TipTap Formatting Toolbar ─── */}
      {editor && (
        <div className="bg-slate-100/70 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 text-slate-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("bold") ? "bg-slate-300 text-black font-bold" : ""}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("italic") ? "bg-slate-300 text-black" : ""}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("underline") ? "bg-slate-300 text-black" : ""}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("heading", { level: 1 }) ? "bg-slate-300 text-black font-bold" : ""}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("heading", { level: 2 }) ? "bg-slate-300 text-black font-bold" : ""}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("heading", { level: 3 }) ? "bg-slate-300 text-black font-bold" : ""}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("bulletList") ? "bg-slate-300 text-black" : ""}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("orderedList") ? "bg-slate-300 text-black" : ""}`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={addLink}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("link") ? "bg-slate-300 text-black" : ""}`}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive("codeBlock") ? "bg-slate-300 text-black" : ""}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── TipTap Editor Content Box ─── */}
      <div className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto prose prose-slate max-w-none focus:outline-none text-xs leading-relaxed">
        <EditorContent editor={editor} />
      </div>

      {/* ─── Footer Character Count ─── */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Auto-saves every 30s</span>
        <span
          className={
            charCount > 5000 ? "text-red-600 font-bold" : "text-slate-500"
          }
        >
          {charCount.toLocaleString()} / 5,000 characters
        </span>
      </div>
    </div>
  );
};

export default RichTextEditor;

