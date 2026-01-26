import { GoogleGenerativeAI } from "@google/generative-ai";
import { AvailabilityEntry } from "../types";

// CRITICAL: Use environment variable, not process.env directly in browser
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeCoverage = async (entries: AvailabilityEntry[]): Promise<string> => {
  if (entries.length === 0) {
    return "No availability data to analyze yet. Workers need to submit their availability first.";
  }

  if (!API_KEY) {
    return "⚠️ Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment variables.";
  }

  try {
    // Group by date for better analysis
    const byDate: Record<string, AvailabilityEntry[]> = {};
    entries.forEach(entry => {
      if (!byDate[entry.date]) byDate[entry.date] = [];
      byDate[entry.date].push(entry);
    });

    const prompt = `You are an expert workforce scheduler. Analyze this worker availability data and provide actionable insights.

**Availability Data:**
${Object.entries(byDate).map(([date, workers]) => {
  const morning = workers.filter(w => w.shiftType === 'morning' || w.shiftType === 'all-day').map(w => w.workerName);
  const evening = workers.filter(w => w.shiftType === 'evening' || w.shiftType === 'all-day').map(w => w.workerName);
  return `${date}: Morning (${morning.length}): ${morning.join(', ') || 'none'} | Evening (${evening.length}): ${evening.join(', ') || 'none'}`;
}).join('\n')}

**Analyze:**
1. Dates with NO coverage (critical gaps)
2. Dates with insufficient coverage (less than 2 workers per shift)
3. Dates with excess coverage (consider redistributing)
4. Morning vs Evening balance issues
5. Specific recommendations for filling gaps

**Format:** Use clear sections with bullet points. Be concise and actionable. Highlight critical issues with ⚠️.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text || "Unable to generate insights. Please try again.";
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error?.message?.includes('API_KEY_INVALID')) {
      return "❌ Invalid Gemini API Key. Please check your configuration.";
    }
    
    if (error?.message?.includes('quota')) {
      return "❌ API quota exceeded. Please try again later or upgrade your Gemini API plan.";
    }
    
    return `❌ Error communicating with AI Assistant: ${error?.message || 'Unknown error'}`;
  }
};