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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
}) {
  if (readOnly) {
    return (
      <>
        <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: "tabular-nums", minWidth: qtyCellMin }}>
          {lot.qty ?? 0}
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: dateCellMin }}>{lot.mfgDate || "—"}</TableCell>
        <TableCell sx={{ ...cellSx, minWidth: batchCellMin }}>{lot.batchNo || "—"}</TableCell>
        <TableCell sx={{ ...cellSx, minWidth: dateCellMin }}>{lot.bbdDate || "—"}</TableCell>
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
      <TableCell sx={{ ...cellSx, minWidth: qtyCellMin, verticalAlign: "middle" }}>
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
      <TableCell sx={{ ...cellSx, minWidth: dateCellMin, verticalAlign: "middle" }}>
        <Box
          component="input"
          type="date"
          value={mfg}
          onChange={(e) => onLotChange(rowIndex, lotIndex, "mfgDate", e.target.value)}
          sx={inputFull}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx, minWidth: batchCellMin, verticalAlign: "middle" }}>
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
      <TableCell sx={{ ...cellSx, minWidth: dateCellMin, verticalAlign: "middle" }}>
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

  const cellSx = useMemo(
    () => ({
      border: "1px solid",
      borderColor: isFs ? "rgba(0,0,0,0.08)" : "#ddd",
      p: isFs ? 0.75 : 0.5,
      fontSize: isFs ? "0.78rem" : "0.7rem",
      verticalAlign: "middle",
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

  const headTeal = isFs ? "#006064" : "#00bcd4";
  const catBodyBg = isFs ? "#fff8e1" : "#fff9c4";

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
            <TableCell sx={headSx} colSpan={4} align="center">
              Lot 1 — oldest (FIFO first)
            </TableCell>
            <TableCell sx={headSx} colSpan={4} align="center">
              Lot 2
            </TableCell>
            <TableCell sx={headSx} colSpan={4} align="center">
              Lot 3 — newest
            </TableCell>
            <TableCell sx={headSx} rowSpan={2} align="center">
              Total
            </TableCell>
          </TableRow>
          <TableRow>
            {[1, 2, 3].map((lotNum) => (
              <React.Fragment key={lotNum}>
                <TableCell sx={{ ...headSx, fontSize: isFs ? "0.68rem" : "0.65rem" }}>Qty</TableCell>
                <TableCell sx={{ ...headSx, fontSize: isFs ? "0.68rem" : "0.65rem" }}>MFG</TableCell>
                <TableCell sx={{ ...headSx, fontSize: isFs ? "0.68rem" : "0.65rem" }}>B.No</TableCell>
                <TableCell sx={{ ...headSx, fontSize: isFs ? "0.68rem" : "0.65rem" }}>BBD</TableCell>
              </React.Fragment>
            ))}
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
                  bgcolor: zebra ? (isFs ? "rgba(0, 96, 100, 0.03)" : "rgba(0,0,0,0.02)") : "transparent",
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
                    {row.category}
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
                              ? "rgba(0, 96, 100, 0.03)"
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
                  />
                ))}
                <TableCell
                  align="right"
                  sx={{
                    ...cellSx,
                    fontWeight: 800,
                    bgcolor: "#e3f2fd",
                    fontVariantNumeric: "tabular-nums",
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
