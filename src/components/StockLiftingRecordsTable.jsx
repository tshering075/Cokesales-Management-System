import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";

const ZEBRA_ODD = "rgba(251, 192, 45, 0.12)";

export function formatStockLiftDate(record) {
  if (!record) return "—";
  if (record.invoiceDate) {
    try {
      return new Date(record.invoiceDate).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(record.invoiceDate);
    }
  }
  const raw = record.date || record.timestamp || record.created_at;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return String(raw);
  }
}

/**
 * Stock lifting rows from sales_data / orders fallback — CSD & Water PC + UC.
 */
export default function StockLiftingRecordsTable({
  records = [],
  stickyHeader = false,
  maxHeight,
  emptyMessage = "No stock lifting records found for this period.",
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const headBg = "#e53935";
  const subBg = "#fbc02d";
  const subFg = "#1a1a1a";
  const subBorder = "#e53935";

  const headSx = {
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    py: 1.25,
    px: 1,
    fontSize: isMobile ? "0.7rem" : "0.8125rem",
    lineHeight: 1.3,
    borderBottom: "none",
  };

  const subHeadSx = {
    fontWeight: 700,
    textAlign: "center",
    verticalAlign: "middle",
    py: 1,
    px: 1,
    fontSize: isMobile ? "0.68rem" : "0.78rem",
    bgcolor: subBg,
    color: subFg,
    borderBottom: `2px solid ${subBorder}`,
  };

  const cellSx = {
    fontSize: isMobile ? "0.72rem" : "0.875rem",
    fontWeight: 700,
    py: 1.1,
    px: 1,
    verticalAlign: "middle",
    boxSizing: "border-box",
  };

  /** PC / UC: same alignment as sub-headers + tabular figures for a straight digit column */
  const numericCellInnerSx = {
    display: "block",
    width: "100%",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum"',
    letterSpacing: "0.01em",
  };

  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "auto",
        maxHeight: maxHeight ?? "none",
        ...(stickyHeader ? { maxHeight: maxHeight || { xs: "70vh", sm: "60vh" } } : {}),
      }}
    >
      <Table
        size={isMobile ? "small" : "medium"}
        stickyHeader={stickyHeader}
        sx={{
          minWidth: 520,
          width: "100%",
          tableLayout: "fixed",
          // Same horizontal padding for head/body numeric columns (MUI can differ by variant)
          "& .MuiTableCell-head": { paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) },
          "& .MuiTableCell-body": { paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) },
        }}
      >
        <colgroup>
          <col style={{ width: isMobile ? "34%" : "30%" }} />
          <col style={{ width: isMobile ? "16.5%" : "17.5%" }} />
          <col style={{ width: isMobile ? "16.5%" : "17.5%" }} />
          <col style={{ width: isMobile ? "16.5%" : "17.5%" }} />
          <col style={{ width: isMobile ? "16.5%" : "17.5%" }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: headBg }}>
            <TableCell rowSpan={2} sx={{ ...headSx, verticalAlign: "middle", minWidth: 120 }}>
              Lift date
            </TableCell>
            <TableCell colSpan={2} sx={{ ...headSx, verticalAlign: "middle" }}>
              CSD
              <Typography component="span" variant="caption" sx={{ display: "block", opacity: 0.92, fontWeight: 500, mt: 0.25 }}>
                Physical cases & unit cases
              </Typography>
            </TableCell>
            <TableCell colSpan={2} sx={{ ...headSx, verticalAlign: "middle" }}>
              Water (Kinley)
              <Typography component="span" variant="caption" sx={{ display: "block", opacity: 0.92, fontWeight: 500, mt: 0.25 }}>
                Physical cases & unit cases
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={subHeadSx}>
              <Box component="span" sx={numericCellInnerSx}>
                PC
              </Box>
            </TableCell>
            <TableCell sx={subHeadSx}>
              <Box component="span" sx={numericCellInnerSx}>
                UC
              </Box>
            </TableCell>
            <TableCell sx={subHeadSx}>
              <Box component="span" sx={numericCellInnerSx}>
                PC
              </Box>
            </TableCell>
            <TableCell sx={subHeadSx}>
              <Box component="span" sx={numericCellInnerSx}>
                UC
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                <Box sx={{ maxWidth: 360, mx: "auto" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    No records yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            records.map((record, idx) => (
              <TableRow
                key={record.id || `${record.invoiceDate || record.date || idx}-${idx}`}
                hover
                sx={{
                  "&:nth-of-type(odd)": { bgcolor: ZEBRA_ODD },
                  "&:nth-of-type(even)": { bgcolor: "#ffffff" },
                }}
              >
                <TableCell sx={cellSx}>{formatStockLiftDate(record)}</TableCell>
                <TableCell sx={cellSx}>
                  <Box component="span" sx={numericCellInnerSx}>
                    {Math.round(Number(record.csdPC) || 0).toLocaleString()}
                  </Box>
                </TableCell>
                <TableCell sx={cellSx}>
                  <Box component="span" sx={numericCellInnerSx}>
                    {Math.round(Number(record.csdUC) || 0).toLocaleString()}
                  </Box>
                </TableCell>
                <TableCell sx={cellSx}>
                  <Box component="span" sx={numericCellInnerSx}>
                    {Math.round(Number(record.waterPC) || 0).toLocaleString()}
                  </Box>
                </TableCell>
                <TableCell sx={cellSx}>
                  <Box component="span" sx={numericCellInnerSx}>
                    {Math.round(Number(record.waterUC) || 0).toLocaleString()}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
