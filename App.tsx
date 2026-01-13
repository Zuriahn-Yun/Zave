import React, { useState, useEffect } from 'react';
import { AppState, FullAnalysisResult, DIYPart } from './types';
import { analyzeItemImage, generateInstructionImage, fileToGenerativePart } from './services/geminiService';
import LiveCoach from './components/LiveCoach';
import { Upload, Camera, Zap, DollarSign, Wrench, AlertTriangle, PlayCircle, Loader2, Youtube, ShoppingCart, ExternalLink, PenTool, Sparkles, CheckCircle2, ChevronDown, Sun, Moon } from 'lucide-react';

// Theme Context Helper
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme };
};

// Sub-component for individual part rendering
const PartAccordionItem: React.FC<{ part: DIYPart }> = ({ part }) => {
  const [isOpen, setIsOpen] = useState(false);
  const sortedOptions = [...(part.purchaseOptions || [])].sort((a, b) => a.price - b.price);
  const hasOptions = sortedOptions.length > 0;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
        <button 
            onClick={() => hasOptions && setIsOpen(!isOpen)}
            disabled={!hasOptions}
            className={`
                w-full flex justify-between items-center text-sm py-4 px-3 rounded-lg transition-all group
                ${hasOptions 
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer' 
                    : 'cursor-default opacity-80'
                }
            `}
        >
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full transition-colors ${isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <span className={`font-semibold transition-colors ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{part.partName}</span>
            </div>
            <div className="flex items-center gap-3">
                 <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                    ~${part.estimatedCost}
                 </span>
                 {hasOptions && (
                     <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : 'group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                 )}
            </div>
        </button>
        
        {isOpen && hasOptions && (
            <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 mx-2 mb-3 animate-fade-in space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center px-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Online Retailers</span>
                </div>
                {sortedOptions.map((opt, idx) => (
                    <a 
                        key={idx} 
                        href={opt.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex justify-between items-center p-2.5 rounded-md hover:bg-white dark:hover:bg-slate-800 transition group/link border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow"
                    >
                        <div className="min-w-0 pr-3">
                            <div className="text-slate-800 dark:text-emerald-200 font-medium text-xs truncate">{opt.title || part.partName}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5">{opt.retailer}</div>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">${opt.price}</span>
                            <ExternalLink size={10} className="text-slate-400 group-hover/link:text-emerald-500" />
                        </div>
                    </a>
                ))}
            </div>
        )}
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userDescription, setUserDescription] = useState<string>("");
  const [analysis, setAnalysis] = useState<FullAnalysisResult | null>(null);
  const [isCoachActive, setIsCoachActive] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{[key: number]: string}>({});
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { theme, setTheme } = useTheme();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!imageFile) return;
    
    // Clear previous results to prevent stale data overlay
    setAnalysis(null);
    setGeneratedImages({});
    setError(null);
    
    setState(AppState.ANALYZING);
    try {
      const base64 = await fileToGenerativePart(imageFile);
      const result = await analyzeItemImage(base64, imageFile.type, userDescription);
      setAnalysis(result);
      setState(AppState.RESULTS);
    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please try again with a clearer image or description.");
      setState(AppState.IDLE);
    }
  };

  const resetApp = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setGeneratedImages({});
    setImageFile(null);
    setPreviewUrl(null);
    setUserDescription("");
    setError(null);
  };

  const generateImageForStep = async (stepIndex: number, description: string) => {
    if (generatingStep !== null) return;
    setGeneratingStep(stepIndex);
    try {
      const fullPrompt = `${analysis?.commercial.productName || 'Repair'}: ${description}`;
      const base64Image = await generateInstructionImage(fullPrompt);
      setGeneratedImages(prev => ({...prev, [stepIndex]: `data:image/png;base64,${base64Image}`}));
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingStep(null);
    }
  };

  const visualizeAllSteps = async () => {
    if (!analysis || isGeneratingAll) return;
    setIsGeneratingAll(true);
    
    const stepsToGenerate = analysis.diy.steps.map((step, idx) => ({ idx, description: step.description }));
    
    try {
      await Promise.all(stepsToGenerate.map(async ({ idx, description }) => {
        if (generatedImages[idx]) return;
        try {
            const fullPrompt = `${analysis.commercial.productName}: ${description}`;
            const base64Image = await generateInstructionImage(fullPrompt);
            setGeneratedImages(prev => ({...prev, [idx]: `data:image/png;base64,${base64Image}`}));
        } catch (e) {
            console.error(`Failed to generate step ${idx}`, e);
        }
      }));
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // --- RENDER SECTIONS ---

  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 -left-10 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 -right-10 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-xl w-full text-center space-y-12 relative z-10">
        <div className="space-y-6">
            <h1 className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">
              Zave
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg font-normal leading-relaxed">
              Snap a photo. <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Diagnose.</span> <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Fix.</span>
              <br/>The intelligent agent for your physical world.
            </p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-none space-y-4">
            <div className="relative group cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-[1.5rem] p-12 transition-all bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900">
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="flex flex-col items-center gap-5 pointer-events-none">
                    {previewUrl ? (
                        <div className="relative">
                            <img src={previewUrl} alt="Preview" className="h-48 rounded-lg shadow-lg object-contain bg-white dark:bg-black/20" />
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-3 rounded-full shadow-md">Change</div>
                        </div>
                    ) : (
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-full shadow-md ring-1 ring-slate-200 dark:ring-slate-700 group-hover:scale-105 transition duration-300">
                            <Camera className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {previewUrl ? 'Ready to analyze' : 'Drag & Drop or Click to Upload'}
                    </span>
                </div>
            </div>

            <div className="relative">
                <div className="absolute top-4 left-4 text-slate-400 w-4 h-4 pointer-events-none">
                   <PenTool size={16} />
                </div>
                <textarea 
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder="Describe the problem (e.g. 'Screen is flickering', 'Making a grinding noise')..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pl-10 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] resize-none"
                />
            </div>
        </div>

        {previewUrl && (
          <button 
            onClick={startAnalysis}
            className="w-full py-4 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 dark:shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
          >
            <Zap className="w-5 h-5 fill-current" />
            Start Diagnosis
          </button>
        )}
        {error && (
            <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <AlertTriangle size={16} />
                {error}
            </div>
        )}
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse"></div>
        <div className="relative z-10 bg-white dark:bg-slate-900 p-8 rounded-full shadow-2xl ring-1 ring-slate-100 dark:ring-slate-800">
             <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analyzing Item</h2>
        <p className="text-slate-500 dark:text-slate-400">Processing visual and commercial data...</p>
      </div>

      <div className="w-64 space-y-3">
        {['Diagnosing failure points', 'Identifying parts', 'Scanning retail markets'].map((text, i) => (
             <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse" style={{ animationDelay: `${i * 150}ms`}}>
                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                {text}
            </div>
        ))}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!analysis) return null;

    const priceDiff = analysis.commercial.estimatedReplacementTotal - analysis.commercial.estimatedDiyTotal;
    const savings = priceDiff > 0 ? priceDiff : 0;

    return (
      <div className="container mx-auto px-4 py-8 pb-32 max-w-6xl animate-fade-in-up">
        {/* Header Summary */}
        <div className="mb-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-[2rem] shadow-sm relative overflow-hidden">
             {/* Gradient accents */}
             <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-50/50 dark:from-indigo-900/10 to-transparent pointer-events-none"></div>

             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 text-xs font-bold tracking-wide mb-6 uppercase">
                    <AlertTriangle size={12} /> Diagnosis Complete
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">{analysis.commercial.productName}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-lg md:text-xl font-light leading-relaxed max-w-3xl">{analysis.diy.diagnosis}</p>
             </div>
        </div>

        {/* The Decision Matrix - Bento Grid Style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-20">
            
            {/* OPTION A: REPAIR */}
            <div className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-900/30 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all hover:border-emerald-400/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-emerald-400 mb-2">Repair</h3>
                        <div className="flex gap-2">
                             <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded uppercase tracking-wider">{analysis.diy.difficulty}</span>
                             <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded uppercase tracking-wider">{analysis.diy.estimatedTimeMinutes} mins</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">${analysis.commercial.estimatedDiyTotal}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mt-1">Est. Cost</div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800 flex-1">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart size={12} /> Required Parts
                    </h4>
                    <div className="space-y-1">
                        {analysis.commercial.diyParts.map((part, i) => (
                            <PartAccordionItem key={i} part={part} />
                        ))}
                        {analysis.commercial.diyParts.length === 0 && (
                            <div className="text-slate-500 text-sm italic py-2 text-center">No parts needed. Just tools.</div>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <button 
                        onClick={() => setIsCoachActive(true)}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                        <PlayCircle className="fill-white/20" />
                        Start Interactive Coach
                    </button>
                    {savings > 0 && (
                        <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-lg">
                            <Sparkles size={14} />
                            <span>Save <span className="font-bold">${savings.toFixed(2)}</span> by fixing it</span>
                        </div>
                    )}
                </div>
            </div>

            {/* OPTION B: REPLACE */}
            <div className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/30 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all hover:border-blue-400/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-blue-400 mb-2">Replace</h3>
                        <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-bold rounded uppercase tracking-wider">
                            Instant Solution
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">${analysis.commercial.estimatedReplacementTotal}</div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-500 font-bold uppercase tracking-widest mt-1">Retail Price</div>
                    </div>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                        {analysis.commercial.replacementOptions.map((opt, i) => (
                            <a key={i} href={opt.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50 hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 p-4 rounded-xl transition-all group/link relative shadow-sm hover:shadow-md">
                            <div className="flex justify-between items-center relative z-10">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-slate-900 dark:text-white font-semibold truncate group-hover/link:text-blue-600 dark:group-hover/link:text-blue-300 transition">{opt.title}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mt-1">{opt.retailer}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">${opt.price}</span>
                                    <ExternalLink size={14} className="text-slate-400 group-hover/link:text-blue-500 transition" />
                                </div>
                            </div>
                            </a>
                        ))}
                </div>
                    
                <div className="mt-auto bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">
                        "{analysis.commercial.marketSummary}"
                    </p>
                </div>
            </div>
        </div>

        {/* Storyboard */}
        <div className="space-y-8 mb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Interactive Guide</h3>
                <button 
                    onClick={visualizeAllSteps}
                    disabled={isGeneratingAll}
                    className={`
                        px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-md transition-all
                        ${isGeneratingAll 
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-wait' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'
                        }
                    `}
                >
                    {isGeneratingAll ? (
                        <><Loader2 className="animate-spin w-4 h-4" /> Generating...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Visualize All Steps</>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {analysis.diy.steps.map((step, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col group">
                        
                        {/* Image Area */}
                        <div className="h-56 bg-slate-50 dark:bg-white relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                            {generatedImages[idx] ? (
                                <img src={generatedImages[idx]} alt={`Step ${idx+1}`} className="w-full h-full object-contain p-6 animate-fade-in" />
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <button 
                                        onClick={() => generateImageForStep(idx, step.description)}
                                        disabled={generatingStep !== null || isGeneratingAll}
                                        className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all transform hover:scale-110"
                                    >
                                        {generatingStep === idx ? <Loader2 className="animate-spin w-6 h-6" /> : <Camera className="w-6 h-6" />}
                                    </button>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Visualize</span>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 w-8 h-8 bg-slate-900 dark:bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-lg">
                                {idx + 1}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed flex-1 font-medium">{step.description}</p>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/30 rounded-md px-3 py-1.5">
                                    <Wrench size={12} className="text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono tracking-wide uppercase">
                                        {step.toolNeeded}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Video Resources */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-16">
             <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                 <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <Youtube className="text-red-600 dark:text-red-500" /> 
                 </div>
                 Video Tutorials
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.diy.videos.map((vid, idx) => (
                    <a href={vid.url} target="_blank" rel="noopener noreferrer" key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 transition group hover:-translate-y-1 hover:shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="bg-red-500 p-3 rounded-xl text-white shadow-lg shadow-red-500/30 shrink-0">
                                <PlayCircle size={24} className="fill-white/20" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white line-clamp-2 mb-2 leading-snug text-sm">{vid.title}</h4>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{vid.channel}</p>
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
             </div>
        </div>
      </div>
    );
  };

  // --- MAIN LAYOUT ---

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-700 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200 transition-colors duration-300">
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={resetApp}>
            <div className="w-10 h-10 bg-slate-900 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                 <Wrench size={20} className="fill-white/20" />
            </div>
            <span className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">Zave</span>
          </div>

          <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
             >
                 {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
             </button>

            {state !== AppState.IDLE && (
                <button 
                    onClick={resetApp} 
                    className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 px-5 py-2.5 rounded-xl transition border border-transparent dark:border-slate-800"
                >
                    New Analysis
                </button>
            )}
          </div>
        </div>
      </nav>

      <main>
        {state === AppState.IDLE && renderIdle()}
        {state === AppState.ANALYZING && renderAnalyzing()}
        {state === AppState.RESULTS && renderResults()}
        {state === AppState.COACHING && renderResults() /* Coach overlays on results */}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-20 py-12 text-center bg-white dark:bg-slate-950">
        <div className="flex items-center justify-center gap-2 mb-4 text-slate-400 dark:text-slate-600">
             <Zap size={16} />
             <span className="text-xs font-bold tracking-widest uppercase">Powered by Gemini 3 Flash & 2.5 Nano</span>
        </div>
        <p className="text-slate-500 dark:text-slate-600 text-sm">
            © {new Date().getFullYear()} Zave. Universal Repair Intelligence.
        </p>
      </footer>

      {isCoachActive && analysis && (
        <LiveCoach 
            onClose={() => setIsCoachActive(false)} 
            context={`${analysis.commercial.productName} repair. Steps: ${analysis.diy.steps.map(s => s.description).join('. ')}`}
        />
      )}
    </div>
  );
};

export default App;