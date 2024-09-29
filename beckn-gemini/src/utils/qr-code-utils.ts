import qrcode from "qrcode";
export const generateQRCode = () => {
  const dummyData = "Some Payment related Data";
  qrcode.toFile("public/qrcode.png", dummyData, function (err) {
    if (err) {
      console.error("Error generating QR code:", err);
      return;
    }
    console.log("Dummy QR code generated and saved as dummy_qrcode.png");
  });
};
