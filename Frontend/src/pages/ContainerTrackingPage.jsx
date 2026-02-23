import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Package,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: '20px' }}>
      {value === index && children}
    </div>
  );
}

export default function ContainerTrackingPage() {
  const [tabValue, setTabValue] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [cities, setCities] = useState([]);
  const [allowedCities, setAllowedCities] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Create Movement Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMovement, setNewMovement] = useState({
    from_city: '',
    to_city: '',
    quantity: '',
    notes: ''
  });

  // Edit Inventory Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [editValues, setEditValues] = useState({ containers_total: '', containers_in_use: '' });

  // Delete Confirmation Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState(null);

  useEffect(() => {
    // Get user's allowed cities and role from localStorage
    try {
      const userPerms = localStorage.getItem('userPermissions');
      if (userPerms) {
        const perms = JSON.parse(userPerms);
        // If allowed_cities is empty or null, user has access to all cities
        const allowed = perms.allowed_cities || [];
        setAllowedCities(allowed);
        setUserRole(perms.role || '');
      }
    } catch (e) {
      console.error('Failed to parse user permissions:', e);
      setAllowedCities([]);
      setUserRole('');
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, movRes, citiesRes] = await Promise.all([
        api.get('/containers/inventory'),
        api.get('/containers/movements'),
        api.get('/cities')
      ]);
      
      setInventory(invRes.data || []);
      setMovements(movRes.data || []);
      setCities(citiesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateMovement = async () => {
    if (!newMovement.from_city || !newMovement.to_city || !newMovement.quantity) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    if (Number(newMovement.quantity) <= 0) {
      showSnackbar('Quantity must be greater than 0', 'error');
      return;
    }

    // Check if source city has enough available containers
    const sourceCity = inventory.find(c => c.name === newMovement.from_city);
    if (sourceCity) {
      const available = sourceCity.containers_total - sourceCity.containers_in_use;
      if (Number(newMovement.quantity) > available) {
        showSnackbar(`Not enough available containers in ${newMovement.from_city}. Available: ${available}`, 'error');
        return;
      }
    }

    try {
      // Get user info from localStorage
      const userId = localStorage.getItem('userId') || null;
      let userName = 'Employee';
      try {
        const userPerms = localStorage.getItem('userPermissions');
        if (userPerms) {
          const perms = JSON.parse(userPerms);
          userName = perms.full_name || perms.id || 'Employee';
        }
      } catch (e) {
        console.error('Failed to parse user permissions:', e);
      }

      await api.post('/containers/movements', {
        ...newMovement,
        quantity: Number(newMovement.quantity),
        created_by: userId,
        created_by_name: userName
      });
      
      showSnackbar('Movement created successfully', 'success');
      setCreateDialogOpen(false);
      setNewMovement({ from_city: '', to_city: '', quantity: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error('Error creating movement:', err);
      showSnackbar(err.response?.data?.error || 'Failed to create movement', 'error');
    }
  };

  const handleConfirmMovement = async (movementId) => {
    try {
      // Get user info from localStorage
      const userId = localStorage.getItem('userId') || null;
      let userName = 'Employee';
      try {
        const userPerms = localStorage.getItem('userPermissions');
        if (userPerms) {
          const perms = JSON.parse(userPerms);
          userName = perms.full_name || perms.id || 'Employee';
        }
      } catch (e) {
        console.error('Failed to parse user permissions:', e);
      }

      await api.post(`/containers/movements/${movementId}/confirm`, {
        confirmed_by: userId,
        confirmed_by_name: userName
      });
      
      showSnackbar('Movement confirmed successfully', 'success');
      fetchData();
    } catch (err) {
      console.error('Error confirming movement:', err);
      showSnackbar(err.response?.data?.message || 'Failed to confirm movement', 'error');
    }
  };

  const handleCancelMovement = async (movementId) => {
    try {
      await api.post(`/containers/movements/${movementId}/cancel`);
      showSnackbar('Movement cancelled successfully', 'success');
      fetchData();
    } catch (err) {
      console.error('Error cancelling movement:', err);
      showSnackbar(err.response?.data?.message || 'Failed to cancel movement', 'error');
    }
  };

  const handleDeleteClick = (movement) => {
    setMovementToDelete(movement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!movementToDelete) return;

    try {
      const userId = localStorage.getItem('userId');
      await api.delete(`/containers/movements/${movementToDelete.movement_id}`, {
        data: { userId }
      });
      showSnackbar('Movement record deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setMovementToDelete(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting movement:', err);
      showSnackbar(err.response?.data?.error || 'Failed to delete movement', 'error');
    }
  };

  const handleOpenEditInventory = (city) => {
    setEditingCity(city);
    setEditValues({
      containers_total: city.containers_total,
      containers_in_use: city.containers_in_use
    });
    setEditDialogOpen(true);
  };

  const handleSaveInventory = async () => {
    if (!editingCity) return;

    try {
      await api.put(`/containers/inventory/${editingCity.name}`, {
        containers_total: Number(editValues.containers_total),
        containers_in_use: Number(editValues.containers_in_use)
      });
      
      showSnackbar('Inventory updated successfully', 'success');
      setEditDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error updating inventory:', err);
      showSnackbar('Failed to update inventory', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'confirmed': return <CheckCircle size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return null;
    }
  };

  const pendingMovements = movements.filter(m => m.status === 'pending');
  const completedMovements = movements.filter(m => m.status !== 'pending');

  return (
    <>
      <DrawerComponent />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Package size={32} />
                Container Movement Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track physical containers moving between cities
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Refresh data">
                <IconButton onClick={fetchData} disabled={loading}>
                  <RefreshCw />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Plus />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Record Movement
              </Button>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Inventory Overview" />
            <Tab label={`Pending Movements (${pendingMovements.length})`} />
            <Tab label="Movement History" />
          </Tabs>

          {/* Tab 1: Inventory Overview */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {inventory.map((city) => {
                const available = city.containers_available;
                const usagePercent = city.containers_total > 0 
                  ? ((city.containers_in_use / city.containers_total) * 100).toFixed(1)
                  : 0;

                return (
                  <Grid item xs={12} sm={6} md={4} key={city.city_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">{city.name}</Typography>
                          <Button size="small" onClick={() => handleOpenEditInventory(city)}>
                            Edit
                          </Button>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h3" color="primary">
                            {city.containers_total}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Containers
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="h6" color="success.main">
                              {available}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Available
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="h6" color="warning.main">
                              {city.containers_in_use}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              In Use / Transit
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">Usage</Typography>
                            <Typography variant="caption">{usagePercent}%</Typography>
                          </Box>
                          <Box sx={{ 
                            height: 8, 
                            bgcolor: 'grey.200', 
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              height: '100%', 
                              bgcolor: Number(usagePercent) > 80 ? 'error.main' : 'primary.main',
                              width: `${usagePercent}%`,
                              transition: 'width 0.3s'
                            }} />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </TabPanel>

          {/* Tab 2: Pending Movements */}
          <TabPanel value={tabValue} index={1}>
            {pendingMovements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No pending movements</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingMovements.map((movement) => (
                      <TableRow key={movement.movement_id}>
                        <TableCell>
                          <Chip label={movement.from_city} size="small" />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ArrowRight size={16} />
                            <Chip label={movement.to_city} size="small" color="primary" />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {movement.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell>{movement.created_by_name || movement.created_by}</TableCell>
                        <TableCell>
                          {new Date(movement.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{movement.notes || '-'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircle size={16} />}
                              onClick={() => handleConfirmMovement(movement.movement_id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<XCircle size={16} />}
                              onClick={() => handleCancelMovement(movement.movement_id)}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Tab 3: Movement History */}
          <TabPanel value={tabValue} index={2}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Confirmed By</TableCell>
                    <TableCell>Confirmed At</TableCell>
                    <TableCell>Notes</TableCell>
                    {userRole === 'admin' && <TableCell align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {completedMovements.map((movement) => (
                    <TableRow key={movement.movement_id}>
                      <TableCell>
                        <Chip
                          label={movement.status}
                          color={getStatusColor(movement.status)}
                          size="small"
                          icon={getStatusIcon(movement.status)}
                        />
                      </TableCell>
                      <TableCell>{movement.from_city}</TableCell>
                      <TableCell>{movement.to_city}</TableCell>
                      <TableCell align="right">{movement.quantity}</TableCell>
                      <TableCell>{movement.created_by_name || movement.created_by}</TableCell>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {movement.confirmed_by_name || movement.confirmed_by || '-'}
                      </TableCell>
                      <TableCell>
                        {movement.confirmed_at ? new Date(movement.confirmed_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{movement.notes || '-'}</TableCell>
                      {userRole === 'admin' && (
                        <TableCell align="center">
                          <Tooltip title="Delete record">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(movement)}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>

        {/* Create Movement Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Record Container Movement</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>From City</InputLabel>
                <Select
                  value={newMovement.from_city}
                  label="From City"
                  onChange={(e) => setNewMovement({ ...newMovement, from_city: e.target.value })}
                >
                  {/* Filter cities based on user's allowed_cities permission */}
                  {cities
                    .filter(city => allowedCities.length === 0 || allowedCities.includes(city))
                    .map((city) => (
                      <MenuItem key={city} value={city}>{city}</MenuItem>
                    ))}
                </Select>
              </FormControl>
              {allowedCities.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                  You can only create movements from cities you have access to: {allowedCities.join(', ')}
                </Typography>
              )}

              <FormControl fullWidth>
                <InputLabel>To City</InputLabel>
                <Select
                  value={newMovement.to_city}
                  label="To City"
                  onChange={(e) => setNewMovement({ ...newMovement, to_city: e.target.value })}
                >
                  {cities.filter(c => c !== newMovement.from_city).map((city) => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Quantity"
                type="number"
                fullWidth
                value={newMovement.quantity}
                onChange={(e) => setNewMovement({ ...newMovement, quantity: e.target.value })}
                InputProps={{ inputProps: { min: 1 } }}
              />

              <TextField
                label="Notes (optional)"
                multiline
                rows={3}
                fullWidth
                value={newMovement.notes}
                onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
              />

              {newMovement.from_city && (
                <Alert severity="info">
                  {(() => {
                    const city = inventory.find(c => c.name === newMovement.from_city);
                    if (city) {
                      const available = city.containers_total - city.containers_in_use;
                      return `Available in ${newMovement.from_city}: ${available} containers`;
                    }
                    return '';
                  })()}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMovement} variant="contained">
              Create Movement
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Inventory Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Container Inventory - {editingCity?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Total Containers"
                type="number"
                fullWidth
                value={editValues.containers_total}
                onChange={(e) => setEditValues({ ...editValues, containers_total: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />

              <TextField
                label="Containers In Use"
                type="number"
                fullWidth
                value={editValues.containers_in_use}
                onChange={(e) => setEditValues({ ...editValues, containers_in_use: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />

              <Alert severity="warning">
                This will directly update the inventory. Make sure the numbers are correct.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveInventory} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Movement Record</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this movement record?
            </Typography>
            {movementToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2"><strong>From:</strong> {movementToDelete.from_city}</Typography>
                <Typography variant="body2"><strong>To:</strong> {movementToDelete.to_city}</Typography>
                <Typography variant="body2"><strong>Quantity:</strong> {movementToDelete.quantity}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {movementToDelete.status}</Typography>
              </Box>
            )}
            <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
              Warning: This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}
