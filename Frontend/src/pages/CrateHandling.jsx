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
        order_id: ""
    }

    const [scanResult, setScanResult] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(InitialCustomerInfo)
    const [FetchedcrateInfo, setFetchedCrateInfo] = useState([])
    const [scannedCratesID, setScannedCratesID] = useState([])
    const [disabledSubmitButton, setDisableSubmitButton] = useState(true)
    
    useEffect(()=>{

        const fetchDatFunction = async () => {
            console.log(scanResult);
            try{
                const fetch_data = await api.get(`http://localhost:5001/crates/${scanResult}`)
                return fetch_data.data;
            }
            catch(error){
                console.log(error);
            }
        }

        if((customerInfo.name == "" || customerInfo.crate_count=="") && scanResult !=null){
            fetchDatFunction()
            .then((data) => {
                setCustomerInfo(data[0][0])
                setFetchedCrateInfo(data[1])

                setScannedCratesID(scannedCratesID => [...scannedCratesID, scanResult])
            });
        }

        else{
            const exist = FetchedcrateInfo.some(crate => crate.crate_id === scanResult)
            const duplicate = scannedCratesID.some(crate => crate === scanResult)

            if (exist && !duplicate){
                setScannedCratesID(scannedCratesID => [...scannedCratesID, scanResult])

            }
            else{
                console.log("no, not same group or duplicated");
            }
        }

        

    }, [scanResult])

    useEffect(()=>{
        if(scannedCratesID.length == parseInt(customerInfo.crate_count)){
            setDisableSubmitButton(false)
        }
    }, [scannedCratesID])

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
                        height: "100%",
                        flexDirection: "column"
                        }}>
                    <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>
                        Crate Management System
                    </Typography>

                    <Stack spacing={3} alignItems="center">
                        <QRScanner onResult={setScanResult} />

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
