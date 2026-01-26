
import { GoogleGenAI } from "@google/genai";
import { AvailabilityEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCoverage = async (entries: AvailabilityEntry[]) => {
  if (entries.length === 0) return "No availability data to analyze yet.";

  try {
    const prompt = `
      You are an expert workforce manager. Analyze the following worker availability data for the month.
      Data: ${JSON.stringify(entries)}
      
      Identify:
      1. Dates with zero coverage.
      2. Dates with heavy coverage (too many workers).
      3. Imbalance between morning and evening shifts.
      4. Recommendations for filling gaps.
      
      Keep the tone professional and helpful. Use markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error communicating with AI Assistant.";
  }
};
