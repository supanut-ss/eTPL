import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Stack,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  InputAdornment
} from "@mui/material";
import {
  Search,
  Refresh,
  DeleteForever,
  Edit,
  Ballot,
  Gavel,
  CheckCircle,
  Cancel,
  TrendingUp,
  AccountCircle,
  AccessTime
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";
import { getPlayerCardUrl } from "../utils/imageUtils";

const AdminActiveAuctionsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // --- States ---
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active"); // "Active" | "Sold" | "Cancelled" | "All"

  // Dialog states
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchAuctions();
  }, []);

  // --- API Calls ---
  const fetchAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAuctions();
      const resData = res.data;
      if (Array.isArray(resData)) {
        setAuctions(resData);
      } else if (resData && Array.isArray(resData.data)) {
        setAuctions(resData.data);
      } else {
        setAuctions([]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Failed to fetch auctions";
      setError(errMsg);
      enqueueSnackbar(errMsg, { variant: "error" });
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPrice = async () => {
    if (!newPrice || Number(newPrice) <= 0) {
      enqueueSnackbar("Please enter a valid price greater than 0", { variant: "warning" });
      return;
    }
    try {
      setActionLoading(true);
      const res = await adminService.adjustAuctionPrice(selectedAuction.auctionId, Number(newPrice));
      enqueueSnackbar(res.data?.message || "Price adjusted successfully", { variant: "success" });
      setEditPriceDialogOpen(false);
      fetchAuctions();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || "Failed to adjust price", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAuction = async () => {
    try {
      setActionLoading(true);
      const res = await adminService.cancelAuction(selectedAuction.auctionId);
      enqueueSnackbar(res.data?.message || "Auction cancelled successfully", { variant: "success" });
      setCancelDialogOpen(false);
      fetchAuctions();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || "Failed to cancel auction", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Filter and Search logic ---
  const filteredAuctions = (auctions || []).filter((auc) => {
    if (!auc) return false;
    const pName = auc.playerName || "Unknown";
    const status = auc.dbStatus || "Active";
    const matchesSearch = pName.toLowerCase().includes((searchTerm || "").toLowerCase());
    const matchesStatus = statusFilter === "All" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics metrics
  const totalCount = auctions.length;
  const activeCount = auctions.filter(a => (a.dbStatus || "Active") === "Active").length;
  const soldCount = auctions.filter(a => a.dbStatus === "Sold").length;
  const cancelledCount = auctions.filter(a => a.dbStatus === "Cancelled").length;

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "Sold":
        return "primary";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Section */}
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
          <Ballot color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Auction Management Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">ADMIN ACTIVE AUCTION CONTROL</Typography>
          </Box>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />} 
          onClick={fetchAuctions}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Statistics Summary Banner */}
      {!error && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)', color: 'primary.main', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <Gavel sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL AUCTIONS</Typography>
                <Typography variant="h5" fontWeight="900" color="text.primary">{totalCount}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ bgcolor: 'rgba(46, 125, 50, 0.08)', color: 'success.main', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <TrendingUp sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">ACTIVE AUCTIONS</Typography>
                <Typography variant="h5" fontWeight="900" color="success.main">{activeCount}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ bgcolor: 'rgba(2, 136, 209, 0.08)', color: 'info.main', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <CheckCircle sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">COMPLETED / SOLD</Typography>
                <Typography variant="h5" fontWeight="900" color="info.main">{soldCount}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ bgcolor: 'rgba(211, 47, 47, 0.08)', color: 'error.main', p: 1.5, borderRadius: 2, display: 'flex' }}>
                <Cancel sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">CANCELLED</Typography>
                <Typography variant="h5" fontWeight="900" color="error.main">{cancelledCount}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filter and Search Bar */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4, border: "1px solid", borderColor: "divider" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} display="flex" justifyContent={{ xs: "flex-start", md: "flex-end" }} gap={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="Active">Active Auctions</MenuItem>
                <MenuItem value="Sold">Sold / Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
                <MenuItem value="All">All Auctions</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Table / Error / Loading View */}
      {error ? (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: "center", borderColor: "error.main", bgcolor: "rgba(211, 47, 47, 0.02)" }}>
          <Typography color="error" variant="h6" fontWeight="bold" gutterBottom>
            Error Fetching Auctions
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3, maxW: 500, mx: 'auto' }}>
            If you recently updated your roles or enabled new permissions, your current session token may be outdated. 
            Please try <strong>logging out</strong> of the application and <strong>logging back in</strong> to refresh your security credentials.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button 
              variant="contained" 
              color="primary" 
              onClick={fetchAuctions} 
              startIcon={<Refresh />}
              sx={{ borderRadius: 2 }}
            >
              Retry Connection
            </Button>
          </Stack>
        </Paper>
      ) : loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      ) : filteredAuctions.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: "center", borderStyle: "dashed" }}>
          <Typography color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>
            No auctions found matching criteria
          </Typography>
          {totalCount > 0 ? (
            <Typography variant="body2" color="text.secondary">
              There are {totalCount} total auctions in the system ({activeCount} Active, {soldCount} Sold, {cancelledCount} Cancelled).
              <br />
              Try changing the <strong>Status</strong> filter or searching for a different player name.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No auctions exist in the database yet.
            </Typography>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", maxHeight: 600, overflowY: 'auto' }}>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Player</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Initiator</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Current Price (TP)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Highest Bidder</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>End Time (Normal / Final)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAuctions.map((auc) => (
                <TableRow key={auc.auctionId} hover>
                  {/* Player Info */}
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar 
                        variant="rounded" 
                        src={getPlayerCardUrl(auc.playerId)} 
                        sx={{ width: 44, height: 60, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }} 
                      />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{auc.playerName || "Unknown"}</Typography>
                        <Stack direction="row" spacing={1} mt={0.5}>
                          <Chip label={`OVR: ${auc.playerOvr || 0}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />
                          <Chip label={auc.position || "-"} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />
                        </Stack>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Initiated By */}
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccountCircle sx={{ color: 'action.active', fontSize: 20 }} />
                      <Typography variant="body2">{auc.initiatorName || "-"}</Typography>
                    </Stack>
                  </TableCell>

                  {/* Current Price */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="900" color="primary.main">
                      {(auc.currentPrice || 0).toLocaleString()} TP
                    </Typography>
                  </TableCell>

                  {/* Highest Bidder */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {auc.highestBidderName || "-"}
                    </Typography>
                  </TableCell>

                  {/* End times */}
                  <TableCell sx={{ minWidth: 200 }}>
                    <Stack spacing={0.5}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Normal: {auc.normalEndTime ? new Date(auc.normalEndTime).toLocaleString("en-GB", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "No Limit"}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Final: {auc.finalEndTime ? new Date(auc.finalEndTime).toLocaleString("en-GB", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "No Limit"}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip 
                      label={auc.dbStatus} 
                      size="small" 
                      color={getStatusColor(auc.dbStatus)} 
                      sx={{ fontWeight: 'bold' }} 
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    {auc.dbStatus === "Active" || auc.dbStatus === "Sold" ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Adjust Price">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => {
                              setSelectedAuction(auc);
                              setNewPrice(auc.currentPrice.toString());
                              setEditPriceDialogOpen(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel Auction">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => {
                              setSelectedAuction(auc);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <DeleteForever fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">No Actions</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Adjust Price Dialog */}
      <Dialog 
        open={editPriceDialogOpen} 
        onClose={() => !actionLoading && setEditPriceDialogOpen(false)}
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Adjust Bid Price</DialogTitle>
        <DialogContent dividers>
          {selectedAuction && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>Player Name:</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedAuction.playerName || "Unknown"}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>Current Price:</Typography>
                <Typography variant="body1" fontWeight="bold">{(selectedAuction.currentPrice || 0).toLocaleString()} TP</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(2, 136, 209, 0.05)', border: '1px solid rgba(2, 136, 209, 0.1)' }}>
                <Typography variant="caption" color="info.main" fontWeight="bold" display="block">ℹ️ Status: {selectedAuction.dbStatus}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {selectedAuction.dbStatus === "Sold" 
                    ? "This auction is already completed. Changing the price will directly adjust the winner's wallet balance and update their player squad purchase cost."
                    : "This auction is currently active. Changing the price will adjust the leading bidder's wallet Available/Reserved balance."}
                </Typography>
              </Box>
              {selectedAuction.highestBidderId && (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                  <Typography variant="caption" color="primary.main" fontWeight="bold" display="block">👤 Leading Bidder</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Wallet adjustments will target **{selectedAuction.highestBidderName || "User"}**.
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                label="New Price (TP)"
                type="number"
                size="small"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                disabled={actionLoading}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditPriceDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAdjustPrice} 
            disabled={actionLoading}
          >
            {actionLoading ? "Saving..." : "Confirm Price Adjustment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Auction Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => !actionLoading && setCancelDialogOpen(false)}
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cancel /> Cancel Auction
        </DialogTitle>
        <DialogContent dividers>
          {selectedAuction && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                Are you sure you want to cancel the auction for {selectedAuction.playerName || "this player"}?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedAuction.dbStatus === "Sold"
                  ? "This auction has already completed. Cancelling it will REMOVE the player from the winner's active squad, make them a Free Agent, and refund the winning amount to the winner's wallet."
                  : "This will abort the active bidding cycle, make the player available as a Free Agent again, and automatically refund all bids placed on this auction to their respective user wallets."}
              </Typography>
              {selectedAuction.highestBidderId && (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(211, 47, 47, 0.05)', border: '1px solid rgba(211, 47, 47, 0.1)' }}>
                  <Typography variant="caption" color="error.main" fontWeight="bold" display="block">⚠️ Expected Action details</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    • **{selectedAuction.highestBidderName || "User"}** will be refunded **{(selectedAuction.currentPrice || 0).toLocaleString()} TP**
                  </Typography>
                  {selectedAuction.dbStatus === "Sold" && (
                    <Typography variant="caption" color="error.main" fontWeight="bold" display="block" sx={{ mt: 0.5 }}>
                      • {selectedAuction.playerName} will be REMOVED from their active squad!
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelAuction} 
            disabled={actionLoading}
          >
            {actionLoading ? "Cancelling..." : "Confirm Cancel Auction"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminActiveAuctionsPage;
