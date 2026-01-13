# Zave

**Universal Repair Intelligence**

Zave is a multimodal decision-support agent that helps users decide whether to fix a broken item or buy a new one. It identifies objects from photos, diagnoses issues, finds real-time pricing for parts and replacements, and provides interactive, hands-free repair coaching.

## Gemini 3 Integration

Zave leverages the multimodal and real-time capabilities of the Gemini 3 and 2.5 models to transform how users approach repairs. Central to the experience is **Gemini 3 Flash**, which powers the initial diagnostic engine. By processing visual data (images of broken items) alongside text descriptions, it identifies products, diagnoses faults, and acts as a reasoning agent to weigh the cost of repair versus replacement. This decision-support system is grounded in real-world data using **Google Search Grounding**, ensuring users get up-to-date pricing for parts and new products. Furthermore, the application bridges the gap between diagnosis and action using **Gemini 2.5 Flash Image** to generate technical illustrations for repair steps on demand. Finally, **Gemini Live API** creates an immersive, hands-free "AI Mechanic" that guides users through the physical repair process via voice, making expert knowledge accessible while their hands are busy with tools.

## Implementation Details

### 1. Multimodal Diagnosis & Decision Engine
*   **Model:** `gemini-3-flash-preview`
*   **How it works:** The app captures an image of a broken item and combines it with a user's text description. A `generateContent` call is made with both the image (base64) and a complex prompt requesting a structured JSON output. The model analyzes the visual evidence to identify the product model, diagnose the likely failure point, and generate a step-by-step repair guide.

### 2. Real-Time Market Data via Search Grounding
*   **Feature:** Google Search Tool
*   **How it works:** To provide an accurate cost analysis, the Gemini 3 Flash model is configured with the `{ googleSearch: {} }` tool. The model autonomously queries Google Search during the generation process to retrieve current retailers, prices, and direct purchase URLs for both the replacement parts (DIY path) and brand-new units (Replace path). This ensures the "Cost vs. Benefit" analysis is based on live market data.

### 3. On-Demand Visual Guides
*   **Model:** `gemini-2.5-flash-image`
*   **How it works:** Text instructions can sometimes be ambiguous. When a user clicks "Visualize" on a repair step, the app sends the specific step description to the image generation model. It is prompted to create a "clean, technical line-drawing" style illustration, providing an instant visual reference for that specific action.

### 4. Hands-Free AI Coach (Live API)
*   **Model:** `gemini-2.5-flash-native-audio-preview-12-2025`
*   **How it works:** Repairs require both hands, making text-based chat difficult. Zave establishes a WebSocket connection to the Live API. It streams raw PCM audio from the user's microphone to the model and receives low-latency audio responses. This enables a natural, interruptible conversation where the AI acts as a side-by-side mechanic, answering questions like "What does that look like?" or "I'm done, what's next?" without the user ever touching the screen.
