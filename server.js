require("dotenv").config(); // Cargar variables de entorno


console.log("Recibiendo solicitud de pago con datos:", req.body);


const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const WOMPI_CLIENT_ID = process.env.WOMPI_CLIENT_ID;
const WOMPI_CLIENT_SECRET = process.env.WOMPI_CLIENT_SECRET;

// Verificación de que las credenciales estén definidas
if (!WOMPI_CLIENT_ID || !WOMPI_CLIENT_SECRET) {
    console.error("¡Error! Las credenciales de Wompi no están definidas en las variables de entorno.");
    process.exit(1);
}

// 🔐 Obtener Token de Wompi
const getWompiToken = async () => {
    try {
        const response = await axios.post(
            "https://id.wompi.sv/connect/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: WOMPI_CLIENT_ID,
                client_secret: WOMPI_CLIENT_SECRET
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error obteniendo el token de Wompi:", error.response?.data || error.message);
        throw new Error("Error obteniendo el token de Wompi");
    }
};

// 💳 Procesar el pago
app.post("/process-payment", async (req, res) => {
    try {
        const token = await getWompiToken(); // Obtener token antes de procesar el pago
        const { email, cardHolder, cardNumber, expiryDate, cvc, amount } = req.body;

        if (!email || !cardHolder || !cardNumber || !expiryDate || !cvc || !amount) {
            return res.status(400).json({ success: false, message: "Faltan datos en la solicitud." });
        }

        const [expMonth, expYearShort] = expiryDate.split("/");
        const expYear = `20${expYearShort}`; // Convertir a formato YYYY

        const response = await axios.post(
            "https://api.wompi.sv/transactions", // URL corregida
            {
                amount_in_cents: amount * 100, // Wompi usa centavos
                currency: "USD",
                customer_data: {
                    email
                },
                payment_source: {
                    type: "CARD",
                    number: cardNumber,
                    cvc,
                    exp_month: expMonth,
                    exp_year: expYear,
                    card_holder: cardHolder
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data?.data?.status === "APPROVED") {
            res.status(200).json({ success: true, message: "Pago exitoso", data: response.data.data });
        } else {
            res.status(400).json({ success: false, message: "Pago fallido", error: response.data });
        }
    } catch (error) {
        console.error("Error en el pago:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Error procesando el pago",
            error: error.response?.data || error.message
        });
    }
});

// 🌐 Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
