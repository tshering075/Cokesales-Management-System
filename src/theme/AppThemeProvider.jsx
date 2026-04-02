import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider, darken, getLuminance, lighten } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const STORAGE_KEY = "coke_theme_preset";

/**
 * Maps old preset ids so saved localStorage choices still resolve after renames.
 */
const LEGACY_PRESET_ID_MAP = {
  sand: "gold",
  sunset: "fanta",
  ocean: "sprite",
  forest: "sprite",
  berry: "cherry",
  slate: "zero",
  midnight: "zero",
};

/**
 * Color triplets inspired by well-known Coca-Cola Company cola & soft-drink lines
 * sold worldwide (packaging-inspired palettes — not official brand assets).
 * primary → app bar; secondary → drawer; tertiary → table subheaders & tints.
 */
export const THEME_PRESETS = [
  {
    id: "classic",
    label: "Original Taste",
    subtitle: "Classic cola — red, gold, ribbon blue",
    primary: "#D7000F",
    secondary: "#FFC72C",
    tertiary: "#003087",
    mode: "light",
  },
  {
    id: "zero",
    label: "Zero Sugar",
    subtitle: "No-sugar cola — black can, red flash",
    primary: "#141414",
    secondary: "#F40009",
    tertiary: "#757575",
    mode: "dark",
  },
  {
    id: "cherry",
    label: "Cherry Cola",
    subtitle: "Cherry & berry cola accents",
    primary: "#B71C1C",
    secondary: "#6A1B3D",
    tertiary: "#EC407A",
    mode: "light",
  },
  {
    id: "vanilla",
    label: "Vanilla Cola",
    subtitle: "Cream, caramel & cola red",
    primary: "#E53935",
    secondary: "#FFE0B2",
    tertiary: "#6D4C41",
    mode: "light",
  },
  {
    id: "sprite",
    label: "Lemon-Lime",
    subtitle: "Crisp citrus green & lime",
    primary: "#009A44",
    secondary: "#D4E157",
    tertiary: "#1B5E20",
    mode: "light",
  },
  {
    id: "fanta",
    label: "Orange Citrus",
    subtitle: "Bright orange & playful purple",
    primary: "#FF5800",
    secondary: "#FFB300",
    tertiary: "#5E35B1",
    mode: "light",
  },
  {
    id: "gold",
    label: "Golden Kola",
    subtitle: "Gold citrus cola (e.g. Latin America)",
    primary: "#C49000",
    secondary: "#FFEB3B",
    tertiary: "#E65100",
    mode: "light",
  },
];

function augmentPaletteColor(main) {
  const lum = getLuminance(main);
  const contrastText = lum > 0.55 ? "rgba(0, 0, 0, 0.87)" : "#ffffff";
  return {
    main,
    light: lighten(main, 0.18),
    dark: darken(main, 0.15),
    contrastText,
  };
}

function createAppTheme(presetId) {
  const preset = THEME_PRESETS.find((p) => p.id === presetId) || THEME_PRESETS[0];
  const isDark = preset.mode === "dark";

  return createTheme({
    palette: {
      mode: preset.mode,
      primary: augmentPaletteColor(preset.primary),
      secondary: augmentPaletteColor(preset.secondary),
      tertiary: augmentPaletteColor(preset.tertiary),
      error: { main: isDark ? "#ff5252" : "#c62828" },
      ...(isDark
        ? {
            background: { default: "#0d1117", paper: "#161b22" },
            divider: "rgba(255, 255, 255, 0.12)",
          }
        : {
            background: { default: "#f5f6f8", paper: "#ffffff" },
          }),
    },
    typography: {
      fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    },
    shape: { borderRadius: 8 },
    components: {
      MuiAppBar: {
        defaultProps: { color: "primary", enableColorOnDark: true },
      },
    },
  });
}

const AppThemeContext = createContext(null);

export function useAppThemePreset() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppThemePreset must be used within AppThemeProvider");
  }
  return ctx;
}

export function AppThemeProvider({ children }) {
  const [presetId, setPresetIdState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const resolved = LEGACY_PRESET_ID_MAP[stored] || stored;
      if (resolved && THEME_PRESETS.some((p) => p.id === resolved)) return resolved;
    } catch {
      /* ignore */
    }
    return "classic";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, presetId);
    } catch {
      /* ignore */
    }
  }, [presetId]);

  const setPresetId = useCallback((id) => {
    if (THEME_PRESETS.some((p) => p.id === id)) setPresetIdState(id);
  }, []);

  const theme = useMemo(() => createAppTheme(presetId), [presetId]);

  const value = useMemo(
    () => ({ presetId, setPresetId, presets: THEME_PRESETS }),
    [presetId, setPresetId]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}
