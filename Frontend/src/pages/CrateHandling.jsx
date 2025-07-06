import { useEffect, useState } from 'react';
import backgroundomena from "../assets/backgroundomena.jpg"
import { Paper, Box, Stack, Typography, Button } from '@mui/material';
import QRScanner from '../components/qrscanner';
import CustomerInfoCard from '../components/customerinfoshowcard';
import CrateInfoCard from '../components/CrateInfoCard';
import api from '../services/axios';


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
                const fetch_data = await api.get(`http://localhost:5000/crates/${scanResult}`)
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


    useEffect(() => {
        document.body.style.backgroundImage = `url(${backgroundomena})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed"; // Optional: for parallax effect

    
        return () => {
            // Clean up background when component unmounts
            document.body.style.backgroundImage = "";
            document.body.style.backgroundSize = "";
            document.body.style.backgroundRepeat = "";
            document.body.style.backgroundAttachment ="";
        };
    }, []);

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
            <Box display={"flex"} justifyContent={"center"} >
                <Typography variant='h6'
                    sx={
                        {
                            fontSize: "clamp(20px, 5vw, 40px);",
                            textAlign: "center",
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            marginBottom: "10px",
                            color: "black",
                            background: "#a9987d",
                            width: "min(1200px, 60%)",
                            borderRadius: "10px"
                        }
                    }>Crate Management System
                </Typography>
            </Box>

            <Stack direction = "column" spacing={2}
            sx={{
                display: "flex",
                height: "auto",
                alignItems: "center",
                paddingTop: "10px"
            }}>
                <QRScanner onResult={setScanResult}/>

                <CustomerInfoCard customerInfo={customerInfo}/>

                <Stack spacing={2} sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: 'center'
                }}>
                    {
                        scannedCratesID.map((value, index) =>{
                            return <CrateInfoCard index={index+1} crateID={value}/>
                        })
                    }
                </Stack>

                <Stack spacing= {5}direction={"row"}>

                    {
                        scannedCratesID.length != 0 &&
                        <Button color='error' variant='contained' onClick={Delete_all_data}>Cancle</Button>
                    }

                    {
                        !disabledSubmitButton && 
                        <Button color='success' variant='contained' onClick={handleSubmitButton}>Submit</Button>
                    }
                </Stack>

            </Stack>
        </>
    );
}

export default CrateHandling;
