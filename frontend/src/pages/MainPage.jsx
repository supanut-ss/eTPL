import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Paper,
  Chip,
  Divider,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  SportsSoccer,
  Leaderboard,
  EmojiEvents,
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

// ─── helpers ────────────────────────────────────────────────────────────────
const getLogoUrl = (teamName) => {
  if (!teamName) return "";
  return `/_image/CLUB_LOGO/${encodeURIComponent(teamName)}.png`;
};

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
const StatCard = ({ title, value, icon, gradient, loading }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 3,
      overflow: "hidden",
      transition: "transform 0.15s, box-shadow 0.15s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={60} height={44} />
          ) : (
            <Typography variant="h4" fontWeight={800} mt={0.5} lineHeight={1}>
              {value ?? "—"}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const fixtureRequest = user ? getFixtures({}) : getPublicFixtures();
    const canLoadMembers = user?.userLevel === "admin";

    Promise.all([
      getStandings(),
      fixtureRequest,
      getPublicLastFixtures(),
      getPublicAnnouncements(),
    ])
      .then(([sRes, fRes, lastRes, aRes]) => {
        setStandings(sRes.data.data || []);
        setFixtures(fRes.data.data || []);
        setLastFixtures(lastRes.data.data || []);
        setAnnouncements(aRes.data.data || []);

        if (!canLoadMembers) {
          setMembers([]);
          return null;
        }

        return getUsers()
          .then((uRes) => {
            setMembers(uRes.data.data || []);
          })
          .catch(() => {
            setMembers([]);
          });
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
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

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3, md: 4 },
          mb: 3,
          borderRadius: 5,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: { xs: "auto", md: 250 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -45,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            bgcolor: "rgba(99,102,241,0.16)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -36,
            right: 72,
            width: 110,
            height: 110,
            borderRadius: "50%",
            bgcolor: "rgba(99,102,241,0.08)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
            },
            gap: { xs: 2, md: 3 },
            alignItems: "stretch",
          }}
        >
          <Box>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: 3,
                  background: "linear-gradient(135deg,#6366f1,#818cf8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 18px 40px -18px rgba(129, 140, 248, 0.8)",
                }}
              >
                <EmojiEvents sx={{ fontSize: 38 }} />
              </Box>
              <Box flex={1}>
                <Typography variant="h4" fontWeight={900} lineHeight={1.1}>
                  eTPL Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.76, mt: 0.75 }}>
                  Track standings, match results, and league activity in one
                  place.
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
                  <Chip
                    icon={<SportsSoccer sx={{ color: "white !important" }} />}
                    label={`PC · Division 1${season ? ` · Season ${season}` : ""}`}
                    sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "white" }}
                  />
                  <Chip
                    icon={<TrendingUp sx={{ color: "white !important" }} />}
                    label={`${playedMatches}/${totalMatches || 0} matches played`}
                    sx={{ bgcolor: "rgba(255,255,255,0.10)", color: "white" }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.25,
              alignSelf: "stretch",
            }}
          >
            {[
              { label: "Welcome", value: user?.userId || "Guest" },
              {
                label: "Access",
                value:
                  user?.userLevel === "admin"
                    ? "Admin"
                    : user
                      ? "Player"
                      : "Public",
              },
              { label: "Teams", value: totalTeams || 0 },
              { label: "Matches", value: totalMatches || 0 },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight={800} mt={0.4} noWrap>
                  {item.value}
                </Typography>
              </Box>
            ))}
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
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2.25,
          mb: 3,
        }}
      >
        {[
          {
            title: "Total Matches",
            value: totalMatches,
            icon: <SportsSoccer fontSize="small" />,
            gradient: "linear-gradient(135deg,#6366f1,#818cf8)",
          },
          {
            title: "Played",
            value: playedMatches,
            icon: <CheckCircle fontSize="small" />,
            gradient: "linear-gradient(135deg,#22c55e,#4ade80)",
          },
          {
            title: "Pending",
            value: pendingMatches,
            icon: <HourglassBottom fontSize="small" />,
            gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)",
          },
          {
            title: "Teams",
            value: totalTeams,
            icon: <Groups fontSize="small" />,
            gradient: "linear-gradient(135deg,#3b82f6,#60a5fa)",
          },
        ].map((item) => (
          <Box key={item.title}>
            <StatCard {...item} loading={loading} />
          </Box>
        ))}
      </Box>

      <Paper elevation={0} sx={{ ...panelSx, mb: 3 }}>
        <SectionHeader
          icon={<Campaign fontSize="small" />}
          title="Announcements"
          color="#f59e0b"
        />

        <Box p={{ xs: 2, sm: 2.5 }}>
          {announcements.length === 0 ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={2}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Campaign sx={{ color: "grey.400", fontSize: 30 }} />
                <Box>
                  <Typography fontWeight={700}>No announcements yet</Typography>
                  <Typography variant="body2" color="text.secondary">
                    League updates and important announcements will appear here.
                  </Typography>
                </Box>
              </Box>
              {user?.userLevel === "admin" && (
                <Typography variant="caption" color="text.disabled">
                  Add announcements from the Announcements admin page.
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {activeAnnouncement && (
                <Box
                  key={activeAnnouncement.id}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "rgba(248,250,252,0.9)",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    {activeAnnouncement.announcement}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    mt={1.25}
                    display="block"
                  >
                    by {activeAnnouncement.announcer || "system"}
                    {activeAnnouncement.createDate
                      ? ` • ${formatMatchDate(activeAnnouncement.createDate)}`
                      : ""}
                  </Typography>
                </Box>
              )}

              {announcements.length > 1 && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={0.75}
                  flexWrap="wrap"
                >
                  <Typography variant="caption" color="text.secondary" mr={0.5}>
                    Rotating messages:
                  </Typography>
                  {announcements.map((item, index) => (
                    <Box
                      key={item.id}
                      onClick={() => setAnnouncementIndex(index)}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        cursor: "pointer",
                        bgcolor:
                          index === announcementIndex
                            ? "primary.main"
                            : "grey.400",
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: 3,
          alignItems: "stretch",
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ ...panelSx, height: "100%" }}>
          <SectionHeader
            icon={<Leaderboard fontSize="small" />}
            title="Standings — Top 10"
            color="#6366f1"
          />

          {loading ? (
            <Box p={2}>
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
              {top10.map((team, idx) => (
                <Box
                  key={team.id ?? idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 0.75,
                    borderBottom: idx < top10.length - 1 ? "1px solid" : "none",
                    borderColor: "divider",
                    bgcolor: idx % 2 === 0 ? "transparent" : "grey.50",
                    minHeight: DASHBOARD_ROW_HEIGHT,
                    boxSizing: "border-box",
                  }}
                >
                  <Box width={30} display="flex" justifyContent="center">
                    <RankMedal rank={team.rank} />
                  </Box>
                  <Box
                    component="img"
                    src={getLogoUrl(team.teamName)}
                    alt={team.teamName}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                    sx={{
                      width: 24,
                      height: 24,
                      objectFit: "contain",
                      mx: 1,
                      flexShrink: 0,
                    }}
                  />
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={12.5} fontWeight={700} noWrap>
                      {extractPlayer(team.team)}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary" noWrap>
                      W {team.w ?? 0} · D {team.d ?? 0} · L {team.l ?? 0}
                    </Typography>
                  </Box>
                  <Box width={44} textAlign="center" mr={1.5}>
                    <Typography
                      fontSize={14}
                      fontWeight={800}
                      color="secondary.main"
                    >
                      {team.pts ?? 0}
                    </Typography>
                  </Box>
                  <Box width={56} display="flex" justifyContent="center">
                    <FormDots last={team.last} />
                  </Box>
                </Box>
              ))}

              {top10.length === 0 && (
                <Box px={2} py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    No standings data
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, height: "100%" }}>
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
                const homePlayer =
                  extractPlayer(fixture.home) ||
                  fixture.home ||
                  fixture.homeTeamName ||
                  "-";
                const awayPlayer =
                  extractPlayer(fixture.away) ||
                  fixture.away ||
                  fixture.awayTeamName ||
                  "-";
                const homeLogoName = fixture.homeTeamName || fixture.home || "";
                const awayLogoName = fixture.awayTeamName || fixture.away || "";
                const isDraw = homeScore === awayScore;
                const resultColor = isDraw
                  ? "#fef3c7"
                  : homeScore > awayScore
                    ? "#dcfce7"
                    : "#fee2e2";

                return (
                  <Box
                    key={fixture.fixtureId ?? idx}
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderBottom:
                        idx < recentMatches.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: idx % 2 === 0 ? "transparent" : "grey.50",
                      minHeight: DASHBOARD_ROW_HEIGHT,
                      boxSizing: "border-box",
                    }}
                  >
                    <Chip
                      label={formatMatchDate(fixture.matchDate)}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: "#e2e8f0",
                        color: "text.secondary",
                        flexShrink: 0,
                      }}
                    />
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.75}
                      flex={1}
                      minWidth={0}
                      justifyContent="flex-end"
                    >
                      <Typography
                        fontSize={12}
                        noWrap
                        fontWeight={homeScore > awayScore ? 700 : 500}
                      >
                        {homePlayer}
                      </Typography>
                      <Box
                        component="img"
                        src={getLogoUrl(homeLogoName)}
                        alt={homeLogoName}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        sx={{
                          width: 23,
                          height: 23,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1.5,
                        bgcolor: resultColor,
                        minWidth: 52,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography fontSize={13.5} fontWeight={800}>
                        {homeScore} - {awayScore}
                      </Typography>
                    </Box>

                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.75}
                      flex={1}
                      minWidth={0}
                    >
                      <Box
                        component="img"
                        src={getLogoUrl(awayLogoName)}
                        alt={awayLogoName}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        sx={{
                          width: 23,
                          height: 23,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        fontSize={12}
                        noWrap
                        fontWeight={awayScore > homeScore ? 700 : 500}
                      >
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
      </Box>

      {user?.userLevel === "admin" ? (
        <Paper elevation={0} sx={{ ...panelSx }}>
          <SectionHeader
            icon={<Groups fontSize="small" />}
            title={`Member List (${sortedMembers.length})`}
            color="#3b82f6"
          />

          {loading ? (
            <Box p={2}>
              {[...Array(4)].map((_, idx) => (
                <Box
                  key={idx}
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  mb={1.4}
                >
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box flex={1}>
                    <Skeleton width="45%" height={15} />
                    <Skeleton width="28%" height={13} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(5, 1fr)",
                },
                gap: 0,
              }}
            >
              {sortedMembers.map((member, idx) => (
                <Box
                  key={member.userId ?? idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 2,
                    py: 1.2,
                    borderBottom: "1px solid",
                    borderRight: {
                      sm: idx % 2 === 0 ? "1px solid" : "none",
                      md: idx % 3 !== 2 ? "1px solid" : "none",
                      lg: idx % 5 !== 4 ? "1px solid" : "none",
                    },
                    borderColor: "divider",
                    minHeight: 58,
                  }}
                >
                  <Avatar
                    src={member.linePic || ""}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor:
                        member.userLevel === "admin"
                          ? "secondary.main"
                          : "primary.light",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {!member.linePic &&
                      (member.userId?.[0]?.toUpperCase() || "?")}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={13} fontWeight={700} noWrap>
                      {member.userId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {member.lineName || "-"}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {sortedMembers.length === 0 && (
                <Box px={2} py={3} textAlign="center" gridColumn="1 / -1">
                  <Typography variant="body2" color="text.secondary">
                    No members found
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      ) : (
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
