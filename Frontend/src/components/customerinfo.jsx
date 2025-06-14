import {Stack, Grid, Typography, TextField, Select, MenuItem} from "@mui/material"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);


function CustomerInfo({data, setdata}) {

    const handleCustomerInfoUpdate = (e)=>{
        setdata({... data, [e.target.name]:e.target.value})
    }

    return (  
        <Stack direction = "column" 
                sx={
                    {
                        backgroundColor: "#transparent",
                        width: "100%",
                        height: "auto",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: "20px"
                    }
            }>
                <Grid container bgcolor={"#d6d0b1"} 
                sx={
                    {
                        width: "min(1200px, 90%)",
                        height: "auto",
                        rowGap: "5px",
                        borderRadius: "10px",
                        paddingTop: "15px",
                        paddingBottom: "15px"
                    }
                }>
                    {/* Full name input */}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Full Name
                        </Typography>
                    </Grid>
                    
                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField name ={"full_name"} value={data.full_name} required variant='filled' label="Enter full name" 
                        onChange={handleCustomerInfoUpdate} 
                        sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

                    {/* Street address input*/}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Street Address
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField name = {"address"} value={data.address} required variant='filled' label="Enter full address"
                        onChange={handleCustomerInfoUpdate}
                        sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

                    {/* City input*/}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            City
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField 
                            select label="City" value={data.city} name={"city"} onChange={handleCustomerInfoUpdate}
                        sx={
                            {
                                width: "min(600px, 90%)",
                            }
                        }
                        >
                            <MenuItem value={"Kupio"}>Kupio</MenuItem>
                            <MenuItem value={"Mikkeli"}>Mikkeli</MenuItem>
                            <MenuItem value={"Varkaus"}>Varkaus</MenuItem>
                            <MenuItem value={"Lapinlahti"}>Lapinlahti</MenuItem>
                            <MenuItem value={"Joensuu"}>Joensuu</MenuItem>
                            <MenuItem value={"Lahti"}>Lahti</MenuItem>
                        </TextField>
                    </Grid>

                    {/* Phone number input*/}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Phone Number
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField value={data.phone_number} required variant='filled' label="Enter contact number" name="phone_number"
                        onChange={handleCustomerInfoUpdate}
                        sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

                    {/* Email input*/}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Email Address
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField value={data.email} variant='filled' label="Enter email" name="email"
                        onChange={handleCustomerInfoUpdate}
                        sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>
                    {/* Entry date input value={data.entryDate} */}
                    <Grid item size={4} display="flex" alignItems="center" sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Entry Date
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker name={"entryDate"} 
                            onChange={
                                (newValue)=> {
                                    setdata({... data, entryDate:newValue.format("DD-MM-YYYY")})
                                }} 
                            value = {data.entryDate ? dayjs(data.entryDate, "DD-MM-YYYY") : null} label="Select or enter date"/>
                        </LocalizationProvider>
                    </Grid>

                </Grid>
                
            </Stack>
    );
}

export default CustomerInfo;