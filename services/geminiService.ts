
import { GoogleGenAI, Type } from "@google/genai";

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
