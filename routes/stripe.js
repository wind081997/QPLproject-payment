const express = require("express");
const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_SECRET);

const router = express.Router();

const checkoutSuccessPage = fs.readFileSync(
    path.join(__dirname, 'checkout-success.html')
  );
  
  router.get("/checkout-success", (req, res) => {
    res.set("Content-Type", "text/html");
    res.send(checkoutSuccessPage);
  });

  const checkoutCancel = fs.readFileSync(
    path.join(__dirname, 'cancel.html')
  );
  
  router.get("/cancel", (req, res) => {
    res.set("Content-Type", "text/html");
    res.send(checkoutCancel);
  });


router.post("/create-checkout-session", async (req, res) => {
  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId,
      cart: JSON.stringify(req.body.cartItems),
    },
  });

 
  const line_items = req.body.cartItems.map((item) => {
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: `Payment for ${item.quantity} * ${item.name} from ${item.restaurantId}`,
          metadata: {
            id: item.id,
            restaurantId: item.restaurantId,
          },
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    };
  });
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
   
    
    phone_number_collection: {
      enabled: false,
    },
    line_items,
    mode: "payment",
    customer: customer.id,
    success_url: "https://0402-128-14-21-14.ngrok-free.app/stripe/checkout-success",
    cancel_url:  "https://0402-128-14-21-14.ngrok-free.app/stripe/cancel",
  });

  console.log(session.url);

  // res.redirect(303, session.url);
  res.send({ url: session.url });
});





module.exports = router;