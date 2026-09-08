import React, { useState, useEffect } from "react";
import { emailsService, EmailLog } from "@/services/emails.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Clock,
  User,
  Eye,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface EmailLogsTimelineProps {
  contextType: "booking" | "inquiry" | "ticket";
  contextId: string;
}

export default function EmailLogsTimeline({
  contextType,
  contextId,
}: EmailLogsTimelineProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [contextType, contextId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let data: EmailLog[] = [];
      if (contextType === "booking") {
        data = await emailsService.getBookingLogs(contextId);
      } else if (contextType === "inquiry") {
        data = await emailsService.getInquiryLogs(contextId);
      } else if (contextType === "ticket") {
        data = await emailsService.getTicketLogs(contextId);
      }
      setLogs(data);
    } catch (err) {
      console.error("🔥 Failed to load email logs:", err);
      toast.error("Failed to load email logs history.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Email Communication History
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="text-xs h-7 px-2.5"
          disabled={isLoading}
        >
          Refresh Logs
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-6 text-xs text-slate-400 font-semibold">
          Loading email correspondence logs...
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs text-slate-400 font-semibold">
          No email communication logged for this record.
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-3.5 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all hover:border-slate-200 ${
                log.isTest
                  ? "border-l-4 border-l-amber-400"
                  : log.status === "FAILED"
                    ? "border-l-4 border-l-red-400"
                    : "border-l-4 border-l-green-500"
              }`}
            >
              <div className="space-y-1.5 grow max-w-full truncate">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      log.isTest
                        ? "bg-amber-50 text-amber-700"
                        : log.status === "FAILED"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                    }`}
                  >
                    {log.isTest
                      ? "Test Mail"
                      : log.status === "FAILED"
                        ? "Failed"
                        : "Sent"}
                  </span>

                  {log.templateName && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Template: {log.templateName}
                    </span>
                  )}
                </div>

                <div
                  className="font-bold text-sm text-slate-800 truncate"
                  title={log.subject}
                >
                  {log.subject}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                    To:{" "}
                    <strong className="text-slate-700">{log.recipient}</strong>
                  </span>
                  {(log.ccCount > 0 || log.bccCount > 0) && (
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({log.ccCount > 0 ? `${log.ccCount} Cc` : ""}
                      {log.ccCount > 0 && log.bccCount > 0 ? ", " : ""}
                      {log.bccCount > 0 ? `${log.bccCount} Bcc` : ""})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0 text-slate-400" />
                    By:{" "}
                    <strong className="text-slate-700">
                      {log.sender?.name || "System"}
                    </strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                    {new Date(log.sentAt).toLocaleString()}
                  </span>
                </div>

                {log.attachments &&
                  Array.isArray(log.attachments) &&
                  log.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {log.attachments.map((file: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded"
                        >
                          <FileText className="h-3 w-3 text-slate-400" />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}

                {log.status === "FAILED" && log.error && (
                  <div className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-1 bg-red-50/50 p-1.5 rounded border border-red-100">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Error: {log.error}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewLog(log)}
                  className="h-8 w-8 hover:bg-slate-100 text-slate-500 hover:text-[#FF4D00]"
                  title="Preview Sent Email"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* sent email preview modal */}
      <Dialog
        open={!!previewLog}
        onOpenChange={(open) => !open && setPreviewLog(null)}
      >
        <DialogContent className="max-w-[700px] w-full bg-white p-6 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#FF4D00]" />
              Email Preview
            </DialogTitle>
          </DialogHeader>

          {previewLog && (
            <div className="space-y-4 grow overflow-y-auto flex flex-col">
              {/* Header Details */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1.5 text-xs text-slate-600 shadow-sm">
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    Subject:
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {previewLog.subject}
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    To:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {previewLog.recipient}
                  </span>
                </div>
                {previewLog.ccCount > 0 && (
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      Cc Count:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {previewLog.ccCount} recipient(s)
                    </span>
                  </div>
                )}
                {previewLog.bccCount > 0 && (
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      Bcc Count:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {previewLog.bccCount} recipient(s){" "}
                      <span className="text-[10px] text-amber-500 font-normal">
                        (Hidden from customer)
                      </span>
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    Sent By:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {previewLog.sender?.name || "System"} (
                    {previewLog.sender?.email || "system@youthcamping.online"})
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    Date:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {new Date(previewLog.sentAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Email Content Frame */}
              <div className="border border-slate-200 rounded-xl overflow-hidden grow flex flex-col bg-white">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Email body HTML content
                </div>
                <div className="p-4 grow overflow-y-auto bg-slate-50/20 max-h-[400px]">
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: previewLog.body }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setPreviewLog(null)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



