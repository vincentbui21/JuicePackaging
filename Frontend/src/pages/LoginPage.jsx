import { Box, Paper, Stack, Typography, TextField, MenuItem, Button} from "@mui/material";
import { useState, useEffect } from "react";
import company_logo from "../assets/company_logo.png"
import backgroundomena from "../assets/backgroundomena.jpg"
import { Navigate } from "react-router-dom";
import CrateHandling from "./CrateHandling";
import CornerMenuButton from "../components/connermenu";

function LoginPage() {
    useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.overflow = "hidden";



    return () => {
        // Clean up background when component unmounts
        document.body.style.backgroundImage = "";
        document.body.style.backgroundSize = "";
        document.body.style.backgroundRepeat = "";
        document.body.style.backgroundPosition = "";
        document.body.style.overflow = "";
    };
}, []);

    const [role, setRole] = useState("")
    const [Role_Error, SetRole_Error] = useState("")
    const [Redirect, SetRedirect] = useState("")


    switch (Redirect){
        case 1:
            return <Navigate to={"/customer-info-entry"}></Navigate>
        case 2:
            return <Navigate to={"/crate-handling"} />
        case 3:
            return <Navigate to={"/juice-handle"} />
        case 4:
            return <Navigate to={"/load-boxes-to-pallet"} />
        case 5:
            return <Navigate to="/load-pallet-to-shelf" />;
        case 6:
            return <Navigate to={"/pickup"} />
        default:
            break;
        case "":
            break
    }

    const handleChangeRole = (e) => {
        setRole(e.target.value)
        setRoleError(false)
    }

    const setRoleError = (val) => {
        SetRole_Error(val)
    }

    const handleButtonClick = (e) => {
        let newrole = parseInt(role)

        if (newrole >= 1 && newrole <=6){
            setRole("")
            SetRedirect(newrole)
        }
        else{
            setRoleError(true)
        }
    }

    return ( 
        <>
        
            <Box
                sx={{
                height: '98vh',
                backgroundColor: 'transparent',
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                }}
            >
            <Paper elevation={24} variant="elevation" sx={
                {
                    backgroundColor: "#d6d0b1",
                    width: "min(500px, 80%)",
                    height: "70%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems:"center",
                    gap: 4,
                    borderRadius: 3,
                    border:2,
                    borderColor:"#c2c2c2"
                }
            }>
                
                <img src={company_logo} alt="company logo" width={150}/>

                <TextField 
                label="Choose a role" 
                select value={role} 
                onChange={handleChangeRole} 
                error={Role_Error}
                helperText ={Role_Error ? "Please choose a role" : ""}
                sx={{
                    width: "50%"
                }}>
                    <MenuItem value= "1">Customer Info Entry</MenuItem>
                    <MenuItem value= "2">Crate Management</MenuItem>
                    <MenuItem value= "3">Juice Processing</MenuItem>
                    <MenuItem value= "4">Load Boxes to Pallet</MenuItem>
                    <MenuItem value="5">Load Pallet to Shelve</MenuItem>
                    <MenuItem value="6">Pick up Coordination</MenuItem>

                </TextField>

                <Button variant="contained" onClick={handleButtonClick}>
                    Confirm
                </Button>

            </Paper>
            </Box>
            
            <CornerMenuButton />
        </>
    );

}

export default LoginPage;