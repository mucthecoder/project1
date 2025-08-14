const functions = require("firebase-functions");
const axios = require("axios");

// Limit max concurrent instances
functions.setGlobalOptions({ maxInstances: 10 });

// Get Yoco secret key safely
const getYocoSecret = () => {
  const config = functions.config();
  if (!config || !config.yoco || !config.yoco.secret) {
    throw new Error("Yoco secret key is not configured in Firebase functions config");
  }
  return config.yoco.secret;
};

// Detect if running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

exports.chargeCard = functions.https.onRequest(async (req, res) => {
  // Handle GET requests (for testing / favicon)
  if (req.method === "GET") {
    return res.status(200).send("ChargeCard function is live.");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { cardNumber, expMonth, expYear, cvv, amountInCents } = req.body;
  if (!cardNumber || !expMonth || !expYear || !cvv || !amountInCents) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let yocoSecret;
  try {
    yocoSecret = getYocoSecret();
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ success: false, message: "Payment configuration error" });
  }

  try {
    let response;

    if (isEmulator) {
      // MOCK RESPONSE in emulator
      response = {
        data: {
          id: "ch_mock123",
          status: "Success",
          amountInCents,
          currency: "ZAR"
        }
      };
      console.log("⚡ Using mock Yoco response (emulator)");
    } else {
      // REAL Yoco API call
      response = await axios.post(
        "https://online.yoco.com/v1/charges/",
        {
          amountInCents,
          currency: "ZAR",
          card: {
            number: cardNumber,
            expiryMonth: expMonth,
            expiryYear: expYear,
            cvc: cvv
          }
        },
        {
          headers: { "X-Secret-Key": yocoSecret }
        }
      );
    }

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    const errorData = err.response?.data || null;
    const errorMessage = errorData?.error || "Charge failed";

    console.error(errorData || err.message);
    return res.status(500).json({ success: false, message: errorMessage });
  }
});
