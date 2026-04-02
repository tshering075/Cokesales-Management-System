import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const STORAGE_KEY = "coke_theme_preset";

/** Presets: primary drives app bars / actions; secondary accents (e.g. drawer). */
export const THEME_PRESETS = [
  { id: "classic", label: "Classic Coke", primary: "#e53935", secondary: "#fbc02d", mode: "light" },
  { id: "ocean", label: "Ocean", primary: "#006978", secondary: "#4fc3f7", mode: "light" },
  { id: "forest", label: "Forest", primary: "#2e7d32", secondary: "#aed581", mode: "light" },
  { id: "sand", label: "Sand & ember", primary: "#bf360c", secondary: "#ffa000", mode: "light" },
  { id: "berry", label: "Berry", primary: "#6a1b9a", secondary: "#ec407a", mode: "light" },
  { id: "midnight", label: "Midnight", primary: "#ef5350", secondary: "#ffca28", mode: "dark" },
];

function createAppTheme(presetId) {
  const preset = THEME_PRESETS.find((p) => p.id === presetId) || THEME_PRESETS[0];
  const isDark = preset.mode === "dark";

  return createTheme({
    palette: {
      mode: preset.mode,
      primary: { main: preset.primary },
      secondary: { main: preset.secondary },
      error: { main: isDark ? "#ff5252" : "#d32f2f" },
      ...(isDark
        ? {
            background: { default: "#121212", paper: "#1e1e1e" },
            divider: "rgba(255, 255, 255, 0.12)",
          }
        : {
            background: { default: "#f5f5f5", paper: "#ffffff" },
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
      if (stored && THEME_PRESETS.some((p) => p.id === stored)) return stored;
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
