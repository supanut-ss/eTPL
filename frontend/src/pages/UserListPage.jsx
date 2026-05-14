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
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import {
  Search,
  Groups,
  Home,
  Star,
  Shield,
  VerifiedUser,
  MilitaryTech,
  Stars,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { getUsers } from "../api/userApi";
import auctionService from "../services/auctionService";
import { getLogoUrl } from "../utils/imageUtils";
import { panelSx } from "./main/components/shared/designTokens";

const UserListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
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
    auctionService.getClubs().then((res) => setClubs(res.data || res || []));
  }, []);

  const filteredUsers = useMemo(() => {
    const levelOrder = { admin: 1, moderator: 2, mod: 2, user: 3 };

    return users
      .filter((u) => {
        const search = searchTerm.toLowerCase();
        return (
          u.userId?.toLowerCase().includes(search) ||
          u.lineName?.toLowerCase().includes(search) ||
          u.currentTeam?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const levelA = (a.userLevel || "").toLowerCase();
        const levelB = (b.userLevel || "").toLowerCase();
        const orderA = levelOrder[levelA] || 99;
        const orderB = levelOrder[levelB] || 99;

        if (orderA !== orderB) return orderA - orderB;
        return (a.lineName || "").localeCompare(b.lineName || "");
      });
  }, [users, searchTerm]);

  const stats = useMemo(() => {
    const total = users.length;
    const staff = users.filter(u => ["admin", "mod", "moderator"].includes((u.userLevel || "").toLowerCase())).length;
    const uniqueTeams = new Set(users.map(u => u.currentTeam).filter(Boolean)).size;
    return { total, staff, uniqueTeams };
  }, [users]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fcfcfd", pb: 10 }}>
      {/* Hero Header */}
      <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 1, md: 2 }, pt: 2 }}>
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
            <Groups color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">Community Members</Typography>
              <Typography variant="body2" color="text.secondary">
                PERSON-CENTRIC DIRECTORY
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box 
          sx={{ 
            mb: 5, 
            position: 'relative',
            p: { xs: 3, md: 5 },
            borderRadius: '40px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Abstract Background Decor */}
          <Box sx={{ 
            position: 'absolute', 
            top: -100, right: -100, 
            width: 300, height: 300, 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(209, 173, 115, 0.1) 0%, transparent 70%)',
            zIndex: 0 
          }} />

          <Box 
            sx={{ 
              position: 'relative', 
              zIndex: 1, 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' }, 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: 4
            }}
          >
            {/* Left Column: Title & Description */}
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
              <Box 
                component="img"
                src="/logo-etpl.png"
                alt="eTPL Logo"
                sx={{ 
                  height: 100, 
                  width: 'auto', 
                  mb: 2, 
                  filter: 'drop-shadow(0 0 20px rgba(209, 173, 115, 0.2))',
                  display: { xs: 'block', md: 'inline-block' },
                  mx: { xs: 'auto', md: 0 }
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#d1ad73', 
                  fontWeight: 900, 
                  letterSpacing: 4, 
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 2,
                  mt: 1
                }}
              >
                Network Directory
              </Typography>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                fontWeight={1000} 
                sx={{ 
                  color: '#fff', 
                  letterSpacing: -1, 
                  mb: 2,
                  lineHeight: 1.1
                }}
              >
                Connect with the <br/>
                <Box component="span" sx={{ color: '#d1ad73' }}>eTPL Community</Box>
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 550, mx: { xs: 'auto', md: 0 } }}>
                Explore profiles of dedicated managers, discover new talent, and strengthen your league connections.
              </Typography>
            </Box>

            {/* Right Column: Search & Stats (Stacked) - Pushed to Far Right */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2.5, 
              alignItems: { xs: 'center', md: 'flex-end' },
              minWidth: { md: 400 }
            }}>
              {/* Search Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  width: { xs: '100%', md: '380px' },
                  transition: "all 0.3s",
                  "&:focus-within": {
                    bgcolor: "rgba(255,255,255,0.08)",
                    borderColor: "rgba(209, 173, 115, 0.4)",
                  }
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
                        <Search sx={{ color: "rgba(255,255,255,0.3)" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: "white",
                      py: 1,
                      fontSize: "0.9rem"
                    }
                  }}
                />
              </Paper>

              {/* Stats Grid */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                width: { xs: '100%', md: '380px' },
                justifyContent: { xs: 'center', md: 'flex-end' }
              }}>
                {[
                  { label: 'Total', value: stats.total, icon: <Groups /> },
                  { label: 'Staff', value: stats.staff, icon: <VerifiedUser /> },
                ].map((stat, idx) => (
                  <Box 
                    key={idx}
                    sx={{ 
                      flex: 1,
                      p: 2.5, 
                      borderRadius: 4, 
                      bgcolor: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      textAlign: 'center',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s',
                      "&:hover": {
                        transform: 'translateY(-5px)',
                        bgcolor: 'rgba(255,255,255,0.06)',
                        borderColor: 'rgba(209, 173, 115, 0.2)'
                      }
                    }}
                  >
                    <Box sx={{ color: '#d1ad73', mb: 1, opacity: 0.8 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" fontWeight={900} sx={{ color: '#fff', mb: 0.5, letterSpacing: -1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box 
          sx={{ 
            mb: 5, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              sx={{ 
                width: 6, 
                height: 32, 
                bgcolor: '#d1ad73', 
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(209, 173, 115, 0.4)'
              }} 
            />
            <Box>
              <Typography 
                variant="h5" 
                fontWeight={1000} 
                sx={{ 
                  letterSpacing: -1, 
                  color: '#0f172a',
                  lineHeight: 1
                }}
              >
                ACTIVE MEMBERS
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, opacity: 0.6 }}>
                CERTIFIED MANAGERS DIRECTORY
              </Typography>
            </Box>
          </Box>
          
          <Box 
            sx={{ 
              px: 2, 
              py: 0.8, 
              borderRadius: '12px', 
              bgcolor: 'rgba(209, 173, 115, 0.1)',
              border: '1px solid rgba(209, 173, 115, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d1ad73', animation: 'pulse 2s infinite' }} />
            <Typography variant="body2" fontWeight={900} sx={{ color: '#b45309', fontSize: 13 }}>
              {filteredUsers.length} ONLINE
            </Typography>
          </Box>

          <style>
            {`
              @keyframes pulse {
                0% { transform: scale(0.95); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
                100% { transform: scale(0.95); opacity: 1; }
              }
            `}
          </style>
        </Box>
      </Box>

      <Container maxWidth={false} sx={{ px: { xs: 2, md: 5 }, width: "100%" }}>
        <Grid container spacing={3} justifyContent="center">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={i} sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            : filteredUsers.map((user) => {
                const teamLogo = user.currentTeam 
                  ? ((clubs || []).find(
                      (c) => (c.teamName || "").trim().toLowerCase() === (user.currentTeam || "").trim().toLowerCase()
                    )?.linePic || getLogoUrl(user.currentTeam))
                  : null;

                return (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={user.userId} sx={{ display: "flex", justifyContent: "center" }}>
                  <Paper
                    elevation={0}
                    sx={{
                      ...panelSx,
                      p: 0,
                      height: 280,
                      maxHeight: 280,
                      minWidth: 240,
                      maxWidth: 240,
                      width: 240,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      bgcolor: "white",
                    }}
                  >
                    <Box sx={{ 
                      height: 80, 
                      background: (() => {
                        const level = (user.userLevel || "").toLowerCase();
                        if (level === "admin") return "linear-gradient(135deg, #0f172a 0%, #334155 100%)";
                        if (level === "moderator" || level === "mod") return "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)";
                        return "linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)";
                      })(),
                      position: "relative",
                      flexShrink: 0,
                      overflow: "hidden",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)",
                        opacity: (user.userLevel || "").toLowerCase() === "user" ? 0.8 : 0.4,
                      }
                    }}>
                      {(user.userLevel || "").toLowerCase() === "admin" && (
                        <Star sx={{ position: "absolute", top: 10, left: 10, color: "#d1ad73", fontSize: 20 }} />
                      )}
                      {((user.userLevel || "").toLowerCase() === "mod" || (user.userLevel || "").toLowerCase() === "moderator") && (
                        <Shield sx={{ position: "absolute", top: 10, left: 10, color: "#818cf8", fontSize: 20 }} />
                      )}
                    </Box>
                    <Box sx={{ px: 3, pb: 2, pt: 0, mt: -6, flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
                      {/* Header Section - Shifted text down closer to info section */}
                      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 0.5, height: 80, flexShrink: 0 }}>
                        <Box sx={{ flex: 1 }} />
                        <Avatar
                          src={user.linePic}
                          sx={{
                            width: 80,
                            height: 80,
                            border: "4px solid white",
                            boxShadow: (() => {
                              const level = (user.userLevel || "").toLowerCase();
                              if (level === "admin") return "0 8px 20px rgba(209, 173, 115, 0.3), 0 0 0 2px #d1ad73";
                              if (level === "mod") return "0 8px 20px rgba(99, 102, 241, 0.3), 0 0 0 2px #6366f1";
                              return "0 8px 16px rgba(0,0,0,0.1)";
                            })(),
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
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5, justifyContent: "flex-start", pt: 0.5 }}>
                        <Box sx={{ mb: 0.5 }}>
                          <Typography 
                            variant="h6" 
                            fontWeight={1000} 
                            sx={{ 
                              color: "#0f172a", 
                              lineHeight: 1.1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                              fontSize: "1.1rem",
                              letterSpacing: -0.5,
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

                        <Box display="flex" alignItems="center" gap={1}>
                          {teamLogo ? (
                            <Box 
                              component="img"
                              src={teamLogo}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                              sx={{ width: 18, height: 18, objectFit: "contain" }}
                            />
                          ) : null}
                          <Shield 
                            sx={{ 
                              fontSize: 14, 
                              color: "primary.main",
                              display: teamLogo ? 'none' : 'block' 
                            }} 
                          />
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
                          <VerifiedUser 
                            sx={{ 
                              fontSize: 14, 
                              color: (() => {
                                const level = (user.userLevel || "").toLowerCase();
                                if (level === "admin") return "#d1ad73";
                                if (level === "mod") return "#6366f1";
                                return "#64748b";
                              })() 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: (() => {
                                const level = (user.userLevel || "").toLowerCase();
                                if (level === "admin") return "#d1ad73";
                                if (level === "moderator") return "#6366f1";
                                return "#64748b";
                              })(), 
                              fontWeight: 900, 
                              letterSpacing: 1, 
                              fontSize: 10, 
                              textTransform: "uppercase" 
                            }}
                          >
                            {user.userLevel} MEMBER
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                );
              })
            }
        </Grid>
        
        {!loading && filteredUsers.length === 0 && (
          <Box sx={{ textAlign: "center", py: 20 }}>
            <Groups sx={{ fontSize: 80, color: "rgba(0,0,0,0.05)", mb: 2 }} />
            <Typography variant="h5" color="text.secondary" fontWeight={800}>
              No managers found matching &quot;{searchTerm}&quot;
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
