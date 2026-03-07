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

export default function StatementsSection({
  t,
  incomeStatement,
  balanceSheet,
  assets,
  liabilities,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
  onAddLiability,
  onEditLiability,
  onDeleteLiability,
  formatCurrency,
  resolveCategoryLabel,
  assetCategoryMap,
  liabilityCategoryMap,
  assetCategoryOptions,
  liabilityCategoryOptions,
}) {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: assetCategoryOptions[0]?.value || "Cash",
    value: "",
    acquired_date: "",
    notes: "",
  });
  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    category: liabilityCategoryOptions[0]?.value || "Accounts payable",
    value: "",
    as_of_date: "",
    notes: "",
  });
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingLiabilityId, setEditingLiabilityId] = useState(null);

  const handleSaveAsset = () => {
    if (!assetForm.name.trim() || !assetForm.value) return;
    if (editingAssetId) {
      onEditAsset(editingAssetId, assetForm);
      setEditingAssetId(null);
    } else {
      onAddAsset(assetForm);
    }
    setAssetForm({ name: "", category: assetCategoryOptions[0]?.value || "Cash", value: "", acquired_date: "", notes: "" });
    setShowAssetForm(false);
  };

  const handleEditAsset = (asset) => {
    setAssetForm({
      name: asset.name,
      category: asset.category,
      value: asset.value,
      acquired_date: asset.acquired_date,
      notes: asset.notes,
    });
    setEditingAssetId(asset.asset_id);
    setShowAssetForm(true);
  };

  const handleCancelAsset = () => {
    setShowAssetForm(false);
    setAssetForm({ name: "", category: assetCategoryOptions[0]?.value || "Cash", value: "", acquired_date: "", notes: "" });
    setEditingAssetId(null);
  };

  const handleSaveLiability = () => {
    if (!liabilityForm.name.trim() || !liabilityForm.value) return;
    if (editingLiabilityId) {
      onEditLiability(editingLiabilityId, liabilityForm);
      setEditingLiabilityId(null);
    } else {
      onAddLiability(liabilityForm);
    }
    setLiabilityForm({ name: "", category: liabilityCategoryOptions[0]?.value || "Accounts payable", value: "", as_of_date: "", notes: "" });
    setShowLiabilityForm(false);
  };

  const handleEditLiability = (liability) => {
    setLiabilityForm({
      name: liability.name,
      category: liability.category,
      value: liability.value,
      as_of_date: liability.as_of_date,
      notes: liability.notes,
    });
    setEditingLiabilityId(liability.liability_id);
    setShowLiabilityForm(true);
  };

  const handleCancelLiability = () => {
    setShowLiabilityForm(false);
    setLiabilityForm({ name: "", category: liabilityCategoryOptions[0]?.value || "Accounts payable", value: "", as_of_date: "", notes: "" });
    setEditingLiabilityId(null);
  };

  return (
    <Stack spacing={3}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.statements.total_assets")} 
            value={formatCurrency(balanceSheet.totalAssets)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.statements.total_liabilities")} 
            value={formatCurrency(balanceSheet.totalLiabilities)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard 
            title={t("admin_reports.statements.equity")} 
            value={formatCurrency(balanceSheet.equity)}
          />
        </Grid>
      </Grid>

      <Divider />

      {/* Income Statement */}
      <Box>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t("admin_reports.statements.income_statement")}
          </Typography>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.description")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{t("admin_reports.statements.revenue")}</TableCell>
                <TableCell align="right">{formatCurrency(incomeStatement.revenue)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t("admin_reports.statements.direct_costs")}</TableCell>
                <TableCell align="right">{formatCurrency(incomeStatement.directCosts)}</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: "#f0fdf4" }}>
                <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.gross_profit")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatCurrency(incomeStatement.grossProfit)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t("admin_reports.statements.overhead")}</TableCell>
                <TableCell align="right">{formatCurrency(incomeStatement.overheadCosts)}</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: "#f0fdf4" }}>
                <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.net_profit")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatCurrency(incomeStatement.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Stack>
      </Box>

      <Divider />

      {/* Assets Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.statements.assets_title")}
            </Typography>
            {!showAssetForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowAssetForm(true)}
              >
                {t("admin_reports.statements.add_asset")}
              </Button>
            )}
          </Stack>

          {showAssetForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label={t("admin_reports.dialogs.name")}
                    size="small"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                  />
                  <FormControl size="small">
                    <InputLabel>{t("admin_reports.dialogs.category")}</InputLabel>
                    <Select
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
                    label={t("admin_reports.dialogs.amount_eur")}
                    size="small"
                    type="number"
                    value={assetForm.value}
                    onChange={(e) => setAssetForm((prev) => ({ ...prev, value: e.target.value }))}
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                  <TextField
                    label={t("admin_reports.dialogs.date")}
                    size="small"
                    type="date"
                    value={assetForm.acquired_date}
                    onChange={(e) => setAssetForm((prev) => ({ ...prev, acquired_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label={t("admin_reports.dialogs.notes")}
                    size="small"
                    value={assetForm.notes}
                    onChange={(e) => setAssetForm((prev) => ({ ...prev, notes: e.target.value }))}
                    multiline
                    rows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveAsset}>
                      {editingAssetId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelAsset}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {assets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.statements.no_assets")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.asset_table.asset")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.asset_table.category")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.statements.asset_table.value")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.asset_table.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.asset_table.notes")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.asset_id}>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{resolveCategoryLabel(assetCategoryMap, asset.category)}</TableCell>
                    <TableCell align="right">{formatCurrency(asset.value)}</TableCell>
                    <TableCell>{asset.acquired_date || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                      {asset.notes || "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => handleEditAsset(asset)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => onDeleteAsset(asset.asset_id)}>
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

      {/* Liabilities Section */}
      <Box>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              {t("admin_reports.statements.liabilities_title")}
            </Typography>
            {!showLiabilityForm && (
              <Button 
                variant="contained" 
                size="small"
                startIcon={<PlusIcon size={16} />}
                sx={{ backgroundColor: "#22c55e", "&:hover": { backgroundColor: "#16a34a" } }}
                onClick={() => setShowLiabilityForm(true)}
              >
                {t("admin_reports.statements.add_liability")}
              </Button>
            )}
          </Stack>

          {showLiabilityForm && (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "#f9fafb" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label={t("admin_reports.dialogs.name")}
                    size="small"
                    value={liabilityForm.name}
                    onChange={(e) => setLiabilityForm((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                  />
                  <FormControl size="small">
                    <InputLabel>{t("admin_reports.dialogs.category")}</InputLabel>
                    <Select
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
                    label={t("admin_reports.dialogs.amount_eur")}
                    size="small"
                    type="number"
                    value={liabilityForm.value}
                    onChange={(e) => setLiabilityForm((prev) => ({ ...prev, value: e.target.value }))}
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                  <TextField
                    label={t("admin_reports.dialogs.date")}
                    size="small"
                    type="date"
                    value={liabilityForm.as_of_date}
                    onChange={(e) => setLiabilityForm((prev) => ({ ...prev, as_of_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label={t("admin_reports.dialogs.notes")}
                    size="small"
                    value={liabilityForm.notes}
                    onChange={(e) => setLiabilityForm((prev) => ({ ...prev, notes: e.target.value }))}
                    multiline
                    rows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={handleSaveLiability}>
                      {editingLiabilityId ? t("common.update") : t("common.add")}
                    </Button>
                    <Button variant="outlined" size="small" onClick={handleCancelLiability}>
                      {t("common.cancel")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {liabilities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin_reports.statements.no_liabilities")}
            </Typography>
          ) : (
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.liability_table.liability")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.liability_table.category")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("admin_reports.statements.liability_table.value")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.liability_table.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("admin_reports.statements.liability_table.notes")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liabilities.map((liability) => (
                  <TableRow key={liability.liability_id}>
                    <TableCell>{liability.name}</TableCell>
                    <TableCell>{resolveCategoryLabel(liabilityCategoryMap, liability.category)}</TableCell>
                    <TableCell align="right">{formatCurrency(liability.value)}</TableCell>
                    <TableCell>{liability.as_of_date || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                      {liability.notes || "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => handleEditLiability(liability)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => onDeleteLiability(liability.liability_id)}>
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
