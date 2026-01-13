# Zave | Universal Repair Intelligence

**Zave** is an advanced multimodal decision-support agent designed to demystify physical repairs. Built on the cutting-edge **Gemini 3** architecture, Zave helps users navigate the "Fix vs. Replace" dilemma by providing instant diagnostics, real-time market cost comparisons, and interactive hands-free coaching.

---

## 🚀 Quick Start: Launch the App

Since Zave uses native browser ES modules via `importmap`, it requires no complex build steps or `npm install`.

### 1. Prerequisites
*   A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
*   A local development server (like `npx serve`, Live Server for VS Code, or Python's `http.server`).

### 2. Run Locally
1.  Clone this repository or download the source files.
2.  Open your terminal in the project root.
3.  Start a local server:
    ```bash
    # Using Node.js (recommended)
    npx serve .
    
    # Or using Python
    python -m http.server 8000
    ```
4.  Open your browser to the provided local URL (usually `http://localhost:3000` or `http://localhost:8000`).
5.  **Environment Note:** Ensure your environment has the `API_KEY` variable configured, as the application initializes the Google GenAI SDK using `process.env.API_KEY`.

---

## 🛠 How to Use Zave

1.  **Input Data**:
    *   Click the **Camera** area to upload or snap a photo of the damaged item.
    *   In the text field, describe the specific symptom (e.g., "The blender is leaking from the bottom").
2.  **Analysis**:
    *   Click **Start Diagnosis**. Gemini 3 Flash will analyze the image to identify the product and likely failure point.
3.  **Evaluate**:
    *   Review the **Repair vs. Replace** matrix. Zave fetches real-time prices for both paths using Google Search Grounding.
    *   Expand the **Required Parts** list to see direct shopping links for DIY components.
4.  **Execute**:
    *   Browse the **Instructional Storyboard**. If a step is unclear, click **Visualize** to generate a custom technical line-drawing for that specific action.
5.  **Hands-Free Help**:
    *   Launch the **Interactive Coach**. This opens a voice session via the Gemini Live API, allowing you to ask "What's the next step?" or "Where does this screw go?" without touching your screen while working.

---

## 🧠 Gemini 3 & 2.5 Features

*   **Gemini 3 Flash**: The reasoning core for multimodal diagnostics and decision-making.
*   **Google Search Grounding**: Powers the "Cost Clarity" engine by fetching live retail data.
*   **Gemini 2.5 Flash Image**: Dynamically generates technical illustrations for repair steps.
*   **Gemini Live API**: Provides a low-latency, voice-first "AI Mechanic" experience for hands-free guidance.

---