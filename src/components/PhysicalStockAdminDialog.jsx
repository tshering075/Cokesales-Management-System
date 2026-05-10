import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  Button,
  Typography,
  Box,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Slide,
  Paper,
  Chip,
  Alert,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PhysicalStockMatrix from "./PhysicalStockMatrix";
import {
  normalizePhysicalStockPayload,
  getRawPhysicalStockFromDistributor,
  aggregatePhysicalStockTotals,
} from "../utils/physicalStockTemplate";
import { getAdminPhysicalStockLastSeenAt, getPhysicalStockUpdatesSince } from "../utils/adminPhysicalStockSignals";
import { alpha, useTheme } from "@mui/material/styles";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

function distributorRowKey(d) {
  return String(d?.code ?? d?.id ?? d?.name ?? "").trim() || d?.name || "—";
}

export default function PhysicalStockAdminDialog({ open, onClose, distributors, onOpened }) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const openSessionRef = useRef(false);

  const sorted = useMemo(() => {
    const list = Array.isArray(distributors) ? [...distributors] : [];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    return list;
  }, [distributors]);

  const todayUpdated = useMemo(() => {
    const isSameLocalDay = (isoLike) => {
      if (!isoLike) return false;
      const d = new Date(isoLike);
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };
    return sorted.filter((d) => {
      const raw = getRawPhysicalStockFromDistributor(d);
      return isSameLocalDay(raw?.updatedAt || raw?.reportDate);
    });
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return todayUpdated;
    return todayUpdated.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.code && String(d.code).toLowerCase().includes(q)) ||
        (d.region && String(d.region).toLowerCase().includes(q))
    );
  }, [todayUpdated, query]);

  const displayed = useMemo(() => {
    return [...filtered].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    );
  }, [filtered]);

  const withDataCount = todayUpdated.length;

  const recentUpdaterKeys = useMemo(() => {
    const s = new Set();
    for (const { distributor: d } of recentUpdates) {
      const k = distributorRowKey(d);
      if (k && k !== "—") s.add(k);
    }
    return s;
  }, [recentUpdates]);

  useEffect(() => {
    if (!open) {
      openSessionRef.current = false;
      setRecentUpdates([]);
      return;
    }
    if (openSessionRef.current) return;
    if (!Array.isArray(distributors) || distributors.length === 0) return;

    const since = getAdminPhysicalStockLastSeenAt();
    const list = getPhysicalStockUpdatesSince(distributors, since);
    setRecentUpdates(list);
    onOpened?.();
    openSessionRef.current = true;
  }, [open, distributors, onOpened]);

  const handleAccordion = (code) => (_, isExp) => {
    setExpanded(isExp ? code : false);
  };

  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const distributorsForExport = displayed.filter((d) => !!getRawPhysicalStockFromDistributor(d));
      if (distributorsForExport.length === 0) {
        alert("No physical stock data available for today's updated distributors.");
        return;
      }

      const summaryRows = distributorsForExport.map((d) => {
        const raw = getRawPhysicalStockFromDistributor(d);
        const norm = normalizePhysicalStockPayload(raw || {});
        const totals = aggregatePhysicalStockTotals(norm.rows);
        return {
          distributor_name: d.name || "",
          distributor_code: d.code || d.id || "",
          region: d.region || "",
          report_date: norm.reportDate || "",
          last_saved: norm.updatedAt || "",
          opening_total: totals.opening,
          secondary_total: totals.secondary,
          closing_total: totals.closing,
        };
      });

      const detailRows = [];
      distributorsForExport.forEach((d) => {
        const raw = getRawPhysicalStockFromDistributor(d);
        const norm = normalizePhysicalStockPayload(raw || {});
        norm.rows.forEach((r) => {
          detailRows.push({
            distributor_name: d.name || "",
            distributor_code: d.code || d.id || "",
            region: d.region || "",
            product_sku: r.productSku || "",
            opening_stock_qty: Number(r.openingStockQty) || 0,
            secondary_sale: Number(r.secondarySale) || 0,
            closing_stock_qty: Number(r.closingStockQty) || 0,
          });
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Distributor Totals");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "SKU Details");

      const filename = `Physical_Stock_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Failed to export physical stock excel:", error);
      alert("Failed to export physical stock Excel file.");
    }
  };

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
          background: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
          color: "#fff",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          boxShadow: "0 4px 12px rgba(183, 28, 28, 0.35)",
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
          <WarehouseOutlinedIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", sm: "1.25rem" }, lineHeight: 1.2 }}>
            Physical stock overview
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.25, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {withDataCount} distributor{withDataCount !== 1 ? "s" : ""}
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
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name, code, or region"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
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
        {recentUpdates.length > 0 ? (
          <Alert
            icon={<NotificationsActiveOutlinedIcon fontSize="inherit" />}
            severity="success"
            variant="outlined"
            sx={{
              mb: 2,
              borderRadius: 2,
              alignItems: "flex-start",
              bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
              borderColor: alpha(theme.palette.success.main, 0.45),
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
              New since you last opened this screen ({recentUpdates.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
              {recentUpdates.map(({ distributor: d, updatedAt }) => (
                <Chip
                  key={`${distributorRowKey(d)}-${updatedAt}`}
                  size="small"
                  label={`${d.name || d.code || "—"} · ${formatWhen(updatedAt)}`}
                  color="success"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Alert>
        ) : null}

        {displayed.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">No distributors updated physical stock today.</Typography>
          </Paper>
        ) : (
          displayed.map((d) => {
            const raw = getRawPhysicalStockFromDistributor(d);
            const norm = normalizePhysicalStockPayload(raw || {});
            const distTotals = aggregatePhysicalStockTotals(norm.rows);
            const code = d.code || d.id || "";
            const rowKey = distributorRowKey(d);
            const expandKey = code || rowKey || d.name;
            const isRecent = recentUpdaterKeys.has(rowKey);
            return (
              <Accordion
                key={rowKey || d.name}
                expanded={expanded === expandKey}
                onChange={handleAccordion(expandKey)}
                disableGutters
                sx={{
                  mb: 1,
                  borderRadius: "10px !important",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  borderLeft: isRecent ? "4px solid" : "1px solid",
                  borderLeftColor: isRecent ? "success.main" : "divider",
                  bgcolor: "background.paper",
                  color: "text.primary",
                  boxShadow: (t) => `0 1px 3px ${alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.35 : 0.06)}`,
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ fontSize: 22 }} />}
                  sx={{
                    px: { xs: 1, sm: 1.25 },
                    py: 0.65,
                    minHeight: 0,
                    "& .MuiAccordionSummary-content": { my: 0.5, alignItems: "flex-start" },
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "stretch", sm: "flex-start" },
                      justifyContent: "space-between",
                      gap: { xs: 0.75, sm: 1 },
                      width: "100%",
                      pr: 0.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.875rem",
                          color: "text.primary",
                          lineHeight: 1.25,
                        }}
                      >
                        {d.name || "—"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.15, fontSize: "0.68rem", lineHeight: 1.3 }}
                      >
                        Code <strong>{code || "—"}</strong>
                        {d.region ? (
                          <>
                            {" · "}
                            <strong>{d.region}</strong>
                          </>
                        ) : null}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.2, fontSize: "0.62rem", lineHeight: 1.35 }}
                      >
                        Rpt <strong style={{ color: theme.palette.text.primary }}>{norm.reportDate || "—"}</strong>
                        {" · "}
                        Saved <strong style={{ color: theme.palette.text.primary }}>{formatWhen(norm.updatedAt)}</strong>
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.35,
                        alignItems: "center",
                        flexShrink: 0,
                        justifyContent: { xs: "flex-start", sm: "flex-end" },
                      }}
                    >
                      {raw ? (
                        <>
                          <Chip
                            label={`O ${distTotals.opening.toLocaleString()}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: "0.62rem",
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                          <Chip
                            label={`S ${distTotals.secondary.toLocaleString()}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: "0.62rem",
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                          <Chip
                            label={`C ${distTotals.closing.toLocaleString()}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: "0.62rem",
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        </>
                      ) : (
                        <Chip label="No data" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.62rem" }} />
                      )}
                      {isRecent ? (
                        <Chip
                          label="New"
                          size="small"
                          color="success"
                          sx={{
                            height: 22,
                            fontWeight: 800,
                            fontSize: "0.6rem",
                            "& .MuiChip-label": { px: 0.65 },
                          }}
                        />
                      ) : null}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    pt: 0,
                    px: { xs: 0.5, sm: 1.5 },
                    pb: 2,
                    bgcolor: "action.hover",
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {!raw ? (
                    <Typography color="text.secondary" sx={{ py: 3, px: 2, textAlign: "center" }}>
                      No physical stock submitted yet.
                    </Typography>
                  ) : (
                    <PhysicalStockMatrix
                      rows={norm.rows}
                      readOnly
                      variant="default"
                      maxHeight="min(58vh, 520px)"
                      boldDataValues
                    />
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>

      <Paper
        elevation={12}
        square
        sx={{
          flexShrink: 0,
          px: { xs: 1, sm: 1.5 },
          py: 0.75,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 0.75,
          bgcolor: "background.paper",
        }}
      >
        <Button
          onClick={handleDownloadExcel}
          variant="outlined"
          color="inherit"
          size="small"
          sx={{
            minWidth: 0,
            px: 1.25,
            py: 0.4,
            borderRadius: 1.25,
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "none",
          }}
        >
          Download Excel
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          color="error"
          size="small"
          sx={{
            minWidth: 0,
            px: 1.5,
            py: 0.4,
            borderRadius: 1.25,
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "none",
          }}
        >
          Close
        </Button>
      </Paper>
    </Dialog>
  );
}
