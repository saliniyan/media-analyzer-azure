import express from 'express';
import multer from 'multer';
import { transcribeAudio } from '../controllers/speechController.js';
import { speakText } from '../controllers/speakText.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Route: Speech-to-Text
router.post('/transcribe', upload.single('audio'), transcribeAudio);

// Route: Text-to-Speech
router.post('/speak', speakText);

export default router;
