const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;

app.post("/process-payment", async (req, res) => {
    try {
        const { email, cardHolder, cardNumber, expiryDate, cvc, amount } = req.body;

        // Enviar los datos a la API de Wompi
        const response = await axios.post(
            "https://sandbox.wompi.sv/api/v1/transactions",
            {
                amount: amount * 500, // Wompi usa centavos
                currency: "USD",
                email,
                payment_source: {
                    type: "CARD",
                    number: cardNumber,
                    cvc,
                    exp_month: expiryDate.split("/")[0],
                    exp_year: "20" + expiryDate.split("/")[1], // Convertir a formato YYYY
                    card_holder: cardHolder
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Revisar la respuesta de Wompi
        if (response.data.success) {
            res.status(200).json({ success: true, message: "Pago exitoso" });
        } else {
            res.status(400).json({ success: false, message: "Pago fallido" });
        }
    } catch (error) {
        console.error("Error en el pago:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: "Error procesando el pago" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
