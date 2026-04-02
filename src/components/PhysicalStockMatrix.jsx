import React, { useMemo, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Alert,
  Box,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { rowTotal } from "../utils/physicalStockTemplate";

const LotFields = memo(function LotFields({
  rowIndex,
  lotIndex,
  lot,
  readOnly,
  onLotChange,
  cellSx,
  qtyCellMin,
  dateCellMin,
  batchCellMin,
  inputSx,
  bandBg,
}) {
  const band = bandBg ? { bgcolor: bandBg } : {};
  if (readOnly) {
    return (
      <>
        <TableCell align="right" sx={{ ...cellSx, ...band, fontVariantNumeric: "tabular-nums", minWidth: qtyCellMin }}>
          {lot.qty ?? 0}
        </TableCell>
        <TableCell sx={{ ...cellSx, ...band, minWidth: dateCellMin }}>{lot.mfgDate || "—"}</TableCell>
        <TableCell sx={{ ...cellSx, ...band, minWidth: batchCellMin }}>{lot.batchNo || "—"}</TableCell>
        <TableCell sx={{ ...cellSx, ...band, minWidth: dateCellMin }}>{lot.bbdDate || "—"}</TableCell>
      </>
    );
  }

  const qtyVal = lot.qty === 0 || lot.qty === "" ? "" : lot.qty;
  const mfg = toDateInput(lot.mfgDate);
  const bbd = toDateInput(lot.bbdDate);

  const inputFull = {
    ...inputSx,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  };

  return (
    <>
      <TableCell sx={{ ...cellSx, ...band, minWidth: qtyCellMin, verticalAlign: "middle" }}>
        <Box
          component="input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={qtyVal}
          onChange={(e) =>
            onLotChange(rowIndex, lotIndex, "qty", e.target.value === "" ? 0 : Number(e.target.value))
          }
          sx={{ ...inputFull, fontVariantNumeric: "tabular-nums", textAlign: "right" }}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx, ...band, minWidth: dateCellMin, verticalAlign: "middle" }}>
        <Box
          component="input"
          type="date"
          value={mfg}
          onChange={(e) => onLotChange(rowIndex, lotIndex, "mfgDate", e.target.value)}
          sx={inputFull}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx, ...band, minWidth: batchCellMin, verticalAlign: "middle" }}>
        <Box
          component="input"
          type="text"
          value={lot.batchNo || ""}
          onChange={(e) => onLotChange(rowIndex, lotIndex, "batchNo", e.target.value)}
          placeholder="—"
          autoComplete="off"
          sx={{ ...inputFull, minWidth: 0 }}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx, ...band, minWidth: dateCellMin, verticalAlign: "middle" }}>
        <Box
          component="input"
          type="date"
          value={bbd}
          onChange={(e) => onLotChange(rowIndex, lotIndex, "bbdDate", e.target.value)}
          sx={inputFull}
        />
      </TableCell>
    </>
  );
});

/**
 * @param {Object} props
 * @param {'default'|'fullscreen'} [props.variant]
 * @param {string} [props.maxHeight] — CSS height for scroll area (overrides variant default)
 */
/** Fixed widths so SKU `left` matches category column when sticky (mobile horizontal scroll). */
const STICKY_CAT_PX = 118;
const STICKY_SKU_PX = 100;

const LOT_CARD_META = [
  { title: "Lot 1", hint: "Oldest — use first (FIFO)" },
  { title: "Lot 2", hint: "Next batch" },
  { title: "Lot 3", hint: "Newest batch" },
];

/** Readable card stack for phones / narrow tablets (replaces wide matrix). */
function PhysicalStockCardLayout({ rows, readOnly, onLotChange, inputSx, boldDataValues }) {
  const fieldLabelSx = { fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", mb: 0.35, display: "block" };
  const inputFull = useMemo(
    () => ({
      ...inputSx,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
    }),
    [inputSx]
  );

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {rows.map((row, rowIndex) => (
        <Paper
          key={`${row.category}-${row.sku}`}
          variant="outlined"
          elevation={0}
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
            borderColor: "divider",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              bgcolor: "warning.light",
              backgroundImage: "linear-gradient(135deg, rgba(255, 213, 79, 0.35) 0%, rgba(255, 241, 118, 0.5) 100%)",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
              <Chip label={row.category} size="small" sx={{ fontWeight: 800, bgcolor: "rgba(229, 57, 53, 0.12)", color: "error.dark" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: "0.02em" }}>
                {row.sku}
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Typography component="span" variant="caption" sx={{ opacity: 0.95, fontWeight: 600 }}>
                Total qty{" "}
              </Typography>
              <Typography component="span" variant="h6" sx={{ fontWeight: 900, ml: 0.5, fontVariantNumeric: "tabular-nums" }}>
                {rowTotal(row)}
              </Typography>
            </Box>
          </Box>

          <Stack spacing={0} divider={<Divider flexItem sx={{ borderColor: "divider" }} />}>
            {[0, 1, 2].map((lotIndex) => {
              const lot = row.lots[lotIndex] || { qty: 0, mfgDate: "", batchNo: "", bbdDate: "" };
              const meta = LOT_CARD_META[lotIndex];
              const mfg = toDateInput(lot.mfgDate);
              const bbd = toDateInput(lot.bbdDate);
              const qtyVal = lot.qty === 0 || lot.qty === "" ? "" : lot.qty;

              return (
                <Box
                  key={lotIndex}
                  sx={{
                    px: 2,
                    py: 1.75,
                    bgcolor: lotIndex === 0 ? "rgba(0, 131, 143, 0.06)" : lotIndex === 1 ? "rgba(0, 131, 143, 0.035)" : "rgba(0, 131, 143, 0.09)",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.dark", mb: 0.25 }}>
                    {meta.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
                    {meta.hint}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>
                        Quantity (cases)
                      </Typography>
                      {readOnly ? (
                        <Typography sx={{ fontWeight: boldDataValues ? 800 : 700, fontVariantNumeric: "tabular-nums" }}>{lot.qty ?? 0}</Typography>
                      ) : (
                        <Box
                          component="input"
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={qtyVal}
                          onChange={(e) =>
                            onLotChange(rowIndex, lotIndex, "qty", e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          sx={{ ...inputFull, fontVariantNumeric: "tabular-nums", textAlign: "right" }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>
                        MFG date
                      </Typography>
                      {readOnly ? (
                        <Typography sx={{ fontWeight: boldDataValues ? 700 : 600 }}>{lot.mfgDate || "—"}</Typography>
                      ) : (
                        <Box
                          component="input"
                          type="date"
                          value={mfg}
                          onChange={(e) => onLotChange(rowIndex, lotIndex, "mfgDate", e.target.value)}
                          sx={inputFull}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>
                        Batch no.
                      </Typography>
                      {readOnly ? (
                        <Typography sx={{ fontWeight: boldDataValues ? 700 : 600 }}>{lot.batchNo || "—"}</Typography>
                      ) : (
                        <Box
                          component="input"
                          type="text"
                          value={lot.batchNo || ""}
                          onChange={(e) => onLotChange(rowIndex, lotIndex, "batchNo", e.target.value)}
                          placeholder="—"
                          autoComplete="off"
                          sx={inputFull}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>
                        Best before (BBD)
                      </Typography>
                      {readOnly ? (
                        <Typography sx={{ fontWeight: boldDataValues ? 700 : 600 }}>{lot.bbdDate || "—"}</Typography>
                      ) : (
                        <Box
                          component="input"
                          type="date"
                          value={bbd}
                          onChange={(e) => onLotChange(rowIndex, lotIndex, "bbdDate", e.target.value)}
                          sx={inputFull}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
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
  /* Below ~1200px the table usually overflows horizontally — freeze leading columns. */
  const freezeLeadingCols = useMediaQuery(theme.breakpoints.down("lg"));
  /** Card layout avoids horizontal scroll on phones / small tablets. */
  const useCardLayout = useMediaQuery(theme.breakpoints.down("md"));

  const cellSx = useMemo(
    () => ({
      border: "1px solid",
      borderColor: "divider",
      p: isFs ? 0.75 : 0.5,
      fontSize: isFs ? "0.78rem" : "0.7rem",
      verticalAlign: "middle",
      color: "text.primary",
      ...(boldDataValues ? { fontWeight: 700 } : {}),
    }),
    [isFs, boldDataValues]
  );

  const headSx = useMemo(
    () => ({
      ...cellSx,
      bgcolor: isFs ? "#006064" : "#00bcd4",
      color: "#fff",
      fontWeight: 700,
      textAlign: "center",
      fontSize: isFs ? "0.72rem" : undefined,
    }),
    [cellSx, isFs]
  );

  const tableMaxHeight =
    maxHeight ?? (isFs ? "min(70vh, calc(100dvh - 320px))" : "65vh");

  const qtyCellMin = isFs ? 104 : 96;
  const dateCellMin = isFs ? 150 : 142;
  const batchCellMin = isFs ? 140 : 128;

  const inputSx = useMemo(
    () => ({
      boxSizing: "border-box",
      width: "100%",
      py: 0.65,
      px: 1.25,
      fontSize: isFs ? "0.8rem" : "0.75rem",
      lineHeight: 1.4,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 1,
      bgcolor: "background.paper",
      fontFamily: "inherit",
      color: "text.primary",
      ...(boldDataValues ? { fontWeight: 700 } : {}),
      "&:focus": {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 0,
        borderColor: theme.palette.primary.main,
      },
    }),
    [theme.palette.primary.main, isFs, boldDataValues]
  );

  const spans = useMemo(() => {
    const map = [];
    let i = 0;
    while (i < rows.length) {
      const cat = rows[i].category;
      let j = i + 1;
      while (j < rows.length && rows[j].category === cat) j++;
      map.push({ start: i, count: j - i });
      i = j;
    }
    return map;
  }, [rows]);

  const onLotChange = useCallback(
    (rowIndex, lotIndex, field, value) => {
      if (!onRowsChange) return;
      const next = rows.map((r, ri) => {
        if (ri !== rowIndex) return r;
        const lots = r.lots.map((l, li) =>
          li === lotIndex ? { ...l, [field]: value } : l
        );
        return { ...r, lots };
      });
      onRowsChange(next);
    },
    [rows, onRowsChange]
  );

  const lotHeadBg = useMemo(
    () =>
      isFs
        ? ["#0d7377", "#006064", "#004d52"]
        : ["#26c6da", "#00acc1", "#0097a7"],
    [isFs]
  );

  const lotBodyBand = useMemo(
    () =>
      isFs
        ? ["rgba(0, 96, 100, 0.09)", "rgba(0, 96, 100, 0.045)", "rgba(0, 96, 100, 0.12)"]
        : ["rgba(0, 188, 212, 0.1)", "rgba(0, 188, 212, 0.055)", "rgba(0, 188, 212, 0.13)"],
    [isFs]
  );

  const headTeal = isFs ? "#006064" : "#00bcd4";
  const isDark = theme.palette.mode === "dark";
  const catBodyBg = isDark
    ? alpha(theme.palette.warning.main, isFs ? 0.22 : 0.18)
    : isFs
      ? "#fff8e1"
      : "#fff9c4";

  const stickyHeadCategorySx = freezeLeadingCols
    ? {
        position: "sticky",
        left: 0,
        top: 0,
        zIndex: 14,
        minWidth: STICKY_CAT_PX,
        width: STICKY_CAT_PX,
        maxWidth: STICKY_CAT_PX,
        boxSizing: "border-box",
        backgroundColor: headTeal,
        boxShadow: "4px 0 10px -4px rgba(0,0,0,0.35)",
        wordBreak: "break-word",
        lineHeight: 1.25,
      }
    : {};

  const stickyHeadSkuSx = freezeLeadingCols
    ? {
        position: "sticky",
        left: STICKY_CAT_PX,
        top: 0,
        zIndex: 13,
        minWidth: STICKY_SKU_PX,
        width: STICKY_SKU_PX,
        maxWidth: STICKY_SKU_PX,
        boxSizing: "border-box",
        backgroundColor: headTeal,
        boxShadow: "4px 0 8px -4px rgba(0,0,0,0.28)",
        wordBreak: "break-word",
        lineHeight: 1.25,
      }
    : {};

  if (useCardLayout) {
    return (
      <Paper
        variant="outlined"
        sx={{
          maxHeight: tableMaxHeight,
          overflow: "auto",
          borderRadius: isFs ? 2 : 2,
          p: { xs: 1.25, sm: 1.75 },
          boxShadow: isFs ? "0 2px 12px rgba(0,0,0,0.06)" : "0 1px 6px rgba(0,0,0,0.05)",
          borderColor: "divider",
        }}
      >
        <PhysicalStockCardLayout
          rows={rows}
          readOnly={readOnly}
          onLotChange={onLotChange}
          inputSx={inputSx}
          boldDataValues={boldDataValues}
        />
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        maxHeight: tableMaxHeight,
        borderRadius: isFs ? 2 : 1,
        boxShadow: isFs ? "0 2px 12px rgba(0,0,0,0.06)" : undefined,
        border: isFs ? "1px solid" : undefined,
        borderColor: isFs ? "divider" : undefined,
      }}
    >
      <Table
        size="small"
        stickyHeader
        sx={{
          minWidth: isFs ? 1380 : 1320,
          ...(freezeLeadingCols
            ? { borderCollapse: "separate", borderSpacing: 0 }
            : {}),
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headSx, ...stickyHeadCategorySx }} rowSpan={2}>
              Category
            </TableCell>
            <TableCell sx={{ ...headSx, ...stickyHeadSkuSx }} rowSpan={2}>
              SKU
            </TableCell>
            <TableCell sx={{ ...headSx, bgcolor: lotHeadBg[0] }} colSpan={4} align="center">
              Lot 1 — oldest (FIFO first)
            </TableCell>
            <TableCell sx={{ ...headSx, bgcolor: lotHeadBg[1] }} colSpan={4} align="center">
              Lot 2
            </TableCell>
            <TableCell sx={{ ...headSx, bgcolor: lotHeadBg[2] }} colSpan={4} align="center">
              Lot 3 — newest
            </TableCell>
            <TableCell
              rowSpan={2}
              align="center"
              sx={{
                ...headSx,
                borderLeft: "3px solid",
                borderLeftColor: "rgba(255,255,255,0.85)",
                minWidth: 72,
              }}
            >
              Total
            </TableCell>
          </TableRow>
          <TableRow>
            {[1, 2, 3].map((lotNum) => {
              const bg = lotHeadBg[lotNum - 1];
              return (
                <React.Fragment key={lotNum}>
                  <TableCell sx={{ ...headSx, bgcolor: bg, fontSize: isFs ? "0.68rem" : "0.65rem" }} title="Quantity (cases)">
                    Qty
                  </TableCell>
                  <TableCell sx={{ ...headSx, bgcolor: bg, fontSize: isFs ? "0.68rem" : "0.65rem" }} title="Manufacturing date">
                    MFG
                  </TableCell>
                  <TableCell sx={{ ...headSx, bgcolor: bg, fontSize: isFs ? "0.68rem" : "0.65rem" }} title="Batch number">
                    B.No
                  </TableCell>
                  <TableCell sx={{ ...headSx, bgcolor: bg, fontSize: isFs ? "0.68rem" : "0.65rem" }} title="Best before date">
                    BBD
                  </TableCell>
                </React.Fragment>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => {
            const spanInfo = spans.find((s) => s.start === rowIndex);
            const zebra = rowIndex % 2 === 1;
            return (
              <TableRow
                key={`${row.category}-${row.sku}`}
                hover
                sx={{
                  bgcolor: zebra
                    ? isFs
                      ? isDark
                        ? alpha("#006064", 0.12)
                        : "rgba(0, 96, 100, 0.03)"
                      : isDark
                        ? alpha(theme.palette.common.white, 0.04)
                        : "rgba(0,0,0,0.02)"
                    : "transparent",
                }}
              >
                {spanInfo ? (
                  <TableCell
                    sx={{
                      ...cellSx,
                      bgcolor: catBodyBg,
                      fontWeight: 700,
                      verticalAlign: "middle",
                      ...(freezeLeadingCols
                        ? {
                            position: "sticky",
                            left: 0,
                            zIndex: 3,
                            minWidth: STICKY_CAT_PX,
                            width: STICKY_CAT_PX,
                            maxWidth: STICKY_CAT_PX,
                            boxSizing: "border-box",
                            backgroundColor: catBodyBg,
                            boxShadow: "4px 0 8px -4px rgba(0,0,0,0.12)",
                            wordBreak: "break-word",
                            lineHeight: 1.3,
                          }
                        : {}),
                    }}
                    rowSpan={spanInfo.count}
                  >
                    <Typography component="span" variant="body2" sx={{ color: "text.primary", fontWeight: 700 }}>
                      {row.category}
                    </Typography>
                  </TableCell>
                ) : null}
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: boldDataValues ? 700 : 600,
                    ...(freezeLeadingCols
                      ? {
                          position: "sticky",
                          left: STICKY_CAT_PX,
                          zIndex: 2,
                          minWidth: STICKY_SKU_PX,
                          width: STICKY_SKU_PX,
                          maxWidth: STICKY_SKU_PX,
                          boxSizing: "border-box",
                          backgroundColor: zebra
                            ? isFs
                              ? isDark
                                ? alpha("#006064", 0.12)
                                : "rgba(0, 96, 100, 0.03)"
                              : isDark
                                ? alpha(theme.palette.common.white, 0.04)
                                : "rgba(0,0,0,0.02)"
                            : theme.palette.background.paper,
                          boxShadow: "3px 0 6px -2px rgba(0,0,0,0.1)",
                          wordBreak: "break-word",
                        }
                      : {}),
                  }}
                >
                  {row.sku}
                </TableCell>
                {[0, 1, 2].map((lotIndex) => (
                  <LotFields
                    key={lotIndex}
                    rowIndex={rowIndex}
                    lotIndex={lotIndex}
                    lot={row.lots[lotIndex] || { qty: 0, mfgDate: "", batchNo: "", bbdDate: "" }}
                    readOnly={readOnly}
                    onLotChange={onLotChange}
                    cellSx={cellSx}
                    qtyCellMin={qtyCellMin}
                    dateCellMin={dateCellMin}
                    batchCellMin={batchCellMin}
                    inputSx={inputSx}
                    bandBg={lotBodyBand[lotIndex]}
                  />
                ))}
                <TableCell
                  align="right"
                  sx={{
                    ...cellSx,
                    fontWeight: 800,
                    bgcolor: isDark ? alpha(theme.palette.info.main, 0.22) : "#e3f2fd",
                    color: "text.primary",
                    fontVariantNumeric: "tabular-nums",
                    borderLeft: "3px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  {rowTotal(row)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function toDateInput(v) {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    /* ignore */
  }
  return "";
}

export function PhysicalStockFifoNote() {
  return (
    <Alert
      icon={<InfoOutlinedIcon fontSize="inherit" />}
      severity="info"
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        alignItems: "flex-start",
        bgcolor: "rgba(0, 131, 143, 0.06)",
        borderColor: "rgba(0, 131, 143, 0.35)",
        "& .MuiAlert-message": { width: "100%" },
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        FIFO (first-in, first-out)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        Put your <strong>oldest</strong> batch in <strong>Lot 1</strong> (dispatch this first), the next in{" "}
        <strong>Lot 2</strong>, and the <strong>newest</strong> in <strong>Lot 3</strong>. The <strong>Total</strong> column
        is the sum of quantities across all three lots.
      </Typography>
    </Alert>
  );
}
