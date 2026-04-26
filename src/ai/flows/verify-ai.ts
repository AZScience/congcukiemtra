"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Verifies the AI connection by attempting to generate a simple response.
 */
export async function verifyAIConnection(apiKey: string, model: string): Promise<{ success: boolean; message: string }> {
    try {
        const key = (apiKey || "").trim();
        if (!key) throw new Error("API Key cho AI chưa được cấu hình.");

        const genAI = new GoogleGenerativeAI(key);
        
        const requestedModel = (model || "gemini-1.5-flash").trim().replace(/^models\//, "");
        const fallbackModels = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"];
        const modelQueue = Array.from(new Set([requestedModel, ...fallbackModels]));

        let lastError = "";
        for (const name of modelQueue) {
            try {
                const generativeModel = genAI.getGenerativeModel({ model: name });
                const result = await generativeModel.generateContent("Say 'OK' if you can hear me.");
                const text = result.response.text();
                
                if (text) {
                    const successMsg = name === requestedModel 
                        ? "Kết nối AI thành công!" 
                        : `Kết nối thành công (sử dụng fallback: ${name}).`;
                    return { success: true, message: successMsg };
                }
            } catch (e: any) {
                console.warn(`Verify model ${name} failed:`, e.message);
                lastError = e.message;
                if (e.message.includes("API_KEY_INVALID")) break;
                continue;
            }
        }

        let msg = lastError;
        if (msg.includes("429") || msg.includes("quota")) {
            msg = "Hết hạn mức (Quota exceeded). Vui lòng thử lại sau 1 phút hoặc đổi sang API Key khác.";
        } else if (msg.includes("payment") || msg.includes("funds") || msg.includes("OR_FGVEM_40")) {
            msg = "Lỗi thanh toán/hết số dư (OR_FGVEM_40). Vui lòng kiểm tra Billing trên Google Cloud.";
        }
        return { success: false, message: `Lỗi kết nối: ${msg}` };
    } catch (e: any) {
        console.error("AI Verification Error:", e);
        let msg = e.message;
        if (msg.includes("429") || msg.includes("quota")) {
            msg = "Hết hạn mức (Quota exceeded). Vui lòng thử lại sau 1 phút hoặc đổi sang model gemini-1.5-flash.";
        } else if (msg.includes("payment") || msg.includes("funds") || msg.includes("OR_FGVEM_40")) {
            msg = "Lỗi thanh toán Google Cloud (OR_FGVEM_40).";
        }
        return { success: false, message: `Lỗi kết nối: ${msg}` };
    }
}
