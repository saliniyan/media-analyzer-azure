import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [translated, setTranslated] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcriptionLang, setTranscriptionLang] = useState('en-US');
  const [translationLang, setTranslationLang] = useState('');
  const [voice, setVoice] = useState('female');
  const [customText, setCustomText] = useState('');
  const [chainMode, setChainMode] = useState(true);
  const [processing, setProcessing] = useState({
    transcribe: false,
    summarize: false,
    translate: false,
    speak: false,
  });

  const handleTranscribe = async () => {
    if (!file) return;
    setProcessing(prev => ({ ...prev, transcribe: true }));
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await axios.post(
        `https://media-analyzer-azure.onrender.com/api/transcribe?lang=${transcriptionLang}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setTranscript(res.data.transcript);
      if (chainMode) {
        setSummary('');
        setTranslated('');
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setProcessing(prev => ({ ...prev, transcribe: false }));
    }
  };

  const handleSummarize = async () => {
    if (!transcript) return;
    setProcessing(prev => ({ ...prev, summarize: true }));
    try {
      const res = await axios.post('https://media-analyzer-azure.onrender.com/api/summarize', {
        text: transcript,
        lang: transcriptionLang.split('-')[0] || 'en'
      });
      setSummary(res.data.summary);
      if (chainMode) setTranslated('');
    } catch (err) {
      console.error('Summarization failed:', err);
    } finally {
      setProcessing(prev => ({ ...prev, summarize: false }));
    }
  };

  const handleTranslate = async () => {
    const baseText = summary || transcript;
    if (!baseText || !translationLang) return;
    setProcessing(prev => ({ ...prev, translate: true }));
    try {
      const res = await axios.post('https://media-analyzer-azure.onrender.com/api/translate', {
        text: baseText,
        to: translationLang,
      });
      setTranslated(res.data.translatedText);
      if (chainMode && !customText) {
        setCustomText(res.data.translatedText);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setProcessing(prev => ({ ...prev, translate: false }));
    }
  };

  const handleSpeak = async () => {
    const baseText = customText || translated || summary || transcript;
    if (!baseText) return;
    setProcessing(prev => ({ ...prev, speak: true }));
    try {
      const res = await axios.post(
        'https://media-analyzer-azure.onrender.com/api/speak',
        {
          text: baseText,
          language: translationLang || transcriptionLang.split('-')[0] || 'en',
          voice: voice,
        },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      setAudioUrl(url);
    } catch (err) {
      console.error('Speech synthesis failed:', err);
    } finally {
      setProcessing(prev => ({ ...prev, speak: false }));
    }
  };

  return (
    <div className="smart-analyzer">
      <header className="app-header">
        <h1 className="app-title">Media Analyzer using Azure AI service</h1>
        <p className="app-subtitle">Transform lecture and lesson audio into a summary in your preferred language, and listen to it with multiple voice using AI-powered insights.</p>
      </header>

      <div className="chain-toggle">
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={chainMode} 
            onChange={() => setChainMode(!chainMode)} 
          />
          <span className="toggle-slider"></span>
        </label>
        <span>Chain Mode {chainMode ? 'ON' : 'OFF'} (Pass output from the previous task to the next)</span>
      </div>

      {/* Upload & Transcribe Section */}
      <section className="process-section">
        <div className="section-header">
          <div className="section-number">1</div>
          <h2 className="section-title">Upload & Transcribe</h2>
          </div>
          <p className="app-subtitle-sub">
            Upload a clear audio file (supported format: <strong>.wav</strong>). 
            For example, 
            <a 
            href="https://github.com/saliniyan/media-analyzer-azure/blob/main/frontend/audio/tamil_croped.wav" 
            target="_blank" 
            rel="noreferrer"
          >
            sample audio file
          </a>
            The uploaded audio will be transcribed to text.
          </p>
        
        <div className="file-input-container">
          <label className="file-input-label">
            {file ? file.name : 'Choose Audio File'}
            <input
              type="file" 
              className="file-input" 
              accept="audio/*" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
          </label>
        </div>
        
        <select 
          className="select-dropdown"
          onChange={(e) => setTranscriptionLang(e.target.value)} 
          value={transcriptionLang}
        >
          <option value="en-US">English (US)</option>
          <option value="ta-IN">Tamil (India)</option>
          <option value="hi-IN">Hindi (India)</option>
          <option value="fr-FR">French (France)</option>
          <option value="de-DE">German</option>
        </select>
        
        <button 
          className="action-button"
          onClick={handleTranscribe} 
          disabled={!file || processing.transcribe}
        >
          {processing.transcribe ? (
            <span className="processing">Transcribing</span>
          ) : (
            <>
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Transcribe
            </>
          )}
        </button>
      </section>

      {/* Transcript Section */}
      <section className="process-section">
        <div className="section-header">
          <div className="section-number">2</div>
          <h2 className="section-title">Transcript</h2>
        </div>
        
        <textarea
          className="text-area"
          placeholder="Your audio transcript will appear here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        ></textarea>
         <p className='app-subtitle-sub'>
          Now click summarize to get summary of the audio
        </p>
        <button 
          className="action-button"
          onClick={handleSummarize} 
          disabled={!transcript || processing.summarize}
        >
          {processing.summarize ? (
            <span className="processing">Summarizing</span>
          ) : (
            <>
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Summarize
            </>
          )}
        </button>
      </section>

      {/* Summary Section */}
      <section className="process-section">
        <div className="section-header">
          <div className="section-number">3</div>
          <h2 className="section-title">Summary</h2>
        </div>
        
        <textarea
          className="text-area"
          placeholder="Your content summary will appear here..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        ></textarea>
        
        <select 
          className="select-dropdown"
          onChange={(e) => setTranslationLang(e.target.value)} 
          value={translationLang}
        >
          <option value="">Select Translation Language</option>
          <option value="ta">Tamil</option>
          <option value="hi">Hindi</option>
          <option value="fr">French</option>
          <option value="en">English</option>
        </select>
        <p className='app-subtitle-sub'>
          Now translate the summary into your preferred language.
        </p>
        <button 
          className="action-button"
          onClick={handleTranslate} 
          disabled={(!summary && !transcript) || !translationLang || processing.translate}
        >
          {processing.translate ? (
            <span className="processing">Translating</span>
          ) : (
            <>
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
              </svg>
              Translate
            </>
          )}
        </button>
      </section>

      {/* Translation Section */}
      <section className="process-section">
        <div className="section-header">
          <div className="section-number">4</div>
          <h2 className="section-title">Translation</h2>
        </div>
        
        <textarea
          className="text-area"
          placeholder="Your translation will appear here..."
          value={translated}
          readOnly
        ></textarea>
      </section>

      {/* Text to Speech Section */}
      <section className="process-section">
        <div className="section-header">
          <div className="section-number">5</div>
          <h2 className="section-title">Text to Speech</h2>
        </div>
        
        <textarea
          className="text-area"
          placeholder="Enter custom text to speak (or leave empty to use previous output)"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
        ></textarea>
        
        <div className="voice-selection">
          <label className="voice-option">
            <input 
              type="radio" 
              name="voice" 
              value="female" 
              checked={voice === 'female'} 
              onChange={() => setVoice('female')} 
            />
            Female Voice
          </label>
          <label className="voice-option">
            <input 
              type="radio" 
              name="voice" 
              value="male" 
              checked={voice === 'male'} 
              onChange={() => setVoice('male')} 
            />
            Male Voice
          </label>
          <label className="voice-option">
            <input 
              type="radio" 
              name="voice" 
              value="child" 
              checked={voice === 'child'} 
              onChange={() => setVoice('child')} 
            />
            Child Voice
          </label>
        </div>
        
        <button 
          className="action-button"
          onClick={handleSpeak} 
          disabled={processing.speak}
        >
          {processing.speak ? (
            <span className="processing">Generating Audio</span>
          ) : (
            <>
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Generate Speech
            </>
          )}
        </button>
        
        {audioUrl && (
          <div className="audio-player-container">
            <h3 className="audio-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Audio Output
            </h3>
            <audio controls src={audioUrl}></audio>
          </div>
        )}
      </section>
    </div>
  );
}