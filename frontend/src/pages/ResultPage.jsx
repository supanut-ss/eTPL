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
  Alert,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Edit,
  Refresh,
  Search,
  Clear,
  EmojiEvents,
} from "@mui/icons-material";
import { getFixtures, updateFixtureScore } from "../api/fixtureApi";

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

const TeamCell = ({ name, image }) => (
  <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
    <Avatar
      src={resolveImage(image)}
      imgProps={{ referrerPolicy: "no-referrer" }}
      sx={{ width: 28, height: 28, bgcolor: "grey.200", flexShrink: 0 }}
    >
      {!image && name?.[0]}
    </Avatar>
    <Typography fontSize={13} noWrap>
      {name || "-"}
    </Typography>
  </Box>
);

const ResultPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [saving, setSaving] = useState(false);

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

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

  const openEditDialog = (row) => {
    setSelected(row);
    setHomeScore(row.homeScore != null ? String(row.homeScore) : "");
    setAwayScore(row.awayScore != null ? String(row.awayScore) : "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hs = homeScore === "" ? null : parseInt(homeScore, 10);
      const as_ = awayScore === "" ? null : parseInt(awayScore, 10);
      await updateFixtureScore(selected.fixtureId, hs, as_);
      showSnackbar("บันทึกผลสำเร็จ");
      setDialogOpen(false);
      fetchFixtures(search);
    } catch {
      showSnackbar("บันทึกผลไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "match",
      headerName: "#",
      width: 60,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography fontSize={13} color="text.secondary">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: "home",
      headerName: "Home",
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => (
        <TeamCell name={params.value} image={params.row.homeImage} />
      ),
    },
    {
      field: "score",
      headerName: "Score",
      width: 100,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const { homeScore: hs, awayScore: as_ } = params.row;
        if (hs == null || as_ == null)
          return <Typography color="text.secondary" fontSize={13}>-</Typography>;
        return (
          <Typography fontWeight={700} fontSize={14}>
            {hs} - {as_}
          </Typography>
        );
      },
    },
    {
      field: "away",
      headerName: "Away",
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => (
        <TeamCell name={params.value} image={params.row.awayImage} />
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
    {
      field: "actions",
      headerName: "",
      width: 70,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Tooltip title="บันทึกผล">
          <IconButton size="small" onClick={() => openEditDialog(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const played = rows.filter((r) => r.homeScore != null && r.awayScore != null).length;
  const unplayed = rows.length - played;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <EmojiEvents color="primary" />
          <Typography variant="h5" fontWeight="bold">
            บันทึกผลการแข่งขัน
          </Typography>
        </Box>
        <Tooltip title="รีเฟรช">
          <IconButton onClick={() => fetchFixtures(search)} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper elevation={1} sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 110 }}>
          <Typography variant="caption" color="text.secondary">Total</Typography>
          <Typography variant="h6" fontWeight={700}>{rows.length}</Typography>
        </Paper>
        <Paper
          elevation={1}
          sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 110, borderLeft: "4px solid", borderColor: "success.main" }}
        >
          <Typography variant="caption" color="text.secondary">Played</Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">{played}</Typography>
        </Paper>
        <Paper
          elevation={1}
          sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 110, borderLeft: "4px solid", borderColor: "warning.main" }}
        >
          <Typography variant="caption" color="text.secondary">Pending</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{unplayed}</Typography>
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
            "& .MuiDataGrid-columnHeaders": { bgcolor: "grey.50", fontWeight: 700 },
            "& .MuiDataGrid-row:hover": { bgcolor: "primary.50" },
            "& .MuiDataGrid-cell": { alignItems: "center" },
          }}
        />
        <Divider />
        <Box px={2} py={1} bgcolor="grey.50" display="flex" alignItems="center" gap={1}>
          <EmojiEvents fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            PC · D1 · Season ปัจจุบัน
          </Typography>
        </Box>
      </Paper>

      {/* Edit Score Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>บันทึกผลการแข่งขัน</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography fontWeight={600} mb={2} textAlign="center">
                {selected.home} vs {selected.away}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <TextField
                  label={selected.home || "Home"}
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ width: 100 }}
                  size="small"
                />
                <Typography fontWeight={700} color="text.secondary">-</Typography>
                <TextField
                  label={selected.away || "Away"}
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ width: 100 }}
                  size="small"
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ minWidth: 250 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResultPage;
