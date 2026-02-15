export default async function handler(req, res) {
  // Erlaubt deinem Handy den Zugriff (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image, budget, people, diet } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Bild-Vorverarbeitung für Claude
    let mediaType = 'image/jpeg';
    let base64Data = image;
    if (image.includes('base64,')) {
      const parts = image.split(';base64,');
      mediaType = parts[0].split(':')[1];
      base64Data = parts[1];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: `Analysiere den Kühlschrank und gib 3 Rezepte als JSON zurück: {"ingredients":[],"ingredientCount":0,"daysEstimate":0,"recipes":[{"type":"free","title":"","description":"","ingredients":[],"price":0}]}` }
          ]
        }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
