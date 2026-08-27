import api from "./api";

export interface ThemeConfig {
  // Typography
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  fontSizeBase: string;
  fontSizeHeading: string;
  fontSizeH2: string;
  fontSizeH3: string;
  fontSizeH4: string;
  navbarFontSize: string;
  fontWeightNormal: string;
  fontWeightBold: string;
  letterSpacing: string;
  lineHeight: string;
  textTransform: string;
  buttonFontSize: string;
  fontWeightHeading: string;
  headingLetterSpacing: string;
  headingTextTransform: string;
  bodyLetterSpacing: string;
  bodyLineHeight: string;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: string;
  gradientOverlay: string;
  shadowIntensity: string;

  // Buttons
  buttonColor: string;
  buttonHoverColor: string;
  buttonTextColor: string;
  buttonRadius: string;
  buttonPaddingX: string;
  buttonPaddingY: string;
  buttonBorderStyle: string;
  buttonBorderColor: string;
  buttonBorderWidth: string;
  buttonHoverAnimation: string;
  buttonShadow: string;
  buttonTextTransform: string;
  buttonLetterSpacing: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryHover: string;

  // Cards
  cardBgColor: string;
  cardRadius: string;
  cardShadow: string;
  cardHeight: string;
  cardWidth: string;
  cardOverlayDarkness: string;
  cardImageBrightness: string;
  cardTitleSize: string;
  cardPriceColor: string;
  cardBadgeBg: string;
  cardBadgeText: string;
  cardHoverAnimation: string;
  cardButtonStyle: string;

  // Layout
  spacingUnit: string;
  containerWidth: string;
  darkMode: boolean;

  // Hero
  heroTitle: string;
  heroAnimatedTexts: string[];
  heroVideoUrl: string;
  heroBgImage: string;
  heroOverlayDarkness: string;
  heroHeight: string;
  heroAlign: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroCtaStyle: string;
  mobileHeroHeight: string;
  mobileHeroVideoHeight: string;

  // Navbar
  navbarHeight: string;
  navbarSticky: boolean;
  navbarTransparent: boolean;
  navbarLogoSize: string;
  navbarSpacing: string;
  navbarBlur: boolean;
  navbarActiveColor: string;
  navbarHoverColor: string;
  mobileNavStyle: string;
  mobileNavbarHeight: string;

  // Section Management
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  sectionSpacing: string;
  sectionBgAlternate: boolean;

  // Mobile
  mobileFontSizeBase: string;
  mobileFontSizeHeading: string;
  mobileSpacingUnit: string;
  mobileCardLayout: string;

  // Animations
  transitionSpeed: string;
  transitionEasing: string;
  animateOnScroll: boolean;

  // VacationLabs Style Presets
  buttonStylePreset: string;
  sectionHeadingStyle: string;
  tourCardStyle: string;
  collectionCardStyle: string;
  headerStylePreset: string;
  supportPhone: string;
  supportEmail: string;
  supportText: string;
  navbarLinks: { title: string; link: string; openNewWindow?: boolean }[];
}

export interface ThemePreset {
  name: string;
  config: ThemeConfig;
  createdAt: string;
  updatedAt: string;
}

export const themeService = {
  get: async (): Promise<ThemeConfig> => {
    const response = await api.get("/theme");
    return response.data;
  },

  update: async (config: ThemeConfig): Promise<ThemeConfig> => {
    const response = await api.post("/theme", config);
    return response.data;
  },

  reset: async (): Promise<ThemeConfig> => {
    const response = await api.post("/theme/reset");
    return response.data;
  },

  // Presets
  getPresets: async (): Promise<ThemePreset[]> => {
    const response = await api.get("/theme/presets");
    return response.data.data || [];
  },

  savePreset: async (name: string): Promise<ThemePreset> => {
    const response = await api.post("/theme/presets", { name });
    return response.data.data;
  },

  deletePreset: async (name: string): Promise<void> => {
    await api.delete(`/theme/presets/${encodeURIComponent(name)}`);
  },

  applyPreset: async (name: string): Promise<ThemeConfig> => {
    const response = await api.post(
      `/theme/presets/${encodeURIComponent(name)}/apply`,
    );
    return response.data;
  },
};
