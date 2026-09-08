import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageBuilderData } from "@/hooks/admin/usePageBuilderData";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/environment";

import { PageBuilderHeader } from "@/components/admin/page-builder/PageBuilderHeader";
import {
  SectionList,
  SectionItem,
} from "@/components/admin/page-builder/SectionList";
import { SectionEditor } from "@/components/admin/page-builder/SectionEditor";
import {
  AddSectionModal,
  FrontendSectionDefinition,
  FRONTEND_7_SECTIONS,
} from "@/components/admin/page-builder/AddSectionModal";

const PAGES_LIST = [
  { id: "home", name: "Homepage" },
  { id: "about-us", name: "About Us" },
  { id: "contact-us", name: "Contact Us" },
];

export default function PageBuilderPage() {
  const [searchParams] = useSearchParams();
  const initialPage = searchParams.get("page") || "home";

  const {
    currentPage,
    setCurrentPage,
    sections,
    setSections,
    selectedSectionId,
    setSelectedSectionId,
    dbTrips,
    loading,
    saving,
    publishing,
    status,
    canUndo,
    canRedo,
    undo,
    redo,
    save,
    publish,
  } = usePageBuilderData(initialPage);

  React.useEffect(() => {
    const targetSectionType = searchParams.get("section");
    if (targetSectionType && sections && sections.length > 0) {
      const found = sections.find(
        (s) => s.type === targetSectionType || s.id === targetSectionType,
      );
      if (found) {
        setSelectedSectionId(found.id);
      }
    }
  }, [searchParams, sections]);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleToggleVisibility = (id: string) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, visible: s.visible === false } : s,
    );
    setSections(updated);
  };

  const handleDeleteSection = (id: string) => {
    const updated = sections.filter((s) => s.id !== id);
    setSections(updated);
    if (selectedSectionId === id) {
      setSelectedSectionId(updated.length > 0 ? updated[0].id : null);
    }
    toast.success("Section removed");
  };

  const handleReorder = (newSections: SectionItem[]) => {
    setSections(newSections);
  };

  const handleAddSectionType = (typeDef: FrontendSectionDefinition) => {
    const newSection: SectionItem = {
      id: `sec-${typeDef.id}-${Date.now()}`,
      type: typeDef.id,
      name: typeDef.name,
      visible: true,
      draft: JSON.parse(JSON.stringify(typeDef.defaultDraft)),
    };

    const updated = [...sections, newSection];
    setSections(updated);
    setSelectedSectionId(newSection.id);
    setAddModalOpen(false);
    toast.success(`Added ${typeDef.name} section`);
  };

  const handleChangeDraft = (
    sectionId: string,
    updatedDraft: Record<string, any>,
  ) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, draft: updatedDraft } : s,
    );
    setSections(updated);
  };

  const handleResetSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const frontendDef = FRONTEND_7_SECTIONS.find((t) => t.id === section.type);
    if (frontendDef) {
      handleChangeDraft(
        sectionId,
        JSON.parse(JSON.stringify(frontendDef.defaultDraft)),
      );
      toast.info("Section reset to default parameters");
    }
  };

  const handlePreview = () => {
    const frontendUrl = ENV.FRONTEND_URL;
    window.open(frontendUrl, "_blank");
  };

  const selectedSection =
    sections.find((s) => s.id === selectedSectionId) || null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97854]" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#1A2332]">
          Loading Page Builder...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans max-w-[1440px] mx-auto pb-12">
      {/* ─── 1. PERMANENT STICKY HEADER BAR ─── */}
      <div className="sticky top-0 z-30 pt-1 pb-2 bg-[#F8FAFC]/95 backdrop-blur-md">
        <PageBuilderHeader
          currentPage={currentPage}
          pages={PAGES_LIST}
          onSelectPage={(pId) => setCurrentPage(pId)}
          status={status}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onPreview={handlePreview}
          onSave={save}
          onPublish={publish}
          isPublishing={publishing}
          isSaving={saving}
        />
      </div>

      {/* ─── 2. MAIN 35% / 65% SPLIT VIEW LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel (35% / 4 Cols on Desktop): Sticky Section List */}
        <div className="lg:col-span-4 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto no-scrollbar">
          <SectionList
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={(id) => setSelectedSectionId(id)}
            onToggleVisibility={handleToggleVisibility}
            onDeleteSection={handleDeleteSection}
            onOpenAddModal={() => setAddModalOpen(true)}
            onReorder={handleReorder}
          />
        </div>

        {/* Right Panel (65% / 8 Cols on Desktop): Section Dynamic Form Editor */}
        <div className="lg:col-span-8">
          <SectionEditor
            section={selectedSection}
            trips={dbTrips}
            onChangeDraft={handleChangeDraft}
            onResetSection={handleResetSection}
          />
        </div>
      </div>

      {/* ─── 3. ADD SECTION MODAL (7 Live Frontend Sections) ─── */}
      <AddSectionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelectSectionType={handleAddSectionType}
      />
    </div>
  );
}
