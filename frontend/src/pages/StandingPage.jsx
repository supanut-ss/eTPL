import { useState, useEffect } from "react";
import { getLogoUrl } from "../utils/imageUtils";
import { Box, Paper, Typography, Alert, CircularProgress, useTheme, useMediaQuery } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Leaderboard, SquareRounded } from "@mui/icons-material";
import { getStandings } from "../api/standingApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";



// Extract player name from parentheses, e.g. "AZ ALKMAAR (RREEF)" → "RREEF"
const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
};

// Form dot badges from "W W D L W"
const FormBadges = ({ last }) => {
  if (!last) return null;
  const results = last.trim().split(/\s+/);
  const colorMap = { W: "#4caf50", D: "#ff9800", L: "#f44336" };
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      {results.map((r, i) => (
        <Box
          key={i}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: colorMap[r] || "grey.400",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          {r}
        </Box>
      ))}
    </Box>
  );
};

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


const StandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("");

  const columns = [
    {
      field: "rank",
      headerName: "#",
      width: 52,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => <RankBadge rank={row.rank} />,
    },
    {
      field: "teamName",
      headerName: "Team",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => {
        const playerName = extractPlayer(row.team);
        const canClick = !!user;
        const isSelf = user?.userId === playerName;

        const handleClick = () => {
          if (!canClick) return;
          if (isSelf) {
            navigate("/my-squad");
          } else {
            navigate(`/clubs-squad?userId=${playerName}`);
          }
        };

        return (
          <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Box
              component="img"
              src={getLogoUrl(row.teamName)}
              alt={row.teamName}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              sx={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                fontSize={16} 
                fontWeight={600} 
                noWrap
                onClick={handleClick}
                sx={{ 
                  cursor: canClick ? "pointer" : "default",
                  "&:hover": { color: canClick ? "primary.main" : "inherit" },
                  transition: "color 0.2s"
                }}
              >
                {playerName}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "pl",
      headerName: "P",
      width: 64,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16}>{value ?? 0}</Typography>
      ),
    },
    {
      field: "w",
      headerName: "W",
      width: 64,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16} color="success.main" fontWeight={600}>
          {value ?? 0}
        </Typography>
      ),
    },
    {
      field: "d",
      headerName: "D",
      width: 64,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16} color="text.secondary">
          {value ?? 0}
        </Typography>
      ),
    },
    {
      field: "l",
      headerName: "L",
      width: 64,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16} color="error.main" fontWeight={600}>
          {value ?? 0}
        </Typography>
      ),
    },
    {
      field: "gf",
      headerName: "GF",
      width: 68,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16}>{value ?? 0}</Typography>
      ),
    },
    {
      field: "ga",
      headerName: "GA",
      width: 68,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16}>{value ?? 0}</Typography>
      ),
    },
    {
      field: "gd",
      headerName: "GD",
      width: 72,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => {
        const num = value ?? 0;
        return (
          <Typography
            fontSize={16}
            fontWeight={600}
            color={
              num > 0 ? "success.main" : num < 0 ? "error.main" : "text.secondary"
            }
          >
            {num}
          </Typography>
        );
      },
    },
    {
      field: "pts",
      headerName: "Pts",
      width: 72,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: ({ value }) => (
        <Typography fontSize={16} fontWeight={700} color="secondary.main">
          {value ?? 0}
        </Typography>
      ),
    },
    {
      field: "last",
      headerName: "Form",
      width: 150,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ value }) => <FormBadges last={value} />,
    },
    {
      field: "totalYellow",
      headerName: "YC",
      width: 60,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ value }) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <SquareRounded sx={{ color: "#f59e0b", fontSize: 14 }} />
          <Typography fontSize={15} fontWeight={600}>
            {value ?? 0}
          </Typography>
        </Box>
      ),
    },
    {
      field: "totalRed",
      headerName: "RC",
      width: 60,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ value }) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <SquareRounded sx={{ color: "#ef4444", fontSize: 14 }} />
          <Typography fontSize={15} fontWeight={600}>
            {value ?? 0}
          </Typography>
        </Box>
      ),
    },
  ];

  useEffect(() => {
    setLoading(true);
    setError("");
    getStandings()
      .then((res) => {
        const data = res.data.data || [];
        // add rank
        const ranked = data.map((item, index) => ({
          ...item,
          rank: index + 1,
        }));
        setRows(ranked);
        if (ranked.length > 0) setSeason(ranked[0].season || "");
      })
      .catch(() => setError("Failed to load standings"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center", 
        gap: 1.5, 
        mb: 3 
      }}>
        <Leaderboard color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Standings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            eFootball · D1
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
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={6}
          >
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
            rowHeight={56}
            sx={{
              border: "none",
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                bgcolor: "#fafafa",
              },
            }}
          />
        )}
      </Paper>

      {/* Footer */}
      <Typography
        variant="caption"
        color="text.secondary"
        mt={2}
        display="block"
        textAlign="right"
      >
        PC · D1{season ? ` · Season ${season}` : ""}
      </Typography>
    </Box>
  );
};

export default StandingPage;
