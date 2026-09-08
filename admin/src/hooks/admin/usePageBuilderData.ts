import { useState, useEffect, useCallback, useRef } from "react";
import {
  pageBuilderApi,
  PageSectionConfig,
} from "@/lib/admin/page-builder-api";
import { tripsService } from "@/services/trips.service";
import { toast } from "sonner";

export function usePageBuilderData(initialPageId: string = "home") {
  const [currentPage, setCurrentPage] = useState(initialPageId);
  const [sections, setSections] = useState<PageSectionConfig[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [dbTrips, setDbTrips] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<"saved" | "draft" | "saving">("saved");

  // History tracking for Undo / Redo
  const historyRef = useRef<PageSectionConfig[][]>([]);
  const redoRef = useRef<PageSectionConfig[][]>([]);

  const pushHistory = useCallback((current: PageSectionConfig[]) => {
    historyRef.current.push(JSON.parse(JSON.stringify(current)));
    if (historyRef.current.length > 20) historyRef.current.shift();
    redoRef.current = [];
  }, []);

  const loadPage = useCallback(async (pageId: string) => {
    setLoading(true);
    try {
      const [fetchedSections, trips] = await Promise.all([
        pageBuilderApi.getPageLayout(pageId),
        tripsService.getAll().catch(() => []),
      ]);

      setSections(fetchedSections);
      setDbTrips(trips || []);
      if (fetchedSections.length > 0) {
        setSelectedSectionId(fetchedSections[0].id);
      } else {
        setSelectedSectionId(null);
      }
      historyRef.current = [];
      redoRef.current = [];
      setStatus("saved");
    } catch (err) {
      toast.error("Failed to load page layout");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialPageId && initialPageId !== currentPage) {
      setCurrentPage(initialPageId);
    }
  }, [initialPageId, currentPage]);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    redoRef.current.push(JSON.parse(JSON.stringify(sections)));
    setSections(prev);
    setStatus("draft");
  }, [sections]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop()!;
    historyRef.current.push(JSON.parse(JSON.stringify(sections)));
    setSections(next);
    setStatus("draft");
  }, [sections]);

  const updateSections = useCallback(
    (newSections: PageSectionConfig[]) => {
      pushHistory(sections);
      setSections(newSections);
      setStatus("draft");
    },
    [sections, pushHistory],
  );

  const save = useCallback(async () => {
    setSaving(true);
    setStatus("saving");
    try {
      await pageBuilderApi.savePageDraft(currentPage, sections);
      setStatus("saved");
      toast.success("Layout saved successfully!");
    } catch (err) {
      toast.error("Failed to save layout");
      setStatus("draft");
    } finally {
      setSaving(false);
    }
  }, [currentPage, sections]);

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      await pageBuilderApi.publishPage(currentPage, sections);
      setStatus("saved");
      toast.success("Page layout published to live site!");
    } catch (err) {
      toast.error("Failed to publish page layout");
    } finally {
      setPublishing(false);
    }
  }, [currentPage, sections]);

  return {
    currentPage,
    setCurrentPage,
    sections,
    setSections: updateSections,
    selectedSectionId,
    setSelectedSectionId,
    dbTrips,
    loading,
    saving,
    publishing,
    status,
    canUndo: historyRef.current.length > 0,
    canRedo: redoRef.current.length > 0,
    undo,
    redo,
    save,
    publish,
    reload: () => loadPage(currentPage),
  };
}
