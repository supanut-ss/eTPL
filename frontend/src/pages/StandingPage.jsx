import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Leaderboard } from "@mui/icons-material";
import { getStandings } from "../api/standingApi";

// แปลง ~/_image/... → https://thaipes.com/_image/...
const resolveImage = (path) => {
  if (!path) return "";
  return path.replace(/^~\//, "https://thaipes.com/");
};

// เหรียญ Rank 1/2/3
const RankBadge = ({ rank }) => {
  const colors = {
    1: "#FFD700",
    2: "#C0C0C0",
    3: "#CD7F32",
  };
  if (colors[rank]) {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: colors[rank],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          color: rank === 1 ? "#7a5c00" : rank === 2 ? "#555" : "#6b3a1f",
          mx: "auto",
        }}
      >
        {rank}
      </Box>
    );
  }
  return (
    <Typography fontSize={13} color="text.secondary" textAlign="center">
      {rank}
    </Typography>
  );
};

const columns = [
  {
    field: "rank",
    headerName: "#",
    width: 60,
    sortable: false,
    align: "center",
    headerAlign: "center",
    renderCell: ({ row }) => <RankBadge rank={row.rank} />,
  },
  {
    field: "teamName",
    headerName: "ทีม",
    flex: 1,
    minWidth: 180,
    sortable: false,
    renderCell: ({ row }) => (
      <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
        <Avatar
          src={resolveImage(row.image)}
          imgProps={{ referrerPolicy: "no-referrer" }}
          sx={{ width: 30, height: 30, bgcolor: "grey.200", flexShrink: 0 }}
        >
          {!row.image && (row.teamName?.[0] || row.team?.[0])}
        </Avatar>
        <Typography fontSize={13} fontWeight={500} noWrap>
          {row.teamName || row.team}
        </Typography>
      </Box>
    ),
  },
  {
    field: "pl",
    headerName: "P",
    width: 55,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13}>{value ?? 0}</Typography>
    ),
  },
  {
    field: "w",
    headerName: "W",
    width: 55,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13} color="success.main" fontWeight={600}>
        {value ?? 0}
      </Typography>
    ),
  },
  {
    field: "d",
    headerName: "D",
    width: 55,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13} color="text.secondary">
        {value ?? 0}
      </Typography>
    ),
  },
  {
    field: "l",
    headerName: "L",
    width: 55,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13} color="error.main" fontWeight={600}>
        {value ?? 0}
      </Typography>
    ),
  },
  {
    field: "gf",
    headerName: "GF",
    width: 60,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13}>{value ?? 0}</Typography>
    ),
  },
  {
    field: "ga",
    headerName: "GA",
    width: 60,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Typography fontSize={13}>{value ?? 0}</Typography>
    ),
  },
  {
    field: "gd",
    headerName: "GD",
    width: 65,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => {
      const num = value ?? 0;
      return (
        <Typography
          fontSize={13}
          fontWeight={600}
          color={num > 0 ? "success.main" : num < 0 ? "error.main" : "text.secondary"}
        >
          {num > 0 ? `+${num}` : num}
        </Typography>
      );
    },
  },
  {
    field: "pts",
    headerName: "Pts",
    width: 70,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: ({ value }) => (
      <Chip
        label={value ?? 0}
        size="small"
        color="primary"
        sx={{ fontWeight: 700, minWidth: 36 }}
      />
    ),
  },
];

const StandingPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getStandings()
      .then((res) => {
        const data = res.data.data || [];
        // เพิ่ม rank
        const ranked = data.map((item, index) => ({ ...item, rank: index + 1 }));
        setRows(ranked);
        if (ranked.length > 0) setSeason(ranked[0].season || "");
      })
      .catch(() => setError("โหลดข้อมูลตารางคะแนนไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Leaderboard color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            ตารางคะแนน
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PC · D1{season ? ` · Season ${season}` : ""}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            hideFooter
            disableRowSelectionOnClick
            disableColumnMenu
            rowHeight={52}
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 700,
              },
              "& .MuiDataGrid-columnHeader": {
                bgcolor: "primary.main",
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                bgcolor: "action.hover",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid",
                borderColor: "divider",
              },
            }}
          />
        )}
      </Paper>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" mt={2} display="block" textAlign="right">
        PC · D1{season ? ` · Season ${season}` : ""}
      </Typography>
    </Box>
  );
};

export default StandingPage;
