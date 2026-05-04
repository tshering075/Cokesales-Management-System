import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import { getRecipientEmails, getSenderEmail } from "../services/emailService";
import AppSnackbar from "./AppSnackbar";

function getDistributorPrimaryName(name) {
  const cleaned = String(name || "Distributor")
    .trim()
    .replace(/^(m\s*\/\s*s|m\s*s|ms|m\/s)\.?\s*/i, "")
    .replace(/^[.\-:/\s]+/, "")
    .trim();
  const firstName = cleaned.split(/\s+/).find(Boolean);
  return firstName || "Distributor";
}

function buildOrderEmailSubject(order) {
  const primaryName = getDistributorPrimaryName(order?.distributorName || order?.distributorCode);
  const orderNumber = order?.orderNumber || "";
  return orderNumber ? `${primaryName} Order #${orderNumber}` : primaryName;
}

function OrderEmailDialog({ open, onClose, order, onSend }) {
  const [customMessage, setCustomMessage] = useState("");
  const [srGeneralManager, setSrGeneralManager] = useState("");
  const [otherManagers, setOtherManagers] = useState([]);
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
    duration: 3600,
  });

  const showToast = (message, severity = "success", duration = 3600) => {
    setToast({ open: true, message, severity, duration });
  };

  // Closing the dialog while OAuth is in progress can leave gmailConnecting true forever
  // (signInGmail may not resolve until the user finishes or dismisses the flow).
  useEffect(() => {
    if (!open) {
      setGmailConnecting(false);
      setSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && order) {
      // Load recipients from storage
      const allRecipients = getRecipientEmails();
      
      // Separate Sr. General Manager (first email or designated)
      // For now, use first email as Sr. General Manager, rest as other managers
      if (allRecipients.length > 0) {
        setSrGeneralManager(allRecipients[0]);
        setOtherManagers(allRecipients.slice(1));
      } else {
        setSrGeneralManager("");
        setOtherManagers([]);
      }
      
      // Set default message
      const distributorName = order.distributorName || order.distributorCode || "Distributor";
      const orderCaption =
        (order.caption || "").trim() ||
        (Array.isArray(order.data) && typeof order.data[0]?.orderCaption === "string" ? order.data[0].orderCaption.trim() : "");
      const captionBlock = orderCaption
        ? `\n\n${orderCaption}\n`
        : "";
      setCustomMessage(`Dear Senior General Manager,\n\nPlease review and approve the order from ${distributorName}.${captionBlock}\nThank you.`);
      setError("");
      
      // Load sender email asynchronously (React 19 compatibility - can't use async values directly in render)
      getSenderEmail().then(email => {
        setSenderEmail(email || 'Not logged in');
      }).catch(() => {
        setSenderEmail(localStorage.getItem('admin_email') || 'Not logged in');
      });
      
      // Check Gmail connection status (with delay to allow OAuth redirect to complete)
      setTimeout(() => {
        checkGmailConnection();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  // Check Gmail connection when component mounts (in case of OAuth redirect)
  useEffect(() => {
    // Check if we're returning from OAuth redirect
    const checkAfterRedirect = async () => {
      // Wait longer for gapi to initialize after redirect (redirect takes time)
      setTimeout(async () => {
        try {
      const { isGmailConfigured, isSignedInGmail } = await import('../services/gmailService');
      if (await isGmailConfigured()) {
        const signedIn = await isSignedInGmail();
            console.log('Checking Gmail after redirect, signed in:', signedIn);
            if (signedIn) {
              setGmailConnected(true);
              console.log('✅ Gmail connection detected after OAuth redirect');
              showToast("Gmail connected successfully. You can now send emails via Gmail API.", "success", 4200);
            }
          }
        } catch (error) {
          console.error('Error checking Gmail after redirect:', error);
        }
      }, 2000); // Wait 2 seconds for redirect to complete and gapi to initialize
    };
    
    checkAfterRedirect();
  }, []);

  const checkGmailConnection = async () => {
    try {
      const { isGmailConfigured, isSignedInGmail } = await import('../services/gmailService');
      if (await isGmailConfigured()) {
        // Wait a moment for gapi to be ready (especially after redirect)
        await new Promise(resolve => setTimeout(resolve, 300));
        const signedIn = await isSignedInGmail();
        console.log('Gmail connection status:', signedIn);
        setGmailConnected(signedIn);
        
        // If connected and wasn't before, show success message
        const wasConnected = gmailConnected;
        if (signedIn && !wasConnected) {
          showToast("Gmail connected successfully. You can now send emails via Gmail API.", "success", 4200);
        }
      } else {
        setGmailConnected(false);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setGmailConnected(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    setError("");
    try {
      const { isGmailConfigured, signInGmail } = await import('../services/gmailService');
      
      // Check if Gmail is configured
      if (!(await isGmailConfigured())) {
        setError('Gmail API not configured. Please configure Gmail credentials in the app settings (Admin Dashboard > Settings).');
        setGmailConnecting(false);
        return;
      }

      console.log('Attempting to sign in to Gmail...');
      
      // Initialize and sign in
      await signInGmail();
      
      // Verify connection
      const { isSignedInGmail } = await import('../services/gmailService');
      const signedIn = await isSignedInGmail();
      
      if (signedIn) {
        setGmailConnected(true);
        showToast("Gmail connected successfully. You can now send emails via Gmail API.", "success", 4200);
      } else {
        throw new Error('Sign-in completed but connection not verified');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      let errorMessage = error.message || 'Failed to connect Gmail';
      
      // Provide more helpful error messages
      if (error.message?.includes('popup_closed_by_user') || error.message?.includes('popup was closed')) {
        errorMessage = 'The sign-in popup was closed. Please click "Connect Gmail" again and complete the sign-in in the popup window. Make sure to click "Allow" to grant permissions.';
      } else if (error.message?.includes('popup_blocked_by_browser') || error.message?.includes('blocked the sign-in popup')) {
        errorMessage = 'Your browser blocked the sign-in popup. Please:\n1. Check for a popup blocker icon in your address bar\n2. Allow popups for localhost:3000\n3. Try again';
      } else if (error.message?.includes('access_denied')) {
        errorMessage = 'Access denied. Please grant the required permissions (Gmail read and send) to connect Gmail.';
      } else if (error.message?.includes('not configured')) {
        errorMessage = 'Gmail API not configured. Please set gmail_client_id and gmail_api_key in localStorage.';
      } else if (error.message?.includes('test user')) {
        errorMessage = 'Your email is not added as a test user. Please add your email in Google Cloud Console > APIs & Services > OAuth consent screen > Test users';
      } else if (error.message?.includes('invalid request') || error.message?.includes('invalid_request')) {
        errorMessage = 'Invalid OAuth request. Please check:\n1. Authorized JavaScript origins includes http://localhost:3000\n2. Authorized redirect URIs includes http://localhost:3000\n3. OAuth consent screen is configured\n4. See GMAIL_OAUTH_TROUBLESHOOTING.md for detailed steps';
      }
      
      setError(errorMessage);
      setGmailConnected(false);
    } finally {
      setGmailConnecting(false);
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddManager = () => {
    if (!newManagerEmail.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(newManagerEmail.trim())) {
      setError("Invalid email format");
      return;
    }
    if (otherManagers.includes(newManagerEmail.trim()) || srGeneralManager === newManagerEmail.trim()) {
      setError("Email already exists in the list");
      return;
    }
    setOtherManagers([...otherManagers, newManagerEmail.trim()]);
    setNewManagerEmail("");
    setError("");
  };

  const handleRemoveManager = (emailToRemove) => {
    setOtherManagers(otherManagers.filter(email => email !== emailToRemove));
  };

  const handleSend = async () => {
    if (!srGeneralManager || !srGeneralManager.trim()) {
      setError("Senior General Manager email is required");
      return;
    }
    if (!isValidEmail(srGeneralManager.trim())) {
      setError("Invalid Senior General Manager email format");
      return;
    }
    if (!customMessage.trim()) {
      setError("Please enter a message");
      return;
    }

    setError("");
    setSending(true);

    try {
      const subject = buildOrderEmailSubject(order);
      
      await onSend({
        to: srGeneralManager.trim(),
        cc: otherManagers.filter(e => e.trim()).join(", "),
        subject: subject,
        message: customMessage.trim(),
        order: order
      });

      onClose();
    } catch (err) {
      const errorMessage = err?.message || err?.error_description || err?.toString() || 'Unknown error occurred';
      setError("Failed to send email: " + errorMessage);
      console.error('Email sending error details:', err);
    } finally {
      setSending(false);
    }
  };

  if (!order) return null;

  const distributorName = order.distributorName || order.distributorCode || "Distributor";
  const subjectPreview = buildOrderEmailSubject(order);

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#d61916",
          color: "white",
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 48, height: 48 }}>
              <SendIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "white" }}>
                Send Order for Approval
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                {distributorName}'s Order
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: "#f5f5f5" }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ p: 3 }}>
          {/* Sender Info */}
          <Card sx={{ mb: 3, boxShadow: 2, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  From (Sender)
                </Typography>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: "#e8f5e9",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                  {senderEmail || "Not logged in"}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                  Your email address will be used as the sender
                </Typography>
              </Paper>
            </CardContent>
          </Card>

          {/* Gmail Connection Status */}
          <Card sx={{ mb: 3, boxShadow: 2, borderLeft: `4px solid ${gmailConnected ? "#4caf50" : "#ff9800"}` }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <EmailIcon color={gmailConnected ? "success" : "warning"} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Gmail Connection
                  </Typography>
                </Box>
                <Chip
                  label={gmailConnected ? "Connected" : "Not Connected"}
                  color={gmailConnected ? "success" : "warning"}
                  size="small"
                />
              </Box>
              {gmailConnected ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Gmail is connected. Emails will be sent via Gmail API with automatic reply monitoring.
                </Alert>
              ) : (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Gmail is not connected. Click below to connect Gmail for automatic email sending and reply monitoring.
                  </Alert>
                  <Button
                    variant="contained"
                    startIcon={gmailConnecting ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    sx={{
                      bgcolor: "#d61916",
                      "&:hover": { bgcolor: "#b01512" },
                    }}
                  >
                    {gmailConnecting ? "Connecting..." : "Connect Gmail"}
                  </Button>
                  <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                    You can also connect Gmail when sending your first email. The Google sign-in popup will appear automatically.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card sx={{ mb: 3, boxShadow: 2, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <EmailIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recipients
                </Typography>
              </Box>

              {/* Senior General Manager (TO) */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "#d61916" }}>
                  Senior General Manager (Primary Recipient) *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="sr.general.manager@company.com"
                  value={srGeneralManager}
                  onChange={(e) => setSrGeneralManager(e.target.value)}
                  type="email"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ bgcolor: "white" }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  This person will receive the email directly and their approval is required
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Other Managers (CC) */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Other Managers (CC - Tagged for Information)
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="manager@company.com"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddManager();
                      }
                    }}
                    type="email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ bgcolor: "white" }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddManager}
                    sx={{ minWidth: 100 }}
                  >
                    Add
                  </Button>
                </Box>

                {otherManagers.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 1, bgcolor: "white" }}>
                    <List dense>
                      {otherManagers.map((email, idx) => (
                        <ListItem
                          key={idx}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveManager(email)}
                              color="error"
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">{email}</Typography>
                                <Chip label="CC" size="small" color="info" variant="outlined" sx={{ ml: 1, fontSize: "0.65rem", height: 18 }} />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Email Subject */}
          <Card sx={{ mb: 3, boxShadow: 2, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Subject
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: "#fff3e0",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, color: "#e65100" }}>
                  {subjectPreview}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                  Subject uses the distributor primary name and order number
                </Typography>
              </Paper>
            </CardContent>
          </Card>

          {/* Custom Message */}
          <Card sx={{ mb: 3, boxShadow: 2, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Message *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Write your message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                required
                sx={{ bgcolor: "white" }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                This message will be included in the email body along with the order details
              </Typography>
            </CardContent>
          </Card>

          {/* Order Preview Info */}
          <Card sx={{ boxShadow: 2, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Order Information
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip label={`Distributor: ${distributorName}`} size="small" />
                <Chip label={`Date: ${new Date(order.timestamp || Date.now()).toLocaleDateString()}`} size="small" />
                {order.totalUC && (
                  <Chip label={`Total UC: ${order.totalUC.toFixed(2)}`} size="small" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                Order details will be automatically attached as PNG image
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: "white", borderTop: "1px solid #e0e0e0", px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          disabled={sending || !srGeneralManager || !customMessage.trim()}
          sx={{
            bgcolor: "#d61916",
            "&:hover": {
              bgcolor: "#b01512",
            },
          }}
        >
          {sending ? "Sending..." : "Send Email"}
        </Button>
      </DialogActions>
    </Dialog>
    <AppSnackbar
      open={toast.open}
      message={toast.message}
      severity={toast.severity}
      autoHideDuration={toast.duration}
      onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    />
    </>
  );
}

export default OrderEmailDialog;
