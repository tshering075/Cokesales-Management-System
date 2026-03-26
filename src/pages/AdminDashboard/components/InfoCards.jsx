import React from "react";
import { Box, Card, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import { formatTargetPeriodDisplay, getDaysRemaining } from "../../../utils/targetPeriod";

/**
 * InfoCards Component
 * Displays three information cards: Target Balance, Target Period, and Days Remaining
 */
function InfoCards({ balance, targetPeriod }) {
  const cardSx = {
    p: { xs: 1.25, sm: 1.75 },
    borderRadius: 2,
    transition: "transform 0.2s, box-shadow 0.2s",
    height: "100%",
    // Let cards size naturally to content, but keep equal height within the grid row
    minHeight: "unset",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    // Prevent overlap/congestion on mobile by disabling "lift" interaction
    "&:hover": {
      transform: { xs: "none", sm: "translateY(-2px)" },
      boxShadow: 3,
      zIndex: 1,
    },
  };

  return (
    <Box
      sx={{
        display: "grid",
        // Avoid cramped 2-column layout on small screens
        gridTemplateColumns: { xs: "1fr", sm: "1fr", md: "repeat(3, 1fr)" },
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
        {/* Horizontal layout for CSD and Water */}
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

      {/* Target Period Card */}
      <Card
        elevation={1}
        sx={{
          ...cardSx,
          background: "linear-gradient(135deg, #fff 0%, #d6e8f5 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 0.75, sm: 1.25 } }}>
          <Box
            sx={{
              p: { xs: 0.5, sm: 1 },
              borderRadius: 1.5,
              bgcolor: "rgba(25, 118, 210, 0.1)",
              mr: 0.75,
            }}
          >
            <CalendarMonthIcon sx={{ fontSize: { xs: 16, sm: 20 }, color: "#1976d2" }} />
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "#666", fontWeight: 600, fontSize: { xs: "0.7rem", sm: "0.813rem" } }}
          >
            Target Period
          </Typography>
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: "#333",
            fontWeight: "bold",
            fontSize: { xs: "0.75rem", sm: "0.938rem" },
            lineHeight: 1.3,
            mb: 0.25,
          }}
        >
          {formatTargetPeriodDisplay(targetPeriod?.start, targetPeriod?.end)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "#999", display: "block", fontSize: { xs: "0.6rem", sm: "0.688rem" }, lineHeight: 1.2 }}
        >
          {targetPeriod?.start
            ? `${new Date(targetPeriod.start).toLocaleDateString()} - ${new Date(targetPeriod.end).toLocaleDateString()}`
            : "No period set"}
        </Typography>
      </Card>

      {/* Days Left Card */}
      <Card
        elevation={1}
        sx={{
          ...cardSx,
          background: "linear-gradient(135deg, #fff 0%, #f1e5bf 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 0.75, sm: 1.25 } }}>
          <Box
            sx={{
              p: { xs: 0.5, sm: 1 },
              borderRadius: 1.5,
              bgcolor: "rgba(237, 108, 2, 0.1)",
              mr: 0.75,
            }}
          >
            <HourglassBottomIcon sx={{ fontSize: { xs: 16, sm: 20 }, color: "#ed6c02" }} />
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "#666", fontWeight: 600, fontSize: { xs: "0.7rem", sm: "0.813rem" } }}
          >
            Days Remaining
          </Typography>
        </Box>
        <Typography
          variant="h5"
          sx={{
            color: "#ed6c02",
            fontWeight: "bold",
            fontSize: { xs: "1.25rem", sm: "1.75rem" },
            lineHeight: 1.2,
            mb: 0.25,
          }}
        >
          {targetPeriod?.end ? getDaysRemaining(targetPeriod.end) : 0}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "#999", display: "block", fontSize: { xs: "0.6rem", sm: "0.688rem" }, lineHeight: 1.2 }}
        >
          Until target period ends
        </Typography>
      </Card>
    </Box>
  );
}

export default InfoCards;
