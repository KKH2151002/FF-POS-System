let currentMode = 'inspect';
let tempItems = []; 
let isCameraRunning = false;
// 스캔 중복 실행 방지를 위한 플래그
let isScanning = false; 

const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 20, qrbox: { width: 250, height: 150 } };

// 페이지 로드 시 카메라 시작
window.onload = () => { manageCamera('start'); };

// 사이드바 토글
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// 카메라 제어 (시작/중지)
function manageCamera(action) {
    const readerDiv = document.getElementById('reader');
    if (action === 'stop' && isCameraRunning) {
        html5QrCode.stop().then(() => { 
            readerDiv.style.display = 'none'; 
            isCameraRunning = false; 
        });
    } else if (action === 'start' && !isCameraRunning) {
        readerDiv.style.display = 'block';
        html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess)
            .then(() => { isCameraRunning = true; })
            .catch(err => alert("카메라 권한을 확인해주세요."));
    }
}

// 메뉴 모드 전환
window.setMode = function(mode) {
    currentMode = mode;
    // 사이드바 UI 업데이트
    document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + 'ModeBtn').classList.add('active');

    // 섹션 전환
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    
    if (mode === 'inspect') {
        document.getElementById('inspectSection').classList.add('active');
        manageCamera('start');
    } else if (mode === 'inventory') {
        document.getElementById('inventorySection').classList.add('active');
        manageCamera('stop');
        updateInventoryList();
    } else if (mode === 'sale') {
        document.getElementById('inspectSection').classList.add('active'); 
        manageCamera('start');
    } else if (mode === 'alert') {
        document.getElementById('alertSectionPage').classList.add('active');
        manageCamera('stop');
        checkExpiredAlerts();
    } else if (mode === 'disposed') {
        document.getElementById('disposedSection').classList.add('active');
        manageCamera('stop');
        updateDisposedList();
    } else if (mode === 'analysis') {
        document.getElementById('analysisSection').classList.add('active');
        manageCamera('stop');
        updateAnalysis();
    }
    toggleSidebar();
}

// [조회] 전체 재고 목록 업데이트
function updateInventoryList() {
    fetch('/api/inventory').then(res => res.json()).then(data => {
        const list = document.getElementById('inventoryList');
        if (!data || data.length === 0) { 
            list.innerHTML = '<tr><td colspan="3">재고 없음 📦</td></tr>'; 
            return; 
        }
        list.innerHTML = data.map(i => {
            const date = new Date(i.expiration_date);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}시`;
            return `<tr><td style="text-align:left;">${i.item_name}</td><td>${dateStr}</td><td>${i.quantity}</td></tr>`;
        }).join('');
    });
}

// [조회] 폐기 알림 확인
function checkExpiredAlerts() {
    fetch('/api/alerts').then(res => res.json()).then(data => {
        const list = document.getElementById('alertListPage');
        if (data.length === 0) { 
            list.innerHTML = '<p style="text-align:center;">폐기 대상 없음 😊</p>'; 
            return; 
        }
        list.innerHTML = data.map(i => {
            let color = '#dc3545'; // default (빨간색 - 골든타임)
            let stageBadge = '<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🚨 골든타임</span>';
            
            if (i.minutes_left > 30) {
                color = '#ffc107'; // 노란색 - 관심
                stageBadge = '<span style="background:#ffc107; color:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🟡 관심</span>';
            } else if (i.minutes_left > 10) {
                color = '#fd7e14'; // 주황색 - 주의
                stageBadge = '<span style="background:#fd7e14; color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🟠 주의</span>';
            }

            return `
            <div class="alert-card" style="border-left: 5px solid ${color}; padding: 10px; margin-bottom: 5px; background: white; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>${stageBadge}<strong>${i.item_name}</strong></div>
                    <div style="color:${color}; font-weight:bold;">
                        ${i.minutes_left < 0 ? '경과' : '남음'} ${Math.abs(i.minutes_left)}분
                    </div>
                </div>
                <button onclick="disposeItem(${i.id}, '${i.item_name.replace(/'/g, "\\'")}')" style="margin-top: 10px; padding: 12px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%; font-size: 1rem; font-weight: bold;">
                    🗑️ 폐기등록
                </button>
            </div>`;
        }).join('');
    });
}

// [조회] 폐기 내역 업데이트
function updateDisposedList() {
    fetch('/api/disposed').then(res => res.json()).then(data => {
        const list = document.getElementById('disposedList');
        if (!data || data.length === 0) { 
            list.innerHTML = '<tr><td colspan="3">폐기 내역 없음 🗑️</td></tr>'; 
            return; 
        }
        list.innerHTML = data.map(i => {
            const date = new Date(i.expiration_date);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}시`;
            return `<tr><td style="text-align:left;">${i.item_name}</td><td>${dateStr}</td><td>${i.quantity}</td></tr>`;
        }).join('');
    });
}

// [추가] 폐기 처리 함수
window.disposeItem = function(id, itemName) {
    if(!confirm(`'${itemName}' 항목을 폐기 처리하시겠습니까?`)) return;

    fetch('/api/dispose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        checkExpiredAlerts(); // 목록 갱신
    })
    .catch(err => {
        console.error("폐기 에러:", err);
        alert("폐기 처리 중 오류가 발생했습니다.");
    });
}

// [이벤트] Flatpickr 달력 초기화 및 날짜 변경 이벤트
fetch('/api/holidays').then(res => res.json()).then(holidays => {
    flatpickr("#analysisDate", {
        locale: "ko",
        defaultDate: new Date(),
        onChange: function(selectedDates, dateStr, instance) {
            updateAnalysis(dateStr);
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // 요일 확인 (0: 일요일, 6: 토요일)
            const day = dayElem.dateObj.getDay();
            if (day === 0) dayElem.classList.add("is-sunday");
            else if (day === 6) dayElem.classList.add("is-saturday");
            
            // 공휴일 확인 (YYYY-MM-DD 형식 매칭)
            const dateString = dayElem.dateObj.getFullYear() + "-" + 
                               String(dayElem.dateObj.getMonth()+1).padStart(2,'0') + "-" + 
                               String(dayElem.dateObj.getDate()).padStart(2,'0');
            if (holidays.includes(dateString)) {
                dayElem.classList.add("is-holiday");
            }
        }
    });
}).catch(err => {
    console.error("공휴일 로드 오류:", err);
    // 실패 시 기본 이벤트 등록
    document.getElementById('analysisDate').addEventListener('change', (e) => {
        updateAnalysis(e.target.value);
    });
});

let barChartInstance = null;
let pieChartInstance = null;

// [조회] 일일 분석 리포트 업데이트 (선택 날짜 기준)
function updateAnalysis(dateString) {
    if (!dateString) {
        const today = new Date();
        dateString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        document.getElementById('analysisDate').value = dateString;
    }

    fetch('/api/analysis/daily?date=' + dateString).then(res => res.json()).then(data => {
        const list = document.getElementById('analysisList');
        
        let totalRevenue = 0;
        const labels = [];
        const soldData = [];
        const expiredData = [];
        const revenueData = [];

        if (data.length === 0) {
            list.innerHTML = '<tr><td colspan="5">해당 날짜의 데이터가 없습니다.</td></tr>';
            document.getElementById('totalRevenueDisplay').innerText = '0원';
            if(barChartInstance) barChartInstance.destroy();
            if(pieChartInstance) pieChartInstance.destroy();
        } else {
            list.innerHTML = data.map(i => {
                const itemRevenue = parseInt(i.total_revenue) || 0;
                totalRevenue += itemRevenue;
                
                // 차트 데이터 추가
                labels.push(i.item_name);
                soldData.push(i.sold_count);
                expiredData.push(i.expired_count);
                revenueData.push(itemRevenue);

                return `
                <tr>
                    <td style="text-align:left;">${i.item_name}</td>
                    <td>${i.total_in}</td>
                    <td style="color:blue; font-weight:bold;">${i.sold_count}</td>
                    <td style="color:red; font-weight:bold;">${i.expired_count}</td>
                    <td style="color:#28a745; font-weight:bold;">${itemRevenue.toLocaleString()}원</td>
                </tr>`;
            }).join('');
            
            document.getElementById('totalRevenueDisplay').innerText = `${totalRevenue.toLocaleString()}원`;
            renderCharts(labels, soldData, expiredData, revenueData);
        }
    });

    // 지능형 발주 추천/경고 가져오기
    fetch('/api/recommendation').then(res => res.json()).then(data => {
        const alertBox = document.getElementById('recommendationAlerts');
        if (data.length === 0) {
            alertBox.innerHTML = '<div style="padding: 10px; background: #e7f1ff; border-radius: 5px; text-align: center; color: #007bff; font-weight: bold;">💡 안심하세요! 반복적으로 폐기되는 상품 데이터가 없습니다.</div>';
        } else {
            const itemsHtml = data.map(i => {
                const cleanMsg = i.message.replace('🚨 경고: ', '');
                return `<div class="smart-alert-item">${cleanMsg}</div>`;
            }).join('');
            
            alertBox.innerHTML = `
                <div class="smart-alert-bar">
                    <div class="smart-alert-bar-title">🚨 스마트 발주 추천 및 경고</div>
                    ${itemsHtml}
                </div>
            `;
        }
    });
}

// [추가] 대시보드 차트 렌더링 함수
function renderCharts(labels, soldData, expiredData, revenueData) {
    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();

    // 1. 판매 vs 폐기 막대 차트
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '판매량 (개)',
                    data: soldData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    maxBarThickness: 40
                },
                {
                    label: '폐기량 (개)',
                    data: expiredData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    maxBarThickness: 40
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true, offset: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                title: { display: true, text: '📈 상품별 판매 vs 폐기 현황', font: { size: 16 } }
            }
        }
    });

    // 2. 매출 비중 원형 차트
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: revenueData,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926', '#1982C4'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: '💰 상품별 매출 기여도', font: { size: 16 } }
            }
        }
    });
}

// [핵심] 바코드 스캔 성공 시 실행되는 함수
function onScanSuccess(decodedText) {
    if (isScanning) return; // 중복 실행 방지
    isScanning = true; 

    if (currentMode === 'inspect') {
        html5QrCode.pause(); // 카메라 일시정지

        fetch('/api/inspect', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ barcode: decodedText }) 
        })
        .then(res => res.json())
        .then(data => {
            // 사용자가 '확인'을 누를 때만 목록에 추가 또는 수량 증가
            if (confirm(`${data.itemName}을(를) 추가하시겠습니까?`)) {
                const existing = tempItems.find(i => i.barcode === data.barcode);
                if (!existing) {
                    data.quantity = 1; 
                    tempItems.push(data);
                } else {
                    existing.quantity += 1;
                }
                renderList();
            }
            html5QrCode.resume(); // 카메라 재개
            isScanning = false;
        })
        .catch(err => {
            console.error("검수 에러:", err);
            html5QrCode.resume();
            isScanning = false;
        });

    } else if (currentMode === 'sale') {
        html5QrCode.pause();
        fetch('/api/sale', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ barcode: decodedText }) 
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            html5QrCode.resume();
            isScanning = false;
        })
        .catch(err => {
            console.error("판매 에러:", err);
            html5QrCode.resume();
            isScanning = false;
        });
    }
}

// [수정] 입고 검수 목록 렌더링 (수량 수정 UI 포함)
function renderList() {
    const listBody = document.getElementById('inspectList');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    finalizeBtn.disabled = tempItems.length === 0;

    listBody.innerHTML = tempItems.map((item, index) => `
        <tr>
            <td style="text-align:left;">${item.itemName}</td>
            <td>${item.expectedQty}</td>
            <td>
                <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <button onclick="changeQty(${index}, -1)" style="padding: 2px 8px; border: 1px solid #ccc; background: #fff; border-radius: 4px;">-</button>
                    <input type="number" 
                           value="${item.quantity}" 
                           min="1" 
                           onchange="updateQty(${index}, this.value)" 
                           style="width: 45px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;">
                    <button onclick="changeQty(${index}, 1)" style="padding: 2px 8px; border: 1px solid #ccc; background: #fff; border-radius: 4px;">+</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// [추가] 수량 직접 입력 처리
window.updateQty = function(index, value) {
    const newQty = parseInt(value);
    if (newQty > 0) {
        tempItems[index].quantity = newQty;
    } else {
        tempItems[index].quantity = 1;
        renderList();
    }
};

// [추가] 버튼 클릭 수량 조절
window.changeQty = function(index, delta) {
    const newQty = tempItems[index].quantity + delta;
    if (newQty > 0) {
        tempItems[index].quantity = newQty;
        renderList();
    }
};

// [실행] 검수 완료 및 DB 저장
document.getElementById('finalizeBtn').onclick = () => {
    if (tempItems.length === 0) return;

    fetch('/api/finalize', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(tempItems) 
    })
    .then(res => res.json())
    .then(data => { 
        alert(data.message); 
        tempItems = []; 
        renderList(); 
    })
    .catch(err => alert("저장 중 오류가 발생했습니다."));
};

// ==========================================
// [기능 9주차] 푸시 알림 및 사운드 기능
// ==========================================
let isNotificationEnabled = false;
let pollingInterval = null;
const notifiedItems = new Map(); // 상품별 발송된 최고 알림 단계 저장 (1: 관심, 2: 주의, 3: 골든타임)

// 구글 제공 알람 사운드 사용
const alertSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

window.toggleNotifications = function() {
    if (!("Notification" in window)) {
        alert("이 브라우저는 데스크톱 알림을 지원하지 않습니다.");
        return;
    }

    if (isNotificationEnabled) {
        stopBackgroundMonitoring();
    } else {
        if (Notification.permission === "granted") {
            startBackgroundMonitoring();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    startBackgroundMonitoring();
                }
            });
        } else {
            alert("알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.");
        }
    }
};

function startBackgroundMonitoring() {
    isNotificationEnabled = true;
    
    // 버튼 UI 변경
    const btn = document.getElementById('notiBtn');
    btn.innerText = "🔔 알림 작동 중";
    btn.style.background = "#28a745"; // 녹색으로 변경

    // 사운드 재생 테스트
    alertSound.play().catch(e => console.log("오디오 재생 오류:", e));
    new Notification("FF POS 알림", { body: "실시간 폐기 모니터링이 시작되었습니다!" });

    // 1분(60000ms)마다 백그라운드 체크
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollAlerts, 60000);
    
    // 즉시 1회 실행
    pollAlerts();
}

function stopBackgroundMonitoring() {
    isNotificationEnabled = false;
    
    const btn = document.getElementById('notiBtn');
    btn.innerText = "🔕 알림 꺼짐";
    btn.style.background = "#6c757d"; // 회색으로 변경
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function pollAlerts() {
    fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) return;

            data.forEach(item => {
                // 알림 조건: 유통기한 앞뒤 1시간 이내 (-60분 <= 남은 시간 <= 60분)
                // 이미 폐기/판매 처리된 상품은 API 자체에서(status='selling') 걸러짐
                if (item.minutes_left <= 60 && item.minutes_left >= -60) {
                    let currentStage = 3; // 기본 3단계: 골든타임
                    if (item.minutes_left > 30) currentStage = 1;      // 1단계: 관심
                    else if (item.minutes_left > 10) currentStage = 2; // 2단계: 주의

                    const lastNotifiedStage = notifiedItems.get(item.id) || 0;
                    
                    // 현재 단계가 이전에 알림 보낸 단계보다 높을 경우에만 알림 발송
                    if (currentStage > lastNotifiedStage) {
                        notifiedItems.set(item.id, currentStage);
                        sendPushNotification(item.item_name, item.minutes_left, currentStage);
                    }
                }
            });
        })
        .catch(err => console.error("백그라운드 알림 폴링 에러:", err));
}

function sendPushNotification(itemName, minutesLeft, stage) {
    // 사운드 재생
    alertSound.play().catch(e => console.log("백그라운드 오디오 재생 오류:", e));

    let title = "🚨 폐기 임박 경고!";
    if (stage === 1) title = "🟡 폐기 관심 (60분 미만)";
    else if (stage === 2) title = "🟠 폐기 주의 (30분 미만)";
    else if (stage === 3) title = "🚨 골든타임! (10분 미만)";

    // 브라우저 푸시 알림 (진동 옵션 포함)
    const options = {
        body: `[${itemName}] 상품의 유통기한이 ${minutesLeft}분 남았습니다. 즉시 확인해주세요!`,
        icon: "icon.png",
        vibrate: [200, 100, 200, 100, 200] // 징- 징- 징- (스마트폰 진동 패턴)
    };
    new Notification(title, options);
}