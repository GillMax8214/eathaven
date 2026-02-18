import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { image, diet, budget, people } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: image },
          },
          {
            type: "text",
            text: `Analysiere das Bild für ${people} Personen (${diet}). Gib NUR JSON zurück: {"items": [{"name": "Milch", "urgency": 5}], "daysEstimate": 3, "recipes": [{"title": "Name", "type": "free", "description": "...", "price": 0.0, "ingredients": [], "missing": []}]}`
          }
        ],
      }],
    });

    res.status(200).json(JSON.parse(response.content[0].text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
