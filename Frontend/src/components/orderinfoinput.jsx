import {Stack, Grid, Typography, TextField, InputAdornment, Divider, Paper} from "@mui/material"
import { useState, useEffect } from "react";
import api from "../services/axios";
import { useTranslation } from "react-i18next";

function OrderInfoInput({data, setdata, city}) {
    const { t } = useTranslation();
    
    var default_settings ={
        juice_quantity : "",
        no_pouches: "",
        price:"",
        shipping_fee:""
    }
    
    const [settings, setSettings] = useState(default_settings)    
    
    useEffect(() => {
        api.get('/default-setting')
            .then((res) => {
            // res.data is already an object
            const parsed = Object.fromEntries(
                Object.entries(res.data).map(([key, value]) => [
                key,
                isNaN(value) ? value : parseFloat(value)
                ])
            );

            setSettings(parsed);
            })
            .catch((err) => {
            console.error("Failed to load settings:", err);
            });
        }, []);


    const handleCustomerInfoUpdate = (e)=>{
        setdata({... data, [e.target.name]:e.target.value})
    }

    const handleCrateCountUpdate = (e) => {
        const value = e.target.value;
        // Allow empty string for editing, or only positive integers
        if (value === '' || (Number(value) > 0 && Number.isInteger(Number(value)))) {
            setdata({...data, No_of_Crates: value});
        }
    }

    const handleWeightInfoInput = (e)=>{
        console.log(settings);
        setdata({... data, 
            total_apple_weight:e.target.value, 
            Juice_quantity: Math.floor(settings.juice_quantity * e.target.value),
            No_of_Pouches:Math.ceil(settings.juice_quantity*e.target.value/3),
            price: Number(
            (
                Math.ceil(settings.juice_quantity * e.target.value / 3) *
                (8 + (city === "Kuopio" ? 0 : 1.9))
            ).toFixed(2)
            )
        }
    )
    }



    return ( 
        <Stack direction = "column" sx={
                {
                    backgroundColor: "#transparent",
                    width: "100%",
                    height: "auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }
            }>
                <Paper elevation={1}>
                    <Grid container sx={
                        {
                            height: "auto",
                            rowGap: "5px",
                            borderRadius: "10px",
                            paddingTop: "15px",
                            paddingBottom: "15px"
                        }
                    }>

                        <Grid item size={4} display="flex" alignItems="center"  sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.total_apple_weight')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField required name={"total_apple_weight"} type="number" variant='filled' label={t('customer_info_entry.total_apple_weight_placeholder')} 
                            onChange={handleWeightInfoInput} value={data.total_apple_weight}
                            sx={
                                {
                                    width: "min(600px, 90%)"
                                }
                            }
                            slotProps={
                                {
                                    input: {
                                        endAdornment: <InputAdornment>kg</InputAdornment>
                                    }
                                }
                            }
                            >
                            </TextField>
                        </Grid>

                        <Grid item size={4} display="flex" alignItems="center"  sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.number_of_crates')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField name="No_of_Crates" type="number" variant='filled' label={t('customer_info_entry.number_of_crates_placeholder')} required
                            onChange={handleCrateCountUpdate} value={data.No_of_Crates}
                            sx={
                                {
                                    width: "min(600px, 90%)"
                                }
                            }
                            inputProps={{
                                min: 1
                            }}
                            slotProps={
                                {
                                    input: {
                                        endAdornment: <InputAdornment>piece(s)</InputAdornment>
                                    }
                                }
                            }
                            >
                            </TextField>
                        </Grid>

                        <Grid item size={4} display="flex" alignItems="center" sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.juice_quantity')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField type="number" variant='filled' label={t('customer_info_entry.juice_quantity_placeholder')} name="Juice_quantity"
                            onChange={handleCustomerInfoUpdate} value={data.Juice_quantity}
                            sx={
                                {
                                    width: "min(600px, 90%)"
                                }
                            }
                            slotProps={
                                {
                                    input: {
                                        endAdornment: <InputAdornment>L</InputAdornment>
                                    }
                                }
                            }
                            >
                            </TextField>
                        </Grid>
                        
                        <Grid item size={4} display="flex" alignItems="center" sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.number_of_pouches')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField type="number" variant='filled' label={t('customer_info_entry.number_of_pouches_placeholder')} name="No_of_Pouches"
                            onChange={handleCustomerInfoUpdate} value={data.No_of_Pouches}
                            sx={
                                {
                                    width: "min(600px, 90%)"
                                }
                            }
                            slotProps={
                                {
                                    input: {
                                        endAdornment: <InputAdornment>piece(s)</InputAdornment>
                                    }
                                }
                            }
                            >
                            </TextField>
                        </Grid>
                        <Grid item size={4} display="flex" alignItems="center" sx={{
                            display: "flex",
                            paddingLeft: "min(45px, 10%)",
                            paddingRight: "min(45px, 10%)"
                        }}>
                            <Typography variant='body1'>
                                {t('customer_info_entry.price')}
                            </Typography>
                        </Grid>

                        <Grid item size={8} display="flex" alignItems="center" >
                            <TextField type="number" variant='filled' name="price"
                            onChange={handleCustomerInfoUpdate} value={data.price}
                            sx={
                                {
                                    width: "min(600px, 90%)"
                                }
                            }
                            slotProps={
                                {
                                    input: {
                                        endAdornment: <InputAdornment>€</InputAdornment>
                                    }
                                }
                            }
                            >
                            </TextField>
                        </Grid>

                        <Grid item size={12} sx={
                            {
                                marginTop: "15px"
                            }
                        }>
                            <Divider variant="middle">
                                <Typography variant="overline">{t('customer_info_entry.notes')}</Typography>   
                            </Divider>
                        </Grid>

                        <Grid item size={12} sx={
                            {
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                paddingLeft: "min(45px, 10%)",
                                paddingRight: "min(45px, 10%)"
                            }
                        }>
                            <TextField
                                label={t('customer_info_entry.notes_label')}
                                name = "Notes"
                                onChange={handleCustomerInfoUpdate}
                                placeholder={t('customer_info_entry.notes_placeholder')}
                                multiline
                                rows={4}
                                fullWidth
                                variant="outlined"
                                sx={{ mt: 2 }} // adds margin top
                                value={data.Notes}
                                />
                        </Grid>
                    </Grid>
                </Paper>

            </Stack>
    );
}

export default OrderInfoInput;