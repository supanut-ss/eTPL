import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Link,
  alpha,
} from "@mui/material";
import { Leaderboard, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import FormDots from "./shared/FormDots";
import { getLogoUrl } from "../../../utils/imageUtils";
import { extractPlayer, dealCard } from "./shared/designTokens";

const TopStandingBox = memo(({ standings, loading }) => {
  const navigate = useNavigate();
  if (loading)
    return <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />;

  const top5 = standings.slice(0, 5).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  if (top5.length === 0) return null;

  const first = top5[0];
  const second = top5[1];
  const third = top5[2];
  const rest = top5.slice(3, 5);

  const PodiumItem = ({ team, rank, height, color, delay }) => {
    if (!team) return <Box sx={{ flex: 1 }} />;
    return (
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "flex-end",
        position: "relative",
        animation: `${dealCard} 1s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) backwards`
      }}>
        <Box sx={{ textAlign: "center", mb: 1, width: "100%" }}>
          <Box 
            component="img" 
            src={getLogoUrl(team.teamName)} 
            sx={{ width: rank === 1 ? 48 : 40, height: rank === 1 ? 48 : 40, objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))", mb: 0.5 }} 
          />
          <Typography variant="caption" fontWeight={900} noWrap sx={{ display: "block", px: 0.5, color: "#0f172a", fontSize: 10 }}>
            {extractPlayer(team.team)}
          </Typography>
        </Box>
        <Box sx={{ 
          width: "100%", 
          height: height, 
          bgcolor: color, 
          borderRadius: "12px 12px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 8px 30px -10px ${alpha(color, 0.5)}`,
          border: "1px solid rgba(255,255,255,0.2)",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)",
            borderRadius: "inherit"
          }
        }}>
          <Typography variant="h5" fontWeight={1000} sx={{ color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
            {rank}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        icon={<Leaderboard sx={{ fontSize: 18 }} />}
        title="League Standings"
        color="#6366f1"
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
              "&:hover": { color: "#4f46e5" }
            }}
          >
            Full Table <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      
      {/* Podium Section */}
      <Box sx={{ 
        px: 3, 
        pt: 2, 
        pb: 0, 
        display: "flex", 
        alignItems: "flex-end", 
        gap: 1.5, 
        minHeight: 180,
        background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.02) 100%)"
      }}>
        <PodiumItem team={second} rank={2} height={80} color="#94a3b8" delay={0.2} />
        <PodiumItem team={first} rank={1} height={110} color="#fbbf24" delay={0} />
        <PodiumItem team={third} rank={3} height={70} color="#b45309" delay={0.4} />
      </Box>

      {/* List Section */}
      <Box sx={{ flex: 1, overflow: "auto", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        {rest.map((team, idx) => (
          <Box
            key={team.id ?? idx}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 3,
              py: 1,
              borderBottom: "1px solid rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
              "&:hover": { bgcolor: "rgba(0,0,0,0.01)" }
            }}
          >
            <Box sx={{ 
              width: 24, 
              height: 24, 
              borderRadius: "50%", 
              bgcolor: "rgba(0,0,0,0.04)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              mr: 1.5
            }}>
              <Typography variant="caption" fontWeight={900} sx={{ color: "text.secondary" }}>
                {team.rank}
              </Typography>
            </Box>
            <Box 
              component="img" 
              src={getLogoUrl(team.teamName)} 
              sx={{ width: 22, height: 22, objectFit: "contain", mr: 1.5 }} 
            />
            <Typography variant="body2" fontWeight={800} sx={{ flex: 1, color: "#0f172a" }} noWrap>
              {extractPlayer(team.team)}
            </Typography>
            <Box sx={{ textAlign: "right", ml: 1 }}>
               <Typography variant="caption" fontWeight={1000} sx={{ color: "#4f46e5" }}>
                {team.pts ?? 0}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.4, mt: 0.2 }}>
                <FormDots last={team.last} max={5} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
});

export default TopStandingBox;
