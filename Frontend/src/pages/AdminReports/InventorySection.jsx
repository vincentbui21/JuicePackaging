import React, { useState } from "react";
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Box,
  Chip,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Plus as PlusIcon } from "lucide-react";

const KpiCard = ({ title, value, items }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#fafafa" }}>
    <CardContent sx={{ pb: "16px !important" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>{title}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
      {items && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{items} items</Typography>}
    </CardContent>
  </Card>
);

export default function InventorySection({
  t,
  inventoryItems,
  inventoryTransactions,
  inventoryTotals,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  formatCurrency,
  formatNumber,
  resolveUnitLabel,
  resolveCategoryLabel,
  resolveTxTypeLabel,
  inventoryCategoryMap,
  costCenters,
}) {
  const [showItemForm, setShowItemForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    unit: "unit",
    category: "Raw materials",
    cost_center_id: "",
  });
  const [txForm, setTxForm] = useState({
    item_id: "",
    tx_type: "purchase",
    quantity: "",
    unit_cost: "",
    tx_date: "",
    notes: "",
  });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) return;
    if (editingItemId) {
      onEditItem(editingItemId, itemForm);
      setEditingItemId(null);
    } else {
      onAddItem(itemForm);
    }
    setItemForm({ name: "", sku: "", unit: "unit", category: "Raw materials", cost_center_id: "" });
    setShowItemForm(false);
  };

  const handleEditItem = (item) => {
    setItemForm({
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      category: item.category,
      cost_center_id: item.cost_center_id,
    });
    setEditingItemId(item.item_id);
    setShowItemForm(true);
  };

  const handleCancelItem = () => {
    setShowItemForm(false);
    setItemForm({ name: "", sku: "", unit: "unit", category: "Raw materials", cost_center_id: "" });
    setEditingItemId(null);
  };

  const handleSaveTransaction = () => {
    if (!txForm.item_id || !txForm.quantity) return;
    if (editingTxId) {
      onEditTransaction(editingTxId, txForm);
      setEditingTxId(null);
    } else {
      onAddTransaction(txForm);
    }
    setTxForm({ item_id: "", tx_type: "purchase", quantity: "", unit_cost: "", tx_date: "", notes: "" });
    setShowTxForm(false);
  };

  const handleEditTransaction = (tx) => {
    setTxForm({
      item_id: tx.item_id,
      tx_type: tx.tx_type,
      quantity: tx.quantity,
      unit_cost: tx.unit_cost,
      tx_date: tx.tx_date,
      notes: tx.notes,
    });
    setEditingTxId(tx.tx_id);
    setShowTxForm(true);
  };

  const handleCancelTransaction = () => {
    setShowTxForm(false);
    setTxForm({ item_id: "", tx_type: "purchase", quantity: "", unit_cost: "", tx_date: "", notes: "" });
    setEditingTxId(null);
  };

  return (
    <Stack spacing={3}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.inventory.summary_table.inventory_value")} 
            value={formatCurrency(inventoryTotals.inventoryValue)}
            items={inventoryItems.length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.inventory.summary_table.on_hand")} 
            value={formatNumber(inventoryTotals.onHandCount)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.inventory.transactions_title")} 
            value={inventoryTransactions.length}
          />
        </Grid>
      </Grid>

      <Divider />

      {/* Inventory Items Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.inventory.items_title")}
            </Typography>
            {!showItemForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowItemForm(true)}
              >
                {t("admin_reports.inventory.add_item")}
              </Button>
            )}
          </Stack>

          {showItemForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label={t("admin_reports.dialogs.item_name")}
                    size="small"
                    value={itemForm.name}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label={t("admin_reports.dialogs.sku")}
                    size="small"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                  />
                  <FormControl size="small">
                    <InputLabel>{t("admin_reports.dialogs.unit")}</InputLabel>
                    <Select
                      label={t("admin_reports.dialogs.unit")}
                      value={itemForm.unit}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                    >
                      <MenuItem value="unit">{t("admin_reports.inventory.units.unit")}</MenuItem>
                      <MenuItem value="kg">kg</MenuItem>
                      <MenuItem value="L">L</MenuItem>
                      <MenuItem value="pcs">pcs</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>{t("admin_reports.dialogs.category")}</InputLabel>
                    <Select
                      label={t("admin_reports.dialogs.category")}
                      value={itemForm.category}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <MenuItem value="Raw materials">{t("admin_reports.inventory_categories.raw_materials")}</MenuItem>
                      <MenuItem value="Packaging">{t("admin_reports.inventory_categories.packaging")}</MenuItem>
                      <MenuItem value="Work in progress">{t("admin_reports.inventory_categories.work_in_progress")}</MenuItem>
                      <MenuItem value="Finished goods">{t("admin_reports.inventory_categories.finished_goods")}</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveItem}>
                      {editingItemId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelItem}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {inventoryItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.inventory.no_items")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.summary_table.item")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.sku")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.summary_table.unit")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.category")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.sku || "—"}</TableCell>
                    <TableCell>{resolveUnitLabel(item.unit)}</TableCell>
                    <TableCell>{resolveCategoryLabel(inventoryCategoryMap, item.category)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => onDeleteItem(item.item_id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Transactions Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.inventory.transactions_title")}
            </Typography>
            {!showTxForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowTxForm(true)}
                disabled={inventoryItems.length === 0}
              >
                {t("admin_reports.inventory.add_transaction")}
              </Button>
            )}
          </Stack>

          {showTxForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>{t("admin_reports.dialogs.item")}</InputLabel>
                    <Select
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
                  <FormControl size="small">
                    <InputLabel>{t("admin_reports.dialogs.type")}</InputLabel>
                    <Select
                      label={t("admin_reports.dialogs.type")}
                      value={txForm.tx_type}
                      onChange={(e) => setTxForm((prev) => ({ ...prev, tx_type: e.target.value }))}
                    >
                      <MenuItem value="purchase">{t("admin_reports.inventory.tx_type.purchase")}</MenuItem>
                      <MenuItem value="sale">{t("admin_reports.inventory.tx_type.sale")}</MenuItem>
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
                    label={t("admin_reports.dialogs.unit_cost")}
                    size="small"
                    type="number"
                    value={txForm.unit_cost}
                    onChange={(e) => setTxForm((prev) => ({ ...prev, unit_cost: e.target.value }))}
                    inputProps={{ step: "0.01" }}
                  />
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
                    multiline
                    rows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveTransaction}>
                      {editingTxId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelTransaction}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {inventoryTransactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.inventory.no_transactions")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.item")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.type")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.qty")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.unit_cost")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.inventory.transactions_table.total")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryTransactions.map((tx) => {
                  const item = inventoryItems.find(i => i.item_id === tx.item_id);
                  const total = (Number(tx.quantity) * Number(tx.unit_cost)) || 0;
                  return (
                    <TableRow key={tx.tx_id}>
                      <TableCell>{tx.tx_date || "—"}</TableCell>
                      <TableCell>{item?.name || "—"}</TableCell>
                      <TableCell>{resolveTxTypeLabel(tx.tx_type)}</TableCell>
                      <TableCell align="right">{formatNumber(tx.quantity)}</TableCell>
                      <TableCell align="right">{formatCurrency(tx.unit_cost)}</TableCell>
                      <TableCell align="right">{formatCurrency(total)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t("common.edit")}>
                          <IconButton size="small" onClick={() => handleEditTransaction(tx)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("common.delete")}>
                          <IconButton size="small" onClick={() => onDeleteTransaction(tx.tx_id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
