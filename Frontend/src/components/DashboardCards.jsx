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
  Tooltip,
} from "@mui/material";
import { Droplets, Package, Users, Activity, TrendingUp, BarChart3, Eye, Filter, Zap, Weight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";
import api from "../services/axios";
import { socket } from "../lib/socket";
import { useTranslation } from "react-i18next";

const StatCard = ({ title, value, change, Icon, onView, t }) => (
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
          <TrendingUp size={14} /> <Typography variant="caption">{change} {t ? t('dashboard.from_yesterday') : 'from yesterday'}</Typography>
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

const LOW_STOCK_THRESHOLD = 10;

export default function DashboardCards() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    daily_production_kgs: 0,
    active_orders: 0,
    customers_served: 0,
    processing_efficiency: 0,
    revenue_today: 0,
    customers_served_today: 0,
    order_completion_rate: 0,
    orders_created_today: 0,
    orders_completed_today: 0,
    reservation_split_today: { reservation: 0, regular: 0 },
    orders_by_status: { pending: 0, processing: 0, ready: 0, picked_up: 0, other: 0 },
    overview: { juice_kgs: 0, crates_processed: 0, orders_fulfilled: 0 },
  });
  const [metrics, setMetrics] = useState({
    today: { pouches_made: 0, kg_processed: 0, kg_taken_in: 0 },
    yesterday: { pouches_made: 0, kg_processed: 0, kg_taken_in: 0 },
    changes: { pouches_pct: 0, kg_processed_pct: 0, kg_taken_in_pct: 0 },
  });
  const [recent, setRecent] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [lowStock, setLowStock] = useState([]);

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
    try {
      const [{ data: s }, { data: r }, { data: m }, { data: peak }, { data: inventory }] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/activity?limit=5"),
        api.get("/dashboard/today-metrics"),
        api.get("/dashboard/peak-hours").catch(() => ({ data: [] })),
        api.get("/inventory-summary").catch(() => ({ data: [] })),
      ]);
      setStats((prev) => ({ ...prev, ...(s || {}) }));
      setRecent(r || []);
      setMetrics(m || metrics);
      setPeakHours(Array.isArray(peak) ? peak : []);

      const items = Array.isArray(inventory) ? inventory : [];
      const lowStockItems = items
        .filter((item) => Number(item.on_hand) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.on_hand) - Number(b.on_hand))
        .slice(0, 5);
      setLowStock(lowStockItems);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
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
  const fmtCurrency = (n) => {
    const value = Number(n || 0);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `€${value.toFixed(2)}`;
    }
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

  const statusCounts = stats.orders_by_status || {};
  const statusData = [
    { key: "pending", name: t("dashboard.status_pending"), value: Number(statusCounts.pending || 0), color: "#9e9e9e" },
    { key: "processing", name: t("dashboard.status_processing"), value: Number(statusCounts.processing || 0), color: "#ffb300" },
    { key: "ready", name: t("dashboard.status_ready"), value: Number(statusCounts.ready || 0), color: "#42a5f5" },
    { key: "picked_up", name: t("dashboard.status_picked_up"), value: Number(statusCounts.picked_up || 0), color: "#2e7d32" },
    { key: "other", name: t("dashboard.status_other"), value: Number(statusCounts.other || 0), color: "#bdbdbd" },
  ];
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);
  const statusDataFiltered = statusData.filter((item) => item.value > 0);
  const statusChartData = statusDataFiltered.length > 0 ? statusDataFiltered : statusData;

  const reservationTotal = Number(stats?.reservation_split_today?.reservation || 0);
  const regularTotal = Number(stats?.reservation_split_today?.regular || 0);
  const splitMax = Math.max(reservationTotal + regularTotal, 1);

  const peakData = peakHours.length === 24
    ? peakHours
    : Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const peakMax = Math.max(...peakData.map((item) => Number(item.count || 0)), 0);
  const peakColor = (count) => {
    const max = peakMax || 1;
    const ratio = Math.min(1, Math.max(0, count / max));
    return `rgba(46, 125, 50, ${0.1 + ratio * 0.8})`;
  };

  return (
    <Stack spacing={2}>
      {/* Stats */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.daily_production')}
            value={`${stats.daily_production_kgs}kg`}
            change={fmt(stats?.changes?.daily_production_pct)}
            Icon={Droplets}
            onView={() => setDailyOpen(true)}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.pouches_made')}
            value={metrics.today.pouches_made}
            change={fmt(metrics?.changes?.pouches_pct)}
            Icon={Package}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.kg_processed')}
            value={`${metrics.today.kg_processed}kg`}
            change={fmt(metrics?.changes?.kg_processed_pct)}
            Icon={Weight}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.kg_taken_in')}
            value={`${metrics.today.kg_taken_in}kg`}
            change={fmt(metrics?.changes?.kg_taken_in_pct)}
            Icon={Zap}
            t={t}
          />
        </Grid>
      </Grid>

      {/* Second row - Daily operations */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.active_orders')}
            value={stats.active_orders}
            change={fmt(stats?.changes?.active_orders_pct)}
            Icon={Package}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.customers_served_today')}
            value={stats.customers_served_today}
            Icon={Users}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.revenue_today')}
            value={fmtCurrency(stats.revenue_today)}
            Icon={BarChart3}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title={t('dashboard.order_completion_rate')}
            value={`${stats.order_completion_rate}%`}
            Icon={Activity}
            t={t}
          />
        </Grid>
      </Grid>

      {/* Status & Mix */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <BarChart3 size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.orders_by_status')}</Typography>
                </Stack>
              }
            />
            <CardContent>
              {statusTotal === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.no_status_data')}
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Users size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.reservation_vs_regular')}</Typography>
                </Stack>
              }
              subheader={t('dashboard.today')}
            />
            <CardContent>
              <Stack spacing={2}>
                <StatBar
                  label={t('dashboard.reservation_orders')}
                  value={reservationTotal}
                  max={splitMax}
                  color="#ffb300"
                />
                <StatBar
                  label={t('dashboard.regular_orders')}
                  value={regularTotal}
                  max={splitMax}
                  color="#2e7d32"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Activity size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.peak_hours')}</Typography>
                </Stack>
              }
              subheader={t('dashboard.peak_hours_subtitle')}
            />
            <CardContent>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                  gap: 1,
                }}
              >
                {peakData.map((item) => (
                  <Tooltip
                    key={item.hour}
                    title={`${String(item.hour).padStart(2, "0")}:00 • ${item.count} ${t('dashboard.orders')}`}
                  >
                    <Box
                      sx={{
                        borderRadius: 1,
                        px: 1,
                        py: 0.75,
                        textAlign: "center",
                        bgcolor: peakColor(Number(item.count || 0)),
                        color: Number(item.count || 0) > 0 ? "common.white" : "text.secondary",
                      }}
                    >
                      <Typography variant="caption">
                        {String(item.hour).padStart(2, "0")}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {item.count}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory, Activity & Today */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Package size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.inventory_low_stock')}</Typography>
                </Stack>
              }
              subheader={`${t('dashboard.low_stock_threshold')} ${LOW_STOCK_THRESHOLD}`}
            />
            <CardContent>
              {lowStock.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.low_stock_empty')}
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {lowStock.map((item) => (
                    <Stack key={item.item_id} direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.category || "—"}</Typography>
                      </Box>
                      <Chip
                        label={`${item.on_hand} ${item.unit}`}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Activity size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.recent_activity')}</Typography>
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
                  <Typography variant="body2" color="text.secondary">{t('dashboard.no_recent_activity')}</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} alignItems="center">
                  <BarChart3 size={18} color="#2e7d32" />
                  <Typography variant="h6" fontWeight={800}>{t('dashboard.todays_overview')}</Typography>
                </Stack>
              }
            />
            <CardContent>
              <StatBar label={t('dashboard.juice_kgs')} value={stats.overview.juice_kgs} max={3500} color="success.main" />
              <Box mt={2} />
              <StatBar label={t('dashboard.crates_processed')} value={stats.overview.crates_processed} max={500} color="#ef6c00" />
              <Box mt={2} />
              <StatBar label={t('dashboard.orders_fulfilled')} value={stats.overview.orders_fulfilled} max={30} color="primary.main" />
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
                Date · Total Kgs · Total pouches • {activeFilterLabel}
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
                          <Typography variant="caption" color="text.secondary">Total Kgs</Typography>
                          <Typography variant="body1" fontWeight={700}>{d.total_kgs}kg</Typography>
                        </Stack>
                        <Stack alignItems="flex-end">
                          <Typography variant="caption" color="text.secondary">Total pouches</Typography>
                          <Typography variant="body1" fontWeight={700}>{d.total_pouches}</Typography>
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
