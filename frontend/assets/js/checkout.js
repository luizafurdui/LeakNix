const stripe = Stripe("pk_test_51QmAvcPkpSyeTn4eO2Ckv1gUbonkf4riOrDWqllTbMvHgzuZZ2NeJ7Xjy21AIK2mTCS8tOz4AAOAeuHKqsJ2PFhh00X8CGpij4"); // Replace with your actual Stripe publishable key

async function checkout(planId) {
    try {
        
        const response = await fetch("http://localhost:5000/create-checkout-session", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId })
        });

        const session = await response.json();
        if (session.url) {
            window.location.href = session.url; // Redirect to Stripe Checkout
        } else {
            alert("Error processing payment.");
        }
    } catch (error) {
        console.error("Payment error:", error);
        alert("Something went wrong. Please try again.");
    }
}

// Attach event listeners for both plans
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".buy-in-depth")?.addEventListener("click", (event) => {
        event.preventDefault();
        checkout("in_depth"); // One-time purchase
    });

    document.querySelector(".buy-continuous")?.addEventListener("click", (event) => {
        event.preventDefault();
        checkout("continuous"); // Subscription
    });
});
