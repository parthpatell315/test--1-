const { prisma } = require("../lib/prisma");
const { sanitizeHtml } = require("../utils/sanitizer");

const sanitizeStringData = (val) => {
  if (typeof val !== "string") return val;
  if (val.includes("<")) {
    return sanitizeHtml(val);
  }
  return val;
};

const sanitizeObjectData = (obj) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectData);
  }
  if (typeof obj === "object") {
    const clean = {};
    for (const key in obj) {
      clean[key] = sanitizeObjectData(obj[key]);
    }
    return clean;
  }
  return sanitizeStringData(obj);
};

const sanitizeSection = (section) => {
  if (!section) return section;
  const cleanSection = { ...section };
  if (section.content)
    cleanSection.content = sanitizeObjectData(section.content);
  if (section.draft) cleanSection.draft = sanitizeObjectData(section.draft);
  if (section.data) cleanSection.data = sanitizeObjectData(section.data);

  for (const key in section) {
    if (
      ![
        "id",
        "name",
        "order",
        "visible",
        "locked",
        "type",
        "content",
        "draft",
        "data",
      ].includes(key)
    ) {
      cleanSection[key] = sanitizeObjectData(section[key]);
    }
  }
  return cleanSection;
};

const toPublicSection = (section = {}) => {
  const {
    id: _id,
    name: _name,
    order: _order,
    visible: _visible,
    locked: _locked,
    draft,
    content,
    data,
    type,
    ...inlineData
  } = section;

  return {
    type,
    data: draft ?? content ?? data ?? inlineData,
  };
};

const getUniqueVisibleSections = (sections) => {
  const seenIds = new Set();

  return sections.filter((section) => {
    if (!section || section.visible === false) return false;
    if (!section.id) return true;
    if (seenIds.has(section.id)) return false;
    seenIds.add(section.id);
    return true;
  });
};

// Get the published version of a page layout
exports.getPublishedLayout = async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🔍 [PageBuilder] Fetching published layout for: ${name}`);

    const page = await prisma.pageBuilder.findUnique({
      where: { name },
    });

    if (!page) {
      console.log(
        `⚠️ [PageBuilder] No record found for ${name}, returning empty defaults`,
      );
      return res.json({ success: true, data: { sections: [] } });
    }

    res.json({
      success: true,
      data: {
        ...page,
        sections: page.sections || [],
      },
    });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder Fetch Error] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch published layout",
        error: error.message,
      });
  }
};

/**
 * Published public page shape. This deliberately excludes the PageBuilder row,
 * draft tree, tenant metadata, editor-only fields, and duplicate section data.
 * The existing /api/page-builder/:name contract remains unchanged.
 */
exports.getPublicPublishedLayout = async (req, res) => {
  try {
    const { name } = req.params;
    const page = await prisma.pageBuilder.findUnique({
      where: { name },
    });

    const defaultSecs = getDefaultSectionsForPage(name);
    const rawSections =
      page?.sections && Array.isArray(page.sections) && page.sections.length > 0
        ? page.sections
        : page?.draft && Array.isArray(page.draft) && page.draft.length > 0
          ? page.draft
          : defaultSecs;

    const sections = rawSections
      .filter((s) => s && s.visible !== false)
      .map((s) => ({
        id: s.id || `sec-${Math.random().toString(36).substring(2, 9)}`,
        type: s.type,
        visible: s.visible !== false,
        data: sanitizeObjectData(s.draft ?? s.content ?? s.data ?? s),
      }));

    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.json({ success: true, data: { name: page?.name || name, sections } });
  } catch (error) {
    console.error(
      `Public PageBuilder fetch error name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch published layout" });
  }
};

const getDefaultSectionsForPage = (name) => {
  switch (name) {
    case "home":
      return [
        {
          id: "sec-hero-main",
          type: "hero",
          name: "Hero Header",
          visible: true,
          draft: {
            tagline: "EXPLORE. CONNECT. BELONG.",
            headlinePrefix: "Trips for the",
            strikethroughWord: "Ordinary",
            rotatingWords: [
              "Adventurous",
              "Curious",
              "Wanderlust-Struck",
              "Colleagues",
              "Strangers",
            ],
            subheadline:
              "Pick a month and explore group adventures that bring stories to life",
            backgroundImage:
              "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=85",
          },
        },
        {
          id: "sec-featured_trips-main",
          type: "featured_trips",
          name: "Upcoming Group Trips",
          visible: true,
          draft: {},
        },
        {
          id: "sec-destinations-main",
          type: "destinations",
          name: "Popular Destinations",
          visible: true,
          draft: {},
        },
        {
          id: "sec-cta_slider-main",
          type: "cta_slider",
          name: "Media Banner Slider",
          visible: true,
          draft: {},
        },
        {
          id: "sec-reviews-main",
          type: "reviews",
          name: "What Travelers Say",
          visible: true,
          draft: {},
        },
        {
          id: "sec-recent_photos-main",
          type: "recent_photos",
          name: "Recent Photos From Our Trips",
          visible: true,
          draft: {},
        },
      ];
    case "about-us":
      return [
        {
          id: "sec-about-hero",
          type: "hero",
          name: "Hero Header",
          visible: true,
          draft: {
            tagline: "OUR STORY & PHILOSOPHY",
            headlinePrefix: "REDEFINING THE",
            strikethroughWord: "ORDINARY",
            rotatingWords: [
              "MOUNTAIN JOURNEY",
              "GROUP EXPEDITIONS",
              "HIGH PASS TRAILS",
            ],
            subheadline:
              "YouthCamping was born from a passion for raw, untouched landscapes and authentic group travels across India and beyond.",
            backgroundImage:
              "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=1600",
          },
        },
        {
          id: "sec-about-[#D4541A]",
          type: "rich_text",
          name: "Story & Philosophy",
          visible: true,
          draft: {
            title: "More Than A Travel Company — A Community Of Explorers",
            body: `<p>Founded in 2018, YouthCamping started as a group of passionate mountain enthusiasts exploring the high passes of Himachal Pradesh and Ladakh. Today, we are one of India's leading experiential travel platforms.</p><p>We believe that the best stories are written off the beaten path — sipping hot chai at 14,000 feet, stargazing at remote high-altitude campsites, or exploring ancient Himalayan villages.</p><p>Every itinerary is designed with meticulous detail — from handpicked cozy homestays to experienced local drivers and certified trip captains who ensure 100% safety and top-tier hospitality.</p>`,
          },
        },
      ];
    case "terms-and-conditions":
      return [
        {
          id: "sec-terms-hero",
          type: "hero",
          name: "Hero Header",
          visible: true,
          draft: {
            tagline: "LEGAL POLICIES & GUIDELINES",
            headlinePrefix: "TERMS &",
            strikethroughWord: "",
            rotatingWords: ["CONDITIONS", "POLICIES", "AGREEMENTS"],
            subheadline:
              "Please read these terms carefully before booking any adventure expedition with YouthCamping.",
            backgroundImage:
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600",
          },
        },
        {
          id: "sec-terms-content",
          type: "rich_text",
          name: "Terms & Conditions Document",
          visible: true,
          draft: {
            title: "Terms & Conditions",
            body: `<h2>01. Declaration</h2><p>I hereby agree that I am participating in this Adventure &amp; leisure trip with proper medical advice on my own will &amp; risk. I am solely responsible for any injury or accident (minor/fatal) that takes place during the trip. Trrabb is not responsible for any such cases, incidents, or accidents. I also understand the risk from wild animals and the dangerous state of water bodies nearby the campsite.</p><h2>02. Company liability</h2><p>Trrabb organizes adventure trips to the mountains which carry risk of accidents, loss of life, bodily injury, and financial repercussions. Neither Trrabb nor its agents or affiliated entities shall be responsible or liable for any accident, bodily injury, illness or death, loss or damage to baggage or property, or for any damages or claims arising from the act, error, omission, default or negligence of any person who is not its direct employee or under its exclusive control. No act of misconduct or indiscipline shall be tolerated on the tours.</p><h2>03. Booking &amp; Payments</h2><p>Bookings are accepted through the online website. The final receipt will be sent by email. Groups of fewer than 10 persons are guided by the driver (no separate guide). Trrabb does not accept payment through unauthorized 3rd party portals. Full payment has to be done before 15 days of trip departure. Pending payments may lead to cancellation.</p><h2>04. Communication</h2><p>Support channels are active 10 AM to 7 PM excluding public holidays. Website information is final in case of miscommunication. Raise inquiries by mail at contact@trrabb.com.</p><h2>05. Transportation</h2><p>Train tickets are booked subject to availability. Extra stay or transport due to calamity or missed boarding is borne by participants. Check seats/windows before boarding.</p><h2>06. Cancellation &amp; Refund</h2><p>Trip-page policy, if stated, overrides this schedule. Cancellation is granted on receiving a request through the registered mail ID only. Refunds are paid in 7 to 12 working days by bank transfer. Advance booking amount is non-refundable. Before 45 days: 80% refund. Before 30 days: 50% refund. Before 15 days: 25% refund. Rescheduling dates: extra 25% of total package cost (20–30 days prior). Within 15 days or no show: no refund. If the trip is called off by management due to a natural calamity or unforeseen circumstances, we will issue a refund of fees after deducting train tickets cancellation charges.</p><h2>07. Trip content</h2><p>Photos and videos created on Trrabb trips are the property of Trrabb and may only be used by Trrabb for advertising. No digital content may be used without Trrabb’s permission.</p><h2>08. Jurisdiction</h2><p>Disputes are addressed under competent jurisdiction only. Travelers must follow local laws; Trrabb is not responsible if local authorities take legal action.</p>`,
          },
        },
      ];
    case "cancellation-policy":
      return [
        {
          id: "sec-cancel-hero",
          type: "hero",
          name: "Hero Header",
          visible: true,
          draft: {
            tagline: "TRANSPARENT REFUND TIMELINES",
            headlinePrefix: "CANCELLATION",
            strikethroughWord: "",
            rotatingWords: ["POLICY", "REFUNDS", "CREDITS"],
            subheadline:
              "We understand plans can change. Here is our transparent refund and cancellation policy.",
            backgroundImage:
              "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?q=80&w=1600",
          },
        },
        {
          id: "sec-cancel-content",
          type: "rich_text",
          name: "Cancellation & Refund Terms",
          visible: true,
          draft: {
            title: "Cancellation Policy",
            body: `<h2>01. How cancellation is granted</h2><p>Cancellation policy is mentioned on every trip page, if not mentioned specifically then this policy would be considered final. Cancellation would be granted by the Higher Authorities on receiving cancellation request through registered mail ID only. The cancellation amount below mentioned will be counted on total fees only. The refund amount will be paid in 7 to 12 working days through a bank transfer.</p><h2>02. Refund schedule</h2><p>Advance booking amount is non-refundable.</p><p>Before 45 days: 80% refund of total package cost.</p><p>Before 30 days: 50% refund of total package cost.</p><p>Before 15 days: 25% refund of total package cost.</p><p>Rescheduling dates: extra 25% of total package cost (20–30 days prior).</p><p>Within 15 days: no refund. No show: no refund.</p><p>Above charges will be applied on the total package cost. Full payment has to be done before 15 days of trip departure. If not paid, participation will be cancelled.</p><h2>03. Trip called off by management</h2><p>If the trip is called off by management due to a natural calamity or unforeseen circumstances, we will issue a refund of fees after deducting train tickets cancellation charges.</p>`,
          },
        },
      ];
    case "contact":
      return [
        {
          id: "sec-contact-hero",
          type: "hero",
          name: "Hero Header",
          visible: true,
          draft: {
            tagline: "24/7 EXPEDITION SUPPORT",
            headlinePrefix: "CONTACT",
            strikethroughWord: "",
            rotatingWords: ["US", "OUR TEAM", "CAPTAINS"],
            subheadline:
              "Have questions about an upcoming trek or need custom group planning? Talk to our destination experts.",
            backgroundImage:
              "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?q=80&w=1600",
          },
        },
        {
          id: "sec-contact-details",
          type: "rich_text",
          name: "Contact Info & Office Address",
          visible: true,
          draft: {
            title: "Office & Support Details",
            body: `<h2>Concierge Support</h2><p>Our travel specialists are available 10 AM - 7 PM to assist with group bookings, custom itineraries, and expedition queries.</p><h2>Email Assistance</h2><p>contact@trrabb.com</p>`,
          },
        },
      ];
    default:
      return [];
  }
};

exports.getDraftLayout = async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🔍 [PageBuilder] Fetching draft layout for: ${name}`);

    const page = await prisma.pageBuilder.findUnique({
      where: { name },
    });

    const defaultSections = getDefaultSectionsForPage(name);
    const existingSections = page?.draft || page?.sections || [];
    const sections =
      existingSections && existingSections.length > 0
        ? existingSections
        : defaultSections;

    res.json({
      success: true,
      data: {
        ...(page || {}),
        name: page?.name || name,
        sections: sections,
      },
    });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder Draft Error] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch draft layout",
        error: error.message,
      });
  }
};

exports.updateAllSections = async (req, res) => {
  try {
    const { name } = req.params;
    const { sections } = req.body;

    if (!name) throw new Error("Page name is required");

    const sanitizedSections = Array.isArray(sections)
      ? sections.map(sanitizeSection)
      : [];

    console.log(
      `💾 [PageBuilder] Updating draft for ${name} with ${sanitizedSections.length} sections`,
    );

    const page = await prisma.pageBuilder.upsert({
      where: { name },
      update: {
        draft: sanitizedSections,
        updatedAt: new Date(),
      },
      create: {
        name,
        draft: sanitizedSections,
        sections: [],
      },
    });

    res.json({ success: true, data: page });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder Update Error] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to save draft",
        error: error.message,
      });
  }
};

exports.publishLayout = async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🚀 [PageBuilder] Publishing layout for: ${name}`);

    const page = await prisma.pageBuilder.findUnique({
      where: { name },
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found to publish" });
    }

    const sectionsToPublish = page.draft || [];

    const updatedPage = await prisma.pageBuilder.update({
      where: { name },
      data: {
        sections: sectionsToPublish,
        updatedAt: new Date(),
      },
    });

    console.log(
      `✅ [PageBuilder] Published ${sectionsToPublish.length} sections for ${name}`,
    );
    res.json({ success: true, data: updatedPage });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder Publish Error] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to publish layout",
        error: error.message,
      });
  }
};

// Granular section update — merge content into a single section in the draft array
exports.updateSection = async (req, res) => {
  try {
    const { name, sectionId } = req.params;
    const {
      content,
      draft: draftContent,
      visible,
      name: sectionName,
    } = req.body;

    const page = await prisma.pageBuilder.findUnique({ where: { name } });
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const sections = Array.isArray(page.draft) ? [...page.draft] : [];
    const idx = sections.findIndex((s) => s && s.id === sectionId);
    if (idx === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    // Merge provided fields
    if (content !== undefined) sections[idx].content = content;
    if (draftContent !== undefined) sections[idx].draft = draftContent;
    if (visible !== undefined) sections[idx].visible = visible;
    if (sectionName !== undefined) sections[idx].name = sectionName;

    const updated = await prisma.pageBuilder.update({
      where: { name },
      data: { draft: sections, updatedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder updateSection] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update section",
        error: error.message,
      });
  }
};

// Reorder sections — accept [{ id, order }], sort draft array accordingly
exports.reorderSections = async (req, res) => {
  try {
    const { name } = req.params;
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Orders array is required" });
    }

    const page = await prisma.pageBuilder.findUnique({ where: { name } });
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const sections = Array.isArray(page.draft) ? [...page.draft] : [];

    // Build order map: sectionId → desired order index
    const orderMap = new Map();
    for (const entry of orders) {
      orderMap.set(entry.id, entry.order);
    }

    // Sort sections by the provided order; sections not in orderMap keep their current position at the end
    sections.sort((a, b) => {
      const orderA = orderMap.has(a?.id) ? orderMap.get(a.id) : Infinity;
      const orderB = orderMap.has(b?.id) ? orderMap.get(b.id) : Infinity;
      return orderA - orderB;
    });

    const updated = await prisma.pageBuilder.update({
      where: { name },
      data: { draft: sections, updatedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder reorderSections] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to reorder sections",
        error: error.message,
      });
  }
};

// Toggle section visibility — flip the `visible` boolean
exports.toggleSectionVisibility = async (req, res) => {
  try {
    const { name, sectionId } = req.params;

    const page = await prisma.pageBuilder.findUnique({ where: { name } });
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const sections = Array.isArray(page.draft) ? [...page.draft] : [];
    const idx = sections.findIndex((s) => s && s.id === sectionId);
    if (idx === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    sections[idx].visible = sections[idx].visible === false ? true : false;

    const updated = await prisma.pageBuilder.update({
      where: { name },
      data: { draft: sections, updatedAt: new Date() },
    });

    res.json({ success: true, data: updated, toggled: sections[idx].visible });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder toggleVisibility] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to toggle section visibility",
        error: error.message,
      });
  }
};

// Duplicate section — deep clone with new unique ID, insert right after original
exports.duplicateSection = async (req, res) => {
  try {
    const { name, sectionId } = req.params;

    const page = await prisma.pageBuilder.findUnique({ where: { name } });
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const sections = Array.isArray(page.draft) ? [...page.draft] : [];
    const idx = sections.findIndex((s) => s && s.id === sectionId);
    if (idx === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    const original = sections[idx];
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = `sec-${original.type || "dup"}-${Date.now()}`;
    clone.name = `${clone.name || "Section"} (Copy)`;

    // Insert clone right after the original
    sections.splice(idx + 1, 0, clone);

    const updated = await prisma.pageBuilder.update({
      where: { name },
      data: { draft: sections, updatedAt: new Date() },
    });

    res.json({ success: true, data: updated, duplicatedSection: clone });
  } catch (error) {
    console.error(
      `🔥 [PageBuilder duplicateSection] name=${req.params.name}:`,
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to duplicate section",
        error: error.message,
      });
  }
};
