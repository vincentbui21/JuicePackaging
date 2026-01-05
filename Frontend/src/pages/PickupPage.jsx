import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, Paper, Snackbar, Alert, CircularProgress, Divider, Chip } from '@mui/material';
import { Warning } from '@mui/icons-material';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import SearchBar from '../components/SearchBar'; // Import the SearchBar component

export default function PickupPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [searchTerm, setSearchTerm] = useState('');
    const [allowedCities, setAllowedCities] = useState([]);

    // Load city restrictions on mount
    useEffect(() => {
        try {
            const permissionsStr = localStorage.getItem('userPermissions');
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr);
                // If user is admin or has no restrictions, allow all cities
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

    const fetchReadyOrders = useCallback(() => {
        setLoading(true);
        api.get('/orders?status=Ready for pickup')
            .then((res) => {
                const validOrders = Array.isArray(res.data) ? res.data : [];
                
                // Filter by allowed cities if user has city restrictions
                const filteredByCity = allowedCities.length > 0
                    ? validOrders.filter(order => allowedCities.includes(order.city))
                    : validOrders;
                
                setOrders(filteredByCity);
                setFilteredOrders(filteredByCity);
            })
            .catch((err) => {
                console.error('Failed to fetch ready orders:', err);
                setSnackbar({ open: true, message: t('pickup.failed_fetch_orders'), severity: 'error' });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [allowedCities, t]);

    useEffect(() => {
        fetchReadyOrders();
    }, [fetchReadyOrders]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredOrders(orders);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = orders.filter(order => 
                order.name?.toLowerCase().includes(term) ||
                order.phone?.toLowerCase().includes(term) ||
                order.city?.toLowerCase().includes(term)
            );
            setFilteredOrders(filtered);
        }
    }, [searchTerm, orders]);

    const handleMarkAsPickedUp = (orderId, customerName) => {
        if (!orderId) return;
        api.post(`/orders/${orderId}/pickup`)
            .then(() => {
                setSnackbar({ open: true, message: t('pickup.marked_as_picked_up', { name: customerName }), severity: 'success' });
                fetchReadyOrders();
            })
            .catch((err) => {
                console.error('Failed to confirm pickup:', err);
                setSnackbar({ open: true, message: t('pickup.failed_update_status'), severity: 'error' });
            });
    };

    const columns = [
        { field: 'name', headerName: t('pickup.customer_name'), width: 200 },
        { field: 'phone', headerName: t('pickup.phone'), width: 150 },
        { field: 'city', headerName: t('pickup.city'), width: 120 },
        { field: 'box_count', headerName: t('pickup.boxes'), type: 'number', width: 90 },
        { field: 'pouches_count', headerName: t('pickup.pouches'), type: 'number', width: 90 },
        {
            field: 'shelf_name',
            headerName: t('pickup.shelf'),
            width: 200,
            renderCell: (params) => {
                if (params.row?.is_from_reservation) {
                    return (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Warning sx={{ color: '#ff9800', fontSize: '20px' }} />
                            <Typography variant="caption" color="text.secondary">
                                N/A
                            </Typography>
                        </Stack>
                    );
                }
                return params.row?.shelf_name ?? t('pickup.na');
            },
        },
        {
            field: 'actions',
            headerName: t('pickup.actions'),
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
                        {t('pickup.mark_as_picked_up')}
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
                        {t('pickup.title')}
                    </Typography>
                    {allowedCities.length > 0 && (
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                            <Typography color="info.main" sx={{ fontWeight: 500 }}>
                                🔒 {t('pickup.viewing_pickups')}: {allowedCities.join(', ')}
                            </Typography>
                        </Box>
                    )}
                    <SearchBar onSearch={setSearchTerm} />
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* Combined Orders Table */}
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ height: 600, width: '100%' }}>
                            <DataGrid
                                rows={filteredOrders}
                                columns={columns}
                                loading={loading}
                                getRowId={(row) => row ? row.order_id : Math.random().toString()}
                                autoHeight={false}
                            />
                        </Box>
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