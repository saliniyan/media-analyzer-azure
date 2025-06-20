import fs from 'fs';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv';
dotenv.config();

export async function transcribeAudio(req, res) {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'Audio file not provided' });
    }

    const filePath = req.file.path;
    const lang = req.query.lang || 'en-US'; // language param

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.SPEECH_KEY,
      process.env.SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = lang;

    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const transcripts = [];
    let responseSent = false;

    const cleanupAndRespond = (statusCode, payload) => {
      if (responseSent) return;
      responseSent = true;
      clearTimeout(timeout);
      recognizer.stopContinuousRecognitionAsync();
      pushStream.close();
      fs.unlinkSync(filePath);
      res.status(statusCode).json(payload);
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        transcripts.push(e.result.text);
        console.log('Recognized:', e.result.text);
      }
    };

    recognizer.recognizing = (s, e) => {
      console.log('Recognizing (partial):', e.result.text);
    };

recognizer.canceled = (s, e) => {
  console.error('Canceled:', e.reason);
  if (e.reason === sdk.CancellationReason.Error) {
    console.error('Error details:', e.errorDetails);
  }

  const joinedTranscript = transcripts.join(' ');

  // Still respond with whatever was recognized so far
  cleanupAndRespond(200, {
    transcript: joinedTranscript || 'No speech recognized (canceled).',
    canceled: true,
    reason: e.reason,
    errorCode: e.errorCode,
    errorDetails: e.errorDetails,
  });
};


    recognizer.sessionStopped = () => {
      console.log('Session stopped.');
      cleanupAndRespond(200, {
        transcript: transcripts.join(' ') || 'No speech recognized.',
      });
    };

    // Fallback timeout (only if sessionStopped never fires)
    const timeout = setTimeout(() => {
      console.warn('Timeout reached. Forcing stop...');
      cleanupAndRespond(200, {
        transcript: transcripts.join(' ') || 'No speech recognized (timeout).',
      });
    }, 120000); // 2 minutes

    // Start recognition BEFORE pushing audio
    recognizer.startContinuousRecognitionAsync(() => {
      console.log('Recognition started. Streaming audio...');

      // Stream the audio file to Azure
      fs.createReadStream(filePath)
        .on('data', (chunk) => pushStream.write(chunk))
        .on('end', () => {
          console.log('Audio stream ended. Closing pushStream...');
          pushStream.close(); // 🔥 Important: tells recognizer input has ended
        });
    }, (err) => {
      console.error('Failed to start recognizer:', err);
      cleanupAndRespond(500, { error: 'Failed to start recognition', details: err });
    });

  } catch (err) {
    console.error('Exception during transcription:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}
