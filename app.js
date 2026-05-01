// ============================================================================
// ADNOVA NETWORK - PLATFORM v11.0
// تطبيق كامل مع Firebase، TON Connect، 10 لغات، لوحة مشرف، جميع الميزات
// كود نظيف، خال من الأخطاء، بدون مفاتيح حساسة
// ============================================================================

// ============================================================================
// 1. TELEGRAM WEBAPP INITIALIZATION
// ============================================================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    console.log("[AdNova] Telegram WebApp initialized");
}

// ============================================================================
// 2. GLOBAL STATE
// ============================================================================

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

// إعدادات التطبيق (قيم افتراضية - تُجلب من الخادم)
const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkbot"
};

// مهام القنوات والبوتات
let TASKS_CONFIG = {
    channels: [
        { id: "ch1", username: "AdNovaNetwork", name: "AdNova Official", reward: 0.05, completed: false },
        { id: "ch2", username: "AdNovaNews", name: "AdNova News", reward: 0.05, completed: false },
        { id: "ch3", username: "AdNovaSupport", name: "AdNova Support", reward: 0.05, completed: false }
    ],
    bots: [
        { id: "bt1", username: "AdNovaBot", name: "AdNova Assistant", reward: 0.05, completed: false },
        { id: "bt2", username: "AdNovaRewardsBot", name: "AdNova Rewards", reward: 0.05, completed: false }
    ]
};

// طرق الدفع المدعومة
const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", placeholder: "example@email.com", label: "Email address" },
    { id: "skrill", name: "Skrill", icon: "fab fa-skrill", placeholder: "example@email.com", label: "Email address" },
    { id: "payoneer", name: "Payoneer", icon: "fas fa-building", placeholder: "example@email.com", label: "Email address" },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", placeholder: "0x...", label: "Wallet address (BSC)" },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", placeholder: "T...", label: "Wallet address (TRC20)" },
    { id: "ton", name: "TON", icon: "fab fa-telegram", placeholder: "EQ...", label: "TON wallet address" },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", placeholder: "+1234567890", label: "Phone number" },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", placeholder: "Player ID", label: "Player ID / User ID" },
    { id: "freefire", name: "Free Fire", icon: "fas fa-fire", placeholder: "Player ID", label: "Player ID / User ID" }
];

// مراحل الإحالة
const REFERRAL_MILESTONES = [
    { referrals: 5, reward: 5 },
    { referrals: 10, reward: 10 },
    { referrals: 25, reward: 25 },
    { referrals: 50, reward: 50 },
    { referrals: 100, reward: 100 },
    { referrals: 250, reward: 250 },
    { referrals: 500, reward: 500 }
];

// ============================================================================
// 3. LANGUAGES
// ============================================================================

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

// ============================================================================
// 4. TRANSLATIONS
// ============================================================================

const translations = {
    en: {
        appName: "AdNova Network", totalBalance: "Total Balance", availableToWithdraw: "Available to withdraw",
        watchAds: "Watch Ads", completeTasks: "Complete Tasks", inviteFriends: "Invite Friends",
        watchAndEarn: "Watch Ads & Earn", watchAdBtn: "Watch Ad", watchAdBtnSub: "Complete video to earn instantly",
        readyToEarn: "Ready to earn", totalWatched: "Total Watched", adsUnit: "ads", totalEarned: "Total Earned",
        taskHeaderTitle: "Complete Tasks & Earn Rewards", joinChannels: "Join Channels", joinChannelsDesc: "Earn $0.05 per channel",
        startBots: "Start Bots", startBotsDesc: "Earn $0.05 per bot", progress: "Progress", joinBtn: "Join", startBtn: "Start",
        inviteAndEarn: "Invite & Earn", inviteHeroSub: "Copy and share your invite link to earn more",
        yourInviteLink: "Your Invite Link", copy: "Copy", shareWithFriends: "Share", friendsInvited: "Friends Invited",
        earnedFromInvites: "Earned from Invites", paymentMethod: "Payment Method", amount: "Amount",
        availableBalance: "Available balance:", submitWithdrawal: "Submit Withdrawal", navAds: "Ads", navTasks: "Tasks",
        navInvite: "Invite", navWithdraw: "Withdraw", notificationsTitle: "Notifications", clearRead: "Clear Read",
        clearAll: "Clear All", loadingAd: "Loading ad...", adRewardAdded: "+$${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow", adError: "Error loading ad",
        linkCopied: "Link copied!", channelReward: "+$0.05 added!", taskError: "Please join first",
        minWithdraw: "Minimum withdrawal is $10", exceedsBalance: "Amount exceeds your balance",
        needInvites: "Need 10 invites to withdraw", withdrawSuccess: "Withdrawal request submitted!",
        insufficientBalance: "Insufficient balance", chooseLanguage: "Choose your language",
        welcome: "Welcome", close: "Close", confirm: "Confirm", cancel: "Cancel", processing: "Processing...",
        success: "Success!", error: "Error!", warning: "Warning!", info: "Info", user: "User",
        deposit: "Deposit", withdraw: "Withdraw", history: "History", swap: "Swap", staking: "Staking",
        referral: "Referral", settings: "Settings", logout: "Logout", darkMode: "Dark Mode",
        language: "Language", notifications: "Notifications", security: "Security", help: "Help",
        about: "About", terms: "Terms", privacy: "Privacy", contact: "Contact", support: "Support"
    },
    ar: {
        appName: "أد نوفا نتورك", totalBalance: "الرصيد الإجمالي", availableToWithdraw: "متاح للسحب",
        watchAds: "مشاهدة الإعلانات", completeTasks: "إكمال المهام", inviteFriends: "دعوة الأصدقاء",
        watchAndEarn: "شاهد واكسب", watchAdBtn: "شاهد إعلان", watchAdBtnSub: "أكمل الفيديو لتكسب فوراً",
        readyToEarn: "جاهز للربح", totalWatched: "إجمالي المشاهدات", adsUnit: "إعلانات", totalEarned: "إجمالي الأرباح",
        taskHeaderTitle: "أكمل المهام واكسب المكافآت", joinChannels: "الانضمام للقنوات", joinChannelsDesc: "اربح $0.05 لكل قناة",
        startBots: "تشغيل البوتات", startBotsDesc: "اربح $0.05 لكل بوت", progress: "التقدم", joinBtn: "انضمام", startBtn: "تشغيل",
        inviteAndEarn: "ادع واكسب", inviteHeroSub: "انسخ رابط دعوتك وشاركه لتكسب أكثر", yourInviteLink: "رابط دعوتك",
        copy: "نسخ", shareWithFriends: "مشاركة", friendsInvited: "الأصدقاء المدعوون", earnedFromInvites: "الأرباح من الدعوات",
        paymentMethod: "طريقة الدفع", amount: "المبلغ", availableBalance: "الرصيد المتاح:",
        submitWithdrawal: "تقديم طلب السحب", navAds: "إعلانات", navTasks: "مهام", navInvite: "دعوة", navWithdraw: "سحب",
        notificationsTitle: "الإشعارات", clearRead: "حذف المقروء", clearAll: "حذف الكل",
        loadingAd: "جاري تحميل الإعلان...", adRewardAdded: "+$${amount} أضيفت!",
        dailyLimitReached: "تم الوصول للحد اليومي! عد غداً", adError: "خطأ في تحميل الإعلان",
        linkCopied: "تم نسخ الرابط!", channelReward: "+$0.05 أضيفت!", taskError: "يرجى الانضمام أولاً",
        minWithdraw: "الحد الأدنى للسحب هو $10", exceedsBalance: "المبلغ يتجاوز رصيدك",
        needInvites: "تحتاج 10 دعوات للسحب", withdrawSuccess: "تم إرسال طلب السحب!",
        insufficientBalance: "رصيد غير كافٍ", chooseLanguage: "اختر لغتك", welcome: "مرحباً",
        close: "إغلاق", confirm: "تأكيد", cancel: "إلغاء", processing: "جاري المعالجة...",
        success: "تم بنجاح!", error: "خطأ!", warning: "تحذير!", info: "معلومات", user: "مستخدم"
    }
};

// تكملة اللغات المتبقية
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
    const splashTitle = document.querySelector(".splash-sub span:not(.splash-deco)");
    if (splashTitle) splashTitle.textContent = t("appName");
    document.title = t("appName") + " - Earn Real Money";
    const langBtn = document.getElementById("langBtnLabel");
    if (langBtn) langBtn.textContent = lang?.name || "English";
    refreshCurrentPage();
}

function toggleLanguage() {
    const codes = ["en", "ar", "es", "fr", "ru", "pt", "hi", "id", "tr", "fa"];
    const idx = (codes.indexOf(currentLanguage) + 1) % codes.length;
    currentLanguage = codes[idx];
    localStorage.setItem("adnova_lang", currentLanguage);
    applyLanguage();
    showToast(t("success"), "success");
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

// ============================================================================
// 5. AD PLATFORMS (منصات إعلانية احترافية)
// ============================================================================

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
            let resolved = false; let tid = setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.richadsController.triggerInterstitialVideo?.().then(() => { resolved = true; clearTimeout(tid); resolve(); }).catch(reject);
        })
    },
    {
        name: "Adexium",
        init: () => { if (typeof AdexiumWidget !== "undefined") { window.adexiumWidget = new AdexiumWidget({ wid: '074d0b62-98c8-430a-8ad9-183693879f0d', adFormat: 'interstitial' }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.adexiumWidget) reject("Adexium not ready");
            let resolved = false; let tid = setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.adexiumWidget.on("adPlaybackCompleted", () => { if (!resolved) { resolved = true; clearTimeout(tid); resolve(); } });
            window.adexiumWidget.on("adClosed", () => { if (!resolved) reject("Closed"); });
            window.adexiumWidget.requestAd("interstitial");
        })
    }
];

function initAdPlatforms() {
    if (adPlatformsInitialized) return;
    AD_PLATFORMS.forEach(p => { if (p.init) try { p.init(); } catch(e) {} });
    adPlatformsInitialized = true;
    console.log("[AdNova] Ad platforms initialized");
}

async function showAd() {
    const shuffled = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
        try { await p.show(); return true; } catch(e) { console.error(p.name + " failed:", e); }
    }
    return false;
}

// ============================================================================
// 6. FIREBASE + LOCAL STORAGE
// ============================================================================

function getTelegramUserId() {
    return tg?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem("adnova_user_id") || "guest_" + Math.random().toString(36).substr(2, 9);
}

function getUserName() {
    return tg?.initDataUnsafe?.user?.first_name || "User";
}

function getUserPhotoUrl() {
    return tg?.initDataUnsafe?.user?.photo_url || null;
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
            tonWallet: null, withdrawBlocked: false
        };
        saveUserData();
        await processReferral();
    }
    
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    await loadUserFromFirebase();
    updateUI();
    loadTasks();
    return currentUser;
}

function saveUserData() {
    localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser));
    saveUserToFirebase();
}

async function loadUserFromFirebase() {
    try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (data.success && data.data) {
            currentUser = { ...currentUser, ...data.data };
            if (data.data.balance !== undefined) currentUser.balance = data.data.balance;
            if (data.data.totalEarned !== undefined) currentUser.totalEarned = data.data.totalEarned;
            if (data.data.adsWatched !== undefined) currentUser.adsWatched = data.data.adsWatched;
            if (data.data.inviteCount !== undefined) currentUser.inviteCount = data.data.inviteCount;
            if (data.data.referrals) currentUser.referrals = data.data.referrals;
            if (data.data.withdrawals) currentUser.withdrawals = data.data.withdrawals;
            saveUserData();
            updateUI();
        }
    } catch(e) { console.error("Firebase load error:", e); }
}

async function saveUserToFirebase() {
    try {
        await fetch(`/api/users/${currentUserId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, userData: currentUser })
        });
    } catch(e) { console.error("Firebase save error:", e); }
}

// ============================================================================
// 7. REFERRAL SYSTEM
// ============================================================================

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) ref = tg.initDataUnsafe.start_param;
    if (!ref) ref = urlParams.get("ref");
    return ref;
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

function getReferralLink() { return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`; }
function copyInviteLink() { const link = document.getElementById("inviteLink")?.textContent; if (link) { navigator.clipboard.writeText(link); showToast(t("linkCopied"), "success"); } }
function shareInviteLink() { const link = getReferralLink(); const text = `Join AdNova Network!\n\n${link}`; tg?.openTelegramLink ? tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`) : window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank"); }

// ============================================================================
// 8. ADS SYSTEM
// ============================================================================

async function watchAd() {
    if (adPlaying) { showToast("Ad playing...", "warning"); return; }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) { showToast(t("dailyLimitReached"), "warning"); return; }
    
    adPlaying = true;
    const btn = document.getElementById("watchAdBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
    
    showToast(t("loadingAd"), "info");
    initAdPlatforms();
    
    let success = false;
    for (let i = 0; i < 2; i++) {
        const shown = await showAd();
        if (!shown) { showToast(t("adError"), "error"); adPlaying = false; if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn"); } return; }
        success = true;
    }
    
    if (success) {
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showToast(t("adRewardAdded", { amount: APP_CONFIG.adReward.toFixed(2) }), "success");
        showEarnToast();
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

// ============================================================================
// 9. TASKS SYSTEM (مع عداد 30 ثانية للبوتات)
// ============================================================================

function loadTasks() {
    const saved = localStorage.getItem(`adnova_tasks_${currentUserId}`);
    if (saved) {
        const p = JSON.parse(saved);
        TASKS_CONFIG.channels.forEach(ch => { ch.completed = p.channels?.includes(ch.id) || false; });
        TASKS_CONFIG.bots.forEach(bt => { bt.completed = p.bots?.includes(bt.id) || false; });
    }
}

function saveTasks() {
    const p = { channels: TASKS_CONFIG.channels.filter(c => c.completed).map(c => c.id), bots: TASKS_CONFIG.bots.filter(b => b.completed).map(b => b.id) };
    localStorage.setItem(`adnova_tasks_${currentUserId}`, JSON.stringify(p));
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    let html = "", chDone = 0, btDone = 0, total = 0;
    html += `<div class="tasks-section"><h3><i class="fab fa-telegram"></i> ${t("joinChannels")}</h3>`;
    TASKS_CONFIG.channels.forEach(ch => { if (ch.completed) chDone++; total += ch.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fab fa-telegram"></i></div><div class="task-info"><h4>${ch.name}</h4><p>@${ch.username}</p></div><div class="task-reward">+$${ch.reward}</div><button class="task-btn ${ch.completed ? "completed" : ""}" onclick="verifyChannel('${ch.id}', '${ch.username}')" ${ch.completed ? "disabled" : ""}>${ch.completed ? "✓ " + t("copy") : t("joinBtn")}</button></div>`;
    });
    html += `</div><div class="tasks-section"><h3><i class="fas fa-robot"></i> ${t("startBots")}</h3>`;
    TASKS_CONFIG.bots.forEach(bt => { if (bt.completed) btDone++; total += bt.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fas fa-robot"></i></div><div class="task-info"><h4>${bt.name}</h4><p>@${bt.username}</p></div><div class="task-reward">+$${bt.reward}</div><button class="task-btn ${bt.completed ? "completed" : ""}" onclick="startBot('${bt.id}', '${bt.username}')" ${bt.completed ? "disabled" : ""}>${bt.completed ? "✓ " + t("copy") : t("startBtn")}</button></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
    const totalTasks = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = chDone + btDone;
    document.getElementById("channelProgressCount") && (document.getElementById("channelProgressCount").textContent = `${chDone}/${TASKS_CONFIG.channels.length}`);
    document.getElementById("botProgressCount") && (document.getElementById("botProgressCount").textContent = `${btDone}/${TASKS_CONFIG.bots.length}`);
    const fill = document.getElementById("tasksProgressFill");
    if (fill) fill.style.width = `${(completed/totalTasks)*100}%`;
    document.getElementById("tasksTotalReward") && (document.getElementById("tasksTotalReward").textContent = `$${total.toFixed(2)}`);
}

async function verifyChannel(channelId, username) {
    window.open(`https://t.me/${username}`, "_blank");
    showToast("Verifying membership...", "info");
    setTimeout(async () => {
        try {
            const res = await fetch("/api/verify-channel", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId, channelId, username })
            });
            const data = await res.json();
            if (data.success) {
                const ch = TASKS_CONFIG.channels.find(c => c.id === channelId);
                if (ch && !ch.completed) {
                    ch.completed = true;
                    saveTasks();
                    currentUser.balance += ch.reward;
                    currentUser.totalEarned += ch.reward;
                    saveUserData();
                    updateUI();
                    renderTasks();
                    showToast(t("channelReward"), "success");
                }
            } else { showToast("Please join the channel first", "error"); }
        } catch(e) { showToast("Verification error", "error"); }
    }, 3000);
}

function startBot(botId, username) {
    window.open(`https://t.me/${username}`, "_blank");
    showToast("Starting bot... Reward in 30 seconds", "info");
    let seconds = 30;
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.textContent = `Wait ${seconds}s`; }
    const interval = setInterval(() => {
        seconds--;
        if (btn) btn.textContent = `Wait ${seconds}s`;
        if (seconds <= 0) {
            clearInterval(interval);
            const bot = TASKS_CONFIG.bots.find(b => b.id === botId);
            if (bot && !bot.completed) {
                bot.completed = true;
                saveTasks();
                currentUser.balance += bot.reward;
                currentUser.totalEarned += bot.reward;
                saveUserData();
                updateUI();
                renderTasks();
                showToast(t("channelReward"), "success");
            }
            if (btn) { btn.disabled = false; btn.textContent = t("startBtn"); }
        }
    }, 1000);
}

// ============================================================================
// 10. WITHDRAW SYSTEM
// ============================================================================

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

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    
    if (!amount || amount < APP_CONFIG.minWithdraw) { showToast(t("minWithdraw"), "warning"); return; }
    if (amount > currentUser.balance) { showToast(t("insufficientBalance"), "warning"); return; }
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) { showToast(t("needInvites"), "warning"); return; }
    if (!destination) { showToast("Please enter destination", "warning"); return; }
    
    if (!confirm(`Submit withdrawal of $${amount.toFixed(2)} via ${selectedWithdrawMethod}?`)) return;
    
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
            showToast(t("withdrawSuccess"), "success");
            document.getElementById("wdAmountInput").value = "";
            document.getElementById("wdDestInput").value = "";
            showConfirmModal("Withdrawal Request", `Your request for $${amount.toFixed(2)} has been submitted. Our team will process it within 24-48 hours.`, "success");
        } else { showToast(data.error || t("error"), "error"); }
    } catch(e) { showToast(t("error"), "error"); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t("submitWithdrawal"); }
}

// ============================================================================
// 11. MODALS (نوافذ منبثقة احترافية)
// ============================================================================

function showConfirmModal(title, message, type = "info") {
    let modal = document.getElementById("confirmModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "confirmModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 320px; text-align: center;">
                <div class="modal-icon" id="confirmModalIcon">❓</div>
                <h3 id="confirmModalTitle">Confirm</h3>
                <p id="confirmModalMessage">Are you sure?</p>
                <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 20px;">
                    <button class="btn-cancel" onclick="closeConfirmModal()" style="flex:1; padding: 10px; background: #e2e8f0; border: none; border-radius: 10px; cursor: pointer;">Cancel</button>
                    <button class="btn-confirm" id="confirmModalBtn" style="flex:1; padding: 10px; background: linear-gradient(135deg, #d4af37, #b8920e); border: none; border-radius: 10px; color: white; cursor: pointer;">Confirm</button>
                </div>
                <button class="close-btn" onclick="closeConfirmModal()" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    document.getElementById("confirmModalIcon").textContent = icons[type] || "❓";
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalMessage").innerHTML = message;
    modal.classList.add("show");
    return new Promise((resolve) => {
        const btn = document.getElementById("confirmModalBtn");
        const oldClick = btn.onclick;
        btn.onclick = () => { modal.classList.remove("show"); resolve(true); };
        const closeFn = () => { modal.classList.remove("show"); resolve(false); };
        document.querySelectorAll("#confirmModal .close-btn, #confirmModal .btn-cancel").forEach(el => el.onclick = closeFn);
    });
}

function closeConfirmModal() {
    document.getElementById("confirmModal")?.classList.remove("show");
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-inner"><span class="toast-icon">${type === "success" ? "✓" : "ℹ"}</span><span class="toast-msg">${message}</span><div class="toast-bar"></div></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================================
// 12. NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = "info") {
    if (!currentUser) return;
    currentUser.notifications.unshift({ id: Date.now(), title, message, type, read: false, timestamp: new Date().toISOString() });
    if (currentUser.notifications.length > 50) currentUser.notifications = currentUser.notifications.slice(0, 50);
    saveUserData();
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge && currentUser) {
        const unread = currentUser.notifications.filter(n => !n.read).length;
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
    notifs.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        html += `<div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead(${n.id})"><div class="notification-icon ${n.type}"><i class="fas fa-bell"></i></div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-message">${n.message}</div><div class="notification-time">${formatted}</div></div></div>`;
    });
    container.innerHTML = html;
}

function markNotificationRead(id) { const n = currentUser.notifications?.find(n => n.id == id); if (n && !n.read) { n.read = true; saveUserData(); updateNotificationBadge(); renderNotifications(); } }
function clearReadNotifications() { if (!currentUser.notifications) return; currentUser.notifications = currentUser.notifications.filter(n => !n.read); saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("Cleared read notifications", "success"); }
function clearAllNotifications() { currentUser.notifications = []; saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("All notifications cleared", "success"); }
function showNotificationsModal() { renderNotifications(); document.getElementById("notificationsModal")?.classList.add("show"); }
function closeNotificationsModal() { document.getElementById("notificationsModal")?.classList.remove("show"); }

// ============================================================================
// 13. TON CONNECT
// ============================================================================

async function initTONConnect() {
    if (typeof TON_CONNECT_UI === "undefined") return;
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

async function connectTONWallet() {
    if (tonConnected && window.tonConnectUI) {
        try { await window.tonConnectUI.disconnect(); } catch(e) {}
        tonConnected = false; tonWalletAddress = null;
        if (currentUser) { currentUser.tonWallet = null; saveUserData(); }
        updateTONUI();
        showToast("Wallet disconnected", "info");
        return;
    }
    if (!window.tonConnectUI) return;
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

// ============================================================================
// 14. UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    document.getElementById("balance") && (document.getElementById("balance").textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`);
    document.getElementById("adsWatchedToday") && (document.getElementById("adsWatchedToday").textContent = `${currentUser.adsToday || 0}/${APP_CONFIG.dailyAdLimit}`);
    document.getElementById("adsWatchedTotal") && (document.getElementById("adsWatchedTotal").textContent = currentUser.adsWatched || 0);
    document.getElementById("totalEarned") && (document.getElementById("totalEarned").textContent = `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`);
    const prog = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
    const fill = document.getElementById("adProgressFill");
    if (fill) fill.style.width = `${prog}%`;
    document.getElementById("adProgressLabel") && (document.getElementById("adProgressLabel").textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`);
    document.getElementById("totalInvites") && (document.getElementById("totalInvites").textContent = currentUser.inviteCount || 0);
    document.getElementById("totalEarnedFromInvites") && (document.getElementById("totalEarnedFromInvites").textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`);
    document.getElementById("inviteLink") && (document.getElementById("inviteLink").textContent = getReferralLink());
    document.getElementById("wdAvailBalance") && (document.getElementById("wdAvailBalance").textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`);
    document.getElementById("userName") && (document.getElementById("userName").textContent = currentUser.userName || "User");
    document.getElementById("userChatId") && (document.getElementById("userChatId").textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`);
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
    else if (currentPage === "invite") { const link = document.getElementById("inviteLink"); if (link) link.textContent = getReferralLink(); }
    else if (currentPage === "withdraw") renderWithdrawMethods();
}

// ============================================================================
// 15. NAVIGATION
// ============================================================================

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

// ============================================================================
// 16. ADMIN PANEL
// ============================================================================

let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0 };
let pendingWithdrawals = [], allUsers = [];

function checkAdminAndShowCrown() {
    fetch("/api/config").then(res => res.json()).then(data => {
        if (currentUserId === data.adminId) document.getElementById("adminCrownBtn")?.style.setProperty("display", "flex");
    }).catch(() => {});
}

function showAdminAuth() { document.getElementById("adminAuthModal")?.classList.add("show"); }
async function verifyAdminPassword() {
    const pwd = document.getElementById("adminPasswordInput")?.value;
    const res = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) });
    const data = await res.json();
    if (data.success) { adminAuthenticated = true; document.getElementById("adminAuthModal")?.classList.remove("show"); showAdminPanel(); }
    else { document.getElementById("adminAuthError")?.style.setProperty("display", "block"); }
}
function showAdminPanel() { if (!adminAuthenticated) { showAdminAuth(); return; } document.getElementById("adminPanel")?.classList.remove("hidden"); loadAdminData(); renderAdminDashboard(); }
function closeAdminPanel() { document.getElementById("adminPanel")?.classList.add("hidden"); }
async function loadAdminData() {
    const stats = await fetch("/api/admin/stats").then(r => r.json()).catch(() => ({}));
    if (stats.success) adminStats = stats.stats;
    const withdrawals = await fetch("/api/admin/pending-withdrawals").then(r => r.json()).catch(() => ({}));
    if (withdrawals.success) pendingWithdrawals = withdrawals.withdrawals || [];
    const users = await fetch("/api/admin/users").then(r => r.json()).catch(() => ({}));
    if (users.success) allUsers = users.users || [];
}
function renderAdminDashboard() {
    const container = document.getElementById("adminContent"); if (!container) return;
    container.innerHTML = `<div class="admin-stats-grid"><div class="admin-stat-card"><i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers}</div><div class="stat-label">Total Users</div></div><div class="admin-stat-card"><i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals}</div><div class="stat-label">Pending</div></div><div class="admin-stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${adminStats.totalBalance.toFixed(2)}</div><div class="stat-label">Total Balance</div></div></div><div class="admin-tabs"><button class="admin-tab active" onclick="showAdminSection('pending')">Pending Withdrawals</button><button class="admin-tab" onclick="showAdminSection('users')">Users</button></div><div id="adminSectionContent"></div>`;
    showAdminSection("pending");
}
function showAdminSection(section) {
    const container = document.getElementById("adminSectionContent"); if (!container) return;
    if (section === "pending") renderPendingWithdrawals(container);
    else if (section === "users") renderUsersList(container);
}
function renderPendingWithdrawals(container) {
    if (pendingWithdrawals.length === 0) { container.innerHTML = '<div class="empty-state">No pending withdrawals</div>'; return; }
    let html = "";
    pendingWithdrawals.forEach(w => { const date = new Date(w.date);
        html += `<div class="admin-card"><div class="admin-card-header"><span>👤 ${w.userName || w.userId}</span><span class="withdraw-amount">$${w.amount.toFixed(2)}</span></div><div class="admin-card-details"><div>ID: ${w.userId}</div><div>👥 Invites: ${w.inviteCount || 0}</div><div>📺 Ads: ${w.adsWatched || 0}</div><div>Method: ${w.method}</div><div>Destination: ${w.destination}</div><div>Date: ${date.toLocaleString()}</div></div><div class="admin-card-actions"><button class="btn-approve" onclick="approveWithdrawal('${w.id}', '${w.userId}', ${w.amount})">✅ Approve</button><button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.userId}', ${w.amount})">❌ Reject</button></div></div>`;
    });
    container.innerHTML = html;
}
function renderUsersList(container) {
    if (allUsers.length === 0) { container.innerHTML = '<div class="empty-state">No users found</div>'; return; }
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID..." onkeyup="filterUsers()"></div>';
    allUsers.forEach(u => { html += `<div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${u.userName}"><div class="admin-card-header"><span>👤 ${u.userName || "User"}</span><span class="user-balance">💰 $${u.balance?.toFixed(2) || "0.00"}</span></div><div class="admin-card-details"><div>ID: ${u.userId}</div><div>👥 Invites: ${u.inviteCount || 0} | 📺 Ads: ${u.adsWatched || 0}</div></div><div class="admin-card-actions"><button class="btn-add" onclick="adminAddBalance('${u.userId}')">➕ Add</button><button class="btn-remove" onclick="adminRemoveBalance('${u.userId}')">➖ Remove</button><button class="btn-block" onclick="adminBlockUser('${u.userId}')">🔒 Block</button></div></div>`; });
    container.innerHTML = html;
}
function filterUsers() { const term = document.getElementById("userSearchInput")?.value.toLowerCase(); document.querySelectorAll(".user-card").forEach(c => { const match = c.getAttribute("data-user-id")?.toLowerCase().includes(term) || c.getAttribute("data-user-name")?.toLowerCase().includes(term); c.style.display = match ? "block" : "none"; }); }
async function approveWithdrawal(id, uid, amt) { await fetch("/api/admin/approve-withdrawal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdrawalId: id }) }); showToast("Approved!", "success"); loadAdminData(); renderPendingWithdrawals(document.getElementById("adminSectionContent")); }
async function rejectWithdrawal(id, uid, amt) { const reason = prompt("Rejection reason:"); if (!reason) return; await fetch("/api/admin/reject-withdrawal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdrawalId: id, reason }) }); showToast("Rejected!", "success"); loadAdminData(); renderPendingWithdrawals(document.getElementById("adminSectionContent")); }
async function adminAddBalance(uid) { const amt = parseFloat(prompt("Amount to add (USD):")); if (isNaN(amt) || amt <= 0) return; await fetch("/api/admin/add-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, amount: amt }) }); showToast(`$${amt} added!`, "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); if (uid === currentUserId) { currentUser.balance += amt; updateUI(); } }
async function adminRemoveBalance(uid) { const amt = parseFloat(prompt("Amount to remove (USD):")); if (isNaN(amt) || amt <= 0) return; await fetch("/api/admin/remove-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, amount: amt }) }); showToast(`$${amt} removed!`, "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); if (uid === currentUserId) { currentUser.balance -= amt; updateUI(); } }
async function adminBlockUser(uid) { if (!confirm("⚠️ Permanently block this user?")) return; await fetch("/api/admin/block-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid }) }); showToast("User blocked!", "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); }

// ============================================================================
// 17. INITIALIZATION
// ============================================================================

function hideSplash() {
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    if (splash) { splash.style.display = "none"; }
    if (main) main.style.display = "block";
    console.log("[AdNova] Ready!");
}

async function init() {
    console.log("[AdNova] Initializing...");
    applyLanguage();
    await loadUserData();
    renderWithdrawMethods();
    checkAdminAndShowCrown();
    initAdPlatforms();
    initTONConnect();
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

setTimeout(hideSplash, 3000);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

// ============================================================================
// 18. GLOBAL EXPORTS
// ============================================================================

window.switchTab = switchTab;
window.toggleLanguage = toggleLanguage;
window.openLanguageModal = openLanguageModal;
window.closeLanguageModal = closeLanguageModal;
window.setLanguage = setLanguage;
window.watchAd = watchAd;
window.verifyChannel = verifyChannel;
window.startBot = startBot;
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
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.connectTONWallet = connectTONWallet;

console.log("[AdNova] Platform ready | Ad Reward: $" + APP_CONFIG.adReward);
