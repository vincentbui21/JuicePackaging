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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from "@mui/icons-material";
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

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const escapeHtml = (value) => (
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
);

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
  const [costCenters, setCostCenters] = useState([]);
  const [costEntries, setCostEntries] = useState([]);
  const [centerForm, setCenterForm] = useState({ name: "", category: "direct" });
  const [editingCenterId, setEditingCenterId] = useState(null);
  const [entryForm, setEntryForm] = useState({ center_id: "", amount: "", incurred_date: "", notes: "" });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const costTotals = useMemo(() => {
    const totals = { direct: 0, overhead: 0, total: 0 };
    costEntries.forEach((entry) => {
      const amount = Number(entry.amount || 0);
      if (entry.center_category === "overhead") {
        totals.overhead += amount;
      } else {
        totals.direct += amount;
      }
    });
    totals.total = totals.direct + totals.overhead;
    return totals;
  }, [costEntries]);

  const report = useMemo(() => buildAdminReport(rows, costTotals), [rows, costTotals]);

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
        const list = Array.isArray(data)
          ? data
              .map((city) => {
                if (typeof city === "string") return city;
                return city?.name || city?.location || city?.city || "";
              })
              .filter(Boolean)
          : [];
        const unique = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
        setCityOptions(unique);
      } catch (err) {
        console.error("Failed to load cities", err);
      }
    };
    loadCities();
  }, []);

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const loadCostCenters = async () => {
    try {
      const { data } = await api.get("/cost-centers");
      const list = Array.isArray(data) ? data : [];
      setCostCenters(list);
      setEntryForm((prev) => {
        if (prev.center_id || !list.length) return prev;
        return { ...prev, center_id: list[0].center_id };
      });
    } catch (err) {
      console.error("Failed to load cost centers", err);
      showToast("Failed to load cost centers", "error");
    }
  };

  const loadCostEntries = async () => {
    try {
      const params = {};
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;
      const { data } = await api.get("/cost-entries", { params });
      setCostEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load cost entries", err);
      showToast("Failed to load cost entries", "error");
    }
  };

  useEffect(() => {
    loadCostCenters();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    loadCostEntries();
  }, [startDate, endDate]);

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

  useEffect(() => {
    if (!entryForm.incurred_date && endDate) {
      setEntryForm((prev) => ({ ...prev, incurred_date: endDate }));
    }
  }, [endDate, entryForm.incurred_date]);

  const resetCenterForm = () => {
    setCenterForm({ name: "", category: "direct" });
    setEditingCenterId(null);
  };

  const resetEntryForm = () => {
    setEntryForm((prev) => ({
      center_id: prev.center_id || (costCenters[0]?.center_id ?? ""),
      amount: "",
      incurred_date: endDate || "",
      notes: "",
    }));
    setEditingEntryId(null);
  };

  const handleSaveCenter = async () => {
    const trimmedName = centerForm.name.trim();
    if (!trimmedName) {
      showToast("Cost center name is required", "error");
      return;
    }
    try {
      if (editingCenterId) {
        await api.put(`/cost-centers/${editingCenterId}`, {
          name: trimmedName,
          category: centerForm.category,
        });
        showToast("Cost center updated");
      } else {
        await api.post("/cost-centers", {
          name: trimmedName,
          category: centerForm.category,
        });
        showToast("Cost center added");
      }
      resetCenterForm();
      await loadCostCenters();
    } catch (err) {
      console.error("Failed to save cost center", err);
      showToast("Failed to save cost center", "error");
    }
  };

  const handleEditCenter = (center) => {
    setEditingCenterId(center.center_id);
    setCenterForm({ name: center.name || "", category: center.category || "direct" });
  };

  const handleDeleteCenter = async (centerId) => {
    const confirmed = window.confirm("Delete this cost center? All related entries will be removed.");
    if (!confirmed) return;
    try {
      await api.delete(`/cost-centers/${centerId}`);
      showToast("Cost center deleted");
      if (editingCenterId === centerId) resetCenterForm();
      await loadCostCenters();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete cost center", err);
      showToast("Failed to delete cost center", "error");
    }
  };

  const handleSaveEntry = async () => {
    const centerId = Number(entryForm.center_id);
    const amountNum = Number(entryForm.amount);
    const dateStr = String(entryForm.incurred_date || "").trim();
    if (!Number.isFinite(centerId)) {
      showToast("Select a cost center", "error");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }
    if (!dateStr) {
      showToast("Date is required", "error");
      return;
    }
    try {
      if (editingEntryId) {
        await api.put(`/cost-entries/${editingEntryId}`, {
          center_id: centerId,
          amount: Number(amountNum.toFixed(2)),
          incurred_date: dateStr,
          notes: entryForm.notes,
        });
        showToast("Cost entry updated");
      } else {
        await api.post("/cost-entries", {
          center_id: centerId,
          amount: Number(amountNum.toFixed(2)),
          incurred_date: dateStr,
          notes: entryForm.notes,
        });
        showToast("Cost entry added");
      }
      resetEntryForm();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to save cost entry", err);
      showToast("Failed to save cost entry", "error");
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.entry_id);
    setEntryForm({
      center_id: entry.center_id,
      amount: entry.amount ?? "",
      incurred_date: entry.incurred_date || "",
      notes: entry.notes || "",
    });
  };

  const handleDeleteEntry = async (entryId) => {
    const confirmed = window.confirm("Delete this cost entry?");
    if (!confirmed) return;
    try {
      await api.delete(`/cost-entries/${entryId}`);
      showToast("Cost entry deleted");
      if (editingEntryId === entryId) resetEntryForm();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete cost entry", err);
      showToast("Failed to delete cost entry", "error");
    }
  };

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
      "Overhead / Expenses (€)",
      "Gross profit (€)",
      "Gross margin (%)",
      "Net profit (€)",
      "Net margin (%)",
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
      "",
      r.gross_profit,
      r.gross_margin_pct,
      "",
      "",
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
      report.totals.overhead_cost,
      report.totals.gross_profit,
      report.totals.gross_margin_pct,
      report.totals.net_profit,
      report.totals.net_margin_pct,
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

  const buildPdfHtml = () => {
    const title = "Apple Juice Production & Financial Report";
    const rangeText = `${startDate || "—"} → ${endDate || "—"}`;
    const cityText = selectedCities.length ? selectedCities.join(", ") : "All cities";
    const rowsHtml = report.rows.length
      ? report.rows.map((r) => (
        `<tr>
          <td>${escapeHtml(r.production_date || "")}</td>
          <td>${escapeHtml(r.city || "")}</td>
          <td>${escapeHtml(r.customer_name || "")}</td>
          <td>${escapeHtml(r.order_id || "")}</td>
          <td class="num">${escapeHtml(formatNumber(r.pouches_produced))}</td>
          <td class="num">${escapeHtml(formatNumber(r.kilos))}</td>
          <td class="num">${escapeHtml(formatCurrency(r.unit_price))}</td>
          <td class="num">${escapeHtml(formatCurrency(r.revenue))}</td>
          <td class="num">${escapeHtml(formatCurrency(r.direct_cost))}</td>
          <td class="num"></td>
          <td class="num">${escapeHtml(formatCurrency(r.gross_profit))}</td>
          <td class="num">${escapeHtml(formatPercent(r.gross_margin_pct))}</td>
        </tr>`
      )).join("")
      : `<tr><td colspan="12" class="empty">No data for the selected range.</td></tr>`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Admin Report ${escapeHtml(startDate || "")} - ${escapeHtml(endDate || "")}</title>
    <style>
      @page { margin: 18mm; }
      body { font-family: "Arial", sans-serif; color: #222; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      h2 { font-size: 14px; margin: 18px 0 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 18px; font-size: 12px; }
      .summary strong { display: block; font-size: 13px; color: #111; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
      th { background: #f4f6f8; text-align: left; }
      td.num, th.num { text-align: right; }
      .totals td { font-weight: bold; background: #fafafa; }
      .empty { text-align: center; padding: 20px 8px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Date range: ${escapeHtml(rangeText)} · Cities: ${escapeHtml(cityText)}</div>

    <h2>Summary</h2>
    <div class="summary">
      <div><span>Total kilos</span><strong>${escapeHtml(formatNumber(report.totals.kilos))} kg</strong></div>
      <div><span>Total pouches</span><strong>${escapeHtml(formatNumber(report.totals.pouches))}</strong></div>
      <div><span>Revenue</span><strong>${escapeHtml(formatCurrency(report.totals.revenue))}</strong></div>
      <div><span>Direct cost</span><strong>${escapeHtml(formatCurrency(report.totals.direct_cost))}</strong></div>
      <div><span>Overhead / expenses</span><strong>${escapeHtml(formatCurrency(report.totals.overhead_cost))}</strong></div>
      <div><span>Total costs</span><strong>${escapeHtml(formatCurrency(report.totals.total_costs))}</strong></div>
      <div><span>Gross profit</span><strong>${escapeHtml(formatCurrency(report.totals.gross_profit))}</strong></div>
      <div><span>Gross margin</span><strong>${escapeHtml(formatPercent(report.totals.gross_margin_pct))}</strong></div>
      <div><span>Net profit</span><strong>${escapeHtml(formatCurrency(report.totals.net_profit))}</strong></div>
      <div><span>Net margin</span><strong>${escapeHtml(formatPercent(report.totals.net_margin_pct))}</strong></div>
      <div><span>Avg order value</span><strong>${escapeHtml(formatCurrency(report.totals.avg_order_value))}</strong></div>
      <div><span>Yield</span><strong>${escapeHtml(formatPercent(report.totals.yield_pct))}</strong></div>
      <div><span>Top city</span><strong>${escapeHtml(report.topCity || "—")}</strong></div>
    </div>

    <h2>Detailed Orders</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>City</th>
          <th>Customer name</th>
          <th>Order ID</th>
          <th class="num">Pouches</th>
          <th class="num">Kilos</th>
          <th class="num">Unit price</th>
          <th class="num">Revenue</th>
          <th class="num">Direct cost</th>
          <th class="num">Overhead</th>
          <th class="num">Gross profit</th>
          <th class="num">Gross margin</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="totals">
          <td>Totals</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="num">${escapeHtml(formatNumber(report.totals.pouches))}</td>
          <td class="num">${escapeHtml(formatNumber(report.totals.kilos))}</td>
          <td></td>
          <td class="num">${escapeHtml(formatCurrency(report.totals.revenue))}</td>
          <td class="num">${escapeHtml(formatCurrency(report.totals.direct_cost))}</td>
          <td class="num">${escapeHtml(formatCurrency(report.totals.overhead_cost))}</td>
          <td class="num">${escapeHtml(formatCurrency(report.totals.gross_profit))}</td>
          <td class="num">${escapeHtml(formatPercent(report.totals.gross_margin_pct))}</td>
        </tr>
      </tbody>
    </table>
    <script>
      window.onload = () => {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`;
  };

  const handleExportPdf = () => {
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) {
      alert("Please allow pop-ups to export the PDF.");
      return;
    }
    popup.document.open();
    popup.document.write(buildPdfHtml());
    popup.document.close();
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
      valueFormatter: ({ value }) => formatPercent(value),
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
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCities(typeof value === "string" ? value.split(",") : value);
                }}
                renderValue={(selected) => (
                  selected.length ? selected.join(", ") : "All cities"
                )}
              >
                {cityOptions.length === 0 && (
                  <MenuItem disabled value="">
                    No cities available
                  </MenuItem>
                )}
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
                title="Net Profit"
                value={formatCurrency(report.totals.net_profit)}
                subtext={`Net margin: ${report.totals.net_margin_pct}%`}
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

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography variant="subtitle1" fontWeight={800}>
                    Cost Centers & Expenses
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" label={`Direct: ${formatCurrency(costTotals.direct)}`} />
                    <Chip size="small" label={`Overhead: ${formatCurrency(costTotals.overhead)}`} />
                    <Chip size="small" variant="outlined" label={`Total costs: ${formatCurrency(costTotals.total)}`} />
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} lg={5}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Cost Centers
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          label="Center name"
                          size="small"
                          value={centerForm.name}
                          onChange={(e) => setCenterForm((prev) => ({ ...prev, name: e.target.value }))}
                          fullWidth
                        />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id="center-category-label">Category</InputLabel>
                          <Select
                            labelId="center-category-label"
                            label="Category"
                            value={centerForm.category}
                            onChange={(e) => setCenterForm((prev) => ({ ...prev, category: e.target.value }))}
                          >
                            <MenuItem value="direct">Direct</MenuItem>
                            <MenuItem value="overhead">Overhead</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleSaveCenter}>
                          {editingCenterId ? "Update center" : "Add center"}
                        </Button>
                        {editingCenterId && (
                          <Button variant="text" onClick={resetCenterForm} startIcon={<CloseIcon />}>
                            Cancel
                          </Button>
                        )}
                      </Stack>
                      <Divider />
                      {costCenters.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No cost centers yet.
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          {costCenters.map((center) => (
                            <Stack
                              key={center.center_id}
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                            >
                              <Stack spacing={0.5}>
                                <Typography variant="body2" fontWeight={600}>
                                  {center.name}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={center.category === "overhead" ? "Overhead / expense" : "Direct cost"}
                                />
                              </Stack>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleEditCenter(center)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDeleteCenter(center.center_id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Costs / Expenses
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Entries are filtered to the selected date range.
                      </Typography>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                          <InputLabel id="entry-center-label">Cost center</InputLabel>
                          <Select
                            labelId="entry-center-label"
                            label="Cost center"
                            value={entryForm.center_id}
                            onChange={(e) => setEntryForm((prev) => ({ ...prev, center_id: e.target.value }))}
                          >
                            {costCenters.map((center) => (
                              <MenuItem key={center.center_id} value={center.center_id}>
                                {center.name} ({center.category})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label="Amount (€)"
                          size="small"
                          type="number"
                          value={entryForm.amount}
                          onChange={(e) => setEntryForm((prev) => ({ ...prev, amount: e.target.value }))}
                          inputProps={{ min: 0, step: "0.01" }}
                        />
                        <TextField
                          label="Date"
                          size="small"
                          type="date"
                          value={entryForm.incurred_date}
                          onChange={(e) => setEntryForm((prev) => ({ ...prev, incurred_date: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label="Notes"
                          size="small"
                          value={entryForm.notes}
                          onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          onClick={handleSaveEntry}
                          disabled={!costCenters.length}
                        >
                          {editingEntryId ? "Update entry" : "Add entry"}
                        </Button>
                        {editingEntryId && (
                          <Button variant="text" onClick={resetEntryForm} startIcon={<CloseIcon />}>
                            Cancel
                          </Button>
                        )}
                      </Stack>
                      <Divider />
                      <Table size="small" sx={{ tableLayout: "fixed" }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 110 }}>Date</TableCell>
                            <TableCell sx={{ width: 170 }}>Center</TableCell>
                            <TableCell sx={{ width: 130 }}>Category</TableCell>
                            <TableCell align="right" sx={{ width: 110 }}>Amount</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell align="right" sx={{ width: 90 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {costEntries.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                <Typography variant="body2" color="text.secondary">
                                  No cost entries for this range.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            costEntries.map((entry) => (
                              <TableRow key={entry.entry_id}>
                                <TableCell>{entry.incurred_date}</TableCell>
                                <TableCell sx={{ overflowWrap: "anywhere" }}>{entry.center_name}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={entry.center_category === "overhead" ? "Overhead" : "Direct"}
                                  />
                                </TableCell>
                                <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                                <TableCell sx={{ overflowWrap: "anywhere" }}>{entry.notes || "—"}</TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditEntry(entry)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteEntry(entry.entry_id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </Stack>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                Production vs Sales Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
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

          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                Performance by City
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
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
                <Typography variant="body2">
                  Total net profit: <strong>{formatCurrency(report.totals.net_profit)}</strong>
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

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
