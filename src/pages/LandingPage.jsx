import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  Paper,
  Grid,
  Card,
  CardContent,
  Link,
  Toolbar,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import HubIcon from "@mui/icons-material/Hub";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LoginIcon from "@mui/icons-material/Login";

const publicUrl = process.env.PUBLIC_URL || "";

const FEATURES = [
  {
    icon: BarChartIcon,
    title: "Performance overview",
    body:
      "Monitor distributor targets, achieved sales, and balances in one place—so teams see how they are tracking.",
  },
  {
    icon: AssignmentTurnedInIcon,
    title: "Orders & approvals",
    body:
      "Create and track distributor orders with clear status: pending, sent, approved, or rejected.",
  },
  {
    icon: HubIcon,
    title: "Master data",
    body:
      "Manage distributors, targets, schemes, product rates, and optional physical stock from the admin side.",
  },
  {
    icon: MailOutlineIcon,
    title: "Optional Gmail (admins)",
    body:
      "Administrators may connect Google Gmail to send order emails and read replies to detect approval or rejection keywords—only when you choose to enable it.",
  },
];

/**
 * Public home page (no login required) — required for Google OAuth verification:
 * explains app purpose and uses the same product name as the OAuth consent screen.
 */
export default function LandingPage() {
  const theme = useTheme();
  const brand = theme.palette.error.main;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: alpha(theme.palette.warning.light, 0.12),
        backgroundImage: `radial-gradient(ellipse 120% 80% at 50% -20%, ${alpha(brand, 0.08)} 0%, transparent 55%), linear-gradient(180deg, ${alpha("#fff", 0.95)} 0%, ${alpha(theme.palette.grey[50], 1)} 40%, ${alpha(theme.palette.error.light, 0.06)} 100%)`,
      }}
    >
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: alpha(theme.palette.background.paper, 0.88),
          backdropFilter: "saturate(140%) blur(10px)",
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
          <Toolbar
            disableGutters
            variant="dense"
            sx={{ minHeight: { xs: 56, sm: 60 }, justifyContent: "space-between", gap: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
              <Box
                component="img"
                src={`${publicUrl}/app-logo.png`}
                alt=""
                sx={{ height: { xs: 36, sm: 40 }, width: "auto", display: "block", flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, color: "error.dark", lineHeight: 1.2, letterSpacing: 0.2 }}
                  noWrap
                >
                  CokeSales
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                  Management System
                </Typography>
              </Box>
            </Stack>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="medium"
              startIcon={<LoginIcon />}
              sx={{
                flexShrink: 0,
                fontWeight: 700,
                textTransform: "none",
                px: { xs: 2, sm: 2.5 },
                bgcolor: brand,
                boxShadow: `0 4px 14px ${alpha(brand, 0.35)}`,
                "&:hover": { bgcolor: theme.palette.error.dark, boxShadow: `0 6px 18px ${alpha(brand, 0.4)}` },
              }}
            >
              Sign in
            </Button>
          </Toolbar>
        </Container>
      </Box>

      <Box component="main" sx={{ flex: 1, py: { xs: 3, sm: 5, md: 6 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack spacing={{ xs: 4, md: 5 }} alignItems="center">
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 720,
                mx: "auto",
                p: { xs: 3, sm: 4, md: 5 },
                borderRadius: 3,
                textAlign: "center",
                border: "1px solid",
                borderColor: alpha(brand, 0.2),
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}, 0 0 0 1px ${alpha(brand, 0.06)} inset`,
                background: `linear-gradient(165deg, ${alpha("#fff", 1)} 0%, ${alpha(theme.palette.grey[50], 0.9)} 100%)`,
              }}
            >
              <Box
                component="img"
                src={`${publicUrl}/app-logo.png`}
                alt="CokeSales Management System"
                sx={{
                  width: { xs: 100, sm: 120, md: 132 },
                  height: "auto",
                  maxWidth: "100%",
                  mb: 2,
                  filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))",
                }}
              />
              <Typography
                component="h1"
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: "error.dark",
                  letterSpacing: -0.5,
                  fontSize: { xs: "1.65rem", sm: "2rem", md: "2.25rem" },
                  lineHeight: 1.2,
                  mb: 1.5,
                }}
              >
                CokeSales Management System
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "text.secondary",
                  maxWidth: 520,
                  mx: "auto",
                  fontWeight: 500,
                  lineHeight: 1.65,
                  fontSize: { xs: "0.95rem", sm: "1.0625rem" },
                }}
              >
                A business web application for beverage distribution teams to track performance, manage orders,
                and coordinate approvals—built for administrators and distributors.
              </Typography>
            </Paper>

            <Box sx={{ width: "100%", maxWidth: 960 }}>
              <Typography
                variant="overline"
                sx={{ display: "block", textAlign: "center", color: "text.secondary", fontWeight: 700, letterSpacing: 1.2, mb: 1 }}
              >
                Capabilities
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                sx={{ textAlign: "center", fontWeight: 800, color: "text.primary", mb: 0.5 }}
              >
                What this application does
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", maxWidth: 560, mx: "auto", mb: 3 }}
              >
                CokeSales Management System helps your organization:
              </Typography>

              <Grid container spacing={2.5}>
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <Grid key={title} size={{ xs: 12, sm: 6 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        borderRadius: 2,
                        borderColor: alpha(theme.palette.divider, 0.9),
                        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
                        "&:hover": {
                          borderColor: alpha(brand, 0.35),
                          boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.06)}`,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1.5,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: alpha(brand, 0.1),
                              color: "error.dark",
                              flexShrink: 0,
                            }}
                          >
                            <Icon sx={{ fontSize: 24 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.75, lineHeight: 1.3 }}>
                              {title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                              {body}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Paper
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 640,
                mx: "auto",
                p: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                bgcolor: alpha(brand, 0.06),
                border: "1px solid",
                borderColor: alpha(brand, 0.12),
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <CheckCircleOutlineIcon sx={{ color: "error.main", mt: 0.15, flexShrink: 0 }} />
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.65 }}>
                  Access to dashboards requires a valid account issued by your organization. Sign in only if you
                  have been given credentials.
                </Typography>
              </Stack>
            </Paper>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
              sx={{ width: "100%", pt: 1 }}
            >
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                startIcon={<LoginIcon />}
                sx={{
                  bgcolor: brand,
                  fontWeight: 800,
                  textTransform: "none",
                  px: { xs: 3, sm: 4 },
                  py: 1.25,
                  fontSize: "1rem",
                  minWidth: { sm: 280 },
                  boxShadow: `0 6px 20px ${alpha(brand, 0.35)}`,
                  "&:hover": { bgcolor: theme.palette.error.dark },
                }}
              >
                Sign in to CokeSales Management System
              </Button>
            </Stack>

            <Divider sx={{ width: "100%", maxWidth: 400, my: 1 }} />

            <Stack spacing={2} alignItems="center" sx={{ pb: 2 }}>
              <Typography variant="caption" component="nav" aria-label="Legal" color="text.secondary">
                <Link
                  href={`${publicUrl}/privacy-policy.html`}
                  underline="hover"
                  color="error.dark"
                  fontWeight={600}
                  sx={{ mx: 0.75 }}
                >
                  Privacy Policy
                </Link>
                <Box component="span" sx={{ color: "text.disabled" }}>
                  ·
                </Box>
                <Link
                  href={`${publicUrl}/terms-of-service.html`}
                  underline="hover"
                  color="error.dark"
                  fontWeight={600}
                  sx={{ mx: 0.75 }}
                >
                  Terms of Service
                </Link>
              </Typography>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                © {new Date().getFullYear()} Tashi Beverages Ltd
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
