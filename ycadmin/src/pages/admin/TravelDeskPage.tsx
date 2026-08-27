import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  travelDeskService,
  TravelDeskWorkspace,
  DepartureSummary,
} from "@/services/travelDesk.service";
import { Trip } from "@/types";
import { toast } from "sonner";
import { TravelDeskHeader } from "@/components/travel-desk/TravelDeskHeader";
import { TravelDeskTabs } from "@/components/travel-desk/TravelDeskTabs";
import { TravelDeskTripSidebar } from "@/components/travel-desk/TravelDeskTripSidebar";
import { TravelDeskUpdatesRail } from "@/components/travel-desk/TravelDeskUpdatesRail";
import { FeedTripsDrawer } from "@/components/travel-desk/FeedTripsDrawer";
import { TravelDeskCreateTripModal } from "@/components/travel-desk/TravelDeskCreateTripModal";
import {
  TravelDeskLoadingState,
  TravelDeskErrorState,
  TravelDeskEmptyState,
  TravelDeskActivationState,
} from "@/components/travel-desk/TravelDeskStateComponents";
import { TravelDeskKnowledgeHub } from "@/components/travel-desk/TravelDeskKnowledgeHub";
import { TravelDeskDepartures } from "@/components/travel-desk/TravelDeskDepartures";
import { TravelDeskItinerary } from "@/components/travel-desk/TravelDeskItinerary";
import { TravelDeskDocuments } from "@/components/travel-desk/TravelDeskDocuments";
import { TravelDeskSops } from "@/components/travel-desk/TravelDeskSops";
import { TravelDeskGallery } from "@/components/travel-desk/TravelDeskGallery";
import { TravelDeskActivityLog } from "@/components/travel-desk/TravelDeskActivityLog";
import { TravelDeskVendors } from "@/components/travel-desk/TravelDeskVendors";

export default function TravelDeskPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tripId = searchParams.get("tripId");
  const tab = searchParams.get("tab") || "knowledge";

  // Master Lists
  const [trips, setTrips] = useState<any[]>([]);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);

  // Selected Trip State
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [workspace, setWorkspace] = useState<TravelDeskWorkspace | null>(null);
  const [departures, setDepartures] = useState<DepartureSummary[]>([]);
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);

  // Modal & Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isActivating, setIsActivating] = useState(false);

  const handleActivateWorkspace = async () => {
    if (!tripId) return;
    setIsActivating(true);
    try {
      await travelDeskService.feedWorkspaces([tripId]);
      toast.success("Workspace activated successfully!");

      // Reload Workspace Data
      setIsMainLoading(true);
      const ws = await travelDeskService.getWorkspace(tripId);
      setWorkspace(ws);

      // Also update sidebar list to show it's active
      const loadedTrips = await travelDeskService.getTravelDeskTrips();
      setTrips(loadedTrips || []);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to activate workspace",
      );
    } finally {
      setIsActivating(false);
      setIsMainLoading(false);
    }
  };

  // 1. Initial Load of Sidebar Trips
  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const loadedTrips = await travelDeskService.getTravelDeskTrips();
        setTrips(loadedTrips || []);

        // Fallback Logic: If no tripId in URL, but we have trips, navigate to the first one
        if (!tripId && loadedTrips && loadedTrips.length > 0) {
          setSearchParams(
            { tripId: loadedTrips[0].id, tab: "knowledge" },
            { replace: true },
          );
        }
      } catch (err) {
        console.error("Failed to load sidebar trips", err);
      } finally {
        setIsSidebarLoading(false);
      }
    };
    loadSidebar();
  }, []);

  // 2. Fetch Selected Trip Details
  useEffect(() => {
    if (!tripId) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const loadActiveTrip = async () => {
      setIsMainLoading(true);
      setMainError(null);

      try {
        const [overviewData, departuresData] = await Promise.all([
          travelDeskService.getTripOverview(tripId, abortController.signal),
          travelDeskService.getDepartures(tripId, abortController.signal),
        ]);

        let workspaceData = null;
        try {
          workspaceData = await travelDeskService.getWorkspace(
            tripId,
            abortController.signal,
          );
        } catch (err: any) {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
            return;
          }
          if (err?.response?.status !== 404) {
            throw err;
          }
        }

        setActiveTrip(overviewData);
        setWorkspace(workspaceData);
        setDepartures(departuresData);
      } catch (err: any) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          return; // Expected cancellation
        }
        setMainError(
          err?.response?.data?.message || "Failed to load trip workspace",
        );
        setActiveTrip(null);
        setWorkspace(null);
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsMainLoading(false);
        }
      }
    };

    loadActiveTrip();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tripId]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-[#F4F7FB] font-sans text-[#0B1528] antialiased lg:-mx-5 lg:-my-5 lg:h-[calc(100dvh-56px)] lg:overflow-hidden lg:p-5">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E8EEF4] bg-white lg:flex-row">
        {/* TRIP LIST */}
        <TravelDeskTripSidebar
          trips={trips}
          activeTripId={tripId || undefined}
          isLoading={isSidebarLoading}
          onFeedClick={() => setIsDrawerOpen(true)}
          onAddTripClick={() => setIsCreateModalOpen(true)}
        />

        {/* WORKSPACE */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F4F7FB] lg:overflow-hidden">
          {isMainLoading ? (
            <TravelDeskLoadingState message="Loading workspace" />
          ) : mainError ? (
            <TravelDeskErrorState message={mainError} />
          ) : !activeTrip ? (
            <TravelDeskEmptyState
              title="No workspace selected"
              description="Pick a trip from the list to open its workspace."
            />
          ) : !workspace ? (
            <TravelDeskActivationState
              tripTitle={activeTrip.title}
              onActivate={handleActivateWorkspace}
              isActivating={isActivating}
            />
          ) : (
            <>
              <TravelDeskHeader
                trip={activeTrip}
                readinessScore={workspace.readinessScore}
                departures={departures}
                onTripUpdated={(updatedTrip) => setActiveTrip(updatedTrip)}
              />

              <TravelDeskTabs tripId={tripId!} />

              {/* TAB CONTENT SHELL */}
              {tab === "knowledge" ? (
                <TravelDeskKnowledgeHub
                  trip={activeTrip}
                  workspace={workspace}
                />
              ) : tab === "departures" ? (
                <TravelDeskDepartures
                  trip={activeTrip}
                  departures={departures}
                />
              ) : tab === "vendors" ? (
                <TravelDeskVendors trip={activeTrip} />
              ) : tab === "itinerary" ? (
                <TravelDeskItinerary trip={activeTrip} />
              ) : tab === "documents" ? (
                <TravelDeskDocuments trip={activeTrip} />
              ) : tab === "sops" ? (
                <TravelDeskSops trip={activeTrip} />
              ) : tab === "gallery" ? (
                <TravelDeskGallery trip={activeTrip} />
              ) : tab === "activity" ? (
                <TravelDeskActivityLog trip={activeTrip} />
              ) : (
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
                  <div className="rounded-xl border border-[#E8EEF4] bg-white p-8 text-center">
                    <h2 className="mb-1.5 text-sm font-semibold capitalize text-[#0B1528]">
                      {tab} module
                    </h2>
                    <p className="text-[12px] font-medium text-slate-500">
                      This module is connected to{" "}
                      <span className="font-semibold text-[#0B1528]">
                        {activeTrip.title}
                      </span>
                      . Content for the {tab} tab is coming in a later stage.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RECENT UPDATES RAIL */}
        <TravelDeskUpdatesRail />
      </div>

      {/* FEED TRIPS DRAWER */}
      <FeedTripsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTripIds={trips.map((t) => t.id)}
        onActivated={async (newTripId) => {
          // Refresh trips and navigate to new trip
          const loadedTrips = await travelDeskService.getTravelDeskTrips();
          setTrips(loadedTrips || []);
          setSearchParams({ tripId: newTripId, tab: "knowledge" });
        }}
      />

      {/* CREATE NEW DESTINATION TRIP MODAL */}
      <TravelDeskCreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={async (newTripId) => {
          const loadedTrips = await travelDeskService.getTravelDeskTrips();
          setTrips(loadedTrips || []);
          setSearchParams({ tripId: newTripId, tab: "knowledge" });
        }}
      />
    </div>
  );
}
