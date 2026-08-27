import React, { useState, useEffect, useRef } from "react";
import { emailsService, EmailTemplate } from "@/services/emails.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Mail,
  Plus,
  Edit2,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Clock,
  Settings,
  Search,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<Partial<EmailTemplate> | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await emailsService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("🔥 Failed to load templates:", err);
      toast.error("Failed to load email templates.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate({
      name: "",
      subject: "",
      body: "",
      category: "Booking",
      isActive: true,
    });
    setIsEditOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = "";
    }, 50);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsEditOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = template.body;
      }
    }, 50);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await emailsService.duplicateTemplate(id);
      toast.success("Template duplicated successfully!");
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to duplicate template.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await emailsService.deleteTemplate(id);
      toast.success("Template deleted successfully!");
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to delete template.");
    }
  };

  const handleToggleStatus = async (template: EmailTemplate) => {
    try {
      await emailsService.updateTemplate(template.id, {
        isActive: !template.isActive,
      });
      toast.success(
        `Template ${!template.isActive ? "activated" : "deactivated"} successfully!`,
      );
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    const body = editorRef.current ? editorRef.current.innerHTML : "";

    if (!editingTemplate.name?.trim())
      return toast.error("Template name is required");
    if (!editingTemplate.subject?.trim())
      return toast.error("Subject is required");
    if (!body.trim()) return toast.error("Message content is required");

    try {
      const payload = {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body,
        category: editingTemplate.category,
        isActive: editingTemplate.isActive,
      };

      if (editingTemplate.id) {
        await emailsService.updateTemplate(editingTemplate.id, payload);
        toast.success("Template updated successfully!");
      } else {
        await emailsService.createTemplate(payload);
        toast.success("Template created successfully!");
      }
      setIsEditOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to save template.");
    }
  };

  // Rich Text Editor Toolbar Commands
  const formatDoc = (cmd: string, value: string = "") => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const addLink = () => {
    const url = prompt("Enter link URL:");
    if (url) formatDoc("createLink", url);
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="admin-page">
      {/* Header Area */}
      <div className="admin-page-header admin-card">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#FF4D00]" />
            Email Templates
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Create, duplicate, customize, and manage email notification
            templates.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="admin-button-accent min-h-11 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Main Grid View */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex w-full max-w-md items-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-[#FF4D00]">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name, subject, or category..."
            className="border-none shadow-none text-sm font-semibold p-2.5 focus-visible:ring-0 grow"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sm text-slate-400 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
            Loading email templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 font-bold text-sm">
            No email templates found matching search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:border-slate-300 ${
                  !template.isActive
                    ? "opacity-60 border-slate-200 bg-slate-50/20"
                    : "border-slate-100"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="rounded-full bg-[#FF4D00]/5 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#C2410C]">
                      {template.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        template.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-800 line-clamp-1">
                    {template.name}
                  </h3>

                  <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                    <span className="text-slate-400 font-extrabold block text-[9px] uppercase tracking-wider mb-0.5">
                      Subject
                    </span>
                    <span className="line-clamp-2 text-slate-700 leading-tight">
                      {template.subject}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(template)}
                    className="min-h-10 min-w-10 p-1 text-slate-500 transition-colors hover:text-[#FF4D00]"
                    title={
                      template.isActive
                        ? "Deactivate Template"
                        : "Activate Template"
                    }
                  >
                    {template.isActive ? (
                      <ToggleRight className="h-6 w-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                      className="h-10 w-10 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-[#FF4D00]"
                      title="Edit Template"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(template.id)}
                      className="h-10 w-10 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-[#FF4D00]"
                      title="Duplicate Template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      className="h-10 w-10 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-600"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor dialog modal */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
      >
        <DialogContent className="flex w-full max-w-[700px] flex-col overflow-hidden bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#FF4D00]" />
              {editingTemplate?.id
                ? "Edit Email Template"
                : "Create New Email Template"}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 grow overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Template Name
                  </label>
                  <Input
                    value={editingTemplate.name || ""}
                    onChange={(e) =>
                      setEditingTemplate((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g. Booking Confirmation"
                    className="border-slate-200 text-sm font-semibold focus:border-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={editingTemplate.category || "Booking"}
                    onChange={(e) =>
                      setEditingTemplate((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-[#FF4D00] transition-colors"
                  >
                    <option value="Booking">Booking</option>
                    <option value="Inquiry">Inquiry</option>
                    <option value="Ticketing">Ticketing</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Subject
                </label>
                <Input
                  value={editingTemplate.subject || ""}
                  onChange={(e) =>
                    setEditingTemplate((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="e.g. Your booking is confirmed! {{booking.reference}}"
                  className="border-slate-200 text-sm font-semibold focus:border-[#FF4D00]"
                />
              </div>

              {/* Rich text editor box */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Template Body
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Rich editor toolbar */}
                  <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("bold")}
                    >
                      <Bold className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("italic")}
                    >
                      <Italic className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("underline")}
                    >
                      <Underline className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("insertUnorderedList")}
                    >
                      <List className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("insertOrderedList")}
                    >
                      <ListOrdered className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={addLink}
                    >
                      <Link2 className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200"
                      onClick={() => formatDoc("removeFormat")}
                      title="Clear formatting"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  {/* Rich editable content area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="p-4 bg-white min-h-[200px] text-sm focus:outline-none overflow-y-auto max-h-[300px] prose prose-sm max-w-none"
                    style={{ direction: "ltr" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  id="template-active"
                  checked={editingTemplate.isActive}
                  onCheckedChange={(checked) =>
                    setEditingTemplate((prev) => ({
                      ...prev,
                      isActive: checked === true,
                    }))
                  }
                />
                <label
                  htmlFor="template-active"
                  className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                >
                  Template Active / Enabled
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="text-slate-500 hover:bg-slate-50 text-xs font-bold px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs px-5 shadow-sm"
            >
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

