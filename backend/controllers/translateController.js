import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
export const translateText = async (req, res) => {
  const { text, to, from } = req.body;

  try {
    const response = await axios({
      baseURL: "https://api.cognitive.microsofttranslator.com",
      url: "/translate",
      method: "post",
      params: {
        'api-version': '3.0',
        to: to || 'ta', // default to Tamil if not specified
        from: from || undefined, // auto-detect if not provided
      },
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION,
        'Content-Type': 'application/json',
      },
      data: [{
        Text: text,
      }],
    });

    const translatedText = response.data[0]?.translations[0]?.text;

    res.json({ translatedText });
  } catch (error) {
    console.error("Translation error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to translate text" });
  }
};
