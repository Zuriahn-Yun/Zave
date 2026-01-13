export interface RepairStep {
  stepNumber: number;
  description: string;
  toolNeeded: string;
  generatedImage?: string; // Base64 of the generated storyboard image
}

export interface PartPurchaseOption {
  retailer: string;
  price: number;
  url: string;
  title: string;
}

export interface DIYPart {
  partName: string;
  estimatedCost: number;
  purchaseOptions: PartPurchaseOption[];
}

export interface PurchaseOption {
  retailer: string;
  price: number;
  url: string;
  title: string;
}

export interface VideoResource {
  title: string;
  channel: string;
  url: string;
}

export interface CommercialAnalysis {
  productName: string;
  marketSummary: string;
  replacementOptions: PurchaseOption[]; // Where to buy new
  diyParts: DIYPart[]; // Specific parts needed
  estimatedDiyTotal: number;
  estimatedReplacementTotal: number;
}

export interface DIYAnalysis {
  diagnosis: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  estimatedTimeMinutes: number;
  steps: RepairStep[];
  videos: VideoResource[];
}

export interface FullAnalysisResult {
  commercial: CommercialAnalysis;
  diy: DIYAnalysis;
}

export enum AppState {
  IDLE,
  ANALYZING,
  RESULTS,
  COACHING
}