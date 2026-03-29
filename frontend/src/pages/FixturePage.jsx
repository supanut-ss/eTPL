import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Avatar,
  Stack,
  Divider,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  SportsSoccer,
  Search,
  Refresh,
  Clear,
  EmojiEvents,
  EditNote,
  SquareRounded,
} from "@mui/icons-material";
import { getFixtures } from "../api/fixtureApi";
import { useAuth } from "../store/AuthContext";
import ReportResultDialog from "../components/ReportResultDialog";

// Build logo URL from teamName → /_image/CLUB_LOGO/{teamName}.png
const getLogoUrl = (teamName) => {
  if (!teamName) return "";
  return `/_image/CLUB_LOGO/${encodeURIComponent(teamName)}.png`;
};

const activeColor = (active) => {
  if (active === "YES") return "success";
  if (active === "NO") return "default";
  return "warning";
};

const ScoreDisplay = ({ homeScore, awayScore, active }) => {
  const played = homeScore != null && awayScore != null;
  if (!played)
    return (
      <Typography color="text.secondary" fontSize={13}>
        vs
      </Typography>
    );
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Typography
        fontWeight={700}
        fontSize={16}
        color={
          homeScore > awayScore
            ? "success.main"
            : homeScore < awayScore
              ? "error.main"
              : "text.primary"
        }
      >
        {homeScore}
      </Typography>
      <Typography color="text.secondary" fontSize={16}>
        -
      </Typography>
      <Typography
        fontWeight={700}
        fontSize={16}
        color={
          awayScore > homeScore
            ? "success.main"
            : awayScore < homeScore
              ? "error.main"
              : "text.primary"
        }
      >
        {awayScore}
      </Typography>
    </Box>
  );
};

// align: "left" = Home column (name left, logo right touching score)
// align: "right" = Away column (logo left touching score, name right)
const TeamCell = ({ player, teamName, isWinner, align = "left" }) => {
  const isRight = align === "right";
  return (
    <Box
      display="flex"
      flexDirection={isRight ? "row-reverse" : "row"}
      alignItems="center"
      gap={1}
      sx={{ minWidth: 0, width: "100%" }}
    >
      {/* Name — flush to outer edge */}
      <Typography
        fontSize={14}
        fontWeight={isWinner ? 700 : 400}
        color={isWinner ? "success.main" : "text.primary"}
        noWrap
        sx={{ flex: 1, textAlign: isRight ? "left" : "right" }}
      >
        {player || "-"}
      </Typography>
      {/* Logo — close to score center */}
      <Box
        component="img"
        src={getLogoUrl(teamName)}
        alt={teamName || player}
        onError={(e) => {
          e.target.style.display = "none";
        }}
        sx={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
      />
    </Box>
  );
};

const FixturePage = () => {
  const { user } = useAuth();
  const isUserLevel = user?.userLevel !== "admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportFixture, setReportFixture] = useState(null);

  const fetchFixtures = useCallback((searchVal = "") => {
    setLoading(true);
    setError("");
    const params = {};
    if (searchVal) params.search = searchVal;
    getFixtures(params)
      .then((res) => setRows(res.data.data || []))
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  const handleSearch = (e) => {
    if (e.key === "Enter") fetchFixtures(search);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchFixtures("");
  };

  // stats
  const played = rows.filter(
    (r) => r.homeScore != null && r.awayScore != null,
  ).length;
  const unplayed = rows.length - played;

  const displayRows = useMemo(() => {
    const isPlayed = (r) => r.homeScore != null && r.awayScore != null;
    const filtered =
      statusFilter === "all"
        ? rows
        : rows.filter((r) =>
            statusFilter === "pending" ? !isPlayed(r) : isPlayed(r),
          );
    return [...filtered].sort((a, b) => {
      const aPending = !isPlayed(a) ? 0 : 1;
      const bPending = !isPlayed(b) ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (a.match ?? 0) - (b.match ?? 0);
    });
  }, [rows, statusFilter]);

  const columns = [
    {
      field: "match",
      headerName: "#",
      width: 56,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography fontSize={16} color="text.secondary" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "home",
      headerName: "Home",
      flex: 1.5,
      minWidth: 160,
      renderCell: (params) => {
        const isWinner =
          params.row.homeScore != null &&
          params.row.awayScore != null &&
          params.row.homeScore > params.row.awayScore;
        return (
          <TeamCell
            player={params.value}
            teamName={params.row.homeTeamName}
            isWinner={isWinner}
            align="left"
          />
        );
      },
    },
    {
      field: "score",
      headerName: "Score",
      width: 100,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <ScoreDisplay
          homeScore={params.row.homeScore}
          awayScore={params.row.awayScore}
          active={params.row.active}
        />
      ),
    },
    {
      field: "away",
      headerName: "Away",
      flex: 1.5,
      minWidth: 160,
      renderCell: (params) => {
        const isWinner =
          params.row.homeScore != null &&
          params.row.awayScore != null &&
          params.row.awayScore > params.row.homeScore;
        return (
          <TeamCell
            player={params.value}
            teamName={params.row.awayTeamName}
            isWinner={isWinner}
            align="right"
          />
        );
      },
    },
    {
      field: "cards",
      headerName: "Cards",
      width: 130,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const {
          homeScore,
          awayScore,
          homeYellow,
          homeRed,
          awayYellow,
          awayRed,
        } = params.row;
        const played = homeScore != null && awayScore != null;
        if (!played)
          return (
            <Typography color="text.secondary" fontSize={12}>
              —
            </Typography>
          );
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <SquareRounded sx={{ color: "#f59e0b", fontSize: 13 }} />
            <Typography fontSize={13} fontWeight={600}>
              {homeYellow ?? 0}
            </Typography>
            <SquareRounded sx={{ color: "#ef4444", fontSize: 13 }} />
            <Typography fontSize={13} fontWeight={600}>
              {homeRed ?? 0}
            </Typography>
            <Typography color="text.secondary" fontSize={11} mx={0.25}>
              |
            </Typography>
            <SquareRounded sx={{ color: "#f59e0b", fontSize: 13 }} />
            <Typography fontSize={13} fontWeight={600}>
              {awayYellow ?? 0}
            </Typography>
            <SquareRounded sx={{ color: "#ef4444", fontSize: 13 }} />
            <Typography fontSize={13} fontWeight={600}>
              {awayRed ?? 0}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "action",
      headerName: "",
      width: 130,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isPlayed =
          params.row.homeScore != null && params.row.awayScore != null;
        const isAdmin = !isUserLevel;

        if (isAdmin) {
          return (
            <Button
              size="small"
              variant="contained"
              color={isPlayed ? "warning" : "primary"}
              startIcon={<EditNote />}
              onClick={() => setReportFixture(params.row)}
              sx={{ fontSize: 12, px: 1.5, whiteSpace: "nowrap" }}
            >
              {isPlayed ? "Edit Result" : "Report Result"}
            </Button>
          );
        }

        return (
          <Button
            size="small"
            variant={isPlayed ? "outlined" : "contained"}
            color={isPlayed ? "success" : "primary"}
            disabled={isPlayed}
            startIcon={<EditNote />}
            onClick={() => setReportFixture(params.row)}
            sx={{ fontSize: 12, px: 1.5, whiteSpace: "nowrap" }}
          >
            {isPlayed ? "Recorded" : "Report Result"}
          </Button>
        );
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <SportsSoccer color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Fixture
          </Typography>
          <Chip label={`${rows.length} matches`} size="small" sx={{ ml: 1 }} />
          {isUserLevel && (
            <Chip
              label="Your matches only"
              size="small"
              color="info"
              variant="outlined"
              sx={{ ml: 0.5, fontWeight: 600 }}
            />
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => fetchFixtures(search)} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper
          elevation={1}
          sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 120 }}
        >
          <Typography variant="caption" color="text.secondary">
            Total
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {rows.length}
          </Typography>
        </Paper>
        <Paper
          elevation={1}
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            minWidth: 120,
            borderLeft: "4px solid",
            borderColor: "success.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Played
          </Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">
            {played}
          </Typography>
        </Paper>
        <Paper
          elevation={1}
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            minWidth: 120,
            borderLeft: "4px solid",
            borderColor: "warning.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Pending
          </Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">
            {unplayed}
          </Typography>
        </Paper>
      </Stack>

      {/* Search + Filter */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            label="Search Team"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Press Enter to search"
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, val) => {
              if (val !== null) setStatusFilter(val);
            }}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="pending">Pending</ToggleButton>
            <ToggleButton value="played">Played</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={displayRows}
          columns={columns}
          loading={loading}
          autoHeight
          getRowId={(row) => row.fixtureId}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "grey.50",
              fontWeight: 700,
            },
            "& .MuiDataGrid-row:hover": { bgcolor: "primary.50" },
            "& .MuiDataGrid-cell": {
              display: "flex",
              alignItems: "center",
            },
          }}
        />
        <Divider />
        <Box
          px={2}
          py={1}
          bgcolor="grey.50"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <EmojiEvents fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            PC · D1 · Season 36
          </Typography>
        </Box>
      </Paper>

      <ReportResultDialog
        open={!!reportFixture}
        fixture={reportFixture}
        isAdmin={!isUserLevel}
        onClose={() => setReportFixture(null)}
        onSuccess={() => fetchFixtures(search)}
      />
    </Box>
  );
};

export default FixturePage;
