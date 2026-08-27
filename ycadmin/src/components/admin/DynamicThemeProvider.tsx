import React, { createContext, useContext, useEffect, useState } from "react";
import { themeService, ThemeConfig } from "@/services/theme.service";

const ThemeContext = createContext<{
  theme: Partial<ThemeConfig> | null;
  updateLocalTheme: (config: Partial<ThemeConfig>) => void;
  refreshTheme: () => Promise<void>;
}>({
  theme: null,
  updateLocalTheme: () => {},
  refreshTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

const defaultTheme: Partial<ThemeConfig> = {
  fontFamily: "Montserrat",
  headingFont: "Montserrat",
  bodyFont: "Montserrat",
  fontSizeBase: "16",
  fontSizeHeading: "32",
  fontWeightNormal: "400",
  fontWeightBold: "700",
  primaryColor: "#FF5B00",
  secondaryColor: "#1B2A4A",
  backgroundColor: "#FFFFFF",
  textColor: "#1F2937",
  buttonColor: "#FF5B00",
  buttonHoverColor: "#E65200",
  buttonTextColor: "#FFFFFF",
  buttonRadius: "12",
  cardBgColor: "#FFFFFF",
  cardRadius: "24",
  cardShadow: "0 10px 40px rgba(0,0,0,0.03)",
  borderColor: "#F1F5F9",
  borderWidth: "1",
  spacingUnit: "4",
  containerWidth: "1280",
  darkMode: false,
};

const hexToHslChannels = (value: string, fallback: string) => {
  const normalized = value.trim().replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;

  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue) hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
};

export const DynamicThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [theme, setTheme] = useState<Partial<ThemeConfig> | null>(null);

  const applyTheme = (config: Partial<ThemeConfig>) => {
    const root = document.documentElement;

    // Core Colors
    root.style.setProperty("--primary-hex", config.primaryColor);
    root.style.setProperty("--secondary-hex", config.secondaryColor);
    root.style.setProperty("--background-hex", config.backgroundColor);
    root.style.setProperty("--foreground-hex", config.textColor);

    // shadcn tokens are consumed as hsl(var(--token)); keep them as HSL channels.
    root.style.setProperty(
      "--primary",
      hexToHslChannels(config.primaryColor, "20 100% 50%"),
    );
    root.style.setProperty(
      "--secondary",
      hexToHslChannels(config.secondaryColor, "210 40% 96%"),
    );
    root.style.setProperty(
      "--background",
      hexToHslChannels(config.backgroundColor, "210 33% 98%"),
    );
    root.style.setProperty(
      "--foreground",
      hexToHslChannels(config.textColor, "222 47% 11%"),
    );

    // Buttons
    if (config.buttonStylePreset) {
      let radius = "12px";
      let bg = config.buttonColor || "#FF6B00";
      let text = config.buttonTextColor || "#FFFFFF";
      let border = "none";

      if (config.buttonStylePreset.includes("box")) radius = "0px";
      else if (config.buttonStylePreset.includes("curved")) radius = "8px";
      else if (config.buttonStylePreset.includes("rounded")) radius = "9999px";

      if (config.buttonStylePreset.includes("hollow")) {
        bg = "transparent";
        text = config.buttonColor || "#FF6B00";
        border = `2px solid ${config.buttonColor || "#FF6B00"}`;
      }

      root.style.setProperty("--radius-button", radius);
      root.style.setProperty("--button-bg", bg);
      root.style.setProperty("--button-text", text);
      root.style.setProperty("--button-border", border);
    } else {
      root.style.setProperty("--button-bg", config.buttonColor);
      root.style.setProperty("--button-hover", config.buttonHoverColor);
      root.style.setProperty("--button-text", config.buttonTextColor);
      root.style.setProperty("--radius-button", `${config.buttonRadius}px`);
    }

    if (config.sectionHeadingStyle)
      root.style.setProperty(
        "--section-heading-style",
        config.sectionHeadingStyle,
      );
    if (config.tourCardStyle)
      root.style.setProperty("--tour-card-style", config.tourCardStyle);
    if (config.collectionCardStyle)
      root.style.setProperty(
        "--collection-card-style",
        config.collectionCardStyle,
      );
    if (config.headerStylePreset)
      root.style.setProperty("--header-style-preset", config.headerStylePreset);

    // Cards
    root.style.setProperty(
      "--card",
      hexToHslChannels(config.cardBgColor, "0 0% 100%"),
    );
    root.style.setProperty("--radius-card", "8px");
    root.style.setProperty("--shadow-card", "0 1px 2px rgba(15, 23, 42, 0.04)");

    // Borders
    root.style.setProperty(
      "--border",
      hexToHslChannels(config.borderColor, "214 32% 91%"),
    );
    root.style.setProperty(
      "--input",
      hexToHslChannels(config.borderColor, "214 32% 91%"),
    );
    root.style.setProperty("--border-width", "1px");

    // Typography
    root.style.setProperty("--font-primary", "Montserrat");
    root.style.setProperty("--font-heading", "Montserrat");
    root.style.setProperty("--font-body", "Montserrat");
    root.style.setProperty("--text-base", `${config.fontSizeBase}px`);
    root.style.setProperty("--text-heading", `${config.fontSizeHeading}px`);

    // Layout
    root.style.setProperty("--container-width", `${config.containerWidth}px`);
    root.style.setProperty("--spacing-unit", `${config.spacingUnit}px`);

    // Force font family on body
    root.style.fontFamily = "'Montserrat', sans-serif";
  };

  const refreshTheme = async () => {
    try {
      const config = await themeService.get();
      setTheme(config);
      applyTheme(config);
    } catch (error) {
      console.error("Failed to load theme, using default:", error);
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    }
  };

  const updateLocalTheme = (config: Partial<ThemeConfig>) => {
    setTheme(config);
    applyTheme(config);
  };

  useEffect(() => {
    refreshTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, updateLocalTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
