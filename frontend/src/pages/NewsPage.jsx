import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  alpha,
  Paper,
  Link as MuiLink,
  Dialog,
  DialogContent,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import {
  Campaign,
  AutoAwesome,
  EmojiEvents,
  ArrowBack,
  Newspaper,
  Close,
  CalendarMonth,
  Person,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { getPublicAnnouncements } from "../api/announcementApi";
import { getAnnouncementImageUrl } from "../utils/imageUtils";

const DESIGN_TOKENS = {
  background: "#ffffff",
  glowA: "rgba(79, 70, 229, 0.04)",
  glowB: "rgba(56, 189, 248, 0.03)",
  glass: "rgba(255, 255, 255, 0.95)",
  border: "rgba(148, 163, 184, 0.15)",
  shadow: "0 10px 30px -15px rgba(15, 23, 42, 0.1)",
  primary: "#4f46e5",
  textMain: "#0f172a",
  textMuted: "#64748b",
};

const NewsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = location.state?.tab !== undefined ? location.state.tab : 0;
  const [tabValue, setTabValue] = useState(initialTab);
  
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Detail Dialog State
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [newsRes, eventRes, magRes] = await Promise.all([
          getPublicAnnouncements("News"),
          getPublicAnnouncements("Event"),
          getPublicAnnouncements("Magazine"),
        ]);
        
        setNews((newsRes.data?.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
        setEvents((eventRes.data?.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
        setMagazines((magRes.data?.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
      } catch (err) {
        console.error("Failed to load news data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const currentData = useMemo(() => {
    if (tabValue === 0) return news;
    if (tabValue === 1) return magazines;
    return events;
  }, [tabValue, news, magazines, events]);

  const getCategoryLabel = () => {
    if (tabValue === 0) return "News";
    if (tabValue === 1) return "Magazine";
    return "Event";
  };

  const activeColor = tabValue === 0 ? "#4f46e5" : tabValue === 1 ? "#a855f7" : "#0ea5e9";

  return (
    <Box 
      sx={{ 
        minHeight: "100vh", 
        bgcolor: DESIGN_TOKENS.background, 
        pb: 10,
        backgroundImage: `radial-gradient(circle at 14% 46%, ${DESIGN_TOKENS.glowA}, transparent 38%), radial-gradient(circle at 86% 28%, ${DESIGN_TOKENS.glowB}, transparent 36%)`,
        px: { xs: 1.5, md: 3 }, // Minimal horizontal padding for full-width feel
        pt: { xs: 2, md: 4 },
      }}
    >
      {/* System Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        px: { xs: 1, sm: 0 }
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Newspaper color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Media Center</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontWeight: 700 }}>
              NEWS, MAGAZINES & EVENT UPDATES
            </Typography>
          </Box>
        </Box>

        <Box>
          <MuiLink 
            component="button" 
            onClick={() => navigate("/main")}
            sx={{ 
              color: DESIGN_TOKENS.textMuted, 
              textDecoration: "none", 
              display: "flex", 
              alignItems: "center",
              gap: 0.8,
              fontSize: "0.75rem",
              fontWeight: 800,
              bgcolor: "transparent",
              border: `1px solid ${DESIGN_TOKENS.border}`,
              borderRadius: 2,
              px: 2,
              py: 1,
              cursor: "pointer",
              transition: "0.2s",
              "&:hover": { bgcolor: "rgba(0,0,0,0.02)", color: DESIGN_TOKENS.primary }
            }}
          >
            <ArrowBack sx={{ fontSize: 14 }} /> BACK TO DASHBOARD
          </MuiLink>
        </Box>
      </Box>

      {/* Main Content Wrapper */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 4, md: 7, lg: 10 }, // More compact on mobile
          borderRadius: 4,
          background: DESIGN_TOKENS.glass,
          backdropFilter: "blur(10px)",
          border: `1px solid ${DESIGN_TOKENS.border}`,
          position: "relative",
          overflow: "hidden",
          boxShadow: DESIGN_TOKENS.shadow,
          minHeight: "85vh",
          width: "100%", // Ensure full width
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              "& .MuiTab-root": {
                fontWeight: 800,
                fontSize: "0.85rem",
                color: DESIGN_TOKENS.textMuted,
                px: 3,
                "&.Mui-selected": { color: activeColor }
              },
              "& .MuiTabs-indicator": {
                bgcolor: activeColor,
                height: 3,
                borderRadius: "3px 3px 0 0"
              }
            }}
          >
            <Tab label="NEWS" icon={<Campaign sx={{ fontSize: 18 }} />} iconPosition="start" />
            <Tab label="MAGAZINE" icon={<AutoAwesome sx={{ fontSize: 18 }} />} iconPosition="start" />
            <Tab label="EVENTS" icon={<EmojiEvents sx={{ fontSize: 18 }} />} iconPosition="start" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
            gap: { xs: 2, sm: 3 } 
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <Box key={i}>
                <Skeleton 
                  variant="rectangular" 
                  sx={{ borderRadius: 1.5, mb: 1, width: "100%", aspectRatio: "16 / 9" }} 
                />
                <Skeleton width="90%" sx={{ height: 18, mb: 0.5 }} />
                <Skeleton width="60%" sx={{ height: 14 }} />
              </Box>
            ))}
          </Box>
        ) : currentData.length === 0 ? (
          <Box sx={{ py: 10, textAlign: "center", opacity: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>No content found in this category.</Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
            gap: { xs: 2, sm: 3 } 
          }}>
            {currentData.map((item, idx) => (
              <Box key={item.id || idx} sx={{ minWidth: 0 }}>
                <Card 
                  elevation={0}
                  onClick={() => handleItemClick(item)}
                  sx={{ 
                    width: "100%",
                    maxWidth: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "transparent",
                    cursor: "pointer",
                    "&:hover": {
                      "& .card-image": { transform: "scale(1.05)" },
                      "& .card-title": { color: activeColor }
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      position: "relative", 
                      borderRadius: 1.5, 
                      overflow: "hidden", 
                      mb: 1, 
                      width: "100%",
                      aspectRatio: "16 / 9", 
                      border: `1px solid ${DESIGN_TOKENS.border}`,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <CardMedia
                      className="card-image"
                      component="img"
                      image={getAnnouncementImageUrl(item.imageUrl)}
                      alt=""
                      sx={{ 
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        transition: "transform 0.6s cubic-bezier(0.2, 0, 0.2, 1)",
                      }}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800";
                      }}
                    />
                  </Box>
                  
                  <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                    <Typography 
                      className="card-title"
                      variant="body2" 
                      fontWeight={800} 
                      sx={{ 
                        color: DESIGN_TOKENS.textMain,
                        lineHeight: 1.2,
                        mb: 0.3,
                        fontSize: { xs: "0.85rem", sm: "0.75rem" }, 
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3, 
                        WebkitBoxOrient: "vertical",
                        minHeight: "3.6em", 
                        transition: "color 0.2s"
                      }}
                    >
                      {item.announcement}
                    </Typography>
                    
                    <Box sx={{ mt: "auto" }}>
                      <Typography 
                        variant="caption" 
                        fontWeight={700} 
                        sx={{ 
                          color: DESIGN_TOKENS.textMuted,
                          fontSize: { xs: "0.65rem", sm: "0.55rem" },
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                          opacity: 0.8
                        }}
                      >
                        {getCategoryLabel()} • {item.announcer || "SYSTEM"}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            bgcolor: DESIGN_TOKENS.background,
            overflow: "hidden"
          }
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={handleCloseDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              bgcolor: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(4px)",
              zIndex: 10,
              "&:hover": { bgcolor: "white" }
            }}
          >
            <Close />
          </IconButton>
          
          <Box sx={{ 
            width: "100%", 
            overflow: "hidden",
            lineHeight: 0 // Remove potential small gap at bottom
          }}>
            <img 
              src={selectedItem ? getAnnouncementImageUrl(selectedItem.imageUrl) : ""} 
              alt=""
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </Box>

          <DialogContent sx={{ p: { xs: 2, sm: 4, md: 6 } }}>
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Typography 
                variant="caption" 
                fontWeight={800} 
                sx={{ 
                  bgcolor: alpha(activeColor, 0.1), 
                  color: activeColor, 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: 1,
                  textTransform: "uppercase" 
                }}
              >
                {getCategoryLabel()}
              </Typography>
              
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: DESIGN_TOKENS.textMuted }}>
                <Person sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={700}>
                  {selectedItem?.announcer || "SYSTEM"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: DESIGN_TOKENS.textMuted }}>
                <CalendarMonth sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={700}>
                  {selectedItem ? new Date(selectedItem.createDate).toLocaleDateString() : ""}
                </Typography>
              </Box>
            </Box>

            <Typography variant="h6" fontWeight={900} color={DESIGN_TOKENS.textMain} sx={{ mb: 1, lineHeight: 1.3 }}>
              {selectedItem?.announcement}
            </Typography>
          </DialogContent>

        </Box>
      </Dialog>
    </Box>
  );
};

export default NewsPage;
