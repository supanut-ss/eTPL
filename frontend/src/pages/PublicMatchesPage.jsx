import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  IconButton,
  Skeleton,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  SquareRounded,
} from "@mui/icons-material";
import { getPublicFixtures } from "../api/fixtureApi";

const getLogoUrl = (teamName) => {
  if (!teamName) return "";
  return `/_image/CLUB_LOGO/${encodeURIComponent(teamName)}.png`;
};

// ---- Score badge ----
const ScoreBadge = ({ homeScore, awayScore }) => {
  const played = homeScore != null && awayScore != null;
  if (!played)
    return (
      <Box
        sx={{
          width: 64,
          textAlign: "center",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          bgcolor: "action.hover",
        }}
      >
        <Typography fontSize={13} color="text.secondary" fontWeight={600}>
          vs
        </Typography>
      </Box>
    );
  const homeWin = homeScore > awayScore;
  const awayWin = awayScore > homeScore;
  return (
    <Box
      sx={{
        minWidth: 64,
        textAlign: "center",
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: "action.selected",
      }}
    >
      <Typography
        fontSize={20}
        fontWeight={800}
        letterSpacing={2}
        lineHeight={1}
      >
        <Box
          component="span"
          color={
            homeWin ? "success.main" : awayWin ? "error.main" : "text.primary"
          }
        >
          {homeScore}
        </Box>
        <Box component="span" color="text.disabled" mx={0.5}>
          -
        </Box>
        <Box
          component="span"
          color={
            awayWin ? "success.main" : homeWin ? "error.main" : "text.primary"
          }
        >
          {awayScore}
        </Box>
      </Typography>
    </Box>
  );
};

// ---- Card icons row ----
const CardIcons = ({ yellow, red }) => {
  if (!yellow && !red) return null;
  return (
    <Stack direction="row" spacing={0.3} alignItems="center">
      {yellow > 0 && (
        <>
          <SquareRounded sx={{ fontSize: 12, color: "#F6C90E" }} />
          <Typography fontSize={11} color="text.secondary">
            {yellow}
          </Typography>
        </>
      )}
      {red > 0 && (
        <>
          <SquareRounded sx={{ fontSize: 12, color: "error.main" }} />
          <Typography fontSize={11} color="text.secondary">
            {red}
          </Typography>
        </>
      )}
    </Stack>
  );
};

// ---- Team block ----
const TeamBlock = ({
  player,
  teamName,
  isWinner,
  align = "left",
  yellow,
  red,
}) => {
  const isRight = align === "right";
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: isRight ? "row-reverse" : "row",
        alignItems: "center",
        gap: 1.5,
        minWidth: 0,
      }}
    >
      {/* Name + cards — flush to outer edge */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: isRight ? "left" : "right",
        }}
      >
        <Typography
          fontSize={14}
          fontWeight={isWinner ? 700 : 500}
          color={isWinner ? "success.main" : "text.primary"}
          noWrap
        >
          {player || "TBD"}
        </Typography>
        {yellow != null && (
          <Box
            display="flex"
            justifyContent={isRight ? "flex-end" : "flex-start"}
          >
            <CardIcons yellow={yellow} red={red} />
          </Box>
        )}
      </Box>
      {/* Logo — close to score */}
      <Box
        component="img"
        src={getLogoUrl(teamName)}
        alt={teamName || player}
        onError={(e) => {
          e.target.style.display = "none";
        }}
        sx={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
      />
    </Box>
  );
};

// ---- Single Match Card ----
const MatchCard = ({ fixture }) => {
  const played = fixture.homeScore != null && fixture.awayScore != null;
  const homeWin = played && fixture.homeScore > fixture.awayScore;
  const awayWin = played && fixture.awayScore > fixture.homeScore;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        py: 1.5,
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, sm: 1 },
        borderRadius: 2,
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: 3 },
        bgcolor: "background.paper",
      }}
    >
      {/* Home team */}
      <TeamBlock
        player={fixture.home}
        teamName={fixture.homeTeamName}
        isWinner={homeWin}
        align="left"
        yellow={fixture.homeYellow}
        red={fixture.homeRed}
      />

      {/* Score — center */}
      <ScoreBadge homeScore={fixture.homeScore} awayScore={fixture.awayScore} />

      {/* Away team */}
      <TeamBlock
        player={fixture.away}
        teamName={fixture.awayTeamName}
        isWinner={awayWin}
        align="right"
        yellow={fixture.awayYellow}
        red={fixture.awayRed}
      />
    </Paper>
  );
};

// ---- Main Page ----
const PublicMatchesPage = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    setLoading(true);
    getPublicFixtures()
      .then((res) => {
        const data = res.data.data || [];
        setFixtures(data);

        // Auto-select the first matchweek with pending (unplayed) fixtures
        const matchNumbers = [...new Set(data.map((f) => f.match))].sort(
          (a, b) => a - b,
        );
        if (matchNumbers.length > 0) {
          const firstPending = matchNumbers.find((m) =>
            data.some(
              (f) =>
                f.match === m && (f.homeScore == null || f.awayScore == null),
            ),
          );
          setSelectedMatch(firstPending ?? matchNumbers[0]);
        }
      })
      .catch(() => setError("Failed to load fixtures"))
      .finally(() => setLoading(false));
  }, []);

  const matchNumbers = useMemo(
    () => [...new Set(fixtures.map((f) => f.match))].sort((a, b) => a - b),
    [fixtures],
  );

  const currentIndex = matchNumbers.indexOf(selectedMatch);

  const handlePrev = () => {
    if (currentIndex > 0) setSelectedMatch(matchNumbers[currentIndex - 1]);
  };
  const handleNext = () => {
    if (currentIndex < matchNumbers.length - 1)
      setSelectedMatch(matchNumbers[currentIndex + 1]);
  };

  const matchFixtures = useMemo(
    () => fixtures.filter((f) => f.match === selectedMatch),
    [fixtures, selectedMatch],
  );

  // Stats for current matchweek
  const played = matchFixtures.filter(
    (f) => f.homeScore != null && f.awayScore != null,
  ).length;
  const total = matchFixtures.length;

  if (loading)
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1.5} mb={3}>
          <CalendarMonth color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Matches
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PC · D1
            </Typography>
          </Box>
        </Box>
        <Stack spacing={2}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={76} />
          ))}
        </Stack>
      </Box>
    );

  if (error)
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Box>
      {/* Header — same pattern as StandingPage */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <CalendarMonth color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Matches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PC · D1
          </Typography>
        </Box>
      </Box>

      {/* Matchweek navigator */}
      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          mb: 3,
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Tooltip title="Previous Matchweek">
          <span>
            <IconButton
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              size="small"
            >
              <ChevronLeft />
            </IconButton>
          </span>
        </Tooltip>

        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="h6" fontWeight={700} lineHeight={1}>
            Matchweek {selectedMatch}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${played} played`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: 11 }}
            />
            {total - played > 0 && (
              <Chip
                label={`${total - played} pending`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            )}
          </Stack>
        </Stack>

        <Tooltip title="Next Matchweek">
          <span>
            <IconButton
              onClick={handleNext}
              disabled={currentIndex >= matchNumbers.length - 1}
              size="small"
            >
              <ChevronRight />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Match list — 2-column grid, each row shows 2 fixtures side by side */}
      {matchFixtures.length === 0 ? (
        <Alert severity="info">No fixtures in this matchweek.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {matchFixtures.map((f) => (
            <MatchCard key={f.fixtureId} fixture={f} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PublicMatchesPage;
