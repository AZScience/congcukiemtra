'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface SystemParameters {
    bannerUrl: string;
    bannerHeight: number;
    googleSheetId: string;
    googleServiceAccountEmail: string;
    googlePrivateKey: string;
    googleDriveFolderId?: string;
    faqSheetTabName: string;
    reportSheetTabName: string;
    adminEmail: string;
    supportPhone: string;
    website: string;
    smtpFromName: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
    aiProvider: string;
    aiApiKey: string;
    aiModel: string;
    aiSystemPrompt: string;
    aiTemperature: number;
    loginImageUrl: string;
    loginQuote: string;
    loginQuoteAuthor: string;
    feedbackSheetId: string;
    feedbackTabName: string;
    evidenceServiceAccountEmail: string;
    evidencePrivateKey: string;
}

const DEFAULT_PARAMS: SystemParameters = {
    bannerUrl: "https://kiemtranoibo.ntt.edu.vn/wp-content/uploads/2025/09/PHONG-KIEM-TRA-NOI-BO.png",
    bannerHeight: 40,
    googleSheetId: "",
    googleServiceAccountEmail: "",
    googlePrivateKey: "",
    googleDriveFolderId: "",
    faqSheetTabName: "Hỏi đáp",
    reportSheetTabName: "Báo cáo Tổng hợp",
    feedbackSheetId: "",
    feedbackTabName: "Trang tính1",
    evidenceServiceAccountEmail: "",
    evidencePrivateKey: "",
    adminEmail: "vinhphuc@ntt.edu.vn",
    supportPhone: "0987654321",
    website: "https://kiemtranoibo.ntt.edu.vn",
    smtpFromName: "Phòng Kiểm tra nội bộ",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    aiProvider: "google",
    aiApiKey: "",
    aiModel: "gemini-1.5-pro",
    aiSystemPrompt: "Bạn là một trợ lý AI chuyên nghiệp hỗ trợ công tác kiểm tra nội bộ tại trường Đại học Nguyễn Tất Thành. Hãy trả lời ngắn gọn, chính xác và chuyên nghiệp.",
    aiTemperature: 0.7,
    loginImageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxzdHVkZW50cyUyMGNvbGxhYm9yYXRpbmd8ZW58MHx8fHwxNzIxOTU4OTg5fDA&ixlib=rb-4.0.3&q=80&w=1080",
    loginQuote: "Công nghệ chỉ là một công cụ. Về mặt khích lệ bọn trẻ làm việc cùng nhau và động viên chúng, giáo viên là người quan trọng nhất.",
    loginQuoteAuthor: "Bill Gates"
};

interface SystemParametersContextType {
    params: SystemParameters;
    updateParams: (newParams: Partial<SystemParameters>) => Promise<void>;
    loading: boolean;
}

const SystemParametersContext = createContext<SystemParametersContextType | undefined>(undefined);

export function SystemParametersProvider({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const [params, setParams] = useState<SystemParameters>(() => {
        // Initial load from localStorage for fast initial render
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('system_parameters');
            if (cached) {
                try {
                    return { ...DEFAULT_PARAMS, ...JSON.parse(cached) };
                } catch (e) {
                    return DEFAULT_PARAMS;
                }
            }
        }
        return DEFAULT_PARAMS;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const docRef = doc(firestore, "system_settings", "parameters");
        
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Partial<SystemParameters>;
                const merged = { ...DEFAULT_PARAMS, ...data };
                setParams(merged);
                // Cache to localStorage for next time
                localStorage.setItem('system_parameters', JSON.stringify(merged));
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching system parameters:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const updateParams = async (newParams: Partial<SystemParameters>) => {
        if (!firestore) return;
        try {
            const docRef = doc(firestore, "system_settings", "parameters");
            // Optimistic update
            const updated = { ...params, ...newParams };
            setParams(updated);
            localStorage.setItem('system_parameters', JSON.stringify(updated));

            await setDoc(docRef, {
                ...newParams,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error updating system parameters:", error);
            throw error;
        }
    };

    return (
        <SystemParametersContext.Provider value={{ params, updateParams, loading }}>
            {children}
        </SystemParametersContext.Provider>
    );
}

export function useSystemParameters() {
    const context = useContext(SystemParametersContext);
    if (context === undefined) {
        throw new Error('useSystemParameters must be used within a SystemParametersProvider');
    }
    return context;
}
