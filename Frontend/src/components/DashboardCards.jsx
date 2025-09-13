import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Chip,
  Divider,
  DialogActions,
} from "@mui/material";
import { Droplets, Package, Users, Activity, TrendingUp, BarChart3, Eye, Filter } from "lucide-react";
import api from "../services/axios";
import { socket } from "../lib/socket";

const StatCard = ({ title, value, change, Icon, onView }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
    <CardHeader
      title={
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {onView && (
              <IconButton
                size="small"
                aria-label={`view ${title}`}
                onClick={onView}
                sx={{ color: "text.secondary" }}
              >
                <Eye size={16} />
              </IconButton>
            )}
            <Icon size={18} color="#2e7d32" />
          </Stack>
        </Stack>
      }
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

  // Daily totals dialog state
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyAll, setDailyAll] = useState([]); // full unfiltered dataset
  const [daily, setDaily] = useState([]);       // filtered dataset for display
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(null);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | '7' | '30' | '90' | 'custom'
  const [startDate, setStartDate] = useState("");      // 'YYYY-MM-DD'
  const [endDate, setEndDate] = useState("");

  const load = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/activity?limit=5"),
    ]);
    setStats(s || stats);
    setRecent(r || []);
  };

  // Fetch all-time daily totals once (large days window)
  const loadDailyAll = async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const { data } = await api.get("/dashboard/daily-totals?days=36500"); // ~100 years
      const arr = Array.isArray(data) ? data : [];
      // Ensure newest first
      arr.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setDailyAll(arr);
      // Default view = all time
      setFilterMode("all");
      setStartDate("");
      setEndDate("");
      setDaily(arr);
    } catch (e) {
      setDailyError("Couldn't load daily totals.");
    } finally {
      setDailyLoading(false);
    }
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

  useEffect(() => {
    if (dailyOpen && dailyAll.length === 0 && !dailyLoading) {
      loadDailyAll();
    }
  }, [dailyOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // helpers
  const fmt = (n) => {
    if (n == null || Number.isNaN(n)) return "0%";
    const v = Number(n);
    return `${v > 0 ? "+" : ""}${v}%`;
  };
  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };

  const applyFilter = () => {
    let result = [...dailyAll];

    const today = new Date();
    const toDate = (str) => {
      // Expecting 'YYYY-MM-DD'; fallback to Date parsing
      if (!str) return null;
      const [y, m, d] = str.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
      const t = new Date(str);
      return isNaN(t) ? null : t;
    };

    if (filterMode === "7" || filterMode === "30" || filterMode === "90") {
      const n = Number(filterMode);
      const cutoff = new Date(today);
      cutoff.setDate(today.getDate() - n + 1); // inclusive
      result = result.filter((x) => {
        const dx = toDate(x.date);
        return dx && dx >= cutoff;
      });
    } else if (filterMode === "custom") {
      const start = toDate(startDate);
      const end = toDate(endDate);
      result = result.filter((x) => {
        const dx = toDate(x.date);
        if (!dx) return false;
        if (start && dx < start) return false;
        if (end) {
          const endAdj = new Date(end);
          endAdj.setHours(23, 59, 59, 999);
          if (dx > endAdj) return false;
        }
        return true;
      });
    } // 'all' leaves result as-is

    // Keep newest first
    result.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setDaily(result);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setFilterMode("all");
    setStartDate("");
    setEndDate("");
    setDaily(dailyAll);
    setFilterOpen(false);
  };

  const activeFilterLabel = (() => {
    switch (filterMode) {
      case "7": return "Last 7 days";
      case "30": return "Last 30 days";
      case "90": return "Last 90 days";
      case "custom": {
        const s = startDate || "—";
        const e = endDate || "—";
        return `Custom (${s} → ${e})`;
      }
      default: return "All time";
    }
  })();

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
            onView={() => setDailyOpen(true)}
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
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Activity size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>Recent Activity</Typography>
                </Stack>
              }
            />
            <CardContent>
              <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />} spacing={1}>
                {recent.map((r, i) => (
                  <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" py={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor:
                            r.type === "customer" ? "success.main" :
                            r.type === "processing" ? "warning.main" :
                            r.type === "warehouse" ? "info.main" :
                            r.type === "ready" ? "primary.main" :
                            r.type === "pickup" ? "success.dark" : "text.secondary",
                        }}
                      />
                      <Typography variant="body2">{r.message}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.ts).toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
                {recent.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No recent activity.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <BarChart3 size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>Today’s Overview</Typography>
                </Stack>
              }
            />
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

      {/* Daily totals dialog */}
      <Dialog open={dailyOpen} onClose={() => setDailyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>Daily Totals</Typography>
              <Typography variant="body2" color="text.secondary">
                Date · Total litres · Total customers • {activeFilterLabel}
              </Typography>
            </Box>
            <IconButton
              aria-label="Filter daily totals"
              onClick={() => setFilterOpen(true)}
              sx={{ color: "text.secondary" }}
            >
              <Filter size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {dailyLoading && (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={24} />
            </Stack>
          )}

          {dailyError && <Alert severity="error" sx={{ mb: 2 }}>{dailyError}</Alert>}

          {!dailyLoading && !dailyError && (
            <Stack spacing={1.25}>
              {daily.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No daily totals available for the selected range.
                </Typography>
              )}

              {daily.map((d, i) => (
                <Card
                  key={`${d.date}-${i}`}
                  elevation={0}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}
                >
                  <CardContent sx={{ py: 1.25 }}>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={800}>
                        {fmtDate(d.date)}
                      </Typography>
                      <Stack direction="row" spacing={3}>
                        <Stack alignItems="flex-end">
                          <Typography variant="caption" color="text.secondary">Total litres</Typography>
                          <Typography variant="body1" fontWeight={700}>{d.total_liters}L</Typography>
                        </Stack>
                        <Stack alignItems="flex-end">
                          <Typography variant="caption" color="text.secondary">Total customers</Typography>
                          <Typography variant="body1" fontWeight={700}>{d.total_customers}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter dialog */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Filter daily totals</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary">Quick ranges</Typography>
          <Stack direction="row" spacing={1} mt={1} mb={2} flexWrap="wrap">
            {[
              { key: "all", label: "All time" },
              { key: "7", label: "Last 7 days" },
              { key: "30", label: "Last 30 days" },
              { key: "90", label: "Last 90 days" },
            ].map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                clickable
                color={filterMode === key ? "primary" : "default"}
                variant={filterMode === key ? "filled" : "outlined"}
                onClick={() => setFilterMode(key)}
              />
            ))}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary">Custom range</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={1}>
            <TextField
              label="Start date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFilterMode("custom"); }}
              fullWidth
            />
            <TextField
              label="End date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFilterMode("custom"); }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearFilter}>Clear</Button>
          <Button variant="contained" onClick={applyFilter}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
