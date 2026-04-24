import { useState, useEffect, useMemo } from "react";
import { getLogoUrl } from "../utils/imageUtils";
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
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  SquareRounded,
  QueryStats,
  Close,
} from "@mui/icons-material";
import { getPublicFixtures, getPublicH2H } from "../api/fixtureApi";



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

// ---- H2H Dialog ----
const H2HDialog = ({ open, onClose, home, away, homeTeamName, awayTeamName }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !home || !away) return;
    setLoading(true);
    setError("");
    getPublicH2H(home, away)
      .then((res) => setRecords(res.data.data || []))
      .catch(() => setError("Failed to load H2H history"))
      .finally(() => setLoading(false));
  }, [open, home, away]);

  const homeWins = records.filter(
    (r) =>
      (r.home === home && r.homeScore > r.awayScore) ||
      (r.home === away && r.awayScore > r.homeScore),
  ).length;
  const awayWins = records.filter(
    (r) =>
      (r.home === away && r.homeScore > r.awayScore) ||
      (r.home === home && r.awayScore > r.homeScore),
  ).length;
  const draws = records.filter((r) => r.homeScore === r.awayScore).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box>
          <Typography fontWeight={700} fontSize={16}>
            Head-to-Head
          </Typography>
          <Typography variant="body2" color="text.secondary" fontSize={12}>
            {home} vs {away}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && records.length === 0 && (
          <Alert severity="info">No H2H matches found.</Alert>
        )}

        {!loading && !error && records.length > 0 && (
          <>
            {/* Summary bar */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                bgcolor: "action.hover",
                borderRadius: 2,
                px: 2,
                py: 1.5,
                mb: 2,
              }}
            >
              <Box textAlign="center">
                <Typography fontSize={22} fontWeight={800} color="success.main">
                  {homeWins}
                </Typography>
                <Typography fontSize={11} color="text.secondary" noWrap>
                  {home}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography fontSize={22} fontWeight={800} color="text.secondary">
                  {draws}
                </Typography>
                <Typography fontSize={11} color="text.secondary">
                  Draws
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography fontSize={22} fontWeight={800} color="success.main">
                  {awayWins}
                </Typography>
                <Typography fontSize={11} color="text.secondary" noWrap>
                  {away}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            {/* Match list */}
            <Stack spacing={1}>
              {records.map((r) => {
                const homeWin = r.homeScore > r.awayScore;
                const awayWin = r.awayScore > r.homeScore;
                return (
                  <Box
                    key={r.fixtureId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {/* Season / match info */}
                    <Box sx={{ minWidth: 60 }}>
                      <Typography fontSize={11} color="text.secondary">
                        S{r.season}
                      </Typography>
                      <Typography fontSize={10} color="text.disabled">
                        MW{r.match}
                      </Typography>
                    </Box>

                    {/* Home player */}
                    <Typography
                      fontSize={13}
                      fontWeight={homeWin ? 700 : 400}
                      color={homeWin ? "success.main" : "text.primary"}
                      flex={1}
                      noWrap
                    >
                      {r.home}
                    </Typography>

                    {/* Score */}
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: "action.selected",
                        textAlign: "center",
                        minWidth: 52,
                      }}
                    >
                      <Typography fontSize={14} fontWeight={700} letterSpacing={1}>
                        <Box
                          component="span"
                          color={
                            homeWin
                              ? "success.main"
                              : awayWin
                                ? "error.main"
                                : "text.primary"
                          }
                        >
                          {r.homeScore}
                        </Box>
                        <Box component="span" color="text.disabled" mx={0.5}>
                          -
                        </Box>
                        <Box
                          component="span"
                          color={
                            awayWin
                              ? "success.main"
                              : homeWin
                                ? "error.main"
                                : "text.primary"
                          }
                        >
                          {r.awayScore}
                        </Box>
                      </Typography>
                    </Box>

                    {/* Away player */}
                    <Typography
                      fontSize={13}
                      fontWeight={awayWin ? 700 : 400}
                      color={awayWin ? "success.main" : "text.primary"}
                      flex={1}
                      textAlign="right"
                      noWrap
                    >
                      {r.away}
                    </Typography>

                    {/* Date */}
                    <Box sx={{ minWidth: 52, textAlign: "right" }}>
                      <Typography fontSize={10} color="text.disabled">
                        {r.matchDateDisplay || ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---- Single Match Card ----
const MatchCard = ({ fixture }) => {
  const played = fixture.homeScore != null && fixture.awayScore != null;
  const homeWin = played && fixture.homeScore > fixture.awayScore;
  const awayWin = played && fixture.awayScore > fixture.homeScore;
  const [h2hOpen, setH2hOpen] = useState(false);

  return (
    <>
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
          position: "relative",
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

        {/* Center column: Score + H2H icon */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <ScoreBadge homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
          <Tooltip title="Head-to-Head history">
            <IconButton
              size="small"
              onClick={() => setH2hOpen(true)}
              sx={{ p: 0.25 }}
            >
              <QueryStats sx={{ fontSize: 16, color: "text.secondary" }} />
            </IconButton>
          </Tooltip>
        </Box>

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

      <H2HDialog
        open={h2hOpen}
        onClose={() => setH2hOpen(false)}
        home={fixture.home}
        away={fixture.away}
        homeTeamName={fixture.homeTeamName}
        awayTeamName={fixture.awayTeamName}
      />
    </>
  );
};

// ---- Main Page ----
const PublicMatchesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
        {/* Header Skeleton */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          px: { xs: 1, sm: 0 }
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <CalendarMonth color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Matches
              </Typography>
              <Typography variant="body2" color="text.secondary">
                EFOOTBALL · D1
              </Typography>
            </Box>
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
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        px: { xs: 1, sm: 0 }
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <CalendarMonth color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Matches
            </Typography>
            <Typography variant="body2" color="text.secondary">
              EFOOTBALL · D1
            </Typography>
          </Box>
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
