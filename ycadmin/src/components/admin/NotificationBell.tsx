import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  DollarSign,
  Ticket,
  Bus,
  Sparkles,
  RefreshCw,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsService } from "@/services/notifications.service";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resolveAdminRoute } from "@/lib/adminRouteAliases";

// Play subtle notification chime
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "PAYMENTS" | "OPERATIONS">("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await notificationsService.getAll();
      if (Array.isArray(data)) {
        setNotifications((prev) => {
          // If new unread item arrived and sound is enabled, play chime
          const prevIds = new Set(prev.map((n) => n.id));
          const newItems = data.filter((n) => !prevIds.has(n.id) && !n.isRead);
          if (!isInitial && newItems.length > 0 && soundEnabled) {
            playNotificationChime();
          }
          return data;
        });
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 20000); // 20s polling
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "UNREAD") return !n.isRead;
      if (activeTab === "PAYMENTS") return n.type === "PAYMENT" || n.title?.includes("Cash") || n.title?.includes("Payment") || n.title?.includes("💰");
      if (activeTab === "OPERATIONS") return n.type === "TICKETING" || n.title?.includes("Ticket") || n.title?.includes("Departure") || n.title?.includes("🎫");
      return true;
    });
  }, [notifications, activeTab]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string, link?: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      if (link) {
        setIsOpen(false);
        navigate(resolveAdminRoute(link));
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationsService.clearAll();
      setNotifications([]);
      toast.success("Notifications cleared");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const handleSendTest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationsService.sendTest();
      if (soundEnabled) playNotificationChime();
      toast.success("Test notification created!");
      await fetchNotifications(false);
    } catch (error) {
      toast.error("Failed to send test notification");
    }
  };

  // Helper icon for notification item
  const getNotificationIcon = (n: any) => {
    if (n.type === "PAYMENT" || n.title?.includes("Cash") || n.title?.includes("Payment") || n.title?.includes("💰")) {
      return (
        <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
          <DollarSign className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (n.type === "TICKETING" || n.title?.includes("Ticket") || n.title?.includes("🎫")) {
      return (
        <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
          <Ticket className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (n.title?.includes("Departure") || n.title?.includes("Hotel") || n.title?.includes("Transport")) {
      return (
        <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
          <Bus className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="h-7 w-7 rounded-full bg-orange-50 text-[#FF4D00] border border-orange-200 flex items-center justify-center shrink-0">
        <Bell className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-[#F4F7FB] hover:text-[#0B1528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D00]/30 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-[#FF4D00] text-[9px] font-black text-white ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] sm:w-[400px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white z-50 text-slate-900"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#FF4D00]" /> Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#FF4D00] text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center text-xs transition-colors",
                  soundEnabled ? "text-slate-600 hover:bg-slate-200/60" : "text-slate-400 hover:bg-slate-200/60"
                )}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                title="Refresh notifications"
                className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-200/60 flex items-center justify-center text-xs transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#FF4D00]")} />
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all",
                  activeTab === "ALL" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("UNREAD")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all",
                  activeTab === "UNREAD" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PAYMENTS")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all",
                  activeTab === "PAYMENTS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Payments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("OPERATIONS")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all",
                  activeTab === "OPERATIONS" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Ops
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-bold text-[#FF4D00] hover:text-[#e04500] flex items-center gap-1 transition-colors px-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-700">All caught up!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No notifications in this filter.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={(e) => handleMarkAsRead(e, n.id, n.link)}
                className={cn(
                  "flex items-start gap-3 p-3 transition-colors cursor-pointer text-left hover:bg-slate-50",
                  !n.isRead ? "bg-orange-50/30" : "bg-white"
                )}
              >
                {getNotificationIcon(n)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={cn("text-xs font-bold truncate", !n.isRead ? "text-slate-900" : "text-slate-700")}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-[#FF4D00] shrink-0" />
                    )}
                  </div>

                  <p className={cn("text-[11px] leading-snug line-clamp-2", !n.isRead ? "text-slate-800" : "text-slate-500")}>
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "Recent"}
                    </span>

                    {n.link && (
                      <span className="text-[#FF4D00] font-semibold flex items-center gap-0.5 hover:underline">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleSendTest}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/60 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-[#FF4D00]" /> Send Test Bell
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

