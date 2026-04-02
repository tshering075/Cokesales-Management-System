import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider, darken, getLuminance, lighten } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const STORAGE_KEY = "coke_theme_preset";

/** Older builds used `sand`; same family as Sunset Ember. */
const LEGACY_PRESET_ID_MAP = { sand: "sunset" };

/**
 * Curated triplets: primary (app bar / key actions), secondary (drawer / warm accent),
 * tertiary (subheaders, row tints — complements the first two).
 */
export const THEME_PRESETS = [
  {
    id: "classic",
    label: "Classic Heritage",
    primary: "#c62828",
    secondary: "#f9a825",
    tertiary: "#1565c0",
    mode: "light",
  },
  {
    id: "ocean",
    label: "Ocean Teal",
    primary: "#006978",
    secondary: "#26c6da",
    tertiary: "#004d40",
    mode: "light",
  },
  {
    id: "forest",
    label: "Forest & Earth",
    primary: "#2e7d32",
    secondary: "#9ccc65",
    tertiary: "#5d4037",
    mode: "light",
  },
  {
    id: "sunset",
    label: "Sunset Ember",
    primary: "#d84315",
    secondary: "#ff8f00",
    tertiary: "#6a1b9a",
    mode: "light",
  },
  {
    id: "berry",
    label: "Berry Bloom",
    primary: "#7b1fa2",
    secondary: "#f06292",
    tertiary: "#b39ddb",
    mode: "light",
  },
  {
    id: "slate",
    label: "Slate Pro",
    primary: "#37474f",
    secondary: "#78909c",
    tertiary: "#00838f",
    mode: "light",
  },
  {
    id: "midnight",
    label: "Midnight",
    primary: "#ef5350",
    secondary: "#ffca28",
    tertiary: "#26c6da",
    mode: "dark",
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
