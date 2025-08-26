import { Typography, Box, Paper, Stack, TextField, Button, Snackbar, Alert } from "@mui/material";
import DrawerComponent from "../components/drawer";
import { useState, useEffect } from "react";
import api from '../services/axios';
import PasswordModal from "../components/PasswordModal";

function SettingPage() {
    var initial_settings ={
        juice_quantity : "",
        no_pouches: "",
        price:"",
        shipping_fee:""
    }

    const [settings, setSettings] = useState(initial_settings)
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);



    useEffect(() => {
    api
        .get('/default-setting')
        .then((res) => {
        const raw = res.data;
        const parsed = Object.fromEntries(
            Object.entries(raw).map(([key, value]) => [key, parseFloat(value)])
        );
        setSettings(parsed);
        })
        .catch((err) => console.error(err));
    }, []);


    const handleConfirm = ({ id, password }) => {
        // console.log("Username:", id); 
        // console.log("Password:", password);
        setModalOpen(false);

        // Here you can call your POST API with id and password
        api
        .post('/default-setting', {...settings, id, password})
        .then((res) =>{
            setOpenSnackbar(true);
        })
        .catch((err)=>{
            console.log("Error saving settings:", err);
        })
    };

    const handleButtonClick = () =>{
        setModalOpen(true);
    }

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
            <Box
                sx={{
                    backgroundColor: "#ffffff",
                    minHeight: "90vh",
                    paddingTop: 4,
                    paddingBottom: 4,
                    display: "flex",
                    justifyContent: "center"
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        width: "min(90%, 600px)",
                        padding: 4,
                        backgroundColor: "#ffffff",
                        borderRadius: 2
                    }}
                >
                    <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>
                        Setting
                    </Typography>

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
                        />

                        <Button variant="contained" onClick={handleButtonClick}>Save</Button>
                    </Stack>

                </Paper>
            </Box>

            <Snackbar
            open={openSnackbar}
            autoHideDuration={3000}
            onClose={() => setOpenSnackbar(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                
            <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                Settings saved successfully!
            </Alert>
            </Snackbar>

            <PasswordModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={handleConfirm}
            />

        </>
    );
}

export default SettingPage;
