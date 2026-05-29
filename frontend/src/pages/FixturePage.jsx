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
  alpha,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab
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
  const isAdminOrMod = user?.userLevel === "admin" || user?.userLevel === "moderator";
  const isUserLevel = !isAdminOrMod;
  const [division, setDivision] = useState(user?.currentDivision || "D1");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportFixture, setReportFixture] = useState(null);

  const fetchFixtures = useCallback((searchValue = "", currentDiv = division) => {
    setLoading(true);
    setError("");

    const params = { division: currentDiv };
    if (searchValue) params.search = searchValue;

    getFixtures(params)
      .then((response) => {
        const allFixtures = response.data.data || [];
        const activeFixtures = allFixtures.filter(
          (row) => row && row.active?.toLowerCase() === "yes"
        );
        setRows(activeFixtures);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [division]);

  useEffect(() => {
    fetchFixtures(search, division);
  }, [division, fetchFixtures]);

  const handleSearch = (event) => {
    if (event.key === "Enter") fetchFixtures(search, division);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchFixtures("", division);
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
      headerName: "Match",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography fontSize={15} color="text.secondary" fontWeight={700}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "division",
      headerName: "Division",
      width: 100,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        params.value ? (
          <Typography
            fontWeight={800}
            fontSize={13}
            sx={{
              color: params.value.toUpperCase() === "D2" ? "info.main" : "primary.main",
            }}
          >
            {params.value.toUpperCase()}
          </Typography>
        ) : (
          <Typography color="text.secondary" fontSize={14}>-</Typography>
        )
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

        if (isAdminOrMod) {
          return (
            <Button
              size="small"
              variant="outlined"
              color={isPlayed ? "warning" : "primary"}
              startIcon={<EditNote />}
              onClick={() => setReportFixture(params.row)}
              sx={{
                fontSize: 11,
                px: 1.5,
                fontWeight: "700",
                textTransform: "none",
                borderRadius: 1.75,
                borderWidth: "1.5px",
                "&:hover": {
                  borderWidth: "1.5px",
                },
                whiteSpace: "nowrap"
              }}
            >
              {isPlayed ? "Edit Result" : "Report Result"}
            </Button>
          );
        }

        if (!isPlayed) {
          return (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<EditNote />}
              onClick={() => setReportFixture(params.row)}
              sx={{
                fontSize: 11,
                px: 1.5,
                fontWeight: "700",
                textTransform: "none",
                borderRadius: 1.75,
                borderWidth: "1.5px",
                "&:hover": {
                  borderWidth: "1.5px",
                },
                whiteSpace: "nowrap"
              }}
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
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: 4,
        px: { xs: 1, sm: 0 }
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

      {/* Premium Tabs Division Switcher */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={division}
          onChange={(e, newDiv) => setDivision(newDiv)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              fontWeight: "bold",
              fontSize: "1rem",
              textTransform: "none",
              minWidth: 120,
            }
          }}
        >
          <Tab label="Division 1" value="D1" />
          <Tab label="Division 2" value="D2" />
        </Tabs>
      </Box>


      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, 
        gap: 2, 
        mb: 3 
      }}>
        <Paper
          elevation={1}
          sx={{ px: 2.5, py: 1.5, borderRadius: 2 }}
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
      </Box>

      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            label="Search Team"
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearch}
            placeholder="Press Enter to search"
            sx={{ flex: { xs: "1 1 100%", sm: "0 1 280px" } }}
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

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "grey.200",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
        }}
      >
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box sx={{ minWidth: isMobile ? 800 : "auto" }}>
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
                  borderBottom: "1px solid",
                  borderColor: "grey.200",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 600,
                  fontSize: 12,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                },
                "& .MuiDataGrid-row": {
                  borderBottom: "1px solid",
                  borderColor: "grey.100",
                  "&:hover": {
                    bgcolor: "grey.50",
                  },
                },
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  alignItems: "center",
                  borderColor: "transparent",
                  fontSize: 14,
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: "1px solid",
                  borderColor: "grey.200",
                },
              }}
            />
          </Box>
        </Box>
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
          eFootball · {division}
          </Typography>
        </Box>
      </Paper>

      <ReportResultDialog
        open={!!reportFixture}
        fixture={reportFixture}
        isAdmin={isAdminOrMod}
        onClose={() => setReportFixture(null)}
        onSuccess={() => fetchFixtures(search)}
      />
    </Box>
  );
};

export default FixturePage;
