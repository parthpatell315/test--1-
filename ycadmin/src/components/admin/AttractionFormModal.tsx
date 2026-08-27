import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, X } from "lucide-react";

interface AttractionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: any | null;
  onSave: (data: any, id?: string) => void;
}

const defaultForm = {
  name: "",
  description: "",
  image: "",
  location: "",
  altitude: "",
  bestTime: "",
  visitingHours: "",
  entryFee: "",
  category: "nature",
  etiquette: [] as string[],
  faqs: [] as { question: string; answer: string }[],
  isFeatured: false,
  order: 0,
};

export default function AttractionFormModal({
  open,
  onOpenChange,
  editing,
  onSave,
}: AttractionFormModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [newEtiquette, setNewEtiquette] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({ ...defaultForm, ...editing });
    } else {
      setForm(defaultForm);
    }
  }, [editing, open]);

  const addEtiquette = () => {
    if (!newEtiquette.trim()) return;
    setForm({ ...form, etiquette: [...form.etiquette, newEtiquette] });
    setNewEtiquette("");
  };

  const removeEtiquette = (index: number) => {
    setForm({
      ...form,
      etiquette: form.etiquette.filter((_, i) => i !== index),
    });
  };

  const addFaq = () => {
    setForm({ ...form, faqs: [...form.faqs, { question: "", answer: "" }] });
  };

  const updateFaq = (index: number, field: string, val: string) => {
    const updated = [...form.faqs];
    (updated[index] as any)[field] = val;
    setForm({ ...form, faqs: updated });
  };

  const removeFaq = (index: number) => {
    setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
        <DialogHeader className="p-10 pb-4">
          <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
            {editing ? "Refine Attraction" : "Define New Attraction"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="px-10">
            <TabsList className="w-full bg-muted/50 p-1 rounded-2xl h-12">
              <TabsTrigger
                value="overview"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="etiquette"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Etiquette
              </TabsTrigger>
              <TabsTrigger
                value="faqs"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                FAQs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-10 pt-6">
              <TabsContent value="overview" className="mt-0 space-y-8">
                <ImageUpload
                  label="Hero Presentation Image"
                  value={form.image}
                  onUpload={(url) => setForm({ ...form, image: url })}
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Attraction Identity
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Key Monastery"
                      className="rounded-2xl h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Classification
                    </Label>
                    <Input
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="e.g. Monastery"
                      className="rounded-2xl h-12 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Introduction / Story
                  </Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Write a compelling overview..."
                    className="rounded-2xl min-h-[120px] text-sm leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Location
                    </Label>
                    <Input
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder="Spiti Valley"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Altitude
                    </Label>
                    <Input
                      value={form.altitude}
                      onChange={(e) =>
                        setForm({ ...form, altitude: e.target.value })
                      }
                      placeholder="13,500 ft"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Entry Fee
                    </Label>
                    <Input
                      value={form.entryFee}
                      onChange={(e) =>
                        setForm({ ...form, entryFee: e.target.value })
                      }
                      placeholder="Free / ₹50"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Visiting Hours
                    </Label>
                    <Input
                      value={form.visitingHours}
                      onChange={(e) =>
                        setForm({ ...form, visitingHours: e.target.value })
                      }
                      placeholder="8 AM - 5 PM"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="etiquette" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Responsible Travel & Etiquette Rules
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEtiquette}
                      onChange={(e) => setNewEtiquette(e.target.value)}
                      placeholder="Add a rule (e.g. Respect Monks and Rituals)"
                      className="rounded-xl"
                      onKeyDown={(e) => e.key === "Enter" && addEtiquette()}
                    />
                    <Button
                      onClick={addEtiquette}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.etiquette.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-muted group"
                      >
                        <span className="text-xs font-medium">{item}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEtiquette(i)}
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="faqs" className="mt-0 space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Frequently Asked Questions
                  </Label>
                  <Button
                    onClick={addFaq}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[10px] font-black uppercase tracking-widest h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add FAQ
                  </Button>
                </div>
                <div className="space-y-4">
                  {form.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-6 bg-muted/20 rounded-[32px] border border-muted/50 space-y-3 relative group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFaq(i)}
                        className="absolute top-4 right-4 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Input
                        value={faq.question}
                        onChange={(e) =>
                          updateFaq(i, "question", e.target.value)
                        }
                        placeholder="Question"
                        className="rounded-xl border-none bg-white font-bold"
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateFaq(i, "answer", e.target.value)}
                        placeholder="Detailed Answer"
                        className="rounded-xl border-none bg-white min-h-[80px] text-xs"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="p-10 pt-6 flex justify-end gap-3 bg-muted/10 border-t">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form, (editing as any)?._id || editing?.id)}
            className="rounded-2xl h-12 px-10 bg-navy text-white hover:bg-primary-orange uppercase font-black text-[10px] tracking-[0.2em] shadow-xl shadow-navy/20 transition-all"
          >
            {editing ? "Finalize Update" : "Establish Attraction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
