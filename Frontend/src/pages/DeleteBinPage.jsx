import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip, Alert } from '@mui/material';
import { RestoreFromTrash, DeleteForever } from '@mui/icons-material';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function DeleteBinPage() {
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

            { field: 'name', headerName: 'Name', width: 150 },

            { field: 'email', headerName: 'Email', width: 200 },

            { field: 'phone', headerName: 'Phone', width: 150 },

            { field: 'city', headerName: 'City', width: 120 },

            {
            field: 'deleted_at',
            headerName: 'Deleted At',
            width: 220,
            valueGetter: (value, row) => {
                const raw = row?.deleted_at;
                if (!raw) return 'N/A';

                const d = new Date(raw); 
                if (Number.isNaN(d.getTime())) return 'N/A';

                return d.toLocaleString();
            },
            },


            {
            field: 'actions',
            headerName: 'Actions',
            width: 300,
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
                <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={<RestoreFromTrash />}
                    onClick={() => handleRestore(params.row)}
                >
                    Restore
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteForever />}
                    onClick={() => handleDeleteClick(params.row)}
                    disabled={!canForceDelete}
                    title={!canForceDelete ? 'No permission to permanently delete' : ''}
                >
                    Delete Permanently
                </Button>
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

                        Delete Bin

                    </Typography>

                    {!canForceDelete && (
                        <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>
                            <Typography color="warning.main" sx={{ textAlign: 'center', fontWeight: 500 }}>
                                ⚠️ You have view-only access. Permanent deletion is disabled.
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>

                        <TextField

                            label="Search by Name or Phone Number"

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
                        Customer Details
                    </DialogTitle>
                    <DialogContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            This customer is in the delete bin. Restore the customer to make any changes.
                        </Alert>
                        
                        {loadingDetails ? (
                            <Typography>Loading...</Typography>
                        ) : detailsData ? (
                            <Box>
                                {/* Customer Information */}
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Customer Information</Typography>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>Name:</strong> {detailsData.customer?.name || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>Email:</strong> {detailsData.customer?.email || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>Phone:</strong> {detailsData.customer?.phone || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>City:</strong> {detailsData.customer?.city || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography><strong>Deleted At:</strong> {detailsData.customer?.deleted_at ? new Date(detailsData.customer.deleted_at).toLocaleString() : 'N/A'}</Typography>
                                    </Grid>
                                </Grid>

                                {/* Orders Information */}
                                <Typography variant="h6" sx={{ mb: 2, mt: 3, fontWeight: 'bold' }}>Orders ({detailsData.orders?.length || 0})</Typography>
                                {detailsData.orders?.length > 0 ? (
                                    detailsData.orders.map((order, idx) => (
                                        <Box key={order.order_id || idx} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Order ID:</strong> {order.order_id}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Status:</strong> <Chip label={order.status} size="small" /></Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Total Cost:</strong> {order.total_cost ? `€${order.total_cost}` : 'N/A'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Pouches:</strong> {order.pouches_count || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Weight:</strong> {order.weight_kg || 0} kg</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography><strong>Boxes:</strong> {order.boxes_count || 0}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography color="text.secondary">No orders found for this customer.</Typography>
                                )}

                            </Box>
                        ) : (
                            <Typography color="error">Failed to load customer details.</Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                <ConfirmationDialog

                    open={confirmDialogOpen}

                    onClose={() => setConfirmDialogOpen(false)}

                    onConfirm={handleConfirmDelete}

                    title="Permanently Delete Customer?"

                    message={`Are you sure you want to permanently delete ${selectedCustomer?.name}? This action cannot be undone.`}

                    confirmText="Delete"

                />

            </>

        );

    }
