import { Box, Paper, Typography, TextField, MenuItem, Button } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import company_logo from "../assets/company_logo.png";

function LoginPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [roleError, setRoleError] = useState(false);

  const routes = {
    1: "/customer-info-entry",
    2: "/crate-handling",
    3: "/juice-handle",
    4: "/load-boxes-to-pallet",
    5: "/load-pallet-to-shelf",
    6: "/pickup",
  };

  const handleChangeRole = (e) => {
    setRole(e.target.value);
    setRoleError(false);
  };

  const handleConfirm = () => {
    const value = parseInt(role, 10);
    if (routes[value]) {
      setRole("");
      navigate(routes[value]);
    } else {
      setRoleError(true);
    }
  };

  return (
    <Box
      sx={{
        height: "98vh",
        backgroundColor: "transparent",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "min(500px, 90%)",
          minHeight: 420,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 3,
          borderRadius: 3,
          border: 2,
          borderColor: "#c2c2c2",
          p: 4,
        }}
      >
        <img src={company_logo} alt="company logo" width={150} />

        <Typography variant="h5" sx={{ fontWeight: "bold", mt: 1 }}>
          Select a Role
        </Typography>

        <TextField
          label="Choose a role"
          select
          value={role}
          onChange={handleChangeRole}
          error={roleError}
          helperText={roleError ? "Please choose a role" : ""}
          sx={{ width: "60%" }}
        >
          <MenuItem value="1">Customer Info Entry</MenuItem>
          <MenuItem value="2">Crate Management</MenuItem>
          <MenuItem value="3">Juice Processing</MenuItem>
          <MenuItem value="4">Load Boxes to Pallet</MenuItem>
          <MenuItem value="5">Load Pallet to Shelf</MenuItem>
          <MenuItem value="6">Pickup Coordination</MenuItem>
        </TextField>

        <Button variant="contained" onClick={handleConfirm}>
          Confirm
        </Button>
      </Paper>
    </Box>
  );
}

export default LoginPage;
