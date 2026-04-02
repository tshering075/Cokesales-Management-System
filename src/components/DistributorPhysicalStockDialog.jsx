import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  LinearProgress,
  Slide,
  Chip,
  Paper,
  InputAdornment,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PhysicalStockMatrix, { PhysicalStockFifoNote } from "./PhysicalStockMatrix";
import {
  normalizePhysicalStockPayload,
  getRawPhysicalStockFromDistributor,
  rowTotal,
} from "../utils/physicalStockTemplate";
import { updateDistributor } from "../services/supabaseService";
import { getDistributors, saveDistributors } from "../utils/distributorAuth";
import { logActivity, ACTIVITY_TYPES } from "../services/activityService";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function DistributorPhysicalStockDialog({
  open,
  onClose,
  distributorCode,
  distributorName,
  distributor,
  isSupabaseConfigured,
  setDistributor,
  showToast,
  onDialogOpened,
  onPhysicalStockAcknowledged,
}) {
  const theme = useTheme();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(() => normalizePhysicalStockPayload(null).rows);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matrixReady, setMatrixReady] = useState(false);
  const openRef = useRef(false);
  const dialogOpenedNotifiedRef = useRef(false);

  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  useEffect(() => {
    if (open && !openRef.current) {
      setDirty(false);
    }
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      dialogOpenedNotifiedRef.current = false;
      return;
    }
    if (dialogOpenedNotifiedRef.current) return;
    dialogOpenedNotifiedRef.current = true;
    if (typeof onDialogOpened === "function") {
      onDialogOpened();
    }
  }, [open, onDialogOpened]);

  // Paint header/toolbar first; mount the large grid after idle so the dialog opens instantly.
  useEffect(() => {
    if (!open) {
      setMatrixReady(false);
      return;
    }
    setMatrixReady(false);
    let cancelled = false;
    const run = () => {
      if (!cancelled) setMatrixReady(true);
    };
    let id;
    if (typeof window.requestIdleCallback === "function") {
      id = window.requestIdleCallback(run, { timeout: 400 });
    } else {
      id = window.setTimeout(run, 1);
    }
    return () => {
      cancelled = true;
      if (typeof window.requestIdleCallback === "function") {
        window.cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || dirty) return;
    const raw = getRawPhysicalStockFromDistributor(distributor);
    const n = normalizePhysicalStockPayload(raw || {});
    setReportDate(n.reportDate);
    setRows(n.rows);
  }, [open, distributor, dirty]);

  const handleRowsChange = useCallback((next) => {
    setDirty(true);
    setRows(next);
  }, []);

  const handleReportDateChange = (e) => {
    setDirty(true);
    setReportDate(e.target.value);
  };

  const persistLocal = (payload) => {
    const list = getDistributors();
    const idx = list.findIndex((d) => d.code === distributorCode);
    if (idx >= 0) {
      list[idx] = { ...list[idx], physical_stock: payload };
      saveDistributors(list);
    }
  };

  const handleSave = async () => {
    if (!distributorCode) return;
    const payload = normalizePhysicalStockPayload({
      reportDate,
      rows,
    });
    payload.updatedAt = new Date().toISOString();
    setSaving(true);
    try {
      let applied = false;
      let localOnlyWarning = false;
      if (isSupabaseConfigured) {
        try {
          const updated = await updateDistributor(distributorCode, { physical_stock: payload });
          const physical_stock = updated?.physical_stock ?? payload;
          persistLocal(physical_stock);
          setDistributor((prev) => (prev ? { ...prev, ...updated, physical_stock } : prev));
          applied = true;
        } catch (err) {
          const msg = typeof err?.message === "string" ? err.message : "";
          const missingColumn =
            err?.code === "PGRST204" || /physical_stock/i.test(msg);
          if (missingColumn) {
            console.warn("physical_stock column may be missing in Supabase; saving locally only.", err);
            localOnlyWarning = true;
            if (showToast) {
              showToast(
                "Saved on this device only. Add column physical_stock (JSONB) on distributors in Supabase to sync.",
                "warning",
                6000,
                "Saved locally"
              );
            }
            persistLocal(payload);
            setDistributor((prev) => (prev ? { ...prev, physical_stock: payload } : prev));
            applied = true;
          } else {
            throw err;
          }
        }
      }
      if (!applied) {
        persistLocal(payload);
        setDistributor((prev) => (prev ? { ...prev, physical_stock: payload } : prev));
      }
      setDirty(false);
      logActivity(
        ACTIVITY_TYPES.PHYSICAL_STOCK_UPDATED,
        `Physical stock updated for ${distributorName || distributorCode} (${distributorCode})`,
        { distributorCode, reportDate: payload.reportDate }
      );
      if (showToast && !localOnlyWarning) {
        showToast(
          "Your FIFO lots and report date are saved. Admins can see this in Physical Stock.",
          "success",
          4500,
          "Physical stock saved"
        );
      }
      if (typeof onPhysicalStockAcknowledged === "function") {
        onPhysicalStockAcknowledged(payload.updatedAt);
      }
      onClose();
    } catch (e) {
      console.error(e);
      if (showToast) {
        showToast(
          e?.message || "Check your connection and try again. Nothing was saved.",
          "error",
          5000,
          "Could not save physical stock"
        );
      }
    } finally {
      setSaving(false);
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
          bgcolor: "#f0f4f8",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* Top bar — matches distributor accent */}
      <Box
        sx={{
          flexShrink: 0,
          background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
          color: "#fff",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          boxShadow: "0 4px 12px rgba(198, 40, 40, 0.35)",
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
            Physical stock
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.25, fontSize: { xs: "0.75rem", sm: "0.875rem" } }} noWrap>
            {distributorName || "Distributor"} · {distributorCode || "—"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ color: "#fff" }} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Controls strip */}
      <Paper
        elevation={0}
        square
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          bgcolor: "background.paper",
        }}
      >
        <TextField
          label="Report date"
          type="date"
          size="small"
          value={reportDate}
          onChange={handleReportDateChange}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarTodayOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 220,
            "& .MuiOutlinedInput-root": { borderRadius: 2 },
          }}
        />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Chip
            label={`Total units: ${grandTotal.toLocaleString()}`}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === "dark" ? 0.22 : 0.12),
              color: "info.light",
            }}
          />
          {dirty ? <Chip label="Unsaved changes" size="small" color="warning" variant="outlined" /> : null}
        </Box>
      </Paper>

      {/* Scrollable body */}
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
        {!matrixReady ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress sx={{ borderRadius: 1, height: 6, mb: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              Loading stock grid…
            </Typography>
          </Box>
        ) : (
          <PhysicalStockMatrix
            rows={rows}
            readOnly={false}
            onRowsChange={handleRowsChange}
            variant="fullscreen"
            boldDataValues
          />
        )}
      </Box>

      {/* Sticky actions */}
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
          alignItems: "center",
          gap: 1.5,
          bgcolor: "background.paper",
        }}
      >
        <Button onClick={onClose} color="inherit" size="large" disabled={saving} sx={{ minWidth: 100 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || !distributorCode}
          sx={{
            minWidth: 140,
            borderRadius: 2,
            py: 1,
            fontWeight: 700,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.45)}`,
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          Save stock
        </Button>
      </Paper>
    </Dialog>
  );
}
