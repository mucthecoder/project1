export async function handler(event) {
  try {
    const { token } = JSON.parse(event.body);

    const res = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY,
      },
      body: JSON.stringify({
        token,
        amountInCents: 5000,
        currency: "ZAR",
      }),
    });

    const data = await res.json();
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
