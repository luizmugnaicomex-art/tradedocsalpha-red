import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Part } from '@google/genai';

const App: React.FC = () => {
  const [ciFile, setCiFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [blFile, setBlFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState<string>('Copy');

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files) {
      setter(e.target.files[0]);
      setResult('');
      setError('');
    }
  };

  const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleAnalyze = async () => {
    if (!ciFile && !plFile && !blFile) {
        setError('Please upload at least one document.');
        return;
    }

    setLoading(true);
    setResult('');
    setError('');
    setCopyButtonText('Copy');

    try {
      const prompt = `You are an expert AI assistant specializing in international trade document analysis. Your primary task is to accurately extract key information from the provided document(s) (e.g., Commercial Invoice, Packing List, Bill of Lading).

**Instructions:**
1.  Analyze all attached documents carefully.
2.  Extract the data points listed under "General Information" and present them in a clean "Key: Value" format.
3.  Extract all container details from the Bill of Lading and present them in a clear, multi-line list or table format.
4.  If a piece of information is not available in the provided document(s), state "Not Found".

**General Information:**
* **Total Invoice Value (USD):**
* **Total Packages:**
* **SAP Cargo PO:**
* **Invoice Number:**
* **BL/AWB Number:**
* **Shipper:**
* **Incoterm:**
* **Description:**
* **Carrier:**
* **Vessel:**
* **Freight Value (USD):**
* **CBM:**

**Container Details:**
(List all containers found in the Bill of Lading below, with Container Number, Seal Number, and Container Type)
`;

      const parts: Part[] = [{ text: prompt }];
      if (ciFile) parts.push(await fileToGenerativePart(ciFile));
      if (plFile) parts.push(await fileToGenerativePart(plFile));
      if (blFile) parts.push(await fileToGenerativePart(blFile));


      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: parts,
          },
        ],
      });

      setResult(response.text);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
        <h1>Trade Document Analyzer</h1>
        <p>Upload your CI, PL, and BL to automatically extract key information.</p>
      </header>

      <div className="upload-section">
        <FileInput 
          label="Commercial Invoice (CI)" 
          file={ciFile} 
          onChange={(e) => handleFileChange(e, setCiFile)}
          id="ci-file"
        />
        <FileInput 
          label="Packing List (PL)" 
          file={plFile} 
          onChange={(e) => handleFileChange(e, setPlFile)} 
          id="pl-file"
        />
        <FileInput 
          label="Bill of Lading (BL)" 
          file={blFile} 
          onChange={(e) => handleFileChange(e, setBlFile)} 
          id="bl-file"
        />
      </div>

      <button
        className="analyze-button"
        onClick={handleAnalyze}
        disabled={!anyFileUploaded || loading}
      >
        {loading ? (
            <>
            <div className="spinner"></div>
            <span>Analyzing...</span>
            </>
        ) : 'Analyze Documents'}
      </button>

      {error && <div className="error-message" role="alert">{error}</div>}

      {result && (
        <div className="results-section">
          <div className="results-header">
            <h2>Extracted Data</h2>
            <button className="copy-button" onClick={handleCopy}>
                {copyButtonText}
            </button>
          </div>
          <div className="result-content">
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
        <div className="file-input-wrapper">
            <label htmlFor={id}>{label}</label>
            <label htmlFor={id} className={`file-input-label ${file ? 'file-selected' : ''}`}>
                 {file ? (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <span className="file-name">{file.name}</span>
                    </>
                ) : (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>Click to upload</span>
                    </>
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