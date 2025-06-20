import sdk from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Voice catalog — expand based on what languages you need
const voiceCatalog = {
  'en': { female: 'en-US-AshleyNeural', male: 'en-US-GuyNeural', child: 'en-US-AnaNeural' },
  'ta': { female: 'ta-IN-PallaviNeural', male: 'ta-IN-ValluvarNeural' }, // Tamil
  'hi': { female: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural' },     // Hindi
  // Add more if needed
};

const defaultVoice = 'en-US-AshleyNeural';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.SPEECH_KEY,
  process.env.SPEECH_REGION
);

export async function speakText(req, res) {
  const { text, language = 'en', voice = 'female' } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in request body" });
  }

  try {
    const lang = language.toLowerCase();
    const voiceType = voice.toLowerCase();

    const langVoices = voiceCatalog[lang];

    let selectedVoice;

    if (langVoices) {
      selectedVoice = langVoices[voiceType] || langVoices['female'] || defaultVoice;
    } else {
      selectedVoice = defaultVoice;
    }

    // Configure speech
    speechConfig.speechSynthesisVoiceName = selectedVoice;

    const audioFile = 'output.mp3';
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
      text,
      result => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          setTimeout(() => res.sendFile(audioFile, { root: '.' }), 500);
        } else {
          res.status(500).json({ error: "Text-to-speech failed", details: result });
        }
        synthesizer.close();
      },
      error => {
        console.error("Speech synthesis error:", error);
        res.status(500).json({ error: "Internal error during synthesis" });
        synthesizer.close();
      }
    );

  } catch (error) {
    console.error("SpeakText error:", error.message);
    res.status(500).json({ error: "Failed to synthesize speech" });
  }
}
