import {Stack, Grid, Typography, TextField, InputAdornment, Divider} from "@mui/material"

function OrderInfoInput({data, setdata}) {

    const handleCustomerInfoUpdate = (e)=>{
        setdata({... data, [e.target.name]:e.target.value})
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

                    <Grid item size={4} display="flex" alignItems="center"  sx={{
                        display: "flex",
                        paddingLeft: "min(45px, 10%)",
                        paddingRight: "min(45px, 10%)"
                    }}>
                        <Typography variant='h6'>
                            Total Apple Weight
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField required name={"total_apple_weight"} type="number" variant='filled' label="Enter weight in kilograms" 
                        onChange={handleCustomerInfoUpdate}
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
                        <Typography variant='h6'>
                            Number of Crates
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField name="No_of_Crates" type="number" variant='filled' label="Enter crate count" 
                        onChange={handleCustomerInfoUpdate}
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
                        <Typography variant='h6'>
                            Juice Quantity
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField type="number" variant='filled' label="Enter juice volume" name="Juice_quantity"
                        onChange={handleCustomerInfoUpdate}
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
                        <Typography variant='h6'>
                            Number of Pouches
                        </Typography>
                    </Grid>

                    <Grid item size={8} display="flex" alignItems="center" >
                        <TextField type="number" variant='filled' label="Enter pouch count" name="No_of_Pouches"
                        onChange={handleCustomerInfoUpdate}
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

                    <Grid item size={12} sx={
                        {
                            marginTop: "15px"
                        }
                    }>
                        <Divider variant="middle">
                            <Typography variant="overline">Notes</Typography>   
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
                            label="Remarks / Observations"
                            name = "Notes"
                            onChange={handleCustomerInfoUpdate}
                            placeholder="Enter any special instructions, observations, or remarks here..."
                            multiline
                            rows={4}
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 2 }} // adds margin top
                            />
                    </Grid>
                </Grid>

            </Stack>
    );
}

export default OrderInfoInput;