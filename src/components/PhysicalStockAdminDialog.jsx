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
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import UpdateIcon from "@mui/icons-material/Update";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PhysicalStockMatrix, { PhysicalStockFifoNote } from "./PhysicalStockMatrix";
import {
  normalizePhysicalStockPayload,
  getRawPhysicalStockFromDistributor,
  rowTotal,
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
  const [sortBy, setSortBy] = useState("name");
  const [recentUpdates, setRecentUpdates] = useState([]);
  const openSessionRef = useRef(false);

  const sorted = useMemo(() => {
    const list = Array.isArray(distributors) ? [...distributors] : [];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    return list;
  }, [distributors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.code && String(d.code).toLowerCase().includes(q)) ||
        (d.region && String(d.region).toLowerCase().includes(q))
    );
  }, [sorted, query]);

  const displayed = useMemo(() => {
    const arr = [...filtered];
    const rawOf = (d) => getRawPhysicalStockFromDistributor(d);
    if (sortBy === "updated") {
      arr.sort((a, b) => {
        const ua = rawOf(a)?.updatedAt || "";
        const ub = rawOf(b)?.updatedAt || "";
        if (ua !== ub) return ub.localeCompare(ua);
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      });
    } else if (sortBy === "stock") {
      arr.sort((a, b) => {
        const ha = rawOf(a) ? 1 : 0;
        const hb = rawOf(b) ? 1 : 0;
        if (ha !== hb) return hb - ha;
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      });
    } else {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    }
    return arr;
  }, [filtered, sortBy]);

  const withDataCount = useMemo(
    () => sorted.filter((d) => !!getRawPhysicalStockFromDistributor(d)).length,
    [sorted]
  );

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
            Read-only · {sorted.length} distributor{sorted.length !== 1 ? "s" : ""} · {withDataCount} with submitted stock
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
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
              Sort
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={sortBy}
              onChange={(_, v) => v && setSortBy(v)}
              aria-label="Sort distributors"
            >
              <ToggleButton value="name" aria-label="By name">
                <SortByAlphaIcon sx={{ fontSize: 18, mr: 0.5 }} />
                Name
              </ToggleButton>
              <ToggleButton value="updated" aria-label="By last update">
                <UpdateIcon sx={{ fontSize: 18, mr: 0.5 }} />
                Last update
              </ToggleButton>
              <ToggleButton value="stock" aria-label="With stock first">
                <Inventory2OutlinedIcon sx={{ fontSize: 18, mr: 0.5 }} />
                With stock first
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.5 }}>
              These distributors saved physical stock after your last review. Rows below are highlighted with a green edge.
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

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
            borderColor: alpha(theme.palette.info.main, 0.25),
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            How to read
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.55 }}>
            Expand a distributor to see FIFO lots (Lot 1 = dispatch first). Numbers are cases per SKU. Use{" "}
            <strong>Last update</strong> to review who filed most recently.
          </Typography>
        </Paper>

        <PhysicalStockFifoNote />

        {displayed.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography color="text.secondary">No distributors match your search.</Typography>
          </Paper>
        ) : (
          displayed.map((d) => {
            const raw = getRawPhysicalStockFromDistributor(d);
            const norm = normalizePhysicalStockPayload(raw || {});
            const grandTotal = norm.rows.reduce((s, r) => s + rowTotal(r), 0);
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
                  mb: 1.5,
                  borderRadius: "12px !important",
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
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: 1.25,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", width: "100%", pr: 1, gap: 1 }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1.4fr) auto auto auto" },
                        gap: { xs: 1, sm: 1.5 },
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: "text.primary", lineHeight: 1.3 }}>
                          {d.name || "—"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          Code <strong>{code || "—"}</strong>
                          {d.region ? (
                            <>
                              {" · "}
                              Region <strong>{d.region}</strong>
                            </>
                          ) : null}
                        </Typography>
                      </Box>
                      {d.region ? (
                        <Chip
                          label={d.region}
                          size="small"
                          sx={{
                            display: { xs: "none", sm: "inline-flex" },
                            fontWeight: 700,
                            justifySelf: "end",
                            bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.25 : 0.12),
                          }}
                        />
                      ) : (
                        <span />
                      )}
                      {raw ? (
                        <Chip
                          label={`${grandTotal.toLocaleString()} units`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            justifySelf: { xs: "start", sm: "end" },
                            bgcolor: theme.palette.mode === "dark" ? theme.palette.info.dark : theme.palette.info.main,
                            color: theme.palette.getContrastText(
                              theme.palette.mode === "dark" ? theme.palette.info.dark : theme.palette.info.main
                            ),
                          }}
                        />
                      ) : (
                        <Chip label="No data" size="small" variant="outlined" sx={{ justifySelf: { xs: "start", sm: "end" } }} />
                      )}
                      {isRecent ? (
                        <Chip
                          label="Updated"
                          size="small"
                          color="success"
                          sx={{ display: { xs: "none", md: "inline-flex" }, fontWeight: 800, justifySelf: "end" }}
                        />
                      ) : (
                        <span />
                      )}
                    </Box>
                    <Divider flexItem sx={{ borderColor: "divider" }} />
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        typography: "caption",
                        color: "text.secondary",
                      }}
                    >
                      <span>
                        Report date: <strong style={{ color: theme.palette.text.primary }}>{norm.reportDate || "—"}</strong>
                      </span>
                      <span>
                        Last saved: <strong style={{ color: theme.palette.text.primary }}>{formatWhen(norm.updatedAt)}</strong>
                      </span>
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
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          bgcolor: "background.paper",
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          color="error"
          size="large"
          sx={{
            minWidth: 120,
            borderRadius: 2,
            py: 1,
            fontWeight: 700,
          }}
        >
          Close
        </Button>
      </Paper>
    </Dialog>
  );
}
