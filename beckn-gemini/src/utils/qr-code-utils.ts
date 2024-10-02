import qrcode from "qrcode";
export const generateQRCode = () => {
  const dummyData = "upi://pay?pa=ravimaiden-2@okaxis&pn=Leela&cu=INR";
  qrcode.toFile("public/qrcode.png", dummyData, function (err) {
    if (err) {
      console.error("Error generating QR code:", err);
      return;
    }
    console.log("Dummy QR code generated and saved as dummy_qrcode.png");
  });
};
