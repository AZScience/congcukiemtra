// Configuration
const API_BASE = "http://localhost:3000/api/v1"; 
console.log("Extension v1.4 loaded - Definitive Automation Mode");

// Helper: Gọi API qua background.js để tránh CORS
function callApi(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'fetch_api',
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, message: chrome.runtime.lastError.message });
        return;
      }
      if (response && response.success) {
        resolve(response.data);
      } else {
        resolve({ success: false, message: response?.error || 'Unknown error' });
      }
    });
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  const btnSearch = document.getElementById('btn-search');
  const btnRefreshLink = document.getElementById('btn-refresh-link');
  const timerDisplay = document.getElementById('timer');
  const timeElapsed = document.getElementById('time-elapsed');
  const classCodeInput = document.getElementById('class-code');
  const statusMsg = document.getElementById('status-message');
  const btnStartSession = document.getElementById('btn-start-session');
  
  let currentClass = null;
  let startTime = null;
  let timerInterval = null;

  // --- KHÔI PHỤC TRẠNG THÁI TỪ STORAGE (MỚI) ---
  chrome.storage.local.get(['active_session'], (result) => {
    if (result.active_session) {
      console.log("Restoring active session...", result.active_session);
      const session = result.active_session;
      currentClass = session.currentClass || session.classInfo;
      if (session.startTime) startTime = new Date(session.startTime);
      
      if (currentClass) {
        displayClassInfo(currentClass);
        document.getElementById('class-selection').classList.add('hidden');
        document.getElementById('class-info').classList.remove('hidden');
        
        if (startTime && !session.is_finished) {
          document.getElementById('timer').classList.remove('hidden');
          if (btnStartSession) btnStartSession.classList.add('hidden');
          
          // Tự động thu gọn nếu đang trong tiết dạy
          const infoArea = document.getElementById('info-content-area');
          const infoIcon = document.getElementById('toggle-icon');
          const attContent = document.getElementById('attendance-content');
          const attIcon = document.getElementById('attendance-toggle-icon');

          if (infoArea) infoArea.classList.add('hidden');
          if (infoIcon) infoIcon.style.transform = 'rotate(-90deg)';
          if (attContent) attContent.classList.remove('hidden');
          if (attIcon) attIcon.textContent = '▲';

          startTimer();
        } else if (session.is_finished) {
          document.getElementById('timer').classList.add('hidden');
          if (btnStartSession) btnStartSession.classList.add('hidden');
          document.getElementById('attendance-actions')?.classList.remove('hidden');
        }

        // Cập nhật các thông tin realtime cuối cùng
        if (session.last_count) document.getElementById('info-actual-students').textContent = session.last_count;
        if (session.last_host) document.getElementById('info-host').textContent = session.last_host;
        if (session.last_url) document.getElementById('info-meeting-link').textContent = session.last_url;
        if (session.attendance_list) renderAttendanceList(session.attendance_list);
      }
    }
  });

  const btnTogglePoll = document.getElementById('btn-toggle-poll');
  const btnToggleExam = document.getElementById('btn-toggle-exam');

  function updateUI(data) {
    if (!data) return;
    const countEl = document.getElementById('info-actual-students');
    const hostEl = document.getElementById('info-host');
    const linkEl = document.getElementById('info-meeting-link');
    
    if (countEl && data.count !== undefined) countEl.textContent = data.count;
    if (hostEl && data.host) hostEl.textContent = data.host;
    if (linkEl && data.url) linkEl.textContent = data.url;
    
    if (data.attendanceList) {
      renderAttendanceList(data.attendanceList, data.interactionScores || {});
    }
  }

  // Lắng nghe dữ liệu từ content.js gửi vào (Cả tức thì và định kỳ)
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "send_data_to_popup" || request.action === "heartbeat_sync") {
      updateUI(request);
    }
  });

  // Khởi tạo ngày hôm nay làm mặc định

  // 1. Tự động lấy link từ Tab hiện tại và TÌM LỚP TỰ ĐỘNG
  async function refreshMeetingLink() {
    if (!chrome.runtime?.id) return;
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (chrome.runtime.lastError) return;
        if (tabs[0] && tabs[0].url) {
          const url = tabs[0].url;
          const linkEl = document.getElementById('info-meeting-link');
          if (linkEl) linkEl.textContent = url;

          // Nếu chưa có lớp và chưa có session, thử tìm lớp theo link
          chrome.storage.local.get(['active_session'], async (result) => {
            if (!currentClass && !result.active_session && url.includes('meet.google.com')) {
              console.log("Automatic class identification by link...");
              await searchClass(url);
            }
          });
        }
      });
    } catch (e) { console.warn("Context invalidated"); }
  }

  refreshMeetingLink();
  btnRefreshLink?.addEventListener('click', refreshMeetingLink);

  // 1.1 Tự động lấy thông tin cuộc họp REALTIME
  let isAutoStarting = false; // Flag tránh lặp lại

  async function refreshMeetingInfo() {
    if (!chrome.runtime?.id) return;
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs[0] || !tabs[0].id) return;
        const expectedHost = currentClass ? (currentClass.Lecturer || currentClass.lecturer) : null;
        chrome.tabs.sendMessage(tabs[0].id, { action: "get_meeting_info", expectedHost: expectedHost }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.success) {
            const studentCountEl = document.getElementById('info-actual-students');
            if (studentCountEl) studentCountEl.textContent = response.count || 0;
            const hostEl = document.getElementById('info-host');
            if (hostEl) hostEl.textContent = response.host || "Không rõ";
            const linkEl = document.getElementById('info-meeting-link');
            if (linkEl && response.url) linkEl.textContent = response.url;

            // --- KIỂM TRA QUYỀN HẠN HOST ---
            const noticeEl = document.getElementById('host-restriction-notice');
            const startBtn = document.getElementById('btn-start-session');
            const syncBtn = document.getElementById('btn-sync-attendance');
            const pollToggle = document.getElementById('btn-toggle-poll');

            if (response.isCurrentUserHost) {
              if (noticeEl) noticeEl.classList.add('hidden');
              if (startBtn) startBtn.classList.remove('host-only-restricted');
              if (syncBtn) syncBtn.classList.remove('host-only-restricted');
              if (pollToggle) pollToggle.classList.remove('host-only-restricted');
              
              // --- TỰ ĐỘNG KÍCH HOẠT NẾU LÀ HOST VÀ ĐÃ CÓ LỚP ---
              chrome.storage.local.get(['active_session'], (result) => {
                if (currentClass && !result.active_session && !isAutoStarting) {
                  console.log("Host identified. Auto-starting session...");
                  isAutoStarting = true;
                  startSession();
                }
              });
            } else {
              if (noticeEl) noticeEl.classList.remove('hidden');
              if (startBtn) startBtn.classList.add('host-only-restricted');
              if (syncBtn) syncBtn.classList.add('host-only-restricted');
              if (pollToggle) pollToggle.classList.add('host-only-restricted');
            }

            // --- TÍNH TOÁN DỮ LIỆU CHI TIẾT NGAY TẠI POPUP ---
            chrome.storage.local.get(['active_session'], (result) => {
              if (result.active_session) {
                const session = result.active_session;
                const now = new Date();
                const logs = session.participant_logs || {};
                
                // Cập nhật logs
                if (response.attendanceList) {
                  response.attendanceList.forEach(name => {
                    if (!logs[name]) {
                      logs[name] = { 
                        firstSeen: now.toLocaleTimeString('vi-VN'), 
                        firstSeenFull: now.toISOString(),
                        lastSeen: now.toISOString(),
                        score: 0
                      };
                    }
                    // Cập nhật điểm từ content script
                    if (response.interactionScores && response.interactionScores[name]) {
                      logs[name].score = response.interactionScores[name];
                    }
                    logs[name].lastSeen = now.toISOString();
                  });
                }

                const attendanceDetails = calculateAttendanceDetails(logs, session.startTime);
                renderAttendanceList(response.attendanceList, response.interactionScores || {});

                chrome.storage.local.set({
                  'active_session': {
                    ...session,
                    last_count: response.count || 0,
                    last_host: response.host || "Không rõ",
                    last_url: response.url || tabs[0].url || "",
                    attendance_details: attendanceDetails,
                    participant_logs: logs,
                    last_update: now.toISOString()
                  }
                });
              }
            });
          }
        });
      });
    } catch (e) { }
  }

  function calculateAttendanceDetails(logs, sessionStartTimeStr) {
    const now = new Date();
    const startTime = new Date(sessionStartTimeStr);
    const totalMs = now - startTime;

    return Object.keys(logs).map((name, index) => {
      const firstSeen = new Date(logs[name].firstSeenFull);
      const lastSeen = new Date(logs[name].lastSeen);
      const attendedMs = lastSeen - firstSeen;
      const minutes = Math.floor(attendedMs / 60000);
      const seconds = Math.floor((attendedMs % 60000) / 1000);
      const percentage = totalMs > 0 ? Math.min(100, Math.round((attendedMs / totalMs) * 100)) : 0;

      return {
        sNo: index + 1,
        name: name,
        firstSeenAt: logs[name].firstSeen,
        attendedDuration: `${minutes} min ${seconds}s`,
        attendedPercentage: `${percentage}%`,
        score: logs[name].score || 0
      };
    });
  }

  setTimeout(refreshMeetingInfo, 1000);
  setInterval(refreshMeetingInfo, 5000);

  // HÀM GỌI API THÔNG QUA BACKGROUND
  async function callApi(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: "fetch_api",
        url: url,
        method: method,
        body: body,
        headers: { 'Content-Type': 'application/json' }
      }, (response) => {
        if (response && response.success) resolve(response.data);
        else reject(new Error(response ? response.error : "No response from background"));
      });
    });
  }

  // 2. Tìm kiếm lớp học
  async function searchClass(query) {
    if (!query) return;
    showStatus("Đang tìm lớp...", "info");
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const dateParts = todayStr.split('-'); 
      const dateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const url = `${API_BASE}/schedules?class=${encodeURIComponent(query)}&date=${encodeURIComponent(dateStr)}`;
      const result = await callApi(url);
      
      if (result.success && result.data && result.data.length > 0) {
        const classes = result.data;
        if (classes.length === 1) {
          selectClass(classes[0]);
          showStatus("Đã xác định được lớp học!", "success");
        } else {
          displayClassSelection(classes);
          showStatus(`Tìm thấy ${classes.length} lớp phù hợp`, "info");
        }
      } else {
        showStatus("Không tìm thấy lớp học phù hợp", "error");
      }
    } catch (err) {
      showStatus(`Lỗi: ${err.message}`, "error");
    }
  }

  btnSearch.addEventListener('click', () => {
    const code = classCodeInput.value.trim().toUpperCase();
    searchClass(code);
  });

  function selectClass(classData) {
    // ĐẢM BẢO ID KHÔNG BAO GIỜ MẤT (Gán vào nhiều trường để dự phòng)
    const secureId = classData.id || classData._id || classData.ID;
    currentClass = { ...classData, id: secureId, _id: secureId, ID: secureId };
    
    displayClassInfo(currentClass);
    document.getElementById('class-selection').classList.add('hidden');
    document.getElementById('class-info').classList.remove('hidden');
    // Bỏ hiển thị nút Bắt đầu vì sẽ tự động kích hoạt
  }

  function displayClassSelection(classes) {
    const list = document.getElementById('class-list');
    const selectionDiv = document.getElementById('class-selection');
    const infoDiv = document.getElementById('class-info');

    infoDiv.classList.add('hidden');
    selectionDiv.classList.remove('hidden');
    list.innerHTML = "";

    classes.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = "background: white; padding: 10px; border-radius: 10px; border: 1px solid #fed7aa; cursor: pointer; margin-bottom: 8px;";
      card.innerHTML = `
        <div style="font-weight: 900; color: #ea580c; font-size: 11px;">${c.Class || c.class || "N/A"}</div>
        <div style="font-size: 10px; color: #64748b;">GV: ${c.Lecturer || c.lecturer || "Chưa rõ"} | Tiết: ${c.Period || c.period || "-"}</div>
      `;
      card.onclick = () => selectClass(c);
      list.appendChild(card);
    });
  }

  function displayClassInfo(info) {
    document.getElementById('info-class').textContent = info.Class || info.class || "N/A";
    document.getElementById('info-lecturer').textContent = info.Lecturer || info.lecturer || "N/A";
    document.getElementById('info-period').textContent = info.Period || info.period || "N/A";
    document.getElementById('info-date').textContent = info.Date || info.date || "--/--/----";
    document.getElementById('info-content').textContent = info.Course || info.content || info.Subject || info.course || "Chưa có nội dung";
    
    // Tìm Sĩ số từ mọi nguồn có thể (Dự phòng cho mọi biến thể field name)
    const siso = info.studentCount || info.TotalStudents || info.totalStudents || 
                 info.StudentCount || info.Capacity || info.capacity || 
                 info['Sĩ số'] || info['siso'] || info['SISO'] || "--";
    document.getElementById('info-total-students').textContent = siso;

    document.getElementById('info-faculty').textContent = info.department || info.Faculty || info.faculty || "N/A";
  }

  // 3. Logic Bắt đầu (Chạy ngầm)
  btnStartSession?.addEventListener('click', startSession);

  function startSession() {
    if (!currentClass) return;

    // TỰ ĐỘNG THU GỌN THÔNG TIN VÀ MỞ DANH SÁCH KHI BẮT ĐẦU
    const infoArea = document.getElementById('info-content-area');
    const infoIcon = document.getElementById('toggle-icon');
    const attContent = document.getElementById('attendance-content');
    const attIcon = document.getElementById('attendance-toggle-icon');

    if (infoArea) infoArea.classList.add('hidden');
    if (infoIcon) infoIcon.style.transform = 'rotate(-90deg)';
    if (attContent) attContent.classList.remove('hidden');
    if (attIcon) attIcon.textContent = '▲';

    // RA LỆNH MỞ DANH SÁCH VÀ QUÉT NGAY LẬP TỨC
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "get_meeting_info" }, (response) => {
          if (response && response.success) {
            updateUI(response);
          }
        });
      }
    });

    startTime = new Date();
    document.getElementById('timer').classList.remove('hidden');
    document.getElementById('attendance-actions')?.classList.add('hidden');
    if (btnStartSession) btnStartSession.classList.add('hidden');
    startTimer();
    
    // Đảm bảo ID được trích xuất rõ ràng
    const secureId = currentClass.id || currentClass._id || currentClass.ID;

    // Gửi yêu cầu khởi tạo Session - Đưa ID ra ngoài cùng để tuyệt đối không mất
    chrome.runtime.sendMessage({
      action: "start_session",
      data: {
        currentClass: currentClass,
        class_id: secureId, // Trường ID rõ ràng ở cấp cao nhất
        startTime: startTime.toISOString(),
        last_count: document.getElementById('info-actual-students').textContent || "0",
        last_url: window.location.href 
      }
    });

    showStatus("Hệ thống đã tự động ghi nhận giờ bắt đầu", "success");
  }

  // 4. Các hàm hỗ trợ Timer
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const now = new Date();
      const diff = now - startTime;
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      document.getElementById('time-elapsed').textContent = `${h}:${m}:${s}`;
    }, 1000);
  }

  function stopTimer() { 
    clearInterval(timerInterval); 
    timerInterval = null;
  }

  // SỰ KIỆN CLICK VÀO ĐỒNG HỒ ĐỂ KẾT THÚC THỦ CÔNG (FALLBACK)
  let isReporting = false;

  timerDisplay?.addEventListener('click', async () => {
    if (!currentClass || !startTime || isReporting) return;
    
    // Nếu phiên đã được đánh dấu là kết thúc, không gửi lại nữa
    const checkStorage = await new Promise((res) => chrome.storage.local.get(['active_session'], res));
    if (checkStorage.active_session?.is_finished) {
      showStatus("Tiết dạy này đã được ghi nhận kết thúc.", "info");
      timerDisplay.classList.add('hidden');
      return;
    }

    if (!confirm("Bạn muốn kết thúc tiết dạy này?")) return;
    
    isReporting = true;
    showStatus("Đang chụp ảnh minh chứng và gửi báo cáo...", "info");
    const endTime = new Date();

    try {
      // 1. Chụp ảnh màn hình minh chứng thông qua Background
      let screenshot = null;
      try {
        const capResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "capture_screen" }, resolve);
        });
        if (capResult && capResult.success) {
          screenshot = capResult.dataUrl;
        }
      } catch (e) {
        console.warn("Lỗi chụp ảnh minh chứng:", e);
      }

      // 1. Chuẩn bị dữ liệu cho log (online-checkins)
      const actualCount = Number(document.getElementById('info-actual-students').textContent || "0");
      // Lấy Sĩ số từ UI để đảm bảo khớp với những gì giảng viên thấy
      const scheduledCount = Number(document.getElementById('info-total-students').textContent) || 0;

      const reportDataForLog = {
        date: String(currentClass.Date || currentClass.date || new Date().toLocaleDateString('vi-VN')),
        classId: String(currentClass.Class || currentClass.class || "N/A"),
        className: String(currentClass.Course || currentClass.content || currentClass.Subject || currentClass.course || "N/A"),
        lecturer: String(currentClass.Lecturer || currentClass.lecturer || "N/A"),
        period: String(currentClass.Period || currentClass.period || "N/A"),
        room: String(currentClass.Room || currentClass.room || "Trực tuyến"),
        building: String(currentClass.Building || currentClass.building || "N/A"),
        
        // Trang online-classes dùng studentCount là số SV tham gia thực tế
        studentCount: actualCount,
        totalStudents: scheduledCount,
        
        meetingLink: document.getElementById('info-meeting-link').textContent || "",
        hostName: document.getElementById('info-host').textContent || "Chưa xác định",
        evidence: screenshot,
        status: 'completed',
        type: 'online_manual',
        startTime: startTime?.toISOString(),
        endTime: endTime.toISOString(),
        attendanceList: [],
        attendanceDetails: []
      };

      // Thêm chi tiết danh sách nếu có
      const storage = await new Promise((res) => chrome.storage.local.get(['active_session'], res));
      if (storage.active_session) {
        reportDataForLog.attendanceList = storage.active_session.attendance_list || [];
        reportDataForLog.attendanceDetails = storage.active_session.attendance_details || calculateAttendanceDetails(
          storage.active_session.participant_logs || {},
          storage.active_session.startTime
        );
      }

      // 2. Chuẩn bị dữ liệu cho Dashboard (schedules)
      const reportDataForSchedule = {
        date: String(currentClass.Date || currentClass.date || new Date().toLocaleDateString('vi-VN')),
        class: String(currentClass.Class || currentClass.class || "N/A"),
        content: String(currentClass.Course || currentClass.content || currentClass.Subject || currentClass.course || "N/A"),
        lecturer: String(currentClass.Lecturer || currentClass.lecturer || "N/A"),
        period: String(currentClass.Period || currentClass.period || "N/A"),
        room: String(currentClass.Room || currentClass.room || "Trực tuyến"),
        building: String(currentClass.Building || currentClass.building || "N/A"),
        
        // Trang online dùng studentCount là Sĩ số
        studentCount: scheduledCount,
        totalStudents: scheduledCount, // Dự phòng cho các bản UI cũ
        attendingStudents: actualCount,
        actualStudentCount: actualCount, // Dự phòng cho các bản UI cũ
        
        meetingLink: document.getElementById('info-meeting-link').textContent || "",
        evidence: screenshot,
        status: 'completed',
        endTime: endTime.toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Gửi đồng thời về cả 2 collection
      const logResult = await callApi(`${API_BASE}/online-checkins`, 'POST', reportDataForLog);

      const scheduleId = currentClass.id || currentClass._id || currentClass.ID;
      if (scheduleId && scheduleId !== "undefined") {
        await callApi(`${API_BASE}/schedules/${scheduleId}`, 'PATCH', reportDataForSchedule);
      }

      showStatus("Tiết dạy đã kết thúc thành công!", "success");
      stopTimer();
      timerDisplay.classList.add('hidden');
      document.getElementById('attendance-actions')?.classList.remove('hidden');
      startTime = null;
      
      // Cập nhật trạng thái session thay vì xóa hoàn toàn để có thể Publish sau đó
      chrome.storage.local.set({ 
        active_session: { 
          ...storage.active_session, 
          is_finished: true,
          endTime: endTime.toISOString(),
          attendance_details: reportDataForLog.attendanceDetails,
          lastReportId: logResult?.id
        } 
      });

    } catch (err) {
      showStatus("Lỗi khi kết thúc: " + err.message, "error");
    } finally {
      isReporting = false;
    }
  });

  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = `status ${type}`;
  }

  // Logic thu gọn/mở rộng Thông tin
  document.getElementById('btn-toggle-info')?.addEventListener('click', () => {
    const area = document.getElementById('info-content-area');
    const attendanceContent = document.getElementById('attendance-content');
    const icon = document.getElementById('toggle-icon');
    const attIcon = document.getElementById('attendance-toggle-icon');
    
    const isHidden = area.classList.toggle('hidden');
    icon.style.transform = isHidden ? 'rotate(-90deg)' : 'rotate(0deg)';
    
    // Nếu mở Thông tin thì đóng Điểm danh (Accordion mode)
    if (!isHidden) {
      attendanceContent.classList.add('hidden');
      if (attIcon) attIcon.textContent = '▼';
    }
  });

  // Logic thu gọn/mở rộng Danh sách điểm danh
  document.getElementById('btn-toggle-attendance')?.addEventListener('click', () => {
    const content = document.getElementById('attendance-content');
    const infoArea = document.getElementById('info-content-area');
    const icon = document.getElementById('attendance-toggle-icon');
    const infoIcon = document.getElementById('toggle-icon');
    
    const isHidden = content.classList.toggle('hidden');
    icon.textContent = isHidden ? '▼' : '▲';
    
    // Nếu mở Điểm danh thì đóng Thông tin (Accordion mode)
    if (!isHidden) {
      infoArea.classList.add('hidden');
      if (infoIcon) infoIcon.style.transform = 'rotate(-90deg)';
    }
  });

  function renderAttendanceList(list, scores = {}) {
    const container = document.getElementById('attendance-list-container');
    if (!container) return;
    
    if (!list || list.length === 0) {
      container.innerHTML = '<p style="font-size: 11px; color: #94a3b8; text-align: center;">Chưa có dữ liệu danh sách...</p>';
      return;
    }

    // Sắp xếp tên theo bảng chữ cái
    const sortedList = [...list].sort((a, b) => a.localeCompare(b, 'vi'));
    
    let totalScore = 0;
    container.innerHTML = sortedList.map((name, index) => {
      const score = scores[name] || 0;
      totalScore += score;
      return `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
          <span style="font-size: 10px; font-weight: bold; color: #64748b; min-width: 18px;">${index + 1}.</span>
          <span style="font-size: 11px; font-weight: bold; color: #0f172a; flex: 1;">${name}</span>
          ${score > 0 ? `<span title="Điểm tương tác" style="font-size: 9px; background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 10px; font-weight: 800; border: 1px solid #bbf7d0;">+${score}</span>` : ''}
          <div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></div>
        </div>
      `;
    }).join('');

    const totalEl = document.getElementById('total-interactions');
    if (totalEl) totalEl.textContent = `${totalScore} điểm`;
  }

  document.getElementById('btn-sync-attendance')?.addEventListener('click', async () => {
    if (!currentClass) {
      showStatus("Vui lòng chọn lớp trước khi Publish!", "error");
      return;
    }

    const btn = document.getElementById('btn-sync-attendance');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Đang Publish...";

    try {
      const tabs = await new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, res));
      if (!tabs[0] || !tabs[0].id) {
        throw new Error("Không tìm thấy Google Meet tab.");
      }

      const response = await new Promise((res, rej) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "get_meeting_info" }, (resp) => {
          if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
          else res(resp);
        });
      });

      if (response && response.success) {
        // 1. Chụp ảnh minh chứng mới nhất
        const capResult = await new Promise((res) => chrome.runtime.sendMessage({ action: "capture_screen" }, res));
        const screenshot = capResult?.success ? capResult.dataUrl : null;

        // 2. Lấy log hiện tại để tính toán dữ liệu chi tiết
        const storage = await new Promise((res) => chrome.storage.local.get(['active_session'], res));
        const session = storage.active_session;
        const details = calculateAttendanceDetails(
          session?.participant_logs || {},
          session?.startTime || new Date().toISOString()
        );

        // Lấy Sĩ số từ giao diện Extension (đã được lấy từ lịch)
        const scheduledCountStr = document.getElementById('info-total-students').textContent;
        const scheduledCount = parseInt(scheduledCountStr) || 0;
        
        // Lấy Sinh viên dự (số người thực tế trong Google Meet)
        const actualCount = response.count || 0;

        // 3. Chuẩn bị dữ liệu cho Báo cáo (online-checkins)
        const reportDataForLog = {
          date: String(currentClass.Date || currentClass.date || new Date().toLocaleDateString('vi-VN')),
          classId: String(currentClass.Class || currentClass.class || "N/A"),
          className: String(currentClass.Course || currentClass.content || currentClass.Subject || currentClass.course || "N/A"),
          lecturer: String(currentClass.Lecturer || currentClass.lecturer || "N/A"),
          period: String(currentClass.Period || currentClass.period || "N/A"),
          room: String(currentClass.Room || currentClass.room || "Trực tuyến"),
          building: String(currentClass.Building || currentClass.building || "N/A"),
          
          // Sinh viên dự (Thực tế tham gia)
          studentCount: actualCount, 
          actualStudentCount: actualCount,
          
          // Sĩ số (Theo lịch)
          totalStudents: scheduledCount,
          scheduledCount: scheduledCount,
          
          meetingLink: response.url,
          hostName: response.host,
          attendanceList: response.attendanceList,
          attendanceDetails: details,
          evidence: screenshot,
          status: 'completed',
          type: 'online_publish',
          serverTimestamp: new Date().toISOString()
        };

        // Chuẩn bị dữ liệu cập nhật Lịch học (schedules)
        const reportDataForSchedule = {
          date: String(currentClass.Date || currentClass.date || new Date().toLocaleDateString('vi-VN')),
          class: String(currentClass.Class || currentClass.class || "N/A"),
          content: String(currentClass.Course || currentClass.content || currentClass.Subject || currentClass.course || "N/A"),
          lecturer: String(currentClass.Lecturer || currentClass.lecturer || "N/A"),
          period: String(currentClass.Period || currentClass.period || "N/A"),
          room: String(currentClass.Room || currentClass.room || "Trực tuyến"),
          building: String(currentClass.Building || currentClass.building || "N/A"),
          
          // Sĩ số (Theo lịch)
          studentCount: scheduledCount, 
          totalStudents: scheduledCount,
          
          // Sinh viên dự (Thực tế tham gia)
          attendingStudents: actualCount,
          actualStudentCount: actualCount,
          
          meetingLink: response.url,
          evidence: screenshot,
          status: 'completed',
          updatedAt: new Date().toISOString()
        };

        // 4. Gửi đồng thời - Dùng PUT nếu đã có lastReportId để tránh trùng lặp
        const apiMethod = session?.lastReportId ? 'PUT' : 'POST';
        const apiUrl = session?.lastReportId 
          ? `${API_BASE}/online-checkins/${session.lastReportId}` 
          : `${API_BASE}/online-checkins`;

        const publishResult = await callApi(apiUrl, apiMethod, reportDataForLog);
        
        const scheduleId = currentClass.id || currentClass._id || currentClass.ID;
        if (scheduleId && scheduleId !== "undefined") {
          await callApi(`${API_BASE}/schedules/${scheduleId}`, 'PATCH', reportDataForSchedule);
        }

        if (publishResult.success) {
          showStatus("Đã publish dữ liệu thành công!", "success");
          const reportId = publishResult.id || session?.lastReportId;
          
          // Lưu ID báo cáo để cập nhật lần sau nếu nhấn Publish tiếp
          if (!session?.lastReportId) {
            chrome.storage.local.set({ 
              active_session: { ...session, lastReportId: reportId } 
            });
          }

          const baseUrl = API_BASE.includes('localhost') ? "http://localhost:3000" : "https://nttu-audit.web.app";
          const reportUrl = `${baseUrl}/monitoring/online-report/${reportId}`;
          
          document.getElementById('attendance-link-text').textContent = reportUrl;
          document.getElementById('attendance-qr').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(reportUrl)}" style="width: 100px; height: 100px;">`;
          
          document.getElementById('attendance-content').classList.add('hidden');
          document.getElementById('attendance-publish-result').classList.remove('hidden');
        } else {
          showStatus("Lỗi Publish: " + publishResult.message, "error");
        }
      }
    } catch (err) {
      console.error(err);
      showStatus("Lỗi: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  document.getElementById('btn-back-to-attendance')?.addEventListener('click', () => {
    document.getElementById('attendance-publish-result').classList.add('hidden');
    document.getElementById('attendance-content').classList.remove('hidden');
  });

  // Handlers for attendance report actions (Copy, Send Chat, View)
  document.getElementById('btn-copy-attendance-link')?.addEventListener('click', () => {
    const link = document.getElementById('attendance-link-text').textContent;
    if (!link) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "copy_to_clipboard", text: link }, (resp) => {
        if (resp && resp.success) showStatus("Đã copy link báo cáo!", "success");
      });
    });
  });

  document.getElementById('btn-send-attendance-chat')?.addEventListener('click', () => {
    const link = document.getElementById('attendance-link-text').textContent;
    if (!link) return;
    const msg = `📊 BÁO CÁO ĐIỂM DANH LỚP ${currentClass?.Class || ''}:\n🔗 Xem chi tiết tại: ${link}`;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "send_to_chat", text: msg }, (resp) => {
        if (resp && resp.success) showStatus("Đã gửi báo cáo vào chat!", "success");
      });
    });
  });

  document.getElementById('btn-view-attendance-report')?.addEventListener('click', () => {
    const link = document.getElementById('attendance-link-text').textContent;
    if (link) window.open(link, '_blank');
  });

  document.getElementById('btn-download-attendance')?.addEventListener('click', async () => {
    chrome.storage.local.get(['active_session'], async (result) => {
      if (!result.active_session || !result.active_session.attendance_details) {
        showStatus("Chưa có dữ liệu để tải về!", "error");
        return;
      }

      // 1. Tải file về máy giảng viên
      exportToExcel(result.active_session);

      // 2. Chụp màn hình và gửi "gói minh chứng" (Excel data + Ảnh) về trang giám sát
      showStatus("Đang gửi minh chứng và file về trang giám sát...", "info");
      
      try {
        const capResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "capture_screen" }, resolve);
        });

        const screenshot = capResult?.success ? capResult.dataUrl : null;
        const scheduleId = result.active_session.class_id || result.active_session.currentClass?.id;

        // Gửi PATCH kèm ảnh minh chứng
        await callApi(`${API_BASE}/schedules/${scheduleId}`, 'PATCH', {
          attendanceDetails: result.active_session.attendance_details,
          evidence: screenshot,
          lastSeenAt: new Date().toISOString(),
          status: 'teaching'
        });

        showStatus("Đã gửi file và ảnh minh chứng thành công!", "success");
      } catch (e) {
        console.error("Lỗi gửi minh chứng:", e);
      }
    });
  });

  function exportToExcel(session) {
    const details = session.attendance_details || [];
    if (details.length === 0) return;

    let html = `
      <table border="1">
        <tr style="background-color: #00558d; color: white; font-weight: bold;">
          <th>S.No</th>
          <th>Participant Name</th>
          <th>First Seen At</th>
          <th>Attended Duration</th>
          <th>Attended Percentage</th>
        </tr>
    `;

    details.forEach(item => {
      html += `
        <tr>
          <td>${item.sNo}</td>
          <td>${item.name}</td>
          <td>${item.firstSeenAt}</td>
          <td>${item.attendedDuration}</td>
          <td>${item.attendedPercentage}</td>
        </tr>
      `;
    });

    html += `</table>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${session.currentClass?.Class || 'Class'}_${new Date().toLocaleDateString('vi-VN')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Đóng Sidebar
  document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_sidebar" });
    });
  });

  // --- POLL & EXAM ---
  btnTogglePoll?.addEventListener('click', () => {
    const pollCreator = document.getElementById('poll-creator');
    const isHidden = pollCreator.classList.toggle('hidden');
    btnTogglePoll.innerHTML = isHidden 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  });

  btnToggleExam?.addEventListener('click', () => {
    const examCreator = document.getElementById('exam-creator');
    const isHidden = examCreator.classList.toggle('hidden');
    btnToggleExam.innerHTML = isHidden 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  });

  // --- LOGIC TẠO POLL ---
  const btnAddOption = document.getElementById('btn-add-option');
  const btnCreatePoll = document.getElementById('btn-create-poll');
  const pollOptionsContainer = document.getElementById('poll-options-container');

  btnAddOption?.addEventListener('click', () => {
    const count = pollOptionsContainer.querySelectorAll('.option-item').length + 1;
    const div = document.createElement('div');
    div.className = "option-item";
    div.style.cssText = "display: flex; gap: 4px;";
    div.innerHTML = `<div class="poll-option-rich" contenteditable="true" data-placeholder="Phương án ${count}..." style="flex: 1; min-height: 32px; background: white; padding: 6px 10px; border: 1px solid #f0abfc; border-radius: 6px; font-size: 11px; outline: none;"></div>`;
    pollOptionsContainer.appendChild(div);
  });

  document.querySelectorAll('.btn-rich, .select-rich, .input-rich').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const command = e.target.getAttribute('data-command');
      const value = e.target.value || null;
      document.execCommand(command, false, value);
    });
    if (btn.tagName === 'SELECT' || btn.tagName === 'INPUT') {
      btn.addEventListener('change', (e) => {
        const command = e.target.getAttribute('data-command');
        const value = e.target.value;
        document.execCommand(command, false, value);
      });
    }
  });

  btnCreatePoll?.addEventListener('click', async () => {
    const question = document.getElementById('poll-question').innerText.trim();
    const options = Array.from(document.querySelectorAll('.poll-option-rich')).map(el => el.innerText.trim()).filter(Boolean);
    const duration = document.getElementById('poll-duration').value;

    if (!question || options.length < 2) {
      showStatus("Vui lòng nhập câu hỏi và ít nhất 2 phương án", "error");
      return;
    }

    btnCreatePoll.disabled = true;
    btnCreatePoll.textContent = "Đang khởi tạo...";

    try {
      // 1. Gửi dữ liệu thật lên Firestore qua API
      // 1. Lấy danh sách thành viên hiện tại từ storage để so khớp sau này
      const storage = await new Promise(res => chrome.storage.local.get(['active_session'], res));
      const session = storage.active_session;

      const pollData = {
        question: question,
        options: options,
        duration: parseInt(duration),
        type: 'online_class_poll',
        attendanceList: session?.attendance_list || [],
        classId: session?.currentClass?.Class || 'N/A',
        lecturer: session?.currentClass?.Lecturer || 'N/A'
      };

      const result = await callApi(`${API_BASE}/polls`, 'POST', pollData);
      
      if (result.success) {
        const pollId = result.id;
        const baseUrl = API_BASE.includes('localhost') ? "http://localhost:3000" : "https://nttu-audit.web.app";
        const pollLink = `${baseUrl}/poll/${pollId}`;
        
        document.getElementById('poll-link-text').textContent = pollLink;
        document.getElementById('poll-qr').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(pollLink)}" style="width: 100px; height: 100px;">`;
        
        document.getElementById('poll-creator').classList.add('hidden');
        document.getElementById('poll-result').classList.remove('hidden');
        
        showStatus("Đã tạo bình chọn thành công!", "success");
      } else {
        throw new Error(result.message || "Không thể khởi tạo poll");
      }
    } catch (err) {
      showStatus("Lỗi: " + err.message, "error");
    } finally {
      btnCreatePoll.disabled = false;
      btnCreatePoll.textContent = "TẠO BÌNH CHỌN & ĐẶT GIỜ";
    }
  });

  document.getElementById('btn-copy-poll')?.addEventListener('click', () => {
    const link = document.getElementById('poll-link-text').textContent;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "copy_to_clipboard", text: link }, (resp) => {
        if (resp && resp.success) showStatus("Đã copy link!", "success");
      });
    });
  });

  document.getElementById('btn-send-chat')?.addEventListener('click', () => {
    const question = document.getElementById('poll-question').innerText.trim();
    const link = document.getElementById('poll-link-text').textContent;
    const msg = `📢 BÌNH CHỌN MỚI:\n❓ ${question}\n🔗 Tham gia tại: ${link}`;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "send_to_chat", text: msg }, (resp) => {
        if (resp && resp.success) showStatus("Đã gửi vào chat!", "success");
        else showStatus(resp?.error || "Lỗi gửi chat", "error");
      });
    });
  });

  // Mới: Xem kết quả Bình chọn & Báo cáo
  document.getElementById('btn-view-results')?.addEventListener('click', () => {
    const link = document.getElementById('poll-link-text').textContent;
    if (link) window.open(link, '_blank');
  });


  document.getElementById('btn-new-poll')?.addEventListener('click', () => {
    document.getElementById('poll-result').classList.add('hidden');
    document.getElementById('poll-creator').classList.remove('hidden');
    document.getElementById('poll-question').innerHTML = "";
    pollOptionsContainer.innerHTML = `
      <div class="option-item" style="display: flex; gap: 4px;">
         <div class="poll-option-rich" contenteditable="true" data-placeholder="Phương án 1..." style="flex: 1; min-height: 32px; background: white; padding: 6px 10px; border: 1px solid #f0abfc; border-radius: 6px; font-size: 11px; outline: none;"></div>
      </div>
      <div class="option-item" style="display: flex; gap: 4px;">
         <div class="poll-option-rich" contenteditable="true" data-placeholder="Phương án 2..." style="flex: 1; min-height: 32px; background: white; padding: 6px 10px; border: 1px solid #f0abfc; border-radius: 6px; font-size: 11px; outline: none;"></div>
      </div>
    `;
  });

  // --- LOGIC TẠO EXAM ---
  const btnCreateExam = document.getElementById('btn-create-exam');
  const examMethod = document.getElementById('exam-method');
  const manualQuestionsContainer = document.getElementById('exam-questions-list');
  const btnAddQuestion = document.getElementById('btn-add-exam-question');
  
  examMethod?.addEventListener('change', () => {
    const val = examMethod.value;
    document.getElementById('template-file-container').classList.toggle('hidden', val !== 'template');
    document.getElementById('ai-input-container').classList.toggle('hidden', val !== 'ai');
    document.getElementById('manual-questions-container').classList.toggle('hidden', val !== 'manual');
  });

  document.getElementById('btn-switch-ai-input')?.addEventListener('click', () => {
    const isFile = document.getElementById('exam-ai-content').classList.toggle('hidden');
    document.getElementById('exam-ai-file').classList.toggle('hidden', !isFile);
    document.getElementById('btn-switch-ai-input').textContent = isFile ? "Dùng Văn bản" : "Dùng File";
  });

  btnAddQuestion?.addEventListener('click', () => {
    const qCount = manualQuestionsContainer.children.length + 1;
    const qDiv = document.createElement('div');
    qDiv.className = "manual-q-item";
    qDiv.style.cssText = "background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;";
    qDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-size: 10px; font-weight: bold; color: #1e293b;">Câu hỏi ${qCount}</span>
        <button class="btn-remove-q" style="background: none; border: none; color: #ef4444; font-size: 10px; cursor: pointer;">Xóa</button>
      </div>
      <input type="text" class="q-text" placeholder="Nhập câu hỏi..." style="width: 100%; font-size: 11px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 6px;">
      <div class="q-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
        <input type="text" class="opt-1" placeholder="A. ..." style="font-size: 10px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <input type="text" class="opt-2" placeholder="B. ..." style="font-size: 10px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <input type="text" class="opt-3" placeholder="C. ..." style="font-size: 10px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <input type="text" class="opt-4" placeholder="D. ..." style="font-size: 10px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
      </div>
      <select class="q-correct" style="width: 100%; font-size: 10px; margin-top: 4px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <option value="0">Đáp án đúng: A</option>
        <option value="1">Đáp án đúng: B</option>
        <option value="2">Đáp án đúng: C</option>
        <option value="3">Đáp án đúng: D</option>
      </select>
    `;
    qDiv.querySelector('.btn-remove-q').onclick = () => qDiv.remove();
    manualQuestionsContainer.appendChild(qDiv);
  });

  // Mặc định thêm 1 câu
  if (manualQuestionsContainer && manualQuestionsContainer.children.length === 0) {
    btnAddQuestion?.click();
  }

  btnCreateExam?.addEventListener('click', async () => {
    const method = examMethod.value;
    const type = document.getElementById('exam-type').value;
    const duration = document.getElementById('exam-duration').value;
    const count = parseInt(document.getElementById('exam-question-count').value);
    
    // Lấy tiêu đề bài kiểm tra trực tiếp
    const finalTitle = document.getElementById('exam-title').value.trim();
    
    if (!finalTitle) throw new Error("Vui lòng nhập tên bài kiểm tra");

    let questionsData = [];

    btnCreateExam.disabled = true;
    btnCreateExam.textContent = "Đang xử lý...";

    try {
      if (method === 'manual') {
        const items = document.querySelectorAll('.manual-q-item');
        items.forEach(item => {
          const qText = item.querySelector('.q-text').value.trim();
          const opts = [
            item.querySelector('.opt-1').value.trim(),
            item.querySelector('.opt-2').value.trim(),
            item.querySelector('.opt-3').value.trim(),
            item.querySelector('.opt-4').value.trim()
          ].filter(Boolean);
          const correct = parseInt(item.querySelector('.q-correct').value);
          
          if (qText && opts.length >= 2) {
            questionsData.push({ question: qText, options: opts, correct: correct });
          }
        });
        if (questionsData.length === 0) throw new Error("Vui lòng nhập ít nhất 1 câu hỏi hoàn chỉnh");
      } 
      else if (method === 'ai') {
        let content = document.getElementById('exam-ai-content').value.trim();
        const fileInput = document.getElementById('exam-ai-file');
        let fileData = null;

        if (!content && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          showStatus(`Đang đọc file ${file.name}...`, "info");
          
          fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
              base64: e.target.result.split(',')[1],
              mimeType: file.type,
              name: file.name
            });
            reader.readAsDataURL(file);
          });
        }

        if (!content && !fileData) throw new Error("Vui lòng nhập nội dung hoặc chọn file để AI tạo đề");
        
        showStatus("AI đang phân tích tài liệu và soạn bộ đề...", "info");
        
        const payload = {
          type: type,
          count: count
        };
        if (content) payload.content = content;
        if (fileData) payload.file = fileData;

        const aiResult = await callApi(`${API_BASE}/ai/generate-test`, 'POST', payload);
        
        if (aiResult.success) {
          questionsData = aiResult.data;
        } else {
          throw new Error(aiResult.message || "AI không thể tạo đề lúc này");
        }
      }
      else if (method === 'template') {
        throw new Error("Chức năng Template đang được nâng cấp. Vui lòng dùng AI hoặc Thủ công.");
      }

      // Lưu vào Firestore
      const examData = {
        title: finalTitle,
        classId: currentClass?.Class || 'N/A',
        courseName: currentClass?.Course || 'Trực tuyến',
        type: type,
        duration: parseInt(duration),
        questions: questionsData,
        source: method
      };

      const result = await callApi(`${API_BASE}/exams`, 'POST', examData);
      
      if (result.success) {
        const examId = result.id;
        const baseUrl = API_BASE.includes('localhost') ? "http://localhost:3000" : "https://nttu-audit.web.app";
        const examLink = `${baseUrl}/exam/${examId}`;
        
        document.getElementById('exam-link-text').textContent = examLink;
        document.getElementById('exam-qr').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(examLink)}" style="width: 110px; height: 110px;">`;
        
        document.getElementById('exam-creator').classList.add('hidden');
        document.getElementById('exam-result').classList.remove('hidden');
        
        showStatus("Đã tạo đề kiểm tra thành công!", "success");
      } else {
        throw new Error(result.message || "Không thể lưu đề thi");
      }
    } catch (err) {
      showStatus("Lỗi: " + err.message, "error");
    } finally {
      btnCreateExam.disabled = false;
      btnCreateExam.textContent = "TẠO BÀI KIỂM TRA";
    }
  });

  document.getElementById('btn-copy-exam')?.addEventListener('click', () => {
    const link = document.getElementById('exam-link-text').textContent;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "copy_to_clipboard", text: link }, (resp) => {
        if (resp && resp.success) showStatus("Đã copy link đề thi!", "success");
      });
    });
  });

  document.getElementById('btn-send-exam-chat')?.addEventListener('click', () => {
    const link = document.getElementById('exam-link-text').textContent;
    const duration = document.getElementById('exam-duration').value;
    const msg = `📝 BÀI KIỂM TRA TRỰC TUYẾN:\n⏰ Thời gian: ${duration} phút\n🔗 Truy cập link: ${link}\n⚠️ Lưu ý: Tuyệt đối không thoát trình duyệt trong khi làm bài.`;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "send_to_chat", text: msg }, (resp) => {
        if (resp && resp.success) showStatus("Đã gửi đề vào chat!", "success");
        else showStatus(resp?.error || "Lỗi gửi chat", "error");
      });
    });
  });

  document.getElementById('btn-view-exam-web')?.addEventListener('click', () => {
    const link = document.getElementById('exam-link-text').textContent;
    if (link) window.open(link, '_blank');
  });

  document.getElementById('btn-new-exam')?.addEventListener('click', () => {
    document.getElementById('exam-result').classList.add('hidden');
    document.getElementById('exam-creator').classList.remove('hidden');
  });

  // --- GAME HUB LOGIC ---
  const btnToggleGame = document.getElementById('btn-toggle-game');
  const btnBackMain = document.getElementById('btn-back-main');
  const gameHub = document.getElementById('game-hub');
  const mainSearch = document.getElementById('search-section');
  const classSelection = document.getElementById('class-selection');
  const classInfo = document.getElementById('class-info');

  btnToggleGame?.addEventListener('click', () => {
    gameHub.classList.remove('hidden');
    mainSearch.classList.add('hidden');
    classSelection.classList.add('hidden');
    classInfo.classList.add('hidden');
    initQuiz(); // Mặc định mở Quiz
  });

  btnBackMain?.addEventListener('click', () => {
    gameHub.classList.add('hidden');
    mainSearch.classList.remove('hidden');
    if (currentClass) classInfo.classList.remove('hidden');
    stopSnake();
  });

  // Chuyển đổi giữa các Game Tabs
  document.querySelectorAll('.btn-game-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const gameType = e.target.getAttribute('data-game');
      // Update UI tabs
      document.querySelectorAll('.btn-game-tab').forEach(b => {
        b.classList.remove('active');
        b.style.background = "white";
        b.style.color = "#64748b";
        b.style.borderColor = "#e2e8f0";
      });
      e.target.classList.add('active');
      e.target.style.background = "#fdf2f8";
      e.target.style.color = "#be185d";
      e.target.style.borderColor = "#fbcfe8";

      // Show/Hide game content
      document.querySelectorAll('.game-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`game-${gameType}`).classList.remove('hidden');

      // Init specific game
      if (gameType === 'quiz') initQuiz();
      else if (gameType === 'memory') initMemory();
      else if (gameType === 'snake') initSnake();
      else if (gameType === 'board') initBoard();
      else stopSnake();
    });
  });

  // 1. QUIZ GAME
  let quizScore = 0;
  const questions = [
    { q: "Thủ đô của Việt Nam là gì?", a: ["Hà Nội", "TP.HCM", "Đà Nẵng", "Huế"], c: 0 },
    { q: "Nguyễn Tất Thành ra đi tìm đường cứu nước năm nào?", a: ["1911", "1920", "1930", "1945"], c: 0 },
    { q: "Đại học Nguyễn Tất Thành có mấy cơ sở chính?", a: ["2", "3", "4", "5"], c: 2 },
    { q: "2 + 2 * 2 bằng bao nhiêu?", a: ["8", "6", "4", "10"], c: 1 },
    { q: "Trái đất quay quanh mặt trời mất bao lâu?", a: ["365 ngày", "24 giờ", "30 ngày", "12 tháng"], c: 0 }
  ];

  function initQuiz() {
    quizScore = 0;
    updateQuizScore();
    showQuestion();
  }

  function showQuestion() {
    const qObj = questions[Math.floor(Math.random() * questions.length)];
    const qEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    
    qEl.textContent = qObj.q;
    optionsEl.innerHTML = "";
    
    qObj.a.forEach((opt, index) => {
      const btn = document.createElement('button');
      btn.className = "btn-text";
      btn.style.cssText = "width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: left; background: #f8fafc; cursor: pointer; transition: all 0.2s; font-size: 11px;";
      btn.textContent = opt;
      btn.onclick = () => {
        if (index === qObj.c) {
          quizScore += 10;
          btn.style.background = "#dcfce7";
          btn.style.borderColor = "#22c55e";
          setTimeout(showQuestion, 500);
        } else {
          btn.style.background = "#fee2e2";
          btn.style.borderColor = "#ef4444";
          setTimeout(showQuestion, 500);
        }
        updateQuizScore();
      };
      optionsEl.appendChild(btn);
    });
  }

  function updateQuizScore() {
    document.getElementById('quiz-score').textContent = `Điểm: ${quizScore}`;
  }

  // 2. MEMORY GAME
  let memoryCards = [];
  let flippedCards = [];
  let lockBoard = false;
  const icons = ['🎓', '🏫', '💡', '📚', '⚽', '🎨', '🧪', '🌍'];

  function initMemory() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = "";
    flippedCards = [];
    lockBoard = false;
    
    memoryCards = [...icons, ...icons]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ icon, id, flipped: false, matched: false }));

    memoryCards.forEach((card, index) => {
      const el = document.createElement('div');
      el.className = "memory-card";
      el.style.cssText = "height: 40px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; border: 1px solid #e2e8f0; transition: all 0.3s transform;";
      el.dataset.index = index;
      el.textContent = "?";
      el.onclick = () => flipCard(el, index);
      grid.appendChild(el);
    });
  }

  function flipCard(el, index) {
    if (lockBoard || memoryCards[index].flipped || memoryCards[index].matched) return;

    el.textContent = memoryCards[index].icon;
    el.style.background = "white";
    memoryCards[index].flipped = true;
    flippedCards.push({ el, index });

    if (flippedCards.length === 2) {
      lockBoard = true;
      const [c1, c2] = flippedCards;
      if (memoryCards[c1.index].icon === memoryCards[c2.index].icon) {
        memoryCards[c1.index].matched = true;
        memoryCards[c2.index].matched = true;
        flippedCards = [];
        lockBoard = false;
        c1.el.style.borderColor = "#10b981";
        c2.el.style.borderColor = "#10b981";
      } else {
        setTimeout(() => {
          c1.el.textContent = "?";
          c2.el.textContent = "?";
          c1.el.style.background = "#f1f5f9";
          c2.el.style.background = "#f1f5f9";
          memoryCards[c1.index].flipped = false;
          memoryCards[c2.index].flipped = false;
          flippedCards = [];
          lockBoard = false;
        }, 1000);
      }
    }
  }

  document.getElementById('btn-reset-memory')?.addEventListener('click', initMemory);

  // 3. (REMOVED DUPLICATE)

  // 4. DISCUSSION BOARD CREATOR
  const btnToggleDiscussion = document.getElementById('btn-toggle-discussion');
  const discussionCreator = document.getElementById('discussion-creator');
  const btnCreateDiscussion = document.getElementById('btn-create-discussion');
  const discussionResult = document.getElementById('discussion-result');
  const btnNewDiscussion = document.getElementById('btn-new-discussion');

  btnToggleDiscussion?.addEventListener('click', () => {
    discussionCreator.classList.toggle('hidden');
    btnToggleDiscussion.querySelector('svg').style.transform = discussionCreator.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(45deg)';
    discussionCreator.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  btnCreateDiscussion?.addEventListener('click', async () => {
    const title = document.getElementById('discussion-title').value.trim();
    const content = document.getElementById('discussion-content').value.trim();

    if (!title || !content) {
      showStatus("Vui lòng nhập đầy đủ tiêu đề và nội dung!", "error");
      return;
    }

    btnCreateDiscussion.disabled = true;
    btnCreateDiscussion.textContent = "ĐANG KHỞI TẠO...";

    try {
      const response = await callApi(`${API_BASE}/discussions`, 'POST', {
        title: title,
        studentContent: content,
        authorName: document.getElementById('info-lecturer')?.textContent || "Giảng viên",
        authorEmail: "" // Optional
      });

      if (response && response.success) {
        const boardId = response.id;
        const webUrl = `http://localhost:3000/discussion?id=${boardId}`; // Cấu trúc URL mẫu
        
        // Hiển thị kết quả
        discussionCreator.classList.add('hidden');
        discussionResult.classList.remove('hidden');
        document.getElementById('discussion-link-text').textContent = webUrl;
        
        // Tạo QR Code
        const qrContainer = document.getElementById('discussion-qr');
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(webUrl)}" style="width: 110px; height: 110px;">`;

        // Gắn sự kiện cho các nút hành động
        document.getElementById('btn-copy-discussion').onclick = () => {
          navigator.clipboard.writeText(webUrl);
          showStatus("Đã copy link thảo luận!", "success");
        };

        document.getElementById('btn-send-discussion-chat').onclick = () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "send_to_chat",
                text: `Mời các bạn tham gia thảo luận: ${title}\nLink: ${webUrl}`
              });
              showStatus("Đã gửi link vào khung chat!", "success");
            }
          });
        };

        document.getElementById('btn-view-discussion-web').onclick = () => {
          window.open(webUrl, '_blank');
        };

        showStatus("Khởi tạo bảng thảo luận thành công!", "success");
      }
    } catch (err) {
      showStatus("Lỗi khi tạo bảng: " + err.message, "error");
    } finally {
      btnCreateDiscussion.disabled = false;
      btnCreateDiscussion.textContent = "TẠO BẢNG THẢO LUẬN";
    }
  });

  btnNewDiscussion?.addEventListener('click', () => {
    discussionResult.classList.add('hidden');
    discussionCreator.classList.remove('hidden');
    document.getElementById('discussion-title').value = "";
    document.getElementById('discussion-content').value = "";
  });

  // 5. SNAKE GAME (Keep for fun)
  const canvas = document.getElementById('snake-game');
  const ctx = canvas?.getContext('2d');
  const gridSize = 10;
  let snake = [{ x: 10, y: 10 }];
  let apple = { x: 5, y: 5 };
  let dx = 1, dy = 0;
  let snakeScore = 0;
  let snakeInterval = null;

  function initSnake() {
    snake = [{ x: 10, y: 10 }];
    dx = 1; dy = 0;
    snakeScore = 0;
    updateSnakeScore();
    placeApple();
    drawSnake();
  }

  function startSnake() {
    if (snakeInterval) return;
    snakeInterval = setInterval(moveSnake, 150);
    const btn = document.getElementById('btn-start-snake');
    if (btn) {
        btn.textContent = "Dừng";
        btn.onclick = stopSnake;
    }
  }

  function stopSnake() {
    clearInterval(snakeInterval);
    snakeInterval = null;
    const btn = document.getElementById('btn-start-snake');
    if (btn) {
      btn.textContent = "Bắt đầu";
      btn.onclick = startSnake;
    }
  }

  function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(s => s.x === head.x && s.y === head.y)) {
      alert("Game Over! Điểm của bạn: " + snakeScore);
      initSnake();
      stopSnake();
      return;
    }
    snake.unshift(head);
    if (head.x === apple.x && head.y === apple.y) {
      snakeScore += 5;
      updateSnakeScore();
      placeApple();
    } else {
      snake.pop();
    }
    drawSnake();
  }

  function placeApple() { apple = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) }; }

  function drawSnake() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(apple.x * gridSize, apple.y * gridSize, gridSize - 1, gridSize - 1);
    ctx.fillStyle = "#059669";
    snake.forEach(s => ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize - 1, gridSize - 1));
  }

  function updateSnakeScore() {
    const el = document.getElementById('snake-score');
    if (el) el.textContent = `Điểm: ${snakeScore}`;
  }

  window.addEventListener('keydown', (e) => {
    if (!snakeInterval) return;
    if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; }
    if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; }
    if (e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; }
    if (e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; }
  });

  document.getElementById('btn-start-snake')?.addEventListener('click', startSnake);
});
