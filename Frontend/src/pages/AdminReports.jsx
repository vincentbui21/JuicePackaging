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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeModeToggle from "../components/ThemeModeToggle";
import api from "../services/axios";
import { buildAdminReport } from "../utils/adminReport";

const presets = [
  { key: "today", labelKey: "admin_reports.presets.today" },
  { key: "week", labelKey: "admin_reports.presets.week" },
  { key: "month", labelKey: "admin_reports.presets.month" },
  { key: "quarter", labelKey: "admin_reports.presets.quarter" },
  { key: "custom", labelKey: "admin_reports.presets.custom" },
];

const inventoryCategoryOptions = [
  { value: "Raw materials", labelKey: "admin_reports.inventory_categories.raw_materials" },
  { value: "Packaging", labelKey: "admin_reports.inventory_categories.packaging" },
  { value: "Work in progress", labelKey: "admin_reports.inventory_categories.work_in_progress" },
  { value: "Finished goods", labelKey: "admin_reports.inventory_categories.finished_goods" },
  { value: "Supplies", labelKey: "admin_reports.inventory_categories.supplies" },
  { value: "Other", labelKey: "admin_reports.inventory_categories.other" },
];

const assetCategoryOptions = [
  { value: "Cash", labelKey: "admin_reports.asset_categories.cash" },
  { value: "Accounts receivable", labelKey: "admin_reports.asset_categories.accounts_receivable" },
  { value: "Inventory", labelKey: "admin_reports.asset_categories.inventory" },
  { value: "Prepaid expenses", labelKey: "admin_reports.asset_categories.prepaid_expenses" },
  { value: "Equipment", labelKey: "admin_reports.asset_categories.equipment" },
  { value: "Vehicles", labelKey: "admin_reports.asset_categories.vehicles" },
  { value: "Buildings", labelKey: "admin_reports.asset_categories.buildings" },
  { value: "Land", labelKey: "admin_reports.asset_categories.land" },
  { value: "Intangible assets", labelKey: "admin_reports.asset_categories.intangible_assets" },
  { value: "Investments", labelKey: "admin_reports.asset_categories.investments" },
  { value: "Other assets", labelKey: "admin_reports.asset_categories.other_assets" },
];

const liabilityCategoryOptions = [
  { value: "Accounts payable", labelKey: "admin_reports.liability_categories.accounts_payable" },
  { value: "Accrued expenses", labelKey: "admin_reports.liability_categories.accrued_expenses" },
  { value: "Short-term loans", labelKey: "admin_reports.liability_categories.short_term_loans" },
  { value: "Long-term debt", labelKey: "admin_reports.liability_categories.long_term_debt" },
  { value: "Taxes payable", labelKey: "admin_reports.liability_categories.taxes_payable" },
  { value: "Deferred revenue", labelKey: "admin_reports.liability_categories.deferred_revenue" },
  { value: "Other liabilities", labelKey: "admin_reports.liability_categories.other_liabilities" },
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

const TabPanel = ({ value, tab, children }) => (
  <Box role="tabpanel" hidden={value !== tab} sx={{ pt: 2 }}>
    {value === tab ? children : null}
  </Box>
);

export default function AdminReports() {
  const theme = useTheme();
  const { t } = useTranslation();
  const chartColors = useMemo(() => ({
    kilos: theme.palette.primary.main,
    pouches: theme.palette.warning.main,
    revenue: theme.palette.info.main,
    expected: theme.palette.text.secondary,
    variance: theme.palette.error.main,
  }), [theme]);
  const legendFormatter = (value) => (
    <span style={{ color: theme.palette.text.primary }}>{value}</span>
  );
  const inventoryCategoryMap = useMemo(() => (
    new Map(inventoryCategoryOptions.map((option) => [option.value, option.labelKey]))
  ), []);
  const assetCategoryMap = useMemo(() => (
    new Map(assetCategoryOptions.map((option) => [option.value, option.labelKey]))
  ), []);
  const liabilityCategoryMap = useMemo(() => (
    new Map(liabilityCategoryOptions.map((option) => [option.value, option.labelKey]))
  ), []);
  const resolveCategoryLabel = (categoryMap, value) => {
    if (!value) return "—";
    const labelKey = categoryMap.get(value);
    return labelKey ? t(labelKey) : value;
  };
  const resolveTxTypeLabel = (value) => {
    if (!value) return "—";
    return t(`admin_reports.inventory.tx_type.${value}`, { defaultValue: value });
  };
  const resolveUnitLabel = (value) => {
    if (!value) return "—";
    return value === "unit" ? t("admin_reports.inventory.units.unit") : value;
  };
  const [preset, setPreset] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");

  // Custom Tooltip component using theme from parent
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: theme.palette.text.primary }}>
              <span style={{ color: entry.color }}>{entry.name}: </span>
              {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };
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
  const [pricing, setPricing] = useState({ price: 8, shipping_fee: 0 });
  const [centerForm, setCenterForm] = useState({ name: "", category: "direct" });
  const [editingCenterId, setEditingCenterId] = useState(null);
  const [entryForm, setEntryForm] = useState({ center_id: "", amount: "", incurred_date: "", notes: "" });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [inventorySummary, setInventorySummary] = useState([]);
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    unit: "unit",
    category: inventoryCategoryOptions[0].value,
    cost_center_id: "",
  });
  const [editingItemId, setEditingItemId] = useState(null);
  const [txForm, setTxForm] = useState({ item_id: "", tx_type: "purchase", quantity: "", unit_cost: "", tx_date: "", notes: "" });
  const [editingTxId, setEditingTxId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: assetCategoryOptions[0].value,
    value: "",
    acquired_date: "",
    notes: "",
  });
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    category: liabilityCategoryOptions[0].value,
    value: "",
    as_of_date: "",
    notes: "",
  });
  const [editingLiabilityId, setEditingLiabilityId] = useState(null);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveForm, setArchiveForm] = useState({ seasonName: "", periodStart: "", periodEnd: "" });

  // Historical data & snapshots
  const [reportMode, setReportMode] = useState("current"); // "current" or "historical"
  const [historicalPeriods, setHistoricalPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [historicalData, setHistoricalData] = useState(null);
  const [comparePeriod1, setComparePeriod1] = useState("");
  const [comparePeriod2, setComparePeriod2] = useState("");
  const [comparisonResult, setComparisonResult] = useState(null);

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

  const costCenterMap = useMemo(() => {
    const map = new Map();
    costCenters.forEach((center) => {
      map.set(center.center_id, center);
    });
    return map;
  }, [costCenters]);

  const report = useMemo(() => buildAdminReport(rows, costTotals, pricing), [rows, costTotals, pricing]);

  const inventoryTotals = useMemo(() => {
    const totals = { onHandCount: 0, inventoryValue: 0 };
    inventorySummary.forEach((item) => {
      totals.onHandCount += Number(item.on_hand || 0);
      totals.inventoryValue += Number(item.inventory_value || 0);
    });
    totals.onHandCount = Number(totals.onHandCount.toFixed(2));
    totals.inventoryValue = Number(totals.inventoryValue.toFixed(2));
    return totals;
  }, [inventorySummary]);

  const incomeStatement = useMemo(() => ({
    revenue: report.totals.revenue,
    directCosts: report.totals.direct_cost,
    grossProfit: report.totals.gross_profit,
    overheadCosts: report.totals.overhead_cost,
    netProfit: report.totals.net_profit,
  }), [report]);

  const balanceSheet = useMemo(() => {
    const fixedAssetsTotal = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0);
    const liabilitiesTotal = liabilities.reduce((sum, liability) => sum + Number(liability.value || 0), 0);
    const totalAssets = Number((inventoryTotals.inventoryValue + fixedAssetsTotal).toFixed(2));
    const totalLiabilities = Number(liabilitiesTotal.toFixed(2));
    const equity = Number((totalAssets - totalLiabilities).toFixed(2));
    return {
      inventoryValue: inventoryTotals.inventoryValue,
      fixedAssets: Number(fixedAssetsTotal.toFixed(2)),
      totalAssets,
      totalLiabilities,
      equity,
    };
  }, [assets, liabilities, inventoryTotals.inventoryValue]);

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

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const { data } = await api.get("/default-setting");
        const price = Number(data?.price || 0);
        const shippingFee = Number(data?.shipping_fee || 0);
        setPricing({
          price: Number.isFinite(price) && price > 0 ? price : 8,
          shipping_fee: Number.isFinite(shippingFee) ? shippingFee : 0,
        });
      } catch (err) {
        console.error("Failed to load pricing defaults", err);
      }
    };
    loadPricing();
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
      showToast(t("admin_reports.errors.load_cost_centers"), "error");
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
      showToast(t("admin_reports.errors.load_cost_entries"), "error");
    }
  };

  const loadInventoryItems = async () => {
    try {
      const { data } = await api.get("/inventory-items");
      const list = Array.isArray(data) ? data : [];
      setInventoryItems(list);
      setItemForm((prev) => {
        if (prev.cost_center_id || !costCenters.length) return prev;
        const firstDirect = costCenters.find((center) => center.category === "direct");
        return { ...prev, cost_center_id: firstDirect?.center_id || "" };
      });
      setTxForm((prev) => {
        if (prev.item_id || !list.length) return prev;
        return { ...prev, item_id: list[0].item_id };
      });
    } catch (err) {
      console.error("Failed to load inventory items", err);
      showToast(t("admin_reports.errors.load_inventory_items"), "error");
    }
  };

  const loadInventoryTransactions = async () => {
    try {
      const params = {};
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;
      const { data } = await api.get("/inventory-transactions", { params });
      setInventoryTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory transactions", err);
      showToast(t("admin_reports.errors.load_inventory_transactions"), "error");
    }
  };

  const loadInventorySummary = async () => {
    try {
      const params = {};
      if (endDate) params.as_of = endDate;
      const { data } = await api.get("/inventory-summary", { params });
      setInventorySummary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory summary", err);
      showToast(t("admin_reports.errors.load_inventory_summary"), "error");
    }
  };

  const loadAssets = async () => {
    try {
      const params = {};
      if (endDate) params.as_of = endDate;
      const { data } = await api.get("/assets", { params });
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load assets", err);
      showToast(t("admin_reports.errors.load_assets"), "error");
    }
  };

  const loadLiabilities = async () => {
    try {
      const params = {};
      if (endDate) params.as_of = endDate;
      const { data } = await api.get("/liabilities", { params });
      setLiabilities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load liabilities", err);
      showToast(t("admin_reports.errors.load_liabilities"), "error");
    }
  };

  const loadHistoricalPeriods = async () => {
    try {
      const { data } = await api.get("/historical-periods");
      setHistoricalPeriods(Array.isArray(data?.periods) ? data.periods : []);
    } catch (err) {
      console.error("Failed to load historical periods", err);
      // Not critical - only show error if explicitly trying to access historical data
    }
  };

  const loadHistoricalReport = async (seasonName) => {
    try {
      const { data } = await api.get(`/historical-report/${encodeURIComponent(seasonName)}`);
      if (data.success) {
        setHistoricalData(data);
      } else {
        showToast(t("admin_reports.errors.load_historical_data", { season: seasonName }), "error");
      }
    } catch (err) {
      console.error("Failed to load historical report", err);
      showToast(t("admin_reports.errors.load_historical_report"), "error");
    }
  };

  const compareSeasonReports = async (s1, s2) => {
    try {
      const { data } = await api.get(`/report-comparison/${encodeURIComponent(s1)}/${encodeURIComponent(s2)}`);
      if (data.success) {
        setComparisonResult(data.comparison);
      } else {
        showToast(t("admin_reports.errors.compare_seasons"), "error");
      }
    } catch (err) {
      console.error("Failed to compare seasons", err);
      showToast(t("admin_reports.errors.compare_seasons"), "error");
    }
  };

  useEffect(() => {
    loadCostCenters();
    loadHistoricalPeriods();
  }, []);

  useEffect(() => {
    loadInventoryItems();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    loadCostEntries();
    loadInventoryTransactions();
    loadInventorySummary();
    loadAssets();
    loadLiabilities();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!costCenters.length) return;
    setItemForm((prev) => {
      if (prev.cost_center_id) return prev;
      const firstDirect = costCenters.find((center) => center.category === "direct");
      return { ...prev, cost_center_id: firstDirect?.center_id || "" };
    });
  }, [costCenters]);

  useEffect(() => {
    if (!inventoryItems.length) return;
    setTxForm((prev) => {
      if (prev.item_id) return prev;
      return { ...prev, item_id: inventoryItems[0].item_id };
    });
  }, [inventoryItems]);

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
        setError(t("admin_reports.errors.load_reports"));
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

  useEffect(() => {
    if (!txForm.tx_date && endDate) {
      setTxForm((prev) => ({ ...prev, tx_date: endDate }));
    }
  }, [endDate, txForm.tx_date]);

  useEffect(() => {
    if (!assetForm.acquired_date && endDate) {
      setAssetForm((prev) => ({ ...prev, acquired_date: endDate }));
    }
  }, [endDate, assetForm.acquired_date]);

  useEffect(() => {
    if (!liabilityForm.as_of_date && endDate) {
      setLiabilityForm((prev) => ({ ...prev, as_of_date: endDate }));
    }
  }, [endDate, liabilityForm.as_of_date]);

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

  const resetItemForm = () => {
    const firstDirect = costCenters.find((center) => center.category === "direct");
    setItemForm({
      name: "",
      sku: "",
      unit: "unit",
      category: inventoryCategoryOptions[0].value,
      cost_center_id: firstDirect?.center_id || "",
    });
    setEditingItemId(null);
  };

  const resetTxForm = () => {
    setTxForm({
      item_id: inventoryItems[0]?.item_id || "",
      tx_type: "purchase",
      quantity: "",
      unit_cost: "",
      tx_date: endDate || "",
      notes: "",
    });
    setEditingTxId(null);
  };

  const resetAssetForm = () => {
    setAssetForm({
      name: "",
      category: assetCategoryOptions[0].value,
      value: "",
      acquired_date: endDate || "",
      notes: "",
    });
    setEditingAssetId(null);
  };

  const resetLiabilityForm = () => {
    setLiabilityForm({
      name: "",
      category: liabilityCategoryOptions[0].value,
      value: "",
      as_of_date: endDate || "",
      notes: "",
    });
    setEditingLiabilityId(null);
  };

  const openCenterDialog = () => {
    resetCenterForm();
    setCenterDialogOpen(true);
  };

  const closeCenterDialog = () => {
    setCenterDialogOpen(false);
    resetCenterForm();
  };

  const openEntryDialog = () => {
    resetEntryForm();
    setEntryDialogOpen(true);
  };

  const closeEntryDialog = () => {
    setEntryDialogOpen(false);
    resetEntryForm();
  };

  const openItemDialog = () => {
    resetItemForm();
    setItemDialogOpen(true);
  };

  const closeItemDialog = () => {
    setItemDialogOpen(false);
    resetItemForm();
  };

  const openTxDialog = () => {
    resetTxForm();
    setTxDialogOpen(true);
  };

  const closeTxDialog = () => {
    setTxDialogOpen(false);
    resetTxForm();
  };

  const openAssetDialog = () => {
    resetAssetForm();
    setAssetDialogOpen(true);
  };

  const closeAssetDialog = () => {
    setAssetDialogOpen(false);
    resetAssetForm();
  };

  const openLiabilityDialog = () => {
    resetLiabilityForm();
    setLiabilityDialogOpen(true);
  };

  const closeLiabilityDialog = () => {
    setLiabilityDialogOpen(false);
    resetLiabilityForm();
  };

  const openArchiveDialog = () => {
    setArchiveForm({
      seasonName: "",
      periodStart: startDate || "",
      periodEnd: endDate || "",
    });
    setArchiveDialogOpen(true);
  };

  const closeArchiveDialog = () => {
    setArchiveDialogOpen(false);
    setArchiveForm({ seasonName: "", periodStart: "", periodEnd: "" });
  };

  const handleSaveCenter = async () => {
    const trimmedName = centerForm.name.trim();
    if (!trimmedName) {
      showToast(t("admin_reports.errors.center_name_required"), "error");
      return;
    }
    try {
      if (editingCenterId) {
        await api.put(`/cost-centers/${editingCenterId}`, {
          name: trimmedName,
          category: centerForm.category,
        });
        showToast(t("admin_reports.messages.center_updated"));
      } else {
        await api.post("/cost-centers", {
          name: trimmedName,
          category: centerForm.category,
        });
        showToast(t("admin_reports.messages.center_added"));
      }
      resetCenterForm();
      setCenterDialogOpen(false);
      await loadCostCenters();
    } catch (err) {
      console.error("Failed to save cost center", err);
      showToast(t("admin_reports.errors.save_center"), "error");
    }
  };

  const handleEditCenter = (center) => {
    setEditingCenterId(center.center_id);
    setCenterForm({ name: center.name || "", category: center.category || "direct" });
    setCenterDialogOpen(true);
  };

  const handleDeleteCenter = async (centerId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_center"));
    if (!confirmed) return;
    try {
      await api.delete(`/cost-centers/${centerId}`);
      showToast(t("admin_reports.messages.center_deleted"));
      if (editingCenterId === centerId) resetCenterForm();
      await loadCostCenters();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete cost center", err);
      showToast(t("admin_reports.errors.delete_center"), "error");
    }
  };

  const handleSaveEntry = async () => {
    const centerId = Number(entryForm.center_id);
    const amountNum = Number(entryForm.amount);
    const dateStr = String(entryForm.incurred_date || "").trim();
    if (!Number.isFinite(centerId)) {
      showToast(t("admin_reports.errors.select_cost_center"), "error");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      showToast(t("admin_reports.errors.amount_positive"), "error");
      return;
    }
    if (!dateStr) {
      showToast(t("admin_reports.errors.date_required"), "error");
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
        showToast(t("admin_reports.messages.entry_updated"));
      } else {
        await api.post("/cost-entries", {
          center_id: centerId,
          amount: Number(amountNum.toFixed(2)),
          incurred_date: dateStr,
          notes: entryForm.notes,
        });
        showToast(t("admin_reports.messages.entry_added"));
      }
      resetEntryForm();
      setEntryDialogOpen(false);
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to save cost entry", err);
      showToast(t("admin_reports.errors.save_entry"), "error");
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
    setEntryDialogOpen(true);
  };

  const handleDeleteEntry = async (entryId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_entry"));
    if (!confirmed) return;
    try {
      await api.delete(`/cost-entries/${entryId}`);
      showToast(t("admin_reports.messages.entry_deleted"));
      if (editingEntryId === entryId) resetEntryForm();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete cost entry", err);
      showToast(t("admin_reports.errors.delete_entry"), "error");
    }
  };

  const handleSaveItem = async () => {
    const trimmedName = itemForm.name.trim();
    if (!trimmedName) {
      showToast(t("admin_reports.errors.item_name_required"), "error");
      return;
    }
    const payload = {
      name: trimmedName,
      sku: itemForm.sku || null,
      unit: itemForm.unit || "unit",
      category: itemForm.category || null,
      cost_center_id: itemForm.cost_center_id || null,
    };
    try {
      if (editingItemId) {
        await api.put(`/inventory-items/${editingItemId}`, payload);
        showToast(t("admin_reports.messages.item_updated"));
      } else {
        await api.post("/inventory-items", payload);
        showToast(t("admin_reports.messages.item_added"));
      }
      resetItemForm();
      setItemDialogOpen(false);
      await loadInventoryItems();
      await loadInventorySummary();
    } catch (err) {
      console.error("Failed to save inventory item", err);
      showToast(t("admin_reports.errors.save_item"), "error");
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.item_id);
    setItemForm({
      name: item.name || "",
      sku: item.sku || "",
      unit: item.unit || "unit",
      category: item.category || inventoryCategoryOptions[0].value,
      cost_center_id: item.cost_center_id || "",
    });
    setItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_item"));
    if (!confirmed) return;
    try {
      await api.delete(`/inventory-items/${itemId}`);
      showToast(t("admin_reports.messages.item_deleted"));
      if (editingItemId === itemId) resetItemForm();
      await loadInventoryItems();
      await loadInventorySummary();
    } catch (err) {
      console.error("Failed to delete inventory item", err);
      showToast(err?.response?.data?.error || t("admin_reports.errors.delete_item"), "error");
    }
  };

  const handleSaveTx = async () => {
    const itemId = Number(txForm.item_id);
    const qty = Number(txForm.quantity);
    const dateStr = String(txForm.tx_date || "").trim();
    if (!Number.isFinite(itemId)) {
      showToast(t("admin_reports.errors.select_inventory_item"), "error");
      return;
    }
    if (!txForm.tx_type) {
      showToast(t("admin_reports.errors.select_tx_type"), "error");
      return;
    }
    if (!Number.isFinite(qty) || qty === 0) {
      showToast(t("admin_reports.errors.quantity_nonzero"), "error");
      return;
    }
    if (txForm.tx_type !== "adjustment" && qty < 0) {
      showToast(t("admin_reports.errors.quantity_positive"), "error");
      return;
    }
    if (!dateStr) {
      showToast(t("admin_reports.errors.tx_date_required"), "error");
      return;
    }
    const payload = {
      item_id: itemId,
      tx_type: txForm.tx_type,
      quantity: qty,
      unit_cost: txForm.unit_cost === "" ? null : Number(txForm.unit_cost),
      tx_date: dateStr,
      notes: txForm.notes,
    };
    try {
      if (editingTxId) {
        await api.put(`/inventory-transactions/${editingTxId}`, payload);
        showToast(t("admin_reports.messages.tx_updated"));
      } else {
        await api.post("/inventory-transactions", payload);
        showToast(t("admin_reports.messages.tx_added"));
      }
      resetTxForm();
      setTxDialogOpen(false);
      await loadInventoryTransactions();
      await loadInventorySummary();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to save inventory transaction", err);
      showToast(t("admin_reports.errors.save_tx"), "error");
    }
  };

  const handleEditTx = (tx) => {
    setEditingTxId(tx.tx_id);
    setTxForm({
      item_id: tx.item_id,
      tx_type: tx.tx_type,
      quantity: tx.quantity ?? "",
      unit_cost: tx.unit_cost ?? "",
      tx_date: tx.tx_date || "",
      notes: tx.notes || "",
    });
    setTxDialogOpen(true);
  };

  const handleDeleteTx = async (txId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_tx"));
    if (!confirmed) return;
    try {
      await api.delete(`/inventory-transactions/${txId}`);
      showToast(t("admin_reports.messages.tx_deleted"));
      if (editingTxId === txId) resetTxForm();
      await loadInventoryTransactions();
      await loadInventorySummary();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete inventory transaction", err);
      showToast(t("admin_reports.errors.delete_tx"), "error");
    }
  };

  const handleSaveAsset = async () => {
    const trimmedName = assetForm.name.trim();
    const valueNum = Number(assetForm.value);
    const dateStr = String(assetForm.acquired_date || "").trim();
    if (!trimmedName) {
      showToast(t("admin_reports.errors.asset_name_required"), "error");
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      showToast(t("admin_reports.errors.asset_value_positive"), "error");
      return;
    }
    if (!dateStr) {
      showToast(t("admin_reports.errors.asset_date_required"), "error");
      return;
    }
    const payload = {
      name: trimmedName,
      category: assetForm.category || null,
      value: Number(valueNum.toFixed(2)),
      acquired_date: dateStr,
      notes: assetForm.notes,
    };
    try {
      if (editingAssetId) {
        await api.put(`/assets/${editingAssetId}`, payload);
        showToast(t("admin_reports.messages.asset_updated"));
      } else {
        await api.post("/assets", payload);
        showToast(t("admin_reports.messages.asset_added"));
      }
      resetAssetForm();
      setAssetDialogOpen(false);
      await loadAssets();
    } catch (err) {
      console.error("Failed to save asset", err);
      showToast(t("admin_reports.errors.save_asset"), "error");
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAssetId(asset.asset_id);
    setAssetForm({
      name: asset.name || "",
      category: asset.category || assetCategoryOptions[0].value,
      value: asset.value ?? "",
      acquired_date: asset.acquired_date || "",
      notes: asset.notes || "",
    });
    setAssetDialogOpen(true);
  };

  const handleDeleteAsset = async (assetId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_asset"));
    if (!confirmed) return;
    try {
      await api.delete(`/assets/${assetId}`);
      showToast(t("admin_reports.messages.asset_deleted"));
      if (editingAssetId === assetId) resetAssetForm();
      await loadAssets();
    } catch (err) {
      console.error("Failed to delete asset", err);
      showToast(t("admin_reports.errors.delete_asset"), "error");
    }
  };

  const handleSaveLiability = async () => {
    const trimmedName = liabilityForm.name.trim();
    const valueNum = Number(liabilityForm.value);
    const dateStr = String(liabilityForm.as_of_date || "").trim();
    if (!trimmedName) {
      showToast(t("admin_reports.errors.liability_name_required"), "error");
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      showToast(t("admin_reports.errors.liability_value_positive"), "error");
      return;
    }
    if (!dateStr) {
      showToast(t("admin_reports.errors.liability_date_required"), "error");
      return;
    }
    const payload = {
      name: trimmedName,
      category: liabilityForm.category || null,
      value: Number(valueNum.toFixed(2)),
      as_of_date: dateStr,
      notes: liabilityForm.notes,
    };
    try {
      if (editingLiabilityId) {
        await api.put(`/liabilities/${editingLiabilityId}`, payload);
        showToast(t("admin_reports.messages.liability_updated"));
      } else {
        await api.post("/liabilities", payload);
        showToast(t("admin_reports.messages.liability_added"));
      }
      resetLiabilityForm();
      setLiabilityDialogOpen(false);
      await loadLiabilities();
    } catch (err) {
      console.error("Failed to save liability", err);
      showToast(t("admin_reports.errors.save_liability"), "error");
    }
  };

  const handleEditLiability = (liability) => {
    setEditingLiabilityId(liability.liability_id);
    setLiabilityForm({
      name: liability.name || "",
      category: liability.category || liabilityCategoryOptions[0].value,
      value: liability.value ?? "",
      as_of_date: liability.as_of_date || "",
      notes: liability.notes || "",
    });
    setLiabilityDialogOpen(true);
  };

  const handleDeleteLiability = async (liabilityId) => {
    const confirmed = window.confirm(t("admin_reports.confirm.delete_liability"));
    if (!confirmed) return;
    try {
      await api.delete(`/liabilities/${liabilityId}`);
      showToast(t("admin_reports.messages.liability_deleted"));
      if (editingLiabilityId === liabilityId) resetLiabilityForm();
      await loadLiabilities();
    } catch (err) {
      console.error("Failed to delete liability", err);
      showToast(t("admin_reports.errors.delete_liability"), "error");
    }
  };

  const handleArchiveSeason = async () => {
    const seasonName = archiveForm.seasonName.trim();
    const periodStart = String(archiveForm.periodStart || "").trim();
    const periodEnd = String(archiveForm.periodEnd || "").trim();
    if (!seasonName) {
      showToast(t("admin_reports.errors.season_name_required"), "error");
      return;
    }
    if (!periodStart || !periodEnd) {
      showToast(t("admin_reports.errors.season_dates_required"), "error");
      return;
    }
    try {
      const { data } = await api.post("/archive-season", { seasonName, periodStart, periodEnd });
      if (data?.success) {
        showToast(data.message || t("admin_reports.messages.season_archived"));
        closeArchiveDialog();
        await loadHistoricalPeriods();
      } else {
        showToast(data?.error || t("admin_reports.errors.archive_season"), "error");
      }
    } catch (err) {
      console.error("Failed to archive season", err);
      showToast(err?.response?.data?.error || t("admin_reports.errors.archive_season"), "error");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      t("admin_reports.csv.headers.date"),
      t("admin_reports.csv.headers.city"),
      t("admin_reports.csv.headers.customer_name"),
      t("admin_reports.csv.headers.order_id"),
      t("admin_reports.csv.headers.pouches_produced"),
      t("admin_reports.csv.headers.kilos"),
      t("admin_reports.csv.headers.unit_price"),
      t("admin_reports.csv.headers.revenue"),
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
    ]));

    lines.push([
      t("admin_reports.csv.totals"),
      "",
      "",
      "",
      report.totals.pouches,
      report.totals.kilos,
      "",
      report.totals.revenue,
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
    const title = t("admin_reports.title");
    const rangeText = `${startDate || "—"} → ${endDate || "—"}`;
    const cityText = selectedCities.length ? selectedCities.join(", ") : t("admin_reports.filters.all_cities");
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
        </tr>`
      )).join("")
      : `<tr><td colspan="8" class="empty">${escapeHtml(t("admin_reports.pdf.no_data"))}</td></tr>`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(t("admin_reports.pdf.report_title"))} ${escapeHtml(startDate || "")} - ${escapeHtml(endDate || "")}</title>
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
    <div class="meta">${escapeHtml(t("admin_reports.pdf.date_range"))}: ${escapeHtml(rangeText)} · ${escapeHtml(t("admin_reports.pdf.cities"))}: ${escapeHtml(cityText)}</div>

    <h2>${escapeHtml(t("admin_reports.pdf.summary_title"))}</h2>
    <div class="summary">
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.total_kilos"))}</span><strong>${escapeHtml(formatNumber(report.totals.kilos))} kg</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.total_pouches"))}</span><strong>${escapeHtml(formatNumber(report.totals.pouches))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.revenue"))}</span><strong>${escapeHtml(formatCurrency(report.totals.revenue))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.direct_cost"))}</span><strong>${escapeHtml(formatCurrency(report.totals.direct_cost))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.overhead_cost"))}</span><strong>${escapeHtml(formatCurrency(report.totals.overhead_cost))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.total_costs"))}</span><strong>${escapeHtml(formatCurrency(report.totals.total_costs))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.gross_profit"))}</span><strong>${escapeHtml(formatCurrency(report.totals.gross_profit))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.gross_margin"))}</span><strong>${escapeHtml(formatPercent(report.totals.gross_margin_pct))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.net_profit"))}</span><strong>${escapeHtml(formatCurrency(report.totals.net_profit))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.net_margin"))}</span><strong>${escapeHtml(formatPercent(report.totals.net_margin_pct))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.avg_order_value"))}</span><strong>${escapeHtml(formatCurrency(report.totals.avg_order_value))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.yield"))}</span><strong>${escapeHtml(formatPercent(report.totals.yield_pct))}</strong></div>
      <div><span>${escapeHtml(t("admin_reports.pdf.summary.top_city"))}</span><strong>${escapeHtml(report.topCity || "—")}</strong></div>
    </div>

    <h2>${escapeHtml(t("admin_reports.pdf.detailed_orders"))}</h2>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t("admin_reports.pdf.table.date"))}</th>
          <th>${escapeHtml(t("admin_reports.pdf.table.city"))}</th>
          <th>${escapeHtml(t("admin_reports.pdf.table.customer_name"))}</th>
          <th>${escapeHtml(t("admin_reports.pdf.table.order_id"))}</th>
          <th class="num">${escapeHtml(t("admin_reports.pdf.table.pouches"))}</th>
          <th class="num">${escapeHtml(t("admin_reports.pdf.table.kilos"))}</th>
          <th class="num">${escapeHtml(t("admin_reports.pdf.table.unit_price"))}</th>
          <th class="num">${escapeHtml(t("admin_reports.pdf.table.revenue"))}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="totals">
          <td>${escapeHtml(t("admin_reports.pdf.totals"))}</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="num">${escapeHtml(formatNumber(report.totals.pouches))}</td>
          <td class="num">${escapeHtml(formatNumber(report.totals.kilos))}</td>
          <td></td>
          <td class="num">${escapeHtml(formatCurrency(report.totals.revenue))}</td>
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

  const buildIncomeStatementHtml = () => {
    const title = t("admin_reports.statements.income_statement");
    const rangeText = `${startDate || "—"} → ${endDate || "—"}`;
    const cityText = selectedCities.length ? selectedCities.join(", ") : t("admin_reports.filters.all_cities");
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} ${escapeHtml(startDate || "")} - ${escapeHtml(endDate || "")}</title>
    <style>
      @page { margin: 18mm; }
      body { font-family: "Arial", sans-serif; color: #222; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f4f6f8; text-align: left; }
      td.num { text-align: right; }
      .total { font-weight: bold; background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(t("admin_reports.pdf.date_range"))}: ${escapeHtml(rangeText)} · ${escapeHtml(t("admin_reports.pdf.cities"))}: ${escapeHtml(cityText)}</div>
    <table>
      <tbody>
        <tr><th>${escapeHtml(t("admin_reports.statements.revenue"))}</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.revenue))}</td></tr>
        <tr><th>${escapeHtml(t("admin_reports.statements.direct_costs"))}</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.directCosts))}</td></tr>
        <tr class="total"><th>${escapeHtml(t("admin_reports.statements.gross_profit"))}</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.grossProfit))}</td></tr>
        <tr><th>${escapeHtml(t("admin_reports.statements.overhead_expenses"))}</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.overheadCosts))}</td></tr>
        <tr class="total"><th>${escapeHtml(t("admin_reports.statements.net_profit"))}</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.netProfit))}</td></tr>
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

  const buildBalanceSheetHtml = () => {
    const title = t("admin_reports.statements.balance_sheet");
    const asOfText = endDate || startDate || "—";
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} ${escapeHtml(asOfText)}</title>
    <style>
      @page { margin: 18mm; }
      body { font-family: "Arial", sans-serif; color: #222; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      h2 { font-size: 14px; margin: 18px 0 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f4f6f8; text-align: left; }
      td.num { text-align: right; }
      .total { font-weight: bold; background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(t("admin_reports.pdf.as_of"))}: ${escapeHtml(asOfText)}</div>

    <h2>${escapeHtml(t("admin_reports.statements.assets_title"))}</h2>
    <table>
      <tbody>
        <tr><th>${escapeHtml(t("admin_reports.statements.inventory_label"))}</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.inventoryValue))}</td></tr>
        ${assets.map((asset) => (
          `<tr><th>${escapeHtml(asset.name || t("admin_reports.pdf.asset_fallback"))}</th><td class="num">${escapeHtml(formatCurrency(asset.value))}</td></tr>`
        )).join("")}
        <tr class="total"><th>${escapeHtml(t("admin_reports.pdf.total_assets"))}</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.totalAssets))}</td></tr>
      </tbody>
    </table>

    <h2>${escapeHtml(t("admin_reports.statements.liabilities_title"))}</h2>
    <table>
      <tbody>
        ${liabilities.length
          ? liabilities.map((liability) => (
            `<tr><th>${escapeHtml(liability.name || t("admin_reports.pdf.liability_fallback"))}</th><td class="num">${escapeHtml(formatCurrency(liability.value))}</td></tr>`
          )).join("")
          : `<tr><th>${escapeHtml(t("admin_reports.pdf.liabilities_label"))}</th><td class="num">${escapeHtml(formatCurrency(0))}</td></tr>`
        }
        <tr class="total"><th>${escapeHtml(t("admin_reports.pdf.total_liabilities"))}</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.totalLiabilities))}</td></tr>
      </tbody>
    </table>

    <h2>${escapeHtml(t("admin_reports.statements.equity_label"))}</h2>
    <table>
      <tbody>
        <tr class="total"><th>${escapeHtml(t("admin_reports.statements.equity_label"))}</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.equity))}</td></tr>
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

  const openPrintWindow = (html) => {
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) {
      alert(t("admin_reports.errors.allow_popups"));
      return false;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return true;
  };

  const handleExportPdf = () => {
    openPrintWindow(buildPdfHtml());
  };

  const handleExportIncomeStatement = () => {
    openPrintWindow(buildIncomeStatementHtml());
  };

  const handleExportBalanceSheet = () => {
    openPrintWindow(buildBalanceSheetHtml());
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

  return (
    <Stack spacing={2} className="page-transition">
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "flex-start", lg: "center" }}
        justifyContent="space-between"
        spacing={2}
        className="animate-slide-in-down"
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>{t("admin_reports.title")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("admin_reports.subtitle")}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <ThemeModeToggle />
          <Button variant="outlined" startIcon={<Download size={16} />} onClick={handleExportCsv}>
            {t("admin_reports.actions.export_csv")}
          </Button>
          <Button variant="outlined" startIcon={<FileText size={16} />} onClick={handleExportPdf}>
            {t("admin_reports.actions.export_pdf")}
          </Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveView}>
            {t("admin_reports.actions.save_view")}
          </Button>
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }} className="animate-slide-in-up">
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("admin_reports.filters.date_range")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {presets.map((p) => (
                  <Chip
                    key={p.key}
                    label={t(p.labelKey)}
                    clickable
                    color={preset === p.key ? "primary" : "default"}
                    variant={preset === p.key ? "filled" : "outlined"}
                    onClick={() => setPreset(p.key)}
                    className="animate-scale-in"
                  />
                ))}
              </Stack>
            </Box>

            {preset === "custom" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label={t("admin_reports.filters.start_date")}
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label={t("admin_reports.filters.end_date")}
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            )}

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="city-select-label">{t("admin_reports.filters.city")}</InputLabel>
              <Select
                labelId="city-select-label"
                label={t("admin_reports.filters.city")}
                multiple
                value={selectedCities}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCities(typeof value === "string" ? value.split(",") : value);
                }}
                renderValue={(selected) => (
                  selected.length ? selected.join(", ") : t("admin_reports.filters.all_cities")
                )}
              >
                {cityOptions.length === 0 && (
                  <MenuItem disabled value="">
                    {t("admin_reports.filters.no_cities")}
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

      {/* Historical Data Mode Selector */}
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.default" }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={600}>{t("admin_reports.historical.title")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.historical.subtitle")}
            </Typography>
            
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="flex-start"
              sx={{ flexWrap: "wrap" }}
            >
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t("admin_reports.historical.report_mode")}</InputLabel>
                <Select
                  value={reportMode}
                  label={t("admin_reports.historical.report_mode")}
                  onChange={(e) => {
                    setReportMode(e.target.value);
                    if (e.target.value === "historical") {
                      setSelectedPeriod("");
                    }
                  }}
                >
                  <MenuItem value="current">{t("admin_reports.historical.mode_current")}</MenuItem>
                  <MenuItem value="historical">{t("admin_reports.historical.mode_historical")}</MenuItem>
                  <MenuItem value="compare">{t("admin_reports.historical.mode_compare")}</MenuItem>
                </Select>
              </FormControl>

              {reportMode === "historical" && historicalPeriods.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>{t("admin_reports.historical.select_season")}</InputLabel>
                  <Select
                    value={selectedPeriod}
                    label={t("admin_reports.historical.select_season")}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      loadHistoricalReport(e.target.value);
                    }}
                  >
                    {historicalPeriods.map((period) => (
                      <MenuItem key={period.snapshot_id} value={period.snapshot_name}>
                        {period.snapshot_name} ({period.period_start} to {period.period_end})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {reportMode === "compare" && historicalPeriods.length > 0 && (
                <>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t("admin_reports.historical.season_1")}</InputLabel>
                    <Select
                      value={comparePeriod1}
                      label={t("admin_reports.historical.season_1")}
                      onChange={(e) => setComparePeriod1(e.target.value)}
                    >
                      {historicalPeriods.map((period) => (
                        <MenuItem key={`1-${period.snapshot_id}`} value={period.snapshot_name}>
                          {period.snapshot_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t("admin_reports.historical.season_2")}</InputLabel>
                    <Select
                      value={comparePeriod2}
                      label={t("admin_reports.historical.season_2")}
                      onChange={(e) => setComparePeriod2(e.target.value)}
                    >
                      {historicalPeriods.map((period) => (
                        <MenuItem key={`2-${period.snapshot_id}`} value={period.snapshot_name}>
                          {period.snapshot_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      if (comparePeriod1 && comparePeriod2) {
                        compareSeasonReports(comparePeriod1, comparePeriod2);
                      } else {
                        showToast(t("admin_reports.messages.select_both_seasons"), "warning");
                      }
                    }}
                  >
                    {t("admin_reports.historical.compare_action")}
                  </Button>
                </>
              )}

              <Button variant="outlined" size="small" onClick={openArchiveDialog}>
                {t("admin_reports.historical.archive_action")}
              </Button>

              {historicalPeriods.length === 0 && reportMode !== "current" && (
                <Typography variant="body2" color="text.secondary">
                  {t("admin_reports.historical.no_data")}
                </Typography>
              )}
            </Stack>

            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t("admin_reports.historical.guide_title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.historical.guide_step_1")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.historical.guide_step_2")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.historical.guide_step_3")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.historical.guide_step_4")}
              </Typography>
            </Stack>

            {selectedPeriod && historicalData && (
              <Alert severity="info">
                {t("admin_reports.historical.viewing_historical", {
                  season: selectedPeriod,
                  orders: historicalData.totals?.orders || 0,
                  revenue: (historicalData.totals?.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                })}
              </Alert>
            )}
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
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label={t("admin_reports.tabs.overview")} value="overview" />
            <Tab label={t("admin_reports.tabs.costs")} value="costs" />
            <Tab label={t("admin_reports.tabs.inventory")} value="inventory" />
            <Tab label={t("admin_reports.tabs.statements")} value="statements" />
          </Tabs>

          <TabPanel value={activeTab} tab="overview">
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.overview.description")}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.total_kilos")}
                    value={`${formatNumber(report.totals.kilos)} kg`}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.pouches_produced")}
                    value={formatNumber(report.totals.pouches)}
                    subtext={t("admin_reports.overview.kpis.avg_weight_per_pouch", {
                      value: report.totals.avg_weight_per_pouch_g,
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.revenue_from_pouches")}
                    value={formatCurrency(report.totals.revenue)}
                    subtext={t("admin_reports.overview.kpis.revenue_collected_outstanding")}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.gross_profit")}
                    value={formatCurrency(report.totals.gross_profit)}
                    subtext={t("admin_reports.overview.kpis.gross_margin", {
                      value: report.totals.gross_margin_pct,
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.net_profit")}
                    value={formatCurrency(report.totals.net_profit)}
                    subtext={t("admin_reports.overview.kpis.net_margin", {
                      value: report.totals.net_margin_pct,
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <KpiCard
                    title={t("admin_reports.overview.kpis.yield")}
                    value={`${report.totals.yield_pct}%`}
                    subtext={t("admin_reports.overview.kpis.expected_pouches", {
                      value: formatNumber(report.totals.expected_pouches),
                    })}
                  />
                </Grid>
              </Grid>

              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                    {t("admin_reports.overview.insights_title")}
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                    <Typography variant="body2">
                      {t("admin_reports.overview.insights.orders_in_range")}{" "}
                      <strong>{formatNumber(report.totals.orders)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      {t("admin_reports.overview.insights.avg_order_value")}{" "}
                      <strong>{formatCurrency(report.totals.avg_order_value)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      {t("admin_reports.overview.insights.top_city")}{" "}
                      <strong>{report.topCity || "—"}</strong>
                    </Typography>
                    <Typography variant="body2">
                      {t("admin_reports.overview.insights.avg_revenue_per_kg")}{" "}
                      <strong>
                        {report.totals.kilos ? formatCurrency(report.totals.revenue / report.totals.kilos) : "€0.00"}
                      </strong>
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    {t("admin_reports.charts.production_vs_sales")}
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={report.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend formatter={legendFormatter} />
                      <Line
                        type="monotone"
                        dataKey="kilos"
                        stroke={chartColors.kilos}
                        name={t("admin_reports.charts.legend.kilos_produced")}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="pouches"
                        stroke={chartColors.pouches}
                        name={t("admin_reports.charts.legend.pouches_sold")}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={chartColors.revenue}
                        name={t("admin_reports.charts.legend.sales_revenue")}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    {t("admin_reports.charts.performance_by_city")}
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={report.citySeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="city" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend formatter={legendFormatter} />
                      <Bar dataKey="kilos" fill={chartColors.kilos} name={t("admin_reports.charts.legend.kilos_produced")} />
                      <Bar dataKey="pouches" fill={chartColors.pouches} name={t("admin_reports.charts.legend.pouches_sold")} />
                      <Bar dataKey="revenue" fill={chartColors.revenue} name={t("admin_reports.charts.legend.sales_revenue")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    {t("admin_reports.charts.yield_variance")}
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={report.varianceSeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="period" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend formatter={legendFormatter} />
                      <Line
                        type="monotone"
                        dataKey="pouches"
                        stroke={chartColors.pouches}
                        name={t("admin_reports.charts.legend.actual_pouches")}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expected_pouches"
                        stroke={chartColors.expected}
                        name={t("admin_reports.charts.legend.expected_pouches")}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="variance_pct"
                        stroke={chartColors.variance}
                        name={t("admin_reports.charts.legend.variance_pct")}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>

          <TabPanel value={activeTab} tab="costs">
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.costs.description")}
              </Typography>
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
                        {t("admin_reports.costs.title")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={t("admin_reports.costs.direct_label", { value: formatCurrency(costTotals.direct) })}
                        />
                        <Chip
                          size="small"
                          label={t("admin_reports.costs.overhead_label", { value: formatCurrency(costTotals.overhead) })}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={t("admin_reports.costs.total_label", { value: formatCurrency(costTotals.total) })}
                        />
                      </Stack>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={5}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {t("admin_reports.costs.centers_title")}
                            </Typography>
                            <Button variant="contained" size="small" onClick={openCenterDialog}>
                              {t("admin_reports.costs.add_center")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.costs.center_help")}
                          </Typography>
                          <Divider />
                          {costCenters.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              {t("admin_reports.costs.no_centers")}
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
                                      label={center.category === "overhead"
                                        ? t("admin_reports.costs.center_overhead_expense")
                                        : t("admin_reports.costs.center_direct_cost")}
                                    />
                                  </Stack>
                                  <Stack direction="row" spacing={0.5}>
                                    <Tooltip title={t("common.edit")}>
                                      <IconButton size="small" onClick={() => handleEditCenter(center)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t("common.delete")}>
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
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {t("admin_reports.costs.entries_title")}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t("admin_reports.costs.entries_help")}
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={openEntryDialog}
                              disabled={!costCenters.length}
                            >
                              {t("admin_reports.costs.add_entry")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.costs.entries_note")}
                          </Typography>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: 110 }}>{t("admin_reports.costs.table.date")}</TableCell>
                                <TableCell sx={{ width: 170 }}>{t("admin_reports.costs.table.center")}</TableCell>
                                <TableCell sx={{ width: 130 }}>{t("admin_reports.costs.table.category")}</TableCell>
                                <TableCell align="right" sx={{ width: 110 }}>{t("admin_reports.costs.table.amount")}</TableCell>
                                <TableCell>{t("admin_reports.costs.table.notes")}</TableCell>
                                <TableCell align="right" sx={{ width: 90 }}>{t("admin_reports.costs.table.actions")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {costEntries.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {t("admin_reports.costs.no_entries")}
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
                                        label={entry.center_category === "overhead"
                                          ? t("admin_reports.costs.entry_overhead")
                                          : t("admin_reports.costs.entry_direct")}
                                      />
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{entry.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title={t("common.edit")}>
                                        <IconButton size="small" onClick={() => handleEditEntry(entry)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t("common.delete")}>
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
            </Stack>
          </TabPanel>

          <TabPanel value={activeTab} tab="inventory">
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.inventory.description")}
              </Typography>
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
                        {t("admin_reports.inventory.title")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={t("admin_reports.inventory.on_hand", { value: formatNumber(inventoryTotals.onHandCount) })}
                        />
                        <Chip
                          size="small"
                          label={t("admin_reports.inventory.inventory_value", {
                            value: formatCurrency(inventoryTotals.inventoryValue),
                          })}
                        />
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.inventory.summary_help")}
                    </Typography>
                    <Table size="small" sx={{ tableLayout: "fixed" }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t("admin_reports.inventory.summary_table.item")}</TableCell>
                          <TableCell align="right">{t("admin_reports.inventory.summary_table.on_hand")}</TableCell>
                          <TableCell>{t("admin_reports.inventory.summary_table.unit")}</TableCell>
                          <TableCell align="right">{t("admin_reports.inventory.summary_table.last_unit_cost")}</TableCell>
                          <TableCell align="right">{t("admin_reports.inventory.summary_table.inventory_value")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inventorySummary.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body2" color="text.secondary">
                                {t("admin_reports.inventory.no_inventory")}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          inventorySummary.map((item) => (
                            <TableRow key={item.item_id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{formatNumber(item.on_hand)}</TableCell>
                              <TableCell>{resolveUnitLabel(item.unit)}</TableCell>
                              <TableCell align="right">
                                {item.last_unit_cost != null ? formatCurrency(item.last_unit_cost) : "—"}
                              </TableCell>
                              <TableCell align="right">{formatCurrency(item.inventory_value)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={5}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {t("admin_reports.inventory.items_title")}
                            </Typography>
                            <Button variant="contained" size="small" onClick={openItemDialog}>
                              {t("admin_reports.inventory.add_item")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.inventory.items_help")}
                          </Typography>
                          <Divider />
                          {inventoryItems.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              {t("admin_reports.inventory.no_items")}
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              {inventoryItems.map((item) => {
                                const center = costCenterMap.get(item.cost_center_id);
                                return (
                                  <Stack
                                    key={item.item_id}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                                  >
                                    <Stack spacing={0.5}>
                                      <Typography variant="body2" fontWeight={600}>
                                        {item.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {t("admin_reports.inventory.item_meta", {
                                          unit: resolveUnitLabel(item.unit || "unit"),
                                          category: resolveCategoryLabel(inventoryCategoryMap, item.category),
                                          center: center?.name || "—",
                                        })}
                                      </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5}>
                                      <Tooltip title={t("common.edit")}>
                                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t("common.delete")}>
                                        <IconButton size="small" onClick={() => handleDeleteItem(item.item_id)}>
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </Stack>
                                );
                              })}
                            </Stack>
                          )}
                        </Stack>
                      </Grid>
                      <Grid item xs={12} lg={7}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {t("admin_reports.inventory.transactions_title")}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t("admin_reports.inventory.transactions_help")}
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={openTxDialog}
                              disabled={!inventoryItems.length}
                            >
                              {t("admin_reports.inventory.add_transaction")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.inventory.transactions_note")}
                          </Typography>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: 100 }}>{t("admin_reports.inventory.transactions_table.date")}</TableCell>
                                <TableCell sx={{ width: 140 }}>{t("admin_reports.inventory.transactions_table.item")}</TableCell>
                                <TableCell sx={{ width: 110 }}>{t("admin_reports.inventory.transactions_table.type")}</TableCell>
                                <TableCell align="right" sx={{ width: 90 }}>{t("admin_reports.inventory.transactions_table.qty")}</TableCell>
                                <TableCell align="right" sx={{ width: 110 }}>{t("admin_reports.inventory.transactions_table.unit_cost")}</TableCell>
                                <TableCell align="right" sx={{ width: 120 }}>{t("admin_reports.inventory.transactions_table.total")}</TableCell>
                                <TableCell>{t("admin_reports.inventory.transactions_table.notes")}</TableCell>
                                <TableCell align="right" sx={{ width: 90 }}>{t("admin_reports.inventory.transactions_table.actions")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {inventoryTransactions.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {t("admin_reports.inventory.no_transactions")}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                inventoryTransactions.map((tx) => (
                                  <TableRow key={tx.tx_id}>
                                    <TableCell>{tx.tx_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{tx.item_name}</TableCell>
                                    <TableCell>{resolveTxTypeLabel(tx.tx_type)}</TableCell>
                                    <TableCell align="right">{formatNumber(tx.quantity)}</TableCell>
                                    <TableCell align="right">
                                      {tx.unit_cost != null ? formatCurrency(tx.unit_cost) : "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                      {tx.total_cost != null ? formatCurrency(tx.total_cost) : "—"}
                                    </TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{tx.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title={t("common.edit")}>
                                        <IconButton size="small" onClick={() => handleEditTx(tx)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t("common.delete")}>
                                        <IconButton size="small" onClick={() => handleDeleteTx(tx.tx_id)}>
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>

                          {/* NEW: Auto-Generated Transactions Section */}
                          <Divider sx={{ my: 3 }} />
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>
                            {t("admin_reports.inventory.auto_title")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                            {t("admin_reports.inventory.auto_help")}
                          </Typography>
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                                <TableCell sx={{ width: 100 }}>{t("admin_reports.inventory.auto_table.date")}</TableCell>
                                <TableCell sx={{ width: 120 }}>{t("admin_reports.inventory.auto_table.item")}</TableCell>
                                <TableCell sx={{ width: 100 }}>{t("admin_reports.inventory.auto_table.type")}</TableCell>
                                <TableCell align="right" sx={{ width: 80 }}>{t("admin_reports.inventory.auto_table.qty")}</TableCell>
                                <TableCell align="right" sx={{ width: 100 }}>{t("admin_reports.inventory.auto_table.unit_cost")}</TableCell>
                                <TableCell align="right" sx={{ width: 100 }}>{t("admin_reports.inventory.auto_table.total")}</TableCell>
                                <TableCell sx={{ width: 120 }}>{t("admin_reports.inventory.auto_table.order_id")}</TableCell>
                                <TableCell>{t("admin_reports.inventory.auto_table.notes")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {!inventoryTransactions || inventoryTransactions.filter(tx => tx.is_auto_generated === 1).length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {t("admin_reports.inventory.auto_no_transactions")}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                inventoryTransactions
                                  .filter(tx => tx.is_auto_generated === 1)
                                  .map((tx) => (
                                    <TableRow key={tx.tx_id} sx={{ backgroundColor: theme.palette.action.selected }}>
                                      <TableCell>{tx.tx_date}</TableCell>
                                      <TableCell sx={{ overflowWrap: "anywhere" }}>{tx.item_name}</TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={resolveTxTypeLabel(tx.tx_type)} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell align="right">{formatNumber(tx.quantity)}</TableCell>
                                      <TableCell align="right">
                                        {tx.unit_cost != null ? formatCurrency(tx.unit_cost) : "—"}
                                      </TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        {tx.total_cost != null ? formatCurrency(tx.total_cost) : "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                                        {tx.related_order_id ? tx.related_order_id.substring(0, 8) + "..." : "—"}
                                      </TableCell>
                                      <TableCell sx={{ overflowWrap: "anywhere", fontSize: "0.85em" }}>{tx.notes || "—"}</TableCell>
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
            </Stack>
          </TabPanel>

          <TabPanel value={activeTab} tab="statements">
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t("admin_reports.statements.description")}
              </Typography>
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={800}>
                        {t("admin_reports.statements.income_statement")}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileText size={16} />}
                        onClick={handleExportIncomeStatement}
                      >
                        {t("admin_reports.statements.export_statement")}
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.statements.statement_help")}
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>{t("admin_reports.statements.revenue")}</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.revenue)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{t("admin_reports.statements.direct_costs")}</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.directCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>{t("admin_reports.statements.gross_profit")}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(incomeStatement.grossProfit)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{t("admin_reports.statements.overhead_expenses")}</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.overheadCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>{t("admin_reports.statements.net_profit")}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(incomeStatement.netProfit)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={800}>
                        {t("admin_reports.statements.balance_sheet")}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileText size={16} />}
                        onClick={handleExportBalanceSheet}
                      >
                        {t("admin_reports.statements.export_statement")}
                      </Button>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={t("admin_reports.statements.total_assets", { value: formatCurrency(balanceSheet.totalAssets) })}
                      />
                      <Chip
                        size="small"
                        label={t("admin_reports.statements.total_liabilities", {
                          value: formatCurrency(balanceSheet.totalLiabilities),
                        })}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t("admin_reports.statements.equity", { value: formatCurrency(balanceSheet.equity) })}
                      />
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {t("admin_reports.statements.assets_title")}
                            </Typography>
                            <Button variant="contained" size="small" onClick={openAssetDialog}>
                              {t("admin_reports.statements.add_asset")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.statements.assets_help")}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={t("admin_reports.statements.inventory_value", {
                                value: formatCurrency(balanceSheet.inventoryValue),
                              })}
                            />
                            <Chip
                              size="small"
                              label={t("admin_reports.statements.fixed_assets", {
                                value: formatCurrency(balanceSheet.fixedAssets),
                              })}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.statements.assets_note")}
                          </Typography>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>{t("admin_reports.statements.asset_table.asset")}</TableCell>
                                <TableCell>{t("admin_reports.statements.asset_table.category")}</TableCell>
                                <TableCell align="right">{t("admin_reports.statements.asset_table.value")}</TableCell>
                                <TableCell>{t("admin_reports.statements.asset_table.date")}</TableCell>
                                <TableCell>{t("admin_reports.statements.asset_table.notes")}</TableCell>
                                <TableCell align="right">{t("admin_reports.statements.asset_table.actions")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {assets.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {t("admin_reports.statements.no_assets")}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                assets.map((asset) => (
                                  <TableRow key={asset.asset_id}>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{asset.name}</TableCell>
                                    <TableCell>{resolveCategoryLabel(assetCategoryMap, asset.category)}</TableCell>
                                    <TableCell align="right">{formatCurrency(asset.value)}</TableCell>
                                    <TableCell>{asset.acquired_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{asset.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title={t("common.edit")}>
                                        <IconButton size="small" onClick={() => handleEditAsset(asset)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t("common.delete")}>
                                        <IconButton size="small" onClick={() => handleDeleteAsset(asset.asset_id)}>
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
                      <Grid item xs={12} lg={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>
                              {t("admin_reports.statements.liabilities_title")}
                            </Typography>
                            <Button variant="contained" size="small" onClick={openLiabilityDialog}>
                              {t("admin_reports.statements.add_liability")}
                            </Button>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t("admin_reports.statements.liabilities_help")}
                          </Typography>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>{t("admin_reports.statements.liability_table.liability")}</TableCell>
                                <TableCell>{t("admin_reports.statements.liability_table.category")}</TableCell>
                                <TableCell align="right">{t("admin_reports.statements.liability_table.value")}</TableCell>
                                <TableCell>{t("admin_reports.statements.liability_table.date")}</TableCell>
                                <TableCell>{t("admin_reports.statements.liability_table.notes")}</TableCell>
                                <TableCell align="right">{t("admin_reports.statements.liability_table.actions")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {liabilities.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {t("admin_reports.statements.no_liabilities")}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                liabilities.map((liability) => (
                                  <TableRow key={liability.liability_id}>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{liability.name}</TableCell>
                                    <TableCell>{resolveCategoryLabel(liabilityCategoryMap, liability.category)}</TableCell>
                                    <TableCell align="right">{formatCurrency(liability.value)}</TableCell>
                                    <TableCell>{liability.as_of_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{liability.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title={t("common.edit")}>
                                        <IconButton size="small" onClick={() => handleEditLiability(liability)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t("common.delete")}>
                                        <IconButton size="small" onClick={() => handleDeleteLiability(liability.liability_id)}>
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
            </Stack>
          </TabPanel>

        </>
      )}

      <Dialog open={centerDialogOpen} onClose={closeCenterDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingCenterId ? t("admin_reports.dialogs.edit_cost_center") : t("admin_reports.dialogs.add_cost_center")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("admin_reports.dialogs.center_name")}
              size="small"
              value={centerForm.name}
              onChange={(e) => setCenterForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="center-category-label">{t("admin_reports.dialogs.category")}</InputLabel>
              <Select
                labelId="center-category-label"
                label={t("admin_reports.dialogs.category")}
                value={centerForm.category}
                onChange={(e) => setCenterForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="direct">{t("admin_reports.dialogs.category_direct")}</MenuItem>
                <MenuItem value="overhead">{t("admin_reports.dialogs.category_overhead")}</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCenterDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveCenter}>
            {editingCenterId ? t("admin_reports.dialogs.update_center") : t("admin_reports.dialogs.add_center")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={entryDialogOpen} onClose={closeEntryDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingEntryId ? t("admin_reports.dialogs.edit_cost_entry") : t("admin_reports.dialogs.add_cost_entry")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="entry-center-label">{t("admin_reports.dialogs.cost_center")}</InputLabel>
              <Select
                labelId="entry-center-label"
                label={t("admin_reports.dialogs.cost_center")}
                value={entryForm.center_id}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, center_id: e.target.value }))}
              >
                {costCenters.map((center) => (
                  <MenuItem key={center.center_id} value={center.center_id}>
                    {center.name} ({center.category === "overhead"
                      ? t("admin_reports.costs.center_overhead")
                      : t("admin_reports.costs.center_direct")})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t("admin_reports.dialogs.amount_eur")}
              size="small"
              type="number"
              value={entryForm.amount}
              onChange={(e) => setEntryForm((prev) => ({ ...prev, amount: e.target.value }))}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label={t("admin_reports.dialogs.date")}
              size="small"
              type="date"
              value={entryForm.incurred_date}
              onChange={(e) => setEntryForm((prev) => ({ ...prev, incurred_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("admin_reports.dialogs.notes")}
              size="small"
              value={entryForm.notes}
              onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEntryDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveEntry} disabled={!costCenters.length}>
            {editingEntryId ? t("admin_reports.dialogs.update_entry") : t("admin_reports.dialogs.add_entry")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemDialogOpen} onClose={closeItemDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingItemId ? t("admin_reports.dialogs.edit_inventory_item") : t("admin_reports.dialogs.add_inventory_item")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("admin_reports.dialogs.item_name")}
              size="small"
              value={itemForm.name}
              onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("admin_reports.dialogs.sku")}
                size="small"
                value={itemForm.sku}
                onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                fullWidth
              />
              <TextField
                label={t("admin_reports.dialogs.unit")}
                size="small"
                value={itemForm.unit}
                onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                sx={{ minWidth: 120 }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel id="item-category-label">{t("admin_reports.dialogs.category")}</InputLabel>
                <Select
                  labelId="item-category-label"
                  label={t("admin_reports.dialogs.category")}
                  value={itemForm.category}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {inventoryCategoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="item-cost-center-label">{t("admin_reports.dialogs.cost_center")}</InputLabel>
                <Select
                  labelId="item-cost-center-label"
                  label={t("admin_reports.dialogs.cost_center")}
                  value={itemForm.cost_center_id}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, cost_center_id: e.target.value }))}
                >
                  <MenuItem value="">{t("admin_reports.dialogs.cost_center_none")}</MenuItem>
                  {costCenters.map((center) => (
                    <MenuItem key={center.center_id} value={center.center_id}>
                      {center.name} ({center.category === "overhead"
                        ? t("admin_reports.costs.center_overhead")
                        : t("admin_reports.costs.center_direct")})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeItemDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveItem}>
            {editingItemId ? t("admin_reports.dialogs.update_item") : t("admin_reports.dialogs.add_item")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={txDialogOpen} onClose={closeTxDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editingTxId ? t("admin_reports.dialogs.edit_inventory_tx") : t("admin_reports.dialogs.add_inventory_tx")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="tx-item-label">{t("admin_reports.dialogs.item")}</InputLabel>
              <Select
                labelId="tx-item-label"
                label={t("admin_reports.dialogs.item")}
                value={txForm.item_id}
                onChange={(e) => setTxForm((prev) => ({ ...prev, item_id: e.target.value }))}
              >
                {inventoryItems.map((item) => (
                  <MenuItem key={item.item_id} value={item.item_id}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="tx-type-label">{t("admin_reports.dialogs.type")}</InputLabel>
                <Select
                  labelId="tx-type-label"
                  label={t("admin_reports.dialogs.type")}
                  value={txForm.tx_type}
                  onChange={(e) => setTxForm((prev) => ({ ...prev, tx_type: e.target.value }))}
                >
                  <MenuItem value="purchase">{t("admin_reports.inventory.tx_type.purchase")}</MenuItem>
                  <MenuItem value="usage">{t("admin_reports.inventory.tx_type.usage")}</MenuItem>
                  <MenuItem value="adjustment">{t("admin_reports.inventory.tx_type.adjustment")}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t("admin_reports.dialogs.quantity")}
                size="small"
                type="number"
                value={txForm.quantity}
                onChange={(e) => setTxForm((prev) => ({ ...prev, quantity: e.target.value }))}
                inputProps={{ step: "0.01" }}
              />
              <TextField
                label={t("admin_reports.dialogs.unit_cost_eur")}
                size="small"
                type="number"
                value={txForm.unit_cost}
                onChange={(e) => setTxForm((prev) => ({ ...prev, unit_cost: e.target.value }))}
                inputProps={{ step: "0.01" }}
              />
            </Stack>
            <TextField
              label={t("admin_reports.dialogs.date")}
              size="small"
              type="date"
              value={txForm.tx_date}
              onChange={(e) => setTxForm((prev) => ({ ...prev, tx_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("admin_reports.dialogs.notes")}
              size="small"
              value={txForm.notes}
              onChange={(e) => setTxForm((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTxDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveTx} disabled={!inventoryItems.length}>
            {editingTxId ? t("admin_reports.dialogs.update_transaction") : t("admin_reports.dialogs.add_transaction")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assetDialogOpen} onClose={closeAssetDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingAssetId ? t("admin_reports.dialogs.edit_asset") : t("admin_reports.dialogs.add_asset")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("admin_reports.dialogs.asset_name")}
              size="small"
              value={assetForm.name}
              onChange={(e) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel id="asset-category-label">{t("admin_reports.dialogs.category")}</InputLabel>
                <Select
                  labelId="asset-category-label"
                  label={t("admin_reports.dialogs.category")}
                  value={assetForm.category}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {assetCategoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={t("admin_reports.dialogs.value_eur")}
                size="small"
                type="number"
                value={assetForm.value}
                onChange={(e) => setAssetForm((prev) => ({ ...prev, value: e.target.value }))}
                inputProps={{ step: "0.01" }}
              />
              <TextField
                label={t("admin_reports.dialogs.acquired_date")}
                size="small"
                type="date"
                value={assetForm.acquired_date}
                onChange={(e) => setAssetForm((prev) => ({ ...prev, acquired_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label={t("admin_reports.dialogs.notes")}
              size="small"
              value={assetForm.notes}
              onChange={(e) => setAssetForm((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAssetDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveAsset}>
            {editingAssetId ? t("admin_reports.dialogs.update_asset") : t("admin_reports.dialogs.add_asset")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={liabilityDialogOpen} onClose={closeLiabilityDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingLiabilityId ? t("admin_reports.dialogs.edit_liability") : t("admin_reports.dialogs.add_liability")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("admin_reports.dialogs.liability_name")}
              size="small"
              value={liabilityForm.name}
              onChange={(e) => setLiabilityForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel id="liability-category-label">{t("admin_reports.dialogs.category")}</InputLabel>
                <Select
                  labelId="liability-category-label"
                  label={t("admin_reports.dialogs.category")}
                  value={liabilityForm.category}
                  onChange={(e) => setLiabilityForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {liabilityCategoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={t("admin_reports.dialogs.value_eur")}
                size="small"
                type="number"
                value={liabilityForm.value}
                onChange={(e) => setLiabilityForm((prev) => ({ ...prev, value: e.target.value }))}
                inputProps={{ step: "0.01" }}
              />
              <TextField
                label={t("admin_reports.dialogs.as_of_date")}
                size="small"
                type="date"
                value={liabilityForm.as_of_date}
                onChange={(e) => setLiabilityForm((prev) => ({ ...prev, as_of_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label={t("admin_reports.dialogs.notes")}
              size="small"
              value={liabilityForm.notes}
              onChange={(e) => setLiabilityForm((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLiabilityDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveLiability}>
            {editingLiabilityId ? t("admin_reports.dialogs.update_liability") : t("admin_reports.dialogs.add_liability")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={archiveDialogOpen} onClose={closeArchiveDialog} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin_reports.dialogs.archive_season")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t("admin_reports.dialogs.archive_help")}
            </Typography>
            <TextField
              label={t("admin_reports.dialogs.season_name")}
              size="small"
              value={archiveForm.seasonName}
              onChange={(e) => setArchiveForm((prev) => ({ ...prev, seasonName: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("admin_reports.dialogs.season_start")}
                size="small"
                type="date"
                value={archiveForm.periodStart}
                onChange={(e) => setArchiveForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={t("admin_reports.dialogs.season_end")}
                size="small"
                type="date"
                value={archiveForm.periodEnd}
                onChange={(e) => setArchiveForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeArchiveDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleArchiveSeason}>
            {t("admin_reports.dialogs.archive_action")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Season Comparison Results */}
      {reportMode === "compare" && comparisonResult && (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
              {t("admin_reports.comparison.title", {
                season1: comparisonResult.season1,
                season2: comparisonResult.season2,
              })}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {/* Orders Comparison */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">{t("admin_reports.comparison.orders")}</Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1 }}>
                      <Typography variant="h5">{comparisonResult.metrics.orders.season2}</Typography>
                      <Typography variant="body2" color={comparisonResult.metrics.orders.change >= 0 ? "success.main" : "error.main"}>
                        {comparisonResult.metrics.orders.change >= 0 ? "+" : ""}{comparisonResult.metrics.orders.change}
                        ({comparisonResult.metrics.orders.changePercent}%)
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.comparison.vs", { value: comparisonResult.metrics.orders.season1 })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Kilos Comparison */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">{t("admin_reports.comparison.kilos")}</Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1 }}>
                      <Typography variant="h5">{comparisonResult.metrics.kilos.season2.toFixed(0)}</Typography>
                      <Typography variant="body2" color={comparisonResult.metrics.kilos.change >= 0 ? "success.main" : "error.main"}>
                        {comparisonResult.metrics.kilos.change >= 0 ? "+" : ""}{comparisonResult.metrics.kilos.change.toFixed(0)}
                        ({comparisonResult.metrics.kilos.changePercent}%)
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.comparison.vs", { value: comparisonResult.metrics.kilos.season1.toFixed(0) })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Pouches Comparison */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">{t("admin_reports.comparison.pouches")}</Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1 }}>
                      <Typography variant="h5">{comparisonResult.metrics.pouches.season2.toFixed(0)}</Typography>
                      <Typography variant="body2" color={comparisonResult.metrics.pouches.change >= 0 ? "success.main" : "error.main"}>
                        {comparisonResult.metrics.pouches.change >= 0 ? "+" : ""}{comparisonResult.metrics.pouches.change.toFixed(0)}
                        ({comparisonResult.metrics.pouches.changePercent}%)
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.comparison.vs", { value: comparisonResult.metrics.pouches.season1.toFixed(0) })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Revenue Comparison */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">{t("admin_reports.comparison.revenue")}</Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1 }}>
                      <Typography variant="h5">€{comparisonResult.metrics.revenue.season2.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
                      <Typography variant="body2" color={comparisonResult.metrics.revenue.change >= 0 ? "success.main" : "error.main"}>
                        {comparisonResult.metrics.revenue.change >= 0 ? "+" : ""}€{comparisonResult.metrics.revenue.change.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        ({comparisonResult.metrics.revenue.changePercent}%)
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t("admin_reports.comparison.vs_currency", {
                        value: comparisonResult.metrics.revenue.season1.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={saveNotice}
        autoHideDuration={2500}
        onClose={() => setSaveNotice(false)}
        message={t("admin_reports.messages.view_saved")}
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
