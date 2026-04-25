// Configuration
const API_BASE = "http://localhost:3000/api/v1";

// 1. LẮNG NGHE YÊU CẦU TỪ POPUP/CONTENT SCRIPT
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // A. Khởi tạo phiên dạy (Gán Tab ID chuẩn từ Sender)
    if (request.action === "start_session") {
        const sessionData = {
            ...request.data,
            tabId: sender.tab?.id
        };
        chrome.storage.local.set({ 'active_session': sessionData }, () => {
            console.log("Session tracked for tab:", sessionData.tabId);
        });
        sendResponse({ success: true });
        return true;
    }

    // B. Gọi API (Bypass Mixed Content)
    if (request.action === "fetch_api") {
        fetch(request.url, {
            method: request.method || 'GET',
            headers: request.headers || {},
            body: request.body ? JSON.stringify(request.body) : null
        })
        .then(async response => {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return response.json();
            } else {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
            }
        })
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // C. Chụp màn hình minh chứng
    if (request.action === "capture_screen") {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, dataUrl: dataUrl });
            }
        });
        return true;
    }

    // D. Heartbeat - Cập nhật dữ liệu tự động định kỳ
    if (request.action === "heartbeat_sync") {
        chrome.storage.local.get(['active_session'], (result) => {
            if (result.active_session) {
                const session = result.active_session;
                const now = new Date();
                const logs = session.participant_logs || {};
                
                // 1. Cập nhật log chi tiết từng người (First Seen, Last Seen)
                if (request.attendanceList && Array.isArray(request.attendanceList)) {
                    request.attendanceList.forEach(name => {
                        if (!logs[name]) {
                            logs[name] = { 
                                firstSeen: now.toLocaleTimeString('vi-VN'), 
                                firstSeenFull: now.toISOString(),
                                lastSeen: now.toISOString() 
                            };
                        } else {
                            logs[name].lastSeen = now.toISOString();
                        }
                    });
                }

                // 2. Tính toán Duration & Percentage cho từng người
                const startTime = new Date(session.startTime);
                const totalMeetingDurationMs = now - startTime;
                
                const attendanceDetails = Object.keys(logs).map((name, index) => {
                    const firstSeen = new Date(logs[name].firstSeenFull);
                    const lastSeen = new Date(logs[name].lastSeen);
                    const attendedMs = lastSeen - firstSeen;
                    
                    // Format duration: "X min Y s"
                    const minutes = Math.floor(attendedMs / 60000);
                    const seconds = Math.floor((attendedMs % 60000) / 1000);
                    const durationStr = `${minutes} min ${seconds}s`;
                    
                    // Calculate percentage
                    const percentage = totalMeetingDurationMs > 0 
                        ? Math.min(100, Math.round((attendedMs / totalMeetingDurationMs) * 100)) 
                        : 0;

                    return {
                        sNo: index + 1,
                        name: name,
                        firstSeenAt: logs[name].firstSeen,
                        attendedDuration: durationStr,
                        attendedPercentage: `${percentage}%`
                    };
                });

                const updatedSession = {
                    ...session,
                    last_count: request.count,
                    last_url: request.url,
                    last_host: request.host,
                    attendance_list: request.attendanceList,
                    attendance_details: attendanceDetails,
                    participant_logs: logs,
                    last_update: now.toISOString()
                };

                chrome.storage.local.set({ 'active_session': updatedSession }, () => {
                    syncHeartbeatToServer(updatedSession);
                });
            }
        });
        return true;
    }
});

// HÀM GỬI HEARTBEAT VỀ SERVER
async function syncHeartbeatToServer(session) {
    const scheduleId = session.class_id || session.currentClass?.id;
    if (!scheduleId) return;

    try {
        await fetch(`${API_BASE}/schedules/${scheduleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actualStudentCount: String(session.last_count || "0"),
                lastSeenAt: new Date().toISOString(),
                meetingLink: session.last_url,
                hostName: session.last_host,
                attendanceList: session.attendance_list,
                attendanceDetails: session.attendance_details, // Gửi dữ liệu chi tiết cấu trúc bảng
                status: 'teaching'
            }),
            keepalive: true
        });
        console.log("Heartbeat synced for:", scheduleId);
    } catch (e) {
        console.error("Heartbeat sync failed:", e);
    }
}

// 2. THEO DÕI SỰ KIỆN KẾT THÚC (ĐÓNG TAB / RELOAD)
chrome.tabs.onRemoved.addListener((tabId) => {
    handleAutoEnd(tabId, "Tab Closed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        handleAutoEnd(tabId, "Page Reload/Navigate");
    }
});

chrome.runtime.onSuspend.addListener(() => {
    chrome.storage.local.get(['active_session'], (result) => {
        if (result.active_session) {
            autoEndSession(result.active_session);
            chrome.storage.local.remove('active_session');
        }
    });
});

// 3. HÀM XỬ LÝ KẾT THÚC TỰ ĐỘNG
function handleAutoEnd(tabId, reason) {
    chrome.storage.local.get(['active_session'], (result) => {
        const session = result.active_session;
        if (session && session.tabId === tabId) {
            // KHÔNG gửi tự động nếu phiên đã được kết thúc chủ động bởi người dùng trong Popup
            if (session.is_finished) {
                console.log("Session already finished manually. Skipping auto-end.");
                chrome.storage.local.remove('active_session');
                return;
            }
            
            console.log(`Auto-ending session (${reason})`);
            // XÓA NGAY LẬP TỨC để tránh trùng lặp khi trang tải lại
            chrome.storage.local.remove('active_session', () => {
                autoEndSession(session);
            });
        }
    });
}

async function autoEndSession(session) {
    const endTime = new Date();
    const reportData = {
        Class: String(session.currentClass?.Class || session.currentClass?.class || "N/A"),
        Course: String(session.currentClass?.Course || session.currentClass?.content || session.currentClass?.Subject || session.currentClass?.course || "N/A"),
        Lecturer: String(session.currentClass?.Lecturer || session.currentClass?.lecturer || "N/A"),
        Period: String(session.currentClass?.Period || session.currentClass?.period || "N/A"),
        Room: String(session.currentClass?.Room || session.currentClass?.room || "Trực tuyến"),
        Building: String(session.currentClass?.Building || session.currentClass?.building || "N/A"),
        totalStudents: String(session.currentClass?.studentCount || session.currentClass?.TotalStudents || 0),
        Date: String(session.currentClass?.Date || session.currentClass?.date || new Date().toLocaleDateString('vi-VN')),
        startTime: session.startTime,
        endTime: endTime.toISOString(),
        studentCount: String(session.last_count || "0"),
        actualStudentCount: String(session.last_count || "0"),

        meetingLink: String(session.last_url || ""),
        attendanceDetails: session.attendance_details, 
        status: 'completed',
        type: 'online',
        is_auto_ended: true 
    };

    try {
        await fetch(`${API_BASE}/online-checkins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData),
            keepalive: true
        });

        const scheduleId = session.class_id || session.currentClass?.id || session.currentClass?._id;
        
        if (scheduleId && scheduleId !== "undefined") {
            await fetch(`${API_BASE}/schedules/${scheduleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'completed',
                    endTime: endTime.toISOString(),
                    studentCount: String(session.last_count || "0"),
                    meetingLink: String(session.last_url || "")
                }),
                keepalive: true
            });
        }
    } catch (e) {
        console.error("Auto-end failed:", e);
    }
}

// 4. KÍCH HOẠT SIDEBAR KHI NHẤN VÀO ICON EXTENSION
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("meet.google.com") || tab.url.includes("zoom.us")) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" }, () => {
            if (chrome.runtime.lastError) {
                console.log("Content script chưa sẵn sàng hoặc trang chưa reload.");
            }
        });
    }
});
