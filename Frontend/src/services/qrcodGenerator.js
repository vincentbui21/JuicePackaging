import QRCode from 'qrcode';

export async function generateSmallPngQRCode(text) {
  try {
    const options = {
      type: 'image/png',
      width: 200,
      margin: 1
    };
    const dataUrl = await QRCode.toDataURL(text, options);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return null;
  }
}
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
