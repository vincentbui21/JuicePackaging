import {Stack, Grid, Typography, TextField} from "@mui/material"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function CustomerInfo() {
    return (  
        <Stack direction = "column" sx={
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
                <Grid container bgcolor={"#d6d0b1"} sx={
                    {
                        width: "min(1200px, 90%)",
                        height: "auto",
                        rowGap: "5px",
                        borderRadius: "10px",
                        paddingTop: "15px",
                        paddingBottom: "15px"
                    }
                }>

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
                        <TextField required variant='filled' label="Enter full name" sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

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
                        <TextField required variant='filled' label="Enter full address" sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

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
                        <TextField required variant='filled' label="Enter contact number" sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

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
                        <TextField variant='filled' label="Enter email" sx={
                            {
                                width: "min(600px, 90%)"
                            }
                        }>
                        </TextField>
                    </Grid>

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
                                <DatePicker label="Select or enter date"/>
                        </LocalizationProvider>
                    </Grid>

                </Grid>
                
            </Stack>
    );
}

export default CustomerInfo;