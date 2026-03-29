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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
} from "@mui/material";
import {
  SportsSoccer,
  Leaderboard,
  EmojiEvents,
  CheckCircle,
  HourglassBottom,
  Groups,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { getStandings } from "../api/standingApi";
import { getFixtures } from "../api/fixtureApi";

// Build logo URL from teamName → /_image/CLUB_LOGO/{teamName}.png
const getLogoUrl = (teamName) => {
  if (!teamName) return "";
  return `/_image/CLUB_LOGO/${encodeURIComponent(teamName)}.png`;
};

// Extract player name from parentheses, e.g. "AZ ALKMAAR (RREEF)" → "RREEF"
const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
};

const StatCard = ({ title, value, icon, color, borderColor }) => (
  <Card
    sx={{
      height: "100%",
      borderLeft: "4px solid",
      borderColor: borderColor || color || "primary.main",
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" mt={0.5}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ color: color || "primary.main", opacity: 0.8 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const MainPage = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [season, setSeason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // load standings and fixtures simultaneously
    Promise.all([getStandings(), getFixtures({})])
      .then(([sRes, fRes]) => {
        const sData = sRes.data.data || [];
        setStandings(sData);
        if (sData.length > 0) setSeason(sData[0].season || "");

        const fData = fRes.data.data || [];
        setFixtures(fData);
      })
      .catch(() => setError("Failed to load data"));
  }, []);

  // stats from fixtures
  const totalMatches = fixtures.length;
  const playedMatches = fixtures.filter(
    (f) => f.homeScore != null && f.awayScore != null,
  ).length;
  const pendingMatches = totalMatches - playedMatches;
  const totalTeams = standings.length;

  // Recent results: active=YES + has result, latest 5
  const recentResults = fixtures
    .filter((f) => f.active === "YES" && f.homeScore != null)
    .slice(-5)
    .reverse();

  // Upcoming: active=NO, first 5
  const upcoming = fixtures.filter((f) => f.active === "NO").slice(0, 5);

  // Top 5 standings
  const top5 = standings.slice(0, 5);

  return (
    <Box>
      {/* Hero Banner */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, #1565C0 0%, #1976D2 60%, #42A5F5 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <EmojiEvents sx={{ fontSize: 56, opacity: 0.9 }} />
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold" lineHeight={1.2}>
            eTPL — Thai PES League
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
            PC · Division 1{season ? ` · Season ${season}` : ""}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Welcome
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {user?.userId || user?.lineName || "User"}
          </Typography>
          {user?.userLevel && (
            <Chip
              label={user.userLevel === "admin" ? "Admin" : "Player"}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.25)",
                color: "white",
                mt: 0.5,
              }}
            />
          )}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stat Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Total Matches"
            value={totalMatches || "—"}
            icon={<SportsSoccer sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Played"
            value={playedMatches || "—"}
            icon={<CheckCircle sx={{ fontSize: 40 }} />}
            color="success.main"
            borderColor="success.main"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Pending"
            value={pendingMatches || "—"}
            icon={<HourglassBottom sx={{ fontSize: 40 }} />}
            color="warning.main"
            borderColor="warning.main"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Total Teams"
            value={totalTeams || "—"}
            icon={<Groups sx={{ fontSize: 40 }} />}
            color="secondary.main"
            borderColor="secondary.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Mini Standing Top 5 */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box
              px={2}
              py={1.5}
              display="flex"
              alignItems="center"
              gap={1}
              bgcolor="primary.main"
              color="white"
            >
              <Leaderboard fontSize="small" />
              <Typography fontWeight={700} fontSize={15}>
                Standings Top 5
              </Typography>
            </Box>
            <List dense disablePadding>
              {top5.map((team, idx) => (
                <Box key={team.id ?? idx}>
                  <ListItem>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor:
                          idx === 0
                            ? "#FFD700"
                            : idx === 1
                              ? "#C0C0C0"
                              : idx === 2
                                ? "#CD7F32"
                                : "grey.200",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        color: idx < 3 ? "#555" : "text.secondary",
                        mr: 1,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Box
                        component="img"
                        src={getLogoUrl(team.teamName)}
                        alt={team.teamName}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        sx={{ width: 28, height: 28, objectFit: "contain" }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography fontSize={13} fontWeight={500} noWrap>
                          {extractPlayer(team.team)}
                        </Typography>
                      }
                    />
                    <Chip
                      label={team.pts ?? 0}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, minWidth: 34 }}
                    />
                  </ListItem>
                  {idx < top5.length - 1 && <Divider />}
                </Box>
              ))}
              {top5.length === 0 && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    No data yet
                  </Typography>
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Recent Results + Upcoming */}
        <Grid item xs={12} md={7}>
          {/* Recent Results */}
          <Paper
            elevation={2}
            sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}
          >
            <Box
              px={2}
              py={1.5}
              display="flex"
              alignItems="center"
              gap={1}
              bgcolor="success.main"
              color="white"
            >
              <CheckCircle fontSize="small" />
              <Typography fontWeight={700} fontSize={15}>
                Recent Results
              </Typography>
            </Box>
            <List dense disablePadding>
              {recentResults.map((f, idx) => (
                <Box key={f.fixtureId ?? idx}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          flexWrap="wrap"
                        >
                          <Box
                            component="img"
                            src={getLogoUrl(f.homeTeamName)}
                            alt={f.homeTeamName}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            sx={{ width: 22, height: 22, objectFit: "contain" }}
                          />
                          <Typography fontSize={12} noWrap sx={{ flex: 1 }}>
                            {f.home}
                          </Typography>
                          <Chip
                            label={`${f.homeScore} - ${f.awayScore}`}
                            size="small"
                            color="default"
                            sx={{ fontWeight: 700, fontSize: 12, px: 0.5 }}
                          />
                          <Typography
                            fontSize={12}
                            noWrap
                            sx={{ flex: 1, textAlign: "right" }}
                          >
                            {f.away}
                          </Typography>
                          <Box
                            component="img"
                            src={getLogoUrl(f.awayTeamName)}
                            alt={f.awayTeamName}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            sx={{ width: 22, height: 22, objectFit: "contain" }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < recentResults.length - 1 && <Divider />}
                </Box>
              ))}
              {recentResults.length === 0 && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    No results yet
                  </Typography>
                </ListItem>
              )}
            </List>
          </Paper>

          {/* Upcoming Fixtures */}
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box
              px={2}
              py={1.5}
              display="flex"
              alignItems="center"
              gap={1}
              bgcolor="warning.main"
              color="white"
            >
              <HourglassBottom fontSize="small" />
              <Typography fontWeight={700} fontSize={15}>
                Upcoming Fixtures
              </Typography>
            </Box>
            <List dense disablePadding>
              {upcoming.map((f, idx) => (
                <Box key={f.fixtureId ?? idx}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          flexWrap="wrap"
                        >
                          <Box
                            component="img"
                            src={getLogoUrl(f.homeTeamName)}
                            alt={f.homeTeamName}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            sx={{ width: 22, height: 22, objectFit: "contain" }}
                          />
                          <Typography fontSize={12} noWrap sx={{ flex: 1 }}>
                            {f.home}
                          </Typography>
                          <Typography
                            fontSize={12}
                            color="text.secondary"
                            sx={{ px: 1 }}
                          >
                            vs
                          </Typography>
                          <Typography
                            fontSize={12}
                            noWrap
                            sx={{ flex: 1, textAlign: "right" }}
                          >
                            {f.away}
                          </Typography>
                          <Box
                            component="img"
                            src={getLogoUrl(f.awayTeamName)}
                            alt={f.awayTeamName}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            sx={{ width: 22, height: 22, objectFit: "contain" }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Match #{f.match}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {idx < upcoming.length - 1 && <Divider />}
                </Box>
              ))}
              {upcoming.length === 0 && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    No upcoming fixtures
                  </Typography>
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
