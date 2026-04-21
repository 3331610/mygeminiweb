import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface ParsedEntry {
  name: string;
  value: number;
}

export interface ParsedData {
  date: string;
  entries: ParsedEntry[];
}

export async function parseSolitaireText(text: string): Promise<ParsedData | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following "Daily Solitaire" (接龙) text into structured data. 
Extact the date (format: YYYY-MM-DD or MM-DD, default to current year if only month/day provided) and each person's contributed number.
Text:
"""
${text}
"""`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: "The date found in the text, formatted as YYYY-MM-DD.",
            },
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "User's name.",
                  },
                  value: {
                    type: Type.NUMBER,
                    description: "The numeric value associated with the user.",
                  },
                },
                required: ["name", "value"],
              },
            },
          },
          required: ["date", "entries"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.date || !Array.isArray(result.entries)) return null;
    return result as ParsedData;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
}
