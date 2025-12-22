import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RouteCalculation, UserSettings, AdvisorResponse } from "@/types";

export const analyzeRoute = async (
  route: RouteCalculation,
  userSettings: UserSettings,
  currentYield: number
): Promise<AdvisorResponse> => {
  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  });

  const prompt = `
    Analyze this DeFi capital rotation opportunity.

    User Profile:
    - Capital: $${userSettings.capital.toLocaleString()}
    - Current Chain: ${userSettings.currentChain}
    - Current Yield: ${currentYield.toFixed(2)}%
    - Risk Tolerance (1-5, 5 is high): ${userSettings.riskTolerance}

    Proposed Move:
    - Target: ${route.targetPool.project} on ${route.targetPool.chain}
    - Target APY: ${route.targetPool.apy.toFixed(2)}%
    - Total Cost to Move (Gas + Bridge): $${route.totalCost.toFixed(2)}
    - Breakeven Time: ${route.breakevenHours.toFixed(1)} hours
    - 30-Day Net Profit Projection: $${route.netProfit30d.toFixed(2)}

    Provide a JSON response with:
    1. A short, punchy analysis (2 sentences max).
    2. A risk score (1-100) based on the chain security and project reputation (assume major protocols like Aave/Compound are safer).
    3. A recommendation: "STRONG BUY", "HOLD", or "CAUTION".
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      riskScore: { type: Type.INTEGER },
      recommendation: { type: Type.STRING, enum: ['STRONG BUY', 'HOLD', 'CAUTION'] }
    },
    required: ['analysis', 'riskScore', 'recommendation']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AdvisorResponse;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      analysis: "Unable to generate AI analysis. Please verify your API Key.",
      riskScore: 50,
      recommendation: "HOLD"
    };
  }
};
