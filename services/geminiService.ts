import { GoogleGenAI, Type } from "@google/genai";
import { FullAnalysisResult } from "../types";

// Helper to convert file to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeItemImage = async (base64Image: string, mimeType: string, userDescription: string = ""): Promise<FullAnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this image of a broken or damaged item. The user also provided this description: "${userDescription}".
    Act as a "Zave" Repair Agent. This is for ANY item (electronics, home goods, automotive, etc.).
    
    1. Identify the specific product and model if possible.
    2. Search for 2-3 specific places the user can buy a BRAND NEW replacement for this item right now. Include prices and URLs.
    3. Diagnose the issue and identify the SPECIFIC replacement parts needed to fix it (DIY).
    4. For EACH identified DIY part, search for 2-3 real online purchasing options. Include retailer name, price, and direct URL.
    5. Search for 2-3 YouTube repair tutorial videos for this specific problem.
    6. Outline 3-5 distinct steps to fix it manually.

    Return ONLY raw JSON based on the schema. 
    Ensure 'replacementOptions' has valid real-world retailers and prices.
    Ensure 'purchaseOptions' for diyParts has valid links.
    Ensure 'videos' has valid YouTube search result titles and URLs.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commercial: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              marketSummary: { type: Type.STRING },
              estimatedReplacementTotal: { type: Type.NUMBER },
              estimatedDiyTotal: { type: Type.NUMBER },
              replacementOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    retailer: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    url: { type: Type.STRING }
                  }
                }
              },
              diyParts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partName: { type: Type.STRING },
                    estimatedCost: { type: Type.NUMBER },
                    purchaseOptions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                retailer: { type: Type.STRING },
                                price: { type: Type.NUMBER },
                                title: { type: Type.STRING },
                                url: { type: Type.STRING }
                            }
                        }
                    }
                  }
                }
              }
            }
          },
          diy: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard", "Expert"] },
              estimatedTimeMinutes: { type: Type.NUMBER },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    toolNeeded: { type: Type.STRING }
                  }
                }
              },
              videos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    channel: { type: Type.STRING },
                    url: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No analysis returned");
  return JSON.parse(response.text) as FullAnalysisResult;
};

export const generateInstructionImage = async (description: string): Promise<string> => {
  // Using gemini-2.5-flash-image (Nano Banana equivalent per instructions)
  const model = "gemini-2.5-flash-image";
  
  const prompt = `Create a clean, technical line-drawing or instructional illustration style image showing: ${description}. White background, clear visual guide for repair.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9"
        // responseMimeType is NOT supported for nano banana
      }
    }
  });

  // Iterate to find image part
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Base64 string
      }
    }
  }
  throw new Error("No image generated");
};