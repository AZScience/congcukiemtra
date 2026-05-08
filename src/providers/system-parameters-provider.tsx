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
    evidenceGoogleDriveFolderId?: string;
}

const DEFAULT_PARAMS: SystemParameters = {
    bannerUrl: "https://kiemtranoibo.ntt.edu.vn/wp-content/uploads/2025/09/PHONG-KIEM-TRA-NOI-BO.png",
    bannerHeight: 40,
    googleSheetId: "",
    googleServiceAccountEmail: "congcukiemtranoibo@kiemtranoibo-ccks.iam.gserviceaccount.com",
    googlePrivateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoSjBhqdUhqLjW\njnN8SDzi1IdK5ljBFH70Va0JkOzFzxKAXXvlsUak8csPC691Heoi2eqNVtJlwFTy\nAGnVy/ptDv/V1guZCKSmimYCemvd+o3dZXJTav6YA3ZAAXmAb9Yf0JXuw61EPSCJ\numCdCgDefCytWXbXxeotuoAQMCFrsbF2CEt2SBdUON8fhhSuP1zx0uZudOb1kIDT\nqDiwbqUeAq7EaCCINBrX11MleU7o0gMN3BINimfGwHRLBdpMJRcI7kwdcnr4Z8cX\nb3cKhG2B+6GPLtc54hYTBeVejrbeVlo303zi5e7JzuASwuZ8EEPs0IwYU2HXuCk0\nCoXqLljDAgMBAAECggEAGOItqaCkVL06w70x0Nv6LcBfl93yHwjfirQM28v7GTuT\n+01IYvQpIa1HN97kFlM0jDQ05Jwq4LyIPP5fWAhIVNt4+4K47lVXMgH8aIKNwJNB\nFDj0VMxO5qDkT3n49pHEadcR4Kh0jK1RqX9eLyRtsGez74P4b6fjbK+gXVuSkPMd\nUxLGfj57z0d6fnKQkEXIpU2ybw94p26pnzgrIHlDv0bI9oAxPSidnpxxs6QuOL15\nxm+SxzK182XSJj1hi1VuefHEw3wgeuMhY95GM24WXa6KJJqGEKraOV37PSATc0FP\nQtbUmT/RFgb9niVm5jk9vWZDNlmF1jiOPxMp0rstnQKBgQD4GsDSzH0l9gTmRl/K\np587jyj8oOP8+ok/YlR+Up6Kb/zFWvkQJVyg4ieFdgl4N2kr118R/9NbcvE53Cc9\nm1T0bu1WJV73Q1UqSd6TJZLFrUgTuZ2uhtj2/fiXaApX8MkjDh/zAhfRIrBr3V4v\nT/2zjhNOcSgUumRPf47HkrLc1wKBgQDvrpjk+xLCC6egwJtSb9mMBedGTezQts9H\nyrWkItXW303LBsE/HvfUIOUfID6ZIBc7dRXaKCuoGbF0Ai+ESbp2v42rlxWTdaNw\noEoExyj62d1Upwg1un7jTwXz+4mnylqQxPI5O9LvZzGTCNCO2x2rM/KoTtfdA2xf\nwzM8wBAZ9QKBgQDahtXn1e01DmhqWvnsiY+a6hFz0lJ9dD6G8ZjyWtsBnHnLasGN\nExtvKUMeLkVQ+Z1M3DoEpIwJNEh8agi2HqbJVRr+kZP/vfK5eK7udF2+d03Q8eCM\n5IEdq7zVvvG9W3wNwFcrt2A6+I7jsutOSOpwyGcA5HIlL7dCvluINRINqQKBgCa7\nwYuno4VmWsWYusEcwDxnq9Npvm6QTHkeojIPSx15Ytn/knU/7O8EDeL01Ajs7bQ3\ HLvvp/Z3iHzl6YXoYFDWbe+f7+WvqiUGUk/pW48GbEVE5QfBxsW3PJAMQ1exVOd2\nXGqxZ0o3FATd9M5RTL8hGwLmEu5tojLrmbkklLWNAoGAQmKFZXXHeil1/p724GH0\nUXBv7IgoPInGGTvPqs6uZkin4afkwfMTWrnxiZ+T6dc8SR3FmBswcDKJ404Hil97\npqNcVFQrU75qIvjC3fzTILzZ0gF/O1zsmPodaByQ7vyva1JLz9w3SbcshY8P5RqX\ 2ZCDC/GeADLyKazkOFpjmh4=\n-----END PRIVATE KEY-----\n",
    googleDriveFolderId: "",
    faqSheetTabName: "Hỏi đáp",
    reportSheetTabName: "Báo cáo Tổng hợp",
    feedbackSheetId: "",
    feedbackTabName: "Trang tính1",
    evidenceServiceAccountEmail: "congcukiemtranoibo@kiemtranoibo-ccks.iam.gserviceaccount.com",
    evidencePrivateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoSjBhqdUhqLjW\njnN8SDzi1IdK5ljBFH70Va0JkOzFzxKAXXvlsUak8csPC691Heoi2eqNVtJlwFTy\nAGnVy/ptDv/V1guZCKSmimYCemvd+o3dZXJTav6YA3ZAAXmAb9Yf0JXuw61EPSCJ\numCdCgDefCytWXbXxeotuoAQMCFrsbF2CEt2SBdUON8fhhSuP1zx0uZudOb1kIDT\nqDiwbqUeAq7EaCCINBrX11MleU7o0gMN3BINimfGwHRLBdpMJRcI7kwdcnr4Z8cX\nb3cKhG2B+6GPLtc54hYTBeVejrbeVlo303zi5e7JzuASwuZ8EEPs0IwYU2HXuCk0\nCoXqLljDAgMBAAECggEAGOItqaCkVL06w70x0Nv6LcBfl93yHwjfirQM28v7GTuT\n+01IYvQpIa1HN97kFlM0jDQ05Jwq4LyIPP5fWAhIVNt4+4K47lVXMgH8aIKNwJNB\nFDj0VMxO5qDkT3n49pHEadcR4Kh0jK1RqX9eLyRtsGez74P4b6fjbK+gXVuSkPMd\nUxLGfj57z0d6fnKQkEXIpU2ybw94p26pnzgrIHlDv0bI9oAxPSidnpxxs6QuOL15\nxm+SxzK182XSJj1hi1VuefHEw3wgeuMhY95GM24WXa6KJJqGEKraOV37PSATc0FP\nQtbUmT/RFgb9niVm5jk9vWZDNlmF1jiOPxMp0rstnQKBgQD4GsDSzH0l9gTmRl/K\np587jyj8oOP8+ok/YlR+Up6Kb/zFWvkQJVyg4ieFdgl4N2kr118R/9NbcvE53Cc9\nm1T0bu1WJV73Q1UqSd6TJZLFrUgTuZ2uhtj2/fiXaApX8MkjDh/zAhfRIrBr3V4v\nT/2zjhNOcSgUumRPf47HkrLc1wKBgQDvrpjk+xLCC6egwJtSb9mMBedGTezQts9H\nyrWkItXW303LBsE/HvfUIOUfID6ZIBc7dRXaKCuoGbF0Ai+ESbp2v42rlxWTdaNw\noEoExyj62d1Upwg1un7jTwXz+4mnylqQxPI5O9LvZzGTCNCO2x2rM/KoTtfdA2xf\nwzM8wBAZ9QKBgQDahtXn1e01DmhqWvnsiY+a6hFz0lJ9dD6G8ZjyWtsBnHnLasGN\nExtvKUMeLkVQ+Z1M3DoEpIwJNEh8agi2HqbJVRr+kZP/vfK5eK7udF2+d03Q8eCM\n5IEdq7zVvvG9W3wNwFcrt2A6+I7jsutOSOpwyGcA5HIlL7dCvluINRINqQKBgCa7\nwYuno4VmWsWYusEcwDxnq9Npvm6QTHkeojIPSx15Ytn/knU/7O8EDeL01Ajs7bQ3\ HLvvp/Z3iHzl6YXoYFDWbe+f7+WvqiUGUk/pW48GbEVE5QfBxsW3PJAMQ1exVOd2\nXGqxZ0o3FATd9M5RTL8hGwLmEu5tojLrmbkklLWNAoGAQmKFZXXHeil1/p724GH0\nUXBv7IgoPInGGTvPqs6uZkin4afkwfMTWrnxiZ+T6dc8SR3FmBswcDKJ404Hil97\npqNcVFQrU75qIvjC3fzTILzZ0gF/O1zsmPodaByQ7vyva1JLz9w3SbcshY8P5RqX\ 2ZCDC/GeADLyKazkOFpjmh4=\n-----END PRIVATE KEY-----\n",
    evidenceGoogleDriveFolderId: "",
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
