import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";

export default function OrdersDialog({
  open,
  onClose,
  orders,
  distributorName,
  onCancelOrder,
  cancelingOrderId,
  getOrderStatus,
  getOrderKey,
  onEditOrder,
  onOrderRowClick,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#e53935", color: "#fff" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Order List - {distributorName}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
        {orders.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No orders found
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: { xs: "70vh", sm: "60vh" }, overflow: "auto" }}>
            <Table size={isMobile ? "small" : "medium"} stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>CSD PC</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>CSD UC</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Water PC</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Water UC</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, idx) => (
                  <TableRow
                    key={getOrderKey ? getOrderKey(order) : idx}
                    hover
                    onClick={() => onOrderRowClick && onOrderRowClick(order)}
                    sx={{
                      "&:nth-of-type(even)": { bgcolor: "#f9f9f9" },
                      ...(onOrderRowClick ? { cursor: "pointer" } : {}),
                    }}
                  >
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.orderNumber || `#${orders.length - idx}`}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.timestamp || order.created_at || "N/A"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.csdPC || 0}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.csdUC ? parseFloat(order.csdUC).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.waterPC || 0}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 700 }}>
                      {order.waterUC ? parseFloat(order.waterUC).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {(() => {
                        const status = (getOrderStatus ? getOrderStatus(order) : order?.status || "pending").toLowerCase();
                        const color =
                          status === "approved"
                            ? "success"
                            : status === "rejected"
                            ? "error"
                            : status === "canceled"
                            ? "warning"
                            : status === "sent"
                            ? "info"
                            : "default";
                        return (
                          <Chip
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            size="small"
                            color={color}
                            sx={{ fontWeight: 600 }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      {(() => {
                        const status = (getOrderStatus ? getOrderStatus(order) : order?.status || "pending").toLowerCase();
                        const cancellable = status === "pending" || status === "sent";
                        const orderId = order?.id || order?.orderNumber || idx;
                        return (
                          <Tooltip title={cancellable ? "Cancel this order" : "Only pending/sent orders can be canceled"}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={!cancellable || !onCancelOrder || cancelingOrderId === orderId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelOrder && onCancelOrder(order);
                                }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })()}
                      {(() => {
                        const status = (getOrderStatus ? getOrderStatus(order) : order?.status || "pending").toLowerCase();
                        const editable = status !== "approved";
                        return (
                          <Tooltip title={editable ? "Edit and resubmit this order" : "Approved orders cannot be edited"}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={!editable || !onEditOrder}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditOrder && onEditOrder(order);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
