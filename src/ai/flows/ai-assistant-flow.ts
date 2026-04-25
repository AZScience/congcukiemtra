import { GoogleGenerativeAI } from "@google/generative-ai";
import { ai } from "@/ai/genkit";
import { z } from "zod";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { createPrivateKey } from 'crypto';

export const AiAssistantInputSchema = z.object({
    question: z.string(),
    sheetId: z.string().optional(),
    sheetTabName: z.string().optional(),
    serviceAccountEmail: z.string().optional(),
    privateKey: z.string().optional(),
    aiApiKey: z.string().optional(),
    aiModel: z.string().optional(),
    aiSystemPrompt: z.string().optional(),
    searchMode: z.string().optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() }))
    })).optional()
});

export type AiAssistantInput = z.infer<typeof AiAssistantInputSchema>;
export type AiAssistantOutput = string;

/**
 * Helper to get a generative model dynamically with a custom API key
 */
function getDynamicModel(apiKey?: string, modelName?: string, apiVersion: 'v1' | 'v1beta' = 'v1beta', systemInstruction?: string) {
    const key = (apiKey || process.env.GOOGLE_GENAI_API_KEY || "").trim();
    if (!key) throw new Error("API Key cho AI chưa được cấu hình.");

    const genAI = new GoogleGenerativeAI(key);

    let name = (modelName || "gemini-2.0-flash").trim();
    name = name.replace(/^models\//, "");

    return genAI.getGenerativeModel(
        { model: name, systemInstruction },
        { apiVersion }
    );
}

function normalizePrivateKey(raw: string): string {
    const pem = raw.replace(/\\n/g, '\n');
    try {
        // Convert to PKCS#8 for OpenSSL 3 compatibility (Node.js 18+)
        return createPrivateKey(pem).export({ type: 'pkcs8', format: 'pem' }) as string;
    } catch {
        return pem;
    }
}

async function searchGoogleSheet(
    input: AiAssistantInput
): Promise<string> {
    const { sheetId, question, serviceAccountEmail, privateKey, sheetTabName } = input;

    if (!sheetId || !serviceAccountEmail || !privateKey) return "";

    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccountEmail,
            key: normalizePrivateKey(privateKey),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = sheetTabName ? doc.sheetsByTitle[sheetTabName] : doc.sheetsByIndex[0];
        if (!sheet) return "";

        const rows = await sheet.getRows();
        if (rows.length === 0) return "";

        // Basic search logic
        const queryLower = question.toLowerCase();
        const results = rows.filter(row => {
            const values = row.toObject();
            return Object.values(values).some(val => String(val).toLowerCase().includes(queryLower));
        });

        if (results.length > 0) {
            // Limit to top 5 results for context
            const snippet = results.slice(0, 5).map(r => {
                const obj = r.toObject();
                return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' | ');
            }).join('\n---\n');
            return `Tìm thấy thông tin liên quan từ dữ liệu hệ thống:\n${snippet}`;
        }
        return "";
    } catch (e: any) {
        console.error("Sheet Search Error:", e);
        return "";
    }
}

/**
 * AI Assistant Flow - Handles multi-model fallback and data context integration
 */
export const assistantFlow = ai.defineFlow(
    {
        name: "assistantFlow",
        inputSchema: AiAssistantInputSchema,
        outputSchema: z.string(),
    },
    async (input: AiAssistantInput) => {
        try {
            // 1. Fetch context if needed
            let contextFromSheet = "";
            if (input.sheetId && input.serviceAccountEmail && input.privateKey) {
                contextFromSheet = await searchGoogleSheet(input);
            }

            const systemPrompt = input.aiSystemPrompt || "Bạn là Trợ lý ảo thông minh. Hãy trả lời câu hỏi của người dùng một cách lịch sự và chuyên nghiệp.";
            const history = (input.history || []).map(h => ({
                role: h.role,
                parts: h.parts.map(p => ({ text: p.text }))
            }));

            let finalQuestion = input.question;
            if (contextFromSheet) {
                finalQuestion = `Dưới đây là thông tin tra cứu được từ hệ thống:\n${contextFromSheet}\n\nDựa trên thông tin này, hãy trả lời câu hỏi: ${input.question}`;
            }

            const messageParts = [{ text: finalQuestion }];

            // 2. Retry logic across different models and versions to prevent 404/403/429
            const requestedModel = (input.aiModel || "gemini-2.0-flash").trim().replace(/^models\//, "");
            // Priority order: requested -> 2.0-flash -> 1.5-flash (more stable quota) -> 2.0-flash-lite
            const fallbackModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
            const modelQueue = Array.from(new Set([requestedModel, ...fallbackModels]));
            const modelsToTry = modelQueue.map(name => ({ name, version: 'v1beta' as const }));

            let lastError = "";
            let isQuotaExceeded = false;

            for (const config of modelsToTry) {
                try {
                    const model = getDynamicModel(input.aiApiKey, config.name, config.version, systemPrompt);
                    const chat = model.startChat({
                        history: history,
                        generationConfig: {
                            maxOutputTokens: 2048,
                            temperature: 0.7
                        },
                    });

                    const result = await chat.sendMessage(messageParts);
                    return result.response.text();
                } catch (e: any) {
                    console.warn(`Thử model ${config.name} (${config.version}) thất bại:`, e.message);
                    lastError = e.message;

                    if (e.message.includes("429") || e.message.includes("quota")) {
                        isQuotaExceeded = true;
                    }

                    if (e.message.includes("API_KEY_INVALID") || e.message.includes("identity")) break;
                    continue;
                }
            }

            if (isQuotaExceeded) {
                throw new Error("Hết hạn mức (Quota exceeded). Vui lòng thử lại sau 1 phút hoặc đổi sang Model khác (ví dụ: gemini-1.5-flash) trong Cài đặt.");
            }

            throw new Error(lastError || "Tất cả các model đều không phản hồi.");

        } catch (e: any) {
            console.error("AI Assistant Error:", e);
            return `Lỗi kết nối AI: ${e.message}. Vui lòng kiểm tra lại API Key và cấu hình trong mục Cài đặt (Tham số hệ thống > AI).`;
        }
    }
);

export async function askAiAssistant(input: AiAssistantInput): Promise<AiAssistantOutput> {
    return assistantFlow(input);
}
