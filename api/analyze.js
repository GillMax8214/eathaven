export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, budget, people, diet } = req.body;
    
    // Validate image
    if (!image) {
      console.error('No image provided');
      return res.status(400).json({ error: 'Kein Bild übermittelt' });
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('No API key configured');
      return res.status(500).json({ error: 'API Key nicht konfiguriert' });
    }

    // Extract base64 data and detect type
    let base64Data;
    let mediaType = 'image/jpeg';
    
    try {
      if (image.startsWith('data:image/png')) {
        mediaType = 'image/png';
        base64Data = image.split(',')[1];
      } else if (image.startsWith('data:image/webp')) {
        mediaType = 'image/webp';
        base64Data = image.split(',')[1];
      } else if (image.startsWith('data:image/jpeg') || image.startsWith('data:image/jpg')) {
        mediaType = 'image/jpeg';
        base64Data = image.split(',')[1];
      } else {
        // Assume JPEG if no data URL prefix
        base64Data = image.includes(',') ? image.split(',')[1] : image;
        mediaType = 'image/jpeg';
      }
    } catch (e) {
      console.error('Error extracting base64:', e);
      return res.status(400).json({ error: 'Ungültiges Bildformat' });
    }

    // Log request info (without full image)
    console.log('Processing image analysis:', {
      mediaType,
      budget,
      people,
      diet,
      imageSize: base64Data.length
    });

    // Call Claude API
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
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: `Analysiere dieses Kühlschrank-Foto und erstelle 3 Rezept-Vorschläge.

WICHTIG: Antworte NUR mit gültigem JSON, OHNE Markdown-Backticks!

Kontext:
- Budget: ${budget}€
- Personen: ${people}
- Ernährung: ${diet}

Format (kopiere diese Struktur EXAKT):
{
  "ingredients": ["Zutat1", "Zutat2", "Zutat3"],
  "ingredientCount": 8,
  "daysEstimate": 3,
  "recipes": [
    {
      "type": "free",
      "title": "Rezeptname mit vorhandenen Zutaten",
      "description": "Kurze appetitliche Beschreibung",
      "ingredients": ["Zutat1", "Zutat2"],
      "price": 0
    },
    {
      "type": "budget",
      "title": "Rezeptname für Budget",
      "description": "Kurze appetitliche Beschreibung",
      "ingredients": ["Zutat1"],
      "missing": [{"item": "Fehlende Zutat", "price": 2.99}],
      "price": 8.50
    },
    {
      "type": "premium",
      "title": "Rezeptname Premium",
      "description": "Kurze appetitliche Beschreibung",
      "ingredients": ["Zutat1"],
      "missing": [{"item": "Premium Zutat", "price": 5.99}],
      "price": 18.50
    }
  ]
}`
            }
          ]
        }]
      })
    });

    // Check response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Claude API Fehler',
        details: response.status === 400 ? 'Bildformat oder Größe ungültig' : 'API Verbindungsfehler'
      });
    }

    const data = await response.json();
    
    // Extract text from response
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid API response structure:', data);
      return res.status(500).json({ error: 'Ungültige API Antwort' });
    }
    
    let text = data.content[0].text;
    console.log('Raw API response:', text.substring(0, 200));
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Failed text:', text);
      return res.status(500).json({ 
        error: 'Ungültige JSON Antwort von KI',
        details: 'Die KI hat kein gültiges Format zurückgegeben'
      });
    }
    
    // Validate result structure
    if (!result.ingredients || !result.recipes || !Array.isArray(result.recipes)) {
      console.error('Invalid result structure:', result);
      return res.status(500).json({ error: 'Ungültige Rezept-Struktur' });
    }
    
    console.log('Success! Recipes generated:', result.recipes.length);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Server Fehler',
      details: error.message 
    });
  }
}
