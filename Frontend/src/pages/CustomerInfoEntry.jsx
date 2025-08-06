import {Typography, Button, Box, Paper} from '@mui/material';
import CustomerInfo from '../components/customerinfoinput';
import OrderInfoInput from '../components/orderinfoinput';
import RequiredInputReminder from '../components/required_input_reminder';
import QRCodeDialog from '../components/qrcodeDialog';
import backgroundomena from "../assets/backgroundomena.jpg"
import { useEffect, useState } from 'react';
import api from '../services/axios'
import axios from 'axios';
import DrawerComponent from '../components/drawer';

function CustomerInfoEntry() {
    const initialCustomerData = {
        full_name: "",
        address: "",
        city:"",
        phone_number:"",
        email:"",
        entryDate:""
    }

    const initialOrderData = {
        total_apple_weight:"",
        No_of_Crates: "",
        Juice_quantity:"",
        No_of_Pouches: "",
        Notes: ""
    }


    const [customerdata, setCustomerData] = useState(initialCustomerData)
    const [orderdata, setorderdata]= useState(initialOrderData)
    const [open_reminder, set_Openreminder] = useState(false)
    const [open_QrDialog, set_OpenQrDialog] = useState(false)
    const [qrcodes, setQrcodes] = useState("")
    const [customerForwardName, setCustomerForwardName] = useState("")


    function resetData(){
        setCustomerData(initialCustomerData)
        setorderdata(initialOrderData)
    }

    const handleSubmit = async ()=> {
        // console.log("Customer Info: ", customerdata.entryDate)
        // console.log("Order Info: ", orderdata)
        if(customerdata.full_name == "" || customerdata.city == "" || customerdata.phone_number =="" ||customerdata.entryDate == ""|| orderdata.total_apple_weight ==""){
            set_Openreminder(true)
        }
        else{
            // console.log([customerdata, orderdata]);
            try{
                const response = await api.post('/new-entry', [customerdata, orderdata])
                console.log(response.data);
                setQrcodes(response.data)
                set_OpenQrDialog(true)
                setCustomerForwardName(customerdata.full_name)
            }
            catch (error){
                console.log(error);
            }
    
            resetData()
        }

    }
    
    return (
        <>  
            <DrawerComponent></DrawerComponent>

            <Box
            sx={
                {
                    backgroundColor: "#fffff",
                    minHeight: "100vh",
                    paddingTop: 4,
                    paddingBottom: 4,
                    display: "flex",
                    justifyContent: "center"
                }
            }>
                <Paper elevation={3} sx={{
                    width: "min(90%, 800px)",
                    padding: 4,
                    backgroundColor: "#ffffff",
                    borderRadius: 2
                }}>
                    <Typography variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>
                        Customer Information Entry
                    </Typography>

                    <CustomerInfo data={customerdata} setdata={setCustomerData}/>
                    
                    <OrderInfoInput data={orderdata} setdata ={setorderdata}/>

                    <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        marginTop: 4,
                        }}>
                        <Button 
                            variant="contained" 
                            size="large" 
                            onClick={handleSubmit}
                            sx={{ backgroundColor: '#d6d0b1', color: 'black', '&:hover': { backgroundColor: '#c5bfa3' } }}
                        >
                            Submit New Order
                        </Button>

                    </Box>

                </Paper>
            </Box>

            <RequiredInputReminder open={open_reminder} setOpen={set_Openreminder}></RequiredInputReminder>
            <QRCodeDialog open={open_QrDialog} onClose={()=>{set_OpenQrDialog(false)}} 
            data={qrcodes} name={customerForwardName}></QRCodeDialog>
        </>
    );
}

export default CustomerInfoEntry;
