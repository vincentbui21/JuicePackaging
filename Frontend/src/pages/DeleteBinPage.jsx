import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, TextField, Divider } from '@mui/material';
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
    const [orderRows, setOrderRows] = useState([]);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderSearchQuery, setOrderSearchQuery] = useState('');

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

        const fetchDeletedOrders = () => {
            setOrderLoading(true);
            api.get('/deleted-orders')
                .then((res) => {
                    setOrderRows(res.data || []);
                    setOrderLoading(false);
                })
                .catch((err) => {
                    console.error('Failed to fetch deleted orders:', err);
                    setOrderLoading(false);
                });
        };

    

        useEffect(() => {

            fetchDeletedCustomers();
            fetchDeletedOrders();

        }, []);

    

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

        const handleRestoreOrder = (order) => {
            api.post('/restore-order', { order_id: order.order_id })
                .then(() => {
                    fetchDeletedOrders();
                })
                .catch((err) => {
                    console.error('Error restoring order:', err);
                });
        };

        const handleDeleteOrderClick = (order) => {
            setSelectedOrder(order);
            setOrderConfirmOpen(true);
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

        const handleConfirmOrderDelete = () => {
            if (selectedOrder) {
                api.delete('/force-delete-order', { data: { order_id: selectedOrder.order_id } })
                    .then(() => {
                        fetchDeletedOrders();
                    })
                    .catch((err) => {
                        console.error('Error permanently deleting order:', err);
                    })
                    .finally(() => {
                        setOrderConfirmOpen(false);
                        setSelectedOrder(null);
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

        const filteredOrderRows = orderRows.filter((row) => {
            if (!row) return false;
            const query = orderSearchQuery.toLowerCase();
            return (
                (row.order_id && row.order_id.toLowerCase().includes(query)) ||
                (row.name && row.name.toLowerCase().includes(query))
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
                >
                    Delete Permanently
                </Button>
                </Stack>
            ),
            }


        ];

        const orderColumns = [
            { field: 'order_id', headerName: 'Order ID', width: 220 },
            { field: 'name', headerName: 'Customer', width: 160 },
            { field: 'city', headerName: 'City', width: 120 },
            { field: 'status', headerName: 'Status', width: 140 },
            {
                field: 'created_at',
                headerName: 'Created At',
                width: 200,
                valueGetter: (value, row) => {
                    const raw = row?.created_at;
                    if (!raw) return 'N/A';
                    const d = new Date(raw);
                    if (Number.isNaN(d.getTime())) return 'N/A';
                    return d.toLocaleString();
                },
            },
            {
                field: 'deleted_at',
                headerName: 'Deleted At',
                width: 200,
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
                        sx={{ width: '100%', height: '100%' }}
                    >
                        <Button
                            variant="outlined"
                            size="small"
                            color="success"
                            startIcon={<RestoreFromTrash />}
                            onClick={() => handleRestoreOrder(params.row)}
                        >
                            Restore
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteForever />}
                            onClick={() => handleDeleteOrderClick(params.row)}
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

                        />

                    </Box>

                    <Divider sx={{ my: 4, width: 'min(1200px, 90%)' }} />

                    <Typography
                        variant='h5'
                        sx={{
                            width: "min(1200px, 90%)",
                            textAlign: "center",
                            marginBottom: 2,
                            fontWeight: 'bold'
                        }}
                    >
                        Deleted Orders from Proccessing Page
                    </Typography>

                    <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>
                        <TextField
                            label="Search by Order ID or Customer Name"
                            variant="outlined"
                            fullWidth
                            value={orderSearchQuery}
                            onChange={(e) => setOrderSearchQuery(e.target.value)}
                        />
                    </Box>

                    <Box sx={{ height: 600, width: 'min(1200px, 90%)' }}>
                        <DataGrid
                            rows={filteredOrderRows}
                            columns={orderColumns}
                            loading={orderLoading}
                            getRowId={(row) => row ? row.order_id : Math.random()}
                            autoHeight={false}
                            disableRowSelectionOnClick
                            hideFooterSelectedRowCount
                        />
                    </Box>

                </Box>

                <ConfirmationDialog

                    open={confirmDialogOpen}

                    onClose={() => setConfirmDialogOpen(false)}

                    onConfirm={handleConfirmDelete}

                    title="Permanently Delete Customer?"

                    message={`Are you sure you want to permanently delete ${selectedCustomer?.name}? This action cannot be undone.`}

                    confirmText="Delete"

                />

                <ConfirmationDialog
                    open={orderConfirmOpen}
                    onClose={() => setOrderConfirmOpen(false)}
                    onConfirm={handleConfirmOrderDelete}
                    title="Permanently Delete Order?"
                    message={`Are you sure you want to permanently delete order ${selectedOrder?.order_id}? This action cannot be undone.`}
                    confirmText="Delete"
                />

            </>

        );

    }
