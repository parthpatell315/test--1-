import api from "./api";

export const pageBuilderService = {
  async getDraft(name: string) {
    const res = await api.get(`/page-builder/${name}/draft`);
    return res.data.data;
  },

  async updateSections(name: string, sections: any[]) {
    const res = await api
      .put(`/page-builder/${name}/sections`, { sections })
      .catch(() => null);
    return res?.data?.data || sections;
  },

  async saveDraft(name: string, sections: any[]) {
    const res = await api
      .put(`/page-builder/${name}/sections`, { sections })
      .catch(() => null);
    return res?.data?.data || sections;
  },

  async updateSection(name: string, sectionId: string, content: any) {
    const res = await api.patch(`/page-builder/${name}/sections/${sectionId}`, {
      content,
    });
    return res.data.data;
  },

  async reorder(name: string, orders: { id: string; order: number }[]) {
    const res = await api.patch(`/page-builder/${name}/sections/reorder`, {
      orders,
    });
    return res.data.data;
  },

  async toggleVisibility(name: string, sectionId: string) {
    const res = await api.patch(
      `/page-builder/${name}/sections/${sectionId}/toggle`,
    );
    return res.data.data;
  },

  async publish(name: string) {
    const res = await api
      .post(`/page-builder/${name}/publish`)
      .catch(() => null);
    return res?.data?.data || true;
  },

  async duplicateSection(page: string, id: string) {
    const res = await api.post(
      `/page-builder/${page}/sections/duplicate/${id}`,
    );
    return res.data.data;
  },

  async deleteSection(page: string, id: string) {
    const res = await api.delete(`/page-builder/${page}/sections/${id}`);
    return res.data.data;
  },
};
