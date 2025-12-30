import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert, Tabs, Tab, List, ListItem, ListItemText, IconButton, Grid, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, FormGroup, Select, MenuItem, InputLabel, FormControl, Chip, OutlinedInput, InputAdornment, TablePagination } from "@mui/material";
import { Add, Delete, Edit, Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import DrawerComponent from "../components/drawer";
import { useState, useEffect } from "react";
import api from '../services/axios';
import PasswordModal from "../components/PasswordModal";

function SettingPage() {
  const [tabValue, setTabValue] = useState(0);

  const initialSettings = {
    juice_quantity: "",
    no_pouches: "",
    price: "",
    shipping_fee: "",
    printer_ip: "192.168.1.139",
  };

  const [settings, setSettings] = useState(initialSettings);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  /* ───────────────── Cities Management ───────────────── */
  const [cities, setCities] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [deleteErrorDialog, setDeleteErrorDialog] = useState({ open: false, cityName: "", customerCount: 0, boxCount: 0 });

  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      const res = await api.get("/cities");
      const list = Array.isArray(res.data)
        ? res.data.map((c) => (typeof c === "string" ? c : c.location || c.name)).filter(Boolean)
        : [];
      setCities(list);
    } catch (err) {
      console.error("Failed to fetch cities", err);
      setSnackbarMsg("Failed to load cities");
      setOpenSnackbar(true);
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleAddCity = async () => {
    const name = newCity.trim();
    if (!name) {
      setSnackbarMsg("City name is required");
      setOpenSnackbar(true);
      return;
    }
    if (cities.includes(name)) {
      setSnackbarMsg("City already exists");
      setOpenSnackbar(true);
      return;
    }
    try {
      await api.post("/cities", { name });
      setCities((prev) => [...prev, name].sort());
      setNewCity("");
      setSnackbarMsg("City added successfully");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to add city", err);
      setSnackbarMsg(`Failed to add city: ${err.response?.data?.error || err.message}`);
      setOpenSnackbar(true);
    }
  };

  const handleDeleteCity = async (cityName) => {
    // Prevent deletion of Kuopio (main city)
    if (cityName.toLowerCase() === 'kuopio') {
      setSnackbarMsg('Cannot delete Kuopio - it is the main city');
      setOpenSnackbar(true);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${cityName}"?`)) return;
    try {
      await api.delete("/cities", { data: { name: cityName } });
      setCities((prev) => prev.filter((c) => c !== cityName));
      setSnackbarMsg("City deleted successfully");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to delete city", err);
      const errorData = err.response?.data;
      if (errorData?.inUse) {
        setDeleteErrorDialog({
          open: true,
          cityName,
          customerCount: errorData.customerCount || 0,
          boxCount: errorData.boxCount || 0
        });
      } else {
        setSnackbarMsg(`Failed to delete city: ${errorData?.error || err.message}`);
        setOpenSnackbar(true);
      }
    }
  };

  /* ───────────────── SMS templates editor ───────────────── */
  const SMS_KEYS = ["lapinlahti", "kuopio", "lahti", "joensuu", "mikkeli", "varkaus", "default"];
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTemplates, setSmsTemplates] = useState({
    lapinlahti: "", kuopio: "", lahti: "", joensuu: "", mikkeli: "", varkaus: "", default: ""
  });

  const human = (k) => (k === "default" ? "Default (fallback)" : k.charAt(0).toUpperCase() + k.slice(1));

  const loadSmsTemplates = async () => {
    setSmsLoading(true);
    try {
      const { data } = await api.get("/sms-templates");
      const incoming = data?.templates || data || {};
      const next = { ...smsTemplates };
      SMS_KEYS.forEach(k => { next[k] = incoming[k] ?? next[k] ?? ""; });
      setSmsTemplates(next);
    } catch (e) {
      console.error("Failed to load SMS templates", e);
      setSnackbarMsg("Failed to load SMS templates.");
      setOpenSnackbar(true);
    } finally {
      setSmsLoading(false);
    }
  };

  const saveSmsTemplates = async () => {
    setSmsSaving(true);
    try {
      await api.put("/sms-templates", { templates: smsTemplates });
      setSnackbarMsg("SMS templates saved successfully.");
      setOpenSnackbar(true);
    } catch (e) {
      console.error("Failed to save SMS templates", e);
      setSnackbarMsg(`Failed to save: ${e.response?.data?.error || e.message}`);
      setOpenSnackbar(true);
    } finally {
      setSmsSaving(false);
    }
  };
  /* ──────────────────────────────────────────────────────── */

  /* ───────────────── Activity Log ───────────────── */
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(25);

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await api.get('/dashboard/activity?limit=10000');
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to fetch activities', err);
      setSnackbarMsg('Failed to load activity log');
      setOpenSnackbar(true);
    } finally {
      setActivitiesLoading(false);
    }
  };
  /* ──────────────────────────────────────────────────────── */

  /* ───────────────── Accounts Management ───────────────── */
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountDialog, setAccountDialog] = useState({ open: false, mode: 'create', account: null });
  const [newAccount, setNewAccount] = useState({
    id: '', password: '', full_name: '', email: '', role: 'employee',
    can_edit_customers: false, can_force_delete: false, can_view_reports: false,
    allowed_cities: []
  });
  const [changePasswordDialog, setChangePasswordDialog] = useState({ open: false, accountId: '', accountName: '', newPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
      setSnackbarMsg('Failed to load accounts');
      setOpenSnackbar(true);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.id || !newAccount.password) {
      setSnackbarMsg('Username and password are required');
      setOpenSnackbar(true);
      return;
    }
    try {
      await api.post('/accounts', newAccount);
      setSnackbarMsg('Account created successfully');
      setOpenSnackbar(true);
      setAccountDialog({ open: false, mode: 'create', account: null });
      setNewAccount({
        id: '', password: '', full_name: '', email: '', role: 'employee',
        can_edit_customers: false, can_force_delete: false, can_view_reports: false,
        allowed_cities: []
      });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to create account', err);
      setSnackbarMsg(`Failed to create account: ${err.response?.data?.error || err.message}`);
      setOpenSnackbar(true);
    }
  };

  const handleUpdateAccount = async () => {
    if (!accountDialog.account) return;
    try {
      const { id, password, created_at, updated_at, ...updateData } = accountDialog.account;
      await api.put(`/accounts/${id}`, updateData);
      setSnackbarMsg('Account updated successfully');
      setOpenSnackbar(true);
      setAccountDialog({ open: false, mode: 'create', account: null });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to update account', err);
      setSnackbarMsg(`Failed to update account: ${err.response?.data?.error || err.message}`);
      setOpenSnackbar(true);
    }
  };

  const handleChangePassword = async () => {
    if (!changePasswordDialog.newPassword) {
      setSnackbarMsg('New password is required');
      setOpenSnackbar(true);
      return;
    }
    try {
      await api.put(`/accounts/${changePasswordDialog.accountId}/password`, { newPassword: changePasswordDialog.newPassword });
      setSnackbarMsg('Password changed successfully');
      setOpenSnackbar(true);
      setChangePasswordDialog({ open: false, accountId: '', accountName: '', newPassword: '' });
    } catch (err) {
      console.error('Failed to change password', err);
      setSnackbarMsg(`Failed to change password: ${err.response?.data?.error || err.message}`);
      setOpenSnackbar(true);
    }
  };

  const handleDeleteAccount = async (accountId, accountName) => {
    if (!window.confirm(`Are you sure you want to delete account "${accountName || accountId}"?`)) return;
    try {
      await api.delete(`/accounts/${accountId}`);
      setSnackbarMsg('Account deleted successfully');
      setOpenSnackbar(true);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
      setSnackbarMsg(`Failed to delete account: ${err.response?.data?.error || err.message}`);
      setOpenSnackbar(true);
    }
  };

  const openEditDialog = (account) => {
    setAccountDialog({ open: true, mode: 'edit', account: { ...account } });
  };

  const openCreateDialog = () => {
    setAccountDialog({ open: true, mode: 'create', account: null });
  };
  /* ──────────────────────────────────────────────────────── */

  useEffect(() => {
    api.get('/default-setting')
      .then((res) => {
        const raw = res.data;
        const parsed = {
          juice_quantity: Number(raw.juice_quantity) || "",
          no_pouches: Number(raw.no_pouches) || "",
          price: Number(raw.price) || "",
          shipping_fee: Number(raw.shipping_fee) || "",
          printer_ip: raw.printer_ip || "192.168.1.139",
        };
        setSettings(parsed);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (tabValue === 1) fetchCities();
    if (tabValue === 2) {
      fetchCities(); // Need cities for allowed_cities dropdown
      fetchAccounts();
    }
    if (tabValue === 3) loadSmsTemplates();
    if (tabValue === 4) fetchActivities();
  }, [tabValue]);

  const handleConfirm = ({ id, password }) => {
    setModalOpen(false);

    const payload = {
      juice_quantity: Number(settings.juice_quantity),
      no_pouches: Number(settings.no_pouches),
      price: Number(settings.price),
      shipping_fee: Number(settings.shipping_fee),
      printer_ip: settings.printer_ip,
      id,
      password
    };

    api.post("/default-setting", JSON.stringify(payload), { headers: { "Content-Type": "application/json" } })
      .then(() => {
        setSnackbarMsg("Settings saved successfully!");
        setOpenSnackbar(true);
      })
      .catch((err) => {
        setSnackbarMsg(`Failed to save settings: ${err.response?.data?.error || err.message}`);
        setOpenSnackbar(true);
      });
  };

  const handleButtonClick = () => setModalOpen(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <>
      <DrawerComponent />
      <Box
        sx={{
          backgroundColor: "#ffffff",
          minHeight: "90vh",
          paddingTop: 4,
          paddingBottom: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "min(90%, 800px)",
            padding: 4,
            backgroundColor: "#ffffff",
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", marginBottom: 3, fontWeight: "bold" }}
          >
            Settings
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="Default Values" />
            <Tab label="Cities Management" />
            <Tab label="Accounts Management" />
            <Tab label="SMS Templates" />
            <Tab label="Activity Log" />
          </Tabs>

          {/* Tab 0: Default Values */}
          {tabValue === 0 && (
            <Box>
              <form autoComplete="off">
                <input type="text" name="fakeusernameremembered" style={{ display: "none" }} />
                <input type="password" name="fakepasswordremembered" style={{ display: "none" }} />

                <Stack spacing={3}>
                  <TextField
                    name="juice_quantity"
                    type="number"
                    required
                    fullWidth
                    variant="filled"
                    label="Juice Quantity (L/Kilo)"
                    value={settings.juice_quantity}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <TextField
                    name="no_pouches"
                    type="number"
                    required
                    fullWidth
                    variant="filled"
                    label="Number of Pouches (L/Pouch)"
                    value={settings.no_pouches}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <TextField
                    name="price"
                    type="number"
                    required
                    fullWidth
                    variant="filled"
                    label="Price (€/L)"
                    value={settings.price}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <TextField
                    name="shipping_fee"
                    type="number"
                    required
                    fullWidth
                    variant="filled"
                    label="Shipping fee (€/L)"
                    value={settings.shipping_fee}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <TextField
                    name="printer_ip"
                    fullWidth
                    variant="filled"
                    label="Printer IP Address"
                    value={settings.printer_ip}
                    onChange={handleChange}
                    autoComplete="off"
                  />

                  <Button variant="contained" onClick={handleButtonClick} size="large">
                    Save Default Values
                  </Button>
                </Stack>
              </form>
            </Box>
          )}

          {/* Tab 1: Cities Management */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Manage Cities
              </Typography>

              <Stack spacing={2} sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <TextField
                      label="New City Name"
                      fullWidth
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      variant="filled"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddCity}
                      size="large"
                    >
                      Add City
                    </Button>
                  </Grid>
                </Grid>
              </Stack>

              {citiesLoading ? (
                <Stack alignItems="center" py={3}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {cities.length} {cities.length === 1 ? 'city' : 'cities'} in the system
                  </Typography>
                  {cities.length === 0 ? (
                    <Alert severity="info">No cities added yet. Add your first city above.</Alert>
                  ) : (
                    <List>
                      {cities.map((city) => (
                        <ListItem
                          key={city}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              color="error" 
                              onClick={() => handleDeleteCity(city)}
                              disabled={city.toLowerCase() === 'kuopio'}
                              title={city.toLowerCase() === 'kuopio' ? 'Cannot delete main city' : 'Delete city'}
                            >
                              <Delete />
                            </IconButton>
                          }
                          sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}
                        >
                          <ListItemText 
                            primary={city} 
                            secondary={city.toLowerCase() === 'kuopio' ? 'Main City' : null}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Tab 2: Accounts Management */}
          {tabValue === 2 && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6">Accounts Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                  Create New Account
                </Button>
              </Stack>

              {accountsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {accounts.map((acc) => (
                    <ListItem
                      key={acc.id}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 2,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        backgroundColor: acc.is_active ? 'transparent' : '#f5f5f5'
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {acc.full_name || acc.id}
                            {acc.role === 'admin' && (
                              <Chip label="Admin" size="small" color="error" sx={{ ml: 1 }} />
                            )}
                            {!acc.is_active && (
                              <Chip label="Inactive" size="small" color="default" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Username: {acc.id} {acc.email && `• Email: ${acc.email}`}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setChangePasswordDialog({ open: true, accountId: acc.id, accountName: acc.full_name || acc.id, newPassword: '' })}
                            title="Change Password"
                          >
                            <Lock />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={() => openEditDialog(acc)} title="Edit Account">
                            <Edit />
                          </IconButton>
                          {acc.id !== 'admin' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteAccount(acc.id, acc.full_name)}
                              title="Delete Account"
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Stack>
                      </Box>
                      <Divider sx={{ width: '100%', my: 1 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight="bold">Permissions:</Typography>
                          <Box sx={{ pl: 1 }}>
                            <Typography variant="body2">✓ Edit Customers: {acc.can_edit_customers ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">✓ Force Delete: {acc.can_force_delete ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">✓ View Reports: {acc.can_view_reports ? 'Yes' : 'No'}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight="bold">Allowed Cities:</Typography>
                          <Box sx={{ pl: 1 }}>
                            {acc.allowed_cities && acc.allowed_cities.length > 0 ? (
                              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {acc.allowed_cities.map((city) => (
                                  <Chip key={city} label={city} size="small" />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">All cities</Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                  {accounts.length === 0 && (
                    <Alert severity="info">No accounts found. Create your first account to get started.</Alert>
                  )}
                </List>
              )}
            </Box>
          )}

          {/* Tab 3: SMS Templates */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Pickup SMS Templates
              </Typography>

              {smsLoading ? (
                <Stack alignItems="center" py={3}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="info">
                    These messages are sent when orders are ready for pickup. Customize per location; "Default" is used when a city does not match.
                  </Alert>
                  <Divider />
                  {SMS_KEYS.map((k) => (
                    <TextField
                      key={k}
                      label={human(k)}
                      value={smsTemplates[k] ?? ""}
                      onChange={(e) => setSmsTemplates((prev) => ({ ...prev, [k]: e.target.value }))}
                      fullWidth
                      multiline
                      minRows={3}
                      variant="filled"
                      helperText={`${(smsTemplates[k] || "").length} characters`}
                    />
                  ))}
                  <Button
                    variant="contained"
                    onClick={saveSmsTemplates}
                    disabled={smsSaving}
                    size="large"
                  >
                    {smsSaving ? "Saving..." : "Save SMS Templates"}
                  </Button>
                </Stack>
              )}
            </Box>
          )}

          {/* Tab 4: Activity Log */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                System Activity Log
              </Typography>

              {activitiesLoading ? (
                <Stack alignItems="center" py={3}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Showing all recent system activities. This includes customer registrations, juice processing completions, and pallet creations.
                  </Alert>

                  {activities.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                      No activities found.
                    </Typography>
                  ) : (
                    <Box>
                      <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        {activities
                          .slice(activityPage * activityRowsPerPage, activityPage * activityRowsPerPage + activityRowsPerPage)
                          .map((activity, index) => (
                          <Box key={activityPage * activityRowsPerPage + index}>
                            <ListItem sx={{ py: 2 }}>
                              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor:
                                      activity.type === 'customer' ? 'success.main' :
                                      activity.type === 'processing' ? 'warning.main' :
                                      activity.type === 'warehouse' ? 'info.main' :
                                      'text.secondary',
                                    flexShrink: 0
                                  }}
                                />
                                <ListItemText
                                  primary={activity.message}
                                  secondary={new Date(activity.ts).toLocaleString()}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                                <Chip
                                  label={activity.type}
                                  size="small"
                                  sx={{
                                    bgcolor:
                                      activity.type === 'customer' ? 'success.light' :
                                      activity.type === 'processing' ? 'warning.light' :
                                      activity.type === 'warehouse' ? 'info.light' :
                                      'grey.300',
                                    color:
                                      activity.type === 'customer' ? 'success.dark' :
                                      activity.type === 'processing' ? 'warning.dark' :
                                      activity.type === 'warehouse' ? 'info.dark' :
                                      'text.primary',
                                  }}
                                />
                              </Stack>
                            </ListItem>
                            {index < Math.min(activityRowsPerPage, activities.length - activityPage * activityRowsPerPage) - 1 && <Divider />}
                          </Box>
                        ))}
                      </List>
                      <TablePagination
                        component="div"
                        count={activities.length}
                        page={activityPage}
                        onPageChange={(e, newPage) => setActivityPage(newPage)}
                        rowsPerPage={activityRowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setActivityRowsPerPage(parseInt(e.target.value, 10));
                          setActivityPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMsg || "Operation successful!"}
        </Alert>
      </Snackbar>

      {/* City Deletion Error Dialog */}
      <Dialog 
        open={deleteErrorDialog.open} 
        onClose={() => setDeleteErrorDialog({ ...deleteErrorDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f44336', color: 'white', fontWeight: 'bold' }}>
          Cannot Delete City
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Cannot delete city "{deleteErrorDialog.cityName}".</strong>
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            It is currently used by:
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography variant="body2">• <strong>{deleteErrorDialog.customerCount}</strong> customer(s)</Typography>
            <Typography variant="body2">• <strong>{deleteErrorDialog.boxCount}</strong> box(es)</Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>To delete this city:</strong><br />
              You will need to manually check from the <strong>Unified Management page</strong> and delete customers, boxes, selves and pallets related to this city first.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteErrorDialog({ ...deleteErrorDialog, open: false })} 
            variant="contained"
            color="primary"
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Account Dialog */}
      <Dialog
        open={accountDialog.open}
        onClose={() => setAccountDialog({ open: false, mode: 'create', account: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {accountDialog.mode === 'create' ? 'Create New Account' : 'Edit Account'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {accountDialog.mode === 'create' ? (
              <>
                <TextField
                  label="Username/ID"
                  value={newAccount.id}
                  onChange={(e) => setNewAccount({ ...newAccount, id: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="Password"
                  type={showNewPassword ? "text" : "password"}
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Full Name"
                  value={newAccount.full_name}
                  onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newAccount.role}
                    onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                <Divider />
                <Typography variant="subtitle2" fontWeight="bold">Permissions</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_edit_customers}
                        onChange={(e) => setNewAccount({ ...newAccount, can_edit_customers: e.target.checked })}
                      />
                    }
                    label="Can edit customer information in Unified Management"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_force_delete}
                        onChange={(e) => setNewAccount({ ...newAccount, can_force_delete: e.target.checked })}
                      />
                    }
                    label="Can permanently delete customers in Delete Bin"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_view_reports}
                        onChange={(e) => setNewAccount({ ...newAccount, can_view_reports: e.target.checked })}
                      />
                    }
                    label="Can view Admin Reports"
                  />
                </FormGroup>
                <Divider />
                <FormControl fullWidth>
                  <InputLabel>Allowed Cities (leave empty for all)</InputLabel>
                  <Select
                    multiple
                    value={newAccount.allowed_cities}
                    onChange={(e) => setNewAccount({ ...newAccount, allowed_cities: e.target.value })}
                    input={<OutlinedInput label="Allowed Cities (leave empty for all)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {cities.map((city) => (
                      <MenuItem key={city} value={city}>
                        <Checkbox checked={newAccount.allowed_cities.indexOf(city) > -1} />
                        <ListItemText primary={city} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              accountDialog.account && (
                <>
                  <TextField
                    label="Username/ID"
                    value={accountDialog.account.id}
                    disabled
                    fullWidth
                  />
                  <TextField
                    label="Full Name"
                    value={accountDialog.account.full_name || ''}
                    onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, full_name: e.target.value } })}
                    fullWidth
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={accountDialog.account.email || ''}
                    onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, email: e.target.value } })}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={accountDialog.account.role}
                      onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, role: e.target.value } })}
                      label="Role"
                      disabled={accountDialog.account.id === 'admin'}
                    >
                      <MenuItem value="employee">Employee</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={accountDialog.account.is_active}
                        onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, is_active: e.target.checked } })}
                      />
                    }
                    label="Account is active"
                  />
                  <Divider />
                  <Typography variant="subtitle2" fontWeight="bold">Permissions</Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_edit_customers}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_edit_customers: e.target.checked } })}
                        />
                      }
                      label="Can edit customer information in Unified Management"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_force_delete}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_force_delete: e.target.checked } })}
                        />
                      }
                      label="Can permanently delete customers in Delete Bin"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_view_reports}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_view_reports: e.target.checked } })}
                        />
                      }
                      label="Can view Admin Reports"
                    />
                  </FormGroup>
                  <Divider />
                  <FormControl fullWidth>
                    <InputLabel>Allowed Cities (leave empty for all)</InputLabel>
                    <Select
                      multiple
                      value={accountDialog.account.allowed_cities || []}
                      onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, allowed_cities: e.target.value } })}
                      input={<OutlinedInput label="Allowed Cities (leave empty for all)" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {cities.map((city) => (
                        <MenuItem key={city} value={city}>
                          <Checkbox checked={(accountDialog.account.allowed_cities || []).indexOf(city) > -1} />
                          <ListItemText primary={city} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountDialog({ open: false, mode: 'create', account: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={accountDialog.mode === 'create' ? handleCreateAccount : handleUpdateAccount}
          >
            {accountDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialog.open}
        onClose={() => setChangePasswordDialog({ open: false, accountId: '', accountName: '', newPassword: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password for {changePasswordDialog.accountName}</DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            type={showChangePassword ? "text" : "password"}
            value={changePasswordDialog.newPassword}
            onChange={(e) => setChangePasswordDialog({ ...changePasswordDialog, newPassword: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    edge="end"
                  >
                    {showChangePassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordDialog({ open: false, accountId: '', accountName: '', newPassword: '' })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
    </>
  );
}

export default SettingPage;
