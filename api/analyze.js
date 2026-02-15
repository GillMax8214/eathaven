module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body;
  const image = body.image;
  const budget = body.budget;
  const people = body.people;
  const diet = body.diet;

  if (!image) {
    res.status(400).json({ error: 'No image' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    res.status(500).json({ error: 'No API key' });
    return;
  }

  let imageType = 'image/jpeg';
  if (image.indexOf('data:image/png') === 0) {
    imageType = 'image/png';
  } else if (image.indexOf('data:image/webp') === 0) {
    imageType = 'image/webp';
  }
  
  const parts = image.split(',');
  const base64Data = parts[1];

  const promptText = 'Analysiere dieses Kühlschrank-Foto. Budget: ' + budget + ' Euro, Personen: ' + people + ', Ernährung: ' + diet + '. Antworte mit JSON: {"ingredients":["Zutat1"],"ingredientCount":5,"daysEstimate":2,"recipes":[{"type":"free","title":"Rezept1","description":"Text","ingredients":["Z1"],"price":0},{"type":"budget","title":"Rezept2","description":"Text","missing":[{"item":"Z2","price":3}],"price":8},{"type":"premium","title":"Rezept3","description":"Text","missing":[{"item":"Z3","price":6}],"price":18}]}';

  try {
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
            text: promptText
          }]
        }]
      })
    });

    if (!response.ok) {
      res.status(500).json({ error: 'API error' });
      return;
    }

    const data = await response.json();
    const text = data.content[0].text;
    const result = JSON.parse(text);
    
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

**COMMIT:**
```
Simplify API function
