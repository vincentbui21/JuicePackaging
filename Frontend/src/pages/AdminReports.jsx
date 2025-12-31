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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
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

const inventoryCategoryOptions = [
  "Raw materials",
  "Packaging",
  "Work in progress",
  "Finished goods",
  "Supplies",
  "Other",
];

const assetCategoryOptions = [
  "Cash",
  "Accounts receivable",
  "Inventory",
  "Prepaid expenses",
  "Equipment",
  "Vehicles",
  "Buildings",
  "Land",
  "Intangible assets",
  "Investments",
  "Other assets",
];

const liabilityCategoryOptions = [
  "Accounts payable",
  "Accrued expenses",
  "Short-term loans",
  "Long-term debt",
  "Taxes payable",
  "Deferred revenue",
  "Other liabilities",
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
    category: inventoryCategoryOptions[0],
    cost_center_id: "",
  });
  const [editingItemId, setEditingItemId] = useState(null);
  const [txForm, setTxForm] = useState({ item_id: "", tx_type: "purchase", quantity: "", unit_cost: "", tx_date: "", notes: "" });
  const [editingTxId, setEditingTxId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: assetCategoryOptions[0],
    value: "",
    acquired_date: "",
    notes: "",
  });
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    category: liabilityCategoryOptions[0],
    value: "",
    as_of_date: "",
    notes: "",
  });
  const [editingLiabilityId, setEditingLiabilityId] = useState(null);

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
      showToast("Failed to load inventory items", "error");
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
      showToast("Failed to load inventory transactions", "error");
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
      showToast("Failed to load inventory summary", "error");
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
      showToast("Failed to load assets", "error");
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
      showToast("Failed to load liabilities", "error");
    }
  };

  useEffect(() => {
    loadCostCenters();
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
      category: inventoryCategoryOptions[0],
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
      category: assetCategoryOptions[0],
      value: "",
      acquired_date: endDate || "",
      notes: "",
    });
    setEditingAssetId(null);
  };

  const resetLiabilityForm = () => {
    setLiabilityForm({
      name: "",
      category: liabilityCategoryOptions[0],
      value: "",
      as_of_date: endDate || "",
      notes: "",
    });
    setEditingLiabilityId(null);
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

  const handleSaveItem = async () => {
    const trimmedName = itemForm.name.trim();
    if (!trimmedName) {
      showToast("Inventory item name is required", "error");
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
        showToast("Inventory item updated");
      } else {
        await api.post("/inventory-items", payload);
        showToast("Inventory item added");
      }
      resetItemForm();
      await loadInventoryItems();
      await loadInventorySummary();
    } catch (err) {
      console.error("Failed to save inventory item", err);
      showToast("Failed to save inventory item", "error");
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.item_id);
    setItemForm({
      name: item.name || "",
      sku: item.sku || "",
      unit: item.unit || "unit",
      category: item.category || inventoryCategoryOptions[0],
      cost_center_id: item.cost_center_id || "",
    });
  };

  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm("Delete this inventory item? It must have no transactions.");
    if (!confirmed) return;
    try {
      await api.delete(`/inventory-items/${itemId}`);
      showToast("Inventory item deleted");
      if (editingItemId === itemId) resetItemForm();
      await loadInventoryItems();
      await loadInventorySummary();
    } catch (err) {
      console.error("Failed to delete inventory item", err);
      showToast(err?.response?.data?.error || "Failed to delete inventory item", "error");
    }
  };

  const handleSaveTx = async () => {
    const itemId = Number(txForm.item_id);
    const qty = Number(txForm.quantity);
    const dateStr = String(txForm.tx_date || "").trim();
    if (!Number.isFinite(itemId)) {
      showToast("Select an inventory item", "error");
      return;
    }
    if (!txForm.tx_type) {
      showToast("Select a transaction type", "error");
      return;
    }
    if (!Number.isFinite(qty) || qty === 0) {
      showToast("Quantity must be non-zero", "error");
      return;
    }
    if (txForm.tx_type !== "adjustment" && qty < 0) {
      showToast("Quantity must be positive for this type", "error");
      return;
    }
    if (!dateStr) {
      showToast("Transaction date is required", "error");
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
        showToast("Inventory transaction updated");
      } else {
        await api.post("/inventory-transactions", payload);
        showToast("Inventory transaction added");
      }
      resetTxForm();
      await loadInventoryTransactions();
      await loadInventorySummary();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to save inventory transaction", err);
      showToast("Failed to save inventory transaction", "error");
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
  };

  const handleDeleteTx = async (txId) => {
    const confirmed = window.confirm("Delete this inventory transaction?");
    if (!confirmed) return;
    try {
      await api.delete(`/inventory-transactions/${txId}`);
      showToast("Inventory transaction deleted");
      if (editingTxId === txId) resetTxForm();
      await loadInventoryTransactions();
      await loadInventorySummary();
      await loadCostEntries();
    } catch (err) {
      console.error("Failed to delete inventory transaction", err);
      showToast("Failed to delete inventory transaction", "error");
    }
  };

  const handleSaveAsset = async () => {
    const trimmedName = assetForm.name.trim();
    const valueNum = Number(assetForm.value);
    const dateStr = String(assetForm.acquired_date || "").trim();
    if (!trimmedName) {
      showToast("Asset name is required", "error");
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      showToast("Asset value must be greater than 0", "error");
      return;
    }
    if (!dateStr) {
      showToast("Acquired date is required", "error");
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
        showToast("Asset updated");
      } else {
        await api.post("/assets", payload);
        showToast("Asset added");
      }
      resetAssetForm();
      await loadAssets();
    } catch (err) {
      console.error("Failed to save asset", err);
      showToast("Failed to save asset", "error");
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAssetId(asset.asset_id);
    setAssetForm({
      name: asset.name || "",
      category: asset.category || assetCategoryOptions[0],
      value: asset.value ?? "",
      acquired_date: asset.acquired_date || "",
      notes: asset.notes || "",
    });
  };

  const handleDeleteAsset = async (assetId) => {
    const confirmed = window.confirm("Delete this asset?");
    if (!confirmed) return;
    try {
      await api.delete(`/assets/${assetId}`);
      showToast("Asset deleted");
      if (editingAssetId === assetId) resetAssetForm();
      await loadAssets();
    } catch (err) {
      console.error("Failed to delete asset", err);
      showToast("Failed to delete asset", "error");
    }
  };

  const handleSaveLiability = async () => {
    const trimmedName = liabilityForm.name.trim();
    const valueNum = Number(liabilityForm.value);
    const dateStr = String(liabilityForm.as_of_date || "").trim();
    if (!trimmedName) {
      showToast("Liability name is required", "error");
      return;
    }
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      showToast("Liability value must be greater than 0", "error");
      return;
    }
    if (!dateStr) {
      showToast("As-of date is required", "error");
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
        showToast("Liability updated");
      } else {
        await api.post("/liabilities", payload);
        showToast("Liability added");
      }
      resetLiabilityForm();
      await loadLiabilities();
    } catch (err) {
      console.error("Failed to save liability", err);
      showToast("Failed to save liability", "error");
    }
  };

  const handleEditLiability = (liability) => {
    setEditingLiabilityId(liability.liability_id);
    setLiabilityForm({
      name: liability.name || "",
      category: liability.category || liabilityCategoryOptions[0],
      value: liability.value ?? "",
      as_of_date: liability.as_of_date || "",
      notes: liability.notes || "",
    });
  };

  const handleDeleteLiability = async (liabilityId) => {
    const confirmed = window.confirm("Delete this liability?");
    if (!confirmed) return;
    try {
      await api.delete(`/liabilities/${liabilityId}`);
      showToast("Liability deleted");
      if (editingLiabilityId === liabilityId) resetLiabilityForm();
      await loadLiabilities();
    } catch (err) {
      console.error("Failed to delete liability", err);
      showToast("Failed to delete liability", "error");
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
      "Totals",
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
        </tr>`
      )).join("")
      : `<tr><td colspan="8" class="empty">No data for the selected range.</td></tr>`;

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
    const title = "Income Statement";
    const rangeText = `${startDate || "—"} → ${endDate || "—"}`;
    const cityText = selectedCities.length ? selectedCities.join(", ") : "All cities";
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
    <div class="meta">Date range: ${escapeHtml(rangeText)} · Cities: ${escapeHtml(cityText)}</div>
    <table>
      <tbody>
        <tr><th>Revenue</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.revenue))}</td></tr>
        <tr><th>Direct costs</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.directCosts))}</td></tr>
        <tr class="total"><th>Gross profit</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.grossProfit))}</td></tr>
        <tr><th>Overhead / expenses</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.overheadCosts))}</td></tr>
        <tr class="total"><th>Net profit</th><td class="num">${escapeHtml(formatCurrency(incomeStatement.netProfit))}</td></tr>
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
    const title = "Statement of Financial Position";
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
    <div class="meta">As of: ${escapeHtml(asOfText)}</div>

    <h2>Assets</h2>
    <table>
      <tbody>
        <tr><th>Inventory</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.inventoryValue))}</td></tr>
        ${assets.map((asset) => (
          `<tr><th>${escapeHtml(asset.name || "Asset")}</th><td class="num">${escapeHtml(formatCurrency(asset.value))}</td></tr>`
        )).join("")}
        <tr class="total"><th>Total assets</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.totalAssets))}</td></tr>
      </tbody>
    </table>

    <h2>Liabilities</h2>
    <table>
      <tbody>
        ${liabilities.length
          ? liabilities.map((liability) => (
            `<tr><th>${escapeHtml(liability.name || "Liability")}</th><td class="num">${escapeHtml(formatCurrency(liability.value))}</td></tr>`
          )).join("")
          : `<tr><th>Liabilities</th><td class="num">${escapeHtml(formatCurrency(0))}</td></tr>`
        }
        <tr class="total"><th>Total liabilities</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.totalLiabilities))}</td></tr>
      </tbody>
    </table>

    <h2>Equity</h2>
    <table>
      <tbody>
        <tr class="total"><th>Equity</th><td class="num">${escapeHtml(formatCurrency(balanceSheet.equity))}</td></tr>
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
      alert("Please allow pop-ups to export the PDF.");
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
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Costs" value="costs" />
            <Tab label="Inventory" value="inventory" />
            <Tab label="Statements" value="statements" />
            <Tab label="Orders" value="orders" />
          </Tabs>

          <TabPanel value={activeTab} tab="overview">
            <Stack spacing={2}>
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
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    Production vs Sales Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={report.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="kilos" stroke={theme.palette.primary.main} name="Kilos produced" strokeWidth={2} />
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
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="city" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="kilos" fill={theme.palette.primary.main} name="Kilos produced" />
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
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="period" stroke={theme.palette.text.secondary} />
                      <YAxis stroke={theme.palette.text.secondary} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="pouches" stroke={theme.palette.primary.main} name="Actual pouches" strokeWidth={2} />
                      <Line type="monotone" dataKey="expected_pouches" stroke="#9e9e9e" name="Expected pouches" strokeWidth={2} />
                      <Line type="monotone" dataKey="variance_pct" stroke="#d32f2f" name="Variance (%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>

          <TabPanel value={activeTab} tab="costs">
            <Stack spacing={2}>
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
            </Stack>
          </TabPanel>

          <TabPanel value={activeTab} tab="inventory">
            <Stack spacing={2}>
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
                        Inventory & Stock
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip size="small" label={`On hand: ${formatNumber(inventoryTotals.onHandCount)}`} />
                        <Chip size="small" label={`Inventory value: ${formatCurrency(inventoryTotals.inventoryValue)}`} />
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Purchases and adjustments can sync to direct cost centers when an item is linked to a cost center.
                    </Typography>
                    <Table size="small" sx={{ tableLayout: "fixed" }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">On hand</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Last unit cost</TableCell>
                          <TableCell align="right">Inventory value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inventorySummary.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No inventory data yet.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          inventorySummary.map((item) => (
                            <TableRow key={item.item_id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{formatNumber(item.on_hand)}</TableCell>
                              <TableCell>{item.unit}</TableCell>
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
                          <Typography variant="subtitle2" fontWeight={700}>
                            Inventory Items
                          </Typography>
                          <Stack spacing={1}>
                            <TextField
                              label="Item name"
                              size="small"
                              value={itemForm.name}
                              onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                              fullWidth
                            />
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <TextField
                                label="SKU"
                                size="small"
                                value={itemForm.sku}
                                onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                                fullWidth
                              />
                              <TextField
                                label="Unit"
                                size="small"
                                value={itemForm.unit}
                                onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                                sx={{ minWidth: 120 }}
                              />
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                <InputLabel id="item-category-label">Category</InputLabel>
                                <Select
                                  labelId="item-category-label"
                                  label="Category"
                                  value={itemForm.category}
                                  onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}
                                >
                                  {inventoryCategoryOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel id="item-cost-center-label">Cost center</InputLabel>
                                <Select
                                  labelId="item-cost-center-label"
                                  label="Cost center"
                                  value={itemForm.cost_center_id}
                                  onChange={(e) => setItemForm((prev) => ({ ...prev, cost_center_id: e.target.value }))}
                                >
                                  <MenuItem value="">None</MenuItem>
                                  {costCenters.map((center) => (
                                    <MenuItem key={center.center_id} value={center.center_id}>
                                      {center.name} ({center.category})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={handleSaveItem}>
                              {editingItemId ? "Update item" : "Add item"}
                            </Button>
                            {editingItemId && (
                              <Button variant="text" onClick={resetItemForm} startIcon={<CloseIcon />}>
                                Cancel
                              </Button>
                            )}
                          </Stack>
                          <Divider />
                          {inventoryItems.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No inventory items yet.
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
                                        Unit: {item.unit || "unit"} · Category: {item.category || "—"} · Cost center: {center?.name || "—"}
                                      </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5}>
                                      <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
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
                          <Typography variant="subtitle2" fontWeight={700}>
                            Inventory Transactions
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Transactions are filtered to the selected date range.
                          </Typography>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                            <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                              <InputLabel id="tx-item-label">Item</InputLabel>
                              <Select
                                labelId="tx-item-label"
                                label="Item"
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
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                              <InputLabel id="tx-type-label">Type</InputLabel>
                              <Select
                                labelId="tx-type-label"
                                label="Type"
                                value={txForm.tx_type}
                                onChange={(e) => setTxForm((prev) => ({ ...prev, tx_type: e.target.value }))}
                              >
                                <MenuItem value="purchase">Purchase</MenuItem>
                                <MenuItem value="usage">Usage</MenuItem>
                                <MenuItem value="adjustment">Adjustment</MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              label="Quantity"
                              size="small"
                              type="number"
                              value={txForm.quantity}
                              onChange={(e) => setTxForm((prev) => ({ ...prev, quantity: e.target.value }))}
                              inputProps={{ step: "0.01" }}
                            />
                            <TextField
                              label="Unit cost (€)"
                              size="small"
                              type="number"
                              value={txForm.unit_cost}
                              onChange={(e) => setTxForm((prev) => ({ ...prev, unit_cost: e.target.value }))}
                              inputProps={{ step: "0.01" }}
                            />
                            <TextField
                              label="Date"
                              size="small"
                              type="date"
                              value={txForm.tx_date}
                              onChange={(e) => setTxForm((prev) => ({ ...prev, tx_date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Stack>
                          <TextField
                            label="Notes"
                            size="small"
                            value={txForm.notes}
                            onChange={(e) => setTxForm((prev) => ({ ...prev, notes: e.target.value }))}
                            fullWidth
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              onClick={handleSaveTx}
                              disabled={!inventoryItems.length}
                            >
                              {editingTxId ? "Update transaction" : "Add transaction"}
                            </Button>
                            {editingTxId && (
                              <Button variant="text" onClick={resetTxForm} startIcon={<CloseIcon />}>
                                Cancel
                              </Button>
                            )}
                          </Stack>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: 100 }}>Date</TableCell>
                                <TableCell sx={{ width: 140 }}>Item</TableCell>
                                <TableCell sx={{ width: 110 }}>Type</TableCell>
                                <TableCell align="right" sx={{ width: 90 }}>Qty</TableCell>
                                <TableCell align="right" sx={{ width: 110 }}>Unit cost</TableCell>
                                <TableCell align="right" sx={{ width: 120 }}>Total</TableCell>
                                <TableCell>Notes</TableCell>
                                <TableCell align="right" sx={{ width: 90 }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {inventoryTransactions.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      No inventory transactions for this range.
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                inventoryTransactions.map((tx) => (
                                  <TableRow key={tx.tx_id}>
                                    <TableCell>{tx.tx_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{tx.item_name}</TableCell>
                                    <TableCell>{tx.tx_type}</TableCell>
                                    <TableCell align="right">{formatNumber(tx.quantity)}</TableCell>
                                    <TableCell align="right">
                                      {tx.unit_cost != null ? formatCurrency(tx.unit_cost) : "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                      {tx.total_cost != null ? formatCurrency(tx.total_cost) : "—"}
                                    </TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{tx.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditTx(tx)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
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
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={800}>
                        Income Statement
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileText size={16} />}
                        onClick={handleExportIncomeStatement}
                      >
                        Export statement
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Updated for the selected date range and city filters.
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Revenue</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.revenue)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Direct costs</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.directCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Gross profit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(incomeStatement.grossProfit)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Overhead / expenses</TableCell>
                          <TableCell align="right">{formatCurrency(incomeStatement.overheadCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Net profit</TableCell>
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
                        Statement of Financial Position
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileText size={16} />}
                        onClick={handleExportBalanceSheet}
                      >
                        Export statement
                      </Button>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`Total assets: ${formatCurrency(balanceSheet.totalAssets)}`} />
                      <Chip size="small" label={`Total liabilities: ${formatCurrency(balanceSheet.totalLiabilities)}`} />
                      <Chip size="small" variant="outlined" label={`Equity: ${formatCurrency(balanceSheet.equity)}`} />
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} lg={6}>
                        <Stack spacing={1.5}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Assets
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Inventory value is computed from on-hand stock as of the selected end date.
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip size="small" label={`Inventory: ${formatCurrency(balanceSheet.inventoryValue)}`} />
                            <Chip size="small" label={`Fixed assets: ${formatCurrency(balanceSheet.fixedAssets)}`} />
                          </Stack>
                          <Stack spacing={1}>
                            <TextField
                              label="Asset name"
                              size="small"
                              value={assetForm.name}
                              onChange={(e) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))}
                              fullWidth
                            />
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                <InputLabel id="asset-category-label">Category</InputLabel>
                                <Select
                                  labelId="asset-category-label"
                                  label="Category"
                                  value={assetForm.category}
                                  onChange={(e) => setAssetForm((prev) => ({ ...prev, category: e.target.value }))}
                                >
                                  {assetCategoryOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Value (€)"
                                size="small"
                                type="number"
                                value={assetForm.value}
                                onChange={(e) => setAssetForm((prev) => ({ ...prev, value: e.target.value }))}
                                inputProps={{ step: "0.01" }}
                              />
                              <TextField
                                label="Acquired date"
                                size="small"
                                type="date"
                                value={assetForm.acquired_date}
                                onChange={(e) => setAssetForm((prev) => ({ ...prev, acquired_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Stack>
                            <TextField
                              label="Notes"
                              size="small"
                              value={assetForm.notes}
                              onChange={(e) => setAssetForm((prev) => ({ ...prev, notes: e.target.value }))}
                              fullWidth
                            />
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={handleSaveAsset}>
                              {editingAssetId ? "Update asset" : "Add asset"}
                            </Button>
                            {editingAssetId && (
                              <Button variant="text" onClick={resetAssetForm} startIcon={<CloseIcon />}>
                                Cancel
                              </Button>
                            )}
                          </Stack>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Asset</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell align="right">Value</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Notes</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {assets.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      No assets yet.
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                assets.map((asset) => (
                                  <TableRow key={asset.asset_id}>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{asset.name}</TableCell>
                                    <TableCell>{asset.category || "—"}</TableCell>
                                    <TableCell align="right">{formatCurrency(asset.value)}</TableCell>
                                    <TableCell>{asset.acquired_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{asset.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditAsset(asset)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
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
                          <Typography variant="subtitle2" fontWeight={700}>
                            Liabilities
                          </Typography>
                          <Stack spacing={1}>
                            <TextField
                              label="Liability name"
                              size="small"
                              value={liabilityForm.name}
                              onChange={(e) => setLiabilityForm((prev) => ({ ...prev, name: e.target.value }))}
                              fullWidth
                            />
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                <InputLabel id="liability-category-label">Category</InputLabel>
                                <Select
                                  labelId="liability-category-label"
                                  label="Category"
                                  value={liabilityForm.category}
                                  onChange={(e) => setLiabilityForm((prev) => ({ ...prev, category: e.target.value }))}
                                >
                                  {liabilityCategoryOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Value (€)"
                                size="small"
                                type="number"
                                value={liabilityForm.value}
                                onChange={(e) => setLiabilityForm((prev) => ({ ...prev, value: e.target.value }))}
                                inputProps={{ step: "0.01" }}
                              />
                              <TextField
                                label="As of date"
                                size="small"
                                type="date"
                                value={liabilityForm.as_of_date}
                                onChange={(e) => setLiabilityForm((prev) => ({ ...prev, as_of_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Stack>
                            <TextField
                              label="Notes"
                              size="small"
                              value={liabilityForm.notes}
                              onChange={(e) => setLiabilityForm((prev) => ({ ...prev, notes: e.target.value }))}
                              fullWidth
                            />
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={handleSaveLiability}>
                              {editingLiabilityId ? "Update liability" : "Add liability"}
                            </Button>
                            {editingLiabilityId && (
                              <Button variant="text" onClick={resetLiabilityForm} startIcon={<CloseIcon />}>
                                Cancel
                              </Button>
                            )}
                          </Stack>
                          <Divider />
                          <Table size="small" sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Liability</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell align="right">Value</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Notes</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {liabilities.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      No liabilities yet.
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                liabilities.map((liability) => (
                                  <TableRow key={liability.liability_id}>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{liability.name}</TableCell>
                                    <TableCell>{liability.category || "—"}</TableCell>
                                    <TableCell align="right">{formatCurrency(liability.value)}</TableCell>
                                    <TableCell>{liability.as_of_date}</TableCell>
                                    <TableCell sx={{ overflowWrap: "anywhere" }}>{liability.notes || "—"}</TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditLiability(liability)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
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

          <TabPanel value={activeTab} tab="orders">
            <Stack spacing={2}>
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
            </Stack>
          </TabPanel>
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
