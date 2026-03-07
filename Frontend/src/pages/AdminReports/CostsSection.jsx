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

const KpiCard = ({ title, value }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#fafafa" }}>
    <CardContent sx={{ pb: "16px !important" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>{title}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </CardContent>
  </Card>
);

export default function CostsSection({
  t,
  costCenters,
  costEntries,
  costTotals,
  onAddCenter,
  onEditCenter,
  onDeleteCenter,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  formatCurrency,
  resolveCategoryLabel,
  costCenterCategoryMap,
}) {
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [centerForm, setCenterForm] = useState({ name: "", category: "direct" });
  const [entryForm, setEntryForm] = useState({ center_id: "", amount: "", incurred_date: "", notes: "" });
  const [editingCenterId, setEditingCenterId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);

  const handleSaveCenter = () => {
    if (!centerForm.name.trim()) return;
    if (editingCenterId) {
      onEditCenter(editingCenterId, centerForm);
      setEditingCenterId(null);
    } else {
      onAddCenter(centerForm);
    }
    setCenterForm({ name: "", category: "direct" });
    setShowCenterForm(false);
  };

  const handleEditCenter = (center) => {
    setCenterForm({ name: center.name, category: center.category });
    setEditingCenterId(center.center_id);
    setShowCenterForm(true);
  };

  const handleCancelCenter = () => {
    setShowCenterForm(false);
    setCenterForm({ name: "", category: "direct" });
    setEditingCenterId(null);
  };

  const handleSaveEntry = () => {
    if (!entryForm.center_id || !entryForm.amount) return;
    if (editingEntryId) {
      onEditEntry(editingEntryId, entryForm);
      setEditingEntryId(null);
    } else {
      onAddEntry(entryForm);
    }
    setEntryForm({ center_id: "", amount: "", incurred_date: "", notes: "" });
    setShowEntryForm(false);
  };

  const handleEditEntry = (entry) => {
    setEntryForm({
      center_id: entry.center_id,
      amount: entry.amount,
      incurred_date: entry.incurred_date,
      notes: entry.notes,
    });
    setEditingEntryId(entry.entry_id);
    setShowEntryForm(true);
  };

  const handleCancelEntry = () => {
    setShowEntryForm(false);
    setEntryForm({ center_id: "", amount: "", incurred_date: "", notes: "" });
    setEditingEntryId(null);
  };

  return (
    <Stack spacing={3}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.costs.total_label").replace(": {{value}}", "")} 
            value={formatCurrency(costTotals.total)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.costs.direct_label").replace(": {{value}}", "")} 
            value={formatCurrency(costTotals.direct)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.costs.overhead_label").replace(": {{value}}", "")} 
            value={formatCurrency(costTotals.overhead)}
          />
        </Grid>
      </Grid>

      <Divider />

      {/* Cost Centers Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.costs.centers_title")}
            </Typography>
            {!showCenterForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowCenterForm(true)}
              >
                {t("admin_reports.costs.add_center")}
              </Button>
            )}
          </Stack>

          {showCenterForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label={t("admin_reports.dialogs.center_name")}
                    size="small"
                    value={centerForm.name}
                    onChange={(e) => setCenterForm((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                  />
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>{t("admin_reports.dialogs.category")}</InputLabel>
                    <Select
                      label={t("admin_reports.dialogs.category")}
                      value={centerForm.category}
                      onChange={(e) => setCenterForm((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <MenuItem value="direct">{t("admin_reports.costs.center_direct")}</MenuItem>
                      <MenuItem value="overhead">{t("admin_reports.costs.center_overhead")}</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveCenter}>
                      {editingCenterId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelCenter}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {costCenters.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.costs.no_centers")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.name")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.category")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costCenters.map((center) => (
                  <TableRow key={center.center_id}>
                    <TableCell>{center.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={center.category === "overhead" ? t("admin_reports.costs.center_overhead") : t("admin_reports.costs.center_direct")}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => handleEditCenter(center)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => onDeleteCenter(center.center_id)}>
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

      {/* Cost Entries Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.costs.entries_title")}
            </Typography>
            {!showEntryForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowEntryForm(true)}
                disabled={!costCenters.length}
              >
                {t("admin_reports.costs.add_entry")}
              </Button>
            )}
          </Stack>

          {showEntryForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>{t("admin_reports.dialogs.cost_center")}</InputLabel>
                    <Select
                      label={t("admin_reports.dialogs.cost_center")}
                      value={entryForm.center_id}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, center_id: e.target.value }))}
                    >
                      <MenuItem value="">{t("admin_reports.dialogs.cost_center_none")}</MenuItem>
                      {costCenters.map((center) => (
                        <MenuItem key={center.center_id} value={center.center_id}>
                          {center.name}
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
                    inputProps={{ step: "0.01" }}
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
                    multiline
                    rows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveEntry}>
                      {editingEntryId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelEntry}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {costEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.costs.no_entries")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.costs.table.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.costs.table.center")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.category")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.costs.table.amount")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.costs.table.notes")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costEntries.map((entry) => (
                  <TableRow key={entry.entry_id}>
                    <TableCell>{entry.incurred_date}</TableCell>
                    <TableCell>{entry.center_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.center_category === "overhead" ? t("admin_reports.costs.entry_overhead") : t("admin_reports.costs.entry_direct")}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>{entry.notes || "—"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => handleEditEntry(entry)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => onDeleteEntry(entry.entry_id)}>
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
    </Stack>
  );
}
