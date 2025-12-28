import { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, Paper, Snackbar, Alert, CircularProgress } from '@mui/material';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import SearchBar from '../components/SearchBar'; // Import the SearchBar component

export default function PickupPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term

    const fetchReadyOrders = useCallback((query = '') => { // Modified to accept a query parameter
        setLoading(true);
        api.get(`/orders/pickup?query=${query}`) // Use the query parameter in the API call
            .then((res) => {
                const validOrders = Array.isArray(res.data) ? res.data.filter(order => order && order.status === 'Ready for pickup') : [];
                setOrders(validOrders);
            })
            .catch((err) => {
                console.error('Failed to fetch ready orders:', err);
                setSnackbar({ open: true, message: 'Failed to fetch orders.', severity: 'error' });
            })
            .finally(() => {
                setLoading(false);
            });
    }, []); // Empty dependency array for useCallback

    useEffect(() => {
        fetchReadyOrders(searchTerm); // Pass searchTerm to fetchReadyOrders
    }, [fetchReadyOrders, searchTerm]); // Re-fetch when searchTerm changes

    useEffect(() => {
        console.log('orders from API:', orders);
    }, [orders]);

    const handleMarkAsPickedUp = (orderId, customerName) => {
        if (!orderId) return;
        api.post(`/orders/${orderId}/pickup`)
            .then(() => {
                setSnackbar({ open: true, message: `Order for ${customerName} marked as picked up.`, severity: 'success' });
                fetchReadyOrders(searchTerm); // Re-fetch with current search term
            })
            .catch((err) => {
                console.error('Failed to confirm pickup:', err);
                setSnackbar({ open: true, message: 'Failed to update order status.', severity: 'error' });
            });
    };

    const columns = [
        { field: 'name', headerName: 'Customer Name', width: 200 },
        { field: 'phone', headerName: 'Phone', width: 150 },
        { field: 'city', headerName: 'City', width: 120 },
        { field: 'box_count', headerName: 'Boxes', type: 'number', width: 90 },
        { field: 'pouches_count', headerName: 'Pouches', type: 'number', width: 90 },
        {
        field: 'shelf_name',
        headerName: 'Shelf',
        width: 150,
        valueGetter: (value, row) => row?.shelf_name ?? 'N/A',
        },


        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                if (!params.row) {
                    return null;
                }
                return (
                    <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleMarkAsPickedUp(params.row.order_id, params.row.name)}
                    >
                        Mark as Picked Up
                    </Button>
                );
            },
        },
    ];

    return (
        <>
            <DrawerComponent />
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <Paper elevation={3} sx={{ width: '100%', maxWidth: '1200px', p: 3 }}>
                    <Typography variant="h4" sx={{ textAlign: 'center', mb: 3, fontWeight: 'bold' }}>
                        Pickup Coordination
                    </Typography>
                    <SearchBar onSearch={setSearchTerm} /> {/* Integrate the SearchBar */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    <Box sx={{ height: 600, width: '100%' }}>
                        <DataGrid
                            rows={orders}
                            columns={columns}
                            loading={loading}
                            getRowId={(row) => row ? row.order_id : Math.random().toString()}
                            autoHeight={false}
                        />
                    </Box>
                </Paper>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}