import React, { useMemo, useState } from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Paper,
  TextField,
  InputAdornment,
  Slide,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import TableChartIcon from "@mui/icons-material/TableChart";
import StockLiftingRecordsTable from "./StockLiftingRecordsTable";
import { parseTargetPeriodBounds } from "../utils/targetPeriod";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const REGION_OPTIONS = ["All", "Southern", "Western", "Eastern", "PLING", "THIM"];

const REGION_ALIAS = { South: "Southern", West: "Western", East: "Eastern", PLING: "PLING", THIM: "THIM" };

function normRegion(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function resolvedRegionFilterKey(selected) {
  if (selected === "All") return null;
  return REGION_ALIAS[selected] || selected;
}

function saleInvoiceDate(sale) {
  const raw = sale?.invoiceDate;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapSaleToRecord(sale, distributorLabel) {
  const inv = saleInvoiceDate(sale);
  return {
    id: sale.id,
    invoiceDate: inv,
    date: inv ? inv.toISOString().split("T")[0] : null,
    csdPC: Number(sale.csdPC) || 0,
    csdUC: Number(sale.csdUC) || 0,
    waterPC: Number(sale.waterPC) || 0,
    waterUC: Number(sale.waterUC) || 0,
    distributorLabel,
    source: sale.source,
  };
}

/**
 * Admin: browse stock lifting rows from `sales_data` (same source as distributor Stock lifting),
 * filtered by region and distributor.
 */
export default function AdminStockLiftingRecordsDialog({
  open,
  onClose,
  distributors = [],
  allSalesData = [],
  targetPeriod = null,
}) {
  const theme = useTheme();
  const [regionFilter, setRegionFilter] = useState("All");
  const [distributorCode, setDistributorCode] = useState("__all__");
  const [search, setSearch] = useState("");
  const [limitToTargetPeriod, setLimitToTargetPeriod] = useState(true);

  const codeToDistributor = useMemo(() => {
    const m = new Map();
    for (const d of distributors) {
      const c = d?.code != null ? String(d.code).trim() : "";
      if (c) m.set(c, d);
    }
    return m;
  }, [distributors]);

  const distributorsInRegion = useMemo(() => {
    const want = resolvedRegionFilterKey(regionFilter);
    const wantNorm = want ? normRegion(want) : null;
    const list = Array.isArray(distributors) ? [...distributors] : [];
    const filtered = !wantNorm
      ? list
      : list.filter((d) => normRegion(d.region) === wantNorm);
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    return filtered;
  }, [distributors, regionFilter]);

  const allowedCodes = useMemo(() => {
    const s = new Set();
    for (const d of distributorsInRegion) {
      const c = d?.code != null ? String(d.code).trim() : "";
      if (c) s.add(c);
    }
    return s;
  }, [distributorsInRegion]);

  const periodBounds = useMemo(() => {
    if (!targetPeriod?.start || !targetPeriod?.end) return { start: null, end: null };
    return parseTargetPeriodBounds(targetPeriod.start, targetPeriod.end);
  }, [targetPeriod]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = [];

    for (const sale of allSalesData || []) {
      if (!sale) continue;
      const code = sale.distributorCode != null ? String(sale.distributorCode).trim() : "";
      if (!code || !allowedCodes.has(code)) continue;

      if (distributorCode !== "__all__" && code !== distributorCode) continue;

      const d = codeToDistributor.get(code);
      const label = d
        ? `${d.name || code}${d.region ? ` · ${d.region}` : ""} (${code})`
        : `${sale.distributorName || "Unknown"} (${code})`;

      if (q) {
        const hay = `${label} ${code} ${sale.distributorName || ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      if (limitToTargetPeriod && periodBounds.start && periodBounds.end) {
        const dt = saleInvoiceDate(sale);
        if (!dt || dt < periodBounds.start || dt > periodBounds.end) continue;
      }

      rows.push(mapSaleToRecord(sale, distributorCode === "__all__" ? label : `${d?.name || sale.distributorName || code} (${code})`));
    }

    rows.sort((a, b) => {
      const ta = a.invoiceDate ? a.invoiceDate.getTime() : 0;
      const tb = b.invoiceDate ? b.invoiceDate.getTime() : 0;
      return tb - ta;
    });

    return rows;
  }, [
    allSalesData,
    allowedCodes,
    codeToDistributor,
    distributorCode,
    limitToTargetPeriod,
    periodBounds.end,
    periodBounds.start,
    search,
  ]);

  const showDistributorColumn = distributorCode === "__all__";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={Transition}
      TransitionProps={{ timeout: 200 }}
      scroll="paper"
      PaperProps={{
        elevation: 0,
        sx: {
          bgcolor: "background.default",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          background: "linear-gradient(135deg, #c62828 0%, #8e0000 100%)",
          color: "#fff",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          boxShadow: "0 4px 12px rgba(142, 0, 0, 0.35)",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TableChartIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", sm: "1.25rem" }, lineHeight: 1.2 }}>
            Stock lifting records
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.25, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            Rows come from sales data (admin Excel upload). Filter by region and distributor; totals update for the visible rows.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ color: "#fff" }} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Paper
        elevation={0}
        square
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
              <InputLabel id="admin-sl-region">Region</InputLabel>
              <Select
                labelId="admin-sl-region"
                label="Region"
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setDistributorCode("__all__");
                }}
              >
                {REGION_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 }, flex: { sm: "1 1 240px" } }}>
              <InputLabel id="admin-sl-dist">Distributor</InputLabel>
              <Select
                labelId="admin-sl-dist"
                label="Distributor"
                value={distributorCode}
                onChange={(e) => setDistributorCode(e.target.value)}
              >
                <MenuItem value="__all__">All in {regionFilter === "All" ? "all regions" : regionFilter}</MenuItem>
                {distributorsInRegion.map((d) => {
                  const c = String(d.code || "").trim();
                  if (!c) return null;
                  return (
                    <MenuItem key={c} value={c}>
                      {d.name || c} ({c})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Search name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: { sm: "1 1 200px" }, minWidth: { xs: "100%", sm: 180 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} useFlexGap>
            <FormControlLabel
              control={
                <Checkbox
                  checked={limitToTargetPeriod}
                  onChange={(e) => setLimitToTargetPeriod(e.target.checked)}
                  disabled={!targetPeriod?.start || !targetPeriod?.end}
                />
              }
              label="Limit to target period"
            />
            {targetPeriod?.start && targetPeriod?.end ? (
              <Chip
                size="small"
                variant="outlined"
                label={`${targetPeriod.start} → ${targetPeriod.end}`}
                sx={{ fontWeight: 600 }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary">
                Set target period under Targets to enable date filtering.
              </Typography>
            )}
            <Chip
              size="small"
              color="primary"
              label={`${filteredRecords.length} row${filteredRecords.length !== 1 ? "s" : ""}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 1, sm: 2 },
          py: 2,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.1 : 0.04),
            borderColor: alpha(theme.palette.info.main, 0.25),
          }}
        >
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.55 }}>
            Each row is one invoice / lifting line tied to a distributor code (same data distributors see under{" "}
            <strong>Stock lifting</strong>). Use <strong>Region</strong> then <strong>All in …</strong> to scan every outlet in
            that area, or pick one distributor for a focused list.
          </Typography>
        </Paper>

        {(!allSalesData || allSalesData.length === 0) && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No sales / lifting data loaded yet. Upload sales Excel from the dashboard or check your Supabase connection.
          </Typography>
        )}

        <StockLiftingRecordsTable
          records={filteredRecords}
          stickyHeader
          maxHeight="min(62vh, 560px)"
          headerLayout="flat"
          showDistributorColumn={showDistributorColumn}
          emptyMessage="No rows match your filters. Try another region, set distributor to “All”, or turn off “Limit to target period”."
        />
      </Box>

      <Paper
        elevation={12}
        square
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          bgcolor: "background.paper",
        }}
      >
        <Button onClick={onClose} variant="contained" color="error" size="large" sx={{ minWidth: 120, borderRadius: 2, fontWeight: 700 }}>
          Close
        </Button>
      </Paper>
    </Dialog>
  );
}
