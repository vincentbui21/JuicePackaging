import {Typography, Button, Box} from '@mui/material';
import CustomerInfo from '../components/customerinfo';
import OrderInfoInput from '../components/orderinfoinput';
import backgroundomena from "../assets/backgroundomena.jpg"
import { useEffect, useState } from 'react';


function CustomerInfoEntry() {
    useEffect(() => {
        document.body.style.backgroundImage = `url(${backgroundomena})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "center";
    
    
    
        return () => {
            // Clean up background when component unmounts
            document.body.style.backgroundImage = "";
            document.body.style.backgroundSize = "";
            document.body.style.backgroundRepeat = "";
            document.body.style.backgroundPosition = "";
            document.body.style.overflow = "";
        };
    }, []);

    const [customerdata, setCustomerData] = useState({
        full_name: "",
        address: "",
        city:"",
        phone_number:"",
        email:"",
        entryDate:""
    })

    const [orderdata, setorderdata]= useState({
        total_apple_weight:"",
        No_of_Crates: "",
        Juice_quantity:"",
        No_of_Pouches: "",
        Notes: ""
    })

    const handleSubmit = ()=> {
        console.log("Customer Info: ", customerdata)
        console.log("Order Info: ", orderdata)
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
                            width: "min(1200px, 90%)",
                            borderRadius: "10px"
                        }
                    }>Customer Information Entry
                </Typography>
            </Box>

            <CustomerInfo data={customerdata} setdata={setCustomerData}/>
            
            <OrderInfoInput data={orderdata} setdata ={setorderdata}/>

            <Box 
            sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: 2,
                marginBottom: 5,
                }}>
                <Button variant='contained' size='large' onClick={handleSubmit}>Submit New Order</Button>
            </Box>

        </>
    );
}

export default CustomerInfoEntry;