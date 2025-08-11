import { useEffect, useRef } from "react";
import { Paper } from "@mui/material";
import PropTypes from "prop-types";
import { BrowserQRCodeReader } from "@zxing/browser";

const QRScanner = ({ onResult }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const codeReader = new BrowserQRCodeReader();
        let streamController;

        codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (result) {
            onResult(result.getText());
        }
        }).then(controller => {
            streamController = controller;
        }).catch(err => {
            console.error("Camera error:", err);
        });

        return () => {
            streamController?.stop();
        };
    }, [onResult]);

    return (
        <Paper elevation= "24" sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "15px",
            width: "min(300px, 80%)",
            height: "auto",
            padding: "5px",
            backgroundColor: "#d6d0b1"
        }}>
            <video ref={videoRef} style={{ width: "90%", maxHeight: "90%", borderRadius: "10px"}} />
        </Paper>
    );
};

QRScanner.propTypes = {
    onResult: PropTypes.func.isRequired,
};

export default QRScanner;