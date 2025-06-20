import fs from 'fs';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv';
import { BlobServiceClient } from '@azure/storage-blob';
import ffmpeg from 'fluent-ffmpeg';
import ffprobe from 'ffprobe-static';

dotenv.config();
ffmpeg.setFfprobePath(ffprobe.path);

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_BLOB_CONNECTION_STRING
);
const containerName = 'user-audios'; // Change if needed

// 🔁 Upload audio to Blob Storage
async function uploadToBlobStorage(localFilePath, lang, ip) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `audio_${lang}_${timestamp}.wav`;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  const metadata = { lang, ip: ip || 'unknown', uploaded: timestamp };

  const uploadBlobResponse = await blockBlobClient.uploadFile(localFilePath, { metadata });
  console.log(`Audio uploaded: ${fileName}, status: ${uploadBlobResponse._response.status}`);
  return blockBlobClient.url;
}

// 🌐 Main transcription handler
export async function transcribeAudio(req, res) {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'Audio file not provided' });
    }

    const filePath = req.file.path;
    const lang = req.query.lang || 'en-US';
    const ip = req.ip;

    // 🕒 Check duration before processing
    await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('ffprobe error:', err);
          return reject(err);
        }
        const duration = metadata.format.duration;
        console.log(`Audio duration: ${duration.toFixed(2)}s`);
        if (duration > 300) {
          res.status(400).json({
            error: 'Audio duration exceeds 5 minutes',
            duration: `${Math.round(duration)} seconds`,
          });
          fs.unlinkSync(filePath); // Cleanup
          return reject(new Error('Audio too long'));
        }
        resolve();
      });
    });

    // 🧠 Azure Speech setup
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

    const timeout = setTimeout(() => {
      console.warn('Timeout reached. Forcing stop...');
      cleanupAndRespond(200, {
        transcript: transcripts.join(' ') || 'No speech recognized (timeout).',
      });
    }, 120000); // 2 minutes

    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log('Recognition started. Streaming audio...');

        // 📤 Upload audio in background
        uploadToBlobStorage(filePath, lang, ip)
          .then((url) => console.log('Blob uploaded:', url))
          .catch((err) => console.error('Blob upload failed:', err));

        // 🎧 Stream to Azure STT
        fs.createReadStream(filePath)
          .on('data', (chunk) => pushStream.write(chunk))
          .on('end', () => {
            console.log('Audio stream ended. Closing pushStream...');
            pushStream.close();
          });
      },
      (err) => {
        console.error('Start recognizer failed:', err);
        cleanupAndRespond(500, {
          error: 'Failed to start recognition',
          details: err,
        });
      }
    );
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}
