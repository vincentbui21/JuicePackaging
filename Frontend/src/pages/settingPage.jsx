import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert } from "@mui/material";
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

    // Log current settings for debugging
    console.log("Current settings before sending:", settings);

    // Construct payload explicitly to match backend
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

    // Debug log the payload
    console.log("Payload to send:", JSON.stringify(payload, null, 2));

    api.post("/default-setting", JSON.stringify(payload), { headers: { "Content-Type": "application/json" } })
        .then((res) => {
            console.log("Settings saved successfully. Response:", res.data);

            setOpenSnackbar(true);
            setSnackbarMsg("Settings saved successfully!");

            // Clear only password and new cities fields
            setSettings(prev => ({
                ...prev,
                newCites: "",
                newPass: "",
                newEmployeePass: ""
            }));
        })
        .catch((err) => {
            console.error("Error saving settings:", err.response?.data || err);

            // Show snackbar for errors
            setSnackbarMsg(`Failed to save settings: ${err.response?.data?.error || err.message}`);
            setOpenSnackbar(true);
        });
};


    const handleButtonClick = () => setModalOpen(true);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <>
            <DrawerComponent />
            <Box sx={{ backgroundColor: "#ffffff", minHeight: "90vh", paddingTop: 4, paddingBottom: 4, display: "flex", justifyContent: "center" }}>
                <Paper elevation={3} sx={{ width: "min(90%, 600px)", padding: 4, backgroundColor: "#ffffff", borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>Setting</Typography>
                    <Stack spacing={3}>
                        <TextField name="juice_quantity" type="number" required fullWidth variant="filled" label="Juice Quantity (L/Kilo)" value={settings.juice_quantity} onChange={handleChange} />
                        <TextField name="no_pouches" type="number" required fullWidth variant="filled" label="Number of Pouches (L/Pouch)" value={settings.no_pouches} onChange={handleChange} />
                        <TextField name="price" type="number" required fullWidth variant="filled" label="Price (€/L)" value={settings.price} onChange={handleChange} />
                        <TextField name="shipping_fee" type="number" required fullWidth variant="filled" label="Shipping fee (€/L)" value={settings.shipping_fee} onChange={handleChange} />
                        <TextField name="newCites" fullWidth variant="filled" label="New cities" value={settings.newCites} onChange={handleChange} />
                        <TextField name="newPass" type="password" fullWidth variant="filled" label="New admin password" value={settings.newPass} onChange={handleChange} />
                        <TextField name="newEmployeePass" type="password" fullWidth variant="filled" label="New Employee password" value={settings.newEmployeePass} onChange={handleChange} />
                        <TextField name="printer_ip" fullWidth variant="filled" label="Printer IP Address" value={settings.printer_ip} onChange={handleChange} />
                        <Button variant="contained" onClick={handleButtonClick}>Save</Button>
                    </Stack>
                </Paper>
            </Box>

            <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>Settings saved successfully!</Alert>
            </Snackbar>

            <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
        </>
    );
}

export default SettingPage;
