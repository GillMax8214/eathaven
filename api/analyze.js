export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, budget, people, diet } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Kein Bild übermittelt' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key nicht konfiguriert' });
    }

    // Detect image type from base64 string
    const imageType = image.startsWith('data:image/png') ? 'image/png' : 
                      image.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    
    const base64Data = image.split(',')[1];

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
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageType,
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: `Analysiere dieses Kühlschrank-Foto und erstelle 3 Rezept-Vorschläge:

Budget: ${budget}€
Personen: ${people}
Ernährung: ${diet}

Antworte NUR mit diesem JSON Format (keine Markdown-Backticks):
{
  "ingredients": ["Zutat1", "Zutat2"],
  "ingredientCount": 8,
  "daysEstimate": 2,
  "recipes": [
    {
      "type": "free",
      "title": "Rezeptname FridgeMatch",
      "description": "Beschreibung",
      "ingredients": ["Zutat1", "Zutat2"],
      "price": 0
    },
    {
      "type": "budget",
      "title": "Budget Cook Rezeptname",
      "description": "Beschreibung",
      "missing": [{"item": "Zutat", "price": 2.99}],
      "price": 8.50
    },
    {
      "type": "premium",
      "title": "Craving Time: Rezeptname",
      "description": "Beschreibung",
      "missing": [{"item": "Zutat", "price": 5.99}],
      "price": 18.50
    }
  ]
}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API Error:', error);
      return res.status(response.status).json({ error: 'Claude API Fehler' });
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    const result = JSON.parse(content);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Server Fehler',
      details: error.message 
    });
  }
}
```

---

**COMMIT MIT MESSAGE:**
```
Fix image media type detection
