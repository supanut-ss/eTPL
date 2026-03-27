import { Grid, Card, CardContent, Typography, Box } from "@mui/material";
import { People, Storage } from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" mt={1}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ color, fontSize: 48 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const MainPage = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        ยินดีต้อนรับ, {user?.userId || user?.lineName || "ผู้ใช้"}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        ระบบ eTPL — Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="ผู้ใช้ทั้งหมด"
            value="—"
            icon={<People />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="ข้อมูล MS SQL"
            value="—"
            icon={<Storage />}
            color="secondary.main"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
