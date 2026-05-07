import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Grid,
  Avatar,
  Skeleton,
  IconButton,
  Container,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Search,
  Groups,
  FilterList,
  Home,
  Star,
  Shield,
  VerifiedUser,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { getUsers } from "../api/userApi";
import { panelSx } from "./main/components/shared/designTokens";

const UserListPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await getUsers();
        setUsers(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const search = searchTerm.toLowerCase();
      return (
        u.userId?.toLowerCase().includes(search) ||
        u.lineName?.toLowerCase().includes(search) ||
        u.currentTeam?.toLowerCase().includes(search)
      );
    });
  }, [users, searchTerm]);

  return (
    <Box sx={{ minHeight: "100vh", pb: 10 }}>
      {/* Hero Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          pt: 10,
          pb: 12,
          mb: -6,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            background: "radial-gradient(circle at 20% 50%, #6366f1, transparent 25%), radial-gradient(circle at 80% 50%, #d1ad73, transparent 25%)",
          }}
        />
        <Container maxWidth="xl">
          <Breadcrumbs 
            sx={{ color: "rgba(255,255,255,0.5)", mb: 2 }}
            separator={<Typography sx={{ color: "rgba(255,255,255,0.3)" }}>•</Typography>}
          >
            <Link component={RouterLink} to="/" sx={{ color: "inherit", display: "flex", alignItems: "center", textDecoration: "none" }}>
              <Home sx={{ fontSize: 16, mr: 0.5 }} /> Home
            </Link>
            <Typography variant="caption" sx={{ color: "#d1ad73", fontWeight: 800 }}>Community Members</Typography>
          </Breadcrumbs>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 3 }}>
            <Box>
              <Typography variant="h2" fontWeight={1000} sx={{ letterSpacing: -2, mb: 1 }}>
                Community <span style={{ color: "#d1ad73" }}>Members</span>
              </Typography>
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, maxWidth: 600 }}>
                Meet the managers driving the eTPL community forward. Explore profiles and discover league talent.
              </Typography>
            </Box>
            <Paper
              elevation={0}
              sx={{
                p: 0.5,
                borderRadius: 4,
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                minWidth: { xs: "100%", md: 400 }
              }}
            >
              <TextField
                fullWidth
                variant="standard"
                placeholder="Search managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ pl: 2 }}>
                      <Search sx={{ color: "rgba(255,255,255,0.5)" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "white",
                    py: 1.5,
                    fontSize: "1rem"
                  }
                }}
              />
              <IconButton sx={{ mr: 0.5, color: "#d1ad73" }}>
                <FilterList />
              </IconButton>
            </Paper>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl">
        <Grid container spacing={3} columns={10}>
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Grid item xs={10} sm={5} md={2} lg={2} xl={2} key={i}>
                  <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 4 }} />
                </Grid>
              ))
            : filteredUsers.map((user) => (
                <Grid item xs={10} sm={5} md={2} lg={2} xl={2} key={user.userId}>
                  <Paper
                    elevation={0}
                    sx={{
                      ...panelSx,
                      p: 0,
                      height: 320,
                      maxHeight: 320,
                      minWidth: 240, // Reduced minWidth to fit 5 per row
                      maxWidth: 420,
                      mx: "auto",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      bgcolor: "white",
                    }}
                  >
                    <Box sx={{ 
                      height: 80, 
                      background: user.userLevel === "admin" 
                        ? "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)" 
                        : "linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)",
                      position: "relative",
                      flexShrink: 0
                    }}>
                      {user.userLevel === "admin" && (
                        <Star sx={{ position: "absolute", top: 10, right: 10, color: "#d1ad73", fontSize: 20 }} />
                      )}
                    </Box>
                    <Box sx={{ px: 3, pb: 2, pt: 0, mt: -4, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      {/* Header Section - Shifted text down closer to info section */}
                      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 1, height: 80, flexShrink: 0 }}>
                        <Box sx={{ minWidth: 0, flex: 1, pr: 1.5, pb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "#d1ad73", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, fontSize: 10, display: "block", mb: 0.2 }}>
                            {user.userLevel}
                          </Typography>
                          <Typography 
                            variant="h6" 
                            fontWeight={1000} 
                            sx={{ 
                              color: "#0f172a", 
                              lineHeight: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                              fontSize: "1.2rem",
                              letterSpacing: -0.5,
                              mb: 0.1
                            }}
                          >
                            {user.lineName || "Manager"}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: "text.secondary", 
                              fontWeight: 800, 
                              fontSize: 11,
                              display: "block",
                              opacity: 0.7,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {user.userId}
                          </Typography>
                        </Box>

                        <Avatar
                          src={user.linePic}
                          sx={{
                            width: 80,
                            height: 80,
                            border: "4px solid white",
                            boxShadow: user.userLevel === "admin" 
                              ? "0 8px 20px rgba(209, 173, 115, 0.3), 0 0 0 2px #d1ad73" 
                              : "0 8px 16px rgba(0,0,0,0.1)",
                            bgcolor: "#f1f5f9",
                            color: "#0f172a",
                            fontWeight: 900,
                            flexShrink: 0
                          }}
                        >
                          {user.lineName?.[0] || user.userId?.[0]}
                        </Avatar>
                      </Box>

                      {/* Info Section */}
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Shield sx={{ fontSize: 14, color: "primary.main" }} />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: "#0f172a", 
                              fontWeight: 800,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {user.currentTeam || "Free Agent"}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <VerifiedUser sx={{ fontSize: 14, color: "success.main" }} />
                          <Typography variant="caption" sx={{ color: "success.main", fontWeight: 800, letterSpacing: 0.5, fontSize: 9 }}>
                            VERIFIED ACCOUNT
                          </Typography>
                        </Box>
                      </Box>

                      {/* Footer Section - Pushed to bottom */}
                      <Box sx={{ mt: "auto", pt: 1.5, borderTop: "1px solid rgba(0,0,0,0.04)", flexShrink: 0 }}>
                         <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>
                          Member Since
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: 11 }}>
                          {new Date(user.createDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
        </Grid>
        
        {!loading && filteredUsers.length === 0 && (
          <Box sx={{ textAlign: "center", py: 20 }}>
            <Groups sx={{ fontSize: 80, color: "rgba(0,0,0,0.05)", mb: 2 }} />
            <Typography variant="h5" color="text.secondary" fontWeight={800}>
              No managers found matching "{searchTerm}"
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Try adjusting your search terms to find who you're looking for.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default UserListPage;
