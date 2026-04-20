import { useState, useEffect, useCallback, useMemo } from "react";
import { getLogoUrl } from "../utils/imageUtils";
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
  Stack,
  Divider,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery
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



const ScoreDisplay = ({ homeScore, awayScore }) => {
  const played = homeScore != null && awayScore != null;
  if (!played) {
    return (
      <Typography color="text.secondary" fontSize={13}>
        vs
      </Typography>
    );
  }

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
      <Typography
        fontSize={14}
        fontWeight={isWinner ? 700 : 400}
        color={isWinner ? "success.main" : "text.primary"}
        noWrap
        sx={{ flex: 1, textAlign: isRight ? "left" : "right" }}
      >
        {player || "-"}
      </Typography>
      <Box
        component="img"
        src={getLogoUrl(teamName)}
        alt={teamName || player}
        onError={(event) => {
          event.target.style.display = "none";
        }}
        sx={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
      />
    </Box>
  );
};

const FixturePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const isUserLevel = user?.userLevel !== "admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportFixture, setReportFixture] = useState(null);

  const fetchFixtures = useCallback((searchValue = "") => {
    setLoading(true);
    setError("");

    const params = {};
    if (searchValue) params.search = searchValue;

    getFixtures(params)
      .then((response) => setRows(response.data.data || []))
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  const handleSearch = (event) => {
    if (event.key === "Enter") fetchFixtures(search);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchFixtures("");
  };

  const played = rows.filter(
    (row) => row.homeScore != null && row.awayScore != null,
  ).length;
  const unplayed = rows.length - played;

  const displayRows = useMemo(() => {
    const isPlayed = (row) => row.homeScore != null && row.awayScore != null;

    const filteredRows =
      statusFilter === "all"
        ? rows
        : rows.filter((row) =>
            statusFilter === "pending" ? !isPlayed(row) : isPlayed(row),
          );

    return [...filteredRows].sort((left, right) => {
      const leftPending = !isPlayed(left) ? 0 : 1;
      const rightPending = !isPlayed(right) ? 0 : 1;

      if (leftPending !== rightPending) return leftPending - rightPending;
      return (left.match ?? 0) - (right.match ?? 0);
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
        const isPlayed = homeScore != null && awayScore != null;

        if (!isPlayed) {
          return (
            <Typography color="text.secondary" fontSize={12}>
              -
            </Typography>
          );
        }

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

        if (!isUserLevel) {
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

        if (!isPlayed) {
          return (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<EditNote />}
              onClick={() => setReportFixture(params.row)}
              sx={{ fontSize: 12, px: 1.5, whiteSpace: "nowrap" }}
            >
              Report Result
            </Button>
          );
        }

        return (
          <Chip
            size="small"
            label={isPlayed ? "Recorded" : "Pending"}
            color={isPlayed ? "success" : "default"}
            variant={isPlayed ? "filled" : "outlined"}
          />
        );
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        gap: 1.5,
        mb: 3
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <SportsSoccer color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              My Fixtures
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MATCH SCHEDULE & RESULTS
            </Typography>
          </Box>
        </Box>


      </Box>

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

      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            label="Search Team"
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
            onChange={(_, value) => {
              if (value !== null) setStatusFilter(value);
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
          eFootball · D1
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
