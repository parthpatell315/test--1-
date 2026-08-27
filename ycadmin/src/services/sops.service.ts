import api from "./api";

export interface SopTaskTemplate {
  id: string;
  versionId: string;
  taskName: string;
  description?: string;
  stage: string;
  relativeOffset: number;
  priority: string;
  isRequired: boolean;
  defaultAssignee?: string;
  instructions?: string;
  verificationReq?: string;
  sortOrder: number;
  active: boolean;
  dependencyTaskId?: string;
}

export interface SopVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  versionLabel: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdById?: string;
  activatedAt?: string;
  createdAt: string;
  taskTemplates: SopTaskTemplate[];
}

export interface SopTemplate {
  id: string;
  tenantId: string;
  tripId: string;
  name: string;
  description?: string;
  activeVersionId?: string;
  createdAt: string;
  updatedAt: string;
  trip?: {
    id: string;
    title: string;
    slug: string;
    durationDays?: number;
  };
  versions: SopVersion[];
}

export const sopsService = {
  // Fetch all SOP templates
  async getSopTemplates(): Promise<SopTemplate[]> {
    const res = await api.get("/ops/sops");
    return res.data?.data || [];
  },

  // Fetch SOP template by trip ID
  async getSopByTrip(tripId: string): Promise<SopTemplate | null> {
    const res = await api.get(`/ops/sops/by-trip/${encodeURIComponent(tripId)}`);
    return res.data?.data || null;
  },

  // Create new SOP template
  async createSopTemplate(data: { tripId: string; name: string; description?: string }): Promise<SopTemplate> {
    const res = await api.post("/ops/sops", data);
    return res.data?.data;
  },

  // Create new SOP version
  async createSopVersion(templateId: string, copyFromVersionId?: string): Promise<SopVersion> {
    const res = await api.post(`/ops/sops/${templateId}/versions`, { copyFromVersionId });
    return res.data?.data;
  },

  // Activate SOP version
  async activateSopVersion(versionId: string): Promise<void> {
    await api.patch(`/ops/sops/versions/${versionId}/activate`);
  },

  // Add task template to version
  async createTaskTemplate(versionId: string, data: Partial<SopTaskTemplate>): Promise<SopTaskTemplate> {
    const res = await api.post(`/ops/sops/versions/${versionId}/tasks`, data);
    return res.data?.data;
  },

  // Update task template
  async updateTaskTemplate(taskId: string, data: Partial<SopTaskTemplate>): Promise<SopTaskTemplate> {
    const res = await api.put(`/ops/sops/tasks/${taskId}`, data);
    return res.data?.data;
  },

  // Delete task template
  async deleteTaskTemplate(taskId: string): Promise<void> {
    await api.delete(`/ops/sops/tasks/${taskId}`);
  },

  // Preview SOP schedule
  async previewSopSchedule(versionId: string, departureDate: string): Promise<any[]> {
    const res = await api.post("/ops/sops/preview-schedule", { versionId, departureDate });
    return res.data?.data || [];
  },

  // Apply SOP to departure
  async applySopToDeparture(tripId: string, departureDate: string, versionId?: string): Promise<any> {
    const res = await api.post("/ops/sops/apply-to-departure", { tripId, departureDate, versionId });
    return res.data?.data;
  },

  // Recalculate departure task dates when departure date moves
  async recalculateDepartureTaskDates(tripId: string, oldDepartureDate: string, newDepartureDate: string): Promise<any> {
    const res = await api.post("/ops/sops/recalculate-dates", { tripId, oldDepartureDate, newDepartureDate });
    return res.data?.data;
  },
};
