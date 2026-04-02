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
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PeopleIcon from "@mui/icons-material/People";

/**
 * PerformanceTable Component
 * Displays the distributor performance table with targets, achieved, and balance
 */
function usePerformanceTableColors() {
  const theme = useTheme();
  return useMemo(() => {
    const isDark = theme.palette.mode === "dark";
    return {
      header: theme.palette.primary.main,
      headerContrast: theme.palette.primary.contrastText,
      headerDivider: alpha(theme.palette.primary.contrastText, 0.35),
      subPink: isDark ? alpha(theme.palette.primary.main, 0.38) : "#ffcdd2",
      subCsd: isDark ? alpha(theme.palette.warning.main, 0.24) : "#fff3e0",
      subWater: isDark ? alpha(theme.palette.info.main, 0.3) : "#e3f2fd",
      bodySticky: theme.palette.background.paper,
      totalRow: isDark ? alpha(theme.palette.common.white, 0.08) : "#f5f5f5",
    };
  }, [theme]);
}

/** Bold numerals for target / achieved / balance columns */
const figureSx = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: { xs: "0.7rem", sm: "0.875rem" },
  py: { xs: 1, sm: 1.5 },
};

function PerformanceTable({ distributors, selectedRegion, isMobile, tableRef }) {
  const PT = usePerformanceTableColors();

  const normalizeRegionKey = (region) => {
    const map = { South: "Southern", West: "Western", East: "Eastern" };
    return map[region] || region;
  };

  const toNumber = (value) => Number(value || 0);

  // Filter distributors by region
  const resolvedRegion = normalizeRegionKey(selectedRegion);
  const filteredDistributors = distributors.filter(
    (d) => selectedRegion === "All" || d.region === resolvedRegion
  );

  // Calculate totals
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
        <PeopleIcon sx={{ fontSize: { xs: 60, sm: 80 }, mb: 2, opacity: 0.3 }} />
        <Typography variant="h6" sx={{ fontWeight: 500, color: "text.primary", mb: 0.5, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
          No distributors found
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
          Add distributors to see their performance data
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      ref={tableRef}
      sx={{
        width: "100%",
        maxHeight: { xs: "calc(100vh - 350px)", sm: "70vh" },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "auto",
        minHeight: { xs: "300px", sm: "400px" },
        position: "relative",
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
        sx={{ minWidth: { xs: 650, sm: 900, md: 1000 } }}
      >
        <TableHead sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: PT.bodySticky }}>
          <TableRow sx={{ "& .MuiTableCell-root": { borderBottom: "none" } }}>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.header,
                color: PT.headerContrast,
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
                bgcolor: PT.header,
                color: PT.headerContrast,
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
                bgcolor: PT.header,
                color: PT.headerContrast,
                textAlign: "center",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: 0,
                zIndex: 15,
                borderLeft: "2px solid",
                borderLeftColor: PT.headerDivider,
              }}
            >
              Achieved
            </TableCell>
            <TableCell
              colSpan={4}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.header,
                color: PT.headerContrast,
                textAlign: "center",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: 0,
                zIndex: 15,
                borderLeft: "2px solid",
                borderLeftColor: PT.headerDivider,
              }}
            >
              Balance
            </TableCell>
          </TableRow>
          <TableRow
            sx={{
              "& .MuiTableCell-root": { borderBottom: "none", borderTop: "none" },
            }}
          >
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                position: "sticky",
                top: { xs: 28, sm: 36 },
                left: 0,
                zIndex: 20,
                minWidth: { xs: 100, sm: 150 },
                py: { xs: 0.5, sm: 0.75 },
              }}
            ></TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subCsd,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
              }}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subWater,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
              }}
            >
              Water
            </TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subCsd,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
                borderLeft: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subWater,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
                borderRight: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              Water
            </TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subCsd,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
              }}
            >
              CSD
            </TableCell>
            <TableCell
              colSpan={2}
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subWater,
                textAlign: "center",
                fontSize: { xs: "0.65rem", sm: "0.85rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 28, sm: 36 },
                zIndex: 15,
              }}
            >
              Water
            </TableCell>
          </TableRow>
          <TableRow sx={{ "& .MuiTableCell-root": { borderTop: "none" } }}>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                position: "sticky",
                top: { xs: 56, sm: 72 },
                left: 0,
                zIndex: 20,
                minWidth: { xs: 100, sm: 150 },
                py: { xs: 0.5, sm: 0.75 },
              }}
            ></TableCell>
            {/* Target Headers */}
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              UC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              UC
            </TableCell>
            {/* Achieved Headers */}
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
                borderLeft: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              UC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
                borderRight: "none",
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
                borderLeft: "none",
                borderRight: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              UC
            </TableCell>
            {/* Balance Headers */}
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              UC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              PC
            </TableCell>
            <TableCell
              sx={{
                fontWeight: "bold",
                bgcolor: PT.subPink,
                textAlign: "center",
                fontSize: { xs: "0.6rem", sm: "0.75rem" },
                py: { xs: 0.5, sm: 0.75 },
                position: "sticky",
                top: { xs: 56, sm: 72 },
                zIndex: 15,
              }}
            >
              UC
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredDistributors.map((distributor) => (
            <TableRow key={distributor.code || distributor.name} hover>
              <TableCell
                sx={{
                  fontWeight: 600,
                  position: "sticky",
                  left: 0,
                  bgcolor: PT.bodySticky,
                  zIndex: 9,
                minWidth: { xs: 90, sm: 140 },
                  fontSize: { xs: "0.7rem", sm: "0.875rem" },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                {distributor.name}
                {distributor.region && (
                  <Chip
                    label={distributor.region}
                    size="small"
                    sx={{
                      ml: { xs: 0.5, sm: 1 },
                      height: { xs: 18, sm: 20 },
                      fontSize: { xs: "0.6rem", sm: "0.7rem" },
                    }}
                    color="default"
                  />
                )}
              </TableCell>
              {/* Target - CSD */}
              <TableCell sx={figureSx}>{Math.round(distributor.target?.CSD_PC || 0)}</TableCell>
              <TableCell sx={figureSx}>{Math.round(distributor.target?.CSD_UC || 0)}</TableCell>
              {/* Target - Water */}
              <TableCell sx={figureSx}>{Math.round(distributor.target?.Water_PC || 0)}</TableCell>
              <TableCell sx={figureSx}>{Math.round(distributor.target?.Water_UC || 0)}</TableCell>
              {/* Achieved - CSD */}
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.achieved?.CSD_PC || 0) > 0 ? "#2e7d32" : "grey.800",
                  borderLeft: "2px solid rgba(0, 0, 0, 0.2)",
                }}
              >
                {Math.round(distributor.achieved?.CSD_PC || 0)}
              </TableCell>
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.achieved?.CSD_UC || 0) > 0 ? "#2e7d32" : "grey.800",
                }}
              >
                {Math.round(distributor.achieved?.CSD_UC || 0)}
              </TableCell>
              {/* Achieved - Water */}
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.achieved?.Water_PC || 0) > 0 ? "#2e7d32" : "grey.800",
                  borderRight: "none",
                }}
              >
                {Math.round(distributor.achieved?.Water_PC || 0)}
              </TableCell>
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.achieved?.Water_UC || 0) > 0 ? "#2e7d32" : "grey.800",
                  borderLeft: "none",
                  borderRight: "2px solid rgba(0, 0, 0, 0.2)",
                }}
              >
                {Math.round(distributor.achieved?.Water_UC || 0)}
              </TableCell>
              {/* Balance - CSD */}
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.balance?.CSD_PC || 0) >= 0 ? "grey.800" : "#d32f2f",
                }}
              >
                {Math.round(distributor.balance?.CSD_PC || 0)}
              </TableCell>
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.balance?.CSD_UC || 0) >= 0 ? "grey.800" : "#d32f2f",
                }}
              >
                {Math.round(distributor.balance?.CSD_UC || 0)}
              </TableCell>
              {/* Balance - Water */}
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.balance?.Water_PC || 0) >= 0 ? "grey.800" : "#d32f2f",
                }}
              >
                {Math.round(distributor.balance?.Water_PC || 0)}
              </TableCell>
              <TableCell
                sx={{
                  ...figureSx,
                  color: (distributor.balance?.Water_UC || 0) >= 0 ? "grey.800" : "#d32f2f",
                }}
              >
                {Math.round(distributor.balance?.Water_UC || 0)}
              </TableCell>
            </TableRow>
          ))}
          {/* Total Row */}
          <TableRow sx={{ bgcolor: PT.totalRow, "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" } }}>
            <TableCell
              sx={{
                fontWeight: 700,
                position: "sticky",
                left: 0,
                bgcolor: PT.totalRow,
                zIndex: 9,
                minWidth: { xs: 110, sm: 180 },
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
              }}
            >
              TOTAL
            </TableCell>
            {/* Target - CSD */}
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}>
              {Math.round(totals.targetCSD_PC)}
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}>
              {Math.round(totals.targetCSD_UC)}
            </TableCell>
            {/* Target - Water */}
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}>
              {Math.round(totals.targetWater_PC)}
            </TableCell>
            <TableCell sx={{ textAlign: "center", fontWeight: 700, fontSize: { xs: "0.7rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}>
              {Math.round(totals.targetWater_UC)}
            </TableCell>
            {/* Achieved - CSD */}
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedCSD_PC > 0 ? "#2e7d32" : "grey.800",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                borderLeft: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              {Math.round(totals.achievedCSD_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedCSD_UC > 0 ? "#2e7d32" : "grey.800",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
              }}
            >
              {Math.round(totals.achievedCSD_UC)}
            </TableCell>
            {/* Achieved - Water */}
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedWater_PC > 0 ? "#2e7d32" : "grey.800",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                borderRight: "none",
              }}
            >
              {Math.round(totals.achievedWater_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.achievedWater_UC > 0 ? "#2e7d32" : "grey.800",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                borderLeft: "none",
                borderRight: "2px solid rgba(0, 0, 0, 0.2)",
              }}
            >
              {Math.round(totals.achievedWater_UC)}
            </TableCell>
            {/* Balance - CSD */}
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceCSD_PC >= 0 ? "grey.800" : "#d32f2f",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
              }}
            >
              {Math.round(totals.balanceCSD_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceCSD_UC >= 0 ? "grey.800" : "#d32f2f",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
              }}
            >
              {Math.round(totals.balanceCSD_UC)}
            </TableCell>
            {/* Balance - Water */}
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceWater_PC >= 0 ? "grey.800" : "#d32f2f",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
              }}
            >
              {Math.round(totals.balanceWater_PC)}
            </TableCell>
            <TableCell
              sx={{
                textAlign: "center",
                fontWeight: 700,
                color: totals.balanceWater_UC >= 0 ? "grey.800" : "#d32f2f",
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
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
