import api from "@/services/api";
import { pageBuilderService } from "@/services/page-builder.service";

export interface PageSectionConfig {
  id: string;
  type:
    | "hero"
    | "featured_trips"
    | "destinations"
    | "recent_photos"
    | "reviews"
    | "stories"
    | "footer"
    | string;
  name?: string;
  visible?: boolean;
  draft?: Record<string, any>;
  [key: string]: any;
}

export interface PageData {
  id: string;
  name: string;
  slug: string;
  published?: boolean;
  sections: PageSectionConfig[];
}

export const pageBuilderApi = {
  getPages: async (): Promise<{ id: string; name: string; slug: string }[]> => {
    return [
      { id: "home", name: "Homepage", slug: "" },
      { id: "about-us", name: "About Us", slug: "about-us" },
      { id: "contact-us", name: "Contact Us", slug: "contact" },
    ];
  },

  getPageLayout: async (pageId: string): Promise<PageSectionConfig[]> => {
    const res = await pageBuilderService.getDraft(pageId).catch(() => null);
    return res?.sections || [];
  },

  savePageDraft: async (
    pageId: string,
    sections: PageSectionConfig[],
  ): Promise<boolean> => {
    await pageBuilderService.saveDraft(pageId, sections).catch(() => null);
    return true;
  },

  publishPage: async (
    pageId: string,
    sections: PageSectionConfig[],
  ): Promise<boolean> => {
    await pageBuilderService.saveDraft(pageId, sections).catch(() => null);
    await pageBuilderService.publish(pageId).catch(() => null);
    await api.post("/revalidate", { path: "/" }).catch(() => {});
    return true;
  },
};
