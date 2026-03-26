import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

/**
 * OrdersSection Component
 * Displays all orders in a table with actions (send email, approve, reject)
 */
function OrdersSection({
  allOrders,
  isMobile,
  sendingEmail,
  onRefresh,
  onSendEmail,
  onApprove,
  onReject,
  onDelete,
  onPreviewOrder,
  getOrderStatus,
  getOrderId,
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState(null);

  const handleDeleteClick = (e, order) => {
    e.stopPropagation();
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (orderToDelete && onDelete) {
      onDelete(orderToDelete);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const isOrderUpdated = (order) => {
    if (order?.isEdited || Number(order?.editedCount || 0) > 0) return true;
    if (!order?.created_at || !order?.updated_at) return false;
    const createdAtMs = Date.parse(order.created_at);
    const updatedAtMs = Date.parse(order.updated_at);
    if (Number.isNaN(createdAtMs) || Number.isNaN(updatedAtMs)) return false;
    // Ignore tiny timestamp jitter from create/update in same transaction.
    return updatedAtMs - createdAtMs > 1000;
  };

  const getUpdatedLabel = (order) => {
    const count = Number(order?.editedCount || 0);
    if (count > 1) return `Updated x${count}`;
    return "Updated";
  };
  return (
    <Paper
      sx={{
        p: { xs: 1.25, sm: 1.75, md: 2.25 },
        borderRadius: 2,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        mb: { xs: 1, sm: 2 },
        minHeight: { xs: 320, sm: 400 },
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 1, sm: 1.5 },
          flexWrap: "wrap",
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 650, color: "text.primary", fontSize: { xs: "0.95rem", sm: "1.15rem" } }}>
          All Orders ({allOrders.length})
        </Typography>
        <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            onClick={onRefresh}
            sx={{ fontSize: { xs: "0.72rem", sm: "0.85rem" } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {allOrders.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" sx={{ color: "grey.700", fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            No orders placed yet.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxWidth: "100%",
            overflowX: "auto",
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#ccc",
              borderRadius: "4px",
            },
          }}
        >
          <Table size={isMobile ? "small" : "medium"} sx={{ minWidth: { xs: 520, sm: 760, md: 820 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#e53935" }}>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                >
                  Date/Time
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                >
                  Distributor
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                  align="right"
                >
                  CSD PC
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                  align="right"
                >
                  Water PC
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                  align="right"
                >
                  Total UC
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                  align="center"
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 0.85, sm: 1.25 },
                    whiteSpace: "nowrap",
                  }}
                  align="center"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allOrders
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((order, idx) => {
                  const status = getOrderStatus(order);
                  const orderId = getOrderId(order);
                  const isSending = sendingEmail === orderId;
                  const updated = isOrderUpdated(order);

                  return (
                    <TableRow
                      key={idx}
                      hover
                      onClick={() => onPreviewOrder(order)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                            {order.timestamp}
                          </Typography>
                          {order.orderNumber && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "primary.main",
                                fontWeight: 600,
                                mt: 0.5,
                                fontSize: { xs: "0.65rem", sm: "0.75rem" },
                              }}
                            >
                              Order #: {order.orderNumber}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          py: { xs: 1, sm: 1.5 },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {order.distributorName || order.distributorCode || "Unknown"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}
                      >
                        {(order.csdPC || 0).toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, py: { xs: 1, sm: 1.5 } }}
                      >
                        {(order.waterPC || 0).toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        {(order.totalUC || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 } }}>
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            size={isMobile ? "small" : "medium"}
                            color={
                              status === "approved"
                                ? "success"
                                : status === "rejected"
                                ? "error"
                                : status === "canceled"
                                ? "warning"
                                : status === "sent"
                                ? "info"
                                : "default"
                            }
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: "0.65rem", sm: "0.75rem" },
                              height: { xs: 20, sm: 24 },
                            }}
                          />
                          {updated && (
                            <Chip
                              label={getUpdatedLabel(order)}
                              size={isMobile ? "small" : "medium"}
                              color="secondary"
                              variant="outlined"
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: "0.6rem", sm: "0.72rem" },
                                height: { xs: 20, sm: 24 },
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()} sx={{ py: { xs: 0.5, sm: 1 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: { xs: 0.25, sm: 0.5 },
                            justifyContent: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <Tooltip title="Send Email for Approval">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSendEmail(order);
                              }}
                              disabled={isSending || status === "canceled" || status === "approved" || status === "rejected"}
                            >
                              {isSending ? <CircularProgress size={16} /> : <EmailIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve Order">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprove(order);
                              }}
                              disabled={status === "approved" || status === "canceled"}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject Order">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(order);
                              }}
                              disabled={status === "rejected" || status === "canceled"}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Order">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => handleDeleteClick(e, order)}
                              sx={{ ml: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Order?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this order? This action cannot be undone.
            {orderToDelete && (
              <>
                <br />
                <br />
                <strong>Order Details:</strong>
                <br />
                Distributor: {orderToDelete.distributorName || orderToDelete.distributorCode || "Unknown"}
                <br />
                Date: {orderToDelete.timestamp}
                {orderToDelete.orderNumber && (
                  <>
                    <br />
                    Order #: {orderToDelete.orderNumber}
                  </>
                )}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default OrdersSection;
