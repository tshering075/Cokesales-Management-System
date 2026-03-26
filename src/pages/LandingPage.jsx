import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const publicUrl = process.env.PUBLIC_URL || "";

/**
 * Public home page (no login required) — required for Google OAuth verification:
 * explains app purpose and uses the same product name as the OAuth consent screen.
 */
export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #fff8e1 0%, #fff 35%, #ffebee 100%)",
        py: { xs: 3, sm: 5 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            borderTop: "4px solid #e53935",
          }}
        >
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Box
              component="img"
              src={`${publicUrl}/app-logo.png`}
              alt="CokeSales Management System"
              sx={{ width: { xs: 120, sm: 140 }, height: "auto", maxWidth: "100%" }}
            />
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#c62828",
                letterSpacing: 0.3,
                fontSize: { xs: "1.35rem", sm: "1.75rem" },
                lineHeight: 1.25,
              }}
            >
              CokeSales Management System
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: "text.secondary", maxWidth: 560, fontWeight: 500 }}
            >
              A business web application for beverage distribution teams to track performance, manage
              orders, and coordinate approvals—built for administrators and distributors.
            </Typography>
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, mb: 1.5, fontWeight: 700, color: "#333" }}>
            What this application does
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
            CokeSales Management System helps your organization:
          </Typography>
          <List dense disablePadding sx={{ mb: 2 }}>
            {[
              "Monitor distributor targets, achieved sales, and balances in one performance overview.",
              "Create and track distributor orders, including status (pending, sent, approved, rejected).",
              "Manage master data such as distributors, targets, schemes, rates, and optional physical stock.",
              "Optionally connect Google Gmail (administrators only) to send order emails and read replies to detect approval or rejection keywords—only when you choose to enable it.",
            ].map((text) => (
              <ListItem key={text} alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                  <CheckCircleOutlineIcon sx={{ color: "#e53935", fontSize: 22 }} />
                </ListItemIcon>
                <ListItemText primary={text} primaryTypographyProps={{ variant: "body2", color: "text.primary" }} />
              </ListItem>
            ))}
          </List>

          <Typography variant="body2" color="text.secondary" paragraph>
            Access to dashboards requires a valid account issued by your organization. Sign in below
            only if you have been given credentials.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#e53935",
                fontWeight: 700,
                textTransform: "none",
                px: 4,
                "&:hover": { bgcolor: "#c62828" },
              }}
            >
              Sign in to CokeSales Management System
            </Button>
          </Stack>

          <Typography
            variant="caption"
            component="nav"
            aria-label="Legal"
            sx={{ display: "block", textAlign: "center", mt: 3, color: "text.secondary" }}
          >
            <Box
              component="a"
              href={`${publicUrl}/privacy-policy.html`}
              sx={{ color: "#c62828", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              Privacy Policy
            </Box>
            {" · "}
            <Box
              component="a"
              href={`${publicUrl}/terms-of-service.html`}
              sx={{ color: "#c62828", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              Terms of Service
            </Box>
          </Typography>

          <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 2, color: "text.disabled" }}>
            © {new Date().getFullYear()} Tashi Beverages Ltd
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
