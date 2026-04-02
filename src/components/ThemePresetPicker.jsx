import React, { useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import CheckIcon from "@mui/icons-material/Check";
import { useAppThemePreset } from "../theme/AppThemeProvider";
import { themePresetRgbGradient } from "../theme/themePresetRgbGradient";

/**
 * Menu to pick a saved app color theme (persisted in localStorage).
 */
export default function ThemePresetPicker({ sx: sxProp }) {
  const { presetId, setPresetId, presets } = useAppThemePreset();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Themes inspired by global cola & soft-drink varieties">
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Choose beverage-inspired color theme"
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          size="medium"
          sx={sxProp}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 220, maxWidth: 320 } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 1, pb: 0.5 }}>
          RGB-smoothed gradients · primary → secondary → tertiary
        </Typography>
        {presets.map((p) => (
          <MenuItem
            key={p.id}
            selected={p.id === presetId}
            onClick={() => {
              setPresetId(p.id);
              setAnchorEl(null);
            }}
            dense
          >
            <ListItemIcon sx={{ minWidth: 48 }}>
              <Box
                sx={{
                  width: 32,
                  height: 24,
                  borderRadius: 1,
                  background: themePresetRgbGradient(p.primary, p.secondary, p.tertiary),
                  border: 1,
                  borderColor: "divider",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
                aria-hidden
              />
            </ListItemIcon>
            <ListItemText
              primary={p.label}
              secondary={[p.subtitle, p.mode === "dark" ? "Dark UI" : "Light UI"].filter(Boolean).join(" · ")}
            />
            {p.id === presetId ? <CheckIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
