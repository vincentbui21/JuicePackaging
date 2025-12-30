import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert, Tabs, Tab, List, ListItem, ListItemText, IconButton, Grid, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
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
    if (tabValue === 3) loadSmsTemplates();
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
                            <IconButton edge="end" color="error" onClick={() => handleDeleteCity(city)}>
                              <Delete />
                            </IconButton>
                          }
                          sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}
                        >
                          <ListItemText primary={city} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Tab 2: Accounts Management (Placeholder) */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Accounts Management
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                This section is under development. Account management features will be available soon.
              </Alert>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Upcoming features:
                </Typography>
                <ul style={{ marginTop: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Create and manage admin accounts</Typography></li>
                  <li><Typography variant="body2">Create and manage employee accounts</Typography></li>
                  <li><Typography variant="body2">Set role-based permissions</Typography></li>
                  <li><Typography variant="body2">Reset passwords</Typography></li>
                </ul>
              </Stack>
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

      <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
    </>
  );
}

export default SettingPage;
