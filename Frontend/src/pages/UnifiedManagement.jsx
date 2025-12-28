import { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
Box, TextField, Stack, Button, Tooltip, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Snackbar, Paper, Typography, IconButton, Card, CardContent, useMediaQuery, useTheme, Checkbox, FormControlLabel, Popover,
} from '@mui/material';
import { Edit, Delete, QrCode, Send, Print, Trolley, Inventory, Settings } from '@mui/icons-material';
import api from '../services/axios';
import generateQRCode from '../services/qrcodGenerator';
import printImage from '../services/send_to_printer';
import DrawerComponent from '../components/drawer';
import QRCodeDialog from '../components/qrcodeDialog';
import PasswordModal from '../components/PasswordModal';

const isReadyForPickup = (s) => String(s || '').toLowerCase() === 'ready for pickup';

// Small chip component that fetches /customers/:id/sms-status
function SmsStatusChip({ customerId, refreshKey }) {
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
        label={sent ? `Sent (${count})` : 'Not sent'}
        />
    );
}

export default function UnifiedManagement() {
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
    const [qrDialogOpenBoxes, setQrDialogOpenBoxes] = useState(false);
    const [qrDialogOrderId, setQrDialogOrderId] = useState(null);

    // Password modal for delete
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);

    // Snackbar
    const [snackbarMsg, setSnackbarMsg] = useState('');

    // Refresh key for SMS
    const [smsRefreshTick, setSmsRefreshTick] = useState(0);

    // Column visibility
    const [columnVisibility, setColumnVisibility] = useState({
        order_id: true,
        name: true,
        phone: true,
        weight_kg: true,
        crate_count: true,
        estimated_pouches: true,
        estimated_boxes: true,
        total_cost: true,
        city: true,
        created_at: true,
        status: true,
        sms_status: true,
        notes: true,
    });

    // Popover for column settings
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const reload = () => setSmsRefreshTick((n) => n + 1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/customer', { params: { page: 1, limit: 1000 } });
            const data = response.data.rows || [];            
            // Enrich data with computed fields like the original JuiceProcessingManagement
            const enriched = data.map((row) => {
                const { estimatedPouches, estimatedBoxes } = computeFromWeight(row.weight_kg);
                return {
                    ...row,
                    estimated_pouches: row?.pouches_count ?? estimatedPouches,
                    estimated_boxes: row?.boxes_count ?? estimatedBoxes,
                };
            });
            
            setRows(enriched);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setSnackbarMsg('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const handleCustomersUpdate = () => fetchData();
        window.addEventListener('customers-updated', handleCustomersUpdate);

        return () => {
            window.removeEventListener('customers-updated', handleCustomersUpdate);
        };
    }, [fetchData]);

    const computeFromWeight = (weight_kg) => {
        const w = Number(weight_kg) || 0;
        const estimatedPouches = Math.floor((w * 0.65) / 3);
        const estimatedBoxes = Math.ceil(estimatedPouches / 8);
        return { estimatedPouches, estimatedBoxes };
    };

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
        // Update customer
        await api.put(`/customer/${selectedRow.customer_id}`, {
            name: editedFields.name,
            email: editedFields.email,
            phone: editedFields.phone,
            city: editedFields.city,
            weight_kg: Number(editedFields.weight_kg),
            crate_count: Number(editedFields.crate_count),
            total_cost: Number(editedFields.total_cost),
            status: editedFields.status,
            notes: editedFields.notes,
        });

        // Update order if exists
        if (selectedRow.order_id) {
            await api.put(`/orders/${selectedRow.order_id}`, {
            estimated_pouches: Number(editedFields.estimated_pouches),
            estimated_boxes: Number(editedFields.estimated_boxes),
            });
        }

        setSnackbarMsg('Updated successfully');
        fetchData(); // Refresh data
        } catch (err) {
        console.error('Failed to update', err);
        setSnackbarMsg('Failed to update');
        }
        setEditDialogOpen(false);
    };

    // Delete handler
    const handleDeleteClick = (row) => {
        setRowToDelete(row);
        setPasswordModalOpen(true);
    };

    const handlePasswordConfirm = async ({ id, password }) => {
        try {
        await api.post('/auth/login', { id, password });
        if (rowToDelete) {
            // Delete customer
            await api.delete('/customer', { data: { customer_id: rowToDelete.customer_id } });
            setSnackbarMsg('Deleted successfully');
            fetchData();
        }
        } catch (err) {
        console.error('Delete failed', err);
        setSnackbarMsg('Failed to delete');
        } finally {
        setPasswordModalOpen(false);
        }
    };

    const handlePasswordCancel = () => {
        setRowToDelete(null);
        setPasswordModalOpen(false);
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
        setSnackbarMsg('Failed to fetch crate IDs');
        }
    };

    // QR for boxes
    const handleShowQR = async (row) => {
    if (!row.order_id) {
        setSnackbarMsg('No order found for this customer');
        return;
        }
        const boxesToUse = Number(row.estimated_boxes) || 0;
        if (boxesToUse === 0) {
        setSnackbarMsg('No boxes to generate QR codes for');
        return;
        }
        try {
        const codes = [];
        for (let i = 0; i < boxesToUse; i++) {
            const url = await generateQRCode(`Order: ${row.order_id}, Box: ${i + 1}`);
            if (url) codes.push({ index: i + 1, url });
        }
        if (codes.length === 0) {
            setSnackbarMsg('Failed to generate QR codes');
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
        setSnackbarMsg('QR Codes generated');
        } catch (e) {
        console.error(e);
        setSnackbarMsg('Failed to generate QR Codes');
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

        setSnackbarMsg('Pouch print sent (Expiry +1 year)');
        } catch (e) {
        console.error('printPouchLabels failed', e);
        setSnackbarMsg('Failed to print pouch');
        }
    };

  // Send SMS
    const handleNotifySMS = async (row) => {
        if (!isReadyForPickup(row.status)) {
        alert("Can only send SMS when status is 'Ready for pickup'.");
        return;
        }
        try {
        const res = await api.post(`/customers/${row.customer_id}/notify`, {});
        setSnackbarMsg(res.data?.message || 'SMS attempted');
        reload();
        } catch (e) {
        console.error('Notify failed', e);
        setSnackbarMsg('SMS failed');
        }
    };

    const columns = [
        {
            field: 'actions',
            headerName: 'Actions',
            minWidth: isMobile ? 180 : 300,
            flex: isMobile ? 2 : 3,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const ready = isReadyForPickup(params.row?.status);
                return (
                <Stack direction="row" spacing={isMobile ? 0.25 : 0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconButton color="primary" onClick={() => openEditDialog(params.row)} size={isMobile ? "small" : "small"}>
                    <Edit fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteClick(params.row)} size={isMobile ? "small" : "small"}>
                    <Delete fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <IconButton color="warning" onClick={() => handleCrateQRPrint(params.row)} size={isMobile ? "small" : "small"}>
                    <Trolley fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <IconButton color="secondary" onClick={() => handleShowQR(params.row)} size={isMobile ? "small" : "small"}>
                    <Inventory fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <IconButton color="success" onClick={() => printPouchLabels(params.row)} size={isMobile ? "small" : "small"}>
                    <Print fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <Tooltip title={ready ? 'Send SMS' : "Only available when status is 'Ready for pickup'."}>
                    <span>
                        <Button
                        variant="outlined"
                        size={isMobile ? "small" : "small"}
                        color="info"
                        disabled={!ready}
                        onClick={() => handleNotifySMS(params.row)}
                        sx={{ minWidth: 'auto', px: isMobile ? 0.5 : 1, fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                        >
                        <Send fontSize={isMobile ? "small" : "medium"} />
                        </Button>
                    </span>
                    </Tooltip>
                </Stack>
                );
            },
        },
        { field: 'order_id', headerName: 'Order ID', minWidth: 180, flex: 0.5 },
        { field: 'name', headerName: 'Name', minWidth: 120, flex: 1 },
        // { field: 'email', headerName: 'Email', minWidth: 150, flex: 1.5, hide: isMobile },
        { field: 'phone', headerName: 'Phone', minWidth: 120, flex: 1 },
        { field: 'weight_kg', headerName: 'Weight (kg)', minWidth: 100, flex: 0.6 },
        { field: 'crate_count', headerName: 'Crates', minWidth: 70, flex: 0.5 },
        { field: 'estimated_pouches', headerName: 'Pouches', minWidth: 80, flex: 0.6 },
        { field: 'estimated_boxes', headerName: 'Boxes', minWidth: 70, flex: 0.5 },
        { field: 'total_cost', headerName: 'Cost (€)', minWidth: 80, flex: 0.6 },
        { field: 'city', headerName: 'City', minWidth: 100, flex: 0.8, hide: isMobile },
        { field: 'created_at', headerName: 'Date', minWidth: 120, flex: 1, hide: isMobile },
        { field: 'status', headerName: 'Status', minWidth: 110, flex: 0.8 },
        {
            field: 'sms_status',
            headerName: 'SMS',
            minWidth: 100,
            flex: 0.7,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <SmsStatusChip customerId={params.row.customer_id} refreshKey={smsRefreshTick} />
            ),
        },
        { field: 'notes', headerName: 'Notes', minWidth: 150, flex: 1.2, hide: isMobile },
    ];

    const filteredRows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const currentQrData = qrDialogOrderId ? qrCodes[qrDialogOrderId] : null;

    // Print single QR
    const printSingleQRCode = async (orderId, url, index) => {
        const order = rows.find(o => o.order_id === orderId);
        try {
        await printImage(url, order?.name || 'Customer', `b${index}/1`);
        setSnackbarMsg(`Box ${index} sent to printer`);
        } catch (e) {
        console.error('Single print failed', e);
        setSnackbarMsg('Failed to print QR');
        }
    };

    // Print all QRs
    const printAllQRCodes = async (orderId) => {
        const order = rows.find(o => o.order_id === orderId);
        const data = qrCodes[orderId];
        if (!data || !data.codes?.length) return;

        try {
        const total = data.codes.length;
        for (const { index, url } of data.codes) {
            await printImage(url, order?.name || 'Customer', `b${index}/${total}`);
        }
        setSnackbarMsg('All QR codes sent to printer');
        } catch (e) {
        console.error('Print all failed', e);
        setSnackbarMsg('Failed to print all QRs');
        }
    };

    return (
        <>
        <DrawerComponent />
        <Box
            sx={{
            backgroundColor: '#fffff',
            pt: isMobile ? 2 : 4,
            pb: isMobile ? 2 : 4,
            px: isMobile ? 1 : 2,
            display: 'flex',
            justifyContent: 'center',
            }}
        >
            <Paper
            elevation={3}
            sx={{
                width: '100%',
                maxWidth: '1400px',
                p: isMobile ? 2 : 3,
                backgroundColor: '#ffffff',
                borderRadius: 2,
            }}
            >
            <Typography variant={isMobile ? "h5" : "h4"} sx={{ textAlign: 'center', mb: isMobile ? 2 : 3, fontWeight: 'bold' }}>
                Unified Management
            </Typography>

            <TextField
                label="Search by Name"
                variant="outlined"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                sx={{ mb: isMobile ? 1 : 2, backgroundColor: 'white', borderRadius: 1 }}
                size={isMobile ? "small" : "medium"}
            />

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <Settings />
                </IconButton>
            </Box>

            <DataGrid
                rows={filteredRows}
                columns={columns}
                getRowId={(row) => row.customer_id}
                pageSize={isMobile ? 5 : 10}
                rowsPerPageOptions={isMobile ? [5, 10] : [10, 20, 50]}
                loading={loading}
                columnVisibilityModel={columnVisibility}
                onColumnVisibilityModelChange={setColumnVisibility}
                sx={{
                height: isMobile ? 400 : 600,
                backgroundColor: 'white',
                borderRadius: 2,
                boxShadow: 3,
                '& .MuiDataGrid-cell[data-field="actions"]': { overflow: 'visible' },
                '& .MuiDataGrid-root': {
                    overflowX: 'auto',
                },
                }}
            />

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Box sx={{ p: 2, minWidth: 200 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Show/Hide Columns</Typography>
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
        </Box>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
            <DialogTitle>Edit Customer & Order</DialogTitle>
            <DialogContent>
            <Stack spacing={isMobile ? 1 : 2} mt={1}>
                <TextField label="Name" value={editedFields.name} onChange={(e) => setEditedFields(p => ({ ...p, name: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Email" value={editedFields.email} onChange={(e) => setEditedFields(p => ({ ...p, email: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Phone" value={editedFields.phone} onChange={(e) => setEditedFields(p => ({ ...p, phone: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="City" value={editedFields.city} onChange={(e) => setEditedFields(p => ({ ...p, city: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Weight (kg)" type="number" value={editedFields.weight_kg} onChange={(e) => setEditedFields(p => ({ ...p, weight_kg: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Crates" type="number" value={editedFields.crate_count} onChange={(e) => setEditedFields(p => ({ ...p, crate_count: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Cost (€)" type="number" value={editedFields.total_cost} onChange={(e) => setEditedFields(p => ({ ...p, total_cost: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField select label="Status" value={editedFields.status} onChange={(e) => setEditedFields(p => ({ ...p, status: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"}>
                {['Created', 'Picked up', 'Ready for pickup', 'Processing complete', 'In Progress'].map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
                </TextField>
                <TextField label="Notes" value={editedFields.notes} onChange={(e) => setEditedFields(p => ({ ...p, notes: e.target.value }))} fullWidth multiline size={isMobile ? "small" : "medium"} />
                <TextField label="Estimated Pouches" type="number" value={editedFields.estimated_pouches} onChange={(e) => setEditedFields(p => ({ ...p, estimated_pouches: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
                <TextField label="Estimated Boxes" type="number" value={editedFields.estimated_boxes} onChange={(e) => setEditedFields(p => ({ ...p, estimated_boxes: e.target.value }))} fullWidth size={isMobile ? "small" : "medium"} />
            </Stack>
            </DialogContent>
            <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSave}>Save</Button>
            </DialogActions>
        </Dialog>

        {/* QR Dialog for Crates */}
        <QRCodeDialog
            open={qrDialogOpen}
            onClose={() => setQrDialogOpen(false)}
            data={crateIds}
            name={customerForwardName}
            max={maxCrates}
        />

        {/* QR Dialog for Boxes */}
        <Dialog open={qrDialogOpenBoxes} onClose={() => setQrDialogOpenBoxes(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
            <DialogTitle>QR Codes — Order {qrDialogOrderId}</DialogTitle>
            <DialogContent dividers>
            {currentQrData ? (
                <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Pouches: {currentQrData.pouches} &nbsp; • &nbsp; Boxes: {currentQrData.boxes}
                </Typography>
                <Stack direction="row" spacing={isMobile ? 1 : 2} flexWrap="wrap">
                    {currentQrData.codes.map(({ index, url }) => (
                    <Card key={index} sx={{ p: isMobile ? 0.5 : 1, backgroundColor: '#fff', minWidth: isMobile ? 140 : 160 }}>
                        <CardContent sx={{ textAlign: 'center', p: isMobile ? 1 : 2 }}>
                        <Typography variant="body2">Box {index}</Typography>
                        <img src={url} alt={`QR ${index}`} style={{ width: isMobile ? 100 : 120, height: isMobile ? 100 : 120 }} />
                        <Button size="small" sx={{ mt: 1 }} variant="outlined" onClick={() => printSingleQRCode(qrDialogOrderId, url, index)}>
                            Print this
                        </Button>
                        </CardContent>
                    </Card>
                    ))}
                </Stack>
                </>
            ) : (
                <Typography variant="body2">No QR codes generated.</Typography>
            )}
            </DialogContent>
            <DialogActions>
            <Button onClick={() => setQrDialogOpenBoxes(false)}>Close</Button>
            <Button variant="contained" onClick={() => qrDialogOrderId && printAllQRCodes(qrDialogOrderId)}>
                Print All
            </Button>
            </DialogActions>
        </Dialog>

        <PasswordModal
            open={passwordModalOpen}
            onClose={handlePasswordCancel}
            onConfirm={handlePasswordConfirm}
        />

        <Snackbar open={!!snackbarMsg} autoHideDuration={3000} onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
        </>
    );
}