// ============================================================================
// ADNOVA NETWORK - FRONTEND v5.0 (لوحة مشرف متكاملة + مهام ديناميكية)
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// 1. 🚀 TELEGRAM WEBAPP & GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.enableClosingConfirmation?.(); }

let currentUser = null;
let currentUserId = null;
let currentPage = "ads";
let adminAuthenticated = false;
let adminToken = null;
let unreadNotifications = 0;
let adPlaying = false;
let currentLanguage = localStorage.getItem("adnova_lang") || "en";
let selectedWithdrawMethod = "paypal";
let tonConnected = false;
let tonWalletAddress = null;

let tasksList = [];
let userCompletedTasks = [];
let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0 };
let pendingWithdrawals = [];
let allUsers = [];

let APP_CONFIG = {
    welcomeBonus: 0.10, referralBonus: 0.50, adReward: 0.01,
    dailyAdLimit: 50, minWithdraw: 10.00, requiredReferrals: 10,
    botUsername: "AdNovaNetworkBot", adminId: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. 💳 طرق السحب (مع SBP)
// ═══════════════════════════════════════════════════════════════════════════

const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", placeholder: "email@example.com", label: "Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", placeholder: "0x...", label: "BSC Address", regex: /^0x[a-fA-F0-9]{40}$/ },
    { id: "ton", name: "TON", icon: "fab fa-telegram", placeholder: "EQ...", label: "TON Address", regex: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/ },
    { id: "sbp", name: "SBP (Russia)", icon: "fas fa-phone", placeholder: "+71234567890", label: "Phone +7", regex: /^\+7\d{10}$/ },
    { id: "mobile", name: "Mobile", icon: "fas fa-mobile-alt", placeholder: "+1234567890", label: "Phone", regex: /^\+\d{10,15}$/ }
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. 🎬 منصات الإعلانات
// ═══════════════════════════════════════════════════════════════════════════

const AD_PLATFORMS = [
    { name: "Monetag", show: () => typeof show_10950362 === "function" ? show_10950362() : Promise.reject() },
    { name: "OnClickA", init: () => { if (typeof window.initCdTma === "function") { window.initCdTma({ id: '6118161' }).then(s => window.showOnClickaAd = s); } }, show: () => window.showOnClickaAd ? window.showOnClickaAd() : Promise.reject() },
    { name: "RichAds", init: () => { if (typeof TelegramAdsController !== "undefined") { window.richadsController = new TelegramAdsController(); window.richadsController.initialize({ pubId: "1009657", appId: "7284", debug: false }); } }, show: () => new Promise((resolve, reject) => { if (!window.richadsController) reject(); window.richadsController.triggerInterstitialVideo?.().then(resolve).catch(reject); }) },
    { name: "Adexium", init: () => { if (typeof AdexiumWidget !== "undefined") { window.adexiumWidget = new AdexiumWidget({ wid: '074d0b62-98c8-430a-8ad9-183693879f0d', adFormat: 'interstitial' }); } }, show: () => new Promise((resolve, reject) => { if (!window.adexiumWidget) reject(); let tid = setTimeout(() => reject(), 15000); window.adexiumWidget.on("adPlaybackCompleted", () => { clearTimeout(tid); resolve(); }); window.adexiumWidget.requestAd("interstitial"); }) }
];

function initAdPlatforms() { AD_PLATFORMS.forEach(p => { if (p.init) try { p.init(); } catch(e) {} }); }
async function showAd() { const shuffled = [...AD_PLATFORMS].sort(() => Math.random() - 0.5); for (const p of shuffled) { try { await p.show(); return true; } catch(e) {} } return false; }

// ═══════════════════════════════════════════════════════════════════════════
// 4. 🌍 الترجمة (10 لغات)
// ═══════════════════════════════════════════════════════════════════════════

const LANGUAGES = [
    { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
    { code: "ar", name: "Arabic", flag: "🇸🇦", dir: "rtl" },
    { code: "ru", name: "Russian", flag: "🇷🇺", dir: "ltr" }
];

const translations = {
    en: { appName: "AdNova Network", watchAdBtn: "Watch Ad", copy: "Copy", success: "Success!", error: "Error!" },
    ar: { appName: "أد نوفا", watchAdBtn: "شاهد إعلان", copy: "نسخ", success: "تم!", error: "خطأ!" },
    ru: { appName: "AdNova Network", watchAdBtn: "Смотреть", copy: "Копировать", success: "Успех!", error: "Ошибка!" }
};

function t(key) { return translations[currentLanguage]?.[key] || translations.en[key] || key; }
function applyLanguage() { document.documentElement.setAttribute("dir", LANGUAGES.find(l => l.code === currentLanguage)?.dir === "rtl" ? "rtl" : "ltr"); document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); }); }
function setLanguage(code) { currentLanguage = code; localStorage.setItem("adnova_lang", code); applyLanguage(); closeLanguageModal(); showToast(t("success"), "success"); }
function openLanguageModal() { document.getElementById("langModal")?.classList.add("open"); }
function closeLanguageModal() { document.getElementById("langModal")?.classList.remove("open"); }

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🔥 بيانات المستخدم
// ═══════════════════════════════════════════════════════════════════════════

function getTelegramUserId() { return tg?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem("adnova_user_id") || "guest_" + Math.random().toString(36).substr(2, 9); }
function getUserName() { return tg?.initDataUnsafe?.user?.first_name || "User"; }
function getUserPhotoUrl() { return tg?.initDataUnsafe?.user?.photo_url || null; }

async function loadAppConfig() {
    try { const res = await fetch("/api/config"); const data = await res.json(); if (data) APP_CONFIG = { ...APP_CONFIG, ...data }; console.log("[AdNova] Config loaded, adminId:", APP_CONFIG.adminId); } catch(e) { console.error(e); }
}

async function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    const today = new Date().toISOString().split("T")[0];
    if (saved) { currentUser = JSON.parse(saved); } else {
        currentUser = { userId: currentUserId, userName: getUserName(), userPhoto: getUserPhotoUrl(), balance: APP_CONFIG.welcomeBonus, totalEarned: APP_CONFIG.welcomeBonus, adsWatched: 0, adsToday: 0, lastAdDate: today, inviteCount: 0, referredBy: null, referrals: [], withdrawals: [], tonWallet: null, withdrawBlocked: false, completedTasks: [], notifications: [{ id: Date.now(), title: "🎉 Welcome!", message: `+$${APP_CONFIG.welcomeBonus} bonus!`, read: false, timestamp: new Date().toISOString() }] };
        saveUserData(); await processReferral();
    }
    if (currentUser.lastAdDate !== today) { currentUser.adsToday = 0; currentUser.lastAdDate = today; saveUserData(); }
    userCompletedTasks = currentUser.completedTasks || [];
    await syncWithFirebase();
    updateUI();
    await loadTasksFromFirebase();
    checkAdminAndShowCrown();
    return currentUser;
}

function saveUserData() { currentUser.completedTasks = userCompletedTasks; localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser)); syncToFirebase(); }
async function syncWithFirebase() { try { const res = await fetch(`/api/users/${currentUserId}`); const data = await res.json(); if (data.success && data.data) { currentUser = { ...currentUser, ...data.data }; userCompletedTasks = currentUser.completedTasks || []; saveUserData(); updateUI(); } } catch(e) {} }
async function syncToFirebase() { try { await fetch(`/api/users/${currentUserId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUserId, userData: currentUser }) }); } catch(e) {} }

// ═══════════════════════════════════════════════════════════════════════════
// 6. 🔗 الإحالة
// ═══════════════════════════════════════════════════════════════════════════

function getReferralLink() { return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`; }
async function processReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    let refCode = urlParams.get("startapp") || tg?.initDataUnsafe?.start_param;
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    if (localStorage.getItem(`ref_processed_${currentUserId}`) === refCode) return;
    try {
        const res = await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referrerId: refCode, newUserId: currentUserId, newUserName: currentUser.userName }) });
        const data = await res.json();
        if (data.success) { currentUser.referredBy = refCode; currentUser.balance += APP_CONFIG.welcomeBonus; currentUser.totalEarned += APP_CONFIG.welcomeBonus; localStorage.setItem(`ref_processed_${currentUserId}`, refCode); saveUserData(); updateUI(); showToast(`🎉 +$${APP_CONFIG.welcomeBonus} bonus!`, "success"); }
    } catch(e) { console.error(e); }
}
function copyInviteLink() { navigator.clipboard.writeText(getReferralLink()); showToast(t("copy"), "success"); }
function shareInviteLink() { const link = getReferralLink(); tg?.openTelegramLink ? tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join AdNova!")}`) : window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}`, "_blank"); }

// ═══════════════════════════════════════════════════════════════════════════
// 7. 🎬 مشاهدة الإعلانات
// ═══════════════════════════════════════════════════════════════════════════

async function watchAd() {
    if (adPlaying) { showToast("Ad playing...", "warning"); return; }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) { showToast("Daily limit reached!", "warning"); return; }
    adPlaying = true;
    const btn = document.getElementById("watchAdBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
    initAdPlatforms();
    let success = 0;
    for (let i = 0; i < 2; i++) { if (await showAd()) success++; }
    if (success === 2) {
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showEarnToast();
        showToast(`+$${APP_CONFIG.adReward.toFixed(2)} added!`, "success");
        await fetch("/api/reward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: tg?.initDataUnsafe || {} }) }).catch(e => console.error);
    } else { showToast("Ad failed, try again", "error"); }
    adPlaying = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn"); }
}

function showEarnToast() { const toast = document.getElementById("earn-toast"); if (toast) { toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3000); } }

// ═══════════════════════════════════════════════════════════════════════════
// 8. 📋 المهام (Dynamic Tasks)
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasksFromFirebase() {
    try { const res = await fetch("/api/tasks"); const data = await res.json(); if (data.success) tasksList = data.tasks; renderTasks(); } catch(e) { console.error(e); }
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    if (tasksList.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><p>No tasks available</p></div>'; return; }
    let html = '<div class="tasks-grid">';
    for (const task of tasksList) {
        const completed = userCompletedTasks.includes(task.id);
        let icon = "fab fa-telegram", action = "join";
        if (task.type === "youtube") icon = "fab fa-youtube";
        else if (task.type === "tiktok") icon = "fab fa-tiktok";
        else if (task.type === "telegram_bot") icon = "fab fa-telegram-plane";
        html += `
            <div class="task-card ${completed ? 'completed' : ''}">
                <div class="task-left"><div class="task-icon"><i class="${icon}"></i></div><div class="task-info"><h4>${task.name}</h4><p>${task.username || task.link || ''}</p></div></div>
                <div class="task-right"><div class="task-reward">+$${task.reward.toFixed(2)}</div>
                ${!completed ? `<button class="task-btn" onclick="verifyTask('${task.id}', '${task.type}', '${task.username || task.link || ''}', ${task.reward})">Complete</button>` : `<span class="task-completed-badge">✅ Completed</span>`}
                </div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function verifyTask(taskId, type, identifier, reward) {
    let url = "";
    if (type === "telegram_channel") url = `https://t.me/${identifier}`;
    else if (type === "telegram_bot") url = `https://t.me/${identifier}`;
    else if (type === "youtube") url = identifier.startsWith("http") ? identifier : `https://youtube.com/@${identifier}`;
    else if (type === "tiktok") url = identifier.startsWith("http") ? identifier : `https://tiktok.com/@${identifier}`;
    if (url) window.open(url, "_blank");
    showToast("Verifying...", "info");
    setTimeout(async () => {
        try {
            const res = await fetch("/api/verify-channel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUserId, channelUsername: identifier, taskId, reward }) });
            const data = await res.json();
            if (data.success) {
                if (!userCompletedTasks.includes(taskId)) { userCompletedTasks.push(taskId); currentUser.balance += reward; currentUser.totalEarned += reward; saveUserData(); updateUI(); renderTasks(); showToast(`+$${reward.toFixed(2)} added!`, "success"); }
            } else { showToast("Please join first", "error"); }
        } catch(e) { showToast("Verification error", "error"); }
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. 💸 السحب
// ═══════════════════════════════════════════════════════════════════════════

function renderWithdrawMethods() {
    const container = document.getElementById("withdrawMethodsContainer");
    if (!container) return;
    container.innerHTML = WITHDRAWAL_METHODS.map(m => `<div class="method-option ${m.id === selectedWithdrawMethod ? "selected" : ""}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')"><i class="${m.icon}"></i><span>${m.name}</span></div>`).join("");
    updateDestinationLabel();
}
function selectWithdrawMethod(methodId) { selectedWithdrawMethod = methodId; document.querySelectorAll(".method-option").forEach(el => el.classList.remove("selected")); document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add("selected"); updateDestinationLabel(); }
function updateDestinationLabel() { const method = WITHDRAWAL_METHODS.find(m => m.id === selectedWithdrawMethod); const label = document.getElementById("wdDestLabel"); const input = document.getElementById("wdDestInput"); if (label && method) label.textContent = method.label; if (input && method) input.placeholder = method.placeholder; }
async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    if (!amount || amount < APP_CONFIG.minWithdraw) { showToast(`Min $${APP_CONFIG.minWithdraw}`, "warning"); return; }
    if (amount > currentUser.balance) { showToast("Insufficient balance", "warning"); return; }
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) { showToast(`Need ${APP_CONFIG.requiredReferrals} referrals`, "warning"); return; }
    if (!destination) { showToast("Enter destination", "warning"); return; }
    const btn = document.getElementById("submitWithdrawBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }
    try {
        const res = await fetch("/api/withdraw/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUserId, userName: currentUser.userName, amount, method: selectedWithdrawMethod, destination }) });
        const data = await res.json();
        if (data.success) { currentUser.balance = data.newBalance; saveUserData(); updateUI(); showToast("Withdrawal submitted!", "success"); document.getElementById("wdAmountInput").value = ""; document.getElementById("wdDestInput").value = ""; }
        else { showToast(data.error, "error"); }
    } catch(e) { showToast("Error", "error"); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t("submitWithdrawal"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. 👑 لوحة المشرف (الكاملة)
// ═══════════════════════════════════════════════════════════════════════════

function checkAdminAndShowCrown() {
    if (APP_CONFIG.adminId && currentUserId === APP_CONFIG.adminId.toString()) {
        const crownBtn = document.getElementById("adminCrownBtn");
        if (crownBtn) crownBtn.style.display = "flex";
    }
}

function showAdminAuth() { document.getElementById("adminAuthModal")?.classList.add("show"); }

async function verifyAdminPassword() {
    const pwd = document.getElementById("adminPasswordInput")?.value;
    const res = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) });
    const data = await res.json();
    if (data.success) { adminAuthenticated = true; adminToken = pwd; localStorage.setItem("admin_token", pwd); document.getElementById("adminAuthModal")?.classList.remove("show"); showAdminPanel(); }
    else { document.getElementById("adminAuthError")?.style.setProperty("display", "block"); }
}

async function showAdminPanel() {
    if (!adminAuthenticated) { showAdminAuth(); return; }
    document.getElementById("adminPanel")?.classList.remove("hidden");
    await loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() { document.getElementById("adminPanel")?.classList.add("hidden"); }

async function loadAdminData() {
    try {
        const headers = { "Authorization": `Bearer ${adminToken}` };
        const statsRes = await fetch("/api/admin/stats", { headers }); const statsData = await statsRes.json(); if (statsData.success) adminStats = statsData.stats;
        const withdrawalsRes = await fetch("/api/admin/pending-withdrawals", { headers }); const withdrawalsData = await withdrawalsRes.json(); if (withdrawalsData.success) pendingWithdrawals = withdrawalsData.withdrawals || [];
        const usersRes = await fetch("/api/admin/users", { headers }); const usersData = await usersRes.json(); if (usersData.success) allUsers = usersData.users || [];
        const tasksRes = await fetch("/api/tasks"); const tasksData = await tasksRes.json(); if (tasksData.success) tasksList = tasksData.tasks || [];
    } catch(e) { console.error(e); }
}

function renderAdminDashboard() {
    const container = document.getElementById("adminContent");
    if (!container) return;
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card" onclick="showAdminSection('stats')"><i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers || 0}</div><div class="stat-label">Total Users</div></div>
            <div class="admin-stat-card" onclick="showAdminSection('pending')"><i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals || 0}</div><div class="stat-label">Pending</div></div>
            <div class="admin-stat-card" onclick="showAdminSection('stats')"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${(adminStats.totalBalance || 0).toFixed(2)}</div><div class="stat-label">Total Balance</div></div>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="showAdminSection('pending')">💸 Pending</button>
            <button class="admin-tab" onclick="showAdminSection('users')">👥 Users</button>
            <button class="admin-tab" onclick="showAdminSection('tasks')">📋 Tasks</button>
            <button class="admin-tab" onclick="showAdminSection('broadcast')">📢 Broadcast</button>
        </div>
        <div id="adminSectionContent"></div>
    `;
    showAdminSection("pending");
}

function showAdminSection(section) {
    const container = document.getElementById("adminSectionContent");
    if (!container) return;
    if (section === "pending") renderPendingWithdrawals(container);
    else if (section === "users") renderUsersList(container);
    else if (section === "tasks") renderTasksManagement(container);
    else if (section === "broadcast") renderBroadcastSection(container);
}

function renderPendingWithdrawals(container) {
    if (pendingWithdrawals.length === 0) { container.innerHTML = '<div class="empty-state">No pending withdrawals</div>'; return; }
    let html = "";
    for (const w of pendingWithdrawals) {
        html += `<div class="admin-card"><div class="admin-card-header"><span>👤 ${w.userName || w.userId}</span><span class="withdraw-amount">$${w.amount?.toFixed(2)}</span></div><div class="admin-card-details"><div>ID: ${w.userId}</div><div>Method: ${w.method}</div><div>Destination: ${w.destination}</div></div><div class="admin-card-actions"><button class="btn-approve" onclick="approveWithdrawal('${w.id}', '${w.userId}', ${w.amount})">✅ Approve</button><button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.userId}', ${w.amount})">❌ Reject</button></div></div>`;
    }
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (allUsers.length === 0) { container.innerHTML = '<div class="empty-state">No users found</div>'; return; }
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search..." onkeyup="filterUsers()"></div>';
    for (const u of allUsers) {
        html += `<div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${u.userName}"><div class="admin-card-header"><span>👤 ${u.userName || "User"}</span><span class="user-balance">💰 $${u.balance?.toFixed(2) || "0.00"}</span></div><div class="admin-card-details"><div>ID: ${u.userId}</div><div>👥 Invites: ${u.inviteCount || 0} | 📺 Ads: ${u.adsWatched || 0}</div></div><div class="admin-card-actions"><button class="btn-add" onclick="adminAddBalance('${u.userId}')">➕ Add</button><button class="btn-remove" onclick="adminRemoveBalance('${u.userId}')">➖ Remove</button><button class="btn-block" onclick="adminBlockUser('${u.userId}')">🔒 Block</button></div></div>`;
    }
    container.innerHTML = html;
}

function renderTasksManagement(container) {
    let html = `<div class="admin-section-header"><h4>Manage Tasks</h4><button class="btn-add-task" onclick="showAddTaskModal()">➕ Add New Task</button></div><div class="tasks-management-list">`;
    for (const task of tasksList) {
        html += `<div class="task-management-card"><div class="task-info"><span class="task-type">${task.type}</span><strong>${task.name}</strong><span>${task.username || task.link || ''}</span><span class="task-reward-admin">$${task.reward.toFixed(2)}</span></div><div class="task-actions"><button class="btn-edit" onclick="editTask('${task.id}')">✏️ Edit</button><button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️ Delete</button></div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}

function renderBroadcastSection(container) {
    container.innerHTML = `<div class="broadcast-section"><textarea id="broadcastMessage" placeholder="Enter message to broadcast..." rows="4"></textarea><button class="btn-broadcast" onclick="sendBroadcast()">📢 Send Broadcast</button><p class="broadcast-hint">Will notify ${adminStats.totalUsers || 0} users</p></div>`;
}

function filterUsers() {
    const term = document.getElementById("userSearchInput")?.value.toLowerCase();
    document.querySelectorAll(".user-card").forEach(card => { card.style.display = (card.getAttribute("data-user-id")?.toLowerCase().includes(term) || card.getAttribute("data-user-name")?.toLowerCase().includes(term)) ? "block" : "none"; });
}

async function approveWithdrawal(id, userId, amount) {
    if (!confirm(`Approve $${amount} withdrawal?`)) return;
    const res = await fetch("/api/admin/approve-withdrawal", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ withdrawalId: id }) });
    const data = await res.json();
    if (data.success) { showToast("Approved!", "success"); location.reload(); } else { showToast("Failed: " + data.error, "error"); }
}

async function rejectWithdrawal(id, userId, amount) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    if (!confirm(`Reject $${amount} withdrawal?`)) return;
    const res = await fetch("/api/admin/reject-withdrawal", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ withdrawalId: id, reason }) });
    const data = await res.json();
    if (data.success) { showToast("Rejected!", "success"); location.reload(); } else { showToast("Failed: " + data.error, "error"); }
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt("Amount to add (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/add-balance", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ userId, amount }) });
    const data = await res.json();
    if (data.success) { showToast(`+$${amount} added!`, "success"); location.reload(); } else { showToast("Failed: " + data.error, "error"); }
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt("Amount to remove (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/remove-balance", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ userId, amount }) });
    const data = await res.json();
    if (data.success) { showToast(`-$${amount} removed!`, "success"); location.reload(); } else { showToast("Failed: " + data.error, "error"); }
}

async function adminBlockUser(userId) {
    if (!confirm("⚠️ PERMANENTLY block this user from withdrawals?")) return;
    const res = await fetch("/api/admin/block-user", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ userId }) });
    const data = await res.json();
    if (data.success) { showToast("User blocked!", "success"); location.reload(); } else { showToast("Failed: " + data.error, "error"); }
}

async function sendBroadcast() {
    const message = document.getElementById("broadcastMessage")?.value;
    if (!message) { showToast("Enter a message", "warning"); return; }
    const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ message }) });
    const data = await res.json();
    if (data.success) { showToast(`Broadcast sent to ${data.notifiedCount} users!`, "success"); document.getElementById("broadcastMessage").value = ""; } else { showToast("Failed: " + data.error, "error"); }
}

function showAddTaskModal() {
    const type = prompt("Task type (telegram_channel / telegram_bot / youtube / tiktok):");
    if (!type) return;
    const name = prompt("Task name:");
    if (!name) return;
    const identifier = prompt("Username or link:");
    if (!identifier) return;
    const reward = parseFloat(prompt("Reward amount (USD):"));
    if (isNaN(reward) || reward <= 0) return;
    addTaskToFirebase({ type, name, username: identifier, link: identifier, reward, resetPeriod: "once" });
}

async function addTaskToFirebase(task) {
    const res = await fetch("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify(task) });
    const data = await res.json();
    if (data.success) { showToast("Task added!", "success"); await loadTasksFromFirebase(); await loadAdminData(); showAdminSection("tasks"); } else { showToast("Failed: " + data.error, "error"); }
}

async function editTask(taskId) {
    const newReward = parseFloat(prompt("New reward amount (USD):"));
    if (isNaN(newReward) || newReward <= 0) return;
    const res = await fetch(`/api/admin/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }, body: JSON.stringify({ reward: newReward }) });
    const data = await res.json();
    if (data.success) { showToast("Task updated!", "success"); await loadTasksFromFirebase(); await loadAdminData(); showAdminSection("tasks"); } else { showToast("Failed: " + data.error, "error"); }
}

async function deleteTask(taskId) {
    if (!confirm("Delete this task permanently?")) return;
    const res = await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` } });
    const data = await res.json();
    if (data.success) { showToast("Task deleted!", "success"); await loadTasksFromFirebase(); await loadAdminData(); showAdminSection("tasks"); } else { showToast("Failed: " + data.error, "error"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. 🔔 الإشعارات
// ═══════════════════════════════════════════════════════════════════════════

function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge && currentUser) { const unread = currentUser.notifications?.filter(n => !n.read).length || 0; badge.textContent = unread; badge.style.display = unread > 0 ? "flex" : "none"; }
}
function renderNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container || !currentUser) return;
    const notifs = currentUser.notifications || [];
    if (notifs.length === 0) { container.innerHTML = '<div class="empty-state">No notifications</div>'; return; }
    let html = "";
    for (const n of notifs) { html += `<div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead('${n.id}')"><div class="notification-icon ${n.type || 'info'}"><i class="fas fa-bell"></i></div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-message">${n.message}</div><div class="notification-time">${new Date(n.timestamp).toLocaleString()}</div></div></div>`; }
    container.innerHTML = html;
}
function markNotificationRead(id) { const n = currentUser.notifications?.find(n => n.id == id); if (n && !n.read) { n.read = true; saveUserData(); updateNotificationBadge(); renderNotifications(); } }
function clearReadNotifications() { if (!currentUser.notifications) return; currentUser.notifications = currentUser.notifications.filter(n => !n.read); saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("Cleared", "success"); }
function clearAllNotifications() { currentUser.notifications = []; saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("All cleared", "success"); }
function showNotificationsModal() { renderNotifications(); document.getElementById("notificationsModal")?.classList.add("show"); }
function closeNotificationsModal() { document.getElementById("notificationsModal")?.classList.remove("show"); }

// ═══════════════════════════════════════════════════════════════════════════
// 12. 💎 TON Connect
// ═══════════════════════════════════════════════════════════════════════════

async function connectTONWallet() {
    if (tonConnected && window.tonConnectUI) { try { await window.tonConnectUI.disconnect(); } catch(e) {} tonConnected = false; tonWalletAddress = null; if (currentUser) { currentUser.tonWallet = null; saveUserData(); } updateTONUI(); showToast("Disconnected", "info"); return; }
    if (!window.tonConnectUI) { showToast("TON Connect not ready", "error"); return; }
    try { await window.tonConnectUI.openModal(); const interval = setInterval(() => { if (window.tonConnectUI.wallet) { clearInterval(interval); tonConnected = true; tonWalletAddress = window.tonConnectUI.wallet.account.address; if (currentUser) { currentUser.tonWallet = tonWalletAddress; saveUserData(); } updateTONUI(); showToast("Connected!", "success"); } }, 500); setTimeout(() => clearInterval(interval), 30000); } catch(e) { showToast("Connection failed", "error"); }
}
function updateTONUI() { const status = document.getElementById("tonWalletStatus"); const btn = document.getElementById("connectTONBtn"); if (status) status.textContent = (tonConnected && tonWalletAddress) ? tonWalletAddress.slice(0,6)+"..."+tonWalletAddress.slice(-6) : "Not connected"; if (btn) btn.textContent = tonConnected ? "Disconnect TON" : "Connect TON"; }

// ═══════════════════════════════════════════════════════════════════════════
// 13. 🎨 تحديث الواجهة
// ═══════════════════════════════════════════════════════════════════════════

function updateUI() {
    if (!currentUser) return;
    const balance = document.getElementById("balance"); if (balance) balance.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    const progressFill = document.getElementById("adProgressFill"); if (progressFill) progressFill.style.width = `${((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100}%`;
    const progressLabel = document.getElementById("adProgressLabel"); if (progressLabel) progressLabel.textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    const totalAds = document.getElementById("totalAdsWatched"); if (totalAds) totalAds.innerHTML = `${currentUser.adsWatched || 0} <span>ads</span>`;
    const totalEarned = document.getElementById("totalAdsEarned"); if (totalEarned) totalEarned.textContent = `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`;
    const totalInvites = document.getElementById("totalInvites"); if (totalInvites) totalInvites.textContent = currentUser.inviteCount || 0;
    const inviteEarned = document.getElementById("totalEarnedFromInvites"); if (inviteEarned) inviteEarned.textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    const inviteLink = document.getElementById("inviteLink"); if (inviteLink) inviteLink.textContent = getReferralLink();
    const availBalance = document.getElementById("wdAvailBalance"); if (availBalance) availBalance.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    const userName = document.getElementById("userName"); if (userName) userName.textContent = currentUser.userName || "User";
    const userChatId = document.getElementById("userChatId"); if (userChatId) userChatId.textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`;
    const avatarSpan = document.getElementById("userAvatarText"); const avatarImg = document.getElementById("userAvatarImg");
    if (currentUser.userPhoto && avatarImg) { avatarImg.src = currentUser.userPhoto; avatarImg.style.display = "block"; if (avatarSpan) avatarSpan.style.display = "none"; }
    else if (avatarSpan) { avatarSpan.textContent = (currentUser.userName || "U").charAt(0).toUpperCase(); avatarSpan.style.display = "flex"; if (avatarImg) avatarImg.style.display = "none"; }
    updateNotificationBadge(); updateTONUI();
}

function refreshCurrentPage() { if (currentPage === "tasks") renderTasks(); else if (currentPage === "invite") { const link = document.getElementById("inviteLink"); if (link) link.textContent = getReferralLink(); } else if (currentPage === "withdraw") renderWithdrawMethods(); }
function switchTab(page) { currentPage = page; document.querySelectorAll(".page").forEach(p => p.classList.remove("active")); document.getElementById(`page-${page}`)?.classList.add("active"); document.querySelectorAll(".nav-item").forEach(item => { item.classList.remove("active"); if (item.getAttribute("data-page") === page) item.classList.add("active"); }); if (page === "tasks") renderTasks(); else if (page === "invite") refreshCurrentPage(); else if (page === "withdraw") renderWithdrawMethods(); }

// ═══════════════════════════════════════════════════════════════════════════
// 14. 🍞 Toast
// ═══════════════════════════════════════════════════════════════════════════

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-inner"><span class="toast-icon">${type === "success" ? "✓" : "ℹ"}</span><span class="toast-msg">${message}</span><div class="toast-bar"></div></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. 🚀 التهيئة
// ═══════════════════════════════════════════════════════════════════════════

function hideSplash() { document.getElementById("splash-screen")?.style.setProperty("display", "none"); document.getElementById("mainContent")?.style.setProperty("display", "block"); }
async function init() {
    console.log("[AdNova] Initializing...");
    await loadAppConfig();
    applyLanguage();
    await loadUserData();
    renderWithdrawMethods();
    initAdPlatforms();
    if (typeof TON_CONNECT_UI !== "undefined") {
        try { window.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: window.location.origin + "/tonconnect-manifest.json", buttonRootId: "tonConnectButton" }); const restored = await window.tonConnectUI.connectionRestored; if (restored && window.tonConnectUI.wallet) { tonConnected = true; tonWalletAddress = window.tonConnectUI.wallet.account.address; updateTONUI(); } } catch(e) { console.error(e); }
    }
    setTimeout(hideSplash, 500);
    setInterval(() => { if (currentUser) { const today = new Date().toISOString().split("T")[0]; if (currentUser.lastAdDate !== today) { currentUser.adsToday = 0; currentUser.lastAdDate = today; saveUserData(); updateUI(); } } }, 60000);
}
setTimeout(hideSplash, 3000);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

// ═══════════════════════════════════════════════════════════════════════════
// 16. 🌐 الدوال العالمية
// ═══════════════════════════════════════════════════════════════════════════

window.switchTab = switchTab;
window.openLanguageModal = openLanguageModal;
window.closeLanguageModal = closeLanguageModal;
window.setLanguage = setLanguage;
window.watchAd = watchAd;
window.verifyTask = verifyTask;
window.copyInviteLink = copyInviteLink;
window.shareInviteLink = shareInviteLink;
window.submitWithdraw = submitWithdraw;
window.selectWithdrawMethod = selectWithdrawMethod;
window.showAdminPanel = showAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.verifyAdminPassword = verifyAdminPassword;
window.showAdminSection = showAdminSection;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.adminAddBalance = adminAddBalance;
window.adminRemoveBalance = adminRemoveBalance;
window.adminBlockUser = adminBlockUser;
window.filterUsers = filterUsers;
window.sendBroadcast = sendBroadcast;
window.showAddTaskModal = showAddTaskModal;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.connectTONWallet = connectTONWallet;

console.log("[AdNova] Platform ready | Admin ID:", APP_CONFIG.adminId);
