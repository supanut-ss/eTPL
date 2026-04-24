import { useState, useEffect, useCallback } from "react";
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Button,
} from "@mui/material";
import { Notifications, Inbox, DoneAll, Info } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api/notificationApi";

const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const NotificationMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        getNotifications(),
        getUnreadCount()
      ]);
      setNotifications(nRes.data.data || []);
      setUnreadCount(cRes.data.data || 0);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    handleClose();
    if (notif.targetUrl) {
      // Handle tab parameters if any
      const [path, query] = notif.targetUrl.split('?');
      if (query) {
         // This is a bit simple, but works for /market?tab=offers
         navigate(notif.targetUrl);
      } else {
         navigate(notif.targetUrl);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { 
            width: 320, 
            maxHeight: 450, 
            mt: 1.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            borderRadius: '12px'
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" startIcon={<DoneAll />} onClick={handleMarkAllRead} sx={{ fontSize: '0.75rem' }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Inbox sx={{ fontSize: 48, color: "text.disabled", mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
            </Box>
          ) : (
            notifications.map((n) => (
              <ListItem
                key={n.id}
                disablePadding
                sx={{
                  bgcolor: n.isRead ? "transparent" : "rgba(25, 118, 210, 0.05)",
                  borderLeft: n.isRead ? "4px solid transparent" : "4px solid",
                  borderColor: "primary.main",
                  transition: 'background-color 0.2s',
                }}
              >
                <ListItemButton 
                  onClick={() => handleNotificationClick(n)}
                  sx={{ py: 1.5, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Info color={n.isRead ? "disabled" : "primary"} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={n.title}
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" color="text.primary" sx={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical', 
                          overflow: 'hidden',
                          mb: 0.5,
                          fontSize: '0.8125rem'
                        }}>
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(n.createdAt)}
                        </Typography>
                      </Box>
                    }
                    primaryTypographyProps={{ 
                      variant: "body2", 
                      fontWeight: n.isRead ? 500 : 700,
                      sx: { fontSize: '0.875rem' }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Menu>
    </>
  );
};

export default NotificationMenu;
