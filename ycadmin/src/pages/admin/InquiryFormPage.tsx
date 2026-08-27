import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, HelpCircle, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings.service";

export default function InquiryFormPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await settingsService.get();
      setSettings(data || {});
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.update(settings);
      toast.success("Inquiry Form settings updated");
    } catch (err) {
      toast.error("Failed to update inquiry settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const inquirySettings = settings?.inquiryForm || {
    triggerPopup: "no",
    delay: 5,
    cooldown: 600,
  };

  const updateInquiry = (key: string, value: any) => {
    setSettings({
      ...settings,
      inquiryForm: {
        ...inquirySettings,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Inquiry Form
          </h1>
          <p className="text-muted-foreground font-medium text-sm">
            Configure automated lead generation and popup triggers.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl h-11 px-6 font-black uppercase text-xs shadow-lg shadow-primary/20"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="bg-card border-2 border-border rounded-[32px] overflow-hidden shadow-xl shadow-black/5">
        <div className="p-8 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg uppercase tracking-tight">
              Trigger Settings
            </h2>
          </div>
          <span className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Active System
          </span>
        </div>

        <div className="p-10 space-y-12">
          {/* Trigger Popup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="space-y-1">
              <Label className="text-sm font-black uppercase tracking-widest opacity-70">
                Automatic Trigger
              </Label>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                Decide if the form should open without user interaction to
                capture more leads.
              </p>
            </div>
            <div className="md:col-span-2">
              <RadioGroup
                value={inquirySettings.triggerPopup}
                onValueChange={(v) => updateInquiry("triggerPopup", v)}
                className="flex flex-col gap-3"
              >
                <div
                  className={`flex items-center space-x-3 p-5 rounded-[24px] border-2 transition-all cursor-pointer group ${inquirySettings.triggerPopup === "no" ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50"}`}
                  onClick={() => updateInquiry("triggerPopup", "no")}
                >
                  <RadioGroupItem
                    value="no"
                    id="no"
                    className="border-primary text-primary"
                  />
                  <div className="flex flex-col">
                    <Label
                      htmlFor="no"
                      className="font-bold cursor-pointer text-sm"
                    >
                      Manual Only
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Form only opens when user clicks a button
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center space-x-3 p-5 rounded-[24px] border-2 transition-all cursor-pointer group ${inquirySettings.triggerPopup === "yes" ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50"}`}
                  onClick={() => updateInquiry("triggerPopup", "yes")}
                >
                  <RadioGroupItem
                    value="yes"
                    id="yes"
                    className="border-primary text-primary"
                  />
                  <div className="flex flex-col">
                    <Label
                      htmlFor="yes"
                      className="font-bold cursor-pointer text-sm"
                    >
                      Smart Auto-Trigger
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Form pops up automatically to grab attention
                    </span>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Delay */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center border-t border-dashed pt-12">
            <div className="space-y-1">
              <Label className="text-sm font-black uppercase tracking-widest opacity-70">
                Trigger Delay
              </Label>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                Wait time after page load before showing the popup.
              </p>
            </div>
            <div className="md:col-span-2 flex items-center gap-6">
              <div className="relative group">
                <Input
                  type="number"
                  value={inquirySettings.delay}
                  onChange={(e) =>
                    updateInquiry("delay", parseInt(e.target.value))
                  }
                  className="w-32 h-14 rounded-2xl border-2 font-black text-xl pl-6 focus:border-primary transition-all shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground pointer-events-none group-focus-within:text-primary">
                  SEC
                </div>
              </div>
              <div className="flex-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, (inquirySettings.delay / 30) * 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-2">
                  Recommended: 3-8 seconds
                </p>
              </div>
            </div>
          </div>

          {/* Cooldown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start border-t border-dashed pt-12">
            <div className="space-y-1">
              <Label className="text-sm font-black uppercase tracking-widest opacity-70">
                Cooldown period
              </Label>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                Prevent multiple popups for the same user in one session.
              </p>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Input
                    type="number"
                    value={inquirySettings.cooldown}
                    onChange={(e) =>
                      updateInquiry("cooldown", parseInt(e.target.value))
                    }
                    className="w-32 h-14 rounded-2xl border-2 font-black text-xl pl-6 focus:border-primary transition-all shadow-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground pointer-events-none group-focus-within:text-primary">
                    SEC
                  </div>
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  ≈ {Math.round(inquirySettings.cooldown / 60)} Minutes
                </p>
              </div>
              <div className="bg-primary/5 border-2 border-primary/10 p-6 rounded-[24px] flex items-start gap-4">
                <div className="p-2 bg-primary rounded-xl shrink-0">
                  <HelpCircle className="w-5 h-5 text-black" />
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  Once an inquiry form popup has been automatically triggered,
                  it won't be triggered again for these many seconds.{" "}
                  <strong className="font-black">Expert Tip:</strong> Keep this
                  value above 600 (10 mins) to balance conversion with user
                  experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
