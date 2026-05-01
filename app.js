// ============================================================================
// ADNOVA NETWORK - FRONTEND v4.0 (النسخة الأسطورية)
// ============================================================================
// منصة احترافية لمشاهدة الإعلانات وكسب المال الحقيقي
// الميزات: إحالات، مهام متجددة، سحب متعدد، لوحة مشرف متطورة، 10 لغات
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// 1. 🚀 تهيئة Telegram WebApp
// ═══════════════════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    console.log("[AdNova] Telegram WebApp initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. 📦 الحالة العامة للتطبيق (Global State)
// ═══════════════════════════════════════════════════════════════════════════

let currentUser = null;
let currentUserId = null;
let currentPage = "ads";
let adminAuthenticated = false;
let unreadNotifications = 0;
let adPlaying = false;
let currentLanguage = localStorage.getItem("adnova_lang") || "en";
let selectedWithdrawMethod = "paypal";
let adPlatformsInitialized = false;
let tonConnected = false;
let tonWalletAddress = null;
let tasksList = [];           // المهام المتجددة من Firebase
let userCompletedTasks = [];  // المهام التي أكملها المستخدم

// إعدادات التطبيق (سيتم جلبها من الخادم)
let APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkBot",
    adminId: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. 💳 طرق الدفع المدعومة (مع إضافة SBP الروسية)
// ═══════════════════════════════════════════════════════════════════════════

const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", placeholder: "example@email.com", label: "Email address", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "skrill", name: "Skrill", icon: "fab fa-skrill", placeholder: "example@email.com", label: "Email address", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "payoneer", name: "Payoneer", icon: "fas fa-building", placeholder: "example@email.com", label: "Email address", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", placeholder: "0x...", label: "Wallet address (BSC)", regex: /^0x[a-fA-F0-9]{40}$/ },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", placeholder: "T...", label: "Wallet address (TRC20)", regex: /^T[a-zA-Z0-9]{33}$/ },
    { id: "ton", name: "TON", icon: "fab fa-telegram", placeholder: "EQ...", label: "TON wallet address", regex: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/ },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", placeholder: "+1234567890", label: "Phone number", regex: /^\+\d{10,15}$/ },
    { id: "sbp", name: "SBP (Russia)", icon: "fas fa-phone", placeholder: "+71234567890", label: "Phone number (+7)", regex: /^\+7\d{10}$/ },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", placeholder: "Player ID", label: "Player ID", regex: /^[a-zA-Z0-9]{5,20}$/ },
    { id: "freefire", name: "Free Fire", icon: "fas fa-fire", placeholder: "Player ID", label: "Player ID", regex: /^[a-zA-Z0-9]{5,20}$/ }
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. 🎬 منصات الإعلانات (5 منصات احترافية)
// ═══════════════════════════════════════════════════════════════════════════

const AD_PLATFORMS = [
    {
        name: "Monetag",
        show: () => typeof show_10950362 === "function" ? show_10950362() : Promise.reject("Monetag not ready")
    },
    {
        name: "OnClickA",
        init: () => { if (typeof window.initCdTma === "function") { window.initCdTma({ id: '6118161' }).then(s => window.showOnClickaAd = s); } },
        show: () => window.showOnClickaAd ? window.showOnClickaAd() : Promise.reject("OnClickA not ready")
    },
    {
        name: "RichAds",
        init: () => { if (typeof TelegramAdsController !== "undefined") { window.richadsController = new TelegramAdsController(); window.richadsController.initialize({ pubId: "1009657", appId: "7284", debug: false }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.richadsController) reject("RichAds not ready");
            let resolved = false;
            let tid = setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.richadsController.triggerInterstitialVideo?.().then(() => { resolved = true; clearTimeout(tid); resolve(); }).catch(reject);
        })
    },
    {
        name: "Adexium",
        init: () => { if (typeof AdexiumWidget !== "undefined") { window.adexiumWidget = new AdexiumWidget({ wid: '074d0b62-98c8-430a-8ad9-183693879f0d', adFormat: 'interstitial' }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.adexiumWidget) reject("Adexium not ready");
            let resolved = false;
            let tid = setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.adexiumWidget.on("adPlaybackCompleted", () => { if (!resolved) { resolved = true; clearTimeout(tid); resolve(); } });
            window.adexiumWidget.on("adClosed", () => { if (!resolved) reject("Closed"); });
            window.adexiumWidget.requestAd("interstitial");
        })
    },
    {
        name: "AdsGram",
        init: () => { if (typeof AdsgramController === "undefined" && typeof Adsgram !== "undefined") { window.AdsgramController = Adsgram.init({ blockId: "int-28433" }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.AdsgramController) reject("AdsGram not ready");
            window.AdsgramController.show().then(resolve).catch(reject);
        })
    }
];

// تهيئة المنصات الإعلانية
function initAdPlatforms() {
    if (adPlatformsInitialized) return;
    AD_PLATFORMS.forEach(p => { if (p.init) try { p.init(); } catch(e) { console.warn(p.name + " init failed:", e); } });
    adPlatformsInitialized = true;
    console.log("[AdNova] Ad platforms initialized");
}

// عرض إعلان (يحاول عرض إعلانين متتاليين)
async function showAd() {
    const shuffled = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
        try { await p.show(); return true; } catch(e) { console.error(p.name + " failed:", e); }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🌍 نظام الترجمة (10 لغات)
// ═══════════════════════════════════════════════════════════════════════════

const LANGUAGES = [
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", dir: "ltr" },
    { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", dir: "rtl" },
    { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", dir: "ltr" },
    { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", dir: "ltr" },
    { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", dir: "ltr" },
    { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", dir: "ltr" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
    { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
    { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", dir: "ltr" },
    { code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷", dir: "rtl" }
];

const translations = {
    en: {
        appName: "AdNova Network", totalBalance: "Total Balance", availableToWithdraw: "Available to withdraw",
        watchAds: "Watch Ads", completeTasks: "Complete Tasks", inviteFriends: "Invite Friends",
        watchAndEarn: "Watch Ads & Earn", watchAdBtn: "Watch Ad", watchAdBtnSub: "Complete video to earn instantly",
        readyToEarn: "Ready to earn", totalWatched: "Total Watched", adsUnit: "ads", totalEarned: "Total Earned",
        taskHeaderTitle: "Complete Tasks & Earn Rewards", joinChannels: "Join Channels", startBots: "Start Bots",
        progress: "Progress", joinBtn: "Join", startBtn: "Start", subscribeBtn: "Subscribe", followBtn: "Follow",
        inviteAndEarn: "Invite & Earn", inviteHeroSub: "Copy and share your invite link to earn more",
        yourInviteLink: "Your Invite Link", copy: "Copy", shareWithFriends: "Share", friendsInvited: "Friends Invited",
        earnedFromInvites: "Earned from Invites", paymentMethod: "Payment Method", amount: "Amount",
        availableBalance: "Available balance:", submitWithdrawal: "Submit Withdrawal", navAds: "Ads", navTasks: "Tasks",
        navInvite: "Invite", navWithdraw: "Withdraw", notificationsTitle: "Notifications", clearRead: "Clear Read",
        clearAll: "Clear All", loadingAd: "Loading ad...", adRewardAdded: "+$${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow", adError: "Error loading ad",
        linkCopied: "Link copied!", taskCompleted: "+$${amount} added!", taskError: "Please join first",
        insufficientBalance: "Insufficient balance", chooseLanguage: "Choose your language", success: "Success!",
        error: "Error!", warning: "Warning!", info: "Info", adminPanel: "Admin Panel", users: "Users",
        pendingWithdrawals: "Pending Withdrawals", approve: "Approve", reject: "Reject", addBalance: "Add Balance",
        removeBalance: "Remove Balance", blockUser: "Block User", broadcast: "Broadcast", manageTasks: "Manage Tasks"
    },
    ar: {
        appName: "أد نوفا نتورك", totalBalance: "الرصيد الإجمالي", availableToWithdraw: "متاح للسحب",
        watchAds: "مشاهدة الإعلانات", completeTasks: "إكمال المهام", inviteFriends: "دعوة الأصدقاء",
        watchAndEarn: "شاهد واكسب", watchAdBtn: "شاهد إعلان", watchAdBtnSub: "أكمل الفيديو لتكسب فوراً",
        readyToEarn: "جاهز للربح", totalWatched: "إجمالي المشاهدات", adsUnit: "إعلانات", totalEarned: "إجمالي الأرباح",
        taskHeaderTitle: "أكمل المهام واكسب المكافآت", joinChannels: "الانضمام للقنوات", startBots: "تشغيل البوتات",
        progress: "التقدم", joinBtn: "انضمام", startBtn: "تشغيل", subscribeBtn: "اشتراك", followBtn: "متابعة",
        inviteAndEarn: "ادع واكسب", inviteHeroSub: "انسخ رابط دعوتك وشاركه لتكسب أكثر", yourInviteLink: "رابط دعوتك",
        copy: "نسخ", shareWithFriends: "مشاركة", friendsInvited: "الأصدقاء المدعوون", earnedFromInvites: "الأرباح من الدعوات",
        paymentMethod: "طريقة الدفع", amount: "المبلغ", availableBalance: "الرصيد المتاح:",
        submitWithdrawal: "تقديم طلب السحب", navAds: "إعلانات", navTasks: "مهام", navInvite: "دعوة", navWithdraw: "سحب",
        notificationsTitle: "الإشعارات", clearRead: "حذف المقروء", clearAll: "حذف الكل",
        loadingAd: "جاري تحميل الإعلان...", adRewardAdded: "+$${amount} أضيفت!",
        dailyLimitReached: "تم الوصول للحد اليومي! عد غداً", adError: "خطأ في تحميل الإعلان",
        linkCopied: "تم نسخ الرابط!", taskCompleted: "+$${amount} أضيفت!", taskError: "يرجى الانضمام أولاً",
        insufficientBalance: "رصيد غير كافٍ", chooseLanguage: "اختر لغتك", success: "تم بنجاح!",
        error: "خطأ!", warning: "تحذير!", info: "معلومات", adminPanel: "لوحة المشرف", users: "المستخدمين",
        pendingWithdrawals: "طلبات السحب", approve: "موافقة", reject: "رفض", addBalance: "إضافة رصيد",
        removeBalance: "خصم رصيد", blockUser: "حظر المستخدم", broadcast: "بث جماعي", manageTasks: "إدارة المهام"
    }
};

// إكمال باقي اللغات
for (let lang of ["es", "fr", "ru", "pt", "hi", "id", "tr", "fa"]) {
    if (!translations[lang]) translations[lang] = { ...translations.en };
}

function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(p => { text = text.replace(`\${${p}}`, params[p]); });
    return text;
}

function applyLanguage() {
    const html = document.documentElement;
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    if (lang && lang.dir === "rtl") {
        html.setAttribute("dir", "rtl");
        document.body.classList.add("rtl");
    } else {
        html.setAttribute("dir", "ltr");
        document.body.classList.remove("rtl");
    }
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) el.textContent = t(key);
    });
    document.title = t("appName") + " - Earn Real Money";
    const langBtn = document.getElementById("langBtnLabel");
    if (langBtn) langBtn.textContent = lang?.name || "English";
    refreshCurrentPage();
}

function openLanguageModal() {
    const modal = document.getElementById("langModal");
    if (!modal) return;
    const grid = document.getElementById("langOptionsGrid");
    if (grid) {
        grid.innerHTML = LANGUAGES.map(l => `
            <div class="lang-option ${currentLanguage === l.code ? "active" : ""}" onclick="setLanguage('${l.code}')">
                <div class="lang-option-flag">${l.flag}</div>
                <div class="lang-option-body">
                    <div class="lang-option-name">${l.name}</div>
                    <div class="lang-option-native">${l.nativeName}</div>
                </div>
                <div class="lang-option-radio"><div class="lang-option-radio-inner"></div></div>
            </div>
        `).join("");
    }
    modal.classList.add("open");
}

function closeLanguageModal(event) {
    if (event && event.target !== document.getElementById("langModal")) return;
    document.getElementById("langModal")?.classList.remove("open");
}

function setLanguage(langCode) {
    currentLanguage = langCode;
    localStorage.setItem("adnova_lang", currentLanguage);
    closeLanguageModal();
    applyLanguage();
    showToast(t("success"), "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. 🔥 بيانات المستخدم (Firebase + LocalStorage)
// ═══════════════════════════════════════════════════════════════════════════

function getTelegramUserId() {
    return tg?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem("adnova_user_id") || "guest_" + Math.random().toString(36).substr(2, 9);
}

function getUserName() {
    return tg?.initDataUnsafe?.user?.first_name || "User";
}

function getUserPhotoUrl() {
    return tg?.initDataUnsafe?.user?.photo_url || null;
}

async function loadAppConfig() {
    try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (data) {
            APP_CONFIG = { ...APP_CONFIG, ...data };
            console.log("[AdNova] Config loaded:", APP_CONFIG);
        }
    } catch(e) { console.error("Config error:", e); }
}

async function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    const today = new Date().toISOString().split("T")[0];
    
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        currentUser = {
            userId: currentUserId, userName: getUserName(), userPhoto: getUserPhotoUrl(),
            balance: APP_CONFIG.welcomeBonus, totalEarned: APP_CONFIG.welcomeBonus,
            adsWatched: 0, adsToday: 0, lastAdDate: today, inviteCount: 0,
            referredBy: null, referrals: [], withdrawals: [], claimedMilestones: [],
            notifications: [{ id: Date.now(), title: "🎉 Welcome!", message: `+$${APP_CONFIG.welcomeBonus} bonus!`, type: "success", read: false, timestamp: new Date().toISOString() }],
            tonWallet: null, withdrawBlocked: false, completedTasks: []
        };
        saveUserData();
        await processReferral();
    }
    
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    userCompletedTasks = currentUser.completedTasks || [];
    
    await syncWithFirebase();
    updateUI();
    await loadTasksFromFirebase();
    return currentUser;
}

function saveUserData() {
    currentUser.completedTasks = userCompletedTasks;
    localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser));
    syncToFirebase();
}

async function syncWithFirebase() {
    try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (data.success && data.data) {
            currentUser = { ...currentUser, ...data.data };
            userCompletedTasks = currentUser.completedTasks || [];
            saveUserData();
            updateUI();
        }
    } catch(e) { console.error("Firebase sync error:", e); }
}

async function syncToFirebase() {
    try {
        await fetch(`/api/users/${currentUserId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, userData: currentUser })
        });
    } catch(e) { console.error("Firebase save error:", e); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. 🔗 نظام الإحالة (Referral System)
// ═══════════════════════════════════════════════════════════════════════════

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) ref = tg.initDataUnsafe.start_param;
    if (!ref) ref = urlParams.get("ref");
    return ref;
}

function getReferralLink() {
    return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`;
}

async function processReferral() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    try {
        const res = await fetch("/api/referral", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referrerId: refCode, newUserId: currentUserId, newUserName: currentUser.userName })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.referredBy = refCode;
            currentUser.balance += APP_CONFIG.welcomeBonus;
            currentUser.totalEarned += APP_CONFIG.welcomeBonus;
            localStorage.setItem(processedKey, refCode);
            saveUserData();
            updateUI();
            showToast(`🎉 +$${APP_CONFIG.welcomeBonus} welcome bonus!`, "success");
        }
    } catch(e) { console.error("Referral error:", e); }
}

function copyInviteLink() {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    showToast(t("linkCopied"), "success");
}

function shareInviteLink() {
    const link = getReferralLink();
    const text = `Join AdNova Network and earn real money!\n\n${link}`;
    tg?.openTelegramLink ? tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`) : window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. 🎬 مشاهدة الإعلانات (مع رصيد مباشر)
// ═══════════════════════════════════════════════════════════════════════════

async function watchAd() {
    if (adPlaying) { showToast("Ad playing...", "warning"); return; }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) { showToast(t("dailyLimitReached"), "warning"); return; }
    
    adPlaying = true;
    const btn = document.getElementById("watchAdBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
    
    showToast(t("loadingAd"), "info");
    initAdPlatforms();
    
    // عرض إعلانين متتاليين
    let successCount = 0;
    for (let i = 0; i < 2; i++) {
        const shown = await showAd();
        if (shown) successCount++;
        if (!shown) { showToast(t("adError"), "error"); break; }
    }
    
    if (successCount === 2) {
        // إضافة الرصيد مباشرة
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showEarnToast();
        showToast(t("adRewardAdded", { amount: APP_CONFIG.adReward.toFixed(2) }), "success");
        
        // مزامنة مع Firebase
        await fetch("/api/reward", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg?.initDataUnsafe || {} })
        }).catch(e => console.error);
    } else {
        showToast("Ad failed, please try again", "error");
    }
    
    adPlaying = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn"); }
}

function showEarnToast() {
    const toast = document.getElementById("earn-toast");
    if (!toast) return;
    const span = document.getElementById("earnToastAmount");
    if (span) span.textContent = `+ $${APP_CONFIG.adReward.toFixed(2)} Earned`;
    toast.classList.remove("hide"); toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); toast.classList.add("hide"); }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. 📋 نظام المهام المتجددة (Dynamic Tasks)
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasksFromFirebase() {
    try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (data.success && data.tasks) {
            tasksList = data.tasks;
            renderTasks();
        }
    } catch(e) { console.error("Load tasks error:", e); }
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    
    if (tasksList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><p>No tasks available</p></div>';
        return;
    }
    
    let html = '<div class="tasks-grid">';
    for (const task of tasksList) {
        const isCompleted = userCompletedTasks.includes(task.id);
        let icon = "fab fa-telegram";
        let actionText = t("joinBtn");
        let action = `verifyTask('${task.id}', '${task.type}', '${task.username || task.link || ''}', ${task.reward})`;
        
        if (task.type === "youtube") {
            icon = "fab fa-youtube";
            actionText = t("subscribeBtn");
        } else if (task.type === "tiktok") {
            icon = "fab fa-tiktok";
            actionText = t("followBtn");
        } else if (task.type === "telegram_bot") {
            icon = "fab fa-telegram-plane";
            actionText = t("startBtn");
        }
        
        html += `
            <div class="task-card ${isCompleted ? 'completed' : ''}">
                <div class="task-left">
                    <div class="task-icon"><i class="${icon}"></i></div>
                    <div class="task-info">
                        <h4>${task.name}</h4>
                        <p>${task.username || task.link || ''}</p>
                    </div>
                </div>
                <div class="task-right">
                    <div class="task-reward">+$${task.reward.toFixed(2)}</div>
                    ${!isCompleted ? 
                        `<button class="task-btn" onclick="${action}">${actionText}</button>` :
                        `<span class="task-completed-badge">✅ Completed</span>`
                    }
                </div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function verifyTask(taskId, type, identifier, reward) {
    // فتح الرابط للمستخدم
    let url = "";
    if (type === "telegram_channel") url = `https://t.me/${identifier}`;
    else if (type === "telegram_bot") url = `https://t.me/${identifier}`;
    else if (type === "youtube") url = identifier.startsWith("http") ? identifier : `https://youtube.com/@${identifier}`;
    else if (type === "tiktok") url = identifier.startsWith("http") ? identifier : `https://tiktok.com/@${identifier}`;
    
    if (url) window.open(url, "_blank");
    
    showToast("Verifying membership...", "info");
    
    // انتظار 3 ثوانٍ ثم التحقق عبر البوت
    setTimeout(async () => {
        try {
            const res = await fetch("/api/verify-channel", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId, channelUsername: identifier, taskId, reward })
            });
            const data = await res.json();
            
            if (data.success) {
                if (!userCompletedTasks.includes(taskId)) {
                    userCompletedTasks.push(taskId);
                    currentUser.balance += reward;
                    currentUser.totalEarned += reward;
                    saveUserData();
                    updateUI();
                    renderTasks();
                    showToast(t("taskCompleted", { amount: reward.toFixed(2) }), "success");
                }
            } else {
                showToast(t("taskError"), "error");
            }
        } catch(e) {
            showToast("Verification error", "error");
        }
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. 💸 نظام السحب (مع SBP)
// ═══════════════════════════════════════════════════════════════════════════

function renderWithdrawMethods() {
    const container = document.getElementById("withdrawMethodsContainer");
    if (!container) return;
    container.innerHTML = WITHDRAWAL_METHODS.map(m => `
        <div class="method-option ${m.id === selectedWithdrawMethod ? "selected" : ""}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')">
            <i class="${m.icon}"></i><span>${m.name}</span>
        </div>
    `).join("");
    updateDestinationLabel();
}

function selectWithdrawMethod(methodId) {
    selectedWithdrawMethod = methodId;
    document.querySelectorAll(".method-option").forEach(el => el.classList.remove("selected"));
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add("selected");
    updateDestinationLabel();
}

function updateDestinationLabel() {
    const method = WITHDRAWAL_METHODS.find(m => m.id === selectedWithdrawMethod);
    const labelEl = document.getElementById("wdDestLabel");
    const inputEl = document.getElementById("wdDestInput");
    if (labelEl && method) labelEl.textContent = method.label || "Destination";
    if (inputEl && method) inputEl.placeholder = method.placeholder;
}

function validateDestination() {
    const method = WITHDRAWAL_METHODS.find(m => m.id === selectedWithdrawMethod);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    if (!method || !destination) return false;
    if (method.regex && !method.regex.test(destination)) {
        showToast(`Invalid ${method.name} address format`, "warning");
        return false;
    }
    return true;
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    
    if (!amount || amount < APP_CONFIG.minWithdraw) { showToast(`Minimum withdrawal is $${APP_CONFIG.minWithdraw}`, "warning"); return; }
    if (amount > currentUser.balance) { showToast(t("insufficientBalance"), "warning"); return; }
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) { showToast(`Need ${APP_CONFIG.requiredReferrals} referrals to withdraw`, "warning"); return; }
    if (!destination) { showToast("Please enter destination", "warning"); return; }
    if (!validateDestination()) return;
    
    const confirmMsg = confirm(`Submit withdrawal of $${amount.toFixed(2)} via ${selectedWithdrawMethod.toUpperCase()}?`);
    if (!confirmMsg) return;
    
    const btn = document.getElementById("submitWithdrawBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }
    
    try {
        const res = await fetch("/api/withdraw/request", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, userName: currentUser.userName, amount, method: selectedWithdrawMethod, destination })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.balance = data.newBalance;
            currentUser.withdrawals.unshift({ id: Date.now(), amount, method: selectedWithdrawMethod, destination, status: "pending", date: new Date().toISOString() });
            saveUserData();
            updateUI();
            showToast("Withdrawal request submitted!", "success");
            document.getElementById("wdAmountInput").value = "";
            document.getElementById("wdDestInput").value = "";
        } else { showToast(data.error || t("error"), "error"); }
    } catch(e) { showToast(t("error"), "error"); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t("submitWithdrawal"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. 👑 لوحة المشرف المتطورة (Admin Panel)
// ═══════════════════════════════════════════════════════════════════════════

let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0, totalEarned: 0 };
let pendingWithdrawals = [];
let allUsers = [];
let adminTasks = [];

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
    if (data.success) { adminAuthenticated = true; document.getElementById("adminAuthModal")?.classList.remove("show"); showAdminPanel(); }
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
        const statsRes = await fetch("/api/admin/stats", { headers: { "Authorization": `Bearer ${localStorage.getItem("admin_token")}` } });
        const statsData = await statsRes.json();
        if (statsData.success) adminStats = statsData.stats;
        
        const withdrawalsRes = await fetch("/api/admin/pending-withdrawals", { headers: { "Authorization": `Bearer ${localStorage.getItem("admin_token")}` } });
        const withdrawalsData = await withdrawalsRes.json();
        if (withdrawalsData.success) pendingWithdrawals = withdrawalsData.withdrawals || [];
        
        const usersRes = await fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${localStorage.getItem("admin_token")}` } });
        const usersData = await usersRes.json();
        if (usersData.success) allUsers = usersData.users || [];
        
        const tasksRes = await fetch("/api/tasks");
        const tasksData = await tasksRes.json();
        if (tasksData.success) adminTasks = tasksData.tasks || [];
    } catch(e) { console.error("Load admin data error:", e); }
}

function renderAdminDashboard() {
    const container = document.getElementById("adminContent");
    if (!container) return;
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card" onclick="showAdminSection('stats')">
                <i class="fas fa-users"></i>
                <div class="stat-value">${adminStats.totalUsers || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="admin-stat-card" onclick="showAdminSection('pending')">
                <i class="fas fa-clock"></i>
                <div class="stat-value">${adminStats.pendingWithdrawals || 0}</div>
                <div class="stat-label">Pending Withdrawals</div>
            </div>
            <div class="admin-stat-card" onclick="showAdminSection('stats')">
                <i class="fas fa-dollar-sign"></i>
                <div class="stat-value">$${(adminStats.totalBalance || 0).toFixed(2)}</div>
                <div class="stat-label">Total Balance</div>
            </div>
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
        const date = new Date(w.createdAt?.toDate?.() || w.createdAt);
        html += `
            <div class="admin-card">
                <div class="admin-card-header">
                    <span>👤 ${w.userName || w.userId}</span>
                    <span class="withdraw-amount">$${w.amount?.toFixed(2)}</span>
                </div>
                <div class="admin-card-details">
                    <div>ID: ${w.userId}</div>
                    <div>👥 Invites: ${w.userInvites || 0}</div>
                    <div>Method: ${w.method}</div>
                    <div>Destination: ${w.destination}</div>
                    <div>Date: ${date.toLocaleString()}</div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-approve" onclick="approveWithdrawal('${w.id}', '${w.userId}', ${w.amount})">✅ Approve</button>
                    <button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.userId}', ${w.amount})">❌ Reject</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (allUsers.length === 0) { container.innerHTML = '<div class="empty-state">No users found</div>'; return; }
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID or name..." onkeyup="filterUsers()"></div>';
    for (const u of allUsers) {
        html += `
            <div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${u.userName}">
                <div class="admin-card-header">
                    <span>👤 ${u.userName || "User"}</span>
                    <span class="user-balance">💰 $${u.balance?.toFixed(2) || "0.00"}</span>
                </div>
                <div class="admin-card-details">
                    <div>ID: ${u.userId}</div>
                    <div>👥 Invites: ${u.inviteCount || 0} | 📺 Ads: ${u.adsWatched || 0}</div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-add" onclick="adminAddBalance('${u.userId}')">➕ Add</button>
                    <button class="btn-remove" onclick="adminRemoveBalance('${u.userId}')">➖ Remove</button>
                    <button class="btn-block" onclick="adminBlockUser('${u.userId}')">🔒 Block</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderTasksManagement(container) {
    let html = `
        <div class="admin-section-header">
            <h4>Manage Tasks</h4>
            <button class="btn-add-task" onclick="showAddTaskModal()">➕ Add New Task</button>
        </div>
        <div class="tasks-management-list">
    `;
    for (const task of adminTasks) {
        html += `
            <div class="task-management-card">
                <div class="task-info">
                    <span class="task-type">${task.type}</span>
                    <strong>${task.name}</strong>
                    <span>${task.username || task.link || ''}</span>
                    <span class="task-reward-admin">$${task.reward.toFixed(2)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-edit" onclick="editTask('${task.id}')">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
}

function renderBroadcastSection(container) {
    container.innerHTML = `
        <div class="broadcast-section">
            <textarea id="broadcastMessage" placeholder="Enter your message to broadcast to all users..." rows="4"></textarea>
            <button class="btn-broadcast" onclick="sendBroadcast()">📢 Send Broadcast</button>
            <p class="broadcast-hint">This will send a notification to all ${adminStats.totalUsers || 0} users</p>
        </div>
    `;
}

async function approveWithdrawal(id, userId, amount) {
    const token = prompt("Enter admin password to approve:");
    if (!token) return;
    const res = await fetch("/api/admin/approve-withdrawal", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId: id })
    });
    const data = await res.json();
    if (data.success) { showToast("Withdrawal approved!", "success"); location.reload(); }
    else { showToast("Failed: " + data.error, "error"); }
}

async function rejectWithdrawal(id, userId, amount) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    const token = prompt("Enter admin password:");
    if (!token) return;
    const res = await fetch("/api/admin/reject-withdrawal", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId: id, reason })
    });
    const data = await res.json();
    if (data.success) { showToast("Withdrawal rejected!", "success"); location.reload(); }
    else { showToast("Failed: " + data.error, "error"); }
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt("Amount to add (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const token = prompt("Enter admin password:");
    if (!token) return;
    const res = await fetch("/api/admin/add-balance", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId, amount })
    });
    const data = await res.json();
    if (data.success) { showToast(`$${amount} added!`, "success"); location.reload(); }
    else { showToast("Failed: " + data.error, "error"); }
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt("Amount to remove (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const token = prompt("Enter admin password:");
    if (!token) return;
    const res = await fetch("/api/admin/remove-balance", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId, amount })
    });
    const data = await res.json();
    if (data.success) { showToast(`$${amount} removed!`, "success"); location.reload(); }
    else { showToast("Failed: " + data.error, "error"); }
}

async function adminBlockUser(userId) {
    if (!confirm("⚠️ PERMANENTLY block this user from withdrawals?")) return;
    const token = prompt("Enter admin password:");
    if (!token) return;
    const res = await fetch("/api/admin/block-user", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (data.success) { showToast("User blocked!", "success"); location.reload(); }
    else { showToast("Failed: " + data.error, "error"); }
}

async function sendBroadcast() {
    const message = document.getElementById("broadcastMessage")?.value;
    if (!message) { showToast("Enter a message", "warning"); return; }
    const token = prompt("Enter admin password:");
    if (!token) return;
    const res = await fetch("/api/admin/broadcast", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data.success) { showToast(`Broadcast sent to ${data.notifiedCount} users!`, "success"); document.getElementById("broadcastMessage").value = ""; }
    else { showToast("Failed: " + data.error, "error"); }
}

function filterUsers() {
    const term = document.getElementById("userSearchInput")?.value.toLowerCase();
    document.querySelectorAll(".user-card").forEach(card => {
        const match = card.getAttribute("data-user-id")?.toLowerCase().includes(term) || card.getAttribute("data-user-name")?.toLowerCase().includes(term);
        card.style.display = match ? "block" : "none";
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. 🔔 نظام الإشعارات (Notifications)
// ═══════════════════════════════════════════════════════════════════════════

function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge && currentUser) {
        const unread = currentUser.notifications?.filter(n => !n.read).length || 0;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? "flex" : "none";
    }
}

function renderNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container || !currentUser) return;
    const notifs = currentUser.notifications || [];
    if (notifs.length === 0) { container.innerHTML = '<div class="empty-state">No notifications</div>'; return; }
    let html = "";
    for (const n of notifs) {
        const date = new Date(n.timestamp);
        html += `
            <div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead('${n.id}')">
                <div class="notification-icon ${n.type}"><i class="fas fa-bell"></i></div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    <div class="notification-time">${date.toLocaleString()}</div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function markNotificationRead(id) {
    const n = currentUser.notifications?.find(n => n.id == id);
    if (n && !n.read) { n.read = true; saveUserData(); updateNotificationBadge(); renderNotifications(); }
}

function clearReadNotifications() {
    if (!currentUser.notifications) return;
    currentUser.notifications = currentUser.notifications.filter(n => !n.read);
    saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("Cleared read notifications", "success");
}

function clearAllNotifications() {
    currentUser.notifications = [];
    saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("All notifications cleared", "success");
}

function showNotificationsModal() { renderNotifications(); document.getElementById("notificationsModal")?.classList.add("show"); }
function closeNotificationsModal() { document.getElementById("notificationsModal")?.classList.remove("show"); }

// ═══════════════════════════════════════════════════════════════════════════
// 13. 💎 TON Connect
// ═══════════════════════════════════════════════════════════════════════════

async function connectTONWallet() {
    if (tonConnected && window.tonConnectUI) {
        try { await window.tonConnectUI.disconnect(); } catch(e) {}
        tonConnected = false; tonWalletAddress = null;
        if (currentUser) { currentUser.tonWallet = null; saveUserData(); }
        updateTONUI();
        showToast("Wallet disconnected", "info");
        return;
    }
    if (!window.tonConnectUI) { showToast("TON Connect not ready", "error"); return; }
    try {
        await window.tonConnectUI.openModal();
        const interval = setInterval(() => {
            if (window.tonConnectUI.wallet) {
                clearInterval(interval);
                tonConnected = true;
                tonWalletAddress = window.tonConnectUI.wallet.account.address;
                if (currentUser) { currentUser.tonWallet = tonWalletAddress; saveUserData(); }
                updateTONUI();
                showToast("TON Wallet Connected!", "success");
            }
        }, 500);
        setTimeout(() => clearInterval(interval), 30000);
    } catch(e) { showToast("Connection failed", "error"); }
}

function updateTONUI() {
    const statusEl = document.getElementById("tonWalletStatus");
    const btn = document.getElementById("connectTONBtn");
    if (statusEl) {
        if (tonConnected && tonWalletAddress) {
            statusEl.textContent = tonWalletAddress.slice(0, 6) + "..." + tonWalletAddress.slice(-6);
            statusEl.style.color = "#10b981";
        } else {
            statusEl.textContent = "Not connected";
            statusEl.style.color = "";
        }
    }
    if (btn) btn.textContent = tonConnected ? "Disconnect TON" : "Connect TON";
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. 🎨 تحديث واجهة المستخدم (UI Updates)
// ═══════════════════════════════════════════════════════════════════════════

function updateUI() {
    if (!currentUser) return;
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    
    const progressFill = document.getElementById("adProgressFill");
    if (progressFill) {
        const prog = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
        progressFill.style.width = `${prog}%`;
    }
    
    const progressLabel = document.getElementById("adProgressLabel");
    if (progressLabel) progressLabel.textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    
    const totalAds = document.getElementById("totalAdsWatched");
    if (totalAds) totalAds.innerHTML = `${currentUser.adsWatched || 0} <span>ads</span>`;
    
    const totalEarned = document.getElementById("totalAdsEarned");
    if (totalEarned) totalEarned.textContent = `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`;
    
    const totalInvites = document.getElementById("totalInvites");
    if (totalInvites) totalInvites.textContent = currentUser.inviteCount || 0;
    
    const inviteEarned = document.getElementById("totalEarnedFromInvites");
    if (inviteEarned) inviteEarned.textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    
    const inviteLink = document.getElementById("inviteLink");
    if (inviteLink) inviteLink.textContent = getReferralLink();
    
    const availBalance = document.getElementById("wdAvailBalance");
    if (availBalance) availBalance.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = currentUser.userName || "User";
    
    const userChatId = document.getElementById("userChatId");
    if (userChatId) userChatId.textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`;
    
    const avatarSpan = document.getElementById("userAvatarText");
    const avatarImg = document.getElementById("userAvatarImg");
    if (currentUser.userPhoto && avatarImg) {
        avatarImg.src = currentUser.userPhoto;
        avatarImg.style.display = "block";
        if (avatarSpan) avatarSpan.style.display = "none";
    } else if (avatarSpan) {
        avatarSpan.textContent = (currentUser.userName || "U").charAt(0).toUpperCase();
        avatarSpan.style.display = "flex";
        if (avatarImg) avatarImg.style.display = "none";
    }
    
    updateNotificationBadge();
    updateTONUI();
}

function refreshCurrentPage() {
    if (currentPage === "tasks") renderTasks();
    else if (currentPage === "invite") {
        const link = document.getElementById("inviteLink");
        if (link) link.textContent = getReferralLink();
    } else if (currentPage === "withdraw") renderWithdrawMethods();
}

function switchTab(page) {
    currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`)?.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-page") === page) item.classList.add("active");
    });
    if (page === "tasks") renderTasks();
    else if (page === "invite") refreshCurrentPage();
    else if (page === "withdraw") renderWithdrawMethods();
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. 🍞 Toast Messages
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
// 16. 🚀 تهيئة التطبيق (Initialization)
// ═══════════════════════════════════════════════════════════════════════════

function hideSplash() {
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    if (splash) splash.style.display = "none";
    if (main) main.style.display = "block";
    console.log("[AdNova] Ready!");
}

async function init() {
    console.log("[AdNova] Initializing...");
    await loadAppConfig();
    applyLanguage();
    await loadUserData();
    renderWithdrawMethods();
    checkAdminAndShowCrown();
    initAdPlatforms();
    await initTONConnect();
    setTimeout(hideSplash, 500);
    setInterval(() => {
        if (currentUser) {
            const today = new Date().toISOString().split("T")[0];
            if (currentUser.lastAdDate !== today) {
                currentUser.adsToday = 0;
                currentUser.lastAdDate = today;
                saveUserData();
                updateUI();
            }
        }
    }, 60000);
}

async function initTONConnect() {
    if (typeof TON_CONNECT_UI !== "undefined") {
        try {
            window.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifestUrl: window.location.origin + "/tonconnect-manifest.json",
                buttonRootId: "tonConnectButton"
            });
            const restored = await window.tonConnectUI.connectionRestored;
            if (restored && window.tonConnectUI.wallet) {
                tonConnected = true;
                tonWalletAddress = window.tonConnectUI.wallet.account.address;
                updateTONUI();
            }
        } catch(e) { console.error("TON init error:", e); }
    }
}

setTimeout(hideSplash, 3000);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

// ═══════════════════════════════════════════════════════════════════════════
// 17. 🌐 تصدير الدوال العالمية (Global Exports)
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
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.connectTONWallet = connectTONWallet;

console.log("[AdNova] Platform ready | Ad Reward: $" + APP_CONFIG.adReward);
console.log("[AdNova] Features: Referrals | Dynamic Tasks | SBP | Admin Panel | 10 Languages");

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
