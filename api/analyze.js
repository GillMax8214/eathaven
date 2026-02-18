const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { image } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: image,
            },
          },
          {
            type: "text",
            text: "Analysiere das Bild. Liste alle Lebensmittel auf. Weise jedem Element eine Dringlichkeit von 1-5 zu (5 = sofort verbrauchen). Antworte NUR mit einem JSON-Array im Format: {\"items\": [{\"name\": \"Produkt\", \"urgency\": 5}]}"
          }
        ],
      }],
    });

    // Claude liefert das Ergebnis in response.content[0].text
    const aiResponse = response.content[0].text;
    res.status(200).json(JSON.parse(aiResponse));
  } catch (error) {
    console.error("Fehler bei Claude:", error);
    res.status(500).json({ error: error.message });
  }
}
