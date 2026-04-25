// =====================================================
// ONLINE MONITOR - CONTENT SCRIPT (V4.9 - IDENTITY CHECK)
// =====================================================

console.log("%c >>> NTTU MONITOR BOOTLOADER V4.9 <<< ", "background: #e11d48; color: white; font-size: 14px; font-weight: bold; padding: 4px; border-radius: 4px;");

let interactionScores = {}; 
let activeSpeakers = new Set();
let contextAlive = true;

function safeSendMessage(msg) {
    if (!contextAlive) return;
    try {
        if (chrome.runtime?.id) {
            chrome.runtime.sendMessage(msg, (res) => {
                if (chrome.runtime.lastError) contextAlive = false;
            });
        } else contextAlive = false;
    } catch (e) { contextAlive = false; }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_sidebar") { toggleSidebar(); sendResponse({ success: true }); }
    else if (request.action === "get_meeting_info") { 
        getMeetingInfo().then(i => sendResponse({ success: true, ...i })); 
        return true; 
    }
    else if (request.action === "send_to_chat") { 
        handleSendToChat(request.text).then(r => sendResponse(r)); 
        return true; 
    }
    else if (request.action === "copy_to_clipboard") {
        const temp = document.createElement('textarea');
        document.body.appendChild(temp);
        temp.value = request.text;
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        sendResponse({ success: true });
    }
});

let isAutomating = false;

async function getMeetingInfo() {
    if (isAutomating) return { success: false, msg: "Automating..." };
    
    try {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const peopleBtn = buttons.find(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            const tip = (b.getAttribute('data-tooltip') || '').toLowerCase();
            const content = (b.textContent || '').toLowerCase();
            return label.includes('người') || label.includes('people') || label.includes('everyone') || 
                   tip.includes('người') || tip.includes('people') || content.includes('người');
        });

        // 1. Kiểm tra xem có đang mở khung Chat không
        const chatBtn = buttons.find(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('chat') || label.includes('trò chuyện');
        });
        const isChatOpen = chatBtn && (chatBtn.getAttribute('aria-pressed') === 'true' || chatBtn.getAttribute('aria-expanded') === 'true');
        const isPeopleOpen = peopleBtn && (peopleBtn.getAttribute('aria-pressed') === 'true' || peopleBtn.getAttribute('aria-expanded') === 'true');

        // KHÔNG TỰ ĐỘNG MỞ PANEL TRONG HEARTBEAT NỮA ĐỂ TRÁNH NHẤP NHÁY
        // Chỉ quét dữ liệu nếu panel đã mở hoặc từ các ô video (tiles)

        let attendance = new Set();
        let host = "Chưa xác định";
        
        // 2. Lấy danh sách từ Panel (Nếu mở)
        // Mở rộng selector cho panel vì Google Meet có thể đổi class
        const panel = document.querySelector('[role="complementary"], .gg669c, .dwS77c, .Bx797e');
        const listItems = panel ? panel.querySelectorAll('[role="listitem"], [data-participant-id]') : [];
        
        console.log(`Scanning ${listItems.length} items in panel...`);

        if (listItems.length > 0) {
            listItems.forEach(item => {
                let ariaLabel = item.getAttribute('aria-label') || "";
                let itemText = item.innerText || "";
                
                // Tìm tên trong item
                const nameEl = item.querySelector('[jsname="WpHeLc"], .V9499e, .zWfAib, span:not(:empty)');
                let name = nameEl ? (nameEl.innerText || nameEl.textContent) : ariaLabel;

                if (name) {
                    let n = cleanName(name);
                    if (isValid(n)) {
                        attendance.add(n);
                        
                        // Xác định Host: Tìm nhãn trong text hoặc aria-label hoặc icon chiếc khiên
                        const hostIcon = item.querySelector('[jsname="U989Be"], .uS1pfe, path[d^="M12 1L3 5"], path[d^="M12 2"]');
                        const isHost = /Người tổ chức cuộc họp|Chủ trì|Meeting host|Organizer/i.test(itemText) || 
                                       /Người tổ chức cuộc họp|Chủ trì|Meeting host|Organizer/i.test(ariaLabel) ||
                                       !!hostIcon;
                        
                        if (isHost) {
                            host = n;
                            console.log("-> Found Host:", host);
                        }
                    }
                }
            });
        }

        // 3. Quét các ô Video (Tiles) - Luôn quét để bổ sung
        const tiles = document.querySelectorAll('[data-participant-id]');
        tiles.forEach(tile => {
            const nameEl = tile.querySelector('span.notranslate, [jsname="WpHeLc"]');
            if (nameEl) {
                let n = cleanName(nameEl.innerText || nameEl.textContent);
                if (isValid(n)) {
                    attendance.add(n);
                    // Kiểm tra badge host trên tile
                    if (host === "Chưa xác định") {
                        const hostBadge = tile.querySelector('[jsname="U989Be"], .uS1pfe, [aria-label*="tổ chức"], [aria-label*="host"]');
                        if (hostBadge) host = n;
                    }
                }
            }
        });

        // 4. SIÊU QUÉT TOÀN CỤC (Nếu vẫn chưa thấy)
        if (host === "Chưa xác định") {
            const hostKeywords = /Người tổ chức cuộc họp|Meeting host|Chủ trì/i;
            const labels = Array.from(document.querySelectorAll('span, div, p')).filter(el => 
                el.children.length === 0 && hostKeywords.test(el.textContent) && el.textContent.length < 50
            );
            
            for (const label of labels) {
                const container = label.closest('[role="listitem"], [data-participant-id], .zWfAib, .V9499e, .nvvOic');
                if (container) {
                    const nameEl = container.querySelector('[jsname="WpHeLc"], .V9499e, .zWfAib, span.notranslate, span:not(:empty)');
                    if (nameEl) {
                        const n = cleanName(nameEl.innerText || nameEl.textContent);
                        if (isValid(n)) {
                            host = n;
                            break;
                        }
                    }
                }
            }
        }

        // 5. Check "Bạn" có phải là host không (Dựa vào nút khóa bảo mật)
        // 6. Kiểm tra xem "Bạn" có phải là Host không
        // Quét kỹ hơn các dấu hiệu chỉ Host mới có (Nút khóa bảo mật, Nút tắt tiếng tất cả,...)
        const hostControlsExists = !!(
            document.querySelector('[aria-label*="tổ chức"], [aria-label*="Host controls"], [jsname="S09e9c"]') ||
            document.querySelector('[data-tooltip*="tổ chức"], [data-tooltip*="Host controls"]') ||
            document.querySelector('button[aria-label*="Tắt tiếng tất cả"], button[aria-label*="Mute all"]')
        );
        
        const list = Array.from(attendance).sort();
        
        // Xác định tên của chính mình
        let myName = "Không rõ";
        const youEl = Array.from(document.querySelectorAll('[role="listitem"], [data-participant-id], .zWfAib, .V9499e')).find(el => {
            const text = el.innerText || el.getAttribute('aria-label') || "";
            return text.includes("(Bạn)") || text.includes("(You)");
        });
        
        if (youEl) {
            const nameEl = youEl.querySelector('[jsname="WpHeLc"], .V9499e, span:not(:empty)');
            if (nameEl) myName = cleanName(nameEl.innerText || nameEl.textContent);
        }

        const isHost = hostControlsExists || (host !== "Chưa xác định" && host === myName);
        console.log("Permission check:", { hostControlsExists, host, myName, isHost });

        return { 
            success: true,
            url: window.location.href, 
            count: list.length, 
            host: host,
            isCurrentUserHost: isHost,
            attendanceList: list, 
            interactionScores 
        };
    } catch (e) { 
        console.error("Error in getMeetingInfo:", e);
        return { success: false }; 
    }
}

function cleanName(n) {
    if (!n) return "";
    // Xử lý chuỗi thô từ Meet (Ví dụ: "Nguyễn Văn A, Người tổ chức" hoặc "Nguyễn Văn A (Bạn)")
    let name = n.split('\n')[0]; // Lấy dòng đầu
    name = name.split(',')[0];   // Lấy phần trước dấu phẩy (nhãn aria)
    name = name.replace(/\(.*\)/g, ''); // Xóa mọi nội dung trong ngoặc đơn
    name = name.replace(/[✓✅★]/g, ''); // Xóa emoji
    return name.trim();
}

function isValid(n) {
    if (!n) return false;
    const lower = n.toLowerCase();
    const blacklist = [
        'devices', 'thiết bị', 'audio', 'âm thanh', 
        'presentation', 'trình bày', 'bản trình bày', 
        'phone', 'điện thoại', 'mọi người', 'everyone'
    ];
    
    // Nếu tên chứa bất kỳ từ nào trong blacklist (nguyên văn hoặc là 1 phần của từ hệ thống)
    if (blacklist.some(word => lower.includes(word) && lower.length < 20)) return false;

    return n.length > 1 && !n.includes('_') && /[a-zA-ZÀ-ỹ]/.test(n);
}

function toggleSidebar() {
    const id = 'online-monitor-sidebar';
    let iframe = document.getElementById(id);
    if (iframe) {
        const isHidden = iframe.style.display === 'none';
        iframe.style.display = isHidden ? 'block' : 'none';
        const main = document.querySelector('div[role="main"]') || document.body;
        main.style.marginRight = isHidden ? '340px' : '0px';
    } else createSidebar();
}

function createSidebar() {
    const id = 'online-monitor-sidebar';
    if (document.getElementById(id)) return;
    const iframe = document.createElement('iframe');
    iframe.id = id; iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.cssText = "position:fixed; top:10px; right:10px; width:340px; height:calc(100vh - 100px); border:none; z-index:2147483647; box-shadow:0 12px 40px rgba(0,0,0,0.3); border-radius:16px; background:#fff; transition:0.3s ease;";
    const main = document.querySelector('div[role="main"]') || document.body;
    main.style.marginRight = '340px';
    document.body.appendChild(iframe);
}

setInterval(() => {
    if (!contextAlive) return;
    const toolbar = document.querySelector('[data-is-muted], .Tmb7Fd, .c989Be');
    if (toolbar && !document.getElementById('btn-toggle-audit')) {
        const btn = document.createElement('div');
        btn.id = 'btn-toggle-audit'; btn.style.cssText = "margin-left:8px; cursor:pointer;";
        btn.innerHTML = `<button style="background:#fff; border:2px solid #00558d; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center;"><img src="${chrome.runtime.getURL('logo.png')}" style="width:75%; height:75%;"></button>`;
        btn.onclick = (e) => { e.preventDefault(); toggleSidebar(); };
        toolbar.parentElement.appendChild(btn);
    }
}, 3000);

setInterval(async () => {
    if (!contextAlive || !window.location.href.includes('meet.google.com/')) return;
    const info = await getMeetingInfo();
    safeSendMessage({ action: "heartbeat_sync", ...info });
}, 12000);

async function handleSendToChat(t) {
    if (isAutomating) return { success: false, error: "Đang xử lý tác vụ khác..." };
    isAutomating = true;
    
    console.log("Starting aggressive send to chat:", t);
    
    try {
        const findInput = () => {
            const potentials = Array.from(document.querySelectorAll('textarea, [contenteditable="true"][role="textbox"]'));
            return potentials.find(el => {
                const html = el.outerHTML.toLowerCase();
                const isVisible = el.offsetWidth > 0 || el.offsetHeight > 0;
                return isVisible && (
                    html.includes('chat') || html.includes('nhắn') || 
                    html.includes('message') || html.includes('gửi')
                );
            });
        };

        let chatInput = findInput();
        
        if (!chatInput) {
            const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
            const chatBtn = buttons.find(b => {
                const label = (b.getAttribute('aria-label') || '').toLowerCase();
                const tip = (b.getAttribute('data-tooltip') || '').toLowerCase();
                return (label.includes('chat') && label.includes('everyone')) || 
                       (label.includes('trò chuyện') && label.includes('mọi người')) ||
                       label === 'chat' || label === 'trò chuyện' ||
                       tip.includes('chat') || tip.includes('trò chuyện');
            });
            
            if (chatBtn) {
                chatBtn.click();
                for (let i = 0; i < 10; i++) { // Tăng thời gian đợi
                    await new Promise(r => setTimeout(r, 400));
                    chatInput = findInput();
                    if (chatInput) break;
                }
            }
        }

        if (chatInput) {
            chatInput.focus(); 
            // 1. Nhập liệu siêu cấp (Dùng execCommand để giả lập gõ phím thật)
            try {
                chatInput.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, t);
            } catch (e) {
                if (chatInput.tagName === 'TEXTAREA') chatInput.value = t;
                else chatInput.innerText = t;
            }
            
            // Kích hoạt sự kiện để React/Angular nhận diện
            ['input', 'change', 'blur'].forEach(evt => {
                chatInput.dispatchEvent(new Event(evt, { bubbles: true }));
            });
            
            await new Promise(r => setTimeout(r, 800));
            
            // 2. Tìm nút Gửi bằng mọi cách có thể (Brute force search)
            const findSendBtn = () => {
                const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
                return buttons.find(b => {
                    const label = (b.getAttribute('aria-label') || '').toLowerCase();
                    const tip = (b.getAttribute('data-tooltip') || '').toLowerCase();
                    const jsname = b.getAttribute('jsname');
                    const html = b.innerHTML.toLowerCase();
                    const isVisible = b.offsetWidth > 0;
                    const notDisabled = !b.disabled && b.getAttribute('aria-disabled') !== 'true';
                    
                    return isVisible && notDisabled && (
                        label.includes('gửi') || label.includes('send') ||
                        tip.includes('gửi') || tip.includes('send') ||
                        jsname === 'V67SHe' || // ID phổ biến của nút gửi Meet
                        html.includes('m5,13l9,17l18,8') // SVG path của icon gửi
                    );
                });
            };

            let sendBtn = findSendBtn();
            
            if (sendBtn) {
                console.log("Send button found, executing click sequence...");
                // Giả lập chuỗi nhấn chuột đầy đủ
                ['mousedown', 'mouseup', 'click'].forEach(evtType => {
                    sendBtn.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
                });
            } 
            
            // Luôn thử thêm phím Enter để chắc chắn
            console.log("Executing aggressive Enter sequence on input...");
            const kOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
            chatInput.dispatchEvent(new KeyboardEvent('keydown', kOptions));
            chatInput.dispatchEvent(new KeyboardEvent('keypress', kOptions));
            chatInput.dispatchEvent(new KeyboardEvent('keyup', kOptions));

            // Đợi thêm để xem tin nhắn đã bay đi chưa
            await new Promise(r => setTimeout(r, 1500));
            
            // Nếu vẫn thấy text trong ô chat thì thử lại phím Enter một lần nữa trên form
            if (chatInput.value || chatInput.innerText) {
                const form = chatInput.closest('form');
                if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
            }

            // 3. Đóng khung chat sau khi gửi
            setTimeout(() => {
                const closeBtn = document.querySelector('[role="complementary"] button[aria-label*="Close"], [role="complementary"] button[aria-label*="Đóng"]');
                if (closeBtn) closeBtn.click();
            }, 1000); 
            
            isAutomating = false;
            return { success: true };
        }
        
        isAutomating = false;
        return { success: false, error: "Không tìm thấy khung chat." };
    } catch (e) {
        isAutomating = false;
        return { success: false, error: e.message };
    }
}
