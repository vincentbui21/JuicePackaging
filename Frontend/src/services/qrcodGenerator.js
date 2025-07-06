import QRCode from 'qrcode';

async function generateSmallPngQRCode(text) {
    try {
        const options = {
        type: 'image/png',  // output as PNG
        width: 200           // 30 pixels width
        };
        const dataUrl = await QRCode.toDataURL(text, options);
        return dataUrl;
    } catch (err) {
        console.error('Failed to generate QR code:', err);
        return null;
    }
}

export default generateSmallPngQRCode