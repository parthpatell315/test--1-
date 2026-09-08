import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Users,
  ShieldAlert,
  User,
  Clock,
  BellRing,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { opsService } from "@/services/ops.service";

interface DepartureCommunicationProps {
  tripId: string;
  departureDateStr: string;
  tripDetails?: any;
}

export default function DepartureCommunication({
  tripId,
  departureDateStr,
  tripDetails,
}: DepartureCommunicationProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<
    "GROUP" | "ANNOUNCEMENT" | "STAFF"
  >("GROUP");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!tripId || !departureDateStr) return;
    try {
      const data = await opsService.getMessages(tripId, departureDateStr);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!tripId || !departureDateStr) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    // Visibility-aware light polling (60s) only when active and document is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [tripId, departureDateStr]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msg = await opsService.createMessage(tripId, departureDateStr, {
        messageType: activeChannel,
        content: newMessage,
        departureDate: departureDateStr,
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }
  };

  const filteredMessages = messages.filter(
    (m) => m.messageType === activeChannel,
  );

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-xs flex h-[500px]">
      {/* Channels Sidebar */}
      <div className="w-60 border-r border-[#E2E8F0] flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Departure Channels
          </h4>
          <p className="text-xs font-black text-slate-800 truncate mt-1">
            {tripDetails?.title || `Trip: ${tripId}`}
          </p>
          <p className="text-[9px] text-slate-550 font-bold mt-0.5">
            Date: {departureDateStr}
          </p>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[
            {
              key: "GROUP",
              label: "Group Board",
              desc: "Passengers & Guide feed",
              icon: Users,
            },
            {
              key: "ANNOUNCEMENT",
              label: "Announcements",
              desc: "Broadcast alerts",
              icon: BellRing,
            },
            {
              key: "STAFF",
              label: "Internal Operations",
              desc: "Staff-only channels",
              icon: ShieldAlert,
            },
          ].map((ch) => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key as any)}
                className={cn(
                  "w-full text-left p-2.5 rounded-[4px] flex items-start gap-2.5 transition-all hover:bg-slate-100",
                  activeChannel === ch.key
                    ? "bg-[#FF4D00]/5 text-[#FF4D00] font-bold border-l-2 border-[#FF4D00] pl-2"
                    : "text-slate-700",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 mt-0.5",
                    activeChannel === ch.key
                      ? "text-[#FF4D00]"
                      : "text-slate-400",
                  )}
                />
                <div>
                  <p className="text-xs font-extrabold">{ch.label}</p>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {ch.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-3 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/20">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {activeChannel === "GROUP"
                ? "Departure Chat Feed"
                : activeChannel === "ANNOUNCEMENT"
                  ? "Departure Announcements"
                  : "Internal Staff Chat Log"}
            </h4>
            <p className="text-[9px] text-slate-400 font-bold">
              Only assigned participants & crew are active here
            </p>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[300px]">
          {loading ? (
            <div className="text-center text-slate-450 text-xs py-8">
              Loading communications thread...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-12 space-y-2">
              <Clock className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="font-medium text-[11px]">
                No messages posted here yet.
              </p>
              <p className="text-[9px] text-slate-400">
                Post a message below to coordinate operations.
              </p>
            </div>
          ) : (
            filteredMessages.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-black text-slate-800">
                      {m.senderName}
                    </span>
                    <span className="text-[8.5px] font-black text-slate-400 px-1 py-0.1 bg-slate-100 rounded tracking-wider uppercase">
                      {m.senderType}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-[#E2E8F0] p-2.5 rounded-r-[8px] rounded-bl-[8px] text-slate-700 text-xs font-medium leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-[#E2E8F0] bg-slate-50/50 flex gap-2"
        >
          <input
            type="text"
            required
            placeholder={
              activeChannel === "ANNOUNCEMENT"
                ? "Send broadcast announcement to passengers..."
                : activeChannel === "STAFF"
                  ? "Coordinate internally with staff..."
                  : "Send group message..."
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-9 px-3 text-xs font-bold border border-slate-200 rounded-[4px] bg-white text-slate-700 placeholder:text-slate-400 outline-none"
          />
          <button
            type="submit"
            className="h-9 w-9 bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] flex items-center justify-center shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

