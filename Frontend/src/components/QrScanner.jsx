import { useState } from "react";
import { QrReader } from "react-qr-reader";

function QrScanner({ onScan, onError }) {
  const [cameraEnabled, setCameraEnabled] = useState(true);

  return (
    <div style={{ width: "100%", maxWidth: "500px", margin: "auto" }}>
      {cameraEnabled && (
        <QrReader
          constraints={{ facingMode: "environment" }}
          onResult={(result, error) => {
            if (!!result) {
              const text = result?.text;
              if (text) {
                onScan(text); // Send scanned text to parent
                // Camera stays on for continuous scanning
              }
            }
            if (!!error) {
              onError?.(error); // Log any scan errors
            }
          }}
          style={{ width: "100%" }}
          videoStyle={{ width: "100%", height: "auto" }}
        />
      )}
    </div>
  );
}

export default QrScanner;
