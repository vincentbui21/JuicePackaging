import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, Snackbar, Alert, IconButton,
  Chip, Stack, Menu, FormControlLabel, Checkbox
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Edit, Delete, ContentCopy, CheckCircle, Settings, Percent } from "@mui/icons-material";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";
import ConfirmationDialog from "../components/ConfirmationDialog";

function DiscountManagement() {
  const { t } = useTranslation();
  const [discounts, setDiscounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState(null);
  const [searchCode, setSearchCode] = useState("");
  const [cities, setCities] = useState([]);
  const [columnVisibilityMenuOpen, setColumnVisibilityMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    phone: true,
    email: false,
    city: true,
    discount_percentage: true,
    discount_code: true,
    is_used: true,
    created_at: true,
    used_at: true
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    discount_percentage: "",
    notes: ""
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDiscountDetail, setSelectedDiscountDetail] = useState(null);
  const [canManageDiscounts, setCanManageDiscounts] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [discountToChangeStatus, setDiscountToChangeStatus] = useState(null);

  useEffect(() => {
    fetchDiscounts();
    fetchCities();
    
    // Check user permissions
    try {
      const permissionsStr = localStorage.getItem('userPermissions');
      if (permissionsStr) {
        const permissions = JSON.parse(permissionsStr);
        setCanManageDiscounts(permissions.can_manage_discounts === 1 || permissions.role === 'admin');
      }
    } catch (err) {
      console.error('Failed to parse user permissions:', err);
    }
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await api.get("/api/discounts");
      if (res.data.ok) {
        setDiscounts(res.data.discounts);
      }
    } catch (err) {
      console.error("Failed to fetch discounts", err);
      showSnackbar(t('discount_management.failed_load_discounts'), "error");
    }
  };

  const fetchCities = async () => {
    try {
      const res = await api.get("/cities");
      setCities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch cities", err);
    }
  };

  const filteredDiscounts = discounts.filter((discount) => {
    if (!searchCode.trim()) return true;
    const search = searchCode.toLowerCase();
    return (
      discount.discount_code?.toLowerCase().includes(search) ||
      discount.name?.toLowerCase().includes(search) ||
      discount.phone?.toLowerCase().includes(search)
    );
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (discount = null) => {
    if (discount) {
      setEditMode(true);
      setCurrentDiscount(discount);
      setFormData({
        name: discount.name || "",
        phone: discount.phone || "",
        email: discount.email || "",
        city: discount.city || "",
        discount_percentage: discount.discount_percentage || "",
        notes: discount.notes || ""
      });
    } else {
      setEditMode(false);
      setCurrentDiscount(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        city: "",
        discount_percentage: "",
        notes: ""
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentDiscount(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      city: "",
      discount_percentage: "",
      notes: ""
    });
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSetPercentage = (percentage) => {
    setFormData({ ...formData, discount_percentage: percentage });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.discount_percentage) {
      showSnackbar(t('discount_management.validation_required'), "error");
      return;
    }

    try {
      if (editMode && currentDiscount) {
        await api.put(`/api/discounts/${currentDiscount.discount_id}`, formData);
        showSnackbar(t('discount_management.updated_successfully'));
      } else {
        // Get logged-in user info for created_by field
        const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
        await api.post("/api/discounts", {
          ...formData,
          created_by: userPermissions.id
        });
        showSnackbar(t('discount_management.created_successfully'));
      }
      fetchDiscounts();
      handleCloseDialog();
    } catch (err) {
      console.error("Failed to save discount", err);
      showSnackbar(t('discount_management.failed_save'), "error");
    }
  };

  const handleDeleteClick = (discount) => {
    setDiscountToDelete(discount);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete) return;

    try {
      await api.delete(`/api/discounts/${discountToDelete.discount_id}`);
      showSnackbar(t('discount_management.deleted_successfully'));
      fetchDiscounts();
    } catch (err) {
      console.error("Failed to delete discount", err);
      showSnackbar(t('discount_management.failed_delete'), "error");
    } finally {
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDiscountToDelete(null);
  };

  const handleRowClick = (params) => {
    setSelectedDiscountDetail(params.row);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedDiscountDetail(null);
  };

  const handleMarkAsUsed = async (discountId) => {
    if (!window.confirm(t('discount_management.mark_used_confirm'))) {
      return;
    }

    try {
      await api.post(`/api/discounts/${discountId}/use`);
      showSnackbar(t('discount_management.marked_used_successfully'));
      fetchDiscounts();
    } catch (err) {
      console.error("Failed to mark discount as used", err);
      showSnackbar(t('discount_management.failed_mark_used'), "error");
    }
  };

  const handleToggleStatusClick = (discount) => {
    // If changing from used (1) to active (0), show warning dialog
    if (discount.is_used === 1) {
      setDiscountToChangeStatus(discount);
      setStatusChangeDialogOpen(true);
    } else {
      // Directly mark as used without warning
      handleStatusChange(discount, 1);
    }
  };

  const handleStatusChange = async (discount, newStatus) => {
    try {
      await api.put(`/api/discounts/${discount.discount_id}`, {
        ...discount,
        is_used: newStatus,
        clear_used_at: newStatus === 0 // Flag to clear used_at when changing to active
      });
      showSnackbar(t('discount_management.status_changed_successfully'));
      fetchDiscounts();
    } catch (err) {
      console.error("Failed to change discount status", err);
      showSnackbar(t('discount_management.failed_status_change'), "error");
    }
  };

  const handleConfirmStatusChange = () => {
    if (discountToChangeStatus) {
      handleStatusChange(discountToChangeStatus, 0);
    }
    setStatusChangeDialogOpen(false);
    setDiscountToChangeStatus(null);
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialogOpen(false);
    setDiscountToChangeStatus(null);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    showSnackbar(t('discount_management.code_copied'));
  };

  const handleColumnVisibilityMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setColumnVisibilityMenuOpen(true);
  };

  const handleColumnVisibilityMenuClose = () => {
    setAnchorEl(null);
    setColumnVisibilityMenuOpen(false);
  };

  const handleToggleColumn = (field) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const columns = [
    { 
      field: "discount_code", 
      headerName: t('discount_management.discount_code'), 
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {params.value}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => handleCopyCode(params.value)}
            sx={{ padding: 0.5 }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Box>
      )
    },
    { 
      field: "name", 
      headerName: t('discount_management.name'), 
      flex: 1.2,
      minWidth: 150,
      hide: !columnVisibility.name
    },
    { 
      field: "phone", 
      headerName: t('discount_management.phone'), 
      flex: 1,
      minWidth: 120,
      hide: !columnVisibility.phone
    },
    { 
      field: "email", 
      headerName: t('discount_management.email'), 
      flex: 1.2,
      minWidth: 150,
      hide: !columnVisibility.email
    },
    { 
      field: "city", 
      headerName: t('discount_management.city'), 
      flex: 0.8,
      minWidth: 100,
      hide: !columnVisibility.city
    },
    { 
      field: "discount_percentage", 
      headerName: t('discount_management.discount_percentage'), 
      flex: 0.7,
      minWidth: 100,
      hide: !columnVisibility.discount_percentage,
      renderCell: (params) => `${params.value}%`
    },
    { 
      field: "is_used", 
      headerName: t('discount_management.status'), 
      flex: 0.8,
      minWidth: 100,
      hide: !columnVisibility.is_used,
      renderCell: (params) => (
        <Chip 
          label={params.value ? t('discount_management.status_used') : t('discount_management.status_active')} 
          color={params.value ? "default" : "success"}
          size="small"
        />
      )
    },
    { 
      field: "used_at", 
      headerName: t('discount_management.used_at'), 
      flex: 1,
      minWidth: 130,
      hide: !columnVisibility.used_at,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : '-'
    },
    { 
      field: "created_at", 
      headerName: t('discount_management.created'), 
      flex: 1,
      minWidth: 130,
      hide: !columnVisibility.created_at,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
    },
    {
      field: "actions",
      headerName: t('discount_management.actions'),
      flex: 1.2,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton 
            color="primary" 
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDialog(params.row);
            }}
            size="small"
            disabled={!canManageDiscounts}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton 
            color={params.row.is_used ? "warning" : "success"}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatusClick(params.row);
            }}
            size="small"
            title={params.row.is_used ? t('discount_management.change_to_active') : t('discount_management.change_to_used')}
            disabled={!canManageDiscounts}
          >
            <CheckCircle fontSize="small" />
          </IconButton>
          <IconButton 
            color="error" 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(params.row);
            }}
            size="small"
            disabled={!canManageDiscounts}
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      )
    }
  ];

  return (
    <>
      <DrawerComponent />

      <Box
        sx={{
          minHeight: "90vh",
          pt: 4,
          pb: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start"
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "min(1400px, 95%)",
            padding: 3,
            borderRadius: 2
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Percent sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight="bold">
                {t('discount_management.title')}
              </Typography>
            </Stack>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ textTransform: "none" }}
              disabled={!canManageDiscounts}
            >
              {t('discount_management.create_discount')}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('discount_management.description')}
          </Typography>

          {!canManageDiscounts && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('discount_management.no_permission_warning')}
            </Alert>
          )}

          <Box display="flex" gap={2} mb={2} alignItems="center">
            <TextField
              label={t('discount_management.search_code')}
              placeholder={t('discount_management.search_placeholder')}
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
            <IconButton 
              onClick={handleColumnVisibilityMenuOpen}
              sx={{ 
                border: 1, 
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              title={t('discount_management.column_visibility')}
            >
              <Settings />
            </IconButton>
          </Box>

          <DataGrid
            rows={filteredDiscounts}
            columns={columns.filter(col => col.field === 'actions' || !col.hide)}
            getRowId={(row) => row.discount_id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight
            onRowClick={handleRowClick}
            sx={{
              "& .MuiDataGrid-cell": {
                padding: "8px"
              },
              "& .MuiDataGrid-row": {
                cursor: "pointer"
              }
            }}
          />
        </Paper>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode ? t('discount_management.edit_discount') : t('discount_management.create_new_discount')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label={t('discount_management.customer_name')}
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />

            <TextField
              label={t('discount_management.phone_number')}
              fullWidth
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />

            <TextField
              label={t('discount_management.email_label')}
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />

            <TextField
              select
              label={t('discount_management.city_label')}
              fullWidth
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            >
              {cities.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('discount_management.discount_percentage_required')}
              </Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <Button
                  variant={formData.discount_percentage === 5 ? "contained" : "outlined"}
                  onClick={() => handleSetPercentage(5)}
                  size="small"
                >
                  5%
                </Button>
                <Button
                  variant={formData.discount_percentage === 10 ? "contained" : "outlined"}
                  onClick={() => handleSetPercentage(10)}
                  size="small"
                >
                  10%
                </Button>
                <Button
                  variant={formData.discount_percentage === 15 ? "contained" : "outlined"}
                  onClick={() => handleSetPercentage(15)}
                  size="small"
                >
                  15%
                </Button>
              </Stack>
              <TextField
                label={t('discount_management.custom_percentage')}
                fullWidth
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => handleInputChange("discount_percentage", parseFloat(e.target.value))}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Box>

            <TextField
              label={t('discount_management.notes')}
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder={t('discount_management.notes_placeholder')}
            />

            {editMode && currentDiscount && (
              <Box sx={{ 
                mt: 1, 
                p: 2, 
                bgcolor: "action.hover", 
                borderRadius: 1,
                border: 1,
                borderColor: "divider"
              }}>
                <Typography variant="caption" color="text.secondary">
                  {t('discount_management.discount_code_readonly')}
                </Typography>
                <Typography variant="body1" fontFamily="monospace" fontWeight="bold">
                  {currentDiscount.discount_code}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('discount_management.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? t('discount_management.update') : t('discount_management.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('discount_management.delete_dialog_title')}
        message={discountToDelete ? t('discount_management.delete_dialog_message', { 
          code: discountToDelete.discount_code,
          name: discountToDelete.name 
        }) : ''}
        confirmText={t('discount_management.delete')}
        cancelText={t('discount_management.cancel')}
      />

      {/* Status Change Confirmation Dialog */}
      <ConfirmationDialog
        open={statusChangeDialogOpen}
        onClose={handleCancelStatusChange}
        onConfirm={handleConfirmStatusChange}
        title={t('discount_management.status_change_dialog_title')}
        message={discountToChangeStatus ? t('discount_management.status_change_dialog_message', {
          code: discountToChangeStatus.discount_code,
          name: discountToChangeStatus.name
        }) : ''}
        confirmText={t('discount_management.confirm')}
        cancelText={t('discount_management.cancel')}
      />

      {/* Detail View Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetailDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('discount_management.discount_details')}</DialogTitle>
        <DialogContent>
          {selectedDiscountDetail && (
            <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.discount_code')}
                </Typography>
                <Chip 
                  label={selectedDiscountDetail.discount_code} 
                  color="primary" 
                  sx={{ fontFamily: 'monospace', fontWeight: 'bold', mt: 0.5 }}
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.name')}
                </Typography>
                <Typography variant="body1">{selectedDiscountDetail.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.phone')}
                </Typography>
                <Typography variant="body1">{selectedDiscountDetail.phone}</Typography>
              </Box>
              
              {selectedDiscountDetail.email && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('discount_management.email')}
                  </Typography>
                  <Typography variant="body1">{selectedDiscountDetail.email}</Typography>
                </Box>
              )}
              
              {selectedDiscountDetail.city && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('discount_management.city')}
                  </Typography>
                  <Typography variant="body1">{selectedDiscountDetail.city}</Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.discount_percentage')}
                </Typography>
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  {selectedDiscountDetail.discount_percentage}%
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.status')}
                </Typography>
                <Chip 
                  label={selectedDiscountDetail.is_used ? t('discount_management.status_used') : t('discount_management.status_active')} 
                  color={selectedDiscountDetail.is_used ? "default" : "success"}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              
              {selectedDiscountDetail.used_at && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('discount_management.used_at')}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedDiscountDetail.used_at).toLocaleString()}
                  </Typography>
                </Box>
              )}
              
              {selectedDiscountDetail.is_used && selectedDiscountDetail.used_by_name && (
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.primary" fontWeight="bold" gutterBottom>
                    {t('discount_management.used_by_customer')}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    <strong>{t('discount_management.name')}:</strong> {selectedDiscountDetail.used_by_name}
                  </Typography>
                  {selectedDiscountDetail.used_by_phone && (
                    <Typography variant="body2" color="text.primary">
                      <strong>{t('discount_management.phone')}:</strong> {selectedDiscountDetail.used_by_phone}
                    </Typography>
                  )}
                  {selectedDiscountDetail.applied_by_employee_name && (
                    <Typography variant="body2" color="text.primary" sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <strong>{t('discount_management.applied_by_employee')}:</strong> {selectedDiscountDetail.applied_by_employee_name}
                    </Typography>
                  )}
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('discount_management.created')}
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedDiscountDetail.created_at).toLocaleString()}
                </Typography>
                {selectedDiscountDetail.created_by && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('discount_management.created_by')}: {selectedDiscountDetail.created_by}
                  </Typography>
                )}
              </Box>
              
              {selectedDiscountDetail.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('discount_management.notes')}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedDiscountDetail.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>{t('discount_management.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Column Visibility Menu */}
      <Menu
        anchorEl={anchorEl}
        open={columnVisibilityMenuOpen}
        onClose={handleColumnVisibilityMenuClose}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {t('discount_management.show_columns')}
          </Typography>
        </Box>
        {[
          { field: 'name', label: t('discount_management.name') },
          { field: 'phone', label: t('discount_management.phone') },
          { field: 'email', label: t('discount_management.email') },
          { field: 'city', label: t('discount_management.city') },
          { field: 'discount_percentage', label: t('discount_management.discount_percentage') },
          { field: 'discount_code', label: t('discount_management.discount_code') },
          { field: 'is_used', label: t('discount_management.status') },
          { field: 'created_at', label: t('discount_management.created') }
        ].map((col) => (
          <MenuItem key={col.field} onClick={() => handleToggleColumn(col.field)}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={columnVisibility[col.field]} 
                  onChange={() => handleToggleColumn(col.field)}
                />
              }
              label={col.label}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default DiscountManagement;
