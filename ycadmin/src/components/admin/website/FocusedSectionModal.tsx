import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SectionEditor } from "@/components/admin/page-builder/SectionEditor";
import { PageSectionConfig } from "@/lib/admin/page-builder-api";
import { Save, Loader2, X, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FocusedSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionType: string | null;
  sections: PageSectionConfig[];
  dbTrips?: any[];
  onSaveSection: (
    sectionId: string,
    updatedDraft: Record<string, any>,
  ) => Promise<void>;
}

export function FocusedSectionModal({
  isOpen,
  onClose,
  sectionType,
  sections,
  dbTrips = [],
  onSaveSection,
}: FocusedSectionModalProps) {
  const [activeSection, setActiveSection] = useState<PageSectionConfig | null>(
    null,
  );
  const [currentDraft, setCurrentDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && sectionType && sections && sections.length > 0) {
      // Find matching section in list or fallback to first matching type
      const target =
        sections.find((s) => s.type === sectionType || s.id === sectionType) ||
        sections.find((s) => s.type.includes(sectionType)) ||
        null;

      if (target) {
        setActiveSection(target);
        setCurrentDraft(target.draft || {});
      } else {
        // Create temporary section object for editor
        const tempSec: PageSectionConfig = {
          id: `sec-${sectionType}-${Date.now()}`,
          type: sectionType,
          name: sectionType.replace(/_/g, " ").toUpperCase(),
          visible: true,
          draft: {},
        };
        setActiveSection(tempSec);
        setCurrentDraft({});
      }
    }
  }, [isOpen, sectionType, sections]);

  if (!isOpen || !activeSection) return null;

  const handleChangeDraft = (_: string, updatedDraft: Record<string, any>) => {
    setCurrentDraft(updatedDraft);
    setActiveSection((prev) =>
      prev ? { ...prev, draft: updatedDraft } : null,
    );
  };

  const handleResetSection = () => {
    setCurrentDraft({});
    toast.info("Section reset to default params");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSection(activeSection.id, currentDraft);
      toast.success("Section updated & published live!");
      onClose();
    } catch (err) {
      toast.error("Failed to save section edits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-slate-200/90 font-sans">
        <DialogHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-black text-[#0B1528] tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4541A]" />
              <span>Edit Section</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Isolated editor for single section configuration. Changes sync
              directly to live website.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Section Editor Render Container */}
        <div className="py-4">
          <SectionEditor
            section={activeSection}
            trips={dbTrips}
            onChangeDraft={handleChangeDraft}
            onResetSection={handleResetSection}
          />
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-5 text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-6 bg-[#D4541A] hover:bg-[#b84312] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Publish Live</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
