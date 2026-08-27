import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { emailsService, EmailTemplate } from "@/services/emails.service";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Trash2,
  Paperclip,
  Send,
  Eye,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface EmailComposerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: "booking" | "inquiry" | "ticket";
  contextId?: string;
  selectedIds?: string[];
  recipientEmail?: string;
  recipientName?: string;
  onSent?: () => void;
}

const MERGE_TAGS = [
  { tag: "{{recipient.full_name}}", label: "Recipient Name" },
  { tag: "{{recipient.email}}", label: "Recipient Email" },
  { tag: "{{booking.reference}}", label: "Booking Ref" },
  { tag: "{{booking.status}}", label: "Booking Status" },
  { tag: "{{booking.total_amount}}", label: "Total Amount" },
  { tag: "{{booking.remaining_balance}}", label: "Remaining Balance" },
  { tag: "{{trip.name}}", label: "Trip Name" },
  { tag: "{{trip.start_date}}", label: "Start Date" },
  { tag: "{{trip.pickup_city}}", label: "Pickup City" },
  { tag: "{{salesperson.name}}", label: "Salesperson" },
  { tag: "{{train.name}}", label: "Train Name" },
  { tag: "{{train.pnr}}", label: "PNR Number" },
  { tag: "{{train.coach}}", label: "Coach" },
  { tag: "{{train.seat}}", label: "Seat Number" },
];

export default function EmailComposerDrawer({
  isOpen,
  onClose,
  contextType,
  contextId,
  selectedIds = [],
  recipientEmail = "",
  recipientName = "",
  onSent,
}: EmailComposerDrawerProps) {
  const isBulkMode = selectedIds.length > 0;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Form fields
  const [to, setTo] = useState(recipientEmail || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [sendCopy, setSendCopy] = useState(false);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Test Email Mode
  const [testEmail, setTestEmail] = useState("");

  // Loading & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // Bulk Progress States
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    isCompleted: false,
  });

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setTo(recipientEmail || "");
      setSubject("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setAttachments([]);
      setSelectedTemplateId("");
      setShowProgressOverlay(false);
    }
  }, [isOpen, recipientEmail]);

  const fetchTemplates = async () => {
    try {
      const list = await emailsService.getTemplates();
      const filtered = list.filter((t) => t.isActive);
      setTemplates(filtered);
    } catch (err) {
      console.error("🔥 Failed to load templates:", err);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    if (!tId) {
      setSubject("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      return;
    }
    const template = templates.find((t) => t.id === tId);
    if (template) {
      setSubject(template.subject);
      if (editorRef.current) {
        editorRef.current.innerHTML = template.body;
      }
    }
  };

  // Rich Text Editor formatting commands
  const formatDoc = (cmd: string, value: string = "") => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const addLink = () => {
    const url = prompt("Enter link URL:");
    if (url) {
      formatDoc("createLink", url);
    }
  };

  // Merge Tag injection
  const insertTag = (tag: string) => {
    if (document.activeElement?.id === "subject-input") {
      setSubject((prev) => prev + tag);
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(tag);
        range.insertNode(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.innerHTML += tag;
      }
    }
  };

  // Attachment upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalSize = [...attachments, ...newFiles].reduce(
        (acc, f) => acc + f.size,
        0,
      );

      if (totalSize > 25 * 1024 * 1024) {
        toast.error("Total attachments size cannot exceed 25 MB");
        return;
      }
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Email Validation & Execution
  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!isBulkMode) {
      if (!to || !emailRegex.test(to.trim())) {
        toast.error("Please enter a valid recipient email address.");
        return false;
      }
    }
    if (cc) {
      const ccList = cc.split(",");
      for (const email of ccList) {
        if (!emailRegex.test(email.trim())) {
          toast.error(`Invalid CC email address: ${email}`);
          return false;
        }
      }
    }
    if (bcc) {
      const bccList = bcc.split(",");
      for (const email of bccList) {
        if (!emailRegex.test(email.trim())) {
          toast.error(`Invalid BCC email address: ${email}`);
          return false;
        }
      }
    }
    if (replyTo && !emailRegex.test(replyTo.trim())) {
      toast.error("Please enter a valid Reply-To email address.");
      return false;
    }
    return true;
  };

  const executeSend = async (isTestMode = false) => {
    if (!validateEmails()) return;

    const emailBody = editorRef.current ? editorRef.current.innerHTML : "";
    if (!subject.trim()) return toast.error("Subject is required");
    if (!emailBody.trim()) return toast.error("Email content is required");

    // BULK SEND FLOW
    if (isBulkMode && !isTestMode) {
      setIsLoading(true);
      setBulkProgress({
        total: selectedIds.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        pending: selectedIds.length,
        isCompleted: false,
      });
      setShowProgressOverlay(true);

      try {
        const res = await emailsService.sendBulkEmails({
          contextType: contextType as "booking" | "inquiry",
          selectedIds,
          subject,
          body: emailBody,
          templateId: selectedTemplateId || undefined,
        });

        setBulkProgress({
          total: selectedIds.length,
          sent: res.sent,
          failed: res.failed,
          skipped: res.skipped,
          pending: 0,
          isCompleted: true,
        });
        toast.success("Bulk emails sending finished!");
        if (onSent) onSent();
      } catch (err) {
        console.error("🔥 Bulk sending failed:", err);
        toast.error("Failed to run bulk emails sending.");
        setShowProgressOverlay(false);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // SINGLE SEND OR TEST SEND FLOW
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("contextType", contextType);
      formData.append("contextId", contextId || "");
      formData.append("to", isTestMode ? testEmail : to);
      formData.append("cc", cc);
      formData.append("bcc", bcc);
      formData.append("replyTo", replyTo);
      formData.append("subject", subject);
      formData.append("body", emailBody);
      formData.append("isTest", isTestMode ? "true" : "false");
      if (selectedTemplateId) {
        formData.append("templateId", selectedTemplateId);
      }

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await emailsService.sendCustomEmail(formData);
      if (res.success) {
        toast.success(
          isTestMode
            ? `Test email sent to ${testEmail}`
            : "Email sent successfully!",
        );
        if (!isTestMode) {
          if (onSent) onSent();
          onClose();
        }
      } else {
        toast.error(res.message || "Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "An error occurred while sending email.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const tName = prompt("Enter new template name:");
    if (!tName) return;

    try {
      const emailBody = editorRef.current ? editorRef.current.innerHTML : "";
      await emailsService.createTemplate({
        name: tName,
        subject,
        body: emailBody,
        category:
          contextType === "booking"
            ? "Booking"
            : contextType === "inquiry"
              ? "Inquiry"
              : "Ticketing",
        isActive: true,
      });
      toast.success("Template saved successfully!");
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to save template");
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => !open && !isLoading && onClose()}
    >
      <SheetContent
        side="right"
        className="w-[600px] sm:w-[540px] max-w-full overflow-y-auto p-6 bg-white border-l border-slate-200"
      >
        {/* Progress Overlay for Bulk Mode */}
        {showProgressOverlay && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                {bulkProgress.isCompleted
                  ? "Bulk Sending Complete"
                  : "Sending Bulk Emails"}
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Please do not close this drawer until processing completes.
              </p>
            </div>

            <div className="w-full max-w-xs bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 font-semibold text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Recipients:</span>
                <span className="font-bold text-slate-800">
                  {bulkProgress.total}
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Sent:
                </span>
                <span className="font-bold">{bulkProgress.sent}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Failed:
                </span>
                <span className="font-bold">{bulkProgress.failed}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Skipped:
                </span>
                <span className="font-bold">{bulkProgress.skipped}</span>
              </div>
            </div>

            {!bulkProgress.isCompleted ? (
              <div className="flex items-center gap-2 text-[#FF4D00] text-xs font-bold">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending emails...
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setShowProgressOverlay(false);
                  onClose();
                }}
                className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-bold text-xs px-6 py-2"
              >
                Done
              </Button>
            )}
          </div>
        )}

        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#FF4D00]" />
            {isBulkMode
              ? `Send Bulk Email (${selectedIds.length} Recips)`
              : "Send Email"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-20">
          {/* Recipients Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                To
              </label>
              {isBulkMode ? (
                <div className="bg-white border border-slate-200 rounded px-3 py-2 text-xs font-extrabold text-[#FF4D00]">
                  Multiple Recipients ({selectedIds.length} Selected)
                </div>
              ) : (
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="bg-white border-slate-200 focus:border-[#FF4D00] text-sm font-semibold"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Cc
                </label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="bg-white border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Bcc
                </label>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="bg-white border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Reply-To
                </label>
                <Input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="reply@example.com"
                  className="bg-white border-slate-200 text-xs font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 pb-3 pl-1">
                <Checkbox
                  id="copy-to-me"
                  checked={sendCopy}
                  onCheckedChange={(checked) => setSendCopy(checked === true)}
                />
                <label
                  htmlFor="copy-to-me"
                  className="text-xs font-bold text-slate-600 cursor-pointer select-none"
                >
                  Send a copy to me
                </label>
              </div>
            </div>
          </div>

          {/* Template & Subject */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:border-[#FF4D00] outline-none transition-colors"
              >
                <option value="">-- Choose an Email Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Subject
              </label>
              <Input
                id="subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                className="border-slate-200 focus:border-[#FF4D00] text-sm font-semibold"
              />
            </div>
          </div>

          {/* Available Merge Tags */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTags(!showTags)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-600 flex justify-between items-center transition-colors"
            >
              <span>{showTags ? "Hide" : "Show"} Available Merge Tags</span>
              <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                Click to Insert
              </span>
            </button>
            {showTags && (
              <div className="p-3 bg-white grid grid-cols-2 gap-1.5 border-t border-slate-100 max-h-[160px] overflow-y-auto">
                {MERGE_TAGS.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => insertTag(t.tag)}
                    className="text-left text-[11px] font-semibold text-slate-700 hover:text-[#FF4D00] bg-slate-50 hover:bg-[#FF4D00]/5/50 p-1.5 rounded border border-slate-100 hover:border-[#FF4D00]/20 transition-all truncate"
                    title={t.tag}
                  >
                    <span className="font-mono text-[#FF4D00] mr-1">
                      {t.tag}
                    </span>
                    <span className="text-slate-400 font-normal">
                      ({t.label})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rich text message editor */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Message Body
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("bold")}
                >
                  <Bold className="h-4 w-4 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("italic")}
                >
                  <Italic className="h-4 w-4 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("underline")}
                >
                  <Underline className="h-4 w-4 text-slate-600" />
                </Button>
                <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("insertUnorderedList")}
                >
                  <List className="h-4 w-4 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={addLink}
                >
                  <Link2 className="h-4 w-4 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200"
                  onClick={() => formatDoc("removeFormat")}
                  title="Clear formatting"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                className="p-4 bg-white min-h-[220px] text-sm focus:outline-none overflow-y-auto max-h-[350px] prose prose-sm max-w-none"
                style={{ direction: "ltr" }}
              />
            </div>
          </div>

          {/* Test Email Section */}
          <div className="border-t border-slate-100 pt-5 mt-4 space-y-3">
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
              <label className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Test Email Before Sending
              </label>
              <div className="flex gap-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="bg-white border-amber-200 focus:border-amber-500 text-sm font-semibold grow"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => executeSend(true)}
                  disabled={isLoading || !testEmail}
                  className="bg-amber-600 hover:bg-amber-700 border-none text-white text-xs font-bold transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Send Test
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Footer Toolbar */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between gap-3 shadow-md">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAsTemplate}
            className="border-slate-300 hover:bg-slate-100 text-xs font-bold"
          >
            Save as Template
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-500 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => executeSend(false)}
              disabled={isLoading}
              className="bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-bold shadow-sm"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isLoading
                ? isBulkMode
                  ? "Sending campaign..."
                  : "Sending..."
                : isBulkMode
                  ? "Send Campaign"
                  : "Send Email"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

