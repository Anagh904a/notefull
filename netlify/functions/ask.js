exports.handler = async (event, context) => {
  const { prompt } = JSON.parse(event.body);

  const r = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + process.env.GEMINI_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await r.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
