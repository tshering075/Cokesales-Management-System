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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Avatar,
  Card,
  CardContent,
  Chip,
  Fade,
  InputAdornment,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import { getRecipientEmails, saveRecipientEmails, getSenderEmail } from "../services/emailService";

function EmailRecipientsDialog({ open, onClose }) {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const loadedEmails = getRecipientEmails();
      setEmails(loadedEmails);
      setNewEmail("");
      setError("");
    }
  }, [open]);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(newEmail.trim())) {
      setError("Invalid email format");
      return;
    }
    if (emails.includes(newEmail.trim())) {
      setError("Email already exists in the list");
      return;
    }
    setEmails([...emails, newEmail.trim()]);
    setNewEmail("");
    setError("");
  };

  const handleDeleteEmail = (emailToDelete) => {
    setEmails(emails.filter(email => email !== emailToDelete));
  };

  const handleSave = () => {
    saveRecipientEmails(emails);
    onClose();
  };

  return (
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
              <EmailIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "white" }}>
                Manage Email Recipients
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Configure email recipients for order approval notifications
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
          {/* Sender Email Info */}
          <Card sx={{ mb: 3, boxShadow: 3, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Sender Email (Auto-detected)
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  The logged-in admin's email address will be used as the sender:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                  {getSenderEmail() || "Not logged in"}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", fontStyle: "italic" }}>
                  This is automatically set from your login credentials.
                </Typography>
              </Paper>
            </CardContent>
          </Card>

          {/* Receiver Email Addresses */}
          <Card sx={{ boxShadow: 3, borderLeft: "4px solid #d61916" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <EmailIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Receiver Email Addresses
                </Typography>
                {emails.length > 0 && (
                  <Chip label={emails.length} color="primary" size="small" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add email addresses of recipients who should receive order approval requests.
                All emails in this list will receive the order approval emails.
              </Typography>
              
              <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                <TextField
                  fullWidth
                  size="medium"
                  label="Email Address"
                  placeholder="manager@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddEmail();
                    }
                  }}
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddEmail}
                  sx={{
                    minWidth: 140,
                    bgcolor: "#d61916",
                    "&:hover": {
                      bgcolor: "#b01512",
                    },
                  }}
                >
                  Add Email
                </Button>
              </Box>

              {emails.length > 0 ? (
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: "auto" }}>
                  <List dense>
                    {emails.map((email, idx) => (
                      <Box key={idx}>
                        <Fade in={true} timeout={300}>
                          <ListItem
                            sx={{
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <EmailIcon fontSize="small" color="action" />
                                  <Typography variant="body1">{email}</Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDeleteEmail(email)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Fade>
                        {idx < emails.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </Paper>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <EmailIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No email addresses added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add email addresses above to receive order approval requests.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: "white", borderTop: "1px solid #e0e0e0", px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            bgcolor: "#d61916",
            "&:hover": {
              bgcolor: "#b01512",
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EmailRecipientsDialog;
