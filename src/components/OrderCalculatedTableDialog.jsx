import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Read-only dialog: same calculated results layout as CokeCalculator’s results table,
 * built from a saved order’s `data` rows and order-level totals.
 */
export default function OrderCalculatedTableDialog({
  open,
  onClose,
  order,
  distributorName,
  getOrderStatus,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const rows = useMemo(
    () => (Array.isArray(order?.data) ? order.data : []),
    [order]
  );

  const aggregates = useMemo(() => {
    let totalAmountSum = 0;
    let totalTonSum = 0;
    let totalDiscountSum = 0;
    let sumCasesDisplay = 0;
    let totalUC_CSD = 0;
    let totalUC_Water = 0;

    rows.forEach((row) => {
      const cases = num(row.cases);
      const discountAmount = num(row.discountAmount);
      const totalAmount = num(row.totalAmount);
      const totalTon = num(row.totalTon);
      const totalUC = num(row.totalUC);
      const category = row.category || "CSD";

      totalAmountSum += totalAmount;
      totalTonSum += totalTon;
      totalDiscountSum += discountAmount;
      sumCasesDisplay += cases;
      if (category === "Water") totalUC_Water += totalUC;
      else totalUC_CSD += totalUC;
    });

    const csdUC = order?.csdUC != null && order?.csdUC !== "" ? num(order.csdUC) : totalUC_CSD;
    const waterUC = order?.waterUC != null && order?.waterUC !== "" ? num(order.waterUC) : totalUC_Water;

    return {
      totalAmountSum,
      totalTonSum,
      totalDiscountSum,
      sumCasesDisplay,
      totalUC_CSD: csdUC,
      totalUC_Water: waterUC,
    };
  }, [order, rows]);

  const isGelephuGrocery =
    distributorName && String(distributorName).toLowerCase().includes("gelephu grocery");
  const gstRate = isGelephuGrocery ? 0 : 0.05;
  const gstAmount = aggregates.totalAmountSum * gstRate;
  const netTotal = aggregates.totalAmountSum + gstAmount;
  const showGst = gstAmount > 0;

  const orderNo = order?.orderNumber || "—";

  const statusRaw = getOrderStatus && order ? getOrderStatus(order) : order?.status || "pending";
  const status = String(statusRaw || "pending").toLowerCase();

  const headerDate =
    order?.timestamp ||
    order?.created_at ||
    (order?.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : null) ||
    new Date().toLocaleDateString();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#e53935",
          color: "#fff",
          py: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            Order #{orderNo}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, textTransform: "capitalize" }}>
            {status}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "#fff" }} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1, sm: 2 }, mt: 1 }}>
        {rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No line items were saved for this order.
          </Typography>
        ) : (
          <>
            <TableContainer
              component={Paper}
              sx={{
                background: "#fffde7",
                borderRadius: 3,
                boxShadow: 3,
                border: "2px solid #fbc02d",
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 2,
                  pt: 1,
                  pb: 1,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ fontWeight: "bold", color: "#000", fontSize: isMobile ? 12 : 14 }}>
                  {distributorName || "Distributor"}
                </Box>
                <Box sx={{ fontWeight: "bold", fontSize: isMobile ? 12 : 14, textAlign: "center", flexGrow: 1 }}>
                  Order No: {orderNo}
                </Box>
                <Box sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 12, color: "#000" }}>
                  📅 {headerDate}
                </Box>
              </Box>
              <Table size="small" sx={{ width: "100%" }}>
                <TableHead>
                  <TableRow
                    sx={{
                      background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
                      boxShadow: "0 2px 8px rgba(229, 57, 53, 0.3)",
                    }}
                  >
                    {["SKU", isMobile ? "Qty" : "Qty/Cases", "Rate", isMobile ? "Amount" : "Total Amount", isMobile ? "Tons" : "Total Tons", isMobile ? "UC" : "Total UC"].map(
                      (label, i) => (
                        <TableCell
                          key={label}
                          sx={{
                            fontWeight: "bold",
                            color: "#ffffff",
                            fontSize: isMobile ? 9 : 14,
                            textAlign: i === 0 ? "left" : "right",
                            px: isMobile ? 0.5 : 1.5,
                            py: isMobile ? 0.75 : 1.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => {
                    const cases = num(row.cases);
                    const freeCases = num(row.freeCases);
                    const rate = num(row.rate);
                    const totalAmount = num(row.totalAmount);
                    const totalTon = num(row.totalTon);
                    const totalUC = row.totalUC != null && row.totalUC !== "" ? num(row.totalUC) : null;
                    const scheme = row.schemeApplied;
                    const orderedCases = freeCases > 0 ? Math.max(0, cases - freeCases) : cases;

                    return (
                      <TableRow
                        key={i}
                        sx={{
                          background: i % 2 === 0 ? "#f8f9fa" : "#ffffff",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, fontSize: isMobile ? 9 : 13, wordBreak: isMobile ? "break-word" : "normal" }}>
                          {row.sku}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                          {freeCases > 0 ? (
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.4 }}>
                              <Typography component="span" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                                {orderedCases.toLocaleString()}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <Typography component="span" sx={{ color: "#2e7d32", fontSize: isMobile ? 8 : 11, fontWeight: "bold" }}>
                                  +{freeCases}
                                </Typography>
                                <Chip
                                  label="FREE"
                                  size="small"
                                  sx={{
                                    height: isMobile ? 18 : 20,
                                    fontSize: isMobile ? 7 : 9,
                                    backgroundColor: "#4caf50",
                                    color: "white",
                                    fontWeight: "bold",
                                  }}
                                />
                              </Box>
                            </Box>
                          ) : (
                            <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>{cases.toLocaleString()}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                          {scheme?.type === "discount" && num(row.discountAmount) > 0 ? (
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.3 }}>
                              <Typography sx={{ fontSize: isMobile ? 9 : 13, fontWeight: "bold", color: "#1976d2" }}>
                                {(() => {
                                  const discountPerCase = num(scheme.discountAmount);
                                  const discountedRate = rate - discountPerCase;
                                  return isMobile ? discountedRate : discountedRate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
                                })()}
                              </Typography>
                              <Chip
                                label="DISCOUNTED"
                                size="small"
                                sx={{
                                  height: isMobile ? 18 : 20,
                                  fontSize: isMobile ? 7 : 9,
                                  backgroundColor: "#1976d2",
                                  color: "white",
                                  fontWeight: "bold",
                                }}
                              />
                            </Box>
                          ) : (
                            <Typography sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                              {isMobile ? rate : rate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                          {isMobile
                            ? Math.round(totalAmount).toLocaleString()
                            : totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                          {totalTon.toFixed(3)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                          {totalUC != null ? totalUC.toFixed(2) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {aggregates.totalDiscountSum > 0 && (
                    <TableRow
                      sx={{
                        fontWeight: "bold",
                        background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                        borderTop: "2px solid #f44336",
                      }}
                    >
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                        Total Discount:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                        {isMobile
                          ? Math.round(aggregates.totalDiscountSum).toLocaleString()
                          : aggregates.totalDiscountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell colSpan={2} align="right" sx={{ color: "#757575" }}>
                        —
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                      borderTop: "3px solid #ff9800",
                    }}
                  >
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 14, color: "#e65100" }}>Gross Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 14 }}>
                      {aggregates.sumCasesDisplay.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#757575" }}>
                      —
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 14, color: "#d32f2f" }}>
                      {isMobile
                        ? Math.round(aggregates.totalAmountSum).toLocaleString()
                        : aggregates.totalAmountSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 10 : 14 }}>
                      {aggregates.totalTonSum.toFixed(3)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#757575" }}>
                      —
                    </TableCell>
                  </TableRow>

                  {showGst && (
                    <TableRow
                      sx={{
                        fontWeight: "bold",
                        background: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
                        borderTop: "2px solid #ffc107",
                      }}
                    >
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold", color: "#f57c00", fontSize: isMobile ? 9 : 13 }}>
                        GST (5%):
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                        {isMobile ? Math.round(gstAmount).toLocaleString() : gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell colSpan={2} align="right" sx={{ color: "#757575" }}>
                        —
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow
                    sx={{
                      fontWeight: "bold",
                      background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                      borderTop: "3px solid #4caf50",
                    }}
                  >
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold", color: "#1b5e20", fontSize: isMobile ? 10 : 15 }}>
                      Net Total:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", color: "#2e7d32", fontSize: isMobile ? 10 : 15 }}>
                      {isMobile ? Math.round(netTotal).toLocaleString() : netTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2} align="right" sx={{ color: "#757575" }}>
                      —
                    </TableCell>
                  </TableRow>

                  <TableRow sx={{ fontWeight: "bold", background: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
                    <TableCell colSpan={5} align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                      CSD UC:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                      {aggregates.totalUC_CSD.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ fontWeight: "bold", background: "#f5f5f5" }}>
                    <TableCell colSpan={5} align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                      Water UC:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: isMobile ? 9 : 13 }}>
                      {aggregates.totalUC_Water.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {order?.caption ? (
              <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                <strong>Note:</strong> {order.caption}
              </Typography>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
