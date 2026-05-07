import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Link,
  Chip,
  Avatar,
  SvgIcon,
} from "@mui/material";
import { EmojiEvents as TrophyIcon, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import { getLogoUrl } from "../../../utils/imageUtils";

const HofBox = memo(({ hofData, loading }) => {
  const navigate = useNavigate();
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );
  
  // Filter for eTPL branded tournaments only
  const filteredHof = (hofData || []).filter(entry => 
    entry.tournamentTitle?.toUpperCase().includes("ETPL")
  );

  // Sort by season descending
  const sortedHof = [...filteredHof].sort((a, b) => {
    const sA = parseInt(String(a.season || '').replace(/\D/g, '') || '0');
    const sB = parseInt(String(b.season || '').replace(/\D/g, '') || '0');
    return sB - sA;
  });

  // Get the last 2 unique seasons
  const latestSeasons = [...new Set(sortedHof.map(e => e.season))].slice(0, 2);
  
  // Final list: only from the last 2 seasons
  const finalHof = sortedHof.filter(e => latestSeasons.includes(e.season));

  const featured = finalHof[0];
  const list = finalHof.slice(1, 4);

  if (!featured) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "transparent" }}>
      <SectionHeader
        icon={<TrophyIcon sx={{ fontSize: 18 }} />}
        title="Hall of Fame"
        color="#fbbf24"
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/hall-of-fame"); }}
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
              "&:hover": { color: "#fbbf24" }
            }}
          >
            VIEW ALL <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      
      <Box sx={{ flex: 1, display: "flex", p: 1, gap: 1 }}>
        {/* Left: Featured Champion */}
        <Box sx={{ 
          flex: 1.2, 
          bgcolor: "rgba(251, 191, 36, 0.05)", 
          borderRadius: 2, 
          p: 2, 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center", // Perfectly centers the group vertically
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(251, 191, 36, 0.15)"
        }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: "#fbbf24", letterSpacing: 1.5, mb: 2 }}>
            {featured.season} CHAMPION
          </Typography>
          
          <Box
            sx={{
              position: "relative",
              width: 150,
              height: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2.5,
              "&::before": {
                content: '""',
                position: "absolute",
                width: "110%",
                height: "110%",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)",
                animation: "pulse 3s infinite ease-in-out",
              }
            }}
          >
            <Box
              sx={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                p: 0.5,
                background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
                boxShadow: "0 10px 25px rgba(217, 119, 6, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box
                component="img"
                src={featured.winnerImage || featured.portraitUrl || getLogoUrl(featured.winnerTeam)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getLogoUrl(featured.winnerTeam);
                }}
                sx={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "1px solid white", // Minimal border
                  bgcolor: "white"
                }}
              />
              {/* Mini Crown Badge */}
              <Box sx={{
                position: "absolute",
                bottom: -5,
                right: -5,
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "white",
                border: "3px solid #fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                zIndex: 3
              }}>
                <SvgIcon sx={{ fontSize: 24 }}>
                  <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V18H19V19Z" fill="currentColor" />
                </SvgIcon>
              </Box>
            </Box>
          </Box>
          
          <Typography variant="subtitle1" fontWeight={1000} sx={{ color: "#0f172a", lineHeight: 1.1, textAlign: "center" }}>
            {featured.winnerName}
          </Typography>
          
          <Chip 
            label={featured.tournamentTitle} 
            size="small" 
            sx={{ 
              mt: 2, 
              height: 24, // Increased height
              fontSize: 10, // Increased font size
              fontWeight: 900, 
              bgcolor: "#fbbf24", 
              color: "white",
              "& .MuiChip-label": { px: 1.5 }
            }} 
          />
        </Box>

        {/* Right: Small List */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
          {list.map((entry, idx) => (
            <Box
              key={idx}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                minHeight: 65,
                borderRadius: 2,
                background: "linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(251, 191, 36, 0.08) 100%)",
                border: "1px solid rgba(251, 191, 36, 0.1)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": { 
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.18) 100%)",
                  transform: "translateX(4px)",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.08)"
                }
              }}
            >
              <Avatar
                src={entry.winnerImage || entry.portraitUrl || getLogoUrl(entry.winnerTeam)}
                sx={{ 
                  width: 44, 
                  height: 44, 
                  bgcolor: "white", 
                  border: "2px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={900} sx={{ color: "#0f172a", display: "block", lineHeight: 1.1 }} noWrap>
                  {entry.winnerName}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 8, color: "text.secondary", fontWeight: 700, display: "block" }}>
                  {entry.season} • {entry.tournamentTitle.includes("Cup") ? "Cup Winner" : "League Winner"}
                </Typography>
              </Box>
            </Box>
          ))}
          {list.length === 0 && (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
               <Typography variant="caption" fontWeight={800}>PREVIOUS WINNERS</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export default HofBox;
