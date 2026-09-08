import { useState, useEffect, useCallback, useRef } from "react";
import {
  websiteService,
  WebsitePage,
  CreatePagePayload,
  UpdatePagePayload,
} from "@/services/website.service";
import { toast } from "sonner";

interface UseWebsitePagesOptions {
  /** Auto-poll interval in ms. Set 0 to disable. Default: 0 (disabled). */
  pollInterval?: number;
}

interface UseWebsitePagesReturn {
  pages: WebsitePage[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPage: (data: CreatePagePayload) => Promise<WebsitePage | null>;
  updatePage: (
    id: string,
    data: UpdatePagePayload,
  ) => Promise<WebsitePage | null>;
  deletePage: (id: string) => Promise<boolean>;
}

export function useWebsitePages(
  options: UseWebsitePagesOptions = {},
): UseWebsitePagesReturn {
  const { pollInterval = 0 } = options;

  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchPages = useCallback(async () => {
    try {
      const data = await websiteService.getAllPages();
      if (mountedRef.current) {
        setPages(data);
        setError(null);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to load pages";
      if (mountedRef.current) {
        setError(message);
      }
      console.error("[useWebsitePages] fetch error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchPages().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
    };
  }, [fetchPages]);

  // Optional polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const timer = setInterval(fetchPages, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, fetchPages]);

  const createPage = useCallback(
    async (data: CreatePagePayload): Promise<WebsitePage | null> => {
      try {
        const page = await websiteService.createPage(data);
        toast.success(`Page "${page.title}" created successfully`);
        await fetchPages(); // Refresh list
        return page;
      } catch (err: any) {
        const message = err?.response?.data?.message || "Failed to create page";
        toast.error(message);
        return null;
      }
    },
    [fetchPages],
  );

  const updatePage = useCallback(
    async (
      id: string,
      data: UpdatePagePayload,
    ): Promise<WebsitePage | null> => {
      try {
        const page = await websiteService.updatePage(id, data);
        toast.success(`Page "${page.title}" updated`);
        await fetchPages(); // Refresh list
        return page;
      } catch (err: any) {
        const message = err?.response?.data?.message || "Failed to update page";
        toast.error(message);
        return null;
      }
    },
    [fetchPages],
  );

  const deletePage = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await websiteService.deletePage(id);
        toast.success("Page deleted");
        await fetchPages(); // Refresh list
        return true;
      } catch (err: any) {
        const message = err?.response?.data?.message || "Failed to delete page";
        toast.error(message);
        return false;
      }
    },
    [fetchPages],
  );

  return {
    pages,
    loading,
    error,
    refetch: fetchPages,
    createPage,
    updatePage,
    deletePage,
  };
}
