import { useEffect, useState } from 'react';
import backgroundomena from "../assets/backgroundomena.jpg"
import { Paper, Box, Stack, Typography, Button, Container } from '@mui/material';
import QRScanner from '../components/qrcamscanner';
import CustomerInfoCard from '../components/customerinfoshowcard';
import CrateInfoCard from '../components/CrateInfoCard';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';

function CrateHandling() {

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
        })
        .then(()=>{
            api.put('/crates', {
                crate_id : scannedCratesID,
                status: "Processing"
            })
        })
        .finally(
            Delete_all_data()
        )
    }

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
                        Crate Management System
                    </Typography>

                    <Stack spacing={3} alignItems="center">
                        <QRScanner onResult={setScanResult} />

                        {Boolean(customerInfo.order_id) && (
                      <Typography variant="body2" color="text.secondary">
                        Scanned <strong>{scannedCratesID.length}</strong> of{" "}
                                <strong>{parseInt(customerInfo.crate_count || 0, 10)}</strong> crates
                     </Typography>
                        )}
                        <CustomerInfoCard customerInfo={customerInfo} />

                        <Stack spacing={2} alignItems="center" width="100%">
                            {scannedCratesID.map((id, idx) => (
                                <CrateInfoCard key={id} index={idx + 1} crateID={id} />
                            ))}
                        </Stack>

                        <Stack spacing={2} direction="row">
                            {scannedCratesID.length > 0 && (
                                <Button color="error" variant="contained" onClick={Delete_all_data}>
                                    Cancel
                                </Button>
                            )}
                            {!disabledSubmitButton && (
                                <Button color="success" variant="contained" onClick={handleSubmitButton} sx={{ backgroundColor: '#d6d0b1', color: 'black', '&:hover': { backgroundColor: '#c5bfa3' } }}>
                                    Submit
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
