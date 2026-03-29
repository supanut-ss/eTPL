import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Avatar,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  SportsSoccer,
  Search,
  Refresh,
  Clear,
  EmojiEvents,
} from "@mui/icons-material";
import { getFixtures } from "../api/fixtureApi";
import { useAuth } from "../store/AuthContext";

// แปลง ~/_image/... → https://thaipes.com/_image/...
const resolveImage = (path) => {
  if (!path) return "";
  return path.replace(/^~\//, "https://thaipes.com/");
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
        fontSize={15}
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
      <Typography color="text.secondary" fontSize={13}>
        -
      </Typography>
      <Typography
        fontWeight={700}
        fontSize={15}
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

const TeamCell = ({ player, image, isWinner }) => (
  <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
    <Avatar
      src={resolveImage(image)}
      imgProps={{ referrerPolicy: "no-referrer" }}
      sx={{ width: 30, height: 30, bgcolor: "grey.200", flexShrink: 0 }}
    >
      {!image && player?.[0]}
    </Avatar>
    <Typography
      fontSize={13}
      fontWeight={isWinner ? 700 : 400}
      color={isWinner ? "success.main" : "text.primary"}
      noWrap
    >
      {player || "-"}
    </Typography>
  </Box>
);

const FixturePage = () => {
  const { user } = useAuth();
  const isUserLevel = user?.userLevel !== "admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchFixtures = useCallback((searchVal = "") => {
    setLoading(true);
    setError("");
    const params = {};
    if (searchVal) params.search = searchVal;
    getFixtures(params)
      .then((res) => setRows(res.data.data || []))
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"))
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

  // สถิติ
  const played = rows.filter(
    (r) => r.homeScore != null && r.awayScore != null,
  ).length;
  const unplayed = rows.length - played;

  const columns = [
    {
      field: "match",
      headerName: "Match",
      width: 70,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography fontSize={13} color="text.secondary">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: "division",
      headerName: "Division",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Chip
          label={params.value || "-"}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: "home",
      headerName: "Home",
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => {
        const isWinner =
          params.row.homeScore != null &&
          params.row.awayScore != null &&
          params.row.homeScore > params.row.awayScore;
        return (
          <TeamCell
            player={params.value}
            image={params.row.homeImage}
            isWinner={isWinner}
          />
        );
      },
    },
    {
      field: "score",
      headerName: "Score",
      width: 90,
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
      minWidth: 150,
      renderCell: (params) => {
        const isWinner =
          params.row.homeScore != null &&
          params.row.awayScore != null &&
          params.row.awayScore > params.row.homeScore;
        return (
          <TeamCell
            player={params.value}
            image={params.row.awayImage}
            isWinner={isWinner}
          />
        );
      },
    },
    {
      field: "platform",
      headerName: "Platform",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Chip
          label={params.value || "-"}
          size="small"
          variant="outlined"
          sx={{ fontSize: 11 }}
        />
      ),
    },
    {
      field: "active",
      headerName: "Status",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const val = params.value;
        const label =
          val === "YES" ? "Played" : val === "NO" ? "Pending" : val || "-";
        return (
          <Chip
            label={label}
            size="small"
            color={activeColor(val)}
            sx={{ fontSize: 11 }}
          />
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
              label="แสดงเฉพาะของคุณ"
              size="small"
              color="info"
              variant="outlined"
              sx={{ ml: 0.5, fontWeight: 600 }}
            />
          )}
        </Box>
        <Tooltip title="รีเฟรช">
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

      {/* Search */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <TextField
          label="ค้นหาทีม"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="กด Enter เพื่อค้นหา"
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
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={rows}
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
            "& .MuiDataGrid-cell": { alignItems: "center" },
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
    </Box>
  );
};

export default FixturePage;
