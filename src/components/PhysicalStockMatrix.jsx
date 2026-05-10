import React, { useMemo, useCallback } from "react";
import {
  Typography,
  Paper,
  Alert,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function PhysicalStockMatrix({ rows, readOnly, onRowsChange, variant = "default", maxHeight, boldDataValues = false }) {
  const theme = useTheme();
  const isFs = variant === "fullscreen";
  const bodyMaxHeight = maxHeight ?? (isFs ? "min(70vh, calc(100dvh - 320px))" : "65vh");
  const getSkuAccent = useCallback(
    (skuName) => {
      const s = String(skuName || "").trim().toUpperCase();
      if (s.startsWith("KO")) return "#E40521"; // Coke red
      if (s.startsWith("FX")) return "#FF7A00"; // Fanta orange
      if (s.startsWith("SP")) return "#00A651"; // Sprite green
      if (s.startsWith("CH")) return "#8B1A1A"; // Charged deep blood red
      if (s.startsWith("KWAT")) return "#0B63CE"; // Kinley water blue
      return theme.palette.primary.main;
    },
    [theme.palette.primary.main]
  );

  const totals = useMemo(() => {
    return (rows || []).reduce(
      (acc, row) => {
        acc.opening += Number(row?.openingStockQty) || 0;
        acc.secondary += Number(row?.secondarySale) || 0;
        acc.closing += Number(row?.closingStockQty) || 0;
        return acc;
      },
      { opening: 0, secondary: 0, closing: 0 }
    );
  }, [rows]);

  const onFieldChange = useCallback(
    (rowIndex, field, value) => {
      if (!onRowsChange) return;
      const toNumOrNull = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const toSafe = (n) => (n == null ? "" : Math.max(0, Math.round(n)));
      const typedValue = value === "" ? "" : Math.max(0, Number(value) || 0);

      const next = (rows || []).map((r, i) => {
        if (i !== rowIndex) return r;
        const draft = { ...r, [field]: typedValue };

        const opening = toNumOrNull(draft.openingStockQty);
        const secondary = toNumOrNull(draft.secondarySale);
        const closing = toNumOrNull(draft.closingStockQty);

        // Primary formulas (opening is manual-only):
        // closing = opening - secondary
        // secondary = opening - closing
        if (field === "secondarySale") {
          if (opening != null && secondary != null) {
            draft.closingStockQty = toSafe(opening - secondary);
          }
        } else if (field === "closingStockQty") {
          if (opening != null && closing != null) {
            draft.secondarySale = toSafe(opening - closing);
          }
        }

        return draft;
      });
      onRowsChange(next);
    },
    [rows, onRowsChange]
  );

  return (
    <Paper variant="outlined" sx={{ maxHeight: bodyMaxHeight, overflow: "auto", p: { xs: 1, sm: 1.25 } }}>
      <Box
        sx={{
          mb: 1,
          px: 0.75,
          py: 0.6,
          borderRadius: 1.25,
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.24),
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
          Formula: Opening Stock - Secondary Sale = Closing Stock
        </Typography>
      </Box>
      <Stack spacing={1}>
        {(rows || []).map((row, rowIndex) => (
          (() => {
            const accent = getSkuAccent(row.productSku);
            return (
          <Paper
            key={row.productSku || rowIndex}
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: 1.5,
              borderColor: "divider",
              bgcolor: "background.paper",
              borderLeft: "4px solid",
              borderLeftColor: accent,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: isFs ? "0.86rem" : "0.8rem",
                mb: 0.8,
                letterSpacing: 0.1,
                color: accent,
              }}
            >
              {row.productSku}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(120px, 1fr))" },
                gap: 0.8,
              }}
            >
              {[
                ["openingStockQty", "Opening Stock Qty"],
                ["secondarySale", "Secondary Sale"],
                ["closingStockQty", "Closing Stock Qty"],
              ].map(([field, label]) => (
                <Box key={field}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {label}
                  </Typography>
                  {readOnly ? (
                    <Typography sx={{ mt: 0.3, fontWeight: boldDataValues ? 800 : 700, fontVariantNumeric: "tabular-nums" }}>
                      {row?.[field] === "" || row?.[field] == null ? "—" : Number(row?.[field]) || 0}
                    </Typography>
                  ) : (
                    <Box
                      component="input"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={row?.[field] === "" || row?.[field] == null ? "" : Number(row?.[field]) || 0}
                      onChange={(e) => onFieldChange(rowIndex, field, e.target.value)}
                      sx={{
                        mt: 0.35,
                        width: "100%",
                        boxSizing: "border-box",
                        py: 0.45,
                        px: 0.7,
                        textAlign: "right",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                        color: "text.primary",
                        fontFamily: "inherit",
                        fontSize: "0.76rem",
                        transition: "all 0.15s ease",
                        "&:focus": {
                          outline: "none",
                          borderColor: theme.palette.primary.main,
                          boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.18)}`,
                        },
                        ...(boldDataValues ? { fontWeight: 700 } : {}),
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
            );
          })()
        ))}
      </Stack>
      <Divider sx={{ my: 1.25 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(110px, 1fr))" },
          gap: 0.45,
          alignItems: "center",
          p: 0.5,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.14),
          border: "1px solid",
          borderColor: alpha(theme.palette.warning.dark, 0.22),
          boxShadow: "none",
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>TOTAL PC</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.opening}</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.secondary}</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.closing}</Typography>
      </Box>
    </Paper>
  );
}

export function PhysicalStockFifoNote() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Alert
      icon={<InfoOutlinedIcon fontSize="inherit" />}
      severity="info"
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        alignItems: "flex-start",
        bgcolor: alpha(theme.palette.info.main, isDark ? 0.16 : 0.06),
        borderColor: alpha(theme.palette.info.main, isDark ? 0.5 : 0.35),
        color: "text.primary",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Physical stock format
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        Fill opening stock, secondary sale, and closing stock for each SKU. The <strong>TOTAL PC</strong> row is auto-calculated.
      </Typography>
    </Alert>
  );
}
