import { useEffect, useState, useCallback } from "react";
import { blogsService } from "@/services/blogs.service";
import { DataTable } from "@/components/admin/DataTable";
import {
  StatusBadge,
  getTripBadgeVariant,
} from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import BlogFormModal from "@/components/admin/BlogFormModal";
import type { Blog, BlogFormData } from "@/types";
import { Plus, Pencil, Trash2, BookOpen, Clock, User } from "lucide-react";
import { toast } from "sonner";

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await blogsService.getAll();
      setBlogs(data);
    } catch (error) {
      toast.error("Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    statusFilter === "all"
      ? blogs
      : blogs.filter((b) => b.status === statusFilter);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (b: Blog) => {
    setEditing(b);
    setModalOpen(true);
  };

  const handleSave = async (data: BlogFormData, editingId?: string) => {
    // ── DATA SANITIZATION: Ensure all required fields exist ──
    const payload = {
      ...data,
      title: data.title || "Untitled Story",
      content: data.content || "Start writing your story here...",
      image:
        data.image ||
        "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c6c",
      author: data.author || "Expedition Team",
      status: data.status || "draft",
    };

    try {
      const id = editingId || (editing as any)?._id || (editing as any)?.id;
      if (id) {
        await blogsService.update(id, payload);
        toast.success("Story updated successfully");
      } else {
        await blogsService.create(payload);
        toast.success("New story shared");
      }
      load();
      setModalOpen(false);
    } catch (error: any) {
      console.error("❌ SAVE BLOG ERROR:", error);
      const msg = error.response?.data?.message || "Failed to save blog post";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    try {
      await blogsService.remove(id);
      toast.success("Blog deleted");
      load();
    } catch (error) {
      toast.error("Failed to delete blog");
    }
  };

  const toggleStatus = async (b: Blog) => {
    const newStatus = b.status === "published" ? "draft" : "published";
    try {
      await blogsService.update(b.id || (b as any)._id, { status: newStatus });
      toast.success(`Blog ${newStatus}`);
      load();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const columns = [
    {
      key: "title",
      header: "Blog Post",
      render: (b: Blog) => (
        <div className="flex items-center gap-3">
          {b.image && (
            <img
              src={b.image}
              alt=""
              className="h-10 w-16 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="font-medium text-card-foreground">{b.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" /> {b.author}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "readTime",
      header: "Read Time",
      render: (b: Blog) => (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {b.readTime}
        </span>
      ),
    },
    {
      key: "hasVideo",
      header: "Video",
      render: (b: Blog) => (b.hasVideo ? "Yes" : "No"),
    },
    {
      key: "status",
      header: "Status",
      render: (b: Blog) => (
        <button onClick={() => toggleStatus(b)}>
          <StatusBadge variant={getTripBadgeVariant(b.status)}>
            {b.status}
          </StatusBadge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (b: Blog) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(b.id || (b as any)._id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Watch & Read
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Manage blog posts & stories
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New Story
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchKey="title"
        searchPlaceholder="Search blogs..."
        emptyMessage="No blogs yet"
        emptyIcon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Published", value: "published" },
              { label: "Draft", value: "draft" },
            ],
          },
        ]}
        onFilterChange={(_, v) => setStatusFilter(v)}
      />

      <BlogFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}

