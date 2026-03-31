import React from "react";
import { IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useColorMode } from "../theme/AppThemeProvider";

/**
 * Switches between light and dark MUI theme (preference stored in localStorage).
 */
export default function ThemeModeToggle({ size = "medium", sx: sxProp }) {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = mode === "dark";

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip title={label}>
      <IconButton
        color="inherit"
        onClick={toggleColorMode}
        aria-label={label}
        size={isMobile ? "small" : size}
        sx={[{ color: "inherit" }, ...(sxProp ? [sxProp] : [])]}
      >
        {isDark ? <LightModeIcon fontSize={isMobile ? "small" : "medium"} /> : <DarkModeIcon fontSize={isMobile ? "small" : "medium"} />}
      </IconButton>
    </Tooltip>
  );
}
