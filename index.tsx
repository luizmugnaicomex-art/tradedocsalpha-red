
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Part } from '@google/genai';

const App: React.FC = () => {
  const [ciFile, setCiFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [blFile, setBlFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState<string>('Copy');

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
      setResult('');
      setError('');
    }
  };

  const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleAnalyze = async () => {
    if (!ciFile && !plFile && !blFile) {
        setError('Please upload at least one document to begin analysis.');
        return;
    }

    setLoading(true);
    setResult('');
    setError('');
    setCopyButtonText('Copy');
    setStatusMessage('Preparing documents...');

    try {
      // Initialize inside the handler to prevent early crashes if env vars aren't ready
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please check your environment configuration.");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `You are an expert AI assistant specializing in international trade document analysis. 
Your task is to extract key data from the uploaded files (Commercial Invoice, Packing List, or Bill of Lading).

**Instructions:**
1. Extract the following "General Information" fields in "Key: Value" format.
2. If multiple documents are provided, cross-reference them for accuracy.
3. Extract all container details from the Bill of Lading into a formatted table or clear list.
4. If any field is missing, strictly write "Not Found".

**Extraction Fields:**
- Total Invoice Value (USD)
- Total Packages
- SAP Cargo PO
- Invoice Number
- BL/AWB Number
- Shipper
- Incoterm
- Description of Goods
- Carrier
- Vessel/Voyage
- Freight Value (USD)
- CBM (Total Volume)

**Container Details:**
Extract: Container Number, Seal Number, and Container Type.`;

      setStatusMessage('Reading file data...');
      const parts: Part[] = [{ text: prompt }];
      
      if (ciFile) parts.push(await fileToGenerativePart(ciFile));
      if (plFile) parts.push(await fileToGenerativePart(plFile));
      if (blFile) parts.push(await fileToGenerativePart(blFile));

      setStatusMessage('Analyzing documents with Gemini...');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
      });

      if (!response.text) {
        throw new Error("The model returned an empty response. Please try again with clearer documents.");
      }

      setResult(response.text);
    } catch (err) {
      console.error(err);
      let msg = 'An unexpected error occurred.';
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('API Key must be set')) {
          msg = "Configuration Error: The API Key is not being correctly passed to the application. Check your Vercel Environment Variables.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };
  
  const handleCopy = () => {
      if (!result) return;
      navigator.clipboard.writeText(result);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
  }

  const anyFileUploaded = ciFile || plFile || blFile;

  return (
    <div className="container">
      <header>
        <div className="logo-badge">Trade AI</div>
        <h1>Document Intelligence</h1>
        <p>Extract structural data from CI, PL, and BL documents instantly.</p>
      </header>

      <div className="upload-grid">
        <FileInput 
          label="Commercial Invoice" 
          file={ciFile} 
          onChange={(e) => handleFileChange(e, setCiFile)}
          id="ci-file"
        />
        <FileInput 
          label="Packing List" 
          file={plFile} 
          onChange={(e) => handleFileChange(e, setPlFile)} 
          id="pl-file"
        />
        <FileInput 
          label="Bill of Lading" 
          file={blFile} 
          onChange={(e) => handleFileChange(e, setBlFile)} 
          id="bl-file"
        />
      </div>

      <div className="actions">
        <button
          className="analyze-button"
          onClick={handleAnalyze}
          disabled={!anyFileUploaded || loading}
        >
          {loading ? (
              <>
              <div className="spinner"></div>
              <span>{statusMessage || 'Analyzing...'}</span>
              </>
          ) : 'Start Extraction'}
        </button>
      </div>

      {error && (
        <div className="error-card" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="results-wrapper animate-fade-in">
          <div className="results-toolbar">
            <h2>Extraction Results</h2>
            <button className="copy-btn" onClick={handleCopy}>
                {copyButtonText === 'Copied!' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
                {copyButtonText}
            </button>
          </div>
          <div className="result-body">
            <pre>{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

interface FileInputProps {
    label: string;
    file: File | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
}

const FileInput: React.FC<FileInputProps> = ({ label, file, onChange, id }) => {
    return (
        <div className="upload-card">
            <label className="card-label" htmlFor={id}>{label}</label>
            <label htmlFor={id} className={`drop-zone ${file ? 'has-file' : ''}`}>
                 {file ? (
                    <div className="file-info">
                        <div className="file-icon success">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <span className="file-name-text">{file.name}</span>
                        <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                ) : (
                    <div className="upload-prompt">
                        <div className="file-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <span>Upload File</span>
                    </div>
                )}
            </label>
            <input 
              id={id} 
              type="file" 
              onChange={onChange} 
              accept="image/*,.pdf" 
            />
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
