// EatHaven - Serverless Function für Claude API
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, budget, people, diet } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Kein Bild übermittelt' });
    }

    // API Key aus Vercel Environment Variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key nicht konfiguriert' });
    }

    // Claude API aufrufen
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
                  media_type: 'image/jpeg',
                  data: image.split(',')[1] // Remove data:image/jpeg;base64, prefix
                }
              },
              {
                type: 'text',
                text: `Analysiere dieses Kühlschrank-Foto und erstelle 3 Rezept-Vorschläge:

Budget: ${budget}€
Personen: ${people}
Ernährung: ${diet}

Erstelle GENAU 3 Rezepte als JSON:
1. "FridgeMatch" - Nutzt NUR die sichtbaren Zutaten (0€)
2. "Budget Cook" - Wenige fehlende Zutaten (5-10€)
3. "Craving Time" - Premium Version (15-25€)

Antworte NUR mit diesem JSON Format (keine Markdown-Backticks):
{
  "ingredients": ["Zutat1", "Zutat2", "Zutat3"],
  "ingredientCount": 12,
  "daysEstimate": 3,
  "recipes": [
    {
      "type": "free",
      "title": "Rezeptname",
      "description": "Kurze Beschreibung",
      "ingredients": ["Zutat1", "Zutat2"],
      "price": 0
    },
    {
      "type": "budget",
      "title": "Rezeptname",
      "description": "Kurze Beschreibung",
      "missing": [
        {"item": "Zutat", "price": 2.99}
      ],
      "price": 8.50
    },
    {
      "type": "premium",
      "title": "Rezeptname",
      "description": "Kurze Beschreibung",
      "missing": [
        {"item": "Zutat", "price": 5.99}
      ],
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
    
    // Parse JSON response
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
