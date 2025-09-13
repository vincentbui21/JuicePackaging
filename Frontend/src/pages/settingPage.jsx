import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Divider, Chip } from "@mui/material";
import DrawerComponent from "../components/drawer";
import { useState, useEffect } from "react";
import api from '../services/axios';
import PasswordModal from "../components/PasswordModal";

function SettingPage() {
  const initialSettings = {
    juice_quantity: "",
    no_pouches: "",
    price: "",
    shipping_fee: "",
    printer_ip: "192.168.1.139",
    newCites: "",
    newPass: "",
    newEmployeePass: ""
  };

  const [settings, setSettings] = useState(initialSettings);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  /* ───────────────── SMS templates editor ───────────────── */
  const SMS_KEYS = ["lapinlahti", "kuopio", "lahti", "joensuu", "mikkeli", "varkaus", "default"];
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTemplates, setSmsTemplates] = useState({
    lapinlahti: "", kuopio: "", lahti: "", joensuu: "", mikkeli: "", varkaus: "", default: ""
  });
  const [smsSnackOpen, setSmsSnackOpen] = useState(false);
  const [smsSnackMsg, setSmsSnackMsg] = useState("");

  const human = (k) => (k === "default" ? "Default (fallback)" : k.charAt(0).toUpperCase() + k.slice(1));

  const openSmsEditor = async () => {
    setSmsOpen(true);
    if (smsLoading || smsSaving) return;
    setSmsLoading(true);
    try {
      const { data } = await api.get("/sms-templates");
      const incoming = data?.templates || data || {};
      const next = { ...smsTemplates };
      SMS_KEYS.forEach(k => { next[k] = incoming[k] ?? next[k] ?? ""; });
      setSmsTemplates(next);
    } catch (e) {
      console.error("Failed to load SMS templates", e);
      setSmsSnackMsg("Failed to load SMS templates.");
      setSmsSnackOpen(true);
    } finally {
      setSmsLoading(false);
    }
  };

  const saveSmsTemplates = async () => {
    setSmsSaving(true);
    try {
      await api.put("/sms-templates", { templates: smsTemplates });
      setSmsSnackMsg("SMS templates saved.");
      setSmsSnackOpen(true);
      setSmsOpen(false);
    } catch (e) {
      console.error("Failed to save SMS templates", e);
      setSmsSnackMsg(`Failed to save: ${e.response?.data?.error || e.message}`);
      setSmsSnackOpen(true);
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
          newCites: "",
          newPass: "",
          newEmployeePass: ""
        };
        setSettings(parsed);
      })
      .catch((err) => console.error(err));
  }, []);

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

    if (settings.newCites?.trim()) payload.newCities = settings.newCites.trim();
    if (settings.newPass?.trim()) payload.newAdminPassword = settings.newPass.trim();
    if (settings.newEmployeePass?.trim()) payload.newEmployeePassword = settings.newEmployeePass.trim();

    api.post("/default-setting", JSON.stringify(payload), { headers: { "Content-Type": "application/json" } })
      .then(() => {
        setSnackbarMsg("Settings saved successfully!");
        setOpenSnackbar(true);
        setSettings(prev => ({ ...prev, newCites: "", newPass: "", newEmployeePass: "" }));
      })
      .catch((err) => {
        setSnackbarMsg(`Failed to save settings: ${err.response?.data?.error || err.message}`);
        setOpenSnackbar(true);
      });
  };

  const handleButtonClick = () => setModalOpen(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "newCites") {
      newValue = value.charAt(0).toUpperCase() + value.slice(1);
      if (newValue.toLowerCase() === "admin") newValue = "";
    }

    setSettings(prev => ({ ...prev, [name]: newValue }));
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
            width: "min(90%, 600px)",
            padding: 4,
            backgroundColor: "#ffffff",
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", marginBottom: 3, fontWeight: "bold" }}
          >
            Setting
          </Typography>

          <form autoComplete="off">
            {/* Hidden dummy inputs to prevent autofill */}
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
                name="newCites"
                type="text"
                fullWidth
                variant="filled"
                label="New cities"
                value={settings.newCites}
                onChange={handleChange}
                autoComplete="off"
              />
              <TextField
                name="newPass"
                type="password"
                fullWidth
                variant="filled"
                label="New admin password"
                value={settings.newPass}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <TextField
                name="newEmployeePass"
                type="password"
                fullWidth
                variant="filled"
                label="New Employee password"
                value={settings.newEmployeePass}
                onChange={handleChange}
                autoComplete="new-password"
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

              {/* NEW: Edit pickup SMS */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Pickup SMS templates</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label="Lapinlahti" />
                  <Chip label="Kuopio" />
                  <Chip label="Lahti" />
                  <Chip label="Joensuu" />
                  <Chip label="Mikkeli" />
                  <Chip label="Varkaus" />
                  <Chip label="Default" />
                </Stack>
                <Button variant="outlined" color="secondary" onClick={openSmsEditor}>
                  Edit pickup SMS
                </Button>
              </Stack>

              <Button variant="contained" onClick={handleButtonClick}>
                Save
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>

      {/* Save settings snackbar */}
      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMsg || "Settings saved successfully!"}
        </Alert>
      </Snackbar>

      <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />

      {/* SMS editor dialog */}
      <Dialog open={smsOpen} onClose={() => setSmsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit pickup SMS templates</DialogTitle>
        <DialogContent dividers>
          {smsLoading ? (
            <Stack alignItems="center" py={3}><CircularProgress size={24} /></Stack>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                These messages are sent when orders are ready for pickup. Customize per location; “Default” is used when a city does not match.
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmsOpen(false)}>Cancel</Button>
          <Button onClick={saveSmsTemplates} variant="contained" disabled={smsSaving}>
            {smsSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMS snackbar */}
      <Snackbar open={smsSnackOpen} autoHideDuration={3000} onClose={() => setSmsSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSmsSnackOpen(false)} severity="success" sx={{ width: '100%' }}>
          {smsSnackMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SettingPage;
