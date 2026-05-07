import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Link,
} from "@mui/material";
import { TrendingUp, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import { getLogoUrl } from "../../../utils/imageUtils";
import { extractPlayer } from "./shared/designTokens";

const TopScorerBox = memo(({ standings, loading }) => {
  const navigate = useNavigate();
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  const top5 = [...(standings || [])]
    .sort((a, b) => (b.gf || 0) - (a.gf || 0))
    .slice(0, 5);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        icon={<TrendingUp sx={{ fontSize: 18 }} />}
        title="Top Scoring Teams"
        color="#f43f5e"
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/standings"); }}
            underline="none"
            sx={{ 
              fontSize: 10, 
              fontWeight: 800, 
              color: "rgba(100, 116, 139, 0.6)",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              textTransform: "uppercase",
              letterSpacing: 1,
              "&:hover": { color: "#f43f5e" }
            }}
          >
            Full Table <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      <Box sx={{ flex: 1, p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        {top5.map((team, idx) => (
          <Box
            key={idx}
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              borderRadius: 1,
              overflow: "hidden",
              position: "relative",
              background: "rgba(15, 23, 42, 0.03)", // Minimalist light slate
              border: "1px solid rgba(0,0,0,0.04)",
              transition: "all 0.2s ease",
              "&:hover": { bgcolor: "rgba(99, 102, 241, 0.05)", transform: "translateX(4px)" },
            }}
          >
            {/* Left: Manager Profile Pic */}
            <Box
              sx={{
                width: 50, // Reduced size
                height: "100%",
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRight: "1px solid rgba(0,0,0,0.05)"
              }}
            >
              <Box
                component="img"
                src={team.linePic || getLogoUrl(team.teamName)}
                sx={{ width: "80%", height: "80%", objectFit: "cover" }}
              />
            </Box>

            {/* Name (Left) & Goals (Right) */}
            <Box sx={{ flex: 1, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "rgba(15,23,42,0.6)", fontWeight: 900, fontSize: 10, textTransform: "uppercase" ,paddingLeft:2}} noWrap>
                {extractPlayer(team.team)}
              </Typography>
              <Typography variant="h6" fontWeight={1000} sx={{ color: "#0f172a", lineHeight: 1 }}>
                {team.gf || 0} <span style={{ fontSize: "0.65rem", color: "#f43f5e", letterSpacing: 1 }}>GOALS</span>
              </Typography>
            </Box>

            {/* Rank Badge */}
            <Box sx={{ 
              position: "absolute",
              top: 0, 
              left: 50, 
              bgcolor: "#f43f5e", 
              color: "white", 
              px: 1, 
              fontSize: 9, 
              fontWeight: 1000,
              borderBottomRightRadius: 4,
              zIndex: 2
            }}>
              #{idx + 1}
            </Box>
          </Box>
        ))}
        {top5.length === 0 && (
          <Box p={3} textAlign="center">
            <Typography variant="caption" color="text.disabled">No stats available</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});

export default TopScorerBox;
