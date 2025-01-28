const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json()); // Enable JSON parsing

// 🔹 Check API for leaks (Existing Functionality)
app.get("/api/check", async (req, res) => {
    const userInput = req.query.input; // Get email from query params
    console.log("Request received:", req.query.input);

    if (!userInput) {
        return res.status(400).json({ error: "Email is missing!" });
    }

    try {
        const response = await axios.get(`https://leakcheck.io/api/public?check=${userInput}`);
        res.json(response.data); // Return API response to frontend
    } catch (error) {
        console.error("Error retrieving data:", error.message);
        res.status(500).json({ error: "Error retrieving data from API." });
    }
});

//  Stripe Payment Plans
const plans = new Map([
    ["in_depth", { priceId: "price_1QmEXpPkpSyeTn4escHtLFf4", name: "In-Depth One-Time Report" }],
    ["continuous", { priceId: "price_1QmEetPkpSyeTn4exCwlZ0SA", name: "Continuous Protection (12 Months)" }],
]);

//  Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { planId } = req.body;
        if (!plans.has(planId)) {
            return res.status(400).json({ error: "Invalid plan selected" });
        }

        // Modify Success URL to Redirect to Verification Page
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plans.get(planId).priceId,
                    quantity: 1,
                },
            ],
            mode: planId === "continuous" ? "subscription" : "payment",
            success_url: `${process.env.CLIENT_URL}/verify.html?session_id={CHECKOUT_SESSION_ID}`, // ✅ Redirects to verification page
            cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Stripe error:", error);
        res.status(500).json({ error: error.message });
    }
});

//  API to Verify User Input After Payment
app.post("/api/in-depth-analysis", async (req, res) => {
    const { sessionId, input } = req.body;

    if (!sessionId || !input) {
        return res.status(400).json({ success: false, error: "Missing session ID or user input." });
    }

    try {
        //  Validate Payment Session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
            return res.status(403).json({ success: false, error: "Payment not completed." });
        }
    } catch (error) {
        console.error("Session validation error:", error);
        return res.status(500).json({ success: false, error: "Invalid session ID." });
    }

    //  Perform In-Depth Analysis (Mock Response for Now)
    console.log(`Performing in-depth analysis for: ${input}`);

    res.json({ success: true, message: "In-depth analysis started!" });
});

//  Start the Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
