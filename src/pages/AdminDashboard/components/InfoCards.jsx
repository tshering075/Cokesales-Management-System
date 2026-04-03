import React from "react";
import { Box, Card, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import BarChartIcon from "@mui/icons-material/BarChart";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  formatTargetPeriodDisplay,
  getDaysRemaining,
  parseTargetPeriodBounds,
} from "../../../utils/targetPeriod";

function formatPeriodDate(ymd) {
  if (!ymd) return "";
  const { start } = parseTargetPeriodBounds(ymd, ymd);
  if (!start || Number.isNaN(start.getTime())) return String(ymd);
  const day = start.getDate();
  const month = start.toLocaleString("en-US", { month: "short" });
  const year = start.getFullYear();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix} ${month} ${year}`;
}

/**
 * Target Balance + Target Period cards — match DistributorDashboard (Night/Day via theme).
 */
function InfoCards({ balance, targetPeriod }) {
  const theme = useTheme();
  const remainingDays = targetPeriod?.end ? getDaysRemaining(targetPeriod.end) : 0;

  const cardSx = {
    p: { xs: 2, sm: 2.5 },
    borderRadius: 3,
    transition: "transform 0.2s, box-shadow 0.2s",
    height: "100%",
    minHeight: "unset",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    border: theme.palette.mode === "dark" ? 1 : 0,
    borderColor: "divider",
    "&:hover": {
      transform: { xs: "none", sm: "translateY(-4px)" },
      boxShadow: 4,
      zIndex: 1,
    },
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 1.25, sm: 2 },
        alignItems: "stretch",
      }}
    >
      <Card
        elevation={2}
        sx={{
          ...cardSx,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.info.main, 0.14)} 100%)`
              : "linear-gradient(135deg, #fff 0%, #bbdefb 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              p: { xs: 1, sm: 1.5 },
              borderRadius: 2,
              bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.info.main, 0.2) : "rgba(13, 71, 161, 0.1)",
              mr: 1.5,
            }}
          >
            <BarChartIcon
              sx={{ fontSize: { xs: 24, sm: 28 }, color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1" }}
            />
          </Box>
          <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            Target Balance
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: { xs: 2, sm: 3 }, flexWrap: "wrap" }}>
          <Box sx={{ flex: { xs: "1 1 calc(50% - 8px)", sm: "1 1 auto" }, minWidth: { xs: "45%", sm: "auto" } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
              CSD
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                PC:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                {balance?.csdPC?.toLocaleString() || 0}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                UC:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                {balance?.csdUC?.toLocaleString() || 0}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: { xs: "1 1 calc(50% - 8px)", sm: "1 1 auto" }, minWidth: { xs: "45%", sm: "auto" } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
              Water
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                PC:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                {balance?.waterPC?.toLocaleString() || 0}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                UC:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.mode === "dark" ? "info.light" : "#0d47a1",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                {balance?.waterUC?.toLocaleString() || 0}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card
        elevation={2}
        sx={{
          ...cardSx,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.success.main, 0.14)} 100%)`
              : "linear-gradient(135deg, #fff 0%, #c8e6c9 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              p: { xs: 1, sm: 1.5 },
              borderRadius: 2,
              bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.success.main, 0.2) : "rgba(27, 94, 32, 0.1)",
              mr: 1.5,
            }}
          >
            <CalendarMonthIcon
              sx={{ fontSize: { xs: 24, sm: 28 }, color: theme.palette.mode === "dark" ? "success.light" : "#1b5e20" }}
            />
          </Box>
          <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            Target Period
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" }, mb: 0.5 }}>
              {formatPeriodDate(targetPeriod?.start)}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              to {formatPeriodDate(targetPeriod?.end)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, fontWeight: 600 }}>
              {formatTargetPeriodDisplay(targetPeriod?.start, targetPeriod?.end)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              borderLeft: "2px solid",
              borderLeftColor: theme.palette.mode === "dark" ? alpha(theme.palette.success.main, 0.35) : "rgba(27, 94, 32, 0.2)",
              pl: 2,
              minWidth: { xs: "80px", sm: "100px" },
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.75rem" }, mb: 0.5 }}>
              Days Remaining
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: theme.palette.mode === "dark" ? "success.light" : "#1b5e20",
                fontSize: { xs: "1.5rem", sm: "1.75rem" },
              }}
            >
              {remainingDays}
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default InfoCards;
