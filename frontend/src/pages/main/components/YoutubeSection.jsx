import { Box, Typography, Skeleton } from "@mui/material";
import { YouTube, PlayArrow, NotificationsActive } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import { panelSx } from "./shared/designTokens";

const DEFAULT_YOUTUBE_CHANNEL = "@iamcrazygamerch";

/**
 * Extract YouTube Video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
const extractYouTubeId = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1].split("?")[0];
    return u.searchParams.get("v");
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  }
};

const getYoutubeThumbnail = (url) => {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

/**
 * Build a YouTube subscribe confirmation URL from a channel handle.
 * Supports:
 *  - @handle           → https://www.youtube.com/@handle?sub_confirmation=1
 *  - full channel URL  → appended ?sub_confirmation=1
 *  - plain text name   → search fallback (no sub link)
 */
const buildSubscribeUrl = (announcer) => {
  const trimmed = (announcer || DEFAULT_YOUTUBE_CHANNEL).trim();
  if (!trimmed) return null;

  // Already a full YouTube URL
  if (trimmed.startsWith("https://www.youtube.com/") || trimmed.startsWith("http://www.youtube.com/")) {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}sub_confirmation=1`;
  }

  // @handle format
  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}?sub_confirmation=1`;
  }

  return null;
};

const YoutubeSection = ({ videos = [], loading }) => {
  if (loading) {
    return (
      <Box>
        <Box sx={{ ...panelSx, p: 0, mb: 3, overflow: "hidden" }}>
          <SectionHeader
            icon={<YouTube />}
            title="YouTube Highlights"
            color="#FF0000"
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              p: 2.5,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" sx={{ borderRadius: 2, aspectRatio: "16/9" }} />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  if (!videos || videos.length === 0) return null;

  return (
    <Box sx={{ ...panelSx, p: 0, mb: 3, overflow: "hidden" }}>
      <SectionHeader
        icon={<YouTube />}
        title="YouTube Highlights"
        color="#FF0000"
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          p: 2.5,
        }}
      >
        {videos.slice(0, 8).map((video, i) => {
          const thumb = getYoutubeThumbnail(video.imageUrl);
          const videoId = extractYouTubeId(video.imageUrl);
          const watchUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}&sub_confirmation=1`
            : video.imageUrl;
          const subscribeUrl = buildSubscribeUrl(video.announcer || DEFAULT_YOUTUBE_CHANNEL);

          return (
            <Box
              key={video.id || i}
              sx={{
                display: "block",
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.08)",
                background: "rgba(15,23,42,0.03)",
                textDecoration: "none",
                cursor: "pointer",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px) scale(1.01)",
                  boxShadow: "0 16px 40px -12px rgba(255, 0, 0, 0.18)",
                  "& .play-overlay": {
                    opacity: 1,
                    transform: "translate(-50%, -50%) scale(1)",
                  },
                  "& .thumb-img": {
                    transform: "scale(1.06)",
                  },
                },
              }}
            >
              {/* Thumbnail — click opens video + subscribe */}
              <Box
                component="a"
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Open subscribe confirmation in a second tab when clicking video
                  if (subscribeUrl) {
                    setTimeout(() => {
                      window.open(subscribeUrl, "_blank", "noopener,noreferrer");
                    }, 300);
                  }
                }}
                sx={{
                  display: "block",
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  overflow: "hidden",
                  bgcolor: "#0f172a",
                  textDecoration: "none",
                }}
              >
                {thumb ? (
                  <Box
                    className="thumb-img"
                    component="img"
                    src={thumb}
                    alt={video.announcement || "YouTube Video"}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.35s ease",
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(15,23,42,0.08)",
                    }}
                  >
                    <YouTube sx={{ fontSize: 40, color: "#FF0000", opacity: 0.4 }} />
                  </Box>
                )}

                {/* Play overlay */}
                <Box
                  className="play-overlay"
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) scale(0.85)",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 0, 0, 0.88)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.2s ease, transform 0.2s ease",
                    boxShadow: "0 4px 20px rgba(255,0,0,0.5)",
                    pointerEvents: "none",
                  }}
                >
                  <PlayArrow sx={{ color: "#fff", fontSize: 26 }} />
                </Box>

                {/* YouTube badge */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 6,
                    right: 8,
                    bgcolor: "rgba(0,0,0,0.7)",
                    borderRadius: 1,
                    px: 0.8,
                    py: 0.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                  }}
                >
                  <YouTube sx={{ fontSize: 12, color: "#FF0000" }} />
                  <Typography sx={{ fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.5 }}>
                    YOUTUBE
                  </Typography>
                </Box>
              </Box>

              {/* Info + Subscribe button row */}
              <Box sx={{ p: 1.5, pb: 1.5 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    color: "#0f172a",
                    lineHeight: 1.4,
                    fontSize: { xs: 11, md: 12 },
                  }}
                >
                  {video.announcement || "YouTube Video"}
                </Typography>

                {/* Channel row: name + Subscribe button */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 0.8,
                    gap: 0.5,
                  }}
                >
                  {video.announcer && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(15,23,42,0.45)",
                        fontSize: 10,
                        flexShrink: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {video.announcer}
                    </Typography>
                  )}

                  {subscribeUrl && (
                    <Box
                      component="a"
                      href={subscribeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.4,
                        bgcolor: "#FF0000",
                        color: "#fff",
                        borderRadius: "4px",
                        px: 0.9,
                        py: 0.3,
                        textDecoration: "none",
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        lineHeight: 1,
                        transition: "background 0.15s ease, transform 0.15s ease",
                        "&:hover": {
                          bgcolor: "#cc0000",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <NotificationsActive sx={{ fontSize: 10 }} />
                      SUBSCRIBE
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default YoutubeSection;
