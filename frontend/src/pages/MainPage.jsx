import { useState, useEffect, useCallback, useMemo, memo, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLogoUrl,
  getPlayerFaceUrl,
  getPlayerCardUrl,
  getAnnouncementImageUrl,
  getPlayerFaceUrlPesmaster,
} from "../utils/imageUtils";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  SvgIcon,
  Avatar,
  useTheme,
  useMediaQuery,
  alpha,
  keyframes,
  Grid,
  Link,
} from "@mui/material";
import {
  AccountCircle,
  SportsSoccer,
  Leaderboard,
  CheckCircle,
  HourglassBottom,
  Groups,
  Campaign,
  Login,
  TrendingUp,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { getStandings } from "../api/standingApi";
import {
  getFixtures,
  getPublicFixtures,
  getPublicLastFixtures,
} from "../api/fixtureApi";
import { getPublicAnnouncements } from "../api/announcementApi";
import { getUsers } from "../api/userApi";
import { hofApi } from "../api/hofApi";
import auctionService from "../services/auctionService";
import {
  LocalFireDepartment,
  ConfirmationNumber,
  ArrowForward,
  InfoOutlined,
  EmojiEvents as TrophyIcon,
  Facebook,
  YouTube,
  AutoAwesome,
  ChevronRight,
} from "@mui/icons-material";

// ─── helpers ────────────────────────────────────────────────────────────────

const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
};

const extractTeam = (team) => {
  if (!team) return "";
  return team.replace(/\s*\([^)]+\)/, "").trim();
};

const formatMatchDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

const LineIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M12 2C6.477 2 2 6.134 2 11.235c0 4.54 3.52 8.356 8.33 9.123l-.304 1.264c-.041.173.057.34.246.392.057.016.113.023.17.023.128 0 .252-.036.342-.111l2.272-1.882c.12-.101.272-.158.43-.158h.167c5.523 0 10-4.134 10-9.235S17.523 2 12 2z"
      fill="currentColor"
    />
  </SvgIcon>
);

const DiscordIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z" />
  </SvgIcon>
);

// ─── form badges ─────────────────────────────────────────────────────────────
const FormDots = ({ last, max = 5 }) => {
  if (!last) return null;
  const results = last.trim().split(/\s+/).slice(-max);
  const colorMap = { W: "#22c55e", D: "#f59e0b", L: "#ef4444" };
  return (
    <Box display="flex" gap={0.4}>
      {results.map((r, i) => (
        <Box
          key={i}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: colorMap[r] || "grey.300",
            flexShrink: 0,
          }}
        />
      ))}
    </Box>
  );
};

// ─── AI Magazine Box ────────────────────────────────────────────────────────
const AiMagazineBox = ({ magazineData, loading }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!magazineData || magazineData.length <= 1) return undefined;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % magazineData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [magazineData]);

  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  if (!magazineData || magazineData.length === 0) return null;

  const active = magazineData[index];
  const displayImage = active.imageUrl
    ? getAnnouncementImageUrl(active.imageUrl)
    : "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 340, 
        bgcolor: "transparent", // Inherit glass from parent
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <SectionHeader 
        icon={<AutoAwesome sx={{ fontSize: 18 }} />} 
        title="AI Magazine" 
        color="#a855f7" 
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/news", { state: { tab: 1 } }); }}
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
              "&:hover": { color: "#a855f7" }
            }}
          >
            View All <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      {/* Image Area */}
      <Box sx={{ width: "100%", overflow: "hidden", position: "relative", aspectRatio: "16 / 9" }}>
        <Box
          component="img"
          key={index}
          src={displayImage}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800";
          }}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            animation: "fadeIn 0.8s ease-in-out",
          }}
        />
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={1000}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              color: "#0f172a",
              lineHeight: 1.3,
              fontSize: { xs: 13, md: 15 },
              letterSpacing: -0.2,
            }}
          >
            {active.announcement}
          </Typography>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          pt={1}
        >
          <Typography
            variant="caption"
            sx={{
              color: "rgba(15,23,42,0.5)",
              fontWeight: 800,
              fontSize: 10,
            }}
          >
            {active.announcer || "E-TPL AI Editor"}
          </Typography>
          <Box
            sx={{ width: 30, height: 3, bgcolor: "#a855f7", borderRadius: 1 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

// ─── Event Update Box ──────────────────────────────────────────────────────────
const EventUpdateBox = memo(({ announcements, loading }) => {
  const navigate = useNavigate();
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  if (!announcements || announcements.length === 0) return null;

  const list = announcements.slice(0, 10);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "transparent",
      }}
    >
      <SectionHeader
        icon={<Campaign sx={{ fontSize: 18 }} />}
        title="Event Updates"
        color="#0ea5e9"
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/news", { state: { tab: 2 } }); }}
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
              "&:hover": { color: "#38bdf8" }
            }}
          >
            VIEW ALL <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />

      <Box sx={{ 
        flex: 1, // Fill available vertical space
        display: "flex", 
        flexDirection: "column", 
        p: 0, 
        overflowY: "auto",
        "&::-webkit-scrollbar": { display: "none" },
        msOverflowStyle: "none",
        scrollbarWidth: "none"
      }}>
        {list.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 2,
              height: 85,
              borderRadius: 2,
              transition: "all 0.2s ease",
              borderBottom: idx !== list.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
              "&:hover": { bgcolor: "rgba(0,0,0,0.02)" }
            }}
          >
            <Box
              sx={{
                width: 100,
                height: 60,
                borderRadius: 1,
                overflow: "hidden",
                flexShrink: 0,
                bgcolor: "rgba(0,0,0,0.05)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
            >
              <Box
                component="img"
                src={getAnnouncementImageUrl(item.imageUrl)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200";
                }}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{
                  color: "#0f172a",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  fontSize: 13
                }}
              >
                {item.announcement}
              </Typography>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                fontWeight: 700,
                fontSize: 9,
                whiteSpace: "nowrap",
                ml: 1
              }}
            >
              {formatMatchDate(item.createDate)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
});

// ─── Latest Result Box (Rotating single match) ────────────────────────────────
const LatestResultBox = ({ recentMatches, loading }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const matches = recentMatches.slice(0, 10);

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

// ─── Top Standing Box (Podium + List) ────────────────────────────────────────
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

// ─── Top Scorer Box ──────────────────────────────────────────────────────────
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

// ─── Hall of Fame Box ──────────────────────────────────────────────────────────
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

// ─── Elite Showcase Box ───────────────────────────────────────────────────────
const EliteShowcaseBox = ({ elitePlayers, loading, clubs = [] }) => {
  const [index, setIndex] = useState(0);
  const displayCount = 3;
  const players = elitePlayers.slice(0, 12);

  useEffect(() => {
    if (players.length <= displayCount) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + displayCount) % players.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [players.length]);

  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  if (players.length === 0) return null;

  const visiblePlayers = players.slice(index, index + displayCount);
  if (visiblePlayers.length < displayCount) {
    visiblePlayers.push(...players.slice(0, displayCount - visiblePlayers.length));
  }

  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        position: "relative",
        background: "transparent", // Inherit glass from parent
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <SectionHeader
        icon={<AutoAwesome sx={{ fontSize: 18 }} />}
        title="Elite Showcase"
        color="#d1ad73ff"
        action={
          <Link 
            href="/auction-results" 
            underline="none"
            sx={{ 
              fontSize: 10, 
              fontWeight: 800, 
              color: "rgba(100, 116, 139, 0.6)",
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              transition: "all 0.3s ease",
              "&:hover": { 
                color: "#d1ad73ff",
                transform: "translateX(3px)",
              }
            }}
          >
            VIEW DASHBOARD <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center", // Center the cards
          gap: 3, // Space between cards
          px: { xs: 2, md: 4 },
          py: 3,
          position: "relative",
          zIndex: 1,
        }}
      >
        {visiblePlayers.map((player, idx) => {
          const pId = player.idPlayer || player.playerId || player.id;
          const price = player.pricePaid || player.valuation || 0;
          const clubOwner = clubs.find(c => c.id === player.ownedByUserId || (c.currentTeam && c.currentTeam === player.teamName));
          const owner = clubOwner?.userId || player.winnerName || "Manager";

          return (
            <Box
              key={`${index}-${idx}`}
              sx={{
                animation: `${dealCard} 1s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                maxWidth: "25%",
                position: "relative",
              }}
            >
                <Box
                  sx={{
                    position: "relative",
                    mb: 1.5,
                    p: "1.5px", // Even thinner border
                    borderRadius: 0, // Sharp corners as requested
                    background: "linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #fde68a 100%)", // Lighter gold
                    display: "flex",
                    justifyContent: "center",
                    filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.12))",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    "&:hover": { 
                      transform: "scale(1.1) translateY(-8px)",
                      filter: "drop-shadow(0 15px 25px rgba(251, 191, 36, 0.2))",
                    },
                  }}
                >
                <Box
                  component="img"
                  src={player.imageUrl || getPlayerCardUrl(pId)}
                  onError={(e) => {
                    if (e.target.src.includes("/card/b")) {
                      e.target.src = e.target.src.replace("/card/b", "/card/f");
                    } else if (e.target.src.includes("/card/f")) {
                      e.target.src = e.target.src.replace("/card/f", "/card/");
                    } else if (e.target.src.includes("/card/")) {
                      e.target.src = getPlayerFaceUrl(pId);
                    } else if (e.target.src.includes("/player/")) {
                      e.target.src = getPlayerFaceUrlPesmaster(pId, "webp");
                    } else {
                      e.target.onerror = null;
                      e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/330px-No-Image-Placeholder.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20200912122019";
                      e.target.style.height = "80px";
                      e.target.style.width = "80px";
                      e.target.style.borderRadius = "50%";
                      e.target.style.objectFit = "cover";
                      e.target.style.border = "4px solid white";
                      e.target.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)";
                    }
                  }}
                  sx={{
                    height: { xs: 110, md: 135 },
                    width: "auto",
                    objectFit: "contain",
                    position: "relative",
                    zIndex: 2,
                    borderRadius: 0, // Sharp corners for the image too
                  }}
                />
              </Box>

              <Box sx={{ 
                textAlign: "center", 
                width: "100%",
                minWidth: 120,
                px: 1,
                py: 0.5,
                overflow: "visible",
              }}>
                
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 0.8,
                  mt: 0.5
                }}>
                  <Box 
                    sx={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: "50%", 
                      background: "linear-gradient(135deg, #fbbf24 0%, #d1ad73ff 100%)",
                      color: "white",
                      fontSize: 9,
                      fontWeight: 1000,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.4)"
                    }}
                  >
                    TP
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight={1000}
                    sx={{
                      color: "#ec830cd8",
                      fontSize: { xs: 13, md: 15 },
                      letterSpacing: 0.2,
                    }}
                  >
                    {price.toLocaleString()}
                  </Typography>
                </Box>
                
                <Typography
                  variant="caption"
                  sx={{
                    color: "#ec830cd8",
                    fontWeight: 800,
                    fontSize: 8.5,
                    display: "block",
                    mt: 1,
                    letterSpacing: 1,
                    textTransform: "uppercase"
                  }}
                >
                  {owner}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Progress dots */}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", pb: 3 }}>
        {Array.from({ length: Math.ceil(players.length / displayCount) }).map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i * displayCount)}
            sx={{
              width: i === Math.floor(index / displayCount) ? 20 : 6,
              height: 4,
              borderRadius: 2,
              bgcolor: i === Math.floor(index / displayCount) ? "#d1ad73ff" : "rgba(15, 23, 42, 0.1)",
              transition: "all 0.5s ease",
              cursor: "pointer",
              "&:hover": { bgcolor: "#d1ad73ff" },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// ─── Active Member Box ─────────────────────────────────────────────────────────
const ActiveMemberBox = ({ visibleMembers, loading, currentIndex, totalCount, pageSize, onPageChange }) => {
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 4 }} />
    );

  const pageCount = Math.ceil(totalCount / pageSize);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        icon={<Groups sx={{ fontSize: 18 }} />}
        title="Active Member"
        color="#0d9488"
      />
      <Box sx={{ flex: "0 0 255px", py: 0.5, overflow: "hidden" }}>
        {visibleMembers.map((member, idx) => (
          <Box
            key={idx}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 1,
              minHeight: 60,
              bgcolor: idx % 2 === 0 ? "transparent" : "rgba(15, 23, 42, 0.02)", // Extremely subtle neutral slate for alternating rows
              transition: "all 0.2s ease",
              "&:hover": { 
                bgcolor: "rgba(15, 23, 42, 0.05)", 
                px: 3.5 
              },
            }}
          >
            <Avatar
              src={member.linePic}
              sx={{ width: 44, height: 44, border: "1px solid #e2e8f0" }}
            >
              <Groups sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: "#0f172a" }}
                noWrap
              >
                {member.lineName || "Manager"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 9 }}>
                {member.userId}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Progress dots */}
      <Box sx={{ mt: "auto", display: "flex", gap: 1, justifyContent: "center", pb: 3 }}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <Box
            key={i}
            onClick={() => onPageChange(i)}
            sx={{
              width: i === currentIndex ? 20 : 6,
              height: 4,
              borderRadius: 2,
              bgcolor: i === currentIndex ? "#0d9488" : "rgba(15, 23, 42, 0.1)",
              transition: "all 0.5s ease",
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(13, 148, 136, 0.4)" },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const SectionHeader = ({ icon, title, color = "#4f46e5", action }) => (
  <Box
    display="flex"
    alignItems="center"
    px={2.5}
    py={1.8}
    sx={{
      background:
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.95) 100%)",
      borderBottom: "1px solid",
      borderColor: "rgba(15, 23, 42, 0.05)",
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 2.5,
        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.3)} 100%)`,
      },
    }}
  >
    <Box sx={{ color: color, mr: 1.5, display: "flex", alignItems: "center" }}>
      {cloneElement(icon, { sx: { fontSize: 22 } })}
    </Box>
    <Typography
      fontWeight={1000}
      fontSize={12}
      color={color}
      sx={{
        letterSpacing: 1.2,
        textTransform: "uppercase",
        flex: 1,
        opacity: 0.9,
      }}
    >
      {title}
    </Typography>
    {action && <Box sx={{ ml: 1 }}>{action}</Box>}
  </Box>
);

const dealCard = keyframes`
  0% { transform: translateY(120px) rotate(25deg) scale(0.2); opacity: 0; filter: blur(15px); }
  60% { transform: translateY(-20px) rotate(-5deg) scale(1.05); opacity: 1; filter: blur(0); }
  100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
`;

const shine = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const goldGlow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
  50% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
`;

const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(251, 113, 133, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 113, 133, 0); }
`;

const pulseOutline = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
`;

const DESIGN_TOKENS = {
  background: "#ffffff",
  glowA: "rgba(79, 70, 229, 0.04)",
  glowB: "rgba(56, 189, 248, 0.03)",
  shell:
    "linear-gradient(145deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 1) 100%)",
  glass: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)",
  glassSoft: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.8) 100%)",
  border: "rgba(255, 255, 255, 0.5)", // Brighter rim light
  borderStrong: "rgba(255, 255, 255, 0.8)",
  shadow: "0 10px 30px -15px rgba(15, 23, 42, 0.1), inset 0 0 10px rgba(255,255,255,0.5)",
};


const panelSx = {
  p: 3, 
  borderRadius: 3,
  overflow: "hidden",
  border: "1px solid",
  borderColor: DESIGN_TOKENS.border,
  background: DESIGN_TOKENS.glass,
  backdropFilter: "blur(30px)", // Increased blur for more "glossy" depth
  boxShadow: DESIGN_TOKENS.shadow,
  transition:
    "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
  "&:hover": {
    boxShadow: "0 20px 42px -24px rgba(15, 23, 42, 0.2)",
    borderColor: DESIGN_TOKENS.borderStrong,
  },
};

const DASHBOARD_ROW_HEIGHT = 56;

const MainPage = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [lastFixtures, setLastFixtures] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [members, setMembers] = useState([]);
  const [memberBannerIndex, setMemberBannerIndex] = useState(0);
  const [marketActivity, setMarketActivity] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [magazineData, setMagazineData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [hofData, setHofData] = useState([]);
  const [elitePlayers, setElitePlayers] = useState([]);

    const fetchDashboardData = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const fixtureRequest = user ? getFixtures({}) : getPublicFixtures();
    // Allow loading users for everyone, but transactions only for logged in users
    const canLoadTransactions = !!user;

    return Promise.all([
      fixtureRequest,
      getPublicLastFixtures(),
      getPublicAnnouncements("News"),
      auctionService.getClubs().catch(() => ({ data: [] })),
      getPublicAnnouncements("Magazine").catch(() => ({ data: { data: [] } })),
      getPublicAnnouncements("Event").catch(() => ({ data: { data: [] } })),
      auctionService.searchPlayers({ ownedOnly: true, pageSize: 20 }).catch(() => ({ data: { items: [] } })),
    ])
      .then(([fRes, lastRes, aRes, cRes, hRes, eRes, ePlayersRes]) => {
        setFixtures(fRes.data.data || []);
        setLastFixtures(lastRes.data.data || []);
        const sortedAnnouncements = (aRes.data.data || []).sort(
          (a, b) => new Date(b.createDate) - new Date(a.createDate),
        );
        setAnnouncements(sortedAnnouncements);
        setClubs(cRes.data || cRes || []);
        setMagazineData(hRes.data?.data || []);

        const sortedEvents = (eRes.data?.data || []).sort(
          (a, b) => new Date(b.createDate) - new Date(a.createDate),
        );
        setEventData(sortedEvents);
        
        // Elite Players (Top by Price/OVR)
        const allElite = ePlayersRes.data?.items || ePlayersRes.items || [];
        const sortedElite = allElite.sort((a, b) => (b.pricePaid || 0) - (a.pricePaid || 0)).slice(0, 10);
        setElitePlayers(sortedElite);

        // Load users publicly for banner profile pics
        getUsers()
          .then((uRes) => {
            setMembers(uRes.data.data || []);
          })
          .catch((err) => console.error("Public users load failed", err));

        if (!canLoadTransactions) {
          return null;
        }

        return Promise.all([
          auctionService
            .getGlobalTransactions(1, 100)
            .catch(() => ({ data: [] })),
          auctionService.getTransferBoard().catch(() => ({ data: [] })),
        ])
          .then(([tRes, bRes]) => {
            // Format and Combine Activities
            const txs = tRes.data?.items || tRes.items || [];
            const listings = bRes.data || bRes || [];

            const combined = [];

            // Add Confirmed Transactions (Sold Out / Accepted)
            txs.forEach((tx) => {
              const desc = (tx.description || "").toLowerCase();
              // Check for both English and Thai keywords used in DB
              const isSignificant =
                desc.includes("won") ||
                desc.includes("confirm") ||
                desc.includes("accepted") ||
                desc.includes("transfer") ||
                desc.includes("success") ||
                desc.includes("signed") ||
                desc.includes("ชนะ") ||
                desc.includes("ซื้อ") ||
                desc.includes("ขาย") ||
                desc.includes("ยืม") ||
                desc.includes("ปล่อย") ||
                desc.includes("สัญญา");

              if (isSignificant) {
                combined.push({
                  id: `tx-${tx.transactionId}`,
                  type: "DEAL",
                  title:
                    tx.playerName || tx.relatedPlayerName || "Deal Confirmed",
                  subtitle: `${tx.userName || "System"} ${tx.description}`,
                  amount: tx.amount,
                  date: tx.createdAt || tx.CreatedAt || tx.createDate || tx.CreateDate || tx.date || tx.Date,
                  player: tx.playerName || tx.relatedPlayerName,
                  manager: tx.userName,
                });
              }
            });

            // Add Current Listings
            listings.forEach((player) => {
              combined.push({
                id: `listing-${player.squadId}`,
                type: "LISTING",
                title: player.playerName,
                subtitle: `${player.ownerName || "สโมสร"} ประกาศขายนักเตะ`,
                amount: player.listingPrice || player.price,
                date: player.acquiredAt || player.AcquiredAt || player.updatedAt || player.UpdatedAt || player.createdAt || player.CreatedAt || player.createDate || player.CreateDate || player.listedAt || player.ListedAt || player.date || player.Date || new Date().toISOString(),
                player: player.playerName,
                manager: player.ownerName,
              });
            });

            // Sort by date and take latest 10
            const sorted = combined
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10);
            setMarketActivity(sorted);
          })
          .catch((err) => {
            console.error("Member/Transaction load error", err);
          });
      })
      .catch((err) => {
        if (!isSilent) {
          const errorMsg =
            err.response?.data?.message ||
            err.message ||
            "Failed to load dashboard data";
          setError(errorMsg);
        }
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  const fetchStaticData = () => {
    getStandings().then(sRes => setStandings(sRes.data.data || []));
    hofApi.getHof().then(hfRes => setHofData(hfRes || []));
  };

  useEffect(() => {
    fetchDashboardData();
    fetchStaticData();

    // Auto-reload dynamic data every 60 seconds
    const dynamicIntervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 60000);

    // Auto-reload standings/static data every 5 minutes
    const staticIntervalId = setInterval(() => {
      fetchStaticData();
    }, 300000);

    return () => {
      clearInterval(dynamicIntervalId);
      clearInterval(staticIntervalId);
    };
  }, [user]);

  const displayAnnouncements = useMemo(() => (announcements || []).slice(0, 5), [announcements]);
  const recentMatches = useMemo(() => (lastFixtures || []).slice(0, 25), [lastFixtures]);

  useEffect(() => {
    setAnnouncementIndex(0);
  }, [announcements]);

  useEffect(() => {
    if (displayAnnouncements.length <= 1) return undefined;

    const timerId = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % displayAnnouncements.length);
    }, 4500);

    return () => clearInterval(timerId);
  }, [displayAnnouncements]);


  const season = standings[0]?.season || "";

  const enrichedStandings = useMemo(() => {
    return (standings || []).map((row) => {
      // Improve matching with trim and case-insensitivity
      const club = (clubs || []).find(
        (c) => (c.teamName || "").trim().toLowerCase() === (row.teamName || "").trim().toLowerCase()
      );
      return {
        ...row,
        linePic: club?.linePic || null,
        lineName: club?.lineName || null,
      };
    });
  }, [standings, clubs]);

  const activeAnnouncement = displayAnnouncements[announcementIndex] || null;

  const sortedMembers = members
    .filter((member) => member.userLevel !== "admin")
    .sort((a, b) => {
      return (a.userId || "").localeCompare(b.userId || "");
    });
  const memberBannerSize = 4;
  const memberBannerCount = Math.ceil(sortedMembers.length / memberBannerSize);
  const visibleMembers = sortedMembers.slice(
    memberBannerIndex * memberBannerSize,
    memberBannerIndex * memberBannerSize + memberBannerSize,
  );

  useEffect(() => {
    setMemberBannerIndex(0);
  }, [sortedMembers.length]);

  useEffect(() => {
    if (memberBannerCount <= 1) return undefined;

    const timerId = setInterval(() => {
      setMemberBannerIndex((prev) => (prev + 1) % memberBannerCount);
    }, 4500);

    return () => clearInterval(timerId);
  }, [memberBannerCount]);

  // Market activity is static list in sidebar, no auto-index needed


  const feedItems = useMemo(() => [
    ...lastFixtures.map((f) => ({
      type: "RESULT",
      icon: <SportsSoccer sx={{ fontSize: 14 }} />,
      color: "#10b981",
      date: f.matchDate || f.date,
      data: f,
      msg: `${extractPlayer(f.home) || f.homeTeamName || "?"} ${f.homeScore ?? "-"} - ${f.awayScore ?? "-"} ${extractPlayer(f.away) || f.awayTeamName || "?"}`,
      detail: null,
      time: (f.matchDate || f.MatchDate || f.createDate || f.CreateDate || f.date || f.Date) ? new Date(f.matchDate || f.MatchDate || f.createDate || f.CreateDate || f.date || f.Date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "–",
    })),
    ...marketActivity
      .filter((m) => {
        const sub = (m.subtitle || "").toLowerCase();
        return !(sub.includes("ออโต้") || sub.includes("อัตโนมัติ") || (sub.includes("auto") && sub.includes("สัญญา")));
      })
      .map((m) => ({
        type: m.type === "DEAL" ? "DEAL" : "MARKET",
        icon: m.type === "DEAL" ? <TrendingUp sx={{ fontSize: 14 }} /> : <ConfirmationNumber sx={{ fontSize: 14 }} />,
        color: m.type === "DEAL" ? "#6366f1" : "#f59e0b",
        date: m.date,
        data: m,
        msg: m.subtitle || "Market activity",
        detail: m.type === "DEAL" ? (m.amount ? `${Number(m.amount).toLocaleString()} TP` : null) : [m.title, m.amount ? `${Number(m.amount).toLocaleString()} TP` : null].filter(Boolean).join(" • "),
        time: m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "–",
      })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20), [lastFixtures, marketActivity]);

  // recentMatches rotation is handled internally in LatestResultBox


  return (
    <>
      <Box
        sx={{
          width: "100%",
          px: { xs: 2, md: 4 },
          pt: { xs: 2, md: 4 },
          pb: 4,
          minHeight: "100vh",
          background: DESIGN_TOKENS.background,
          backgroundImage: `radial-gradient(circle at 14% 46%, ${DESIGN_TOKENS.glowA}, transparent 38%), radial-gradient(circle at 86% 28%, ${DESIGN_TOKENS.glowB}, transparent 36%)`,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 0,
            mb: 4,
            borderRadius: 0,
            background: "transparent",
            position: "relative",
            overflow: "visible",
            boxShadow: "none",
            border: "none",
          }}
        >
          {/* TOP SECTION: Hero Banner + Live Feed */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "8fr 4fr",
              },
              gap: { xs: 2, md: 3 },
              alignItems: "stretch",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* LEFT: Hero Banner (News Showcase) */}
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                height: { xs: 240, md: 600 },
                border: "1px solid",
                borderColor: DESIGN_TOKENS.border,
                boxShadow: DESIGN_TOKENS.shadow,
                "&:hover .news-image": { transform: "scale(1.02)" },
              }}
            >
              <Box
                className="news-image"
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: activeAnnouncement?.imageUrl
                    ? `url(${getAnnouncementImageUrl(activeAnnouncement.imageUrl)})`
                    : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: "transform 2s cubic-bezier(0.2, 0, 0.2, 1)",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    background: "inherit",
                    zIndex: -1,
                    // Fallback background in case image fails
                    backgroundImage: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  }
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(15,23,42,0.84) 0%, rgba(15,23,42,0.22) 52%, transparent 100%)",
                  }}
                />
              </Box>

              {/* Slider Dots */}
              {displayAnnouncements.length > 1 && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    zIndex: 10,
                    display: "flex",
                    gap: 0.8,
                  }}
                >
                  {displayAnnouncements.map((_, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setAnnouncementIndex(idx)}
                      sx={{
                        width: idx === announcementIndex ? 24 : 6,
                        height: 3,
                        borderRadius: 2,
                        bgcolor:
                          idx === announcementIndex
                            ? "secondary.main"
                            : "rgba(255,255,255,0.2)",
                        cursor: "pointer",
                        transition: "0.4s",
                      }}
                    />
                  ))}
                </Box>
              )}

                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: { xs: 3, md: 5 },
                    pt: { md: 3 }, // More space from the top of the text
                    zIndex: 2,
                   background: "linear-gradient(to top, rgba(2, 6, 23, 0.6) 0%, transparent 70%)",
                    backdropFilter: "blur(6px)",
                    borderTop: "0px solid rgba(255,255,255,0.1)",
                  }}
                >
               
                  <Typography
                    variant="h3"
                    fontWeight={1000}
                    color="white"
                    sx={{
                      mb: 2,
                      fontSize: { xs: "1.4rem", md: "2.2rem" },
                      lineHeight: 1.05,
                      letterSpacing: -1,
                      textShadow: "0 8px 24px rgba(0,0,0,0.6)",
                      maxWidth: "90%",
                    }}
                  >
                    {activeAnnouncement?.announcement?.split("\n")[0] ||
                      "The Season Begins"}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 800,
                        fontSize: 8,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {activeAnnouncement?.announcer || "E-TPL News"}
                    </Typography>
                    <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.3)" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 700,
                        fontSize: 8,
                      }}
                    >
                      {formatMatchDate(activeAnnouncement?.createDate) || "TODAY"}
                    </Typography>
                  </Box>
                </Box>
            </Box>

            {/* RIGHT: Live Feed Center */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 3,
                borderRadius: 2,
                background: DESIGN_TOKENS.glassSoft,
                border: `1px solid ${DESIGN_TOKENS.border}`,
                position: "relative",
                overflow: "hidden",
                height: { md: 600 },
                boxShadow: "0 10px 25px -15px rgba(0,0,0,0.1)",
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    className="pulse-dot"
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "#fb7185",
                      boxShadow: "0 0 12px #fb7185, 0 0 20px rgba(251, 113, 133, 0.4)",
                      animation: "pulse 2s infinite ease-in-out",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        inset: -4,
                        borderRadius: "50%",
                        border: "2px solid #fb7185",
                        animation: "pulseOutline 2s infinite ease-out",
                      }
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={1000}
                    color="#0f172a"
                    sx={{ letterSpacing: 2, fontSize: 11 }}
                  >
                    LIVE ACTIVITY FEED
                  </Typography>
                </Box>

              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.8,
                  flex: 1,
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {feedItems.map((feed, idx) => {
                  // Dynamic message generation
                  let displayMsg = "";
                  if (feed.type === "RESULT") {
                    const hName = extractPlayer(feed.data?.home || feed.homeTeamName || "?");
                    const aName = extractPlayer(feed.data?.away || feed.awayTeamName || "?");
                    const hScore = feed.data?.homeScore ?? feed.homeScore ?? 0;
                    const aScore = feed.data?.awayScore ?? feed.awayScore ?? 0;
                    const isDraw = hScore === aScore;
                    const winner = hScore > aScore ? hName : aName;
                    const loser = hScore > aScore ? aName : hName;
                    const wScore = Math.max(hScore, aScore);
                    const lScore = Math.min(hScore, aScore);
                    const templates = [
                      `จบเกมสุดมันส์! ${hName} ${hScore} - ${aScore} ${aName}`,
                      !isDraw ? `ชัยชนะเป็นของ ${winner}! เอาชนะ ${loser} ไปได้ ${wScore}-${lScore}` : `แบ่งแต้มกันไป! ${hName} เสมอกับ ${aName} ${hScore}-${aScore} แบบสุดระทึก`,
                      !isDraw ? `${winner} โชว์ฟอร์มดุ! ถล่ม ${loser} เก็บ 3 แต้มสำคัญ ${wScore}-${lScore}` : `ศึกศักดิ์ศรีจบลงที่ ${hScore}-${aScore}! ${hName} และ ${aName} สู้กันได้สมศักดิ์ศรี`,
                      `คะแนนเท่ากัน! ${hName} และ ${aName} จบเกมที่สกอร์ ${hScore}-${aScore}`,
                      !isDraw ? `${winner} เก็บชัยได้สำเร็จ! เฉือนเอาชนะ ${loser} ไปอย่างหวุดหวิด ${wScore}-${lScore}` : `เกมรับเหนียวแน่น! ${hName} และ ${aName} ทำอะไรกันไม่ได้มากจบที่ ${hScore}-${aScore}`,
                      `แฟนบอลเฮลั่น! ${hName} และ ${aName} สู้กันยิบตาจบที่ ${hScore}-${aScore}`,
                      !isDraw ? `ผลการแข่งขัน: ${winner} คว้าชัยเหนือ ${loser} ${wScore}-${lScore}` : `เจ๊ากันไป! ${hName} และ ${aName} กอดคอแบ่งแต้ม ${hScore}-${aScore}`,
                      `ศึกบิ๊กแมตช์จบลงแล้ว! ${hName} ${hScore} - ${aScore} ${aName}`,
                      !isDraw ? `${winner} แกร่งเกินต้าน! ถล่มเอาชนะ ${loser} ไปได้ ${wScore}-${lScore}` : `สู้กันจนนาทีสุดท้าย! ${hName} เสมอ ${aName} ${hScore}-${aScore}`,
                      `รายงานผล: ${hName} ${hScore} - ${aScore} ${aName} ท่ามกลางเสียงเชียร์กึกก้อง`,
                      `เกมรับสุดแกร่ง! ${hName} และ ${aName} สู้กันจนนาทีสุดท้ายที่ ${hScore}-${aScore}`,
                      !isDraw ? `บุกแหลก! ${winner} ถล่ม ${loser} ไปแบบขาดลอย ${wScore}-${lScore}` : `ผลเสมอที่น่าทึ่ง! ${hName} และ ${aName} แบ่งแต้มกันไป ${hScore}-${aScore}`,
                      `จบแมตช์หยุดโลก! ${hName} ${hScore} - ${aScore} ${aName} สู้กันได้สมศักดิ์ศรี`,
                      !isDraw ? `ชัยชนะอันล้ำค่า! ${winner} เฉือนเอาชนะ ${loser} ไปได้ ${wScore}-${lScore}` : `ไม่มีใครยอมใคร! ${hName} และ ${aName} จบที่สกอร์ ${hScore}-${aScore}`,
                      !isDraw ? `เกมรุกดุดัน! ${winner} ไล่ต้อน ${loser} จนมุม จบที่ ${wScore}-${lScore}` : `เสียงนกหวีดดังขึ้น! ${hName} ${hScore} - ${aScore} ${aName} แบ่งแต้มกันไป`,
                      !isDraw ? `พลิกนรก! ${winner} ฮึดสู้เอาชนะ ${loser} ไปอย่างสุดมันส์ ${wScore}-${lScore}` : `สู้กันได้สูสี! ${hName} และ ${aName} แบ่งคะแนนกันที่ ${hScore}-${aScore}`,
                      `เกมคุณภาพ! ${hName} และ ${aName} โชว์ฟอร์มเยี่ยมจบที่ ${hScore}-${aScore}`,
                      `จบการรายงาน: ${hName} ${hScore} - ${aScore} ${aName} แฟนบอลลุ้นกันตัวโก่ง`,
                      !isDraw ? `ฟอร์มแชมป์! ${winner} จัดหนักถล่ม ${loser} คาบ้าน ${wScore}-${lScore}` : `จบแมตช์ด้วยผลเสมอ! ${hName} และ ${aName} กินกันไม่ลง ${hScore}-${aScore}`,
                      `สรุปผลสดๆ: ${hName} ${hScore} - ${aScore} ${aName} สนุกตื่นเต้นทุกวินาที`
                    ];
                    displayMsg = templates[(idx * 3) % 20];
                  } else if (feed.type === "MARKET") {
                    const manager = feed.data?.manager || "สโมสร";
                    const player = feed.data?.player || "นักเตะ";
                    const templates = [
                      `${manager} ประกาศขึ้นบัญชีขาย ${player} ลงสู่ตลาด!`,
                      `ข่าวร้อน! ${manager} พร้อมเปิดรับข้อเสนอสำหรับ ${player}`,
                      `${manager} กำลังมองหาโอกาสปล่อยตัว ${player} ทันที!`,
                      `ดีลน่าสนใจ! ${manager} ตัดใจปล่อย ${player} ออกจากทีม`,
                      `${manager} ปักป้ายขาย ${player} แฟนๆ รอลุ้นสังกัดใหม่!`,
                      `ใครจะคว้าไป? ${manager} ปล่อย ${player} เข้าสู่ตลาดซื้อขาย`,
                      `${manager} เตรียมปรับทัพ! ประกาศขาย ${player} เรียบร้อย`,
                      `ข้อเสนอต้องโดน! ${manager} รอคนมาดึง ${player} ไปร่วมทีม`,
                      `${manager} ประกาศวางตัว ${player} ไว้ในรายการขาย!`,
                      `ตลาดเริ่มเดือด! ${manager} ส่ง ${player} ลงชิงชัยในตลาดนักเตะ`,
                      `${manager} เปิดไฟเขียว! ${player} พร้อมย้ายสังกัดแล้ว`,
                      `ดีลใหญ่กำลังมา? ${manager} ปล่อย ${player} ลงตลาดซื้อขาย`,
                      `${manager} ประกาศหาบ้านใหม่ให้ ${player} ทันที!`,
                      `โอกาสทอง! ${manager} พร้อมปล่อย ${player} ให้ทีมที่สนใจ`,
                      `${manager} ขยับทัพ! ขึ้นป้ายขาย ${player} เรียบร้อย`,
                      `จับตาให้ดี! ${manager} ปล่อย ${player} ลงสู่ตลาดนักเตะแล้ว`,
                      `${manager} ตัดสินใจเด็ดขาด! ประกาศปล่อย ${player} ออกจากทีม`,
                      `ตลาดสั่นสะเทือน! ${manager} พร้อมขาย ${player} ทันที`,
                      `${manager} เปิดรับทุกข้อเสนอสำหรับ ${player} ในเวลานี้`,
                      `ข่าววงใน! ${manager} เตรียมปล่อย ${player} เพื่อสมทบทุนเสริมทัพ`
                    ];
                    displayMsg = templates[(idx * 3) % 20];
                  } else if (feed.type === "DEAL") {
                    const manager = feed.data?.manager || "สโมสร";
                    const player = feed.data?.player || "นักเตะ";
                    const templates = [
                      `ปิดดีลสายฟ้าแลบ! ${manager} คว้าตัว ${player} สำเร็จ!`,
                      `ยินดีด้วยกับ ${manager}! เสริมทัพด้วย ${player} เรียบร้อย!`,
                      `บอร์ดบริหารปลื้ม! ${manager} เจรจาปิดดีล ${player} สำเร็จ!`,
                      `${manager} ประกาศเปิดตัว ${player} เสริมความแข็งแกร่ง!`,
                      `ดีลยักษ์จบลงแล้ว! ${manager} สอย ${player} เข้ารังสำเร็จ`,
                      `${manager} เดินเกมไว! คว้า ${player} เข้าสู่สโมสรเรียบร้อย`,
                      `แฟนคลับเฮ! ${manager} ประกาศความสำเร็จในการคว้า ${player}`,
                      `${manager} เสริมคม! ดีล ${player} เข้าทีมอย่างเป็นทางการ`,
                      `ปิดจ๊อบ! ${manager} เจรจาลงตัว คว้า ${player} ร่วมทัพ`,
                      `ข่าวดีของแฟนๆ! ${manager} จัดหนักคว้าตัว ${player} เสริมทีม`,
                      `บอร์ดบริหารเฮ! ${manager} ปิดดีล ${player} ระดับท็อปเสริมทัพ`,
                      `${manager} จัดหนัก! คว้าตัว ${player} เข้าสู่ทีมสำเร็จ`,
                      `ยินดีด้วยกับ ${manager}! ได้ ${player} มาเติมเต็มส่วนที่ขาด`,
                      `ดีลประวัติศาสตร์! ${manager} คว้า ${player} ร่วมทีมอย่างยิ่งใหญ่`,
                      `${manager} เสริมความโหด! เปิดตัว ${player} สู่แฟนบอล`,
                      `ปิดจ๊อบสุดสวย! ${manager} เจรจาคว้า ${player} สำเร็จเรียบร้อย`,
                      `ข่าวดีต่อเนื่อง! ${manager} เสริม ${player} เข้าสู่สโมสร`,
                      `${manager} เดินเครื่องเต็มสูบ! ปิดดีล ${player} ได้ทันท่วงที`,
                      `แฟนบอลปลื้ม! ${manager} จัดแจงคว้า ${player} เสริมความแข็งแกร่ง`,
                      `สำเร็จเสร็จสิ้น! ${manager} ประกาศปิดดีล ${player} เข้าทีม`
                    ];
                    displayMsg = templates[(idx * 3) % 20];
                  }

                  return (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        gap: 2,
                        position: "relative",
                        flexShrink: 0,
                        "&:not(:last-child)::after": {
                          content: '""',
                          position: "absolute",
                          left: 14,
                          top: 30,
                          bottom: -20,
                          width: 1.5,
                          bgcolor: "rgba(15,23,42,0.06)",
                          zIndex: 0,
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          bgcolor: alpha(feed.color, 0.12),
                          color: feed.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          border: `1px solid ${alpha(feed.color, 0.2)}`,
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {feed.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pt: 0.2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: feed.color,
                            fontWeight: 900,
                            fontSize: 9,
                            display: "block",
                            mb: 0.3,
                            letterSpacing: 0.5,
                          }}
                        >
                          {feed.type} • {feed.time}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#0f172a",
                            fontWeight: 800,
                            fontSize: 12,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {displayMsg || feed.msg}
                        </Typography>
                        {feed.detail && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#f59e0b",
                              fontWeight: 800,
                              fontSize: 11,
                              display: "block",
                              mt: 0.2
                            }}
                          >
                            • {feed.detail}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: "1px solid rgba(15,23,42,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <Typography variant="caption" fontWeight={800} color="text.disabled">
                  FOLLOW US
                </Typography>
                <Box display="flex" gap={0.5}>
                  {[
                    {
                      icon: <Facebook sx={{ fontSize: 16 }} />,
                      url: "https://www.facebook.com/thaipesleague",
                    },
                    {
                      icon: <LineIcon sx={{ fontSize: 16 }} />,
                      url: "https://lin.ee/TxcwFFB",
                    },
                    {
                      icon: <YouTube sx={{ fontSize: 16 }} />,
                      url: "https://www.youtube.com/@iamcrazygamerch",
                    },
                    {
                      icon: <DiscordIcon sx={{ fontSize: 16 }} />,
                      url: "https://discord.gg/jXsh65jqy",
                    },
                  ].map((social, i) => (
                    <IconButton
                      key={i}
                      component="a"
                      href={social.url}
                      target="_blank"
                      size="small"
                      sx={{
                        color: "rgba(15,23,42,0.4)",
                        transition: "0.2s",
                        "&:hover": {
                          color: "#4f46e5",
                          bgcolor: "rgba(79,70,229,0.05)",
                        },
                      }}
                    >
                      {social.icon}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>


        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: { xs: 2.5, md: 3 },
            mb: 3,
          }}
        >
          {/* Row 1: Ai Magazine, Event, Standing, Latest */}
          <Paper elevation={0} sx={{ ...panelSx, p: 0, height: 395, overflow: "hidden" }}>
            <AiMagazineBox magazineData={magazineData.slice(0, 5)} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, height: 395, overflow: "hidden" }}>
            <EventUpdateBox announcements={eventData.slice(0, 5)} loading={loading} />
          </Paper>

          <Paper
            elevation={0}
            sx={{ ...panelSx, p: 0, height: 395, display: "flex", flexDirection: "column" }}
          >
            <TopStandingBox standings={standings} loading={loading} />
          </Paper>

          <Paper
            elevation={0}
            sx={{ ...panelSx, p: 0, height: 395, display: "flex", flexDirection: "column" }}
          >
            <LatestResultBox recentMatches={recentMatches} loading={loading} />
          </Paper>

          {/* Row 2: Elite showcase, Top Score, Hof, Active Member */}
          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <EliteShowcaseBox elitePlayers={elitePlayers} loading={loading} clubs={clubs} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <TopScorerBox standings={enrichedStandings} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <HofBox hofData={hofData} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <ActiveMemberBox
              visibleMembers={visibleMembers}
              loading={loading}
              currentIndex={memberBannerIndex}
              totalCount={sortedMembers.length}
              pageSize={memberBannerSize}
              onPageChange={setMemberBannerIndex}
            />
          </Paper>
        </Box>



        {/* ─── Super Minimal Footer ─── */}
        <Box
          component="footer"
          sx={{
            mt: 4,
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.96) 100%)",
            borderTop: `1px solid ${DESIGN_TOKENS.border}`,
            pt: 4,
            pb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Subtle Partners List */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 1000,
              px: 4,
              mb: 4,
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 3,
              opacity: 0.62,
            }}
          >
            {[
              "eFOOTBALL",
              "KONAMI",
              "THAI PES LEAGUE",
              "eTPL",
              "เล่นเกมมันผิดตรงไหน",
            ].map((name, i) => (
              <Typography
                key={i}
                variant="caption"
                fontWeight={900}
                sx={{
                  color: "rgba(15,23,42,0.62)",
                  letterSpacing: 2,
                  fontSize: 10,
                }}
              >
                {name}
              </Typography>
            ))}
          </Box>

          <Divider
            sx={{
              width: "100%",
              maxWidth: 1100,
              borderColor: "rgba(15,23,42,0.12)",
              mb: 3,
            }}
          />

          {/* Clean Bottom Bar */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 1100,
              px: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(15,23,42,0.56)",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              © {new Date().getFullYear()} THAI PES LEAGUE. ALL RIGHTS
              RESERVED.
            </Typography>

            <Box display="flex" gap={1}>
              {[
                {
                  icon: <Facebook sx={{ fontSize: 18 }} />,
                  url: "https://www.facebook.com/thaipesleague",
                },
                {
                  icon: <LineIcon sx={{ fontSize: 18 }} />,
                  url: "https://lin.ee/TxcwFFB",
                },
                {
                  icon: <YouTube sx={{ fontSize: 18 }} />,
                  url: "https://www.youtube.com/@iamcrazygamerch",
                },
                {
                  icon: <DiscordIcon sx={{ fontSize: 18 }} />,
                  url: "https://discord.gg/jXsh65jqy",
                },
              ].map((social, i) => (
                <IconButton
                  key={i}
                  component="a"
                  href={social.url}
                  target="_blank"
                  size="small"
                  sx={{
                    color: "rgba(15,23,42,0.48)",
                    transition: "0.2s",
                    "&:hover": { color: "#4f46e5", bgcolor: "transparent" },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainPage;
