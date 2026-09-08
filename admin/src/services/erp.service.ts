import api from "./api";

export interface ErpNotification {
  id: string;
  title: string;
  message: string;
  priority: "Low" | "Medium" | "High";
  module: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface CompanyDocument {
  id: string;
  name: string;
  identifier: string;
  category: string;
  type: string;
  uploadedBy: string;
  uploadedDate: string;
  uploadDate?: string;
  expiryDate: string;
  status: string;
  size: string;
}

export interface RecurringTask {
  id: string;
  title: string;
  schedule: "Daily" | "Weekly" | "Monthly" | "Custom";
  department: string;
  assignedTo: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  nextOccurrence: string;
  status: string;
}

export interface EmployeeMistake {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  severity: "Minor" | "Major" | "Critical";
  description: string;
  actionTaken: string;
  managerComment?: string;
}

export interface ActivityLog {
  time?: string;
  date?: string;
  user?: string;
  type?: string;
  action: string;
  comments?: string;
  notes?: string;
}

export const erpService = {
  async getNotifications(): Promise<ErpNotification[]> {
    const res = await api.get("/erp/notifications");
    return res.data.data;
  },

  async markRead(id: string): Promise<void> {
    await api.put(`/erp/notifications/${id}/read`);
  },

  async markAllRead(role?: string): Promise<void> {
    await api.put("/erp/notifications/read-all", { role });
  },

  async searchAll(
    q: string,
  ): Promise<Record<string, { title: string; path: string }[]>> {
    const res = await api.get(`/erp/search?q=${encodeURIComponent(q)}`);
    return res.data.data;
  },

  async getCompanyDocuments(): Promise<CompanyDocument[]> {
    const res = await api.get("/erp/company-documents");
    return res.data.data;
  },

  async createCompanyDocument(data: any): Promise<CompanyDocument> {
    const res = await api.post("/erp/company-documents", data);
    return res.data.data;
  },

  async deleteCompanyDocument(id: string): Promise<void> {
    await api.delete(`/erp/company-documents/${id}`);
  },

  async getRecurringTasks(): Promise<RecurringTask[]> {
    const res = await api.get("/erp/recurring-tasks");
    return res.data.data;
  },

  async createRecurringTask(data: any): Promise<RecurringTask> {
    const res = await api.post("/erp/recurring-tasks", data);
    return res.data.data;
  },

  async completeRecurringTask(id: string): Promise<RecurringTask> {
    const res = await api.put(`/erp/recurring-tasks/${id}/complete`);
    return res.data.data;
  },

  async getEmployeeMistakes(): Promise<EmployeeMistake[]> {
    const res = await api.get("/erp/employee-mistakes");
    return res.data.data;
  },

  async logEmployeeMistake(data: any): Promise<EmployeeMistake> {
    const res = await api.post("/erp/employee-mistakes", data);
    return res.data.data;
  },

  async getActivityTimeline(id: string): Promise<ActivityLog[]> {
    const res = await api.get(`/erp/timeline/${id}`);
    return res.data.data;
  },

  async getCustomerTimeline(id: string): Promise<ActivityLog[]> {
    const res = await api.get(`/erp/customer-timeline/${id}`);
    return res.data.data;
  },
};
