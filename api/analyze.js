export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, budget, people, diet } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'No API key' });
    }

    const base64Data = image.split(',')[1];
    const imageType = image.includes('png') ? 'image/png' : 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [{
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageType,
              data: base64Data
            }
          }, {
            type: 'text',
            text: `Analysiere dieses Kühlschrank-Foto und erstelle 3 Rezepte. Budget: ${budget}€, Personen: ${people}, Ernährung: ${diet}. Antworte mit JSON: {"ingredients":["Zutat1"],"ingredientCount":5,"daysEstimate":2,"recipes":[{"type":"free","title":"Rezept1","description":"Beschreibung","ingredients":["Zutat1"],"price":0},{"type":"budget","title":"Rezept2","description":"Beschreibung","missing":[{"item":"Zutat2","price":3}],"price":8},{"type":"premium","title":"Rezept3","description":"Beschreibung","missing":[{"item":"Zutat3","price":6}],"price":18}]}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API Error:', error);
      return res.status(500).json({ error: 'API error' });
    }

    const data = await response.json();
    const text = data.content[0].text;
    const result = JSON.parse(text);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
