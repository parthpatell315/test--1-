import api from "./api";

export interface OpsDayItinerary {
  id?: string;
  departureDate?: string;
  date?: string;
  dayTitle: string;
  paxCount: number;
  hotelName?: string;
  hotelVerified: boolean;
  vehicleType?: string;
  vehicleVerified: boolean;
  remarks?: string;
  guideDriverDetails?: string;
  guideVerified: boolean;
  checkInDone: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpsTripExpense {
  id?: string;
  departureDate?: string;
  serviceDate?: string;
  activity: string;
  paymentDate?: string;
  totalAmount: number;
  amountPaid: number;
  dueAmount: number;
  paymentStatus: string;
  remarks?: string;
}

export interface OpsAccountingSummary {
  hotelCost: number;
  transportCost: number;
  guideCost: number;
  guideExpenseCost: number;
  miscCost: number;
  detailedExpensesCost: number;
  totalOpsCost: number;
  travelerCount: number;
  perPersonOpsCost: number;
  totalRevenueCollected: number;
  profitPerTrip: number;
}

export interface OpsSeatConfig {
  id?: string;
  departureDate?: string;
  totalSeatsCap: number;
  alertThreshold: number;
  blockedSeats: number;
  seatsSold: number;
  seatsAvailable: number;
  waitingList: number;
}

export interface OpsWorkspaceSummary {
  acceptedTravelerCount: number;
  ticketReadiness: { approved: number; pending: number; cancelled: number };
  approvedCollections: number;
  pendingCollections: number;
  remainingCollections: number;
  seatAvailability: OpsSeatConfig & { configured: boolean };
  hotelTransportStatus: {
    hotelsTotal: number;
    hotelsConfirmed: number;
    transportTotal: number;
  };
  allocationState: {
    status: string;
    version: number;
    roomAllocations: number;
    vehicleAllocations: number;
  };
  checklistCompletion: { completed: number; total: number };
  blockingFlagCount: number;
  openIncidentCount: number;
  leaders: Array<{
    id: string;
    leaderName: string;
    leaderPhone: string;
    leaderType: string;
    isPrimary: boolean;
  }>;
}

export interface AutoAllocationResult {
  allocationRunId?: string;
  version?: number;
  status?: string;
  vehicleAllocations: {
    fleetId: string;
    bookingId: string;
    travelerName: string;
    seatNumber?: number;
  }[];
  roomAllocations: {
    roomNumber: string;
    roomType: string;
    genderGroup: string;
    bookingId: string;
    travelerName: string;
  }[];
  flags: string[];
  whatsappTempoText: string;
  whatsappRoomText: string;
}

export interface OpsTransportFleet {
  id?: string;
  departureDate?: string;
  vehicleType: string;
  vehicleNumber?: string; // registration plate
  capacity: number;
  vendorId?: string;
  vendor?: { id: string; name: string; phone?: string };
  driverName?: string;
  driverPhone?: string;
  route?: string;
  pickupPoints?: string;
  dropPoints?: string;
  reportingTime?: string; // HH:MM
  departureTime?: string; // HH:MM
  confirmationStatus?: string; // UNCONFIRMED | CONFIRMED | CANCELLED
  paymentDueDate?: string;
  totalAmount?: number;
  advancePaid?: number;
  balanceAmount?: number;
  notes?: string;
  /** Advisory catalog tariff from OpsVehicleRate / OpsTransportRate — does not replace totalAmount */
  tariff?: {
    amount: number;
    rateBasis?: string;
    source?: string;
    rateId?: string;
    sellableSeats?: number | null;
  } | null;
}

export interface OpsRoomInventory {
  id?: string;
  departureDate?: string;
  roomLabel: string;
  roomType: string;
  genderGroup: string;
  capacity: number;
  hotelName?: string;
  notes?: string;
}

export interface OpsActivity {
  id?: string;
  tenantId?: string;
  tripId?: string;
  departureDate?: string;
  dayNumber: number;
  date?: string;
  name: string;
  type: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  responsibleGuideId?: string;
  responsibleGuide?: { id: string; name: string; email: string };
  responsibleStaff?: string;
  vendorId?: string;
  vendor?: { id: string; name: string; type: string };
  vendorName?: string;
  estimatedCost: number;
  actualCost: number;
  maxParticipants: number;
  safetyInstructions?: string;
  requiredEquipment?: string;
  status: string;
  remarks?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const opsService = {
  async getWorkspaceSummary(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsWorkspaceSummary> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/summary/${tripId}${q}`);
    return res.data?.data;
  },
  async getDayItinerary(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsDayItinerary[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/itinerary/${tripId}${q}`);
    return res.data?.data || [];
  },
  async upsertDayItinerary(
    tripId: string,
    data: Partial<OpsDayItinerary>,
    departureDate?: string,
  ): Promise<OpsDayItinerary> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/itinerary/${tripId}${q}`, data);
    return res.data?.data;
  },
  async deleteDayItinerary(id: string): Promise<void> {
    await api.delete(`/ops/itinerary/${id}`);
  },

  async getTripExpenses(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsTripExpense[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/expenses/${tripId}${q}`);
    return res.data?.data || [];
  },
  async upsertTripExpense(
    tripId: string,
    data: Partial<OpsTripExpense>,
    departureDate?: string,
  ): Promise<OpsTripExpense> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/expenses/${tripId}${q}`, data);
    return res.data?.data;
  },
  async deleteTripExpense(id: string): Promise<void> {
    await api.delete(`/ops/expenses/${id}`);
  },

  async getTransportFleet(
    tripId: string,
    options?: { departureDate?: string; includeRates?: boolean },
  ): Promise<OpsTransportFleet[]> {
    const { departureDate, includeRates } = options || {};
    const q = [];
    if (departureDate) q.push(`departureDate=${encodeURIComponent(departureDate)}`);
    if (includeRates) q.push(`includeRates=true`);
    const queryString = q.length ? `?${q.join('&')}` : '';
    const res = await api.get(`/ops/transport/${tripId}${queryString}`);
    return res.data?.data || [];
  },
  async createTransportFleet(
    tripId: string,
    data: Partial<OpsTransportFleet>,
    departureDate?: string,
  ): Promise<OpsTransportFleet> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/transport/${tripId}${q}`, data);
    return res.data?.data;
  },
  async updateTransportFleet(
    id: string,
    data: Partial<OpsTransportFleet>,
  ): Promise<OpsTransportFleet> {
    const res = await api.put(`/ops/transport/${id}`, data);
    return res.data?.data;
  },
  async deleteTransportFleet(id: string): Promise<void> {
    await api.delete(`/ops/transport/${id}`);
  },

  async getRoomInventory(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsRoomInventory[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/rooms/${tripId}${q}`);
    return res.data?.data || [];
  },
  async createRoomInventory(
    tripId: string,
    data: Partial<OpsRoomInventory>,
    departureDate?: string,
  ): Promise<OpsRoomInventory> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/rooms/${tripId}${q}`, data);
    return res.data?.data;
  },
  async deleteRoomInventory(id: string): Promise<void> {
    await api.delete(`/ops/rooms/${id}`);
  },

  // ── GUIDE PAYMENTS ──
  async getGuidePayments(
    tripId: string,
    departureDate?: string,
  ): Promise<any[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/guides/${tripId}${q}`);
    return res.data?.data || [];
  },
  async createGuidePayment(
    tripId: string,
    data: {
      guideName: string;
      guideAdminId?: string;
      vendorId?: string;
      assignmentType?: string;
      assignmentStatus?: string;
      startDate?: string;
      endDate?: string;
      reportingLocation?: string;
      reportingTime?: string;
      emergencyContact?: string;
      daysWorked?: number;
      agreedAmount: number;
      advancePaid?: number;
      notes?: string;
    },
    departureDate?: string,
  ): Promise<any> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/guides/${tripId}${q}`, data);
    return res.data?.data;
  },
  async updateGuidePayment(id: string, data: any): Promise<any> {
    const res = await api.put(`/ops/guides/${id}`, data);
    return res.data?.data;
  },
  async deleteGuidePayment(id: string): Promise<void> {
    await api.delete(`/ops/guides/${id}`);
  },

  async getAccountingSummary(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsAccountingSummary> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/accounting-summary/${tripId}${q}`);
    return res.data?.data;
  },

  async getSeatConfig(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsSeatConfig> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/seats/${tripId}${q}`);
    return res.data?.data;
  },

  async executeAutoAllocation(
    tripId: string,
    departureDate?: string,
  ): Promise<AutoAllocationResult> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/auto-allocate/${tripId}${q}`);
    return res.data?.data;
  },

  async confirmAllocation(
    allocationRunId: string,
    roomAllocations?: any[],
    vehicleAllocations?: any[],
  ): Promise<any> {
    const res = await api.post(`/ops/auto-allocate/confirm`, {
      allocationRunId,
      ...(roomAllocations ? { roomAllocations } : {}),
      ...(vehicleAllocations ? { vehicleAllocations } : {}),
    });
    return res.data;
  },

  async overrideAllocation(data: {
    allocationRunId: string;
    targetType: string;
    targetId: string;
    beforeValue?: any;
    afterValue: any;
    reason: string;
  }): Promise<any> {
    const res = await api.post(`/ops/auto-allocate/override`, data);
    return res.data;
  },

  async getChecklist(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsChecklistItem[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/checklists/${tripId}${q}`);
    return res.data?.data || [];
  },

  async initializeChecklist(
    tripId: string,
    departureDate: string,
  ): Promise<OpsChecklistItem[]> {
    const res = await api.post(`/ops/checklists/${tripId}/initialize`, {
      departureDate,
    });
    return res.data?.data || [];
  },

  async completeChecklistItem(
    id: string,
    notes?: string,
  ): Promise<OpsChecklistItem> {
    const res = await api.post(`/ops/checklists/complete`, { id, notes });
    return res.data?.data;
  },

  async reopenChecklistItem(
    id: string,
    notes: string,
  ): Promise<OpsChecklistItem> {
    const res = await api.post(`/ops/checklists/reopen`, { id, notes });
    return res.data?.data;
  },

  // ── INCIDENTS ──
  async getIncidents(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsIncident[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/incidents/${tripId}${q}`);
    return res.data?.data || [];
  },

  async createIncident(
    tripId: string,
    data: Partial<OpsIncident>,
    departureDate?: string,
  ): Promise<OpsIncident> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/incidents${q}`, { tripId, ...data });
    return res.data?.data;
  },

  async resolveIncident(id: string, resolution: string): Promise<OpsIncident> {
    const res = await api.post(`/ops/incidents/${id}/resolve`, { resolution });
    return res.data?.data;
  },

  async reopenIncident(id: string, notes: string): Promise<OpsIncident> {
    const res = await api.post(`/ops/incidents/${id}/reopen`, { notes });
    return res.data?.data;
  },

  // ── SOP LIBRARY ──
  async getSops(
    destination?: string,
    includeArchived?: boolean,
  ): Promise<OpsSopLibrary[]> {
    const parts = [];
    if (destination)
      parts.push(`destination=${encodeURIComponent(destination)}`);
    if (includeArchived) parts.push(`includeArchived=true`);
    const q = parts.length > 0 ? `?${parts.join("&")}` : "";
    const res = await api.get(`/ops/sop-library${q}`);
    return res.data?.data || [];
  },

  async createSop(data: Partial<OpsSopLibrary>): Promise<OpsSopLibrary> {
    const res = await api.post(`/ops/sop-library`, data);
    return res.data?.data;
  },

  async updateSop(
    id: string,
    data: Partial<OpsSopLibrary>,
  ): Promise<OpsSopLibrary> {
    const res = await api.patch(`/ops/sop-library/${id}`, data);
    return res.data?.data;
  },

  async archiveSop(id: string): Promise<OpsSopLibrary> {
    const res = await api.post(`/ops/sop-library/${id}/archive`);
    return res.data?.data;
  },

  async restoreSop(id: string): Promise<OpsSopLibrary> {
    const res = await api.post(`/ops/sop-library/${id}/restore`);
    return res.data?.data;
  },

  // ── TRIP LEADERS ──
  async getTripLeader(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsTripLeader[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/leaders/${tripId}${q}`);
    return res.data?.data || [];
  },

  async assignTripLeader(
    tripId: string,
    data: Partial<OpsTripLeader>,
    departureDate?: string,
  ): Promise<OpsTripLeader> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/leaders/${tripId}${q}`, data);
    return res.data?.data;
  },

  async patchTripLeader(
    tripId: string,
    data: Partial<OpsTripLeader>,
    departureDate?: string,
  ): Promise<OpsTripLeader> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.patch(`/ops/leaders/${tripId}${q}`, data);
    return res.data?.data;
  },

  async archiveTripLeader(
    tripId: string,
    departureDate: string,
    id?: string,
    leaderPhone?: string,
  ): Promise<any> {
    const res = await api.post(`/ops/leaders/${tripId}/archive`, {
      departureDate,
      id,
      leaderPhone,
    });
    return res.data;
  },

  async restoreTripLeader(
    tripId: string,
    departureDate: string,
    id?: string,
    leaderPhone?: string,
  ): Promise<any> {
    const res = await api.post(`/ops/leaders/${tripId}/restore`, {
      departureDate,
      id,
      leaderPhone,
    });
    return res.data;
  },

  async getActivities(
    tripId: string,
    departureDate?: string,
  ): Promise<OpsActivity[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/activities/${tripId}${q}`);
    return res.data?.data || [];
  },

  async createActivity(
    tripId: string,
    data: Partial<OpsActivity>,
    departureDate?: string,
  ): Promise<OpsActivity> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/activities/${tripId}${q}`, data);
    return res.data?.data;
  },

  async updateActivity(
    tripId: string,
    id: string,
    data: Partial<OpsActivity>,
    departureDate?: string,
  ): Promise<OpsActivity> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.put(`/ops/activities/${tripId}/${id}${q}`, data);
    return res.data?.data;
  },

  async deleteActivity(id: string): Promise<void> {
    await api.delete(`/ops/activities/${id}`);
  },

  async copyActivities(
    tripId: string,
    fromTripId: string,
    fromDepartureDate: string,
    departureDate?: string,
  ): Promise<any> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.post(`/ops/activities/${tripId}/copy${q}`, {
      fromTripId,
      fromDepartureDate,
    });
    return res.data;
  },

  async getClientPayments(
    tripId: string,
    departureDate: string,
  ): Promise<{ bookings: any[]; receipts: any[] }> {
    const res = await api.get(
      `/ops/payments/client/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data || { bookings: [], receipts: [] };
  },
  async addClientPayment(bookingId: string, data: any): Promise<any> {
    const res = await api.post(`/ops/payments/client/add/${bookingId}`, data);
    return res.data?.data;
  },
  async verifyClientPayment(
    id: string,
    status: string,
    remarks?: string,
  ): Promise<any> {
    const res = await api.patch(`/ops/payments/client/verify/${id}`, {
      status,
      remarks,
    });
    return res.data?.data;
  },
  async getVendorPayments(
    tripId: string,
    departureDate: string,
  ): Promise<any[]> {
    const res = await api.get(
      `/ops/payments/vendor/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data || [];
  },
  async createVendorPayment(tripId: string, data: any): Promise<any> {
    const res = await api.post(`/ops/payments/vendor/${tripId}`, data);
    return res.data?.data;
  },
  async updateVendorPayment(
    tripId: string,
    id: string,
    data: any,
  ): Promise<any> {
    const res = await api.put(`/ops/payments/vendor/${tripId}/${id}`, data);
    return res.data?.data;
  },
  async deleteVendorPayment(id: string): Promise<void> {
    await api.delete(`/ops/payments/vendor/${id}`);
  },
  async getPaymentsDashboardStats(
    tripId: string,
    departureDate: string,
  ): Promise<any> {
    const res = await api.get(
      `/ops/payments/dashboard/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data;
  },

  // Checklist/Tasks Endpoints
  async getTasks(tripId: string, departureDate: string): Promise<any[]> {
    const res = await api.get(
      `/ops/tasks-docs-comm/tasks/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data || [];
  },
  async createTask(
    tripId: string,
    departureDate: string,
    data: any,
  ): Promise<any> {
    const res = await api.post(
      `/ops/tasks-docs-comm/tasks/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
      data,
    );
    return res.data?.data;
  },
  async updateTask(
    tripId: string,
    departureDate: string,
    id: string,
    data: any,
  ): Promise<any> {
    const res = await api.put(
      `/ops/tasks-docs-comm/tasks/${tripId}/${id}?departureDate=${encodeURIComponent(departureDate)}`,
      data,
    );
    return res.data?.data;
  },
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/ops/tasks-docs-comm/tasks/${id}`);
  },
  async saveTask(
    tripId: string,
    data: any,
    departureDate?: string,
  ): Promise<any> {
    const depDate =
      departureDate ||
      data.departureDate ||
      new Date().toISOString().substring(0, 10);
    if (data.id) {
      return this.updateTask(tripId, depDate, data.id, data);
    } else {
      return this.createTask(tripId, depDate, data);
    }
  },

  // Documents Endpoints
  async getDocuments(
    tripId: string,
    departureDate: string,
  ): Promise<{
    documents: any[];
    passengers: any[];
    summary: {
      totalPassengers: number;
      withIdentityDoc: number;
      missingIdentityDoc: number;
      withPaymentProof: number;
      missingPaymentProof: number;
    } | null;
  }> {
    const res = await api.get(
      `/ops/tasks-docs-comm/documents/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return {
      documents: res.data?.data || [],
      passengers: res.data?.passengers || [],
      summary: res.data?.summary || null,
    };
  },
  async createDocument(
    tripId: string,
    departureDate: string,
    data: any,
  ): Promise<any> {
    const res = await api.post(
      `/ops/tasks-docs-comm/documents/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
      data,
    );
    return res.data?.data;
  },
  async verifyDocument(
    id: string,
    status: string,
    remarks?: string,
  ): Promise<any> {
    const res = await api.patch(`/ops/tasks-docs-comm/documents/verify/${id}`, {
      status,
      remarks,
    });
    return res.data?.data;
  },
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/ops/tasks-docs-comm/documents/${id}`);
  },

  // Communication Endpoints
  async getMessages(tripId: string, departureDate: string): Promise<any[]> {
    const res = await api.get(
      `/ops/tasks-docs-comm/messages/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data || [];
  },
  async createMessage(
    tripId: string,
    departureDate: string,
    data: any,
  ): Promise<any> {
    const res = await api.post(
      `/ops/tasks-docs-comm/messages/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
      data,
    );
    return res.data?.data;
  },

  // Allocation Endpoints
  async saveManualAllocations(
    tripId: string,
    departureDate: string,
    data: {
      roomAllocations: Array<{
        roomNumber: string;
        roomType: string;
        genderGroup: string;
        bookingId: string;
        travelerName: string;
        sharingType?: string;
        hotelBookingId?: string;
        notes?: string;
      }>;
      vehicleAllocations: Array<{
        fleetId: string;
        bookingId: string;
        travelerName: string;
        seatNumber?: number;
        routeSegment?: string;
        pickupPoint?: string;
      }>;
      clearExisting?: boolean;
      target?: "all" | "rooms" | "vehicles";
    },
  ): Promise<any> {
    const res = await api.post(`/ops/auto-allocate/manual-save`, {
      tripId,
      departureDate,
      ...data,
    });
    return res.data;
  },

  async getConfirmedAllocations(
    tripId: string,
    departureDate: string,
  ): Promise<{
    rooms: any[];
    vehicles: any[];
    summary: {
      totalRoomAllocations: number;
      totalVehicleAllocations: number;
      vehicleCapacitySummary: any[];
    };
  }> {
    const res = await api.get(
      `/ops/auto-allocate/${tripId}/confirmed?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return (
      res.data?.data || {
        rooms: [],
        vehicles: [],
        summary: {
          totalRoomAllocations: 0,
          totalVehicleAllocations: 0,
          vehicleCapacitySummary: [],
        },
      }
    );
  },

  async getTransportPassengerGroups(
    tripId: string,
    departureDate: string,
  ): Promise<any> {
    const res = await api.get(
      `/ops/transport/${tripId}/passenger-groups?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data;
  },

  async getReportData(tripId: string, departureDate: string): Promise<any> {
    const res = await api.get(
      `/ops/tasks-docs-comm/reports/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
    );
    return res.data?.data;
  },

  async getHotelBookings(
    tripId: string,
    departureDate?: string,
  ): Promise<any[]> {
    const q = departureDate
      ? `?departureDate=${encodeURIComponent(departureDate)}`
      : "";
    const res = await api.get(`/ops/hotels/${tripId}${q}`);
    return res.data?.data || [];
  },

  async getHotels(tripId: string, departureDate?: string): Promise<any[]> {
    return this.getHotelBookings(tripId, departureDate);
  },

  async saveHotelBookings(
    tripId: string,
    departureDate: string,
    hotels: any[],
  ): Promise<any> {
    const res = await api.post(
      `/ops/hotels/${tripId}?departureDate=${encodeURIComponent(departureDate)}`,
      { hotels },
    );
    return res.data;
  },

  async deleteHotelBooking(id: string): Promise<void> {
    await api.delete(`/ops/hotels/${id}`);
  },

  async saveHotelOverride(tripId: string, data: any): Promise<any> {
    const res = await api.post(`/ops/hotels/${tripId}/override`, data);
    return res.data;
  },

  async resetHotelOverride(tripId: string, data: any): Promise<any> {
    const res = await api.post(`/ops/hotels/${tripId}/reset-override`, data);
    return res.data;
  },

  async getAllTasks(params?: {
    assignee?: string;
    source?: string;
    status?: string;
    priority?: string;
    tripId?: string;
    search?: string;
  }): Promise<any[]> {
    const q = new URLSearchParams(params as any).toString();
    const res = await api.get(`/ops/tasks-docs-comm/all-tasks?${q}`);
    return res.data?.data || [];
  },
};

export interface OpsChecklistItem {
  id: string;
  stage: string;
  taskName: string;
  isCompleted: boolean;
  notes?: string;
  completedAt?: string;
  completedBy?: { name: string };
  activities?: OpsChecklistActivity[];
}

export interface OpsChecklistActivity {
  id: string;
  action: string;
  previousStatus: boolean;
  nextStatus: boolean;
  notes?: string;
  createdAt: string;
  actor: { name: string };
}

export interface OpsIncident {
  id: string;
  title: string;
  severity: string;
  description: string;
  resolution?: string;
  status: string; // OPEN | RESOLVED
  reportedBy?: { name: string };
  resolvedBy?: { name: string };
  createdAt: string;
  resolvedAt?: string;
  activities?: OpsIncidentActivity[];
}

export interface OpsIncidentActivity {
  id: string;
  action: string;
  notes?: string;
  createdAt: string;
  actor: { name: string };
}

export interface OpsSopLibrary {
  id: string;
  destination: string;
  title: string;
  content: string;
  isActive: boolean;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  archivedBy?: { name: string };
}

export interface OpsTripLeader {
  id?: string;
  leaderName: string;
  leaderPhone: string;
  leaderType: string;
  isPrimary?: boolean;
  notes?: string;
  assignedBy?: { name: string };
  updatedBy?: { name: string };
  archivedAt?: string;
  archivedBy?: { name: string };
  activities?: any[];
}
