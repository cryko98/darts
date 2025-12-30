
import { GoogleGenAI, Type } from "@google/genai";

// Ensure typescript knows about process.env
declare const process: { env: { API_KEY: string } };

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getCheckoutAdvice(remainingScore: number): Promise<string> {
  if (remainingScore > 170) return "Dobj triplákat (T20), hogy csökkentsd a pontszámod!";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Adj tanácsot egy darts játékosnak. A hátralévő pontszám: ${remainingScore}. 
      Írd le röviden magyarul, milyen kombinációval érdemes kiszállni (pl. T20, T20, D25). 
      Ha nincs kiszálló ezen a ponton, javasolj 'beállítást'. Legyél rövid és lényegretörő.`,
      config: {
        systemInstruction: "Te egy profi darts edző vagy. Adj rövid, magyar nyelvű tanácsokat kiszállókhoz.",
      },
    });
    return response.text || "Dobj pontosan!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Koncentrálj a tripla 20-asra!";
  }
}

export async function analyzeDartboardImage(base64Image: string): Promise<{ score: number, label: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Analyze this image of a dartboard. Identify the most recently thrown dart or the dart that is clearly indicated. Determine which segment it hit (e.g., Single 20, Triple 20, Double 10, Outer Bull, Inner Bull, or Miss). Calculate the score. Return ONLY a JSON object with this format: { \"score\": number, \"label\": string }. Example: { \"score\": 60, \"label\": \"T20\" }. If no dart is clearly visible or you are unsure, return null."
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    
    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Vision Error:", error);
    return null;
  }
}
