export default async function handler(req, res) {
  // CORS Header für die mobile App
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
      return res.status(400).json({ error: 'Kein Bild empfangen' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key fehlt in Vercel' });
    }

    // SICHERE BILD-VERARBEITUNG
    let imageType = 'image/jpeg'; // Standard
    let base64Data = image;

    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      // Extrahiert den exakten Typ (z.B. image/png oder image/webp)
      imageType = parts[0].split(':')[1]; 
      base64Data = parts[1];
    } else if (image.startsWith('/9j/')) {
      imageType = 'image/jpeg';
    } else if (image.startsWith('iVBORw')) {
      imageType = 'image/png';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229', // Korrigierter Modell-Name
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
            text: `Analysiere dieses Kühlschrank-Foto und erstelle 3 Rezepte. Budget: ${budget}€, Personen: ${people}, Ernährung: ${diet}. Antworte NUR im JSON-Format: {"ingredients":["Zutat1"],"ingredientCount":5,"daysEstimate":2,"recipes":[{"type":"free","title":"Rezept1","description":"Beschreibung","ingredients":["Zutat1"],"price":0},{"type":"budget","title":"Rezept2","description":"Beschreibung","missing":[{"item":"Zutat2","price":3}],"price":8},{"type":"premium","title":"Rezept3","description":"Beschreibung","missing":[{"item":"Zutat3","price":6}],"price":18}]}`
          }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API Error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Claude API Fehler' });
    }

    // Claude gibt manchmal Text vor/nach dem JSON aus, das würde JSON.parse crashen lassen
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/); // Sucht das erste JSON-Objekt im Text
    
    if (!jsonMatch) {
      return res.status(500).json({ error: 'KI hat kein gültiges Rezept-Format gesendet' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Interner Fehler: ' + error.message });
  }
}

