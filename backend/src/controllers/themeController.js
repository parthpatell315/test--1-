const { prisma } = require("../lib/prisma");

const defaultTheme = {
  // Typography
  fontFamily: "Montserrat",
  headingFont: "Montserrat",
  bodyFont: "Montserrat",
  fontSizeBase: "16",
  fontSizeHeading: "32",
  fontSizeH2: "28",
  fontSizeH3: "20",
  fontSizeH4: "16",
  navbarFontSize: "15",
  fontWeightNormal: "400",
  fontWeightBold: "700",
  letterSpacing: "normal",
  lineHeight: "1.5",
  textTransform: "none",
  buttonFontSize: "12",
  fontWeightHeading: "600",
  headingLetterSpacing: "-0.02em",
  headingTextTransform: "capitalize",
  bodyLetterSpacing: "normal",
  bodyLineHeight: "1.6",

  // Colors
  primaryColor: "#0B1F4D",
  secondaryColor: "#FF6B00",
  accentColor: "#FF6B00",
  backgroundColor: "#F8F7F4",
  textColor: "#111111",
  borderColor: "#D9D9D9",
  borderWidth: "1",
  gradientOverlay: "none",
  shadowIntensity: "medium",

  // Buttons
  buttonColor: "#FF6B00",
  buttonHoverColor: "#E05E00",
  buttonTextColor: "#FFFFFF",
  buttonRadius: "12",
  buttonPaddingX: "24",
  buttonPaddingY: "12",
  buttonBorderStyle: "none",
  buttonBorderColor: "#FF6B00",
  buttonBorderWidth: "2",
  buttonHoverAnimation: "darken",
  buttonShadow: "none",
  buttonTextTransform: "uppercase",
  buttonLetterSpacing: "0.05em",
  buttonSecondaryBg: "#0B1F4D",
  buttonSecondaryText: "#FFFFFF",
  buttonSecondaryHover: "#1a3a6b",

  // Cards
  cardBgColor: "#FFFFFF",
  cardRadius: "24",
  cardShadow: "0 10px 40px rgba(0,0,0,0.03)",
  cardHeight: "550",
  cardWidth: "400",
  cardOverlayDarkness: "50",
  cardImageBrightness: "100",
  cardTitleSize: "20",
  cardPriceColor: "#FF6B00",
  cardBadgeBg: "#FFFFFF",
  cardBadgeText: "#111111",
  cardHoverAnimation: "scale",
  cardButtonStyle: "circle",

  // Layout & Spacing
  spacingUnit: "4",
  containerWidth: "1280",
  darkMode: false,

  // Hero Section
  heroTitle: "One Trip At a Time",
  heroAnimatedTexts: [
    "Find Freedom",
    "Collect Stories",
    "Meet Strangers",
    "Feel Alive",
    "Escape Routines",
    "Explore Deeply",
  ],
  heroVideoUrl: "",
  heroBgImage: "",
  heroOverlayDarkness: "60",
  heroHeight: "100",
  heroAlign: "center",
  heroCtaText: "",
  heroCtaLink: "",
  heroCtaStyle: "filled",
  mobileHeroHeight: "70",
  mobileHeroVideoHeight: "aspect-video",

  // Navbar
  navbarHeight: "80",
  navbarSticky: true,
  navbarTransparent: false,
  navbarLogoSize: "150",
  navbarSpacing: "24",
  navbarBlur: true,
  navbarActiveColor: "#FF6B00",
  navbarHoverColor: "#FF6B00",
  mobileNavStyle: "drawer",
  mobileNavbarHeight: "64",

  // Section Management
  sectionOrder: [
    "hero",
    "social_proof",
    "community_trips",
    "cta_banner",
    "destinations",
    "bestie",
    "cta_slider",
    "blogs",
    "reviews",
    "vibe",
  ],
  sectionVisibility: {
    hero: true,
    social_proof: true,
    community_trips: true,
    cta_banner: true,
    destinations: true,
    bestie: true,
    cta_slider: true,
    blogs: true,
    reviews: true,
    vibe: true,
  },
  sectionSpacing: "80",
  sectionBgAlternate: true,

  // Mobile Overrides
  mobileFontSizeBase: "14",
  mobileFontSizeHeading: "28",
  mobileSpacingUnit: "3",
  mobileCardLayout: "scroll",

  // Animations
  transitionSpeed: "300",
  transitionEasing: "ease-in-out",
  animateOnScroll: true,

  // VacationLabs Style Presets
  buttonStylePreset: "fill-rounded",
  sectionHeadingStyle: "default",
  tourCardStyle: "modular",
  collectionCardStyle: "default",
  headerStylePreset: "default",
  supportPhone: "",
  supportEmail: "contact@trrabb.com",
  supportText: "We are available 10AM to 07PM",
  navbarLinks: [
    { title: "Home", link: "/" },
    { title: "Upcoming Trips", link: "/trips" },
    { title: "Contact Us", link: "/contact" },
    { title: "About Us", link: "/about" },
  ],
};

let cachedThemeConfig = null;
let cachedThemeExpiresAt = 0;

const getCachedTheme = async () => {
  const now = Date.now();
  if (cachedThemeConfig && now < cachedThemeExpiresAt) {
    return cachedThemeConfig;
  }
  const theme = await prisma.theme.findUnique({
    where: { name: "primary" },
    select: { config: true },
  });
  const config = { ...defaultTheme, ...(theme?.config || {}) };
  cachedThemeConfig = config;
  cachedThemeExpiresAt = now + 60000; // Cache for 60 seconds in memory
  return config;
};

const getTheme = async (req, res) => {
  try {
    const config = await getCachedTheme();
    return res.json(config);
  } catch (error) {
    console.error(
      "Error fetching theme, returning default fallback:",
      error.message,
    );
    return res.json(defaultTheme);
  }
};

// Read-only public variant: never creates or updates a theme record on GET.
const getPublicTheme = async (req, res) => {
  try {
    const config = await getCachedTheme();
    res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
    return res.json(config);
  } catch (error) {
    console.error(
      "Error fetching public theme, returning default fallback:",
      error.message,
    );
    return res.json(defaultTheme);
  }
};

const updateTheme = async (req, res) => {
  try {
    const config = req.body;
    cachedThemeConfig = null; // Invalidate cache immediately
    cachedThemeExpiresAt = 0;

    const theme = await prisma.theme.upsert({
      where: { name: "primary" },
      update: { config },
      create: {
        name: "primary",
        config,
      },
    });

    res.json(theme.config);
  } catch (error) {
    console.error("Error updating theme:", error);
    res.status(500).json({ message: "Error updating theme" });
  }
};

const resetTheme = async (req, res) => {
  try {
    cachedThemeConfig = null;
    cachedThemeExpiresAt = 0;
    const theme = await prisma.theme.update({
      where: { name: "primary" },
      data: { config: defaultTheme },
    });

    res.json(theme.config);
  } catch (error) {
    console.error("Error resetting theme:", error);
    res.status(500).json({ message: "Error resetting theme" });
  }
};

const getPresets = async (req, res) => {
  try {
    const presets = await prisma.theme.findMany({
      where: { NOT: { name: "primary" } },
      select: { name: true, config: true, createdAt: true, updatedAt: true },
    });
    res.json({ success: true, data: presets });
  } catch (error) {
    console.error("Error fetching presets:", error);
    res.status(500).json({ success: false, message: "Error fetching presets" });
  }
};

const savePreset = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name === "primary") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid preset name" });
    }

    const currentTheme = await prisma.theme.findUnique({
      where: { name: "primary" },
    });
    if (!currentTheme) {
      return res
        .status(404)
        .json({ success: false, message: "No active theme found" });
    }

    const preset = await prisma.theme.upsert({
      where: { name },
      update: { config: currentTheme.config },
      create: { name, config: currentTheme.config },
    });

    res.json({ success: true, data: preset });
  } catch (error) {
    console.error("Error saving preset:", error);
    res.status(500).json({ success: false, message: "Error saving preset" });
  }
};

const deletePreset = async (req, res) => {
  try {
    const { name } = req.params;
    if (name === "primary") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete primary theme" });
    }
    await prisma.theme.deleteMany({ where: { name } });
    res.json({ success: true, message: "Preset deleted" });
  } catch (error) {
    console.error("Error deleting preset:", error);
    res.status(500).json({ success: false, message: "Error deleting preset" });
  }
};

const applyPreset = async (req, res) => {
  try {
    const { name } = req.params;
    const preset = await prisma.theme.findUnique({ where: { name } });
    if (!preset) {
      return res
        .status(404)
        .json({ success: false, message: "Preset not found" });
    }

    const merged = { ...defaultTheme, ...preset.config };
    cachedThemeConfig = null;
    cachedThemeExpiresAt = 0;
    await prisma.theme.upsert({
      where: { name: "primary" },
      update: { config: merged },
      create: { name: "primary", config: merged },
    });

    res.json(merged);
  } catch (error) {
    console.error("Error applying preset:", error);
    res.status(500).json({ success: false, message: "Error applying preset" });
  }
};

module.exports = {
  getTheme,
  getPublicTheme,
  updateTheme,
  resetTheme,
  getPresets,
  savePreset,
  deletePreset,
  applyPreset,
};
