export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { token } = JSON.parse(event.body);

    const res = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY, // Must be defined in Netlify env vars
      },
      body: JSON.stringify({
        token,
        amountInCents: 5000,
        currency: "ZAR",
      }),
    });

    const text = await res.text(); // to handle potential empty body
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Invalid JSON from Yoco" };
    }

    return {
      statusCode: res.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
