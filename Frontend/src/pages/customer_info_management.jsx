import { useEffect, useState } from "react";
import backgroundomena from "../assets/backgroundomena.jpg"
import {Box, Typography, TextField, Button, Stack, Grid} from '@mui/material'
import CustomerInfoManagementCard from "../components/customerInfoManagementCard";

function CustomerInfoManagement() {
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
                    }>Customer Info Management
                </Typography>
            </Box>


            <CustomerInfoManagementCard></CustomerInfoManagementCard>

        </>
    );
}

export default CustomerInfoManagement;