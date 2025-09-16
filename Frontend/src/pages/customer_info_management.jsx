import { useEffect, useState } from "react";
import backgroundomena from "../assets/backgroundomena.jpg"
import {Box, Typography, TextField, Button, Stack, Grid} from '@mui/material'
import CustomerInfoManagementCard from "../components/customerInfoManagementCard";
import DrawerComponent from "../components/drawer";

function CustomerInfoManagement() {

    return (

        <>
            <DrawerComponent></DrawerComponent>

            <Box display={"flex"} justifyContent={"center"} >
                <Typography variant='h4'
                    sx={
                        {
                            paddingTop: "40px",
                            // marginBottom: "10px",
                            color: "black",
                            width: "min(1200px, 90%)",
                            borderRadius: "10px",
                            textAlign: "center", 
                            marginBottom: 3, fontWeight: 'bold' 
                        }
                    }>Customer Info Management
                </Typography>
            </Box>

    
            <CustomerInfoManagementCard></CustomerInfoManagementCard>
            

        </>
    );
}

export default CustomerInfoManagement;