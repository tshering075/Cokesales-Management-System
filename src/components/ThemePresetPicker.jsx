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

/**
 * Menu to pick a saved app color theme (persisted in localStorage).
 */
export default function ThemePresetPicker({ sx: sxProp }) {
  const { presetId, setPresetId, presets } = useAppThemePreset();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="App color theme">
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Choose app color theme"
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
          Color theme
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
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: 1,
                  background: `linear-gradient(135deg, ${p.primary} 52%, ${p.secondary} 52%)`,
                  border: 1,
                  borderColor: "divider",
                }}
                aria-hidden
              />
            </ListItemIcon>
            <ListItemText primary={p.label} secondary={p.mode === "dark" ? "Dark" : "Light"} />
            {p.id === presetId ? <CheckIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
