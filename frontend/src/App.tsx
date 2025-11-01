import { useState, useEffect } from 'react';

// ===== TYPES & INTERFACES (Defines the shape of our data) =====
type AppState = 'idle' | 'analyzing' | 'reviewing' | 'translating' | 'completed' | 'failed';
type TranslationTone = 'Professional' | 'Literary' | 'Casual' | 'Technical' | 'Cinematic';

interface Blueprint {
  summary: string;
  keyPoints: string[];
  characterProfiles: { personaName: string; speakingStyle: string }[];
  culturalAdaptations: { original: string; adaptation: string; justification: string }[];
  glossary: { term: string; proposedTranslation: string; justification: string }[];
}

interface TranslationResult {
  finalSrt: string;
  syncSuggestions: { sequence: number; suggestion: string }[];
}

// ===== ICON COMPONENTS (For a clean UI without extra dependencies) =====
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>;
const TranslateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.22 4.53a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L15.44 10 12.22 6.81a.75.75 0 0 1 0-1.06ZM8.84 4.53a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L12.06 10 8.84 6.81a.75.75 0 0 1 0-1.06ZM3.78 5.59a.75.75 0 0 0-1.06 1.06L5.94 10l-3.22 3.35a.75.75 0 1 0 1.06 1.06L7 11.06 3.78 7.81a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" /></svg>;
const Spinner = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// ===== MAIN APPLICATION COMPONENT =====
export default function App() {
  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('Upload an SRT file to begin.');
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [tone, setTone] = useState<TranslationTone>('Professional');
  const tones: TranslationTone[] = ['Professional', 'Literary', 'Casual', 'Technical', 'Cinematic'];

  // Data State
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);

  // API Configuration
  // IMPORTANT: This URL must be replaced with your live Render backend URL after deployment.
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // --- DERIVED STATE (Computed values for the UI) ---
  const isProcessing = ['analyzing', 'translating'].includes(appState);

  const getButtonText = () => {
    switch (appState) {
      case 'analyzing': return 'Analyzing...';
      case 'reviewing': return 'Awaiting Review';
      case 'translating': return 'Translating...';
      case 'completed':
      case 'failed':
        return 'Start New Translation';
      default:
        return 'Generate Blueprint';
    }
  };

  // --- CORE LOGIC & EVENT HANDLERS ---
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.srt')) {
      setSelectedFile(file);
      setStatusMessage(`File selected: ${file.name}`);
      setError(null);
      // Reset the state if a new file is selected after completion
      if (appState === 'completed' || appState === 'failed') {
        setAppState('idle');
        setTranslationResult(null);
      }
    } else {
      setError('Please select a valid .srt file.');
      setSelectedFile(null);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };
  
  const handleReset = () => {
    setAppState('idle');
    setSelectedFile(null);
    setStatusMessage('Upload an SRT file to begin.');
    setError(null);
    setBlueprint(null);
    setTranslationResult(null);
  };

  const handleGenerateBlueprint = async () => {
    if (!selectedFile) {
      setError('Please select an SRT file first.');
      return;
    }
    setAppState('analyzing');
    setError(null);
    setStatusMessage('Phase 1: Performing deep content analysis...');

    const formData = new FormData();
    formData.append('subtitleContent', await selectedFile.text());
    formData.append('settings', JSON.stringify({ tone }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/translation/blueprint`, {
        method: 'POST',
        body: JSON.stringify({
          subtitleContent: await selectedFile.text(),
          settings: { tone },
        }),
        headers: {
            'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate blueprint.');
      }

      const data = await response.json();
      setBlueprint(data.blueprint);
      setAppState('reviewing');
      setStatusMessage('Analysis complete. Please review the Translation Blueprint.');
    } catch (err: any) {
      setError(err.message);
      setAppState('failed');
    }
  };

  const handleExecuteTranslation = async (blueprintToExecute: Blueprint) => {
    if (!selectedFile) return;

    setAppState('translating');
    setStatusMessage('Phase 2: Translating with approved blueprint...');
    setBlueprint(null); // Close the blueprint modal

    try {
       const response = await fetch(`${API_BASE_URL}/api/translation/execute`, {
        method: 'POST',
        body: JSON.stringify({
          subtitleContent: await selectedFile.text(),
          settings: { tone },
          confirmedBlueprint: blueprintToExecute,
        }),
        headers: {
            'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Translation failed on the server.');
      }
      
      const result: TranslationResult = await response.json();
      setTranslationResult(result);
      setAppState('completed');
      setStatusMessage('Translation successful!');

    } catch (err: any) {
      setError(err.message);
      setAppState('failed');
    }
  };


  // --- RENDER ---
  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
          Phantom Subtitle Translator
        </h1>
        <p className="text-slate-400 mt-2 text-lg">The Director's Console</p>
      </header>
      
      {/* Main Dashboard */}
      <div className="w-full max-w-5xl bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Input & Controls */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="file-upload" className="block text-sm font-medium text-slate-300">1. Upload SRT File</label>
                <button
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  <UploadIcon />
                  <span>{selectedFile ? "Change File" : "Upload SRT"}</span>
                </button>
                <input type="file" id="file-upload" onChange={handleFileSelect} accept=".srt" className="hidden" />
              </div>
              <div className="w-full h-48 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-center p-4">
                <span className="text-slate-400">{selectedFile ? `Selected: ${selectedFile.name}` : "Your file will appear here."}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">2. Select Translation Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {tones.map(t => (
                  <button key={t} onClick={() => setTone(t)} disabled={isProcessing}
                    className={`text-center rounded-lg py-2 px-3 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-cyan-400 disabled:opacity-50 ${
                      tone === t 
                      ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400' 
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800">
               <button onClick={appState === 'completed' || appState === 'failed' ? handleReset : handleGenerateBlueprint} 
                disabled={isProcessing || !selectedFile}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold py-3 rounded-lg disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                {isProcessing ? <Spinner/> : <TranslateIcon />}
                <span>{getButtonText()}</span>
              </button>
              <p className="text-center text-slate-500 mt-3 text-sm h-5">{isProcessing ? statusMessage : ''}</p>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col">
             <label className="block text-sm font-medium text-slate-300 mb-2">Result</label>
             <div className="relative w-full h-full min-h-[360px] bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 font-persian shadow-inner">
               <pre className="whitespace-pre-wrap break-words w-full h-full p-4 text-sm">
                 {translationResult ? translationResult.finalSrt : "Your Persian translation will appear here..."}
               </pre>
             </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Blueprint Review Modal */}
      {appState === 'reviewing' && blueprint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 ring-1 ring-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-indigo-400 text-transparent bg-clip-text">Interactive Translation Blueprint</h2>
              <p className="text-sm text-slate-400">Review & Approve the AI's Plan</p>
            </header>

            <main className="flex-grow p-6 overflow-y-auto">
              {/* Blueprint content goes here */}
              <div className="prose prose-invert prose-sm">
                <h3>Summary</h3>
                <p>{blueprint.summary}</p>
                <h3>Key Points</h3>
                <ul>{blueprint.keyPoints.map(p => <li key={p}>{p}</li>)}</ul>
                <h3>Glossary</h3>
                <dl>{blueprint.glossary.map(g => <div key={g.term}><dt>{g.term}</dt><dd>{g.proposedTranslation} - <em>{g.justification}</em></dd></div>)}</dl>
              </div>
            </main>

            <footer className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
              <button onClick={() => setAppState('idle')} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 transition-colors">Cancel</button>
              <button onClick={() => handleExecuteTranslation(blueprint)} className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-400 transition-colors">Confirm & Translate</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
        }
