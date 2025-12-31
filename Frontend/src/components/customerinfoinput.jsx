import {Stack, Grid, Typography, TextField, Select, MenuItem, Paper} from "@mui/material"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useState, useEffect } from 'react';
import api from '../services/axios';
import { useTranslation } from 'react-i18next';
dayjs.extend(customParseFormat);


function CustomerInfo({data, setdata}) {
    const { t } = useTranslation();
    const [cities, setCities] = useState([]);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await api.get('/cities');
                setCities(response.data);
            } catch (error) {
                console.error('Error fetching cities:', error);
            }
        };
        fetchCities();
    }, []);

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
                <Paper elevation={1}>
                    <Grid container bgcolor={"#fffff"} 
                    sx={
                        {
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
                            <Typography variant='body1'>
                                {t('customer_info_entry.full_name')}
                            </Typography>
                        </Grid>
                        
                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField name ={"full_name"} value={data.full_name} required variant='filled' label={t('customer_info_entry.full_name_placeholder')} 
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
                            <Typography variant='body1'>
                                {t('customer_info_entry.street_address')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField name = {"address"} value={data.address} variant='filled' label={t('customer_info_entry.street_address_placeholder')}
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
                            <Typography variant='body1'>
                                {t('customer_info_entry.city')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField 
                                select required label={t('customer_info_entry.city_placeholder')} value={data.city} name={"city"} onChange={handleCustomerInfoUpdate}
                            sx={
                                {
                                    width: "min(600px, 90%)",
                                }
                            }
                            >
                                {cities.map((city) => (
                                    <MenuItem key={city} value={city}>
                                        {city}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Phone number input*/}
                        <Grid item size={4} display="flex" alignItems="center" sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.phone_number')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField value={data.phone_number} required variant='filled' label={t('customer_info_entry.phone_number_placeholder')} name="phone_number"
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
                            <Typography variant='body1'>
                                {t('customer_info_entry.email')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField value={data.email} variant='filled' label={t('customer_info_entry.email_placeholder')} name="email"
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
                            <Typography variant='body1'>
                                {t('customer_info_entry.entry_date')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker name={"entryDate"} 
                                onChange={
                                    (newValue)=> {
                                        setdata({... data, entryDate:newValue.format("MM/DD/YYYY")})
                                    }} 
                                value = {data.entryDate ? dayjs(data.entryDate, "MM-DD-YYYY") : null} label={t('customer_info_entry.entry_date_placeholder')}/>
                            </LocalizationProvider>
                        </Grid>

                    </Grid>
                </Paper>
                
            </Stack>
    );
}

export default CustomerInfo;