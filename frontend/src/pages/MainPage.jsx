import { useState, useEffect } from "react";
import {
  Grid,
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
  Shield,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { getStandings } from "../api/standingApi";
import { getFixtures } from "../api/fixtureApi";
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

// ─── announcements (add items here to show on dashboard) ─────────────────────
const ANNOUNCEMENTS = [
  // { id: 1, title: "Season 10 starts!", body: "Season 10 kicks off this week!", date: "2026-03-29", tag: "news" },
];

const MainPage = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const requests = [getStandings(), getFixtures({})];
    if (user) requests.push(getUsers());

    Promise.all(requests)
      .then(([sRes, fRes, uRes]) => {
        setStandings(sRes.data.data || []);
        setFixtures(fRes.data.data || []);
        if (uRes) {
          setMembers(uRes.data.data || []);
        }
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [user]);

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

  const recentMatches = fixtures
    .filter((f) => f.homeScore != null && f.awayScore != null)
    .slice(-10)
    .reverse();

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userLevel === "admin" && b.userLevel !== "admin") return -1;
    if (a.userLevel !== "admin" && b.userLevel === "admin") return 1;
    return (a.userId || "").localeCompare(b.userId || "");
  });

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
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

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              background: "linear-gradient(135deg,#6366f1,#818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <EmojiEvents sx={{ fontSize: 36 }} />
          </Box>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
              eTPL — Thai PES League Dashboard
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.72, mt: 0.5 }}>
              PC · Division 1{season ? ` · Season ${season}` : ""}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" sx={{ opacity: 0.65 }}>
              Welcome back
            </Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.3}>
              {user?.userId || "Guest"}
            </Typography>
            <Chip
              label={
                user?.userLevel === "admin"
                  ? "Admin"
                  : user
                    ? "Player"
                    : "Guest"
              }
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: "rgba(99,102,241,0.35)",
                color: "white",
                fontWeight: 700,
                fontSize: 11,
              }}
            />
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
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
          <Grid item xs={6} sm={3} key={item.title}>
            <StatCard {...item} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              mb: 3,
            }}
          >
            <SectionHeader
              icon={<Leaderboard fontSize="small" />}
              title="Standings — Top 10"
              color="#6366f1"
            />

            {loading ? (
              <Box p={2}>
                {[...Array(8)].map((_, idx) => (
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
                      py: 1,
                      borderBottom:
                        idx < top10.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      bgcolor: idx % 2 === 0 ? "transparent" : "grey.50",
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
                    <Box width={44} textAlign="center">
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

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <SectionHeader
              icon={<Campaign fontSize="small" />}
              title="ข่าวประกาศ"
              color="#f59e0b"
            />

            <Box p={2}>
              {ANNOUNCEMENTS.length === 0 ? (
                <Box
                  display="flex"
                  alignItems="center"
                  flexDirection="column"
                  gap={1}
                  py={2.5}
                >
                  <Campaign sx={{ color: "grey.400", fontSize: 36 }} />
                  <Typography variant="body2" color="text.secondary">
                    ยังไม่มีประกาศในขณะนี้
                  </Typography>
                  {user?.userLevel === "admin" && (
                    <Typography variant="caption" color="text.disabled">
                      เพิ่มประกาศได้ใน `ANNOUNCEMENTS` ของ MainPage
                    </Typography>
                  )}
                </Box>
              ) : (
                ANNOUNCEMENTS.map((notice, idx) => (
                  <Box key={notice.id}>
                    <Typography fontSize={13} fontWeight={700}>
                      {notice.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {notice.body}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {notice.date}
                    </Typography>
                    {idx < ANNOUNCEMENTS.length - 1 && (
                      <Divider sx={{ mt: 1.5 }} />
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              mb: 3,
            }}
          >
            <SectionHeader
              icon={<SportsSoccer fontSize="small" />}
              title="แมทช์ล่าสุด 10 นัด"
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
                        py: 1.1,
                        borderBottom:
                          idx < recentMatches.length - 1 ? "1px solid" : "none",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: idx % 2 === 0 ? "transparent" : "grey.50",
                      }}
                    >
                      <Chip
                        label={`MW${fixture.match}`}
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
                          {extractPlayer(fixture.home) || fixture.homeTeamName}
                        </Typography>
                        <Box
                          component="img"
                          src={getLogoUrl(fixture.homeTeamName)}
                          alt={fixture.homeTeamName}
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
                          src={getLogoUrl(fixture.awayTeamName)}
                          alt={fixture.awayTeamName}
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
                          {extractPlayer(fixture.away) || fixture.awayTeamName}
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

          {user && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <SectionHeader
                icon={<Groups fontSize="small" />}
                title={`รายชื่อสมาชิก (${sortedMembers.length})`}
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
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
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
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography fontSize={13} fontWeight={700} noWrap>
                            {member.userId}
                          </Typography>
                          {member.userLevel === "admin" && (
                            <Shield
                              sx={{ fontSize: 13, color: "secondary.main" }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
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
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
