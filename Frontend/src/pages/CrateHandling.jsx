import { useEffect, useState } from 'react';
import backgroundomena from "../assets/backgroundomena.jpg"
import { Paper, Box, Stack, Typography, Button, Container, Snackbar, Alert } from '@mui/material';
import QRScanner from '../components/qrcamscanner';
import CustomerInfoCard from '../components/customerinfoshowcard';
import CrateInfoCard from '../components/CrateInfoCard';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import { useTranslation } from 'react-i18next';

function CrateHandling() {
    const { t } = useTranslation();

    const InitialCustomerInfo = {
        name: "",
        created_at: "",
        weight_kg: "",
        crate_count: "",
        city: "",
        order_id: "",
        customer_id: ""
      };

    const [scanResult, setScanResult] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(InitialCustomerInfo)
    const [FetchedcrateInfo, setFetchedCrateInfo] = useState([])
    const [scannedCratesID, setScannedCratesID] = useState([])
    const [disabledSubmitButton, setDisableSubmitButton] = useState(true)
    
    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    
    useEffect(() => {
        if (!scanResult) return;
      
        const fetchDatFunction = async () => {
          try {
            const res = await api.get(`https://api.mehustaja.fi/crates/${scanResult}`);
            return res.data; 
          } catch (error) {
            console.log(error);
            return null;
          }
        };
      
     
        const needCustomer = !customerInfo?.name || !customerInfo?.crate_count;
      
        if (needCustomer) {
          fetchDatFunction().then((data) => {
            if (!data) return;
      
            const info = data?.[0]?.[0] || {};
            const firstCrateRow = data?.[1]?.[0] || {};
      
           
            const mergedInfo = {
              ...info,
              customer_id: info?.customer_id || firstCrateRow?.customer_id || ""
            };
      
            setCustomerInfo(mergedInfo);
            setFetchedCrateInfo(data?.[1] || []);
            setScannedCratesID((prev) =>
              prev.includes(scanResult) ? prev : [...prev, scanResult]
            );
          });
        } else {
        
          setScannedCratesID((prev) =>
            prev.includes(scanResult) ? prev : [...prev, scanResult]
          );
        }
    }, [scanResult]);

      
    useEffect(() => {
        const can = scannedCratesID.length > 0 && Boolean(customerInfo.customer_id);
        setDisableSubmitButton(!can);
    }, [scannedCratesID.length, customerInfo.customer_id]);
        

    const Delete_all_data = () => {
        setCustomerInfo(InitialCustomerInfo)
        setFetchedCrateInfo([])
        setScannedCratesID([])
        setDisableSubmitButton(true)
    }

    const handleSubmitButton = () => {
        api.put('/orders', {
            customer_id: customerInfo.customer_id,
            status: "In Progress"
        })
        .then(response => {
            console.log(response.data);
            return api.put('/crates', {
                crate_id : scannedCratesID,
                status: "Processing"
            });
        })
        .then(() => {
            setSnackbar({
                open: true,
                message: t('crate_management.submit_success'),
                severity: 'success'
            });
            Delete_all_data();
        })
        .catch(error => {
            console.error('Submit failed:', error);
            setSnackbar({
                open: true,
                message: t('crate_management.submit_failed'),
                severity: 'error'
            });
        });
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <DrawerComponent></DrawerComponent>

            <Container maxWidth="md" sx={{ py: 4, height: "95vh" }}>
                <Paper elevation={3} 
                    sx={{ 
                        p: 4, 
                        borderRadius: 2, 
                        display: "flex", 
                        height: "auto",
                        flexDirection: "column"
                        }}>
                    <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>
                        {t('crate_management.title')}
                    </Typography>

                    <Stack spacing={3} alignItems="center">
                        <QRScanner onResult={setScanResult} />

                        {Boolean(customerInfo.order_id) && (
                      <Typography variant="body2" color="text.secondary">
                        {t('crate_management.scanned_info')} <strong>{scannedCratesID.length}</strong> {t('crate_management.of')}{" "}
                                <strong>{parseInt(customerInfo.crate_count || 0, 10)}</strong> {t('crate_management.crates')}
                     </Typography>
                        )}
                        <CustomerInfoCard customerInfo={customerInfo} />

                        <Stack spacing={2} alignItems="center" width="100%">
                            {scannedCratesID.map((id, idx) => (
                                <CrateInfoCard key={id} index={idx + 1} crateID={id} />
                            ))}
                        </Stack>

                        <Stack spacing={2} direction="row">
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={3000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity} 
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
                            {scannedCratesID.length > 0 && (
                                <Button color="error" variant="contained" onClick={Delete_all_data}>
                                    {t('crate_management.cancel_button')}
                                </Button>
                            )}
                            {!disabledSubmitButton && (
                                <Button color="primary" variant="contained" onClick={handleSubmitButton}>
                                    {t('crate_management.submit_button')}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </Container>

        </>
    );
}

export default CrateHandling;
