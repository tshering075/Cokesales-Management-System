import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const STORAGE_KEY = "coke_color_mode";

const ColorModeContext = createContext({
  mode: "light",
  toggleColorMode: () => {},
  setColorMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

function readStoredMode() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "dark" || s === "light") return s;
  } catch {
    /* ignore */
  }
  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    /* ignore */
  }
  return "light";
}

function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#c62828",
        dark: "#b71c1c",
        light: "#e53935",
      },
      secondary: {
        main: "#fbc02d",
        dark: "#f9a825",
      },
      ...(mode === "dark"
        ? {
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
          }
        : {
            background: {
              default: "#f5f5f5",
              paper: "#ffffff",
            },
          }),
    },
    typography: {
      fontFamily: "Roboto, Helvetica, Arial, sans-serif",
    },
    components: {
      MuiAppBar: {
        defaultProps: {
          color: "primary",
        },
        styleOverrides: {
          colorPrimary: {
            backgroundColor: "#c62828",
            backgroundImage: "none",
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => readStoredMode());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const toggleColorMode = useCallback(() => {
    setMode((m) => (m === "light" ? "dark" : "light"));
  }, []);

  const setColorMode = useCallback((m) => {
    if (m === "light" || m === "dark") setMode(m);
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo(
    () => ({ mode, toggleColorMode, setColorMode }),
    [mode, toggleColorMode, setColorMode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
