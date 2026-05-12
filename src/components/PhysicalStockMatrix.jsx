import React, { useMemo, useCallback } from "react";
import {
  Typography,
  Paper,
  Box,
  Stack,
  Divider,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  createEmptyFifoLot,
  getLotsFromProductRow,
} from "../utils/physicalStockTemplate";

function applyOpeningSecondaryClosing(field, draft) {
  const toNumOrNull = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const toSafe = (n) => (n == null ? "" : Math.max(0, Math.round(n)));
  const opening = toNumOrNull(draft.openingStockQty);
  const secondary = toNumOrNull(draft.secondarySale);
  const closing = toNumOrNull(draft.closingStockQty);

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
}

export default function PhysicalStockMatrix({
  rows,
  readOnly,
  onRowsChange,
  variant = "default",
  maxHeight,
  boldDataValues = false,
}) {
  const theme = useTheme();
  const isFs = variant === "fullscreen";
  const bodyMaxHeight = maxHeight ?? (isFs ? "min(70vh, calc(100dvh - 320px))" : "65vh");

  const getSkuAccent = useCallback(
    (skuName) => {
      const s = String(skuName || "").trim().toUpperCase();
      if (s.startsWith("KO")) return "#E40521";
      if (s.startsWith("FX")) return "#FF7A00";
      if (s.startsWith("SP")) return "#00A651";
      if (s.startsWith("CH")) return "#8B1A1A";
      if (s.startsWith("KWAT")) return "#0B63CE";
      return theme.palette.primary.main;
    },
    [theme.palette.primary.main]
  );

  const totals = useMemo(() => {
    return (rows || []).reduce(
      (acc, row) => {
        for (const lot of getLotsFromProductRow(row)) {
          acc.opening += Number(lot?.openingStockQty) || 0;
          acc.secondary += Number(lot?.secondarySale) || 0;
          acc.closing += Number(lot?.closingStockQty) || 0;
        }
        return acc;
      },
      { opening: 0, secondary: 0, closing: 0 }
    );
  }, [rows]);

  const updateLotField = useCallback(
    (rowIndex, lotIndex, field, value) => {
      if (!onRowsChange) return;
      const next = (rows || []).map((row, ri) => {
        if (ri !== rowIndex) return row;
        const lots = getLotsFromProductRow(row).map((l) => ({ ...l }));
        const draft = { ...lots[lotIndex] };

        if (field === "mfgDate" || field === "bbdDate") {
          draft[field] = typeof value === "string" ? value.slice(0, 10) : "";
        } else if (field === "batchNo") {
          draft.batchNo = value;
        } else if (field === "openingStockQty" || field === "secondarySale" || field === "closingStockQty") {
          const typedValue = value === "" ? "" : Math.max(0, Number(value) || 0);
          draft[field] = typedValue;
          applyOpeningSecondaryClosing(field, draft);
        }

        lots[lotIndex] = draft;
        return { ...row, productSku: row.productSku, lots };
      });
      onRowsChange(next);
    },
    [rows, onRowsChange]
  );

  const addLot = useCallback(
    (rowIndex) => {
      if (!onRowsChange) return;
      const next = (rows || []).map((row, ri) => {
        if (ri !== rowIndex) return row;
        const lots = [...getLotsFromProductRow(row), createEmptyFifoLot()];
        return { ...row, lots };
      });
      onRowsChange(next);
    },
    [rows, onRowsChange]
  );

  const removeLot = useCallback(
    (rowIndex, lotIndex) => {
      if (!onRowsChange) return;
      const next = (rows || []).map((row, ri) => {
        if (ri !== rowIndex) return row;
        const lots = getLotsFromProductRow(row);
        if (lots.length <= 1) return row;
        const filtered = lots.filter((_, i) => i !== lotIndex);
        return { ...row, lots: filtered };
      });
      onRowsChange(next);
    },
    [rows, onRowsChange]
  );

  const qtyCell = (rowIndex, lotIndex, field, aria, lot) => {
    const v = lot?.[field];
    const display = v === "" || v == null ? "—" : Number(v) || 0;
    if (readOnly) {
      return (
        <Typography sx={{ fontWeight: boldDataValues ? 800 : 600, fontVariantNumeric: "tabular-nums", py: 0.5 }}>
          {display}
        </Typography>
      );
    }
    return (
      <TextField
        size="small"
        type="number"
        inputProps={{ min: 0, step: 1, "aria-label": aria }}
        value={v === "" || v == null ? "" : Number(v) || 0}
        onChange={(e) => updateLotField(rowIndex, lotIndex, field, e.target.value)}
        sx={{
          minWidth: 88,
          "& input": { textAlign: "right", fontWeight: boldDataValues ? 700 : 600 },
        }}
      />
    );
  };

  const dateCell = (rowIndex, lotIndex, field, aria, lot) => {
    const v = lot?.[field] || "";
    if (readOnly) {
      return (
        <Typography variant="body2" sx={{ py: 0.75, fontWeight: 600 }}>
          {v || "—"}
        </Typography>
      );
    }
    return (
      <TextField
        size="small"
        type="date"
        InputLabelProps={{ shrink: true }}
        inputProps={{ "aria-label": aria }}
        value={v}
        onChange={(e) => updateLotField(rowIndex, lotIndex, field, e.target.value)}
        sx={{ minWidth: 132 }}
      />
    );
  };

  const batchCell = (rowIndex, lotIndex, lot) => {
    const v = lot?.batchNo ?? "";
    if (readOnly) {
      return (
        <Typography variant="body2" sx={{ py: 0.75, fontWeight: 600 }}>
          {v || "—"}
        </Typography>
      );
    }
    return (
      <TextField
        size="small"
        inputProps={{ "aria-label": "Batch number" }}
        value={v}
        onChange={(e) => updateLotField(rowIndex, lotIndex, "batchNo", e.target.value)}
        sx={{ minWidth: 100 }}
      />
    );
  };

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
          FIFO lots: add one row per batch (MFG / batch / BBD). Per lot: Opening − Secondary = Closing (same as before).
        </Typography>
      </Box>
      <Stack spacing={1.25}>
        {(rows || []).map((row, rowIndex) => {
          const accent = getSkuAccent(row.productSku);
          const lots = getLotsFromProductRow(row);
          const sub = lots.reduce(
            (a, l) => ({
              opening: a.opening + (Number(l.openingStockQty) || 0),
              secondary: a.secondary + (Number(l.secondarySale) || 0),
              closing: a.closing + (Number(l.closingStockQty) || 0),
            }),
            { opening: 0, secondary: 0, closing: 0 }
          );
          return (
            <Paper
              key={row.productSku || rowIndex}
              variant="outlined"
              sx={{
                p: { xs: 0.75, sm: 1 },
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
                  mb: 0.75,
                  letterSpacing: 0.1,
                  color: accent,
                }}
              >
                {row.productSku}
              </Typography>

              <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 48 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>MFG date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Batch no.</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>BBD date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">
                        Opening
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">
                        Secondary
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">
                        Closing
                      </TableCell>
                      {!readOnly ? <TableCell align="right" sx={{ width: 56 }} /> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lots.map((lot, lotIndex) => (
                      <TableRow key={lot.lotId || `${rowIndex}-${lotIndex}`}>
                        <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>{lotIndex + 1}</TableCell>
                        <TableCell>{dateCell(rowIndex, lotIndex, "mfgDate", "Manufacturing date", lot)}</TableCell>
                        <TableCell>{batchCell(rowIndex, lotIndex, lot)}</TableCell>
                        <TableCell>{dateCell(rowIndex, lotIndex, "bbdDate", "Best before date", lot)}</TableCell>
                        <TableCell align="right">{qtyCell(rowIndex, lotIndex, "openingStockQty", "Opening stock", lot)}</TableCell>
                        <TableCell align="right">{qtyCell(rowIndex, lotIndex, "secondarySale", "Secondary sale", lot)}</TableCell>
                        <TableCell align="right">{qtyCell(rowIndex, lotIndex, "closingStockQty", "Closing stock", lot)}</TableCell>
                        {!readOnly ? (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              aria-label="Remove lot"
                              disabled={lots.length <= 1}
                              onClick={() => removeLot(rowIndex, lotIndex)}
                              color="error"
                            >
                              <RemoveCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Box
                sx={{
                  mt: 0.75,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  SKU subtotal (all lots): O {sub.opening} · S {sub.secondary} · C {sub.closing}
                </Typography>
                {!readOnly ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => addLot(rowIndex)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Add FIFO lot
                  </Button>
                ) : null}
              </Box>
            </Paper>
          );
        })}
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
        <Typography sx={{ fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>TOTAL PC (all SKUs, all lots)</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.opening}</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.secondary}</Typography>
        <Typography sx={{ textAlign: "right", fontWeight: 900, fontSize: "0.74rem", lineHeight: 1.15 }}>{totals.closing}</Typography>
      </Box>
    </Paper>
  );
}
