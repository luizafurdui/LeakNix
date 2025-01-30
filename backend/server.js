const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public/frontend")));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Permite toate originile sau specifică domeniul dorit
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');  // Permite anumite header-e
    next();
});

// Stripe Payment Plans
const plans = new Map([
    ["in_depth", { priceId: "price_1QmEXpPkpSyeTn4escHtLFf4", name: "In-Depth One-Time Report" }],
    ["continuous", { priceId: "price_1QmEetPkpSyeTn4exCwlZ0SA", name: "Continuous Protection (12 Months)" }],
]);
app.get("/api/check", async (req, res) => {
    const email = req.query.input; // Get email from query parameters

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required." });
    }

    try {
        // Call the existing email check API
        const response = await axios.post(`http://localhost:${PORT}/api/check-email`, { email });

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching email check results:", error);
        res.status(500).json({ success: false, error: "Error fetching data." });
    }
});

// Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { planId } = req.body;
        if (!plans.has(planId)) {
            return res.status(400).json({ error: "Invalid plan selected" });
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plans.get(planId).priceId,
                    quantity: 1,
                },
            ],
            mode: planId === "continuous" ? "subscription" : "payment",
            success_url: `${process.env.CLIENT_URL}/verify.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pentru verificarea email-ului folosind LeakCheck API
app.post("/api/check-email", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required." });
    }

    try {
        const response = await axios.get(`https://leakcheck.io/api/v2/query/${email}`, {
            headers: {
                'Accept': 'application/json',
                'X-API-Key': process.env.LEAKCHECK_API_KEY
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("LeakCheck API error:", error);
        res.status(500).json({ success: false, error: "Error fetching data from LeakCheck API." });
    }
});

// Endpoint pentru analiza în profunzime
app.post("/api/in-depth-analysis", async (req, res) => {
    const { sessionId, input } = req.body;

    if (!sessionId || !input) {
        return res.status(400).json({ success: false, error: "Missing session ID or user input." });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
            return res.status(403).json({ success: false, error: "Payment not completed." });
        }

        // Apelează endpoint-ul pentru verificarea email-ului
        const emailCheckResponse = await axios.post(`http://localhost:${PORT}/api/check-email`, { email: input });
        res.json(emailCheckResponse.data);
    } catch (error) {
        console.error("Error during in-depth analysis:", error);
        res.status(500).json({ success: false, error: "Error during in-depth analysis." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});