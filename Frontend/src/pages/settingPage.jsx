import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert, Tabs, Tab, List, ListItem, ListItemText, IconButton, Grid, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, FormGroup, Select, MenuItem, InputLabel, FormControl, Chip, OutlinedInput, InputAdornment, TablePagination, Autocomplete } from "@mui/material";
import { Add, Delete, Edit, Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import DrawerComponent from "../components/drawer";
import { useState, useEffect } from "react";
import api from '../services/axios';
import PasswordModal from "../components/PasswordModal";
import { useTranslation } from 'react-i18next';

// Major Finland cities for autocomplete suggestions
const FINLAND_CITIES = [
  "Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyväskylä", "Lahti", "Kuopio", 
  "Pori", "Joensuu", "Lappeenranta", "Hämeenlinna", "Vaasa", "Rovaniemi", "Seinäjoki", 
  "Mikkeli", "Kotka", "Salo", "Porvoo", "Kouvola", "Hyvinkää", "Nurmijärvi", "Järvenpää",
  "Rauma", "Tuusula", "Kirkkonummi", "Kajaani", "Kerava", "Savonlinna", "Nokia", "Ylöjärvi",
  "Kangasala", "Vihti", "Kaarina", "Raisio", "Iisalmi", "Kemi", "Tornio", "Raahe",
  "Lapinlahti", "Varkaus", "Imatra", "Lohja", "Valkeakoski", "Sipoo", "Lieto"
].sort();

function SettingPage() {
  const { t } = useTranslation();
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
    const trimmed = newCity.trim();
    if (!trimmed) {
      setSnackbarMsg("City name is required");
      setOpenSnackbar(true);
      return;
    }
    // Capitalize first letter of each word
    const name = trimmed.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
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
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTemplates, setSmsTemplates] = useState({});

  // Dynamic SMS keys based on cities + default
  const getSmsKeys = () => {
    const cityKeys = cities.map(c => c.toLowerCase());
    return [...cityKeys, "default"];
  };

  const human = (k) => (k === "default" ? "Default (fallback)" : k.charAt(0).toUpperCase() + k.slice(1));

  const loadSmsTemplates = async () => {
    setSmsLoading(true);
    try {
      const { data } = await api.get("/sms-templates");
      const incoming = data?.templates || data || {};
      const next = {};
      // Load templates for all cities + default
      const keys = getSmsKeys();
      keys.forEach(k => { next[k] = incoming[k] ?? ""; });
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
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
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
    if (tabValue === 3) {
      // Load cities first, then SMS templates
      fetchCities().then(() => loadSmsTemplates());
    }
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
          backgroundColor: "background.default",
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
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", marginBottom: 3, fontWeight: "bold" }}
          >
            {t('settings.title')}
          </Typography>

          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ 
              mb: 3,
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 2,
                whiteSpace: 'nowrap'
              }
            }}
          >
            <Tab label={t('settings.tab_default_values')} />
            <Tab label={t('settings.tab_cities')} />
            <Tab label={t('settings.tab_accounts')} />
            <Tab label={t('settings.tab_sms')} />
            <Tab label={t('settings.tab_activity')} />
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
                    label={t('settings.juice_quantity_label')}
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
                    label={t('settings.pouches_label')}
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
                    label={t('settings.price_label')}
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
                    label={t('settings.shipping_label')}
                    value={settings.shipping_fee}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                  <TextField
                    name="printer_ip"
                    fullWidth
                    variant="filled"
                    label={t('settings.printer_label')}
                    value={settings.printer_ip}
                    onChange={handleChange}
                    autoComplete="off"
                  />

                  <Button variant="contained" onClick={handleButtonClick} size="large">
                    {t('settings.save_defaults')}
                  </Button>
                </Stack>
              </form>
            </Box>
          )}

          {/* Tab 1: Cities Management */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('settings.add_city_title')}
              </Typography>

              <Stack spacing={2} sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <Autocomplete
                      freeSolo
                      options={FINLAND_CITIES}
                      value={newCity}
                      onInputChange={(event, newValue) => setNewCity(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('settings.select_city_label')}
                          variant="filled"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
                          helperText={t('settings.select_city_helper')}
                        />
                      )}
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
                      {t('settings.add_city_button')}
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
                    {cities.length === 1 ? t('settings.city_count', { count: cities.length }) : t('settings.city_count_plural', { count: cities.length })}
                  </Typography>
                  {cities.length === 0 ? (
                    <Alert severity="info">{t('settings.no_cities')}</Alert>
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
                              title={city.toLowerCase() === 'kuopio' ? t('settings.cannot_delete_main') : t('settings.delete_city')}
                            >
                              <Delete />
                            </IconButton>
                          }
                          sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}
                        >
                          <ListItemText 
                            primary={city} 
                            secondary={city.toLowerCase() === 'kuopio' ? t('settings.main_city') : null}
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
                <Typography variant="h6">{t('settings.accounts_title')}</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                  {t('settings.create_account')}
                </Button>
              </Stack>

              {/* Search Bar */}
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t('settings.search_accounts')}
                value={accountSearchTerm}
                onChange={(e) => setAccountSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
              />

              {accountsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {accounts
                    .filter((acc) => {
                      if (!accountSearchTerm.trim()) return true;
                      const search = accountSearchTerm.toLowerCase();
                      return (
                        (acc.id || '').toLowerCase().includes(search) ||
                        (acc.full_name || '').toLowerCase().includes(search) ||
                        (acc.email || '').toLowerCase().includes(search) ||
                        (acc.allowed_cities || []).some(city => city.toLowerCase().includes(search))
                      );
                    })
                    .map((acc) => (
                    <ListItem
                      key={acc.id}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 2,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        backgroundColor: acc.is_active ? 'transparent' : 'action.hover',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        }
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {acc.full_name || acc.id}
                            {acc.role === 'admin' && (
                              <Chip label={t('settings.admin_label')} size="small" color="error" sx={{ ml: 1 }} />
                            )}
                            {!acc.is_active && (
                              <Chip label={t('settings.inactive_label')} size="small" color="default" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('settings.username_label')}: {acc.id} {acc.email && `• ${t('settings.email_label')}: ${acc.email}`}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setChangePasswordDialog({ open: true, accountId: acc.id, accountName: acc.full_name || acc.id, newPassword: '' })}
                            title={t('settings.change_password')}
                          >
                            <Lock />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={() => openEditDialog(acc)} title={t('settings.edit_account')}>
                            <Edit />
                          </IconButton>
                          {acc.id !== 'admin' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteAccount(acc.id, acc.full_name)}
                              title={t('settings.delete_account')}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Stack>
                      </Box>
                      <Divider sx={{ width: '100%', my: 1 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight="bold">{t('settings.permissions_title')}</Typography>
                          <Box sx={{ pl: 1 }}>
                            <Typography variant="body2">✓ {t('settings.edit_customers')}: {acc.can_edit_customers ? t('settings.yes') : t('settings.no')}</Typography>
                            <Typography variant="body2">✓ {t('settings.force_delete')}: {acc.can_force_delete ? t('settings.yes') : t('settings.no')}</Typography>
                            <Typography variant="body2">✓ {t('settings.view_reports')}: {acc.can_view_reports ? t('settings.yes') : t('settings.no')}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight="bold">{t('settings.allowed_cities_title')}</Typography>
                          <Box sx={{ pl: 1 }}>
                            {acc.allowed_cities && acc.allowed_cities.length > 0 ? (
                              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {acc.allowed_cities.map((city) => (
                                  <Chip key={city} label={city} size="small" />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">{t('settings.all_cities')}</Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                  {accounts.filter((acc) => {
                    if (!accountSearchTerm.trim()) return true;
                    const search = accountSearchTerm.toLowerCase();
                    return (
                      (acc.id || '').toLowerCase().includes(search) ||
                      (acc.full_name || '').toLowerCase().includes(search) ||
                      (acc.email || '').toLowerCase().includes(search) ||
                      (acc.allowed_cities || []).some(city => city.toLowerCase().includes(search))
                    );
                  }).length === 0 && (
                    <Alert severity="info">
                      {accountSearchTerm.trim() 
                        ? t('settings.no_accounts_found', { searchTerm: accountSearchTerm })
                        : t('settings.no_accounts')}
                    </Alert>
                  )}
                </List>
              )}
            </Box>
          )}

          {/* Tab 3: SMS Templates */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('settings.sms_title')}
              </Typography>

              {smsLoading ? (
                <Stack alignItems="center" py={3}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="info">
                    {t('settings.sms_info')}
                  </Alert>
                  {cities.length === 0 && (
                    <Alert severity="warning">
                      {t('settings.no_cities_warning')}
                    </Alert>
                  )}
                  <Divider />
                  {getSmsKeys().map((k) => (
                    <Paper
                      key={k}
                      elevation={1}
                      sx={{
                        p: 2,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        }
                      }}
                    >
                      <TextField
                        label={human(k)}
                        value={smsTemplates[k] ?? ""}
                        onChange={(e) => setSmsTemplates((prev) => ({ ...prev, [k]: e.target.value }))}
                        fullWidth
                        multiline
                        minRows={3}
                        variant="filled"
                        helperText={t('settings.characters_count', { count: (smsTemplates[k] || "").length })}
                      />
                    </Paper>
                  ))}
                  <Button
                    variant="contained"
                    onClick={saveSmsTemplates}
                    disabled={smsSaving}
                    size="large"
                  >
                    {smsSaving ? t('settings.saving') : t('settings.save_sms')}
                  </Button>
                </Stack>
              )}
            </Box>
          )}

          {/* Tab 4: Activity Log */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('settings.activity_title')}
              </Typography>

              {activitiesLoading ? (
                <Stack alignItems="center" py={3}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('settings.activity_info')}
                  </Alert>

                  {activities.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                      {t('settings.no_activities')}
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
          {snackbarMsg || t('settings.success_message')}
        </Alert>
      </Snackbar>

      {/* City Deletion Error Dialog */}
      <Dialog 
        open={deleteErrorDialog.open} 
        onClose={() => setDeleteErrorDialog({ ...deleteErrorDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold' }}>
          {t('settings.cannot_delete_city')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>{t('settings.cannot_delete_message', { cityName: deleteErrorDialog.cityName })}</strong>
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            {t('settings.used_by')}
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography variant="body2">• <strong>{t('settings.customer_count', { count: deleteErrorDialog.customerCount })}</strong></Typography>
            <Typography variant="body2">• <strong>{t('settings.box_count', { count: deleteErrorDialog.boxCount })}</strong></Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{t('settings.delete_instruction')}</strong><br />
              <span dangerouslySetInnerHTML={{ __html: t('settings.delete_instruction_detail') }} />
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteErrorDialog({ ...deleteErrorDialog, open: false })} 
            variant="contained"
            color="primary"
          >
            {t('settings.understood')}
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
          {accountDialog.mode === 'create' ? t('settings.create_dialog_title') : t('settings.edit_dialog_title')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {accountDialog.mode === 'create' ? (
              <>
                <TextField
                  label={t('settings.username_id')}
                  value={newAccount.id}
                  onChange={(e) => setNewAccount({ ...newAccount, id: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label={t('settings.password')}
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
                  label={t('settings.full_name')}
                  value={newAccount.full_name}
                  onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={t('settings.email')}
                  type="email"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>{t('settings.role')}</InputLabel>
                  <Select
                    value={newAccount.role}
                    onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                    label={t('settings.role')}
                  >
                    <MenuItem value="employee">{t('settings.employee')}</MenuItem>
                    <MenuItem value="admin">{t('settings.admin')}</MenuItem>
                  </Select>
                </FormControl>
                <Divider />
                <Typography variant="subtitle2" fontWeight="bold">{t('settings.permissions')}</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_edit_customers}
                        onChange={(e) => setNewAccount({ ...newAccount, can_edit_customers: e.target.checked })}
                      />
                    }
                    label={t('settings.perm_edit_customers')}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_force_delete}
                        onChange={(e) => setNewAccount({ ...newAccount, can_force_delete: e.target.checked })}
                      />
                    }
                    label={t('settings.perm_force_delete')}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newAccount.can_view_reports}
                        onChange={(e) => setNewAccount({ ...newAccount, can_view_reports: e.target.checked })}
                      />
                    }
                    label={t('settings.perm_view_reports')}
                  />
                </FormGroup>
                <Divider />
                <FormControl fullWidth>
                  <InputLabel>{t('settings.allowed_cities_select')}</InputLabel>
                  <Select
                    multiple
                    value={newAccount.allowed_cities}
                    onChange={(e) => setNewAccount({ ...newAccount, allowed_cities: e.target.value })}
                    input={<OutlinedInput label={t('settings.allowed_cities_select')} />}
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
                    label={t('settings.username_id')}
                    value={accountDialog.account.id}
                    disabled
                    fullWidth
                  />
                  <TextField
                    label={t('settings.full_name')}
                    value={accountDialog.account.full_name || ''}
                    onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, full_name: e.target.value } })}
                    fullWidth
                  />
                  <TextField
                    label={t('settings.email')}
                    type="email"
                    value={accountDialog.account.email || ''}
                    onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, email: e.target.value } })}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>{t('settings.role')}</InputLabel>
                    <Select
                      value={accountDialog.account.role}
                      onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, role: e.target.value } })}
                      label={t('settings.role')}
                      disabled={accountDialog.account.id === 'admin'}
                    >
                      <MenuItem value="employee">{t('settings.employee')}</MenuItem>
                      <MenuItem value="admin">{t('settings.admin')}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={accountDialog.account.is_active}
                        onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, is_active: e.target.checked } })}
                      />
                    }
                    label={t('settings.account_active')}
                  />
                  <Divider />
                  <Typography variant="subtitle2" fontWeight="bold">{t('settings.permissions')}</Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_edit_customers}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_edit_customers: e.target.checked } })}
                        />
                      }
                      label={t('settings.perm_edit_customers')}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_force_delete}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_force_delete: e.target.checked } })}
                        />
                      }
                      label={t('settings.perm_force_delete')}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={accountDialog.account.can_view_reports}
                          onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, can_view_reports: e.target.checked } })}
                        />
                      }
                      label={t('settings.perm_view_reports')}
                    />
                  </FormGroup>
                  <Divider />
                  <FormControl fullWidth>
                    <InputLabel>{t('settings.allowed_cities_select')}</InputLabel>
                    <Select
                      multiple
                      value={accountDialog.account.allowed_cities || []}
                      onChange={(e) => setAccountDialog({ ...accountDialog, account: { ...accountDialog.account, allowed_cities: e.target.value } })}
                      input={<OutlinedInput label={t('settings.allowed_cities_select')} />}
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
          <Button onClick={() => setAccountDialog({ open: false, mode: 'create', account: null })}>{t('settings.cancel')}</Button>
          <Button
            variant="contained"
            onClick={accountDialog.mode === 'create' ? handleCreateAccount : handleUpdateAccount}
          >
            {accountDialog.mode === 'create' ? t('settings.create') : t('settings.update')}
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
        <DialogTitle>{t('settings.change_password_title', { name: changePasswordDialog.accountName })}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('settings.new_password')}
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
            {t('settings.cancel')}
          </Button>
          <Button variant="contained" onClick={handleChangePassword}>
            {t('settings.change_password_button')}
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
    </>
  );
}

export default SettingPage;
