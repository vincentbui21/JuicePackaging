import { useEffect, useState } from "react";
import { Grid, Card, CardContent, CardHeader, Typography, LinearProgress, Box, Stack } from "@mui/material";
import { Droplets, Package, Users, Activity, TrendingUp, BarChart3 } from "lucide-react";
import api from "../services/axios";
import { socket } from "../lib/socket";

const StatCard = ({ title, value, change, Icon }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
    <CardHeader
      title={<Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Icon size={18} color="#2e7d32" />
      </Stack>}
      sx={{ pb: 0.5 }}
    />
    <CardContent sx={{ pt: 1.5 }}>
      <Typography variant="h4" fontWeight={800}>{value}</Typography>
      {change && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: "success.main", mt: 0.5 }}>
          <TrendingUp size={14} /> <Typography variant="caption">{change} from yesterday</Typography>
        </Stack>
      )}
    </CardContent>
  </Card>
);

function StatBar({ label, value, max, color = "success.main" }) {
  const pct = Math.min(100, Math.round((Number(value || 0) / (max || 1)) * 100));
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>{value}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 10, borderRadius: 5, "& .MuiLinearProgress-bar": { borderRadius: 5, backgroundColor: color } }}
      />
    </Stack>
  );
}

export default function DashboardCards() {
  const [stats, setStats] = useState({
    daily_production_liters: 0,
    active_orders: 0,
    customers_served: 0,
    processing_efficiency: 0,
    overview: { juice_liters: 0, crates_processed: 0, orders_fulfilled: 0 },
  });
  const [recent, setRecent] = useState([]);

  const load = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/activity?limit=5"),
    ]);
    setStats(s || stats);
    setRecent(r || []);
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    socket.on("activity", refresh);
    socket.on("order-status-updated", refresh);
    socket.on("pallet-updated", refresh);
    return () => {
      socket.off("activity", refresh);
      socket.off("order-status-updated", refresh);
      socket.off("pallet-updated", refresh);
    };
  }, []);

  // helper to format +/− percentages
const fmt = (n) => {
  if (n == null || Number.isNaN(n)) return "0%";
  const v = Number(n);
  return `${v > 0 ? "+" : ""}${v}%`;
};

return (
  <Stack spacing={2}>
    {/* Stats */}
    <Grid container spacing={2}>
      <Grid item xs={12} md={6} lg={3}>
        <StatCard
          title="Daily Production"
          value={`${stats.daily_production_liters}L`}
          change={fmt(stats?.changes?.daily_production_pct)}
          Icon={Droplets}
        />
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <StatCard
          title="Active Orders"
          value={stats.active_orders}
          change={fmt(stats?.changes?.active_orders_pct)}
          Icon={Package}
        />
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <StatCard
          title="Customers Served"
          value={stats.customers_served}
          change={fmt(stats?.changes?.customers_served_pct)}
          Icon={Users}
        />
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <StatCard
          title="Processing Efficiency"
          value={`${stats.processing_efficiency}%`}
          change={fmt(stats?.changes?.processing_efficiency_pct)}
          Icon={Activity}
        />
      </Grid>
    </Grid>

      {/* Activity & Today */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardHeader title={
              <Stack direction="row" spacing={1} alignItems="center">
                <Activity size={18} color="#2e7d32" />
                <Typography variant="h6" fontWeight={800}>Recent Activity</Typography>
              </Stack>
            } />
            <CardContent>
              <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />} spacing={1}>
                {recent.map((r, i) => (
                  <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" py={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{
                        width: 8, height: 8, borderRadius: "50%",
                        bgcolor:
                          r.type === "customer" ? "success.main" :
                          r.type === "processing" ? "warning.main" :
                          r.type === "warehouse" ? "info.main" :
                          r.type === "ready" ? "primary.main" :
                          r.type === "pickup" ? "success.dark" : "text.secondary"
                      }} />
                      <Typography variant="body2">{r.message}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.ts).toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
                {recent.length === 0 && <Typography variant="body2" color="text.secondary">No recent activity.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardHeader title={
              <Stack direction="row" spacing={1} alignItems="center">
                <BarChart3 size={18} color="#2e7d32" />
                <Typography variant="h6" fontWeight={800}>Today’s Overview</Typography>
              </Stack>
            } />
            <CardContent>
              <StatBar label="Juice Processed" value={stats.overview.juice_liters} max={3500} color="success.main" />
              <Box mt={2} />
              <StatBar label="Crates Processed" value={stats.overview.crates_processed} max={500} color="#ef6c00" />
              <Box mt={2} />
              <StatBar label="Orders Fulfilled" value={stats.overview.orders_fulfilled} max={30} color="primary.main" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
