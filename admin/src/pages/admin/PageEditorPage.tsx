import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Save,
  Globe,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  Settings,
  Play,
  EyeOff,
  X,
} from "lucide-react";
import { pagesService } from "@/services/pages.service";
import { toast } from "sonner";

export default function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const res = await pagesService.getOne(id as string);
        const defaultSEO = {
          metaTitle: "",
          metaDescription: "",
          focusKeyword: "",
          ogImage: "",
          canonicalUrl: "",
          faqSchema: [],
        };
        setPage({
          ...res.data,
          seo: { ...defaultSEO, ...res.data.seo },
        });
        setSections(res.data.sections || []);
        setLoading(false);
      } catch (err) {
        toast.error("Failed to load page");
        navigate("/admin/pages");
      }
    };
    loadPage();
  }, [id, navigate]);

  const handleSave = async (status?: "published" | "draft") => {
    try {
      const updatedPage = {
        ...page,
        sections,
        status: status || page.status || "draft",
      };
      await pagesService.update(id as string, updatedPage);
      setPage(updatedPage);
      toast.success(
        status === "published"
          ? "Page published successfully"
          : "Draft saved successfully",
      );
    } catch (err) {
      toast.error("Failed to save page");
    }
  };

  const addSection = (type: string) => {
    const newSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: getDefaultData(type),
      isVisible: true,
    };
    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
  };

  const deleteSection = (sid: string) => {
    setSections(sections.filter((s) => s.id !== sid));
    if (activeSectionId === sid) setActiveSectionId(null);
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];
    setSections(newSections);
  };

  const activeSection = sections.find((s) => s.id === activeSectionId);

  if (loading)
    return (
      <div className="p-10 text-center font-black uppercase tracking-widest animate-pulse">
        Initializing Editor...
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] -m-6 overflow-hidden bg-background">
      {/* Dynamic Sub-Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/pages")}
          >
            <ChevronLeft />
          </Button>
          <div className="flex flex-col leading-none">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {page.title}
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {page.slug}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl">
            <Eye className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            className="rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            className="rounded-xl bg-primary text-black"
          >
            <Globe className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Section List */}
        <div className="w-80 border-r bg-card flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Page Sections
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => addSection("content")}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sections.length === 0 && (
              <p className="text-center py-10 text-xs text-muted-foreground italic">
                No sections added yet
              </p>
            )}
            {sections.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setActiveSectionId(s.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden ${activeSectionId === s.id ? "border-primary bg-primary/5" : "border-border hover:border-gray-300"} ${s.isVisible === false ? "opacity-50 grayscale" : ""}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[9px] font-black uppercase text-primary">
                      {s.type}
                    </p>
                    {s.isVisible === false && (
                      <EyeOff className="w-2.5 h-2.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-bold text-sm truncate">
                    {s.data.title || s.data.label || "Untitled Section"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(idx, "up");
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-primary/10 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(idx, "down");
                    }}
                    disabled={idx === sections.length - 1}
                    className="p-1 rounded hover:bg-primary/10 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t grid grid-cols-3 gap-2 bg-muted/30">
            {[
              "Hero",
              "VideoHero",
              "Banner",
              "Stats",
              "Trips",
              "Grid",
              "Blogs",
              "Video",
              "Content",
              "Reviews",
              "FAQ",
            ].map((t) => (
              <Button
                key={t}
                variant="outline"
                size="sm"
                className="text-[11px] h-9 font-black uppercase"
                onClick={() => addSection(t.toLowerCase())}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Center: Live-ish Preview */}
        <div className="flex-1 bg-muted p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {sections.length === 0 ? (
              <div className="bg-white min-h-[600px] shadow-2xl rounded-2xl overflow-hidden flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                  <Edit3 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">
                  Interactive Editor
                </h3>
                <p className="text-muted-foreground font-medium max-w-sm">
                  Select a section from the left to edit its properties. The
                  changes will reflect here in our live mockup engine.
                </p>
              </div>
            ) : (
              <div className="bg-white min-h-[800px] shadow-2xl rounded-2xl overflow-hidden divide-y">
                {sections.map((s) => (
                  <div
                    key={s.id}
                    className={`p-10 ${activeSectionId === s.id ? "ring-2 ring-primary ring-inset" : ""}`}
                    onClick={() => setActiveSectionId(s.id)}
                  >
                    <p className="text-[8px] font-black uppercase text-primary mb-2 italic">
                      previewing: {s.type}
                    </p>
                    {s.type === "hero" && (
                      <div className="space-y-4">
                        <h1 className="text-4xl font-black">{s.data.title}</h1>
                        <p className="text-muted-foreground">
                          {s.data.subtitle}
                        </p>
                      </div>
                    )}
                    {s.type === "videohero" && (
                      <div className="h-[400px] rounded-xl bg-gray-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                        <img
                          src={s.data.image}
                          className="absolute inset-0 object-cover opacity-30"
                        />
                        <div className="z-10 text-center space-y-4 px-10">
                          <h1 className="text-5xl font-black uppercase italic">
                            {s.data.title}
                          </h1>
                          <p className="text-sm font-bold opacity-60 tracking-widest">
                            {s.data.subtitle}
                          </p>
                          <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                        </div>
                      </div>
                    )}
                    {s.type === "banner" && (
                      <div className="h-48 rounded-xl bg-gray-900 flex items-center justify-center text-white relative overflow-hidden">
                        <img
                          src={s.data.image}
                          className="absolute inset-0 object-cover opacity-50"
                        />
                        <h2 className="text-3xl font-black z-10">
                          {s.data.title}
                        </h2>
                      </div>
                    )}
                    {s.type === "trips" && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-black">
                          {s.data.title || "Trending"}
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="h-40 bg-gray-100 rounded-3xl" />
                          <div className="h-40 bg-gray-100 rounded-3xl" />
                          <div className="h-40 bg-gray-100 rounded-3xl" />
                        </div>
                      </div>
                    )}
                    {s.type === "grid" && (
                      <div className="space-y-4 text-center">
                        <h2 className="text-2xl font-black">
                          {s.data.title || "Our Packages"}
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-40 bg-gray-100 rounded-3xl" />
                          <div className="h-40 bg-gray-100 rounded-3xl" />
                        </div>
                      </div>
                    )}
                    {s.type === "video" && (
                      <div className="h-64 rounded-xl bg-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                        <img
                          src={s.data.image}
                          className="absolute inset-0 object-cover opacity-30"
                        />
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg pointer-events-none z-10">
                          <Play className="w-8 h-8 fill-primary text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase mt-4 z-10">
                          Video: {s.data.url?.substring(0, 30)}...
                        </p>
                      </div>
                    )}
                    {s.type === "blogs" && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-black">{s.data.title}</h2>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="h-32 bg-gray-100 rounded-xl" />
                          <div className="h-32 bg-gray-100 rounded-xl" />
                          <div className="h-32 bg-gray-100 rounded-xl" />
                        </div>
                      </div>
                    )}
                    {s.type === "stats" && (
                      <div className="flex gap-10">
                        <div>
                          <p className="text-3xl font-black">100+</p>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">
                            Trips
                          </p>
                        </div>
                      </div>
                    )}
                    {s.type !== "hero" &&
                      s.type !== "banner" &&
                      s.type !== "video" &&
                      s.type !== "blogs" &&
                      s.type !== "stats" &&
                      s.type !== "trips" && (
                        <div className="text-center py-4 font-bold text-xs text-muted-foreground">
                          {s.type.toUpperCase()} PREVIEW
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Property Panel */}
        <div className="w-96 border-l bg-card flex flex-col overflow-hidden">
          <div className="p-4 border-b shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Properties
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`text-[10px] font-bold uppercase transition-all ${!activeSectionId ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setActiveSectionId(null)}
            >
              Page SEO
            </Button>
          </div>
          {!activeSectionId ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-primary/10 p-4 rounded-3xl flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-black uppercase tracking-tight">
                  Master Page SEO
                </h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Meta Title
                  </Label>
                  <Input
                    value={page.seo?.metaTitle || ""}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        seo: { ...page.seo, metaTitle: e.target.value },
                      })
                    }
                    className="rounded-xl font-bold bg-muted/10 border-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Meta Description
                  </Label>
                  <Textarea
                    value={page.seo?.metaDescription || ""}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        seo: { ...page.seo, metaDescription: e.target.value },
                      })
                    }
                    className="rounded-xl font-medium min-h-[100px] bg-muted/10 border-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Focus Keyword
                  </Label>
                  <Input
                    value={page.seo?.focusKeyword || ""}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        seo: { ...page.seo, focusKeyword: e.target.value },
                      })
                    }
                    className="rounded-xl bg-muted/10 border-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Canonical URL
                  </Label>
                  <Input
                    value={page.seo?.canonicalUrl || ""}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        seo: { ...page.seo, canonicalUrl: e.target.value },
                      })
                    }
                    className="rounded-xl bg-muted/10 border-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    OG Image URL
                  </Label>
                  <Input
                    value={page.seo?.ogImage || ""}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        seo: { ...page.seo, ogImage: e.target.value },
                      })
                    }
                    className="rounded-xl font-medium bg-muted/10 border-none"
                  />
                  {page.seo?.ogImage && (
                    <img
                      src={page.seo.ogImage}
                      className="mt-4 rounded-xl border aspect-video object-cover"
                    />
                  )}
                </div>

                {/* FAQ Schema */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest">
                      FAQ Schema
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const schema = [
                          ...(page.seo?.faqSchema || []),
                          { question: "", answer: "" },
                        ];
                        setPage({
                          ...page,
                          seo: { ...page.seo, faqSchema: schema },
                        });
                      }}
                      className="h-6 text-[8px] font-black uppercase"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(page.seo?.faqSchema || []).map(
                      (faq: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-muted/10 rounded-xl relative group"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const schema = page.seo.faqSchema.filter(
                                (_: any, i: number) => i !== idx,
                              );
                              setPage({
                                ...page,
                                seo: { ...page.seo, faqSchema: schema },
                              });
                            }}
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                          <Input
                            value={faq.question}
                            onChange={(e) => {
                              const schema = [...page.seo.faqSchema];
                              schema[idx].question = e.target.value;
                              setPage({
                                ...page,
                                seo: { ...page.seo, faqSchema: schema },
                              });
                            }}
                            placeholder="Q"
                            className="bg-transparent border-none font-bold text-xs p-0 h-auto mb-1"
                          />
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => {
                              const schema = [...page.seo.faqSchema];
                              schema[idx].answer = e.target.value;
                              setPage({
                                ...page,
                                seo: { ...page.seo, faqSchema: schema },
                              });
                            }}
                            placeholder="A"
                            className="bg-transparent border-none text-[10px] p-0 h-auto min-h-[30px] focus-visible:ring-0"
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeSection ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-tight">
                    {activeSection.type} Settings
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={
                        activeSection.isVisible === false
                          ? "text-muted-foreground"
                          : "text-primary"
                      }
                      onClick={() => {
                        const nv =
                          activeSection.isVisible === false ? true : false;
                        const newSections = sections.map((s) =>
                          s.id === activeSection.id
                            ? { ...s, isVisible: nv }
                            : s,
                        );
                        setSections(newSections);
                      }}
                    >
                      {activeSection.isVisible === false ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => deleteSection(activeSection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Common Title Field */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Title
                  </Label>
                  <Input
                    value={activeSection.data.title || ""}
                    onChange={(e) => {
                      const newSections = sections.map((s) =>
                        s.id === activeSection.id
                          ? { ...s, data: { ...s.data, title: e.target.value } }
                          : s,
                      );
                      setSections(newSections);
                    }}
                    className="rounded-xl font-bold"
                  />
                </div>

                {/* Context-Aware Fields */}
                {(activeSection.type === "hero" ||
                  activeSection.type === "videohero" ||
                  activeSection.type === "banner" ||
                  activeSection.type === "video") && (
                  <>
                    {activeSection.type === "video" ||
                    activeSection.type === "videohero" ? (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Video URL (YouTube/Direct)
                        </Label>
                        <Input
                          value={activeSection.data.url || ""}
                          onChange={(e) => {
                            const newSections = sections.map((s) =>
                              s.id === activeSection.id
                                ? {
                                    ...s,
                                    data: { ...s.data, url: e.target.value },
                                  }
                                : s,
                            );
                            setSections(newSections);
                          }}
                          placeholder="e.g https://youtube.com/watch?v=..."
                          className="rounded-xl font-medium"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Subtitle / Tags
                        </Label>
                        <Textarea
                          value={activeSection.data.subtitle || ""}
                          onChange={(e) => {
                            const newSections = sections.map((s) =>
                              s.id === activeSection.id
                                ? {
                                    ...s,
                                    data: {
                                      ...s.data,
                                      subtitle: e.target.value,
                                    },
                                  }
                                : s,
                            );
                            setSections(newSections);
                          }}
                          className="rounded-xl h-24 font-medium"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {activeSection.type === "video" ||
                        activeSection.type === "videohero"
                          ? "Thumbnail URL"
                          : "Background Image URL"}
                      </Label>
                      <Input
                        value={activeSection.data.image || ""}
                        onChange={(e) => {
                          const newSections = sections.map((s) =>
                            s.id === activeSection.id
                              ? {
                                  ...s,
                                  data: { ...s.data, image: e.target.value },
                                }
                              : s,
                          );
                          setSections(newSections);
                        }}
                        className="rounded-xl font-medium"
                      />
                    </div>
                  </>
                )}

                {(activeSection.type === "trips" ||
                  activeSection.type === "upcoming_trips" ||
                  activeSection.type === "featured_trips" ||
                  activeSection.type === "trending_trips") && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Batch / Departure Months
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/10 rounded-xl border-2 border-dashed min-h-[60px]">
                      {(activeSection.data.months || []).map(
                        (m: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-primary text-black px-2 py-1 rounded-md text-[9px] font-black uppercase"
                          >
                            {m}
                            <button
                              onClick={() => {
                                const monthsArr = (
                                  activeSection.data.months || []
                                ).filter((_: any, i: number) => i !== idx);
                                const newSections = sections.map((s) =>
                                  s.id === activeSection.id
                                    ? {
                                        ...s,
                                        data: { ...s.data, months: monthsArr },
                                      }
                                    : s,
                                );
                                setSections(newSections);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ),
                      )}
                      <Input
                        placeholder="Add month..."
                        className="h-6 border-none bg-transparent text-[9px] font-bold uppercase focus-visible:ring-0 p-0 flex-1 min-w-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === "," || e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.currentTarget.value || "")
                              .trim()
                              .toUpperCase();
                            if (val) {
                              const monthsArr = Array.from(
                                new Set([
                                  ...(activeSection.data.months || []),
                                  val,
                                ]),
                              );
                              const newSections = sections.map((s) =>
                                s.id === activeSection.id
                                  ? {
                                      ...s,
                                      data: { ...s.data, months: monthsArr },
                                    }
                                  : s,
                              );
                              setSections(newSections);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeSection.type === "blogs" && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Display Mode
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="text-[10px] uppercase font-bold"
                      >
                        Grid View
                      </Button>
                      <Button
                        variant="outline"
                        className="text-[10px] uppercase font-bold"
                      >
                        Slider View
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      Articles are automatically fetched from the blog system.
                    </p>
                  </div>
                )}

                {activeSection.type === "content" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Body Text (HTML)
                    </Label>
                    <Textarea
                      value={activeSection.data.html || ""}
                      onChange={(e) => {
                        const newSections = sections.map((s) =>
                          s.id === activeSection.id
                            ? {
                                ...s,
                                data: { ...s.data, html: e.target.value },
                              }
                            : s,
                        );
                        setSections(newSections);
                      }}
                      className="rounded-xl h-64 font-mono text-xs"
                    />
                  </div>
                )}

                {activeSection.type === "stats" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Stats Data (Label & Value JSON)
                    </Label>
                    <Textarea
                      value={JSON.stringify(activeSection.data.items, null, 2)}
                      onChange={(e) => {
                        try {
                          const newItems = JSON.parse(e.target.value);
                          const newSections = sections.map((s) =>
                            s.id === activeSection.id
                              ? { ...s, data: { ...s.data, items: newItems } }
                              : s,
                          );
                          setSections(newSections);
                        } catch (e) {}
                      }}
                      className="rounded-xl h-64 font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      {'Example: [{"label": "Trips", "value": "100+"}]'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
              <Settings className="w-10 h-10 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Select a section to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getDefaultData(type: string) {
  switch (type) {
    case "hero":
      return {
        title: "Adventure Module",
        subtitle: "Discover the world with us",
        image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      };
    case "trips":
      return {
        title: "Trending Trips",
        months: [
          "APR '26",
          "MAY '26",
          "JUN '26",
          "JUL '26",
          "AUG '26",
          "SEP '26",
          "OCT '26",
        ],
      };
    case "grid":
      return {
        title: "Explore All Trips",
        subtitle: "Global Expeditions",
        count: 6,
      };
    case "videohero":
      return {
        title: "The World Awaits",
        subtitle: "Experience Travel Like Never Before",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
      };
    case "banner":
      return {
        title: "It's time for Winter Trips",
        subtitle: "Kashmir • Spiti Valley • Kasol Manali",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
      };
    case "video":
      return {
        title: "Experience the Journey",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        image: "https://images.unsplash.com/photo-1605540435646-814006c71047",
      };
    case "blogs":
      return { title: "Watch & Read", count: 4 };
    case "content":
      return {
        title: "Rich Content Section",
        html: "<p>Start typing your content here...</p>",
      };
    case "stats":
      return {
        title: "Our Impact",
        items: [
          { label: "Happy Travelers", value: "10,000+" },
          { label: "Group Trips", value: "500+" },
          { label: "Destinations", value: "25+" },
          { label: "Review Rating", value: "4.9/5" },
        ],
      };
    case "reviews":
      return { title: "Satisfied Travelers" };
    default:
      return { title: `New ${type} Section` };
  }
}

