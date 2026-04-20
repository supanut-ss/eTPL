import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { getLogoUrl, getPlayerFaceUrl, getPlayerCardUrl } from "../utils/imageUtils";
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
} from "@mui/material";
import {
  AccountCircle,
  SportsSoccer,
  Leaderboard,
  EmojiEvents,
  CheckCircle,
  HourglassBottom,
  Groups,
  Campaign,
  Login,
  TrendingUp,
  Dashboard,
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
import auctionService from "../services/auctionService";
import { 
  LocalFireDepartment, 
  Timeline, 
  ConfirmationNumber, 
  ArrowForward,
  InfoOutlined,
  EmojiEvents as TrophyIcon,
  Facebook,
  YouTube,
} from "@mui/icons-material";

// ─── helpers ────────────────────────────────────────────────────────────────


const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
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
    <path d="M12 2C6.477 2 2 6.134 2 11.235c0 4.54 3.52 8.356 8.33 9.123l-.304 1.264c-.041.173.057.34.246.392.057.016.113.023.17.023.128 0 .252-.036.342-.111l2.272-1.882c.12-.101.272-.158.43-.158h.167c5.523 0 10-4.134 10-9.235S17.523 2 12 2z" fill="currentColor"/>
  </SvgIcon>
);

const DiscordIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
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

// ─── rank medal ──────────────────────────────────────────────────────────────
const RankMedal = ({ rank }) => {
  const medals = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        bgcolor: medals[rank] || "grey.100",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 12,
        color: medals[rank] ? "#444" : "text.secondary",
        flexShrink: 0,
        border: medals[rank]
          ? "2px solid rgba(0,0,0,0.08)"
          : "2px solid #e2e8f0",
      }}
    >
      {rank}
    </Box>
  );
};

// ─── stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, loading }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 4,
      background: "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(12px)",
      overflow: "hidden",
      position: "relative",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": { 
        transform: "translateY(-4px)", 
        boxShadow: "0 12px 24px -10px rgba(0,0,0,0.1)",
        borderColor: color,
        "& .icon-box": { transform: "scale(1.1) rotate(5deg)" }
      },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={60} height={40} />
          ) : (
            <Typography variant="h4" fontWeight={900} mt={0.5} color="text.primary">
              {value ?? "—"}
            </Typography>
          )}
        </Box>
        <Box
          className="icon-box"
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            transition: "all 0.3s ease",
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ─── Market Activity Row ──────────────────────────────────────────────────
const ActivityRow = ({ activity }) => {
  const isAward = activity.type?.toLowerCase().includes("award") || activity.reason?.toLowerCase().includes("bonus");
  const isTransfer = activity.type?.toLowerCase().includes("transfer") || activity.type?.toLowerCase().includes("buy");
  const isRelease = activity.type?.toLowerCase().includes("release");

  let color = "#64748b";
  let icon = <InfoOutlined fontSize="small" />;
  
  if (isAward) { color = "#f59e0b"; icon = <LocalFireDepartment fontSize="small" />; }
  if (isTransfer) { color = "#6366f1"; icon = <Timeline fontSize="small" />; }
  if (isRelease) { color = "#ef4444"; icon = <InfoOutlined fontSize="small" />; }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: "transparent",
        border: "1px solid transparent",
        "&:hover": { bgcolor: "rgba(0,0,0,0.02)", borderColor: "divider" },
        transition: "all 0.2s ease"
      }}
    >
      <Box sx={{ color, display: "flex", p: 1, bgcolor: `${color}11`, borderRadius: 1.5 }}>
        {icon}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {activity.playerName || activity.description || activity.type || "System Activity"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {activity.userName || "System"} • {activity.amount ? `${activity.amount.toLocaleString()} TP` : "Action"}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
        {formatMatchDate(activity.createdAt)}
      </Typography>
    </Box>
  );
};

// ─── section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, color = "#0f172a" }) => (
  <Box
    display="flex"
    alignItems="center"
    px={2}
    py={1.5}
    sx={{
      background: `linear-gradient(90deg, ${color} 0%, ${color}cc 60%, ${color}33 100%)`,
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Box sx={{ color: "white", display: "flex", mr: 1 }}>{icon}</Box>
    <Typography fontWeight={700} fontSize={14} color="white">
      {title}
    </Typography>
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

const TopPlayersBanner = React.memo(({ topPlayers, loading, chunkIndex, members = [], clubs = [] }) => {
  const theme = useTheme();

  if (topPlayers.length === 0 && !loading) return null;

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 6,
        overflow: "hidden",
        mb: 4,
        minHeight: { xs: "auto", md: 240 },
        display: "flex", 
        flexDirection: { xs: "column", md: "row" },
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        boxShadow: "0 20px 40px -20px rgba(99, 102, 241, 0.15)",
        border: "1px solid",
        borderColor: "rgba(99, 102, 241, 0.1)",
        transition: "all 0.5s ease-in-out",
        "&::before": {
          content: '"ELITE"',
          position: "absolute",
          bottom: -20,
          left: 20,
          fontSize: { xs: 60, md: 100 },
          fontWeight: 900,
          color: "rgba(99, 102, 241, 0.03)",
          zIndex: 0,
          pointerEvents: "none",
        }
      }}
    >
      <Box 
        sx={{ 
          p: { xs: 3, md: 4 }, 
          display: "flex", 
          flexDirection: { xs: "row", md: "column" },
          alignItems: "center", 
          justifyContent: "center",
          gap: { xs: 2.5, md: 1 }, 
          flex: { md: "0 0 240px" },
          bgcolor: "rgba(99, 102, 241, 0.03)",
          borderRight: { md: "1px solid rgba(99, 102, 241, 0.08)" },
          borderBottom: { xs: "1px solid rgba(99, 102, 241, 0.08)", md: "none" },
          textAlign: "center",
          position: "relative",
          zIndex: 1
        }}
      >
        <Box
          sx={{
            width: { xs: 56, md: 80 },
            height: { xs: 56, md: 80 },
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: { xs: 0, md: 2 },
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid #d97706",
              opacity: 0.3,
            }
          }}
        >
          <EmojiEvents sx={{ fontSize: { xs: 28, md: 44 }, color: "white" }} />
        </Box>
        <Box sx={{ textAlign: { xs: "left", md: "center" } }}>
          <Typography variant="h6" fontWeight={900} sx={{ 
            letterSpacing: 1, 
            lineHeight: 1.1, 
            fontSize: { xs: 18, md: 24 },
            background: "linear-gradient(to bottom, #4f46e5, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            ELITE
          </Typography>
          <Typography variant="caption" sx={{ 
            color: "#d97706", 
            fontWeight: 800, 
            textTransform: "uppercase", 
            letterSpacing: 3, 
            fontSize: { xs: 9, md: 11 },
            opacity: 0.8
          }}>
            Top 20 Showcase
          </Typography>
        </Box>
        <Chip 
          label={`RANK ${chunkIndex * 10 + 1} - ${chunkIndex * 10 + 10}`} 
          size="small" 
          sx={{ 
            ml: { xs: "auto", md: 0 }, 
            mt: { xs: 0, md: 2 }, 
            height: 22, 
            fontSize: 10, 
            bgcolor: "primary.main", 
            color: "white", 
            fontWeight: 900,
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
          }} 
        />
      </Box>

      {/* Top Players - PESDB Card Style */}
      <Box 
        sx={{ 
          flex: 1, 
          p: { xs: 2, sm: 3, md: 4 }, 
          display: "flex", 
          alignItems: "center", 
          overflowX: "auto", 
          gap: { xs: 3, md: 4 }, 
          "&::-webkit-scrollbar": { display: "none" },
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.4s ease-in-out"
        }}
      >
        {loading && topPlayers.length === 0 ? (
           [...Array(10)].map((_, i) => (
             <Skeleton key={i} variant="rounded" width={100} height={140} sx={{ borderRadius: 3 }} />
           ))
        ) : (
          topPlayers.map((player, idx) => {
            const pId = player.idPlayer || player.playerId || player.id || player.player_id;
            const price = player.pricePaid || player.valuation || player.price || player.cost || 0;
            
            // Try to find handle in members list or clubs list
            const idToMatch = player.user_id || player.userId || player.ownedByUserId || "";
            const matchedMember = members.find(m => 
              (m.userId && String(m.userId) === String(idToMatch)) || 
              (m.id && String(m.id) === String(idToMatch))
            ) || clubs.find(c => 
              (c.userId && String(c.userId) === String(idToMatch)) ||
              (c.userName && String(c.userName) === String(idToMatch))
            );
            
            const owner = matchedMember?.userId || matchedMember?.userName || player.userName || player.ownerName || player.winnerName || idToMatch || "N/A";
            
            return (
              <Box 
                key={`${chunkIndex}-${idx}`}
                sx={{ 
                  minWidth: 100, 
                  textAlign: "center",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  animation: `${dealCard} 2.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  animationDelay: `${idx * 0.25}s`,
                  opacity: 0,
                  "&:hover": {
                    transform: "translateY(-8px)",
                    "& .player-card": { filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.2))" },
                    "& .ranking": { color: "secondary.main", opacity: 0.15 }
                  }
                }}
              >
                {/* TP Badge */}
                <Box 
                  sx={{ 
                    position: "absolute", 
                    top: -10, 
                    right: 0, 
                    zIndex: 2,
                    background: "linear-gradient(90deg, #fbbf24, #fff, #fbbf24)",
                    backgroundSize: "200% auto",
                    animation: `${shine} 3s linear infinite`,
                    color: "#0f172a",
                    px: 1,
                    py: 0.3,
                    borderRadius: 1.5,
                    fontSize: 10,
                    fontWeight: 950,
                    boxShadow: "0 4px 15px rgba(217, 119, 6, 0.4)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    pointerEvents: "none"
                  }}
                >
                  {price.toLocaleString()} TP
                </Box>

                <Typography 
                  className="ranking"
                  sx={{ 
                     position: "absolute", 
                     top: -15, 
                     left: 20, 
                     fontSize: 64, 
                     fontWeight: 900, 
                     color: "rgba(99, 102, 241, 0.05)",
                     WebkitTextStroke: "1px rgba(99, 102, 241, 0.1)",
                     WebkitTextFillColor: "transparent",
                     zIndex: 0,
                     lineHeight: 1,
                     transition: "all 0.3s ease"
                  }}
                >
                  {chunkIndex * 10 + idx + 1}
                </Typography>
                
                <Box sx={{ position: "relative", zIndex: 1 }}>
                   <Box
                     component="img"
                     className="player-card"
                     src={player.imageUrl || getPlayerCardUrl(pId)}
                     alt={player.playerName}
                     onError={(e) => { 
                       e.target.onerror = null;
                       e.target.src = getPlayerFaceUrl(pId);
                       e.target.style.height="80px";
                       e.target.style.width="80px";
                       e.target.style.borderRadius="50%";
                       e.target.style.marginTop="20px";
                       e.target.style.objectFit="cover";
                     }}
                     sx={{ 
                       width: "auto", 
                       height: 120, 
                       mx: "auto", 
                       mb: 1,
                       objectFit: "contain",
                       animation: `${goldGlow} 3s ease-in-out infinite`,
                       transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                       "&:hover": {
                         filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 1))",
                         transform: "scale(1.05)"
                       }
                     }}
                   />
                </Box>

               <Typography variant="body2" fontWeight={800} color="text.primary" noWrap sx={{ fontSize: 13, maxWidth: 100 }}>
                 {player.playerName}
               </Typography>
               <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                 {owner}
               </Typography>
             </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
});

const panelSx = {
  borderRadius: 4,
  overflow: "hidden",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 18px 45px -30px rgba(15, 23, 42, 0.35)",
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
  const [transactions, setTransactions] = useState([]);
  const [memberBannerIndex, setMemberBannerIndex] = useState(0);
  const [marketActivity, setMarketActivity] = useState([]);
  const [marketIndex, setMarketIndex] = useState(0);
  const [clubs, setClubs] = useState([]);
  const [currentClubIndex, setCurrentClubIndex] = useState(0);
  const [bannerSquad, setBannerSquad] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const fixtureRequest = user ? getFixtures({}) : getPublicFixtures();
    const canLoadMembers = !!user;

    return Promise.all([
      getStandings(),
      fixtureRequest,
      getPublicLastFixtures(),
      getPublicAnnouncements(),
      auctionService.getClubs().catch(() => ({ data: [] })),
    ])
      .then(([sRes, fRes, lastRes, aRes, cRes]) => {
        setStandings(sRes.data.data || []);
        setFixtures(fRes.data.data || []);
        setLastFixtures(lastRes.data.data || []);
        const sortedAnnouncements = (aRes.data.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate));
        setAnnouncements(sortedAnnouncements);
        setClubs(cRes.data || cRes || []);

        // Load users publicly for banner profile pics
        getUsers()
          .then(uRes => {
            setMembers(uRes.data.data || []);
          })
          .catch(err => console.error("Public users load failed", err));

        if (!canLoadMembers) {
          setTransactions([]);
          return null;
        }

        return Promise.all([
          auctionService.getGlobalTransactions(1, 100).catch(() => ({ data: [] })),
          auctionService.getTransferBoard().catch(() => ({ data: [] }))
        ])
          .then(([tRes, bRes]) => {
            // Format and Combine Activities
            const txs = tRes.data?.items || tRes.items || [];
            const listings = bRes.data || bRes || [];

            const combined = [];
            
            // Add Confirmed Transactions (Sold Out / Accepted)
            txs.forEach(tx => {
              const desc = (tx.description || "").toLowerCase();
              // Check for both English and Thai keywords used in DB
              const isSignificant = desc.includes("won") || 
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
                  title: tx.playerName || tx.relatedPlayerName || "Deal Confirmed",
                  subtitle: `${tx.userName || "System"} ${tx.description}`,
                  amount: tx.amount,
                  date: tx.createdAt
                });
              }
            });

            // Add Current Listings
            listings.forEach(player => {
              combined.push({
                id: `listing-${player.squadId}`,
                type: "LISTING",
                title: player.playerName,
                subtitle: `${player.ownerName || "สโมสร"} ประกาศขายนักเตะ`,
                amount: player.listingPrice || player.price,
                date: new Date().toISOString()
              });
            });

            // Sort by date and take latest 10
            const sorted = combined.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
            setMarketActivity(sorted);
          })
          .catch((err) => {
            console.error("Member/Transaction load error", err);
          });
      })
      .catch((err) => {
        if (!isSilent) {
          const errorMsg = err.response?.data?.message || err.message || "Failed to load dashboard data";
          setError(errorMsg);
        }
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-reload data every 30 seconds
    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    setAnnouncementIndex(0);
  }, [announcements]);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;

    const timerId = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);

    return () => clearInterval(timerId);
  }, [announcements]);

  const activeManagerPic = useMemo(() => {
    const currentClub = clubs[currentClubIndex];
    if (!currentClub) return null;
    return members.find(m => m.userId === currentClub.userId || m.lineName === currentClub.userId)?.lineProfilePic || currentClub.lineProfilePic;
  }, [clubs, currentClubIndex, members]);

  const season = standings[0]?.season || "";

  const totalMatches = fixtures.length;
  const playedMatches = fixtures.filter(
    (f) => f.homeScore != null && f.awayScore != null,
  ).length;
  const pendingMatches = totalMatches - playedMatches;
  const totalTeams = standings.length;

  const top10 = standings.slice(0, 10).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const recentMatches = (lastFixtures || []).slice(0, 10);
  const activeAnnouncement = announcements[announcementIndex] || null;

  const sortedMembers = members
    .filter((member) => member.userLevel !== "admin")
    .sort((a, b) => {
      return (a.userId || "").localeCompare(b.userId || "");
    });
  const memberBannerSize = 10;
  const memberBannerCount = Math.ceil(sortedMembers.length / memberBannerSize);
  const visibleMembers = sortedMembers.slice(
    memberBannerIndex * memberBannerSize,
    memberBannerIndex * memberBannerSize + memberBannerSize,
  );
  const memberPlaceholders = Math.max(0, memberBannerSize - visibleMembers.length);

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

  useEffect(() => {
    if (marketActivity.length <= 1) return undefined;
    const timerId = setInterval(() => {
      setMarketIndex((prev) => (prev + 1) % marketActivity.length);
    }, 4500);
    return () => clearInterval(timerId);
  }, [marketActivity.length]);

  // Fetch Top 20 League Players
  const fetchBannerSquad = useCallback(async () => {
    try {
      if (bannerSquad.length === 0) setBannerLoading(true);
      
      // Fetch owned players from the whole league
      const res = await auctionService.searchPlayers({ 
        ownedOnly: true, 
        pageSize: 100 // Get enough to find top 20
      });
      
      const allPlayers = res.data?.items || res.items || [];
      const top20 = allPlayers
        .sort((a, b) => {
          const priceA = a.pricePaid || 0;
          const priceB = b.pricePaid || 0;
          if (priceB !== priceA) return priceB - priceA;
          if (b.playerOvr !== a.playerOvr) return b.playerOvr - a.playerOvr;
          return (a.playerName || "").localeCompare(b.playerName || "");
        })
        .slice(0, 20);
      
      setBannerSquad(top20);
    } catch (err) {
      console.error("League Top 20 fetch error", err);
    } finally {
      setBannerLoading(false);
    }
  }, [bannerSquad.length]);

  useEffect(() => {
    fetchBannerSquad();
  }, [fetchBannerSquad]);

  // Rotate through Top 20 in chunks of 10
  useEffect(() => {
    if (bannerSquad.length <= 10) return undefined;
    const timerId = setInterval(() => {
      setCurrentClubIndex(prev => (prev + 1) % 2); // 2 chunks of 10
    }, 12000); 
    return () => clearInterval(timerId);
  }, [bannerSquad.length]);

  const visiblePlayers = useMemo(() => {
    const start = currentClubIndex * 10;
    return bannerSquad.slice(start, start + 10);
  }, [bannerSquad, currentClubIndex]);

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          borderRadius: 8,
          background: "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(240,245,255,0.95) 50%, rgba(224,231,255,0.9) 100%)",
          backdropFilter: "blur(20px)",
          color: "text.primary",
          position: "relative",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(99, 102, 241, 0.2)",
          boxShadow: "0 20px 40px -20px rgba(15, 23, 42, 0.12)",
        }}
      >
        {/* Animated Orbs */}
        <Box
          sx={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: "5%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
            },
            gap: 4,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box>
            <Typography variant="h3" fontWeight={900} letterSpacing={-1} lineHeight={1} color="primary.main" sx={{ fontSize: { xs: "2rem", md: "3rem" } }}>
              <Box component="span" sx={{ color: "secondary.main" }}>eTPL</Box>
            </Typography>
            
            <Typography variant="body1" sx={{ color: "text.secondary", mt: 2.5, mb: 4, maxWidth: 500, fontSize: 18, fontWeight: 500 }}>
              Welcome back to eTPL by Thai PES League. Track your squad's performance and stay updated with the latest market moves.
            </Typography>

            <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
              <Chip
                icon={<SportsSoccer sx={{ color: "primary.main !important", fontSize: "18px !important" }} />}
                label={`Season ${season || "1"}`}
                sx={{ 
                  bgcolor: "white", 
                  color: "primary.main", 
                  px: 1, 
                  py: 2.2, 
                  fontSize: 14,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  "& .MuiChip-label": { fontWeight: 700 }
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: "99px",
                  bgcolor: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.15)",
                  color: "success.dark",
                  mr: 2
                }}
              >
                <Timeline sx={{ fontSize: 18 }} />
                <Typography variant="body2" fontWeight={800}>
                  {Math.round((playedMatches / (totalMatches || 1)) * 100)}% Season Complete
                </Typography>
              </Box>

              {/* Social Icons */}
              <Box display="flex" gap={1}>
                <Tooltip title="Facebook Group">
                  <IconButton 
                    component="a"
                    href="https://www.facebook.com/thaipesleague"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small" 
                    sx={{ 
                      bgcolor: "rgba(24, 119, 242, 0.1)", 
                      color: "#1877f2",
                      "&:hover": { bgcolor: "#1877f2", color: "white" },
                      transition: "all 0.3s ease"
                    }}
                  >
                    <Facebook fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Line Community">
                  <IconButton 
                    component="a"
                    href="https://lin.ee/TxcwFFB"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small" 
                    sx={{ 
                      bgcolor: "rgba(0, 185, 0, 0.1)", 
                      color: "#00b900",
                      "&:hover": { bgcolor: "#00b900", color: "white" },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <LineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="YouTube Channel">
                  <IconButton 
                    component="a"
                    href="https://www.youtube.com/@iamcrazygamerch?sub_confirmation=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small" 
                    sx={{ 
                      bgcolor: "rgba(255, 0, 0, 0.1)", 
                      color: "#ff0000",
                      "&:hover": { bgcolor: "#ff0000", color: "white" },
                      transition: "all 0.3s ease"
                    }}
                  >
                    <YouTube fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Discord Server">
                  <IconButton 
                    component="a"
                    href="https://discord.gg/jXsh65jqy"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small" 
                    sx={{ 
                      bgcolor: "rgba(88, 101, 242, 0.1)", 
                      color: "#5865f2",
                      "&:hover": { bgcolor: "#5865f2", color: "white" },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <DiscordIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: { xs: 1.5, sm: 2.5 },
              p: 1,
            }}
          >
            {[
              { label: "Active Manager", value: user?.userId || "Guest Access", icon: <AccountCircle />, color: "#4f46e5" },
              { label: "Total Clubs", value: totalTeams || 0, icon: <Groups />, color: "#3b82f6" },
              { label: "Matches Completed", value: `${playedMatches} / ${totalMatches}`, icon: <SportsSoccer />, color: "#10b981" },
              { label: "Market Status", value: "Active", dot: "#10b981", icon: <Timeline />, color: "#f59e0b" },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 6,
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 10px 25px -10px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 3 },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: `0 15px 30px -10px ${item.color}25`,
                    borderColor: `${item.color}40`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 44, sm: 56 },
                    height: { xs: 44, sm: 56 },
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${item.color}15`,
                    color: item.color,
                    flexShrink: 0
                  }}
                >
                  {React.cloneElement(item.icon, { sx: { fontSize: { xs: 22, sm: 28 } } })}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: "text.secondary", 
                      fontWeight: 800, 
                      textTransform: "uppercase", 
                      letterSpacing: 1.5,
                      fontSize: { xs: 9, sm: 11 },
                      display: "block",
                      mb: 0.5
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {item.dot && (
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          bgcolor: item.dot,
                          boxShadow: `0 0 8px ${item.dot}` 
                        }} 
                      />
                    )}
                    <Typography 
                      variant="h5" 
                      fontWeight={900} 
                      noWrap
                      sx={{ 
                        color: "text.primary", 
                        fontSize: { xs: 18, sm: 24 },
                        letterSpacing: -0.5
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Top 20 Showcase Banner */}
      <TopPlayersBanner 
        topPlayers={visiblePlayers} 
        loading={bannerLoading || (loading && bannerSquad.length === 0)}
        chunkIndex={currentClubIndex}
        members={members}
        clubs={clubs}
      />

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
            md: "1fr 1fr",
          },
          gap: 3,
          mb: 3
        }}
      >
        <Paper elevation={0} sx={{ ...panelSx, border: "none", bgcolor: "rgba(255,255,255,0.7)" }}>
          <SectionHeader
            icon={<Campaign fontSize="small" />}
            title="League Announcements"
            color="#f59e0b"
          />

          <Box p={3} sx={{ minHeight: 180, display: "flex", flexDirection: "column" }}>
            {announcements.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                flex={1}
                textAlign="center"
                gap={1}
              >
                <Campaign sx={{ color: "grey.300", fontSize: 48 }} />
                <Typography fontWeight={700} color="text.secondary">No active announcements</Typography>
              </Box>
            ) : (
              <Box flex={1}>
                {activeAnnouncement && (
                   <Box
                    key={activeAnnouncement.id}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 4,
                      bgcolor: "white",
                      boxShadow: "0 4px 12px -5 rgba(0,0,0,0.05)",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: 1.5, sm: 2.5 },
                      minHeight: 120
                    }}
                  >
                    <Box sx={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: 3, 
                      bgcolor: "rgba(245, 158, 11, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "warning.main",
                      flexShrink: 0
                    }}>
                      <Campaign />
                    </Box>
                    <Box flex={1}>
                      <Typography
                        variant="body1"
                        color="text.primary"
                        sx={{ whiteSpace: "pre-wrap", fontWeight: 700, lineHeight: 1.4, mb: 0.5 }}
                      >
                        {activeAnnouncement.announcement}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "warning.main" }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Issued by {activeAnnouncement.announcer || "System"} • {formatMatchDate(activeAnnouncement.createDate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            
            {announcements.length > 1 && (
              <Box display="flex" justifyContent="center" gap={1} mt="auto" py={2}>
                {announcements.map((_, index) => (
                  <Box
                    key={index}
                    onClick={() => setAnnouncementIndex(index)}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      cursor: "pointer",
                      bgcolor: index === announcementIndex ? "#f59e0b" : "grey.200",
                      transition: "all 0.3s ease"
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, border: "none", bgcolor: "rgba(255,255,255,0.7)" }}>
          <SectionHeader
            icon={<LocalFireDepartment fontSize="small" />}
            title="Market Pulse — Latest Moves"
            color="#6366f1"
          />

          <Box p={3} sx={{ minHeight: 180, display: "flex", flexDirection: "column" }}>
            {marketActivity.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                flex={1}
                textAlign="center"
                gap={1}
              >
                <Timeline sx={{ color: "grey.300", fontSize: 48 }} />
                <Typography fontWeight={700} color="text.secondary">Market is quiet right now</Typography>
              </Box>
            ) : (
              <Box flex={1}>
                {marketActivity[marketIndex] && (
                  <Box
                    key={marketActivity[marketIndex].id}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 4,
                      bgcolor: "white",
                      boxShadow: "0 4px 12px -5px rgba(0,0,0,0.05)",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: 1.5, sm: 2.5 },
                      minHeight: 120
                    }}
                  >
                    <Box sx={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: 3, 
                      bgcolor: marketActivity[marketIndex].type === "DEAL" ? "rgba(99, 102, 241, 0.1)" : "rgba(16, 185, 129, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: marketActivity[marketIndex].type === "DEAL" ? "indigo.500" : "success.main"
                    }}>
                      {marketActivity[marketIndex].type === "DEAL" ? <CheckCircle /> : <Timeline />}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="body1" fontWeight={800} color="primary.main">
                        {marketActivity[marketIndex].title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 1 }}>
                        {marketActivity[marketIndex].subtitle}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={`${marketActivity[marketIndex].amount?.toLocaleString()} TP`} 
                          size="small" 
                          sx={{ 
                            fontWeight: 800, 
                            bgcolor: marketActivity[marketIndex].type === "DEAL" ? "indigo.50" : "success.50",
                            color: marketActivity[marketIndex].type === "DEAL" ? "indigo.700" : "success.700",
                            border: "1px solid",
                            borderColor: marketActivity[marketIndex].type === "DEAL" ? "indigo.100" : "success.100"
                          }} 
                        />
                        <Typography variant="caption" color="text.disabled" fontWeight={600}>
                          {marketActivity[marketIndex].type === "DEAL" ? "SUCCESSFUL MOVE" : "FOR SALE"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            
            {marketActivity.length > 1 && (
              <Box display="flex" justifyContent="center" gap={1} mt={3}>
                {marketActivity.map((_, index) => (
                  <Box
                    key={index}
                    onClick={() => setMarketIndex(index)}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      cursor: "pointer",
                      bgcolor: index === marketIndex ? "#6366f1" : "grey.200",
                      transition: "all 0.3s ease"
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
          md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 3,
          alignItems: "stretch",
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ ...panelSx, height: "100%", minHeight: 740, display: "flex", flexDirection: "column" }}>
          <SectionHeader
            icon={<Leaderboard fontSize="small" />}
            title="Standings — Top 10"
            color="#6366f1"
          />

          {loading ? (
            <Box p={2} >
              {[...Array(10)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  height={38}
                  sx={{ mb: 0.6, borderRadius: 1 }}
                />
              ))}
            </Box>
          ) : (
            <Box>
              {/* Podium View for Top 3 */}
              {top10.length >= 3 && (
                <Box 
                  sx={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "flex-end", 
                    gap: 1.5, 
                    p: 3, 
                    bgcolor: "rgba(248,250,252,0.5)",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    mb: 1
                  }}
                >
                  {[top10[1], top10[0], top10[2]].map((team, idx) => {
                    const isWinner = idx === 1;
                    const height = isWinner ? 100 : 80;
                    return (
                      <Box 
                        key={team.id || idx} 
                        sx={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          width: { xs: 80, sm: 90 },
                        }}
                      >
                         <Box
                          component="img"
                          src={getLogoUrl(team.teamName)}
                          alt={team.teamName}
                          sx={{
                            width: isWinner ? 50 : 38,
                            height: isWinner ? 50 : 38,
                            objectFit: "contain",
                            mb: 1,
                            filter: isWinner ? "drop-shadow(0 0 8px rgba(255,215,0,0.4))" : "none"
                          }}
                        />
                        <Typography variant="caption" fontWeight={800} noWrap sx={{ maxWidth: "100%", mb: 0.5 }}>
                          {extractPlayer(team.team)}
                        </Typography>
                        <Box 
                          sx={{ 
                            width: "100%", 
                            height: height, 
                            background: isWinner 
                              ? "linear-gradient(180deg, #FFD700 0%, #FFB900 100%)" 
                              : idx === 0 
                                ? "linear-gradient(180deg, #C0C0C0 0%, #A0A0A0 100%)"
                                : "linear-gradient(180deg, #CD7F32 0%, #A0522D 100%)",
                            borderRadius: "12px 12px 4px 4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            boxShadow: isWinner ? "0 10px 20px -5px rgba(255,185,0,0.3)" : "none"
                          }}
                        >
                          <Typography variant="h5" fontWeight={900}>{team.rank}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {top10.slice(3).map((team, idx) => (
                <Box
                  key={team.id ?? idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 3,
                    py: 1.25,
                    borderBottom: idx < top10.length - 4 ? "1px solid" : "none",
                    borderColor: "divider",
                    bgcolor: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                    minHeight: DASHBOARD_ROW_HEIGHT,
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.02)", px: 3.5 }
                  }}
                >
                  <Box width={32} display="flex" justifyContent="center">
                    <RankMedal rank={team.rank} />
                  </Box>
                  <Box
                    component="img"
                    src={getLogoUrl(team.teamName)}
                    alt={team.teamName}
                    sx={{
                      width: 26,
                      height: 26,
                      objectFit: "contain",
                      mx: 1.5,
                      flexShrink: 0,
                    }}
                  />
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={13} fontWeight={700} noWrap>
                      {extractPlayer(team.team)}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary" noWrap>
                      {team.pld ?? 0} Matched · {team.w ?? 0}W {team.d ?? 0}D {team.l ?? 0}L
                    </Typography>
                  </Box>
                  <Box width={48} textAlign="center" mr={2}>
                    <Typography
                      fontSize={15}
                      fontWeight={900}
                      color="secondary.main"
                    >
                      {team.pts ?? 0}
                    </Typography>
                  </Box>
                  <Box width={56} display="flex" justifyContent="center" mr={1}>
                    <FormDots last={team.last} />
                  </Box>
                </Box>
              ))}

              {top10.length === 0 && (
                <Box px={2} py={3} textAlign="center" >
                  <Typography variant="body2" color="text.secondary">
                    No standings data
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, height: "100%", minHeight: 740, display: "flex", flexDirection: "column" }}>
          <SectionHeader
            icon={<SportsSoccer fontSize="small" />}
            title="Latest 10 Matches"
            color="#22c55e"
          />

          {loading ? (
            <Box p={2}>
              {[...Array(6)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  height={46}
                  sx={{ mb: 0.6, borderRadius: 1 }}
                />
              ))}
            </Box>
          ) : (
            <Box>
              {recentMatches.map((fixture, idx) => {
                const homeScore = fixture.homeScore ?? 0;
                const awayScore = fixture.awayScore ?? 0;
                const homePlayer = extractPlayer(fixture.home) || fixture.homeTeamName || "-";
                const awayPlayer = extractPlayer(fixture.away) || fixture.awayTeamName || "-";
                const homeLogoName = fixture.homeTeamName || fixture.home || "";
                const awayLogoName = fixture.awayTeamName || fixture.away || "";
                
                return (
                  <Box
                    key={fixture.fixtureId ?? idx}
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      borderBottom: idx < recentMatches.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      bgcolor: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                      transition: "all 0.2s ease",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
                      minHeight: 70
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.5} flex={1} justifyContent="flex-end" minWidth={0}>
                      <Typography variant="body2" fontWeight={800} noWrap sx={{ color: "text.primary", textAlign: "right" }}>
                        {homePlayer}
                      </Typography>
                      <Box component="img" src={getLogoUrl(homeLogoName)} alt={homeLogoName} sx={{ width: 26, height: 26, objectFit: "contain" }} />
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: { xs: 60, sm: 70 } }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: { xs: 15, sm: 18 },
                          color: "text.primary",
                          letterSpacing: 1
                        }}
                      >
                        {homeScore} - {awayScore}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 620, fontSize: 10 }}>
                        {formatMatchDate(fixture.matchDate)}
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1.5} flex={1} justifyContent="flex-start" minWidth={0}>
                      <Box component="img" src={getLogoUrl(awayLogoName)} alt={awayLogoName} sx={{ width: 26, height: 26, objectFit: "contain" }} />
                      <Typography variant="body2" fontWeight={800} noWrap sx={{ color: "text.primary" }}>
                        {awayPlayer}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {recentMatches.length === 0 && (
                <Box px={2} py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    No results yet
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Managers Sidebar */}
        <Paper elevation={0} sx={{ ...panelSx, height: "100%", minHeight: 740, display: "flex", flexDirection: "column" }}>
          <SectionHeader
            icon={<Groups fontSize="small" />}
            title="Club Managers"
            color="#3b82f6"
          />
          {loading ? (
            <Box p={2}>
              {[...Array(8)].map((_, idx) => (
                <Skeleton key={idx} height={48} sx={{ mb: 0.6, borderRadius: 1 }} />
              ))}
            </Box>
          ) : (
            <Box>
              {visibleMembers.map((member, idx) => (
                <Box
                  key={member.userId ?? idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2.5,
                    py: 1.5,
                    borderBottom: idx < visibleMembers.length - 1 ? "1px solid" : "none",
                    borderColor: "divider",
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.02)" }
                  }}
                >
                   <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      overflow: "hidden",
                      bgcolor: "grey.100",
                      border: "2px solid white",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      flexShrink: 0
                    }}
                  >
                    {member.linePic ? (
                      <Box component="img" src={member.linePic} alt={member.userId} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Box display="flex" alignItems="center" justifyContent="center" height="100%" sx={{ color: "grey.400" }}>
                        <Groups sx={{ fontSize: 20 }} />
                      </Box>
                    )}
                  </Box>
                  <Box ml={2} flex={1} minWidth={0}>
                    <Typography fontSize={13} fontWeight={700} noWrap>
                      {member.lineName || "Manager"}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary" noWrap>
                      @{member.userId}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "success.main",
                      boxShadow: "0 0 0 2px white, 0 0 8px rgba(34, 197, 94, 0.4)"
                    }}
                  />
                </Box>
              ))}

              {memberBannerCount > 1 && (
                <Box py={2} mt="auto" display="flex" justifyContent="center" gap={1}>
                  {[...Array(memberBannerCount)].map((_, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setMemberBannerIndex(idx)}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: idx === memberBannerIndex ? "primary.main" : "grey.200",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                    />
                  ))}
                </Box>
              )}

              {visibleMembers.length === 0 && (
                <Box p={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">No managers found</Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {!user && (
        <Paper elevation={0} sx={{ ...panelSx }}>
          <SectionHeader
            icon={<Login fontSize="small" />}
            title="Sign in for more"
            color="#3b82f6"
          />
          <Box
            sx={{
              p: { xs: 2.5, sm: 3 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800} mb={1}>
                Sign in to unlock full features
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                After signing in, you can access management menus, change your
                password, open fixtures, and view the full member directory from
                the profile menu in the top-right corner.
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {[
                  "Fixtures Management",
                  "User Permissions",
                  "Change Password",
                  "Member Directory",
                ].map((item) => (
                  <Chip key={item} label={item} variant="outlined" />
                ))}
              </Box>
            </Box>
            <Box
              sx={{
                borderRadius: 4,
                p: 2.5,
                background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Quick Tip
              </Typography>
              <Typography fontSize={15} fontWeight={800} mt={0.5} mb={1}>
                Use the profile button in the top-right to sign in.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The `main` page is publicly available without login.
                Permission-based features unlock after sign-in.
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MainPage;
