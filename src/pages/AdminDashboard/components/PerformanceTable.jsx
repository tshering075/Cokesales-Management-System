import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PeopleIcon from "@mui/icons-material/People";

function bodyStripeBg(theme, rowIdx) {
  const isDark = theme.palette.mode === "dark";
  return rowIdx % 2 === 0
    ? alpha(theme.palette.primary.main, isDark ? 0.14 : 0.05)
    : alpha(theme.palette.secondary.main, isDark ? 0.12 : 0.07);
}

function hoverRowBg(theme) {
  return alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.1);
}

/** Bold numerals for target / achieved / balance columns */
const figureSx = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: { xs: "0.7rem", sm: "0.875rem" },
  py: { xs: 1, sm: 1.5 },
};

function PerformanceTable({ distributors, selectedRegion, isMobile, tableRef }) {
  const theme = useTheme();

  const headerPrimary = useMemo(
    () => ({
      bg: theme.palette.primary.main,
      fg: theme.palette.primary.contrastText,
      divider: alpha(theme.palette.primary.contrastText, 0.35),
    }),
    [theme]
  );

  const headerSecondary = useMemo(
    () => ({
      bg: "secondary.main",
      fg: theme.palette.getContrastText(theme.palette.secondary.main),
      borderTop: 1,
      borderColor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.2 : 0.08),
    }),
    [theme]
  );

  const totalRowBg = useMemo(
    () =>
      alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
    [theme]
  );

  const normalizeRegionKey = (region) => {
    const map = { South: "Southern", West: "Western", East: "Eastern" };
    return map[region] || region;
  };

  const toNumber = (value) => Number(value || 0);

  const resolvedRegion = normalizeRegionKey(selectedRegion);
  const filteredDistributors = distributors.filter(
    (d) => selectedRegion === "All" || d.region === resolvedRegion
  );

  const totals = filteredDistributors.reduce(
    (acc, d) => ({
      targetCSD_PC: acc.targetCSD_PC + toNumber(d.target?.CSD_PC),
      targetCSD_UC: acc.targetCSD_UC + toNumber(d.target?.CSD_UC),
      targetWater_PC: acc.targetWater_PC + toNumber(d.target?.Water_PC),
      targetWater_UC: acc.targetWater_UC + toNumber(d.target?.Water_UC),
      achievedCSD_PC: acc.achievedCSD_PC + toNumber(d.achieved?.CSD_PC),
      achievedCSD_UC: acc.achievedCSD_UC + toNumber(d.achieved?.CSD_UC),
      achievedWater_PC: acc.achievedWater_PC + toNumber(d.achieved?.Water_PC),
      achievedWater_UC: acc.achievedWater_UC + toNumber(d.achieved?.Water_UC),
      balanceCSD_PC: acc.balanceCSD_PC + toNumber(d.balance?.CSD_PC),
      balanceCSD_UC: acc.balanceCSD_UC + toNumber(d.balance?.CSD_UC),
      balanceWater_PC: acc.balanceWater_PC + toNumber(d.balance?.Water_PC),
      balanceWater_UC: acc.balanceWater_UC + toNumber(d.balance?.Water_UC),
    }),
    {
      targetCSD_PC: 0,
      targetCSD_UC: 0,
      targetWater_PC: 0,
      targetWater_UC: 0,
      achievedCSD_PC: 0,
      achievedCSD_UC: 0,
      achievedWater_PC: 0,
      achievedWater_UC: 0,
      balanceCSD_PC: 0,
      balanceCSD_UC: 0,
      balanceWater_PC: 0,
      balanceWater_UC: 0,
    }
  );

  if (distributors.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 4, sm: 8 },
          color: "text.secondary",
        }}
      >
        <PeopleIcon sx={{ fontSize: { xs: 60, sm: 80 }, mb: 2, opacity: 0.45, color: "text.disabled" }} />
        <Typography variant="h6" sx={{ fontWeight: 500, color: "text.primary", mb: 0.5, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
          No distributors found
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
          Add distributors to see their performance data
        </Typography>
      </Box>
    );
  }

  const row1Top = { xs: 28, sm: 36 };
  const row2Top = { xs: 56, sm: 72 };

  const subBand = (extra = {}) => ({
    fontWeight: "bold",
    bgcolor: headerSecondary.bg,
    color: headerSecondary.fg,
    ...extra,
  });

  return (
    <TableContainer
      ref={tableRef}
      component={Paper}
      elevation={theme.palette.mode === "dark" ? 4 : 2}
      sx={{
        width: "100%",
        maxHeight: { xs: "calc(100vh - 350px)", sm: "70vh" },
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflow: "auto",
        minHeight: { xs: "300px", sm: "400px" },
        position: "relative",
        WebkitOverflowScrolling: "touch",
        "&::-webkit-scrollbar": {
          height: "8px",
          width: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: (t) => alpha(t.palette.text.disabled, t.palette.mode === "dark" ? 0.5 : 0.35),
          borderRadius: "4px",
        },
      }}
    >
      <Table
        stickyHeader
        size={isMobile ? "small" : "medium"}
        sx={{
          minWidth: { xs: 650, sm: 900, md: 1000 },
          borderCollapse: "collapse",
          "& .MuiTableCell-root": {
            border: "1px solid",
            borderColor: "divider",
          },
          "& .MuiTableHead tr:nth-of-type(1) .MuiTableCell-root": {
            borderColor: alpha(theme.palette.primary.contrastText, 0.45),
          },
        }}
      >
        <TableHead sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper" }}>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: headerPrimary.bg,
                color: headerPrimary.fg,
                position: "sticky",
                top: 0,
                left: 0,
                zIndex: 20,
                minWidth: { xs: 90, sm: 140 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                whiteSpace: "nowrap",
              }}
            >
              Distributor
            </TableCell>
            <TableCell
              colSpan={4}
              sx={{
                fontWeight: "bold",
                bgcolor: headerPrimary.bg,
                color: headerPrimary.fg,
                textAlign: "center",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: 0,
                zIndex: 15,
              }}
            >
              Target
            </TableCell>
            <TableCell
              colSpan={4}
              sx={{
                fontWeight: "bold",
                bgcolor: headerPrimary.bg,
                color: headerPrimary.fg,
                textAlign: "center",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: 0,
                zIndex: 15,
                borderLeft: "2px solid",
                borderLeftColor: headerPrimary.divider,
              }}
            >
              Achieved
            </TableCell>
            <TableCell
              colSpan={4}
              sx={{
                fontWeight: "bold",
                bgcolor: headerPrimary.bg,
                color: headerPrimary.fg,
                textAlign: "center",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: 0,
                zIndex: 15,
                borderLeft: "2px solid",
                borderLeftColor: headerPrimary.divider,
              }}
            >
              Balance
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              sx={subBand({
                position: "sticky",
                top: row1Top,
                left: 0,
                zIndex: 20,
                minWidth: { xs: 100, sm: 150 },
                py: { xs: 0.5, sm: 0.75 },
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            />
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              Water
            </TableCell>
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderLeft: "2px solid",
                borderLeftColor: "divider",
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderRight: "2px solid",
                borderRightColor: "divider",
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              Water
            </TableCell>
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={subBand({
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: row1Top,
                zIndex: 15,
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            >
              Water
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              sx={subBand({
                position: "sticky",
                top: row2Top,
                left: 0,
                zIndex: 20,
                minWidth: { xs: 100, sm: 150 },
                py: { xs: 0.5, sm: 0.75 },
                borderTop: headerSecondary.borderTop,
                borderColor: headerSecondary.borderColor,
              })}
            />
            {[
              "PC",
              "UC",
              "PC",
              "UC",
              "PC",
              "UC",
              "PC",
              "UC",
              "PC",
              "UC",
              "PC",
              "UC",
            ].map((label, i) => (
              <TableCell
                key={`h-${i}`}
                sx={subBand({
                  textAlign: "center",
                  fontSize: { xs: "0.6rem", sm: "0.75rem" },
                  py: { xs: 0.5, sm: 0.75 },
                  position: "sticky",
                  top: row2Top,
                  zIndex: 15,
                  borderLeft: i === 4 ? "2px solid" : undefined,
                  borderLeftColor: i === 4 ? "divider" : undefined,
                  borderRight: i === 7 ? "2px solid" : undefined,
                  borderRightColor: i === 7 ? "divider" : undefined,
                  borderTop: headerSecondary.borderTop,
                  borderColor: headerSecondary.borderColor,
                })}
              >
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredDistributors.map((distributor, rowIdx) => {
            const stripe = bodyStripeBg(theme, rowIdx);
            return (
              <TableRow
                key={distributor.code || distributor.name}
                hover
                sx={{
                  transition: "background-color 0.15s ease",
                  bgcolor: stripe,
                  "&:hover": { bgcolor: hoverRowBg(theme) },
                }}
              >
                <TableCell
                  sx={{
                    fontWeight: 600,
                    position: "sticky",
                    left: 0,
                    bgcolor: stripe,
                    zIndex: 9,
                    minWidth: { xs: 90, sm: 140 },
                    fontSize: { xs: "0.7rem", sm: "0.875rem" },
                    py: { xs: 1, sm: 1.5 },
                    color: "text.primary",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {distributor.name}
                  {distributor.region && (
                    <Chip
                      label={distributor.region}
                      size="small"
                      variant="outlined"
                      sx={{
                        ml: { xs: 0.5, sm: 1 },
                        height: { xs: 18, sm: 20 },
                        fontSize: { xs: "0.6rem", sm: "0.7rem" },
                        borderColor: "divider",
                      }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ ...figureSx, bgcolor: stripe, color: "text.primary", borderTop: 1, borderColor: "divider" }}>
                  {Math.round(distributor.target?.CSD_PC || 0)}
                </TableCell>
                <TableCell sx={{ ...figureSx, bgcolor: stripe, color: "text.primary", borderTop: 1, borderColor: "divider" }}>
                  {Math.round(distributor.target?.CSD_UC || 0)}
                </TableCell>
                <TableCell sx={{ ...figureSx, bgcolor: stripe, color: "text.primary", borderTop: 1, borderColor: "divider" }}>
                  {Math.round(distributor.target?.Water_PC || 0)}
                </TableCell>
                <TableCell sx={{ ...figureSx, bgcolor: stripe, color: "text.primary", borderTop: 1, borderColor: "divider" }}>
                  {Math.round(distributor.target?.Water_UC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.achieved?.CSD_PC || 0) > 0 ? "success.main" : "text.primary",
                    borderLeft: "2px solid",
                    borderColor: "divider",
                    borderTop: 1,
                  }}
                >
                  {Math.round(distributor.achieved?.CSD_PC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.achieved?.CSD_UC || 0) > 0 ? "success.main" : "text.primary",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.achieved?.CSD_UC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.achieved?.Water_PC || 0) > 0 ? "success.main" : "text.primary",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.achieved?.Water_PC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.achieved?.Water_UC || 0) > 0 ? "success.main" : "text.primary",
                    borderLeft: "none",
                    borderRight: "2px solid",
                    borderColor: "divider",
                    borderTop: 1,
                  }}
                >
                  {Math.round(distributor.achieved?.Water_UC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.balance?.CSD_PC || 0) >= 0 ? "text.primary" : "error.main",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.balance?.CSD_PC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.balance?.CSD_UC || 0) >= 0 ? "text.primary" : "error.main",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.balance?.CSD_UC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.balance?.Water_PC || 0) >= 0 ? "text.primary" : "error.main",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.balance?.Water_PC || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...figureSx,
                    bgcolor: stripe,
                    color: (distributor.balance?.Water_UC || 0) >= 0 ? "text.primary" : "error.main",
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  {Math.round(distributor.balance?.Water_UC || 0)}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow
            sx={{
              bgcolor: totalRowBg,
              "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" },
            }}
          >
            <TableCell
              sx={{
                fontWeight: 700,
                position: "sticky",
                left: 0,
                bgcolor: totalRowBg,
                zIndex: 9,
                minWidth: { xs: 110, sm: 180 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                color: "text.primary",
              }}
            >
              TOTAL
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 }, bgcolor: totalRowBg, color: "text.primary" }}>
              {Math.round(totals.targetCSD_PC)}
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 }, bgcolor: totalRowBg, color: "text.primary" }}>
              {Math.round(totals.targetCSD_UC)}
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 }, bgcolor: totalRowBg, color: "text.primary" }}>
              {Math.round(totals.targetWater_PC)}
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 }, bgcolor: totalRowBg, color: "text.primary" }}>
              {Math.round(totals.targetWater_UC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedCSD_PC > 0 ? "success.main" : "text.primary",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
                borderLeft: "2px solid",
                borderColor: "divider",
              }}
            >
              {Math.round(totals.achievedCSD_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedCSD_UC > 0 ? "success.main" : "text.primary",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.achievedCSD_UC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedWater_PC > 0 ? "success.main" : "text.primary",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.achievedWater_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedWater_UC > 0 ? "success.main" : "text.primary",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
                borderRight: "2px solid",
                borderColor: "divider",
              }}
            >
              {Math.round(totals.achievedWater_UC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceCSD_PC >= 0 ? "text.primary" : "error.main",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.balanceCSD_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceCSD_UC >= 0 ? "text.primary" : "error.main",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.balanceCSD_UC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceWater_PC >= 0 ? "text.primary" : "error.main",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.balanceWater_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceWater_UC >= 0 ? "text.primary" : "error.main",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                bgcolor: totalRowBg,
              }}
            >
              {Math.round(totals.balanceWater_UC)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default PerformanceTable;
