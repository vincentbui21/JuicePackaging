import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip, Alert, IconButton, Tooltip } from '@mui/material';
import { RestoreFromTrash, DeleteForever } from '@mui/icons-material';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function DeleteBinPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [canForceDelete, setCanForceDelete] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [detailsData, setDetailsData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

        const fetchDeletedCustomers = () => {

            setLoading(true);

            api.get('/deleted-customers')

                .then((res) => {
                    // console.log('deleted-customers response:', res.data); // <--- add this

                    setRows(res.data);

                    setLoading(false);

                })

                .catch((err) => {

                    console.error('API error:', err);

                    setLoading(false);

                });

        };

        useEffect(() => {

            fetchDeletedCustomers();

            // Load force delete permission
            try {
                const permissionsStr = localStorage.getItem('userPermissions');
                if (permissionsStr) {
                    const permissions = JSON.parse(permissionsStr);
                    setCanForceDelete(permissions.can_force_delete === 1 || permissions.role === 'admin');
                }
            } catch (err) {
                console.error('Failed to parse user permissions:', err);
            }

        }, []);

    
        const handleRowClick = async (params) => {
            setLoadingDetails(true);
            setDetailsDialogOpen(true);
            
            // Customer data with orders is now included in the row
            setDetailsData({
                customer: params.row,
                orders: params.row.orders || []
            });
            
            setLoadingDetails(false);
        };

        const handleRestore = (customer) => {

            api.post('/restore-customer', { customer_id: customer.customer_id })

                .then(() => {

                    fetchDeletedCustomers();

                    window.dispatchEvent(new CustomEvent('customers-updated'));

                })

                .catch((err) => {

                    console.error('Error restoring customer:', err);

                });

        };

    

        const handleDeleteClick = (customer) => {

            setSelectedCustomer(customer);

            setConfirmDialogOpen(true);

        };

        const handleConfirmDelete = () => {

            if (selectedCustomer) {

                api.delete('/force-delete-customer', { data: { customer_id: selectedCustomer.customer_id } })

                    .then(() => {

                        fetchDeletedCustomers();

                    })

                    .catch((err) => {

                        console.error('Error permanently deleting customer:', err);

                    })

                    .finally(() => {

                        setConfirmDialogOpen(false);

                        setSelectedCustomer(null);

                    });

            }

        };

        const filteredRows = rows.filter((row) => {

            if (!row) {

                return false;

            }

            const query = searchQuery.toLowerCase();

            return (

                (row.name && row.name.toLowerCase().includes(query)) ||

                (row.phone && row.phone.toLowerCase().includes(query))

            );

        });

    

        const columns = [

            { field: 'name', headerName: t('delete_bin.name'), width: 150 },

            { field: 'email', headerName: t('delete_bin.email'), width: 200 },

            { field: 'phone', headerName: t('delete_bin.phone'), width: 150 },

            { field: 'city', headerName: t('delete_bin.city'), width: 120 },

            {
            field: 'deleted_at',
            headerName: t('delete_bin.deleted_at'),
            width: 220,
            valueGetter: (value, row) => {
                const raw = row?.deleted_at;
                if (!raw) return t('delete_bin.na');

                const d = new Date(raw); 
                if (Number.isNaN(d.getTime())) return t('delete_bin.na');

                return d.toLocaleString();
            },
            },


            {
            field: 'actions',
            headerName: t('delete_bin.actions'),
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                alignItems="center"
                sx={{ width: '100%', height: '100%' }} // important for centering in the cell
                >
                <Tooltip title={t('delete_bin.restore_customer')}>
                    <IconButton
                        size="small"
                        color="success"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(params.row);
                        }}
                    >
                        <RestoreFromTrash />
                    </IconButton>
                </Tooltip>
                <Tooltip title={!canForceDelete ? t('delete_bin.no_permission_delete') : t('delete_bin.delete_permanently')}>
                    <span>
                        <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(params.row);
                            }}
                            disabled={!canForceDelete}
                        >
                            <DeleteForever />
                        </IconButton>
                    </span>
                </Tooltip>
                </Stack>
            ),
            }


        ];

    

        return (

            <>

                <DrawerComponent />

                <Box display="flex" justifyContent="center" sx={{ flexDirection: 'column', alignItems: 'center' }}>

                    <Typography variant='h4'

                        sx={{

                            paddingTop: "40px",

                            color: "black",

                            width: "min(1200px, 90%)",

                            textAlign: "center",

                            marginBottom: 3,

                            fontWeight: 'bold'

                        }}

                    >

                        {t('delete_bin.title')}

                    </Typography>

                    {!canForceDelete && (
                        <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>
                            <Typography color="warning.main" sx={{ textAlign: 'center', fontWeight: 500 }}>
                                ⚠️ {t('delete_bin.view_only_warning')}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>

                        <TextField

                            label={t('delete_bin.search_label')}

                            variant="outlined"

                            fullWidth

                            value={searchQuery}

                            onChange={(e) => setSearchQuery(e.target.value)}

                        />

                    </Box>

                    <Box sx={{ height: 600, width: 'min(1200px, 90%)' }}>

                        <DataGrid

                            rows={filteredRows}

                            columns={columns}

                            loading={loading}

                            getRowId={(row) => row ? row.customer_id : Math.random()}

                            autoHeight={false}

                            disableRowSelectionOnClick

                            hideFooterSelectedRowCount

                            onRowClick={handleRowClick}

                            sx={{
                                '& .MuiDataGrid-row': {
                                    cursor: 'pointer'
                                }
                            }}

                        />

                    </Box>

                </Box>

                {/* Customer Details Dialog */}
                <Dialog
                    open={detailsDialogOpen}
                    onClose={() => setDetailsDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        {t('delete_bin.customer_details')}
                    </DialogTitle>
                    <DialogContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {t('delete_bin.restore_to_change')}
                        </Alert>
                        
                        {loadingDetails ? (
                            <Typography>{t('delete_bin.loading')}</Typography>
                        ) : detailsData ? (
                            <Box>
                                {/* Customer Information */}
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>{t('delete_bin.customer_information')}</Typography>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>{t('delete_bin.name')}:</strong> {detailsData.customer?.name || t('delete_bin.na')}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>{t('delete_bin.email')}:</strong> {detailsData.customer?.email || t('delete_bin.na')}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>{t('delete_bin.phone')}:</strong> {detailsData.customer?.phone || t('delete_bin.na')}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>{t('delete_bin.city')}:</strong> {detailsData.customer?.city || t('delete_bin.na')}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>{t('delete_bin.deleted_at')}:</strong> {detailsData.customer?.deleted_at ? new Date(detailsData.customer.deleted_at).toLocaleString() : t('delete_bin.na')}</Typography>
                                    </Grid>
                                </Grid>

                                {/* Orders Information */}
                                <Typography variant="h6" sx={{ mb: 2, mt: 3, fontWeight: 'bold' }}>{t('delete_bin.orders_count', { count: detailsData.orders?.length || 0 })}</Typography>
                                {detailsData.orders?.length > 0 ? (
                                    detailsData.orders.map((order, idx) => (
                                        <Box key={order.order_id || idx} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.order_id')}:</strong> {order.order_id}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.status')}:</strong> <Chip label={order.status} size="small" /></Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.total_cost')}:</strong> {order.total_cost ? `€${order.total_cost}` : t('delete_bin.na')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.pouches')}:</strong> {order.pouches_count || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.weight')}:</strong> {order.weight_kg || 0} kg</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>{t('delete_bin.boxes')}:</strong> {order.boxes_count || 0}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography color="text.secondary">{t('delete_bin.no_orders')}</Typography>
                                )}

                            </Box>
                        ) : (
                            <Typography color="error">{t('delete_bin.failed_load_details')}</Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDetailsDialogOpen(false)}>{t('delete_bin.close')}</Button>
                    </DialogActions>
                </Dialog>

                <ConfirmationDialog

                    open={confirmDialogOpen}

                    onClose={() => setConfirmDialogOpen(false)}

                    onConfirm={handleConfirmDelete}

                    title={t('delete_bin.confirm_delete_title')}

                    message={t('delete_bin.confirm_delete_message', { name: selectedCustomer?.name })}

                    confirmText={t('delete_bin.delete')}

                />

            </>

        );

    }
