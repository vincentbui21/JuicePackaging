import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box, TextField, Stack, Button, Tooltip, Chip, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, MenuItem, Snackbar, Paper,
  Typography, IconButton, Card, CardContent, useMediaQuery, useTheme,
  Checkbox, FormControlLabel, Popover, CssBaseline, Menu,
} from '@mui/material';
import {
  Edit, Delete, QrCode, Send, Print, Trolley, Inventory, Settings,
  MoreVert as MoreVertIcon, Percent,
} from '@mui/icons-material';
import api from '../services/axios';
import generateQRCode from '../services/qrcodGenerator';
import printImage from '../services/send_to_printer';
import DrawerComponent from '../components/drawer';
import QRCodeDialog from '../components/qrcodeDialog';
import ConfirmationDialog from '../components/ConfirmationDialog';

const isReadyForPickup = (s) => String(s || '').toLowerCase() === 'ready for pickup';

// Small chip component that fetches /customers/:id/sms-status
function SmsStatusChip({ customerId, refreshKey }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
        setLoading(true);
        const { data } = await api.get(`/customers/${customerId}/sms-status`);
        setStatus(data);
        } catch (e) {
        console.error('sms-status fetch failed:', e);
        setStatus({ last_status: 'not_sent', sent_count: 0 });
        } finally {
        setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const sent = String(status?.last_status || '').toLowerCase() === 'sent';
    const count = Number(status?.sent_count || 0);

    return (
        <Chip
        size="small"
        color={sent ? 'success' : 'default'}
        variant={sent ? 'filled' : 'outlined'}
        label={sent ? t('unified_mgmt.sms_sent', { count }) : t('unified_mgmt.sms_not_sent')}
        />
    );
    }

    export default function UnifiedManagement() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Edit dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editedFields, setEditedFields] = useState({
        // Customer fields
        name: '',
        email: '',
        phone: '',
        city: '',
        weight_kg: '',
        crate_count: '',
        total_cost: '',
        status: '',
        notes: '',
        // Order fields
        estimated_pouches: '',
        estimated_boxes: '',
    });

    // QR for crates
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [crateIds, setCrateIds] = useState([]);
    const [customerForwardName, setCustomerForwardName] = useState('');
    const [maxCrates, setMaxCrates] = useState('');

    // QR for boxes (from JuiceProcessingManagement)
    const [qrCodes, setQrCodes] = useState({});

    // Delete confirmation dialog
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, row: null });
    const [qrDialogOpenBoxes, setQrDialogOpenBoxes] = useState(false);
    const [qrDialogOrderId, setQrDialogOrderId] = useState(null);

    // Snackbar
    const [snackbarMsg, setSnackbarMsg] = useState('');

    // Discount dialog states
    const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
    const [availableDiscounts, setAvailableDiscounts] = useState([]);
    const [discountSearch, setDiscountSearch] = useState('');
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [originalPrice, setOriginalPrice] = useState(0);
    const [discountMismatchDialogOpen, setDiscountMismatchDialogOpen] = useState(false);
    const [pendingDiscount, setPendingDiscount] = useState(null);

    // Refresh key for SMS
    const [smsRefreshTick, setSmsRefreshTick] = useState(0);

    // Progress dialog states
    const [progressDialogOpen, setProgressDialogOpen] = useState(false);
    const [progressDialogRow, setProgressDialogRow] = useState(null);
    const [statusHistory, setStatusHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Column visibility - load from localStorage or use defaults
    const getInitialColumnVisibility = () => {
        try {
            const saved = localStorage.getItem('unifiedManagementColumnVisibility');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (err) {
            console.error('Failed to load column visibility from localStorage', err);
        }
        // Default visibility
        return {
            order_id: false,
            name: true,
            phone: true,
            weight_kg: true,
            crate_count: true,
            estimated_pouches: true,
            estimated_boxes: true,
            total_cost: true,
            city: true,
            created_at: false,
            status: true,
            sms_status: true,
            notes: true,
        };
    };

    const [columnVisibility, setColumnVisibility] = useState(getInitialColumnVisibility());

    // Save column visibility to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('unifiedManagementColumnVisibility', JSON.stringify(columnVisibility));
        } catch (err) {
            console.error('Failed to save column visibility to localStorage', err);
        }
    }, [columnVisibility]);

    const [cities, setCities] = useState([]);
    const [canEditCustomers, setCanEditCustomers] = useState(false);
    const [allowedCities, setAllowedCities] = useState([]);

    // Popover for column settings
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // Menu for row actions
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [activeRow, setActiveRow] = useState(null);

    const reload = () => setSmsRefreshTick((n) => n + 1);

    const computeFromWeight = (weight_kg) => {
        const w = Number(weight_kg) || 0;
        const estimatedPouches = Math.floor((w * 0.65) / 3);
        const estimatedBoxes = Math.ceil(estimatedPouches / 8);
        return { estimatedPouches, estimatedBoxes };
    };

    useEffect(() => {
        const fetchCities = async () => {
        try {
            const response = await api.get('/cities');
            if (Array.isArray(response.data)) {
            setCities(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch cities', err);
            setSnackbarMsg(t('unified_mgmt.failed_load_cities'));
        }
        };
        fetchCities();

        // Load edit permission and allowed cities
        try {
            const permissionsStr = localStorage.getItem('userPermissions');
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr);
                setCanEditCustomers(permissions.can_edit_customers === 1 || permissions.role === 'admin');
                
                // Set allowed cities - if user is admin or has no restrictions, allow all cities
                if (permissions.role === 'admin' || !permissions.allowed_cities || permissions.allowed_cities.length === 0) {
                    setAllowedCities([]);
                } else {
                    setAllowedCities(permissions.allowed_cities);
                }
            }
        } catch (err) {
            console.error('Failed to parse user permissions:', err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
        const response = await api.get('/customer', {
            params: {
            page: 1,
            limit: 1000,
            t: new Date().getTime(),
            },
            headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            },
        });
        const data = response.data.rows || [];
        console.log('--- DEBUG: Data received from API in fetchData ---');
        console.log(JSON.stringify(data, null, 2));
        const enriched = data.map((row) => {
            const { estimatedPouches, estimatedBoxes } = computeFromWeight(row.weight_kg);
            return {
            ...row,
            estimated_pouches: row?.actual_pouches ?? row?.pouches_count ?? estimatedPouches,
            estimated_boxes: row?.boxes_count ?? estimatedBoxes,
            };
        });

        // Filter by allowed cities if user has city restrictions
        const filteredData = allowedCities.length > 0
            ? enriched.filter(row => allowedCities.includes(row.city))
            : enriched;

        setRows(filteredData);
        } catch (err) {
        console.error('Failed to fetch data', err);
        setSnackbarMsg(t('unified_mgmt.failed_fetch_data'));
        } finally {
        setLoading(false);
        }
    }, [allowedCities]);

    const fetchAvailableDiscounts = async () => {
        try {
            const res = await api.get('/api/discounts');
            if (res.data.ok) {
                // Only show active (unused) discounts
                const active = res.data.discounts.filter(d => !d.is_used);
                setAvailableDiscounts(active);
            }
        } catch (err) {
            console.error('Failed to fetch discounts', err);
            setAvailableDiscounts([]);
        }
    };

    useEffect(() => {
        fetchData();

        const handleCustomersUpdate = () => fetchData();
        window.addEventListener('customers-updated', handleCustomersUpdate);

        return () => {
        window.removeEventListener('customers-updated', handleCustomersUpdate);
        };
    }, [fetchData]);

    // Edit handlers
    const openEditDialog = (row) => {
        setSelectedRow(row);
        setEditedFields({
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        city: row.city || '',
        weight_kg: row.weight_kg || '',
        crate_count: row.crate_count || '',
        total_cost: row.total_cost || '',
        status: row.status || '',
        notes: row.notes || '',
        estimated_pouches: row.estimated_pouches || '',
        estimated_boxes: row.estimated_boxes || '',
        });
        setEditDialogOpen(true);
    };

    const handleEditSave = async () => {
        if (!selectedRow) return;

        try {
        const customerInfoChange = {
            Name: editedFields.name,
            email: editedFields.email,
            phone: editedFields.phone,
            city: editedFields.city,
        };

        const orderInfoChange = {
            ...selectedRow, // Preserve all original fields
            weight: editedFields.weight_kg,
            crate: editedFields.crate_count,
            cost: editedFields.total_cost,
            Status: editedFields.status,
            Notes: editedFields.notes,
        };
        
        // Remove customer-specific fields from orderInfoChange to avoid conflicts
        delete orderInfoChange.name;
        delete orderInfoChange.email;
        delete orderInfoChange.phone;
        delete orderInfoChange.city;
        delete orderInfoChange.customer_id;


        await api.put('/customer', {
            customer_id: selectedRow.customer_id,
            customerInfoChange,
            orderInfoChange,
        });

        if (selectedRow.order_id) {
            await api.put(`/orders/${selectedRow.order_id}`, {
            actual_pouches: Number(editedFields.estimated_pouches),
            actual_boxes: Number(editedFields.estimated_boxes),
            });
        }

        // Mark discount as used only after successfully saving
        if (editedFields.applied_discount_id) {
            const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
            await api.post(`/api/discounts/${editedFields.applied_discount_id}/use`, {
                used_by_customer_id: selectedRow.customer_id,
                used_by_name: editedFields.name,
                used_by_phone: editedFields.phone,
                applied_by_employee_id: userPermissions.id,
                applied_by_employee_name: userPermissions.name || userPermissions.id
            });
        }

        setSnackbarMsg(t('unified_mgmt.updated_successfully'));
        fetchData();
        } catch (err) {
        console.error('Failed to update', err);
        setSnackbarMsg(t('unified_mgmt.failed_update'));
        }
        setEditDialogOpen(false);
    };

    // Delete handler
    const handleDeleteClick = (row) => {
        setDeleteConfirmDialog({ open: true, row });
    };

    const handleConfirmDelete = async () => {
        const row = deleteConfirmDialog.row;
        setDeleteConfirmDialog({ open: false, row: null });

        try {
            await api.delete('/customer', { data: { customer_id: row.customer_id } });
            setSnackbarMsg(t('unified_mgmt.customer_moved_bin'));
            fetchData();
        } catch (err) {
            console.error('Delete failed', err);
            setSnackbarMsg(t('unified_mgmt.failed_delete'));
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmDialog({ open: false, row: null });
    };

    // Discount Dialog Handlers
    const handleOpenDiscountDialog = () => {
        setOriginalPrice(parseFloat(editedFields.total_cost) || 0);
        fetchAvailableDiscounts();
        setDiscountDialogOpen(true);
    };

    const handleCloseDiscountDialog = () => {
        setDiscountDialogOpen(false);
        setDiscountSearch('');
        setSelectedDiscount(null);
    };

    // Check if strings are similar (case-insensitive, ignores extra spaces)
    const isSimilar = (str1, str2) => {
        if (!str1 || !str2) return false;
        const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
        return normalize(str1) === normalize(str2);
    };

    const handleApplyDiscount = () => {
        if (!selectedDiscount) return;
        
        // Check if name or phone match
        const nameMatches = isSimilar(editedFields.name, selectedDiscount.name);
        const phoneMatches = isSimilar(editedFields.phone, selectedDiscount.phone);
        
        // If neither matches, show warning dialog
        if (!nameMatches && !phoneMatches) {
            setPendingDiscount(selectedDiscount);
            setDiscountMismatchDialogOpen(true);
            return;
        }
        
        // Apply discount directly if match found
        applyDiscountToOrder(selectedDiscount);
    };

    const applyDiscountToOrder = (discount) => {
        const discountAmount = (originalPrice * discount.discount_percentage) / 100;
        const newPrice = originalPrice - discountAmount;
        
        // Store the discount ID, percentage, and update the price (don't mark as used yet)
        setEditedFields(prev => ({
            ...prev,
            total_cost: newPrice.toFixed(2),
            applied_discount_id: discount.discount_id,
            applied_discount_percentage: discount.discount_percentage
        }));
        
        setSnackbarMsg(t('unified_mgmt.discount_applied'));
        handleCloseDiscountDialog();
        setDiscountMismatchDialogOpen(false);
        setPendingDiscount(null);
    };

    const handleConfirmMismatchDiscount = () => {
        if (pendingDiscount) {
            applyDiscountToOrder(pendingDiscount);
        }
    };

    const handleCancelMismatchDiscount = () => {
        setDiscountMismatchDialogOpen(false);
        setPendingDiscount(null);
    };

    // QR for crates
    const handleCrateQRPrint = async (row) => {
        setMaxCrates(row.crate_count);
        try {
        const response = await api.get('/crates', { params: { customer_id: row.customer_id } });
        if (response.data && Array.isArray(response.data.crates)) {
            setCrateIds(response.data.crates.map((c) => c.crate_id));
            setCustomerForwardName(row.name);
            setQrDialogOpen(true);
        }
        } catch (error) {
        console.error('Failed to fetch crate IDs:', error);
        setSnackbarMsg(t('unified_mgmt.failed_fetch_crates'));
        }
    };

    // QR for boxes
    const handleShowQR = async (row) => {
        if (!row.order_id) {
        setSnackbarMsg(t('unified_mgmt.no_order_found'));
        return;
        }
        const boxesToUse = Number(row.estimated_boxes) || 0;
        if (boxesToUse === 0) {
        setSnackbarMsg(t('unified_mgmt.no_boxes_generate'));
        return;
        }
        try {
        const codes = [];
        for (let i = 0; i < boxesToUse; i++) {
            const url = await generateQRCode(`BOX_${row.order_id}_${i + 1}`);
            if (url) codes.push({ index: i + 1, url });
        }
        if (codes.length === 0) {
            setSnackbarMsg(t('unified_mgmt.failed_generate_qr'));
            return;
        }
        setQrCodes((prev) => ({
            ...prev,
            [row.order_id]: {
            pouches: row.estimated_pouches,
            boxes: boxesToUse,
            codes,
            },
        }));
        setQrDialogOrderId(row.order_id);
        setQrDialogOpenBoxes(true);
        setSnackbarMsg(t('unified_mgmt.qr_codes_generated'));
        } catch (e) {
        console.error(e);
        setSnackbarMsg(t('unified_mgmt.failed_generate_qr'));
        }
    };

    const printPouchLabels = async (row) => {
        try {
        const customer = row.name || 'Unknown';
        const now = new Date();
        const exp = new Date(now);
        exp.setFullYear(exp.getFullYear() + 1);
        const dd = String(exp.getDate()).padStart(2, '0');
        const mm = String(exp.getMonth() + 1).padStart(2, '0');
        const yyyy = exp.getFullYear();
        const expiryDate = `${dd}/${mm}/${yyyy}`;

        await api.post('/printer/print-pouch', {
            customer,
            productionDate: expiryDate,
            expiryDate,
        });

        setSnackbarMsg(t('unified_mgmt.pouch_print_sent'));
        } catch (e) {
        console.error('printPouchLabels failed', e);
        setSnackbarMsg(t('unified_mgmt.failed_print_pouch'));
        }
    };

    // Send SMS
    const handleNotifySMS = async (row) => {
        if (!isReadyForPickup(row.status)) {
        alert(t('unified_mgmt.sms_ready_only'));
        return;
        }
        try {
        const res = await api.post(`/customers/${row.customer_id}/notify`, {});
        setSnackbarMsg(res.data?.message || t('unified_mgmt.sms_attempted'));
        reload();
        } catch (e) {
        console.error('Notify failed', e);
        setSnackbarMsg(t('unified_mgmt.sms_failed'));
        }
    };

    const handlePrintTrackingNumber = (row) => {
        if (!row || !row.is_from_reservation) return;

        // Use order ID directly as tracking number
        const trackingNumber = row.order_id;
        const printData = {
            trackingNumber,
            customerName: row.name,
            orderDate: dayjs(row.created_at).format('MMMM D, YYYY [at] HH:mm'),
            weight: `${row.weight_kg} kg`,
            phone: row.phone,
        };

        // Send to backend for printing
        api.post('/printer/print-reservation-tracking', printData)
            .then(() => {
                setSnackbarMsg('Tracking number sent to printer');
            })
            .catch((error) => {
                console.error('Failed to print tracking number:', error);
                setSnackbarMsg('Failed to print tracking number');
            });
    };

    // Menu handlers for row actions
    const handleMenuOpen = (event, row) => {
        setMenuAnchorEl(event.currentTarget);
        setActiveRow(row);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setActiveRow(null);
    };

    // Wrapped action handlers
    const handleEditAction = () => {
        if (activeRow) openEditDialog(activeRow);
        handleMenuClose();
    };

    const handleDeleteAction = () => {
        if (activeRow) handleDeleteClick(activeRow);
        handleMenuClose();
    };

    const handleCrateQRPrintAction = () => {
        if (activeRow) handleCrateQRPrint(activeRow);
        handleMenuClose();
    };

    const handleShowQRAction = () => {
        if (activeRow) handleShowQR(activeRow);
        handleMenuClose();
    };

    const printPouchLabelsAction = () => {
        if (activeRow) printPouchLabels(activeRow);
        handleMenuClose();
    };

    const handlePrintTrackingNumberAction = () => {
        if (activeRow) handlePrintTrackingNumber(activeRow);
        handleMenuClose();
    };

    const handleNotifySMSAction = () => {
        if (activeRow) handleNotifySMS(activeRow);
        handleMenuClose();
    };

    // Handle row click to open progress dialog
    const handleRowClick = (params, event) => {
        // Don't open dialog if clicking on actions button or any button/interactive element
        const target = event.target;
        const isButton = target.closest('button') || target.closest('[role="button"]');
        if (isButton) {
            return;
        }
        setProgressDialogRow(params.row);
        setProgressDialogOpen(true);
        
        // Fetch status history
        fetchStatusHistory(params.row.customer_id);
    };

    const fetchStatusHistory = async (customerId) => {
        try {
            setLoadingHistory(true);
            const { data } = await api.get(`/customers/${customerId}/status-history`);
            setStatusHistory(data);
        } catch (error) {
            console.error('Failed to fetch status history:', error);
            setStatusHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en-GB');
        return `${time} ${dateStr}`;
    };

    const columns = [
        {
        field: 'actions',
        headerName: t('unified_mgmt.actions'),
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <IconButton
            aria-label="more"
            aria-controls="long-menu"
            aria-haspopup="true"
            onClick={(event) => handleMenuOpen(event, params.row)}
            >
            <MoreVertIcon />
            </IconButton>
        ),
        },
        { field: 'order_id', headerName: t('unified_mgmt.order_id'), minWidth: 180, flex: 0.5 },
        { field: 'name', headerName: t('unified_mgmt.name'), minWidth: 120, flex: 1 },
        // { field: 'email', headerName: 'Email', minWidth: 150, flex: 1.5, hide: isMobile },
        { field: 'phone', headerName: t('unified_mgmt.phone'), minWidth: 120, flex: 1 },
        { field: 'weight_kg', headerName: t('unified_mgmt.weight_kg'), minWidth: 100, flex: 0.6 },
        { field: 'crate_count', headerName: t('unified_mgmt.crates'), minWidth: 70, flex: 0.5 },
        { field: 'estimated_pouches', headerName: t('unified_mgmt.pouches'), minWidth: 80, flex: 0.6 },
        { field: 'estimated_boxes', headerName: t('unified_mgmt.boxes'), minWidth: 70, flex: 0.5 },
        { field: 'total_cost', headerName: t('unified_mgmt.cost'), minWidth: 80, flex: 0.6 },
        { field: 'city', headerName: t('unified_mgmt.city'), minWidth: 100, flex: 0.8, hide: isMobile },
        { field: 'created_at', headerName: t('unified_mgmt.date'), minWidth: 120, flex: 1, hide: isMobile },
        { field: 'status', headerName: t('unified_mgmt.status'), minWidth: 110, flex: 0.8 },
        {
        field: 'sms_status',
        headerName: t('unified_mgmt.sms'),
        minWidth: 100,
        flex: 0.7,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <SmsStatusChip customerId={params.row.customer_id} refreshKey={smsRefreshTick} />
        ),
        },
        { field: 'notes', headerName: t('unified_mgmt.notes'), minWidth: 150, flex: 1.2, hide: isMobile },
    ];

    const filteredRows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(search.toLowerCase()),
    );

    const currentQrData = qrDialogOrderId ? qrCodes[qrDialogOrderId] : null;

    const printSingleQRCode = async (orderId, url, index) => {
        const order = rows.find((o) => o.order_id === orderId);
        try {
        await printImage(url, order?.name || 'Customer', `b${index}/1`);
        setSnackbarMsg(t('unified_mgmt.box_sent_printer', { index }));
        } catch (e) {
        console.error('Single print failed', e);
        setSnackbarMsg(t('unified_mgmt.failed_print_qr'));
        }
    };

    const printAllQRCodes = async (orderId) => {
        const order = rows.find((o) => o.order_id === orderId);
        const data = qrCodes[orderId];
        if (!data || !data.codes?.length) return;

        try {
        const total = data.codes.length;
        for (const { index, url } of data.codes) {
            await printImage(url, order?.name || 'Customer', `b${index}/${total}`);
        }
        setSnackbarMsg(t('unified_mgmt.all_qr_sent'));
        } catch (e) {
        console.error('Print all failed', e);
        setSnackbarMsg(t('unified_mgmt.failed_print_all'));
        }
    };

    return (
        <Box 
        sx={{ display: 'flex' }}
        >
            
        <CssBaseline />
        <DrawerComponent />
            <Box
                component="main"
                display="flex" justifyContent="center" sx={{ flexDirection: 'column', alignItems: 'center' }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        width: '100%',
                        maxWidth: '1400px', // Constrain max width of the content
                        mx: 'auto', // Center the paper horizontally
                        p: isMobile ? 2 : 3, // Padding inside the paper
                    }}
                >
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ textAlign: 'center', mb: isMobile ? 2 : 3, fontWeight: 'bold' }}>
                        {t('unified_mgmt.title')}
                    </Typography>

                    {allowedCities.length > 0 && (
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                            <Typography color="info.main" sx={{ fontWeight: 500 }}>
                                🔒 {t('unified_mgmt.viewing_customers')}: {allowedCities.join(', ')}
                            </Typography>
                        </Box>
                    )}
    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                            label={t('unified_mgmt.search_by_name')}
                            variant="outlined"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            fullWidth
                            sx={{ mr: 2, flexGrow: 1 }}
                        />
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                            <Settings />
                        </IconButton>
                    </Box>
                    
    
                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Box sx={{ p: 2, minWidth: 200 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>{t('unified_mgmt.show_hide_columns')}</Typography>
                            <Stack direction="column" spacing={1}>
                                {Object.keys(columnVisibility).map(field => {
                                    const col = columns.find(c => c.field === field);
                                    return col ? (
                                        <FormControlLabel
                                            key={field}
                                            control={
                                                <Checkbox
                                                    checked={columnVisibility[field]}
                                                    onChange={(e) => setColumnVisibility(prev => ({ ...prev, [field]: e.target.checked }))}
                                                    size="small"
                                                />
                                            }
                                            label={col.headerName}
                                        />
                                    ) : null;
                                })}
                            </Stack>
                        </Box>
                    </Popover>
                </Paper>

            
                <DataGrid
                            autoHeight
                            rows={filteredRows}
                            columns={columns}
                            getRowId={(row) => row.customer_id}
                            pageSizeOptions={isMobile ? [5, 10] : [10, 20, 50]}
                            initialState={{
                                pagination: {
                                paginationModel: { pageSize: isMobile ? 5 : 10 },
                                },
                            }}
                            loading={loading}
                            columnVisibilityModel={columnVisibility}
                            onRowClick={handleRowClick}
                            onColumnVisibilityModelChange={setColumnVisibility}
                            sx={{
                                minWidth: 0,
                                '& .MuiDataGrid-row': {
                                    cursor: 'pointer',
                                },
                            }}
                        />
        </Box>

        {/* Menu for row actions */}
        <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleEditAction}>
            <Edit fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.edit')}
            </MenuItem>
            <MenuItem onClick={handleDeleteAction}>
            <Delete fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.delete')}
            </MenuItem>
            <MenuItem onClick={handleCrateQRPrintAction}>
            <Trolley fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.print_crate_qr')}
            </MenuItem>
            <MenuItem onClick={handleShowQRAction}>
            <Inventory fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.print_box_qr')}
            </MenuItem>
            <MenuItem onClick={printPouchLabelsAction}>
            <Print fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.print_pouch_label')}
            </MenuItem>
            {activeRow && activeRow.is_from_reservation && (
            <MenuItem onClick={handlePrintTrackingNumberAction}>
                <Print fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.print_tracking_number')}
            </MenuItem>
            )}
            {activeRow && isReadyForPickup(activeRow.status) && (
            <MenuItem onClick={handleNotifySMSAction}>
                <Send fontSize="small" sx={{ mr: 1 }} /> {t('unified_mgmt.send_sms')}
            </MenuItem>
            )}
        </Menu>

        {/* Edit dialog */}
        <Dialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
        >
            <DialogTitle>{t('unified_mgmt.edit_customer_order')}</DialogTitle>
            <DialogContent>
            {!canEditCustomers && (
                <Typography color="warning.main" sx={{ mb: 2, mt: 1 }}>
                    {t('unified_mgmt.view_only_access')}
                </Typography>
            )}
            <Stack spacing={isMobile ? 1 : 2} mt={1}>
                <TextField
                label={t('unified_mgmt.name')}
                value={editedFields.name}
                onChange={(e) => setEditedFields((p) => ({ ...p, name: e.target.value }))}
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.email')}
                value={editedFields.email}
                onChange={(e) => setEditedFields((p) => ({ ...p, email: e.target.value }))}
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.phone')}
                value={editedFields.phone}
                onChange={(e) => setEditedFields((p) => ({ ...p, phone: e.target.value }))}
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                select
                label={t('unified_mgmt.city')}
                value={editedFields.city}
                onChange={(e) => setEditedFields((p) => ({ ...p, city: e.target.value }))}
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                disabled={!canEditCustomers}
                >
                {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                    {city}
                    </MenuItem>
                ))}
                </TextField>
                <TextField
                label={t('unified_mgmt.weight_kg')}
                type="number"
                value={editedFields.weight_kg}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, weight_kg: e.target.value }))
                }
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.crates')}
                type="number"
                value={editedFields.crate_count}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, crate_count: e.target.value }))
                }
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.cost')}
                type="number"
                value={editedFields.total_cost}
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ 
                    readOnly: true,
                    startAdornment: editedFields.applied_discount_percentage ? (
                        <Chip
                            icon={<Percent fontSize="small" />}
                            label={`${editedFields.applied_discount_percentage}%`}
                            size="small"
                            color="success"
                            sx={{ mr: 1 }}
                        />
                    ) : null,
                    endAdornment: canEditCustomers && editedFields.status?.toLowerCase() !== 'picked up' ? (
                        <Button 
                            size="small" 
                            onClick={handleOpenDiscountDialog}
                            sx={{ ml: 1 }}
                        >
                            {t('unified_mgmt.apply_discount')}
                        </Button>
                    ) : null
                }}
                helperText={editedFields.status?.toLowerCase() === 'picked up' ? t('unified_mgmt.discount_not_available_picked_up') : ''}
                />
                <TextField
                select
                label={t('unified_mgmt.status')}
                value={editedFields.status}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, status: e.target.value }))
                }
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                disabled={!canEditCustomers}
                >
                {['Created', 'Picked up', 'Ready for pickup', 'Processing complete', 'In Progress'].map(
                    (option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                    ),
                )}
                </TextField>
                <TextField
                label={t('unified_mgmt.notes')}
                value={editedFields.notes}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, notes: e.target.value }))
                }
                fullWidth
                multiline
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.estimated_pouches')}
                type="number"
                value={editedFields.estimated_pouches}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, estimated_pouches: e.target.value }))
                }
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
                <TextField
                label={t('unified_mgmt.estimated_boxes')}
                type="number"
                value={editedFields.estimated_boxes}
                onChange={(e) =>
                    setEditedFields((p) => ({ ...p, estimated_boxes: e.target.value }))
                }
                fullWidth
                size={isMobile ? 'small' : 'medium'}
                InputProps={{ readOnly: !canEditCustomers }}
                />
            </Stack>
            </DialogContent>
            <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>{t('unified_mgmt.cancel')}</Button>
            <Button 
                variant="contained" 
                onClick={handleEditSave}
                disabled={!canEditCustomers}
                color={canEditCustomers ? 'primary' : 'error'}
            >
                {canEditCustomers ? t('unified_mgmt.save') : t('unified_mgmt.no_edit_permission')}
            </Button>
            </DialogActions>
        </Dialog>

        {/* Crate QR dialog */}
        <QRCodeDialog
            open={qrDialogOpen}
            onClose={() => setQrDialogOpen(false)}
            data={crateIds}
            name={customerForwardName}
            max={maxCrates}
        />

        {/* Box QR dialog */}
        <Dialog
            open={qrDialogOpenBoxes}
            onClose={() => setQrDialogOpenBoxes(false)}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
        >
        <DialogTitle>{t('unified_mgmt.qr_codes_order', { orderId: qrDialogOrderId })}</DialogTitle>
        <DialogContent dividers>
            {currentQrData ? (
                <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {t('unified_mgmt.pouches')}: {currentQrData.pouches} &nbsp; • &nbsp; {t('unified_mgmt.boxes')}:{' '}
                    {currentQrData.boxes}
                </Typography>
                <Stack direction="row" spacing={isMobile ? 1 : 2} flexWrap="wrap">
                    {currentQrData.codes.map(({ index, url }) => (
                    <Card
                        key={index}
                        sx={{
                        p: isMobile ? 0.5 : 1,
                        minWidth: isMobile ? 140 : 160,
                        }}
                    >
                        <CardContent
                        sx={{ textAlign: 'center', p: isMobile ? 1 : 2 }}
                        >
                        <Typography variant="body2">{t('unified_mgmt.box_number', { number: index })}</Typography>
                        <img
                            src={url}
                            alt={`QR ${index}`}
                            style={{
                            width: isMobile ? 100 : 120,
                            height: isMobile ? 100 : 120,
                            }}
                        />
                        <Button
                            size="small"
                            sx={{ mt: 1 }}
                            variant="outlined"
                            onClick={() =>
                            printSingleQRCode(qrDialogOrderId, url, index)
                            }
                        >
                            {t('unified_mgmt.print_this')}
                        </Button>
                        </CardContent>
                    </Card>
                    ))}
                </Stack>
                </>
            ) : (
                <Typography variant="body2">{t('unified_mgmt.no_qr_codes')}</Typography>
            )}
            </DialogContent>
            <DialogActions>
            <Button onClick={() => setQrDialogOpenBoxes(false)}>{t('unified_mgmt.close')}</Button>
            <Button
                variant="contained"
                onClick={() =>
                qrDialogOrderId && printAllQRCodes(qrDialogOrderId)
                }
            >
                {t('unified_mgmt.print_all')}
            </Button>
            </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmDialog.open} onClose={handleCancelDelete}>
            <DialogTitle>{t('unified_mgmt.confirm_delete')}</DialogTitle>
            <DialogContent>
            <Typography>
                {t('unified_mgmt.confirm_delete_message', { name: deleteConfirmDialog.row?.name })}
            </Typography>
            </DialogContent>
            <DialogActions>
            <Button onClick={handleCancelDelete}>{t('unified_mgmt.cancel')}</Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
                {t('unified_mgmt.yes_delete')}
            </Button>
            </DialogActions>
        </Dialog>

        {/* Discount Application Dialog */}
        <Dialog 
            open={discountDialogOpen} 
            onClose={handleCloseDiscountDialog}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>{t('unified_mgmt.select_discount')}</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 2 }}>
                    <TextField
                        label={t('unified_mgmt.search_discounts')}
                        placeholder={t('unified_mgmt.search_by_code_or_name')}
                        value={discountSearch}
                        onChange={(e) => setDiscountSearch(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                        {availableDiscounts
                            .filter(d => {
                                const search = discountSearch.toLowerCase();
                                return d.discount_code?.toLowerCase().includes(search) ||
                                       d.name?.toLowerCase().includes(search) ||
                                       d.phone?.toLowerCase().includes(search);
                            })
                            .map((discount) => (
                                <Card 
                                    key={discount.discount_id}
                                    sx={{ 
                                        mb: 1, 
                                        cursor: 'pointer',
                                        border: selectedDiscount?.discount_id === discount.discount_id ? 2 : 1,
                                        borderColor: selectedDiscount?.discount_id === discount.discount_id ? 'primary.main' : 'divider',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                    onClick={() => setSelectedDiscount(discount)}
                                >
                                    <CardContent>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Chip 
                                                label={discount.discount_code} 
                                                color="primary" 
                                                sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                            />
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {discount.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {discount.phone} {discount.city && `• ${discount.city}`}
                                                </Typography>
                                                {discount.notes && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {discount.notes}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip 
                                                label={`${discount.discount_percentage}% OFF`}
                                                color="success"
                                                size="small"
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))
                        }
                        {availableDiscounts.length === 0 && (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                {t('unified_mgmt.no_discounts_available')}
                            </Typography>
                        )}
                    </Box>

                    {selectedDiscount && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('unified_mgmt.discount_preview')}
                            </Typography>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2">
                                    {t('unified_mgmt.original_price')}: <strong>€{originalPrice.toFixed(2)}</strong>
                                </Typography>
                                <Typography variant="body2">
                                    {t('unified_mgmt.discount')}: <strong>-{selectedDiscount.discount_percentage}%</strong>
                                </Typography>
                                <Typography variant="body2" color="success.main">
                                    {t('unified_mgmt.new_price')}: <strong>€{(originalPrice * (1 - selectedDiscount.discount_percentage / 100)).toFixed(2)}</strong>
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDiscountDialog}>{t('unified_mgmt.cancel')}</Button>
                <Button 
                    onClick={handleApplyDiscount} 
                    variant="contained"
                    disabled={!selectedDiscount}
                >
                    {t('unified_mgmt.apply')}
                </Button>
            </DialogActions>
        </Dialog>

        {/* Discount Mismatch Warning Dialog */}
        <ConfirmationDialog
            open={discountMismatchDialogOpen}
            onClose={handleCancelMismatchDiscount}
            onConfirm={handleConfirmMismatchDiscount}
            title={t('unified_mgmt.discount_mismatch_title')}
            message={pendingDiscount ? t('unified_mgmt.discount_mismatch_message', {
                discountName: pendingDiscount.name,
                discountPhone: pendingDiscount.phone,
                customerName: editedFields.name,
                customerPhone: editedFields.phone
            }) : ''}
            confirmText={t('unified_mgmt.apply_anyway')}
            cancelText={t('unified_mgmt.cancel')}
        />

        {/* Progress Dialog */}
        <Dialog
            open={progressDialogOpen}
            onClose={() => setProgressDialogOpen(false)}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
        >
            <DialogTitle>
                {t('unified_mgmt.progress_title')}
            </DialogTitle>
            <DialogContent dividers>
                {progressDialogRow && (
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {t('unified_mgmt.order_information')}
                            </Typography>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.order_id')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.order_id}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.name')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.name}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.status')}
                                            </Typography>
                                            <Chip 
                                                label={progressDialogRow.status} 
                                                color={isReadyForPickup(progressDialogRow.status) ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.weight_kg')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.weight_kg} kg
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.crates')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.crate_count}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {t('unified_mgmt.processing_progress')}
                            </Typography>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.pouches')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.estimated_pouches || 0}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.boxes')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {progressDialogRow.estimated_boxes || 0}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unified_mgmt.cost')}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                €{progressDialogRow.total_cost}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {t('unified_mgmt.status_timeline')}
                            </Typography>
                            <Card variant="outlined">
                                <CardContent>
                                    {loadingHistory ? (
                                        <Box display="flex" justifyContent="center" p={2}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : statusHistory.length > 0 ? (
                                        <Stack spacing={2}>
                                            {statusHistory.map((item, index) => (
                                                <Box 
                                                    key={item.id} 
                                                    display="flex" 
                                                    alignItems="center"
                                                    sx={{
                                                        position: 'relative',
                                                        pl: 3,
                                                        '&::before': index < statusHistory.length - 1 ? {
                                                            content: '""',
                                                            position: 'absolute',
                                                            left: '7px',
                                                            top: '24px',
                                                            bottom: '-16px',
                                                            width: '2px',
                                                            bgcolor: 'divider',
                                                        } : {},
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            width: 16,
                                                            height: 16,
                                                            borderRadius: '50%',
                                                            bgcolor: isReadyForPickup(item.status) ? 'success.main' : 
                                                                     item.status === 'Picked up' ? 'primary.main' : 
                                                                     'action.active',
                                                            border: '3px solid',
                                                            borderColor: 'background.paper',
                                                        }}
                                                    />
                                                    <Box flex={1}>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {item.status}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatDateTime(item.changed_at)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" textAlign="center">
                                            {t('unified_mgmt.no_status_history')}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>

                        {progressDialogRow.notes && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {t('unified_mgmt.notes')}
                                </Typography>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="body2">
                                            {progressDialogRow.notes}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setProgressDialogOpen(false)}>
                    {t('unified_mgmt.close')}
                </Button>
            </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
            open={!!snackbarMsg}
            autoHideDuration={3000}
            onClose={() => setSnackbarMsg('')}
            message={snackbarMsg}
        />
        </Box>
    );
}
