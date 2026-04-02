import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const STORAGE_KEY = "coke_day_night_view";
const LEGACY_PRESET_KEY = "coke_theme_preset";

/** `night` = light theme (current look). `day` = dark theme (high-contrast). */
const VALID_VIEWS = new Set(["day", "night"]);

function createNightTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: { main: "#e53935" },
      secondary: { main: "#fbc02d" },
      background: { default: "#f5f5f5", paper: "#ffffff" },
      error: { main: "#d32f2f" },
      info: { main: "#0288d1" },
      warning: { main: "#ed6c02" },
      success: { main: "#2e7d32" },
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

function createDayTheme() {
  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#ff6b6b" },
      secondary: { main: "#ffd54f" },
      background: { default: "#121212", paper: "#1e1e1e" },
      error: { main: "#ff8a80" },
      info: { main: "#4fc3f7" },
      warning: { main: "#ffb74d" },
      success: { main: "#81c784" },
      divider: "rgba(255, 255, 255, 0.12)",
      text: {
        primary: "rgba(255, 255, 255, 0.95)",
        secondary: "rgba(255, 255, 255, 0.68)",
        disabled: "rgba(255, 255, 255, 0.38)",
      },
      action: {
        active: "rgba(255, 255, 255, 0.56)",
        hover: "rgba(255, 255, 255, 0.08)",
        selected: "rgba(255, 255, 255, 0.16)",
        disabled: "rgba(255, 255, 255, 0.3)",
        disabledBackground: "rgba(255, 255, 255, 0.12)",
      },
    },
    typography: {
      fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    },
    shape: { borderRadius: 8 },
    components: {
      MuiAppBar: {
        defaultProps: { color: "primary", enableColorOnDark: true },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          outlined: {
            borderColor: "rgba(255, 255, 255, 0.24)",
          },
        },
      },
    },
  });
}

const AppThemeContext = createContext(null);

export function useDayNightTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useDayNightTheme must be used within AppThemeProvider");
  }
  return ctx;
}

export function AppThemeProvider({ children }) {
  const [view, setViewState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_VIEWS.has(stored)) return stored;
      const legacy = localStorage.getItem(LEGACY_PRESET_KEY);
      if (legacy && ["midnight", "zero", "slate"].includes(legacy)) return "day";
    } catch {
      /* ignore */
    }
    return "night";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const setView = useCallback((next) => {
    if (VALID_VIEWS.has(next)) setViewState(next);
  }, []);

  const toggleView = useCallback(() => {
    setViewState((v) => (v === "day" ? "night" : "day"));
  }, []);

  const theme = useMemo(() => (view === "day" ? createDayTheme() : createNightTheme()), [view]);

  const value = useMemo(
    () => ({
      view,
      setView,
      toggleView,
      /** True when dark UI (Day view) is active */
      isDayView: view === "day",
    }),
    [view, setView, toggleView]
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
