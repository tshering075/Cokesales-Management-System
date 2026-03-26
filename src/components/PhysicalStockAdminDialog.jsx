import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import PhysicalStockMatrix, { PhysicalStockFifoNote } from "./PhysicalStockMatrix";
import {
  normalizePhysicalStockPayload,
  getRawPhysicalStockFromDistributor,
  rowTotal,
} from "../utils/physicalStockTemplate";

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

export default function PhysicalStockAdminDialog({ open, onClose, distributors }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);

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

  const withDataCount = useMemo(
    () => sorted.filter((d) => !!getRawPhysicalStockFromDistributor(d)).length,
    [sorted]
  );

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
          bgcolor: "#f0f4f8",
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
          bgcolor: "#fff",
        }}
      >
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
        <PhysicalStockFifoNote />
        {filtered.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "#fff" }}>
            <Typography color="text.secondary">No distributors match your search.</Typography>
          </Paper>
        ) : (
          filtered.map((d) => {
            const raw = getRawPhysicalStockFromDistributor(d);
            const norm = normalizePhysicalStockPayload(raw || {});
            const grandTotal = norm.rows.reduce((s, r) => s + rowTotal(r), 0);
            const code = d.code || d.id || "";
            return (
              <Accordion
                key={code || d.name}
                expanded={expanded === code}
                onChange={handleAccordion(code)}
                disableGutters
                sx={{
                  mb: 1.5,
                  borderRadius: "12px !important",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2,
                    py: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", width: "100%", pr: 1, gap: 0.75 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{d.name || "—"}</Typography>
                      <Chip label={code || "—"} size="small" variant="outlined" />
                      {raw ? (
                        <Chip
                          label={`${grandTotal.toLocaleString()} units`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: "#e3f2fd" }}
                        />
                      ) : (
                        <Chip label="No data" size="small" color="default" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      Report date: <strong>{norm.reportDate || "—"}</strong>
                      {" · "}
                      Updated: {formatWhen(norm.updatedAt)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: { xs: 0.5, sm: 1.5 }, pb: 2, bgcolor: "#fafafa" }}>
                  {!raw ? (
                    <Typography color="text.secondary" sx={{ py: 3, px: 2, textAlign: "center" }}>
                      No physical stock submitted yet.
                    </Typography>
                  ) : (
                    <PhysicalStockMatrix
                      rows={norm.rows}
                      readOnly
                      variant="fullscreen"
                      maxHeight="min(52vh, 440px)"
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
          bgcolor: "#fff",
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            minWidth: 120,
            borderRadius: 2,
            py: 1,
            fontWeight: 700,
            bgcolor: "#d32f2f",
            "&:hover": { bgcolor: "#b71c1c" },
          }}
        >
          Close
        </Button>
      </Paper>
    </Dialog>
  );
}
