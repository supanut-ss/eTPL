import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Link,
  Divider,
} from "@mui/material";
import { SportsSoccer, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import { getLogoUrl } from "../../../utils/imageUtils";
import { extractPlayer, extractTeam, formatMatchDate } from "./shared/designTokens";

const LatestResultBox = ({ recentMatches, loading }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const matches = (recentMatches || []).slice(0, 10);

  useEffect(() => {
    if (matches.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % matches.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [matches.length]);

  if (loading)
    return <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />;
  
  if (matches.length === 0) return null;

  const match = matches[index];
  
  // Try to find the cleanest team name from various potential field names
  const getCleanName = (fullName, teamNameField1, teamNameField2) => {
    return teamNameField1 || teamNameField2 || extractTeam(fullName);
  };

  const homeTeam = getCleanName(match.home, match.homeTeam, match.homeTeamName);
  const awayTeam = getCleanName(match.away, match.awayTeam, match.awayTeamName);
  const homeName = extractPlayer(match.home) || homeTeam;
  const awayName = extractPlayer(match.away) || awayTeam;
  const dateStr = formatMatchDate(match.matchDate || match.createDate);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "transparent" }}>
      <SectionHeader
        icon={<SportsSoccer sx={{ fontSize: 18 }} />}
        title="Latest Result"
        color="#10b981"
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/matches"); }}
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
              "&:hover": { color: "#10b981" }
            }}
          >
            All Results <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        p: 2,
        textAlign: "center",
        position: "relative"
      }}>
        {/* Tournament Info */}
        <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", mb: 0.5, letterSpacing: 1.5 }}>
          eTPL League
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", mb: 2.5, fontWeight: 700 }}>
          {match.tournamentName || "League Match"} - {match.stage || "Regular Season"}
        </Typography>

        {/* Teams Display */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 3 }, width: "100%", justifyContent: "center", mb: 3 }}>
          {/* Home Team */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
            <Box 
              component="img" 
              src={getLogoUrl(homeTeam)} 
              onError={(e) => {
                if (!e.target.src.includes("fallback")) {
                  const originalUrl = getLogoUrl(match.home);
                  if (e.target.src !== originalUrl) {
                    e.target.src = originalUrl + "?fallback=true";
                  }
                }
              }}
              sx={{ width: 60, height: 60, objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.1))", mb: 1.5 }} 
            />
            <Typography variant="caption" fontWeight={900} noWrap sx={{ width: "100%", color: "#0f172a" }}>
              {homeName}
            </Typography>
          </Box>

          {/* VS / Score */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: 1 }}>
            <Typography variant="h5" fontWeight={1000} sx={{ color: "#10b981", letterSpacing: -1 }}>
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 1000, color: "text.disabled", fontSize: 10, mt: -0.5 }}>
              FT
            </Typography>
          </Box>

          {/* Away Team */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
            <Box 
              component="img" 
              src={getLogoUrl(awayTeam)} 
              onError={(e) => {
                if (!e.target.src.includes("fallback")) {
                  const originalUrl = getLogoUrl(match.away);
                  if (e.target.src !== originalUrl) {
                    e.target.src = originalUrl + "?fallback=true";
                  }
                }
              }}
              sx={{ width: 60, height: 60, objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.1))", mb: 1.5 }} 
            />
            <Typography variant="caption" fontWeight={900} noWrap sx={{ width: "100%", color: "#0f172a" }}>
              {awayName}
            </Typography>
          </Box>
        </Box>

        {/* Footer Info */}
        <Divider sx={{ width: "80%", mb: 1.5, opacity: 0.5 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
          {dateStr}
        </Typography>
      </Box>

      {/* Pagination dots */}
      <Box sx={{ display: "flex", gap: 0.8, justifyContent: "center", pb: 2 }}>
        {matches.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
            sx={{
              width: i === index ? 12 : 5,
              height: 5,
              borderRadius: 3,
              bgcolor: i === index ? "#10b981" : "rgba(0,0,0,0.08)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default LatestResultBox;
