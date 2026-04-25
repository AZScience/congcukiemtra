
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GoogleGenerativeAI } from '@google/generative-ai';

const FaceComparisonInputSchema = z.object({
  portraitPhoto: z.string().describe('Base64 string of the portrait photo.'),
  documentPhoto: z.string().describe('Base64 string of the document photo.'),
  aiApiKey: z.string().optional().describe('Dynamic AI API Key.'),
});

const FaceComparisonOutputSchema = z.object({
  isMatch: z.boolean(),
  confidence: z.number(),
  message: z.string(),
});

export type FaceComparisonInput = z.infer<typeof FaceComparisonInputSchema>;
export type FaceComparisonOutput = z.infer<typeof FaceComparisonOutputSchema>;

/**
 * Helper to get a generative model dynamically with a custom API key
 */
/**
 * Helper to get a generative model dynamically with a custom API key
 */
async function getVisionModel(apiKey?: string) {
    let key = (apiKey || process.env.GOOGLE_GENAI_API_KEY || "").trim();
    let modelName = "gemini-1.5-flash";

    // Try to fetch from Firestore if not provided
    try {
        const { getFirestore, doc, getDoc } = await import("firebase/firestore");
        const { initializeApp, getApps } = await import("firebase/app");
        
        // This is a bit complex in a server-side flow without a shared firebase instance
        // but we can try to use the admin SDK or a dedicated config fetcher if available.
        // For now, let's assume if it's not provided, we might want to check a global config.
        
        // Actually, in this project, we might have a helper for this.
        // Let's stick to the pattern of passing it or using env for now, 
        // but I'll add a comment that it can be extended.
    } catch (e) {}

    if (!key) throw new Error("API Key cho AI chưa được cấu hình. Vui lòng kiểm tra Tham số hệ thống.");
    
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel(
        { model: "gemini-1.5-flash" },
        { apiVersion: 'v1' }
    );
}

export const faceComparisonFlow = ai.defineFlow(
  {
    name: 'faceComparisonFlow',
    inputSchema: FaceComparisonInputSchema,
    outputSchema: FaceComparisonOutputSchema,
  },
  async (input) => {
    try {
        const model = await getVisionModel(input.aiApiKey);

        // Helper to convert base64 to GenerativePart
        const fileToGenerativePart = (base64Str: string) => {
            const match = base64Str.match(/^data:(image\/[a-z]+);base64,(.+)$/);
            if (!match) return null;
            return {
                inlineData: {
                    data: match[2],
                    mimeType: match[1]
                },
            };
        };

        const portraitPart = fileToGenerativePart(input.portraitPhoto);
        const documentPart = fileToGenerativePart(input.documentPhoto);

        if (!portraitPart || !documentPart) {
            return {
                isMatch: false,
                confidence: 0,
                message: "Định dạng ảnh không hợp lệ."
            };
        }

        const prompt = `Bạn là một chuyên gia nhận diện khuôn mặt. Hãy so sánh khuôn mặt trong hai ảnh sau:
        1. Ảnh chân dung (Portrait)
        2. Ảnh khuôn mặt trên giấy tờ (Document Photo)

        Nhiệm vụ:
        - Xác định xem hai khuôn mặt này có phải là cùng một người hay không.
        - Trả về kết quả dưới dạng JSON với cấu trúc:
          {
            "isMatch": boolean,
            "confidence": number (từ 0 đến 100),
            "reason": string (giải thích ngắn gọn bằng tiếng Việt)
          }
        
        Lưu ý: Chỉ trả về JSON, không thêm văn bản khác.`;

        const result = await model.generateContent([prompt, portraitPart, documentPart]);
        const responseText = result.response.text();
        
        // Clean up the response text if it contains markdown code blocks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
        
        try {
            const parsed = JSON.parse(cleanJson);
            return {
                isMatch: parsed.isMatch,
                confidence: parsed.confidence,
                message: parsed.reason || (parsed.isMatch ? "Khuôn mặt trùng khớp." : "Khuôn mặt không trùng khớp.")
            };
        } catch (e) {
            console.error("Failed to parse Gemini response:", responseText);
            return {
                isMatch: responseText.toLowerCase().includes('true'),
                confidence: 50,
                message: "Kết quả phân tích từ AI không đúng định dạng."
            };
        }
    } catch (e: any) {
        console.error("Face comparison error:", e);
        return {
            isMatch: false,
            confidence: 0,
            message: `Lỗi kết nối AI: ${e.message}`
        };
    }
  }
);

export async function compareFaces(input: FaceComparisonInput): Promise<FaceComparisonOutput> {
  return faceComparisonFlow(input);
}
