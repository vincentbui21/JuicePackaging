import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, Save } from "lucide-react";
import api from "../services/axios";
import { buildAdminReport } from "../utils/adminReport";

const presets = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "custom", label: "Custom" },
];

const toDateStr = (d) => d.toISOString().slice(0, 10);

const getPresetRange = (key) => {
  const now = new Date();
  const end = toDateStr(now);
  const start = new Date(now);

  if (key === "today") {
    return { start: end, end };
  }
  if (key === "week") {
    const day = now.getDay();
    const diff = (day + 6) % 7;
    start.setDate(now.getDate() - diff);
    return { start: toDateStr(start), end };
  }
  if (key === "month") {
    start.setDate(1);
    return { start: toDateStr(start), end };
  }
  if (key === "quarter") {
    const month = now.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    return { start: toDateStr(start), end };
  }
  return { start: "", end: "" };
};

const formatCurrency = (value) => {
  const v = Number(value || 0);
  return `€${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const KpiCard = ({ title, value, subtext }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{value}</Typography>
      {subtext && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtext}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default function AdminReports() {
  const [preset, setPreset] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCities, setSelectedCities] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState(false);

  const report = useMemo(() => buildAdminReport(rows), [rows]);

  useEffect(() => {
    const saved = localStorage.getItem("adminReportsView");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.preset) setPreset(parsed.preset);
        if (parsed?.startDate) setStartDate(parsed.startDate);
        if (parsed?.endDate) setEndDate(parsed.endDate);
        if (Array.isArray(parsed?.selectedCities)) setSelectedCities(parsed.selectedCities);
        return;
      } catch {}
    }
    const range = getPresetRange("month");
    setStartDate(range.start);
    setEndDate(range.end);
  }, []);

  useEffect(() => {
    if (preset !== "custom") {
      const range = getPresetRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }, [preset]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const { data } = await api.get("/cities");
        const list = Array.isArray(data) ? data.map((c) => c.name).filter(Boolean) : [];
        setCityOptions(list);
      } catch (err) {
        console.error("Failed to load cities", err);
      }
    };
    loadCities();
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      if (!startDate || !endDate) return;
      setLoading(true);
      setError("");
      try {
        const params = { start: startDate, end: endDate };
        if (selectedCities.length > 0) {
          params.cities = selectedCities.join(",");
        }
        const { data } = await api.get("/admin/reports", { params });
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (err) {
        console.error("Failed to load admin reports", err);
        setError("Failed to load admin reports data.");
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [startDate, endDate, selectedCities]);

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "City",
      "Customer name",
      "Order ID",
      "Pouches produced",
      "Kilos",
      "Unit price (€ / pouch)",
      "Revenue (€)",
      "Direct cost (€)",
      "Gross profit (€)",
      "Gross margin (%)",
    ];

    const escape = (val) => {
      const str = String(val ?? "");
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const lines = report.rows.map((r) => ([
      r.production_date,
      r.city,
      r.customer_name,
      r.order_id,
      r.pouches_produced,
      r.kilos,
      r.unit_price,
      r.revenue,
      r.direct_cost,
      r.gross_profit,
      r.gross_margin_pct,
    ]));

    lines.push([
      "Totals",
      "",
      "",
      "",
      report.totals.pouches,
      report.totals.kilos,
      "",
      report.totals.revenue,
      report.totals.direct_cost,
      report.totals.gross_profit,
      report.totals.gross_margin_pct,
    ]);

    const csv = [headers, ...lines].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    // TODO: plug into a PDF export utility if/when one is added.
    alert("PDF export is not available yet.");
  };

  const handleSaveView = () => {
    const payload = {
      preset,
      startDate,
      endDate,
      selectedCities,
      // TODO: persist column visibility once the table exposes it.
    };
    localStorage.setItem("adminReportsView", JSON.stringify(payload));
    setSaveNotice(true);
  };

  const columns = useMemo(() => ([
    { field: "production_date", headerName: "Date", minWidth: 100, flex: 0.7 },
    { field: "city", headerName: "City", minWidth: 100, flex: 0.7 },
    { field: "customer_name", headerName: "Customer name", minWidth: 140, flex: 1.2 },
    { field: "order_id", headerName: "Order ID", minWidth: 130, flex: 1 },
    { field: "pouches_produced", headerName: "Pouches produced", type: "number", minWidth: 120, flex: 0.9 },
    { field: "kilos", headerName: "Kilos", type: "number", minWidth: 90, flex: 0.6 },
    {
      field: "unit_price",
      headerName: "Unit price €/pouch",
      type: "number",
      minWidth: 130,
      flex: 0.9,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "revenue",
      headerName: "Revenue (€)",
      type: "number",
      minWidth: 110,
      flex: 0.8,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "direct_cost",
      headerName: "Direct cost (€)",
      type: "number",
      minWidth: 120,
      flex: 0.85,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "gross_profit",
      headerName: "Gross profit (€)",
      type: "number",
      minWidth: 120,
      flex: 0.85,
      valueFormatter: ({ value }) => formatCurrency(value),
    },
    {
      field: "gross_margin_pct",
      headerName: "Gross margin (%)",
      type: "number",
      minWidth: 120,
      flex: 0.85,
      valueFormatter: ({ value }) => `${Number(value || 0).toFixed(2)}%`,
    },
  ]), []);

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "flex-start", lg: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>Apple Juice Production & Financial Report</Typography>
          <Typography variant="body2" color="text.secondary">Admin dashboard – company-wide view</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<Download size={16} />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button variant="outlined" startIcon={<FileText size={16} />} onClick={handleExportPdf}>
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveView}>
            Save view
          </Button>
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Date range</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {presets.map((p) => (
                  <Chip
                    key={p.key}
                    label={p.label}
                    clickable
                    color={preset === p.key ? "primary" : "default"}
                    variant={preset === p.key ? "filled" : "outlined"}
                    onClick={() => setPreset(p.key)}
                  />
                ))}
              </Stack>
            </Box>

            {preset === "custom" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Start date"
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End date"
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            )}

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="city-select-label">City</InputLabel>
              <Select
                labelId="city-select-label"
                label="City"
                multiple
                value={selectedCities}
                onChange={(e) => setSelectedCities(e.target.value)}
                renderValue={(selected) => (
                  selected.length ? selected.join(", ") : "All cities"
                )}
              >
                {cityOptions.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {loading && (
        <Stack alignItems="center" py={3}>
          <CircularProgress size={28} />
        </Stack>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={3}>
              <KpiCard
                title="Total Kilos Produced"
                value={`${formatNumber(report.totals.kilos)} kg`}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <KpiCard
                title="Pouches Produced"
                value={formatNumber(report.totals.pouches)}
                subtext={`Average weight per pouch: ${report.totals.avg_weight_per_pouch_g} g`}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <KpiCard
                title="Revenue from Pouches"
                value={formatCurrency(report.totals.revenue)}
                subtext="Collected: €— | Outstanding: €—"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <KpiCard
                title="Gross Profit"
                value={formatCurrency(report.totals.gross_profit)}
                subtext={`Gross margin: ${report.totals.gross_margin_pct}%`}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <KpiCard
                title="Yield"
                value={`${report.totals.yield_pct}%`}
                subtext={`Expected pouches: ${formatNumber(report.totals.expected_pouches)}`}
              />
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                Operational Insights
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                <Typography variant="body2">
                  Orders in range: <strong>{formatNumber(report.totals.orders)}</strong>
                </Typography>
                <Typography variant="body2">
                  Avg order value: <strong>{formatCurrency(report.totals.avg_order_value)}</strong>
                </Typography>
                <Typography variant="body2">
                  Top city: <strong>{report.topCity}</strong>
                </Typography>
                <Typography variant="body2">
                  Avg revenue per kg: <strong>{report.totals.kilos ? formatCurrency(report.totals.revenue / report.totals.kilos) : "€0.00"}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    Production vs Sales Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={report.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ReTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="kilos" stroke="#2e7d32" name="Kilos produced" strokeWidth={2} />
                      <Line type="monotone" dataKey="pouches" stroke="#ef6c00" name="Pouches sold" strokeWidth={2} />
                      <Line type="monotone" dataKey="revenue" stroke="#1976d2" name="Sales revenue (€)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    Performance by City
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.citySeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="city" />
                      <YAxis />
                      <ReTooltip />
                      <Legend />
                      <Bar dataKey="kilos" fill="#2e7d32" name="Kilos produced" />
                      <Bar dataKey="pouches" fill="#ef6c00" name="Pouches sold" />
                      <Bar dataKey="revenue" fill="#1976d2" name="Revenue (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                Yield Variance (Monthly)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={report.varianceSeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pouches" stroke="#2e7d32" name="Actual pouches" strokeWidth={2} />
                  <Line type="monotone" dataKey="expected_pouches" stroke="#9e9e9e" name="Expected pouches" strokeWidth={2} />
                  <Line type="monotone" dataKey="variance_pct" stroke="#d32f2f" name="Variance (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={800}>Detailed Orders</Typography>
                <Typography variant="caption" color="text.secondary">
                  {startDate} → {endDate}
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <DataGrid
                autoHeight
                rows={report.rows.map((r) => ({ id: r.order_id, ...r }))}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                  sorting: { sortModel: [{ field: "production_date", sort: "desc" }] },
                }}
                disableRowSelectionOnClick
                sx={{
                  width: "100%",
                  "& .MuiDataGrid-columnHeaderTitle": {
                    whiteSpace: "normal",
                    lineHeight: 1.2,
                  },
                }}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Total kilos: <strong>{formatNumber(report.totals.kilos)}</strong>
                </Typography>
                <Typography variant="body2">
                  Total pouches: <strong>{formatNumber(report.totals.pouches)}</strong>
                </Typography>
                <Typography variant="body2">
                  Total revenue: <strong>{formatCurrency(report.totals.revenue)}</strong>
                </Typography>
                <Typography variant="body2">
                  Total gross profit: <strong>{formatCurrency(report.totals.gross_profit)}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      <Snackbar
        open={saveNotice}
        autoHideDuration={2500}
        onClose={() => setSaveNotice(false)}
        message="View saved"
      />
    </Stack>
  );
}
