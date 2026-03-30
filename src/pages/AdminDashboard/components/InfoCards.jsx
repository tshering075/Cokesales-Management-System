import React from "react";
import { Box, Card, Typography } from "@mui/material";
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
 * Info cards: Target Balance and Target Period (with days remaining inline, matching distributor dashboard).
 */
function InfoCards({ balance, targetPeriod }) {
  const cardSx = {
    p: { xs: 1.25, sm: 1.75 },
    borderRadius: 2,
    transition: "transform 0.2s, box-shadow 0.2s",
    height: "100%",
    minHeight: "unset",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    "&:hover": {
      transform: { xs: "none", sm: "translateY(-2px)" },
      boxShadow: 3,
      zIndex: 1,
    },
  };

  const remainingDays = targetPeriod?.end ? getDaysRemaining(targetPeriod.end) : 0;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr", md: "repeat(2, 1fr)" },
        gap: { xs: 1.75, sm: 2, md: 2.25 },
        mb: { xs: 1.25, sm: 2 },
        alignItems: "stretch",
        gridAutoRows: { md: "1fr" },
      }}
    >
      {/* Target Balance Card */}
      <Card
        elevation={1}
        sx={{
          ...cardSx,
          background: "linear-gradient(135deg, #fff 0%, #fad3d3 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 0.75, sm: 1.25 } }}>
          <Box
            sx={{
              p: { xs: 0.5, sm: 1 },
              borderRadius: 1.5,
              bgcolor: "rgba(211, 47, 47, 0.1)",
              mr: 0.75,
            }}
          >
            <BarChartIcon sx={{ fontSize: { xs: 16, sm: 20 }, color: "#d32f2f" }} />
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "#666", fontWeight: 600, fontSize: { xs: "0.7rem", sm: "0.813rem" } }}
          >
            Target Balance
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row", sm: "column" },
            gap: { xs: 1, sm: 1 },
            alignItems: { xs: "flex-start", sm: "stretch" },
          }}
        >
          <Box
            sx={{
              flex: { xs: 1, sm: "none" },
              minWidth: 0,
              width: { xs: "50%", sm: "100%" },
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#666", display: "block", mb: 0.25, fontSize: { xs: "0.6rem", sm: "0.688rem" } }}
            >
              CSD
            </Typography>
            <Box sx={{ display: "flex", gap: { xs: 0.75, sm: 2 }, flexWrap: "nowrap" }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#999", display: "block", fontSize: { xs: "0.55rem", sm: "0.625rem" } }}
                >
                  PC
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "#d32f2f",
                    fontSize: { xs: "0.75rem", sm: "0.938rem" },
                    lineHeight: 1.2,
                  }}
                >
                  {balance?.csdPC?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#999", display: "block", fontSize: { xs: "0.55rem", sm: "0.625rem" } }}
                >
                  UC
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "#d32f2f",
                    fontSize: { xs: "0.75rem", sm: "0.938rem" },
                    lineHeight: 1.2,
                  }}
                >
                  {balance?.csdUC?.toLocaleString() || 0}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              flex: { xs: 1, sm: "none" },
              minWidth: 0,
              width: { xs: "50%", sm: "100%" },
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#666", display: "block", mb: 0.25, fontSize: { xs: "0.6rem", sm: "0.688rem" } }}
            >
              Water
            </Typography>
            <Box sx={{ display: "flex", gap: { xs: 0.75, sm: 2 }, flexWrap: "nowrap" }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#999", display: "block", fontSize: { xs: "0.55rem", sm: "0.625rem" } }}
                >
                  PC
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "#d32f2f",
                    fontSize: { xs: "0.75rem", sm: "0.938rem" },
                    lineHeight: 1.2,
                  }}
                >
                  {balance?.waterPC?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#999", display: "block", fontSize: { xs: "0.55rem", sm: "0.625rem" } }}
                >
                  UC
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "#d32f2f",
                    fontSize: { xs: "0.75rem", sm: "0.938rem" },
                    lineHeight: 1.2,
                  }}
                >
                  {balance?.waterUC?.toLocaleString() || 0}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Target Period + days remaining (aligned with distributor dashboard) */}
      <Card
        elevation={1}
        sx={{
          ...cardSx,
          background: "linear-gradient(135deg, #fff 0%, #c8e6c9 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 0.75, sm: 1.25 } }}>
          <Box
            sx={{
              p: { xs: 0.5, sm: 1 },
              borderRadius: 1.5,
              bgcolor: "rgba(27, 94, 32, 0.1)",
              mr: 0.75,
            }}
          >
            <CalendarMonthIcon sx={{ fontSize: { xs: 16, sm: 20 }, color: "#1b5e20" }} />
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "#666", fontWeight: 600, fontSize: { xs: "0.7rem", sm: "0.813rem" } }}
          >
            Target Period
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flex: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "#1b5e20",
                fontWeight: 700,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                mb: 0.5,
                lineHeight: 1.35,
              }}
            >
              {formatPeriodDate(targetPeriod?.start)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#1b5e20",
                fontWeight: 700,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                mb: 0.35,
                lineHeight: 1.35,
              }}
            >
              to {formatPeriodDate(targetPeriod?.end)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#558b2f", display: "block", fontSize: { xs: "0.6rem", sm: "0.688rem" }, lineHeight: 1.25 }}
            >
              {formatTargetPeriodDisplay(targetPeriod?.start, targetPeriod?.end)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              borderLeft: "2px solid rgba(27, 94, 32, 0.2)",
              pl: 2,
              flexShrink: 0,
              minWidth: { xs: "76px", sm: "96px" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#666",
                fontSize: { xs: "0.6rem", sm: "0.688rem" },
                mb: 0.5,
                fontWeight: 600,
              }}
            >
              Days remaining
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: "#1b5e20",
                fontSize: { xs: "1.35rem", sm: "1.65rem" },
                lineHeight: 1.1,
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
