
import { GoogleGenAI, Type } from "@google/genai";

export const anonymizeData = (text: string): string => {
  return text
    .replace(/\b\d{8}[A-Z]\b/g, "[DNI_ANON]")
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[PERSON_NAME_ANON]");
};

/**
 * Generador de Recetas: Crea un plan de medicación profesional.
 */
export const generatePrescription = async (medication: string, patientInfo: any) => {
  // Always create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera una receta médica formal para ${medication}. Paciente: ${JSON.stringify(patientInfo)}`,
    config: {
      systemInstruction: "Eres un facultativo médico. Genera el texto de una receta incluyendo: Posología, Duración y Advertencias. Responde en español.",
    }
  });
  return response.text;
};

export const queryClinicalLayer = async (prompt: string, context: any) => {
  const safePrompt = anonymizeData(prompt);
  // Always create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Eres MediBot, la IA de MediCore.
      Contexto Clínico Actual: ${JSON.stringify(context)}
      Responde SIEMPRE en formato JSON estricto:
      {
        "answer": "Respuesta textual para el doctor",
        "action": "NONE" | "ADD_RECORD" | "UPDATE_ODONTOGRAM",
        "data": { ...datos específicos de la acción... }
      }
      
      Si el usuario pide AÑADIR/REGISTRAR ALGO AL HISTORIAL:
      action: "ADD_RECORD"
      data: { "treatment": "Nombre Tratamiento", "observation": "Detalles", "specialization": "General" }

      Si el usuario pide MARCAR/AÑADIR ALGO AL ODONTOGRAMA:
      action: "UPDATE_ODONTOGRAM"
      data: { "tooth": 18, "status": "CARIES" | "IMPLANT" | "FILLING" | "CROWN" | "EXTRACTED" | "ENDODONTICS" | "HEALTHY" | "BRIDGE" }
      (Usa el número de diente ISO-3950)

      Pregunta: ${safePrompt}
    `,
    config: {
      systemInstruction: "Eres un asistente clínico experto capaz de ejecutar acciones en el CRM. Responde siempre en JSON.",
      responseMimeType: "application/json"
    }
  });
  // Gemini returns the JSON string in response.text
  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { answer: response.text, action: 'NONE' };
  }
};

export const getInventoryProposals = async (stock: any[], appointments: any[]) => {
  // Always create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Stock: ${JSON.stringify(stock)}, Citas: ${JSON.stringify(appointments)}. Calcula necesidades.`,
    config: {
      systemInstruction: "Calcula necesidades de stock basadas en agenda. Responde en JSON con formato {alerts: [{item, needed, action, urgency}]}.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text.trim());
};
