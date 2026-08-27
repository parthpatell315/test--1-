import React, { useState, useEffect } from "react";
import { settingsService } from "@/services/settings.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layout,
  Globe,
  Phone,
  Mail,
  FileText,
  Share2,
  Shield,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import api from "@/services/api";

interface LinkItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

interface ColumnItem {
  id: string;
  title: string;
  visible: boolean;
  links: LinkItem[];
}

interface SocialLink {
  platform: string;
  url: string;
}

interface FooterConfig {
  brandName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  copyright: string;
  logoUrl: string;
  showSocial: boolean;
  showAddress: boolean;
  showContact: boolean;
  showCopyright: boolean;
  socialLinks: SocialLink[];
  columns: ColumnItem[];
}

export default function FooterManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({
    brandName: "YOUTHCAMPING",
    address: "",
    phone: "",
    email: "",
    website: "",
    copyright: "",
    logoUrl: "/footer-logo.png",
    showSocial: true,
    showAddress: true,
    showContact: true,
    showCopyright: true,
    socialLinks: [],
    columns: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.getFooter();
        setFooterConfig(
          data || {
            brandName: "YOUTHCAMPING",
            address: "",
            phone: "",
            email: "",
            website: "",
            copyright: "",
            logoUrl: "/footer-logo.png",
            showSocial: true,
            showAddress: true,
            showContact: true,
            showCopyright: true,
            socialLinks: [],
            columns: [],
          },
        );
      } catch (err) {
        toast.error("Failed to load footer settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateFooter(footerConfig);
      toast.success("Footer settings saved successfully");
      api.post("/revalidate", { path: "/" }).catch(() => {});
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to save footer settings",
      );
    } finally {
      setSaving(false);
    }
  };

  // Visibility toggles
  const toggleVisibility = (
    field: "showSocial" | "showAddress" | "showContact" | "showCopyright",
  ) => {
    setFooterConfig((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Address and Contact Field updates
  const handleFieldChange = (field: keyof FooterConfig, value: any) => {
    setFooterConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Social Links management
  const handleSocialLinkChange = (index: number, value: string) => {
    const updated = [...footerConfig.socialLinks];
    updated[index].url = value;
    setFooterConfig((prev) => ({ ...prev, socialLinks: updated }));
  };

  const addSocialLink = () => {
    const platform = window.prompt(
      "Enter social platform name (e.g. twitter, thread):",
    );
    if (!platform) return;
    const lowerPlatform = platform.toLowerCase().trim();
    if (footerConfig.socialLinks.some((s) => s.platform === lowerPlatform)) {
      toast.error("Social platform already exists");
      return;
    }
    setFooterConfig((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: lowerPlatform, url: "" }],
    }));
  };

  const removeSocialLink = (index: number) => {
    setFooterConfig((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  // Columns management
  const addColumn = () => {
    const title = window.prompt("Enter column title:");
    if (!title) return;
    const newCol: ColumnItem = {
      id: `col-${Date.now()}`,
      title: title.trim(),
      visible: true,
      links: [],
    };
    setFooterConfig((prev) => ({
      ...prev,
      columns: [...prev.columns, newCol],
    }));
  };

  const renameColumn = (colIndex: number) => {
    const currentTitle = footerConfig.columns[colIndex].title;
    const title = window.prompt("Rename column title:", currentTitle);
    if (!title || title.trim() === currentTitle) return;
    const updated = [...footerConfig.columns];
    updated[colIndex].title = title.trim();
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  const removeColumn = (colIndex: number) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the column "${footerConfig.columns[colIndex].title}"? This will delete all its links.`,
      )
    ) {
      return;
    }
    setFooterConfig((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== colIndex),
    }));
  };

  const toggleColumnVisibility = (colIndex: number) => {
    const updated = [...footerConfig.columns];
    updated[colIndex].visible = !updated[colIndex].visible;
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  const moveColumn = (colIndex: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? colIndex - 1 : colIndex + 1;
    if (targetIndex < 0 || targetIndex >= footerConfig.columns.length) return;
    const updated = [...footerConfig.columns];
    const temp = updated[colIndex];
    updated[colIndex] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  // Links management inside columns
  const addLink = (colIndex: number) => {
    const label = window.prompt("Enter link text:");
    if (!label) return;
    const href = window.prompt("Enter link URL (e.g. /trips or https://...):");
    if (!href) return;

    const newLink: LinkItem = {
      id: `l-${Date.now()}`,
      label: label.trim(),
      href: href.trim(),
      visible: true,
    };
    const updated = [...footerConfig.columns];
    updated[colIndex].links = [...updated[colIndex].links, newLink];
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  const updateLinkField = (
    colIndex: number,
    linkIndex: number,
    field: keyof LinkItem,
    value: any,
  ) => {
    const updated = [...footerConfig.columns];
    updated[colIndex].links[linkIndex] = {
      ...updated[colIndex].links[linkIndex],
      [field]: value,
    };
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  const removeLink = (colIndex: number, linkIndex: number) => {
    const updated = [...footerConfig.columns];
    updated[colIndex].links = updated[colIndex].links.filter(
      (_, i) => i !== linkIndex,
    );
    setFooterConfig((prev) => ({ ...prev, columns: updated }));
  };

  const moveLink = (
    colIndex: number,
    linkIndex: number,
    direction: "up" | "down",
  ) => {
    const targetIndex = direction === "up" ? linkIndex - 1 : linkIndex + 1;
    const links = footerConfig.columns[colIndex].links;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const updatedLinks = [...links];
    const temp = updatedLinks[linkIndex];
    updatedLinks[linkIndex] = updatedLinks[targetIndex];
    updatedLinks[targetIndex] = temp;

    const updatedColumns = [...footerConfig.columns];
    updatedColumns[colIndex].links = updatedLinks;
    setFooterConfig((prev) => ({ ...prev, columns: updatedColumns }));
  };

  if (loading) {
    return (
      <div className="p-10 text-center font-bold uppercase tracking-widest opacity-40">
        Loading Footer Configurations...
      </div>
    );
  }

  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Layout className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Footer Management
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Customize the public website footer columns, contact details,
              social links, and visibility settings.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          <Save className="w-4 h-4" />{" "}
          {saving ? "Saving..." : "Save Footer Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Footer Columns Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white rounded-md border border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#FF4D00]" /> Footer Link
                  Columns
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addColumn}
                  className="rounded-[4px] h-8 px-3 text-xs font-semibold border-slate-200 shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Column
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {footerConfig.columns.map((col, colIdx) => (
                  <div
                    key={col.id}
                    className={`border rounded-md p-4 bg-slate-50/50 shadow-sm flex flex-col gap-4 relative ${!col.visible ? "opacity-60 border-dashed" : "border-slate-200"}`}
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center bg-white p-3 rounded-md border border-slate-200">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-xs font-semibold text-slate-400 block uppercase">
                          Column Title
                        </span>
                        <h3
                          className="font-bold text-slate-800 truncate"
                          onClick={() => renameColumn(colIdx)}
                          title="Click to rename"
                        >
                          {col.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleColumnVisibility(colIdx)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                          title={col.visible ? "Hide column" : "Show column"}
                        >
                          {col.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={colIdx === 0}
                          onClick={() => moveColumn(colIdx, "left")}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-30"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={colIdx === footerConfig.columns.length - 1}
                          onClick={() => moveColumn(colIdx, "right")}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-30"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeColumn(colIdx)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Links List */}
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">
                          Links ({col.links.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addLink(colIdx)}
                          className="h-6 text-[11px] text-primary-orange hover:text-primary-orange/80 p-0 font-bold"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> Add Link
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {col.links.map((link, linkIdx) => (
                          <div
                            key={link.id}
                            className={`flex items-center gap-2 bg-white p-2 rounded-md border border-slate-200/80 ${!link.visible ? "opacity-55 border-dashed" : ""}`}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <Input
                                value={link.label}
                                onChange={(e) =>
                                  updateLinkField(
                                    colIdx,
                                    linkIdx,
                                    "label",
                                    e.target.value,
                                  )
                                }
                                placeholder="Text"
                                className="h-7 text-xs font-semibold px-2 py-0"
                              />
                              <Input
                                value={link.href}
                                onChange={(e) =>
                                  updateLinkField(
                                    colIdx,
                                    linkIdx,
                                    "href",
                                    e.target.value,
                                  )
                                }
                                placeholder="URL (e.g. /trips)"
                                className="h-7 text-[10px] font-mono px-2 py-0 text-slate-500"
                              />
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  updateLinkField(
                                    colIdx,
                                    linkIdx,
                                    "visible",
                                    !link.visible,
                                  )
                                }
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-400"
                                title={
                                  link.visible ? "Disable link" : "Enable link"
                                }
                              >
                                {link.visible ? (
                                  <Eye className="w-3.5 h-3.5" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-red-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={linkIdx === 0}
                                onClick={() => moveLink(colIdx, linkIdx, "up")}
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={linkIdx === col.links.length - 1}
                                onClick={() =>
                                  moveLink(colIdx, linkIdx, "down")
                                }
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeLink(colIdx, linkIdx)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {col.links.length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-md">
                            No links in this column.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {footerConfig.columns.length === 0 && (
                  <div className="md:col-span-2 text-center py-16 text-slate-400 border border-dashed rounded-md">
                    No footer columns configured yet. Click "Add Column" to get
                    started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Visibility Controls & Bottom Footer details */}
        <div className="space-y-6">
          {/* Visibility Controls */}
          <Card className="bg-white rounded-md border border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                <Shield className="w-4 h-4 text-[#FF4D00]" /> Visibility
                Controls
              </h2>

              <div className="space-y-4">
                {[
                  {
                    label: "Show Social Media Icons",
                    field: "showSocial" as const,
                  },
                  {
                    label: "Show Office Address",
                    field: "showAddress" as const,
                  },
                  {
                    label: "Show Contact details",
                    field: "showContact" as const,
                  },
                  {
                    label: "Show Copyright Banner",
                    field: "showCopyright" as const,
                  },
                ].map((item) => (
                  <div
                    key={item.field}
                    className="flex items-center justify-between bg-slate-50/50 p-3 rounded-md border border-slate-200"
                  >
                    <Label className="text-xs font-semibold text-slate-700">
                      {item.label}
                    </Label>
                    <button
                      type="button"
                      onClick={() => toggleVisibility(item.field)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        footerConfig[item.field]
                          ? "bg-primary-orange"
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          footerConfig[item.field]
                            ? "translate-x-4.5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="bg-white rounded-md border border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#FF4D00]" /> Social Accounts
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addSocialLink}
                  className="h-6 text-[11px] text-primary-orange hover:text-primary-orange/80 p-0 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" /> Add Platform
                </Button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {footerConfig.socialLinks.map((social, idx) => (
                  <div
                    key={social.platform}
                    className="space-y-1 bg-slate-50/50 p-3 rounded-md border border-slate-200 relative"
                  >
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">
                        {social.platform}
                      </Label>
                      <button
                        type="button"
                        onClick={() => removeSocialLink(idx)}
                        className="text-red-600 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      value={social.url}
                      onChange={(e) =>
                        handleSocialLinkChange(idx, e.target.value)
                      }
                      placeholder={`e.g. https://${social.platform}.com/youthcamping`}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9 text-xs"
                    />
                  </div>
                ))}

                {footerConfig.socialLinks.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-md">
                    No social handles defined.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact details */}
          <Card className="bg-white rounded-md border border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                <Globe className="w-4 h-4 text-[#FF4D00]" /> Contact details &
                Tagline
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Brand Name
                  </Label>
                  <Input
                    value={footerConfig.brandName}
                    onChange={(e) =>
                      handleFieldChange("brandName", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="YOUTHCAMPING"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Support Phone
                  </Label>
                  <Input
                    value={footerConfig.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="+91-99242 46267"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Support Email
                  </Label>
                  <Input
                    value={footerConfig.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="info@youthcamping.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Website URL
                  </Label>
                  <Input
                    value={footerConfig.website}
                    onChange={(e) =>
                      handleFieldChange("website", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="youthcamping.online"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Footer White Logo URL
                  </Label>
                  <Input
                    value={footerConfig.logoUrl || "/footer-logo.png"}
                    onChange={(e) =>
                      handleFieldChange("logoUrl", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="/footer-logo.png"
                  />
                  {/* White Logo Dark Card Preview */}
                  <div className="p-3 bg-[#0B1528] rounded-xl border border-slate-800 flex items-center justify-between mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Logo Preview
                    </span>
                    <img
                      src={footerConfig.logoUrl || "/footer-logo.png"}
                      alt="Footer White Logo"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Copyright Text
                  </Label>
                  <Input
                    value={footerConfig.copyright}
                    onChange={(e) =>
                      handleFieldChange("copyright", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white h-9"
                    placeholder="ALL RIGHTS RESERVED."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Office Address
                  </Label>
                  <textarea
                    value={footerConfig.address}
                    onChange={(e) =>
                      handleFieldChange("address", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] bg-white text-xs h-20"
                    placeholder="Full office address..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

