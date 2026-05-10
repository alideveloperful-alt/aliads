// ============================================================================
// ADNOVA NETWORK - FRONTEND v16.0 (VIP System + Floating Notifications)
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// 1. 🚀 TELEGRAM WEBAPP INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    console.log("[AdNova] Telegram WebApp initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. 📦 GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentUser = null;
let currentUserId = null;
let currentPage = "ads";
let adminAuthenticated = false;
let adminToken = null;
let unreadNotifications = 0;
let adPlaying = false;
let currentLanguage = localStorage.getItem("adnova_lang") || "en";
let selectedWithdrawMethod = "paypal";
let adPlatformsInitialized = false;
let tonConnected = false;
let tonWalletAddress = null;
let tasksList = [];
let userCompletedTasks = [];
let adminTasksList = [];
let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0, totalEarned: 0 };
let pendingWithdrawals = [];
let allUsers = [];

let pendingWithdrawalData = null;
let PLATFORM_TON_WALLET = null;

// ذاكرة تخزين الإعلانات
let localAdCache = {
    balance: 0,
    totalEarned: 0,
    adsWatched: 0,
    adsToday: 0,
    lastAdDate: null,
    lastSync: null
};
let syncIntervalId = null;
const SYNC_INTERVAL_HOURS = 6;

let APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.10,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 1,
    requiredReferralsForVerify: 30,
    botUsername: "AdNovaNetworkBot",
    adminId: null,
    platformTonWallet: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. 💳 WITHDRAWAL METHODS
// ═══════════════════════════════════════════════════════════════════════════

const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", emoji: null, placeholder: "example@email.com", label: "PayPal Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "payoneer", name: "Payoneer", icon: "fas fa-university", emoji: null, placeholder: "example@email.com", label: "Payoneer Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", emoji: null, placeholder: "0x...", label: "BSC Wallet Address", regex: /^0x[a-fA-F0-9]{40}$/ },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", emoji: null, placeholder: "T...", label: "TRC20 Address", regex: /^T[a-zA-Z0-9]{33}$/ },
    { id: "ton", name: "TON", icon: "fab fa-telegram", emoji: null, placeholder: "EQ...", label: "TON Address", regex: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/ },
    { id: "binance_pay", name: "Binance Pay", icon: "fas fa-shield-alt", emoji: null, placeholder: "Binance ID", label: "Binance ID", regex: /^[a-zA-Z0-9]{5,20}$/ },
    { id: "sbp", name: "SBP (Russia)", icon: "fas fa-phone", emoji: null, placeholder: "+71234567890", label: "Phone +7", regex: /^\+7\d{10}$/ },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", emoji: null, placeholder: "+1234567890", label: "Mobile Phone", regex: /^\+\d{10,15}$/ },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", emoji: null, placeholder: "Player ID", label: "Player ID", regex: /^[a-zA-Z0-9]{5,20}$/ },
    { id: "freefire", name: "Free Fire", icon: "fas fa-gem", emoji: null, placeholder: "Player ID", label: "Free Fire ID", regex: /^[a-zA-Z0-9]{5,20}$/ }
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. 🎬 AD PLATFORMS
// ═══════════════════════════════════════════════════════════════════════════

const AD_PLATFORMS = [
    {
        name: "Monetag",
        show: () => {
            if (typeof show_10950362 === "function") {
                return show_10950362();
            }
            return Promise.reject("Monetag not ready");
        }
    },
    {
        name: "OnClickA",
        init: () => {
            if (typeof window.initCdTma === "function" && !window.show) {
                window.initCdTma({ id: '6118161' }).then(show => {
                    window.show = show;
                    console.log("✅ OnClickA initialized");
                }).catch(e => console.error("OnClickA init error:", e));
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                if (window.show && typeof window.show === "function") {
                    window.show().then(() => {
                        console.log("✅ OnClickA rewarded video completed");
                        resolve();
                    }).catch(reject);
                } else {
                    reject("OnClickA not ready");
                }
            });
        }
    },
    {
        name: "RichAds",
        init: () => {
            if (!window.richadsController && typeof TelegramAdsController !== "undefined") {
                try {
                    window.richadsController = new TelegramAdsController();
                    window.richadsController.initialize({
                        pubId: "1009657",
                        appId: "7284",
                        debug: false
                    });
                    console.log("✅ RichAds controller initialized");
                } catch(e) {
                    console.error("RichAds init error:", e);
                }
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.richadsController && typeof TelegramAdsController !== "undefined") {
                        window.richadsController = new TelegramAdsController();
                        window.richadsController.initialize({
                            pubId: "1009657",
                            appId: "7284",
                            debug: false
                        });
                    }

                    if (!window.richadsController) {
                        reject("RichAds not initialized");
                        return;
                    }

                    let resolved = false;
                    let timeoutId = null;

                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                    };

                    const onSuccess = () => {
                        if (resolved) return;
                        resolved = true;
                        cleanup();
                        console.log("✅ RichAds ad completed");
                        resolve();
                    };

                    const onError = (err) => {
                        if (resolved) return;
                        resolved = true;
                        cleanup();
                        console.log("❌ RichAds error:", err);
                        reject(err || "RichAds ad failed");
                    };

                    timeoutId = setTimeout(() => {
                        if (!resolved) {
                            console.log("❌ RichAds timeout");
                            onError("RichAds timeout");
                        }
                    }, 15000);

                    if (typeof window.richadsController.triggerInterstitialVideo === "function") {
                        window.richadsController.triggerInterstitialVideo().then(onSuccess).catch(onError);
                    } else if (typeof window.richadsController.showInterstitial === "function") {
                        window.richadsController.showInterstitial().then(onSuccess).catch(onError);
                    } else if (typeof window.richadsController.showAd === "function") {
                        window.richadsController.showAd().then(onSuccess).catch(onError);
                    } else {
                        reject("RichAds no show method found");
                    }

                } catch(e) {
                    reject("RichAds error: " + e.message);
                }
            });
        }
    },
    {
        name: "Adexium",
        init: () => {
            if (!window.adexiumWidget && typeof AdexiumWidget !== "undefined") {
                try {
                    window.adexiumWidget = new AdexiumWidget({
                        wid: '074d0b62-98c8-430a-8ad9-183693879f0d',
                        adFormat: 'interstitial'
                    });
                    console.log("✅ Adexium widget initialized");
                } catch(e) {
                    console.error("Adexium init error:", e);
                }
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.adexiumWidget && typeof AdexiumWidget !== "undefined") {
                        window.adexiumWidget = new AdexiumWidget({
                            wid: '074d0b62-98c8-430a-8ad9-183693879f0d',
                            adFormat: 'interstitial'
                        });
                    }

                    if (!window.adexiumWidget) {
                        reject("Adexium widget not initialized");
                        return;
                    }

                    let resolved = false;
                    let timeoutId = null;

                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        try {
                            window.adexiumWidget.off('adReceived', onAdReceived);
                            window.adexiumWidget.off('noAdFound', onNoAdFound);
                            window.adexiumWidget.off('adPlaybackCompleted', onAdPlaybackCompleted);
                            window.adexiumWidget.off('adClosed', onAdClosed);
                            window.adexiumWidget.off('adDisplayed', onAdDisplayed);
                        } catch(e) {}
                    };

                    const onAdReceived = (ad) => {
                        if (resolved) return;
                        console.log("✅ Adexium ad received:", ad);
                        try {
                            window.adexiumWidget.displayAd(ad);
                        } catch(e) {
                            cleanup();
                            reject("Failed to display ad: " + e.message);
                        }
                    };

                    const onNoAdFound = () => {
                        if (resolved) return;
                        console.log("❌ Adexium no ad found");
                        cleanup();
                        reject("No ad available");
                    };

                    const onAdPlaybackCompleted = () => {
                        if (resolved) return;
                        console.log("✅ Adexium ad playback completed");
                        resolved = true;
                        cleanup();
                        resolve();
                    };

                    const onAdClosed = () => {
                        if (resolved) return;
                        console.log("❌ Adexium ad closed by user");
                        cleanup();
                        reject("Ad closed by user");
                    };

                    const onAdDisplayed = () => {
                        console.log("✅ Adexium ad displayed");
                    };

                    window.adexiumWidget.on('adReceived', onAdReceived);
                    window.adexiumWidget.on('noAdFound', onNoAdFound);
                    window.adexiumWidget.on('adPlaybackCompleted', onAdPlaybackCompleted);
                    window.adexiumWidget.on('adClosed', onAdClosed);
                    window.adexiumWidget.on('adDisplayed', onAdDisplayed);

                    timeoutId = setTimeout(() => {
                        if (!resolved) {
                            console.log("❌ Adexium request timeout");
                            cleanup();
                            reject("Ad request timeout");
                        }
                    }, 15000);

                    window.adexiumWidget.requestAd("interstitial");

                } catch(e) {
                    reject("Adexium error: " + e.message);
                }
            });
        }
    },
    {
        name: "GigaPub",
        show: () => {
            if (typeof window.showGiga === "function") {
                return window.showGiga();
            }
            return Promise.reject("GigaPub not ready");
        }
    }
];

function initAdPlatforms() {
    if (adPlatformsInitialized) return;
    
    console.log("🎬 Initializing ad platforms...");
    
    if (typeof window.initCdTma === "function" && !window.show) {
        window.initCdTma({ id: '6118161' }).then(show => {
            window.show = show;
            console.log("✅ OnClickA initialized");
        }).catch(e => console.error("OnClickA init error:", e));
    }
    
    if (typeof TelegramAdsController !== "undefined" && !window.richadsController) {
        try {
            window.richadsController = new TelegramAdsController();
            window.richadsController.initialize({
                pubId: "1009657",
                appId: "7284",
                debug: false
            });
            console.log("✅ RichAds initialized");
        } catch(e) {
            console.error("RichAds init error:", e);
        }
    }
    
    if (typeof AdexiumWidget !== "undefined" && !window.adexiumWidget) {
        try {
            window.adexiumWidget = new AdexiumWidget({
                wid: '074d0b62-98c8-430a-8ad9-183693879f0d',
                adFormat: 'interstitial'
            });
            console.log("✅ Adexium initialized");
        } catch(e) {
            console.error("Adexium init error:", e);
        }
    }
    
    adPlatformsInitialized = true;
}

async function showSingleAd(excludePlatformNames = []) {
    let platforms = AD_PLATFORMS;
    
    if (excludePlatformNames.length > 0) {
        platforms = AD_PLATFORMS.filter(p => !excludePlatformNames.includes(p.name));
    }
    
    const shuffled = [...platforms].sort(() => Math.random() - 0.5);
    
    for (const platform of shuffled) {
        try {
            console.log(`📢 Trying: ${platform.name}`);
            
            if (platform.init) {
                platform.init();
            }
            
            await platform.show();
            console.log(`✅ Ad completed from: ${platform.name}`);
            return { success: true, platformName: platform.name };
            
        } catch(error) {
            console.log(`❌ Failed from ${platform.name}:`, error);
        }
    }
    
    return { success: false, platformName: null };
}

let adSequenceInProgress = false;

async function showAdSequence() {
    if (adSequenceInProgress) {
        console.log("⏳ Ad sequence already in progress");
        return false;
    }
    
    adSequenceInProgress = true;
    let successCount = 0;
    let lastPlatformName = null;
    
    console.log("🎬 Starting ad sequence (2 ads required for reward)");
    
    const firstAd = await showSingleAd();
    if (firstAd.success) {
        successCount++;
        lastPlatformName = firstAd.platformName;
        console.log(`✅ First ad completed from: ${lastPlatformName}`);
    } else {
        adSequenceInProgress = false;
        return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const secondAd = await showSingleAd([lastPlatformName]);
    if (secondAd.success) {
        successCount++;
        console.log(`✅ Second ad completed from: ${secondAd.platformName}`);
    } else {
        console.log(`❌ Second ad failed`);
    }
    
    adSequenceInProgress = false;
    const result = successCount === 2;
    console.log(`🎬 Ad sequence result: ${result ? "SUCCESS ✅" : "FAILED ❌"}`);
    
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🌍 LANGUAGE SYSTEM
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
        appName: "AdNova Network",
        withdrawalHistory: "Withdrawal History",
        recentRequests: "Your recent withdrawal requests",
        totalBalance: "Total Balance",
        availableToWithdraw: "Available to withdraw",
        watchAds: "Watch Ads",
        completeTasks: "Complete Tasks",
        inviteFriends: "Invite Friends",
        watchAndEarn: "Watch Ads & Earn",
        watchAdBtn: "Watch Ad",
        watchAdBtnSub: "Complete video to earn instantly",
        readyToEarn: "Ready to earn",
        totalWatched: "Total Watched",
        adsUnit: "ads",
        totalEarned: "Total Earned",
        taskHeaderTitle: "Complete Tasks & Earn Rewards",
        inviteAndEarn: "Invite & Earn",
        yourInviteLink: "Your Invite Link",
        copy: "Copy",
        shareWithFriends: "Share",
        friendsInvited: "Friends Invited",
        earnedFromInvites: "Earned from Invites",
        paymentMethod: "Payment Method",
        amount: "Amount",
        availableBalance: "Available balance:",
        submitWithdrawal: "Submit Withdrawal",
        navAds: "Ads",
        navTasks: "Tasks",
        navInvite: "Invite",
        navWithdraw: "Withdraw",
        notificationsTitle: "Notifications",
        clearRead: "Clear Read",
        clearAll: "Clear All",
        loadingAd: "Loading ad...",
        adRewardAdded: "+${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow",
        adError: "Error loading ad",
        linkCopied: "Link copied!",
        taskCompleted: "+${amount} added!",
        insufficientBalance: "Insufficient balance",
        chooseLanguage: "Choose your language",
        success: "Success!",
        error: "Error!",
        warning: "Warning!",
        info: "Info",
        adminPanel: "Admin Panel",
        users: "Users",
        pendingWithdrawals: "Pending Withdrawals",
        approve: "Approve",
        reject: "Reject",
        addBalance: "Add Balance",
        removeBalance: "Remove Balance",
        blockUser: "Block User",
        broadcast: "Broadcast",
        manageTasks: "Manage Tasks",
        addTask: "Add Task",
        editTask: "Edit Task",
        deleteTask: "Delete Task",
        taskName: "Task Name",
        taskReward: "Reward (USD)",
        taskType: "Task Type",
        taskIdentifier: "Username / Link",
        resetPeriod: "Reset Period",
        daily: "Daily",
        weekly: "Weekly",
        once: "Once",
        statusApproved: "Approved",
        statusRejected: "Rejected",
        statusPending: "Pending",
        reason: "Reason"
    },
    ar: {
        appName: "أد نوفا نتورك",
        withdrawalHistory: "تاريخ السحوبات",
        recentRequests: "طلبات السحب الأخيرة",
        totalBalance: "الرصيد الإجمالي",
        availableToWithdraw: "متاح للسحب",
        watchAds: "مشاهدة الإعلانات",
        completeTasks: "إكمال المهام",
        inviteFriends: "دعوة الأصدقاء",
        watchAndEarn: "شاهد واكسب",
        watchAdBtn: "شاهد إعلان",
        watchAdBtnSub: "أكمل الفيديو لتكسب فوراً",
        readyToEarn: "جاهز للربح",
        totalWatched: "إجمالي المشاهدات",
        adsUnit: "إعلانات",
        totalEarned: "إجمالي الأرباح",
        taskHeaderTitle: "أكمل المهام واكسب المكافآت",
        inviteAndEarn: "ادع واكسب",
        yourInviteLink: "رابط دعوتك",
        copy: "نسخ",
        shareWithFriends: "مشاركة",
        friendsInvited: "الأصدقاء المدعوون",
        earnedFromInvites: "الأرباح من الدعوات",
        paymentMethod: "طريقة الدفع",
        amount: "المبلغ",
        availableBalance: "الرصيد المتاح:",
        submitWithdrawal: "تقديم طلب السحب",
        navAds: "إعلانات",
        navTasks: "مهام",
        navInvite: "دعوة",
        navWithdraw: "سحب",
        notificationsTitle: "الإشعارات",
        clearRead: "حذف المقروء",
        clearAll: "حذف الكل",
        loadingAd: "جاري تحميل الإعلان...",
        adRewardAdded: "+${amount} أضيفت!",
        dailyLimitReached: "تم الوصول للحد اليومي! عد غداً",
        adError: "خطأ في تحميل الإعلان",
        linkCopied: "تم نسخ الرابط!",
        taskCompleted: "+${amount} أضيفت!",
        insufficientBalance: "رصيد غير كافٍ",
        chooseLanguage: "اختر لغتك",
        success: "تم بنجاح!",
        error: "خطأ!",
        warning: "تحذير!",
        info: "معلومات",
        adminPanel: "لوحة المشرف",
        users: "المستخدمين",
        pendingWithdrawals: "طلبات السحب",
        approve: "موافقة",
        reject: "رفض",
        addBalance: "إضافة رصيد",
        removeBalance: "خصم رصيد",
        blockUser: "حظر المستخدم",
        broadcast: "بث جماعي",
        manageTasks: "إدارة المهام",
        addTask: "إضافة مهمة",
        editTask: "تعديل مهمة",
        deleteTask: "حذف مهمة",
        taskName: "اسم المهمة",
        taskReward: "المكافأة (دولار)",
        taskType: "نوع المهمة",
        taskIdentifier: "اسم المستخدم / الرابط",
        resetPeriod: "فترة التجديد",
        daily: "يومي",
        weekly: "أسبوعي",
        once: "مرة واحدة",
        statusApproved: "تمت الموافقة",
        statusRejected: "مرفوض",
        statusPending: "قيد المراجعة",
        reason: "السبب"
    },
    es: {
        appName: "AdNova Network",
        withdrawalHistory: "Historial de Retiros",
        recentRequests: "Solicitudes recientes",
        totalBalance: "Saldo Total",
        availableToWithdraw: "Disponible para retirar",
        watchAds: "Ver Anuncios",
        completeTasks: "Completar Tareas",
        inviteFriends: "Invitar Amigos",
        watchAndEarn: "Ver Anuncios y Ganar",
        watchAdBtn: "Ver Anuncio",
        watchAdBtnSub: "Completa el video para ganar al instante",
        readyToEarn: "Listo para ganar",
        totalWatched: "Total Vistos",
        adsUnit: "anuncios",
        totalEarned: "Ganado Total",
        taskHeaderTitle: "Completa Tareas y Gana Recompensas",
        inviteAndEarn: "Invita y Gana",
        yourInviteLink: "Tu Enlace de Invitación",
        copy: "Copiar",
        shareWithFriends: "Compartir",
        friendsInvited: "Amigos Invitados",
        earnedFromInvites: "Ganado por Invitaciones",
        paymentMethod: "Método de Pago",
        amount: "Cantidad",
        availableBalance: "Saldo disponible:",
        submitWithdrawal: "Enviar Solicitud",
        navAds: "Anuncios",
        navTasks: "Tareas",
        navInvite: "Invitar",
        navWithdraw: "Retirar",
        notificationsTitle: "Notificaciones",
        clearRead: "Borrar Leídos",
        clearAll: "Borrar Todo",
        loadingAd: "Cargando anuncio...",
        adRewardAdded: "+${amount} añadido!",
        dailyLimitReached: "¡Límite diario alcanzado! Vuelve mañana",
        adError: "Error al cargar el anuncio",
        linkCopied: "¡Enlace copiado!",
        taskCompleted: "+${amount} añadido!",
        insufficientBalance: "Saldo insuficiente",
        chooseLanguage: "Elige tu idioma",
        success: "¡Éxito!",
        error: "¡Error!",
        warning: "¡Advertencia!",
        info: "Información",
        adminPanel: "Panel de Administración",
        users: "Usuarios",
        pendingWithdrawals: "Retiros Pendientes",
        approve: "Aprobar",
        reject: "Rechazar",
        addBalance: "Agregar Saldo",
        removeBalance: "Quitar Saldo",
        blockUser: "Bloquear Usuario",
        broadcast: "Transmisión",
        manageTasks: "Gestionar Tareas",
        addTask: "Agregar Tarea",
        editTask: "Editar Tarea",
        deleteTask: "Eliminar Tarea",
        taskName: "Nombre de la Tarea",
        taskReward: "Recompensa (USD)",
        taskType: "Tipo de Tarea",
        taskIdentifier: "Usuario / Enlace",
        resetPeriod: "Período de Reinicio",
        daily: "Diario",
        weekly: "Semanal",
        once: "Una vez",
        statusApproved: "Aprobado",
        statusRejected: "Rechazado",
        statusPending: "Pendiente",
        reason: "Razón"
    },
    fr: {
        appName: "AdNova Network",
        withdrawalHistory: "Historique des Retraits",
        recentRequests: "Demandes récentes",
        totalBalance: "Solde Total",
        availableToWithdraw: "Disponible pour retrait",
        watchAds: "Regarder des Publicités",
        completeTasks: "Terminer les Tâches",
        inviteFriends: "Inviter des Amis",
        watchAndEarn: "Regardez et Gagnez",
        watchAdBtn: "Regarder une Pub",
        watchAdBtnSub: "Terminez la vidéo pour gagner instantanément",
        readyToEarn: "Prêt à gagner",
        totalWatched: "Total vus",
        adsUnit: "pubs",
        totalEarned: "Total gagné",
        taskHeaderTitle: "Terminez les tâches et gagnez des récompenses",
        inviteAndEarn: "Invitez et Gagnez",
        yourInviteLink: "Votre lien d'invitation",
        copy: "Copier",
        shareWithFriends: "Partager",
        friendsInvited: "Amis invités",
        earnedFromInvites: "Gagné par les invitations",
        paymentMethod: "Méthode de paiement",
        amount: "Montant",
        availableBalance: "Solde disponible:",
        submitWithdrawal: "Soumettre le retrait",
        navAds: "Pubs",
        navTasks: "Tâches",
        navInvite: "Inviter",
        navWithdraw: "Retirer",
        notificationsTitle: "Notifications",
        clearRead: "Effacer les lus",
        clearAll: "Tout effacer",
        loadingAd: "Chargement de la pub...",
        adRewardAdded: "+${amount} ajouté!",
        dailyLimitReached: "Limite quotidienne atteinte! Revenez demain",
        adError: "Erreur de chargement",
        linkCopied: "Lien copié!",
        taskCompleted: "+${amount} ajouté!",
        insufficientBalance: "Solde insuffisant",
        chooseLanguage: "Choisissez votre langue",
        success: "Succès!",
        error: "Erreur!",
        warning: "Attention!",
        info: "Info",
        adminPanel: "Panneau d'administration",
        users: "Utilisateurs",
        pendingWithdrawals: "Retraits en attente",
        approve: "Approuver",
        reject: "Rejeter",
        addBalance: "Ajouter du solde",
        removeBalance: "Retirer du solde",
        blockUser: "Bloquer l'utilisateur",
        broadcast: "Diffusion",
        manageTasks: "Gérer les tâches",
        addTask: "Ajouter une tâche",
        editTask: "Modifier la tâche",
        deleteTask: "Supprimer la tâche",
        taskName: "Nom de la tâche",
        taskReward: "Récompense (USD)",
        taskType: "Type de tâche",
        taskIdentifier: "Nom d'utilisateur / Lien",
        resetPeriod: "Période de réinitialisation",
        daily: "Quotidien",
        weekly: "Hebdomadaire",
        once: "Une fois",
        statusApproved: "Approuvé",
        statusRejected: "Rejeté",
        statusPending: "En attente",
        reason: "Raison"
    },
    ru: {
        appName: "AdNova Network",
        withdrawalHistory: "История выводов",
        recentRequests: "Недавние запросы",
        totalBalance: "Общий баланс",
        availableToWithdraw: "Доступно для вывода",
        watchAds: "Смотреть рекламу",
        completeTasks: "Выполнять задания",
        inviteFriends: "Приглашать друзей",
        watchAndEarn: "Смотрите и зарабатывайте",
        watchAdBtn: "Смотреть рекламу",
        watchAdBtnSub: "Посмотрите видео и получите награду",
        readyToEarn: "Готов к заработку",
        totalWatched: "Всего просмотров",
        adsUnit: "реклам",
        totalEarned: "Всего заработано",
        taskHeaderTitle: "Выполняйте задания и получайте награды",
        inviteAndEarn: "Приглашайте и зарабатывайте",
        yourInviteLink: "Ваша реферальная ссылка",
        copy: "Копировать",
        shareWithFriends: "Поделиться",
        friendsInvited: "Приглашено друзей",
        earnedFromInvites: "Заработано на приглашениях",
        paymentMethod: "Способ оплаты",
        amount: "Сумма",
        availableBalance: "Доступный баланс:",
        submitWithdrawal: "Отправить запрос",
        navAds: "Реклама",
        navTasks: "Задания",
        navInvite: "Пригласить",
        navWithdraw: "Вывод",
        notificationsTitle: "Уведомления",
        clearRead: "Очистить прочитанные",
        clearAll: "Очистить все",
        loadingAd: "Загрузка рекламы...",
        adRewardAdded: "+${amount} добавлено!",
        dailyLimitReached: "Дневной лимит достигнут! Возвращайтесь завтра",
        adError: "Ошибка загрузки рекламы",
        linkCopied: "Ссылка скопирована!",
        taskCompleted: "+${amount} добавлено!",
        insufficientBalance: "Недостаточно средств",
        chooseLanguage: "Выберите язык",
        success: "Успех!",
        error: "Ошибка!",
        warning: "Внимание!",
        info: "Информация",
        adminPanel: "Панель администратора",
        users: "Пользователи",
        pendingWithdrawals: "Ожидающие выводы",
        approve: "Одобрить",
        reject: "Отклонить",
        addBalance: "Добавить баланс",
        removeBalance: "Списать баланс",
        blockUser: "Заблокировать",
        broadcast: "Рассылк",
        manageTasks: "Управление заданиями",
        addTask: "Добавить задание",
        editTask: "Редактировать",
        deleteTask: "Удалить",
        taskName: "Название задания",
        taskReward: "Награда (USD)",
        taskType: "Тип задания",
        taskIdentifier: "Имя пользователя / Ссылка",
        resetPeriod: "Период сброса",
        daily: "Ежедневно",
        weekly: "Еженедельно",
        once: "Один раз",
        statusApproved: "Одобрен",
        statusRejected: "Отклонен",
        statusPending: "В обработке",
        reason: "Причина"
    },
    pt: {
        appName: "AdNova Network",
        withdrawalHistory: "Histórico de Saques",
        recentRequests: "Solicitações recentes",
        totalBalance: "Saldo Total",
        availableToWithdraw: "Disponível para saque",
        watchAds: "Assistir Anúncios",
        completeTasks: "Completar Tarefas",
        inviteFriends: "Convidar Amigos",
        watchAndEarn: "Assista e Ganhe",
        watchAdBtn: "Assistir Anúncio",
        watchAdBtnSub: "Complete o vídeo para ganhar instantaneamente",
        readyToEarn: "Pronto para ganhar",
        totalWatched: "Total Assistidos",
        adsUnit: "anúncios",
        totalEarned: "Total Ganho",
        taskHeaderTitle: "Complete tarefas e ganhe recompensas",
        inviteAndEarn: "Convide e Ganhe",
        yourInviteLink: "Seu link de convite",
        copy: "Copiar",
        shareWithFriends: "Compartilhar",
        friendsInvited: "Amigos Convidados",
        earnedFromInvites: "Ganho com Convites",
        paymentMethod: "Método de Pagamento",
        amount: "Valor",
        availableBalance: "Saldo disponível:",
        submitWithdrawal: "Solicitar Saque",
        navAds: "Anúncios",
        navTasks: "Tarefas",
        navInvite: "Convidar",
        navWithdraw: "Sacar",
        notificationsTitle: "Notificações",
        clearRead: "Limpar Lidos",
        clearAll: "Limpar Tudo",
        loadingAd: "Carregando anúncio...",
        adRewardAdded: "+${amount} adicionado!",
        dailyLimitReached: "Limite diário atingido! Volte amanhã",
        adError: "Erro ao carregar anúncio",
        linkCopied: "Link copiado!",
        taskCompleted: "+${amount} adicionado!",
        insufficientBalance: "Saldo insuficiente",
        chooseLanguage: "Escolha seu idioma",
        success: "Sucesso!",
        error: "Erro!",
        warning: "Atenção!",
        info: "Informação",
        adminPanel: "Painel Admin",
        users: "Usuários",
        pendingWithdrawals: "Saques Pendentes",
        approve: "Aprovar",
        reject: "Rejeitar",
        addBalance: "Adicionar Saldo",
        removeBalance: "Remover Saldo",
        blockUser: "Bloquear Usuário",
        broadcast: "Transmissão",
        manageTasks: "Gerenciar Tarefas",
        addTask: "Adicionar Tarefa",
        editTask: "Editar Tarefa",
        deleteTask: "Excluir Tarefa",
        taskName: "Nome da Tarefa",
        taskReward: "Recompensa (USD)",
        taskType: "Tipo de Tarefa",
        taskIdentifier: "Usuário / Link",
        resetPeriod: "Período de Reinício",
        daily: "Diário",
        weekly: "Semanal",
        once: "Uma vez",
        statusApproved: "Aprovado",
        statusRejected: "Rejeitado",
        statusPending: "Pendente",
        reason: "Motivo"
    },
    hi: {
        appName: "AdNova Network",
        withdrawalHistory: "निकासी इतिहास",
        recentRequests: "हाल के अनुरोध",
        totalBalance: "कुल शेष",
        availableToWithdraw: "निकासी के लिए उपलब्ध",
        watchAds: "विज्ञापन देखें",
        completeTasks: "कार्य पूर्ण करें",
        inviteFriends: "मित्रों को आमंत्रित करें",
        watchAndEarn: "देखें और कमाएं",
        watchAdBtn: "विज्ञापन देखें",
        watchAdBtnSub: "तुरंत कमाने के लिए वीडियो पूरा करें",
        readyToEarn: "कमाने के लिए तैयार",
        totalWatched: "कुल देखे गए",
        adsUnit: "विज्ञापन",
        totalEarned: "कुल कमाई",
        taskHeaderTitle: "कार्य पूर्ण करें और पुरस्कार कमाएं",
        inviteAndEarn: "आमंत्रित करें और कमाएं",
        yourInviteLink: "आपका आमंत्रण लिंक",
        copy: "कॉपी करें",
        shareWithFriends: "साझा करें",
        friendsInvited: "आमंत्रित मित्र",
        earnedFromInvites: "आमंत्रण से कमाई",
        paymentMethod: "भुगतान विधि",
        amount: "राशि",
        availableBalance: "उपलब्ध शेष:",
        submitWithdrawal: "निकासी जमा करें",
        navAds: "विज्ञापन",
        navTasks: "कार्य",
        navInvite: "आमंत्रित",
        navWithdraw: "निकासी",
        notificationsTitle: "सूचनाएं",
        clearRead: "पढ़े हुए हटाएं",
        clearAll: "सभी हटाएं",
        loadingAd: "विज्ञापन लोड हो रहा...",
        adRewardAdded: "+${amount} जोड़ा गया!",
        dailyLimitReached: "दैनिक सीमा समाप्त! कल वापस आएं",
        adError: "विज्ञापन लोड करने में त्रुटि",
        linkCopied: "लिंक कॉपी किया गया!",
        taskCompleted: "+${amount} जोड़ा गया!",
        insufficientBalance: "अपर्याप्त शेष",
        chooseLanguage: "अपनी भाषा चुनें",
        success: "सफलता!",
        error: "त्रुटि!",
        warning: "चेतावनी!",
        info: "जानकारी",
        adminPanel: "व्यवस्थापक पैनल",
        users: "उपयोगकर्ता",
        pendingWithdrawals: "लंबित निकासी",
        approve: "स्वीकार करें",
        reject: "अस्वीकार करें",
        addBalance: "शेष जोड़ें",
        removeBalance: "शेष घटाएं",
        blockUser: "उपयोगकर्ता ब्लॉक करें",
        broadcast: "प्रसारण",
        manageTasks: "कार्य प्रबंधित करें",
        addTask: "कार्य जोड़ें",
        editTask: "कार्य संपादित करें",
        deleteTask: "कार्य हटाएं",
        taskName: "कार्य का नाम",
        taskReward: "पुरस्कार (USD)",
        taskType: "कार्य प्रकार",
        taskIdentifier: "उपयोगकर्ता नाम / लिंक",
        resetPeriod: "रीसेट अवधि",
        daily: "दैनिक",
        weekly: "साप्ताहिक",
        once: "एक बार",
        statusApproved: "स्वीकृत",
        statusRejected: "अस्वीकृत",
        statusPending: "लंबित",
        reason: "कारण"
    },
    id: {
        appName: "AdNova Network",
        withdrawalHistory: "Riwayat Penarikan",
        recentRequests: "Permintaan Terbaru",
        totalBalance: "Total Saldo",
        availableToWithdraw: "Tersedia untuk ditarik",
        watchAds: "Tonton Iklan",
        completeTasks: "Selesaikan Tugas",
        inviteFriends: "Undang Teman",
        watchAndEarn: "Tonton & Dapatkan",
        watchAdBtn: "Tonton Iklan",
        watchAdBtnSub: "Selesaikan video untuk langsung mendapat",
        readyToEarn: "Siap mendapat",
        totalWatched: "Total Ditonton",
        adsUnit: "iklan",
        totalEarned: "Total Dihasilkan",
        taskHeaderTitle: "Selesaikan Tugas & Dapatkan Hadiah",
        inviteAndEarn: "Undang & Dapatkan",
        yourInviteLink: "Tautan Undangan Anda",
        copy: "Salin",
        shareWithFriends: "Bagikan",
        friendsInvited: "Teman Diundang",
        earnedFromInvites: "Dihasilkan dari Undangan",
        paymentMethod: "Metode Pembayaran",
        amount: "Jumlah",
        availableBalance: "Saldo tersedia:",
        submitWithdrawal: "Ajukan Penarikan",
        navAds: "Iklan",
        navTasks: "Tugas",
        navInvite: "Undang",
        navWithdraw: "Tarik",
        notificationsTitle: "Notifikasi",
        clearRead: "Hapus yang Dibaca",
        clearAll: "Hapus Semua",
        loadingAd: "Memuat iklan...",
        adRewardAdded: "+${amount} ditambahkan!",
        dailyLimitReached: "Batas harian tercapai! Kembali besok",
        adError: "Gagal memuat iklan",
        linkCopied: "Tautan disalin!",
        taskCompleted: "+${amount} ditambahkan!",
        insufficientBalance: "Saldo tidak mencukupi",
        chooseLanguage: "Pilih bahasa Anda",
        success: "Berhasil!",
        error: "Galat!",
        warning: "Peringatan!",
        info: "Info",
        adminPanel: "Panel Admin",
        users: "Pengguna",
        pendingWithdrawals: "Penarikan Tertunda",
        approve: "Setujui",
        reject: "Tolak",
        addBalance: "Tambah Saldo",
        removeBalance: "Kurangi Saldo",
        blockUser: "Blokir Pengguna",
        broadcast: "Siaran",
        manageTasks: "Kelola Tugas",
        addTask: "Tambah Tugas",
        editTask: "Edit Tugas",
        deleteTask: "Hapus Tugas",
        taskName: "Nama Tugas",
        taskReward: "Hadiah (USD)",
        taskType: "Jenis Tugas",
        taskIdentifier: "Nama Pengguna / Tautan",
        resetPeriod: "Periode Reset",
        daily: "Harian",
        weekly: "Mingguan",
        once: "Sekali",
        statusApproved: "Disetujui",
        statusRejected: "Ditolak",
        statusPending: "Menunggu",
        reason: "Alasan"
    },
    tr: {
        appName: "AdNova Network",
        withdrawalHistory: "Çekim Geçmişi",
        recentRequests: "Son Talepler",
        totalBalance: "Toplam Bakiye",
        availableToWithdraw: "Çekilebilir bakiye",
        watchAds: "Reklam İzle",
        completeTasks: "Görevleri Tamamla",
        inviteFriends: "Arkadaşları Davet Et",
        watchAndEarn: "İzle ve Kazan",
        watchAdBtn: "Reklam İzle",
        watchAdBtnSub: "Anında kazanmak için videoyu tamamla",
        readyToEarn: "Kazanmaya hazır",
        totalWatched: "Toplam İzlenen",
        adsUnit: "reklam",
        totalEarned: "Toplam Kazanç",
        taskHeaderTitle: "Görevleri Tamamla ve Ödül Kazan",
        inviteAndEarn: "Davet Et ve Kazan",
        yourInviteLink: "Davet Bağlantın",
        copy: "Kopyala",
        shareWithFriends: "Paylaş",
        friendsInvited: "Davet Edilen Arkadaşlar",
        earnedFromInvites: "Davetlerden Kazanılan",
        paymentMethod: "Ödeme Yöntemi",
        amount: "Tutar",
        availableBalance: "Kullanılabilir bakiye:",
        submitWithdrawal: "Çekim Talebi Gönder",
        navAds: "Reklamlar",
        navTasks: "Görevler",
        navInvite: "Davet",
        navWithdraw: "Çek",
        notificationsTitle: "Bildirimler",
        clearRead: "Okunanları Temizle",
        clearAll: "Hepsini Temizle",
        loadingAd: "Reklam yükleniyor...",
        adRewardAdded: "+${amount} eklendi!",
        dailyLimitReached: "Günlük limit doldu! Yarın gelin",
        adError: "Reklam yüklenemedi",
        linkCopied: "Bağlantı kopyalandı!",
        taskCompleted: "+${amount} eklendi!",
        insufficientBalance: "Yetersiz bakiye",
        chooseLanguage: "Dil seçin",
        success: "Başarılı!",
        error: "Hata!",
        warning: "Uyarı!",
        info: "Bilgi",
        adminPanel: "Yönetim Paneli",
        users: "Kullanıcılar",
        pendingWithdrawals: "Bekleyen Çekimler",
        approve: "Onayla",
        reject: "Reddet",
        addBalance: "Bakiye Ekle",
        removeBalance: "Bakiye Azalt",
        blockUser: "Kullanıcıyı Engelle",
        broadcast: "Duyuru",
        manageTasks: "Görevleri Yönet",
        addTask: "Görev Ekle",
        editTask: "Görev Düzenle",
        deleteTask: "Görev Sil",
        taskName: "Görev Adı",
        taskReward: "Ödül (USD)",
        taskType: "Görev Türü",
        taskIdentifier: "Kullanıcı Adı / Bağlantı",
        resetPeriod: "Sıfırlama Süresi",
        daily: "Günlük",
        weekly: "Haftalık",
        once: "Bir kere",
        statusApproved: "Onaylandı",
        statusRejected: "Reddedildi",
        statusPending: "Beklemede",
        reason: "Neden"
    },
    fa: {
        appName: "شبکه ادنوا",
        withdrawalHistory: "تاریخچه برداشت",
        recentRequests: "درخواست‌های اخیر",
        totalBalance: "موجودی کل",
        availableToWithdraw: "موجودی قابل برداشت",
        watchAds: "مشاهده تبلیغات",
        completeTasks: "تکمیل وظایف",
        inviteFriends: "دعوت از دوستان",
        watchAndEarn: "تماشا کنید و درآمد کسب کنید",
        watchAdBtn: "مشاهده تبلیغ",
        watchAdBtnSub: "ویدیو را کامل کنید تا فوراً جایزه بگیرید",
        readyToEarn: "آماده برای درآمد",
        totalWatched: "کل بازدیدها",
        adsUnit: "تبلیغ",
        totalEarned: "کل درآمد",
        taskHeaderTitle: "وظایف را کامل کنید و پاداش بگیرید",
        inviteAndEarn: "دعوت کنید و درآمد کسب کنید",
        yourInviteLink: "لینک دعوت شما",
        copy: "کپی",
        shareWithFriends: "اشتراک‌گذاری",
        friendsInvited: "دوستان دعوت شده",
        earnedFromInvites: "درآمد از دعوت‌ها",
        paymentMethod: "روش پرداخت",
        amount: "مبلغ",
        availableBalance: "موجودی قابل استفاده:",
        submitWithdrawal: "ثبت درخواست برداشت",
        navAds: "تبلیغات",
        navTasks: "وظایف",
        navInvite: "دعوت",
        navWithdraw: "برداشت",
        notificationsTitle: "اعلان‌ها",
        clearRead: "پاک کردن خوانده‌شده‌ها",
        clearAll: "پاک کردن همه",
        loadingAd: "در حال بارگذاری تبلیغ...",
        adRewardAdded: "+${amount} اضافه شد!",
        dailyLimitReached: "سقف روزانه تکمیل شد! فردا برگردید",
        adError: "خطا در بارگذاری تبلیغ",
        linkCopied: "لینک کپی شد!",
        taskCompleted: "+${amount} اضافه شد!",
        insufficientBalance: "موجودی ناکافی",
        chooseLanguage: "زبان خود را انتخاب کنید",
        success: "موفق!",
        error: "خطا!",
        warning: "هشدار!",
        info: "اطلاعات",
        adminPanel: "پنل مدیریت",
        users: "کاربران",
        pendingWithdrawals: "درخواست‌های برداشت",
        approve: "تأیید",
        reject: "رد",
        addBalance: "افزایش موجودی",
        removeBalance: "کاهش موجودی",
        blockUser: "مسدود کردن کاربر",
        broadcast: "ارسال همگانی",
        manageTasks: "مدیریت وظایف",
        addTask: "افزودن وظیفه",
        editTask: "ویرایش وظیفه",
        deleteTask: "حذف وظیفه",
        taskName: "نام وظیفه",
        taskReward: "پاداش (دلار)",
        taskType: "نوع وظیفه",
        taskIdentifier: "نام کاربری / لینک",
        resetPeriod: "دوره بازنشانی",
        daily: "روزانه",
        weekly: "هفتگی",
        once: "یک بار",
        statusApproved: "تأیید شده",
        statusRejected: "رد شده",
        statusPending: "در انتظار",
        reason: "دلیل"
    }
};

function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(p => {
        text = text.replace(`\${${p}}`, params[p]);
    });
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
    const langBtnLabel = document.getElementById("langBtnLabel");
    if (langBtnLabel) {
        langBtnLabel.textContent = LANGUAGES.find(l => l.code === currentLanguage)?.name || "English";
    }
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
// 6. 🔥 USER DATA
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
            PLATFORM_TON_WALLET = data.platformTonWallet || null;
            console.log("[AdNova] Config loaded");
            if (PLATFORM_TON_WALLET) {
                console.log("[AdNova] TON Platform Wallet:", PLATFORM_TON_WALLET);
            }
        }
    } catch(e) {
        console.error("Config error:", e);
    }
}

function getReferralLink() {
    return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`;
}

// ========== دوال تحسين الإعلانات (Cache + Sync) ==========

function loadLocalAdCache() {
    const saved = localStorage.getItem(`adnova_ads_${currentUserId}`);
    const today = new Date().toISOString().split("T")[0];
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            localAdCache = parsed;
            
            if (localAdCache.lastAdDate !== today) {
                localAdCache.adsToday = 0;
                localAdCache.lastAdDate = today;
                saveLocalAdCache();
            }
        } catch(e) {
            console.error("Error loading ad cache:", e);
            initLocalAdCache(today);
        }
    } else {
        initLocalAdCache(today);
    }
    
    if (currentUser) {
        currentUser.balance = localAdCache.balance;
        currentUser.totalEarned = localAdCache.totalEarned;
        currentUser.adsWatched = localAdCache.adsWatched;
        currentUser.adsToday = localAdCache.adsToday;
        currentUser.lastAdDate = localAdCache.lastAdDate;
    }
}

function initLocalAdCache(today) {
    localAdCache = {
        balance: 0,
        totalEarned: 0,
        adsWatched: 0,
        adsToday: 0,
        lastAdDate: today,
        lastSync: null
    };
    saveLocalAdCache();
}

function saveLocalAdCache() {
    localStorage.setItem(`adnova_ads_${currentUserId}`, JSON.stringify(localAdCache));
}

function updateLocalAdCache(adReward) {
    const today = new Date().toISOString().split("T")[0];
    
    if (localAdCache.lastAdDate !== today) {
        localAdCache.adsToday = 0;
        localAdCache.lastAdDate = today;
    }
    
    localAdCache.balance += adReward;
    localAdCache.totalEarned += adReward;
    localAdCache.adsWatched++;
    localAdCache.adsToday++;
    
    if (currentUser) {
        currentUser.balance = localAdCache.balance;
        currentUser.totalEarned = localAdCache.totalEarned;
        currentUser.adsWatched = localAdCache.adsWatched;
        currentUser.adsToday = localAdCache.adsToday;
        currentUser.lastAdDate = localAdCache.lastAdDate;
    }
    
    saveLocalAdCache();
    updateUI();
}

async function syncLocalAdsToFirebase() {
    if (!currentUser || !currentUserId) return;
    
    console.log("[AdNova] Syncing ad data to Firebase...");
    
    try {
        const res = await fetch("/api/sync-ads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUserId,
                adData: {
                    balance: localAdCache.balance,
                    totalEarned: localAdCache.totalEarned,
                    adsWatched: localAdCache.adsWatched,
                    adsToday: localAdCache.adsToday,
                    lastAdDate: localAdCache.lastAdDate
                }
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            localAdCache.lastSync = new Date().toISOString();
            saveLocalAdCache();
            console.log("[AdNova] Ad data synced successfully");
        } else {
            console.error("[AdNova] Sync failed:", data.error);
        }
    } catch(e) {
        console.error("[AdNova] Sync error:", e);
    }
}

async function pullAdDataFromFirebase() {
    if (!currentUser || !currentUserId) return;
    
    console.log("[AdNova] Pulling ad data from Firebase...");
    
    try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        
        if (data.success && data.data) {
            const firebaseBalance = data.data.balance || 0;
            const firebaseTotalEarned = data.data.totalEarned || 0;
            const firebaseAdsWatched = data.data.adsWatched || 0;
            
            if (firebaseBalance > localAdCache.balance) {
                localAdCache.balance = firebaseBalance;
            }
            if (firebaseTotalEarned > localAdCache.totalEarned) {
                localAdCache.totalEarned = firebaseTotalEarned;
            }
            if (firebaseAdsWatched > localAdCache.adsWatched) {
                localAdCache.adsWatched = firebaseAdsWatched;
            }
            
            if (currentUser) {
                currentUser.balance = localAdCache.balance;
                currentUser.totalEarned = localAdCache.totalEarned;
                currentUser.adsWatched = localAdCache.adsWatched;
            }
            
            saveLocalAdCache();
            updateUI();
            console.log("[AdNova] Ad data pulled from Firebase");
        }
    } catch(e) {
        console.error("[AdNova] Pull error:", e);
    }
}

function startSyncInterval() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    
    const intervalMs = SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
    syncIntervalId = setInterval(() => {
        syncLocalAdsToFirebase();
    }, intervalMs);
    
    window.addEventListener("beforeunload", () => {
        syncLocalAdsToFirebase();
    });
}

// ========== دوال تحسين الإعلانات (Cache + Sync) ==========

async function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    const today = new Date().toISOString().split("T")[0];
    
    if (saved) {
        currentUser = JSON.parse(saved);
        userCompletedTasks = currentUser.completedTasks || [];
    } else {
        currentUser = {
            userId: currentUserId,
            userName: getUserName(),
            userPhoto: getUserPhotoUrl(),
            balance: APP_CONFIG.welcomeBonus,
            totalEarned: APP_CONFIG.welcomeBonus,
            adsWatched: 0,
            adsToday: 0,
            lastAdDate: today,
            inviteCount: 0,
            referredBy: null,
            referrals: [],
            withdrawals: [],
            claimedMilestones: [],
            notifications: [{
                id: Date.now(),
                title: "🎉 Welcome!",
                message: `+$${APP_CONFIG.welcomeBonus} bonus!`,
                type: "success",
                read: false,
                timestamp: new Date().toISOString()
            }],
            tonWallet: null,
            withdrawBlocked: false,
            completedTasks: [],
            isVerified: false,
            verificationMethod: null,
            verificationDate: null
        };
        userCompletedTasks = [];
        saveUserData();
        await processReferral();
    }
    
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    loadLocalAdCache();
    
    await syncWithFirebase();
    updateUI();
    await loadTasksFromFirebase();
    checkAdminAndShowCrown();
    
    startSyncInterval();
    
    setTimeout(() => {
        pullAdDataFromFirebase();
    }, 2000);
    
    return currentUser;
}

function saveUserData() {
    currentUser.completedTasks = userCompletedTasks;
    currentUser.balance = localAdCache.balance;
    currentUser.totalEarned = localAdCache.totalEarned;
    currentUser.adsWatched = localAdCache.adsWatched;
    currentUser.adsToday = localAdCache.adsToday;
    currentUser.lastAdDate = localAdCache.lastAdDate;
    
    localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser));
    syncToFirebase();
}

async function syncWithFirebase() {
    try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (data.success && data.data) {
            const remoteWithdrawals = data.data.withdrawals || [];
            const localWithdrawals = currentUser?.withdrawals || [];
            
            const mergedWithdrawals = remoteWithdrawals.map(remoteWd => {
                const localWd = localWithdrawals.find(lw => lw.id === remoteWd.id);
                return localWd ? { ...remoteWd, status: localWd.status, rejectReason: localWd.rejectReason } : remoteWd;
            });
            
            currentUser = { ...currentUser, ...data.data, withdrawals: mergedWithdrawals };
            userCompletedTasks = currentUser.completedTasks || [];
            
            if (data.data.balance !== undefined && data.data.balance > localAdCache.balance) {
                localAdCache.balance = data.data.balance;
                localAdCache.totalEarned = data.data.totalEarned || localAdCache.totalEarned;
                localAdCache.adsWatched = data.data.adsWatched || localAdCache.adsWatched;
                saveLocalAdCache();
            }
            
            saveUserData();
            updateUI();
            renderWithdrawalHistory();
        }
    } catch(e) {
        console.error("Firebase sync error:", e);
    }
}

async function syncToFirebase() {
    try {
        await fetch(`/api/users/${currentUserId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, userData: currentUser })
        });
    } catch(e) {
        console.error("Firebase save error:", e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. 🔗 REFERRAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) ref = tg.initDataUnsafe.start_param;
    return ref;
}

async function processReferral() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    try {
        const res = await fetch("/api/referral", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                referrerId: refCode,
                newUserId: currentUserId,
                newUserName: currentUser.userName
            })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.referredBy = refCode;
            currentUser.balance += APP_CONFIG.welcomeBonus;
            currentUser.totalEarned += APP_CONFIG.welcomeBonus;
            localAdCache.balance = currentUser.balance;
            localAdCache.totalEarned = currentUser.totalEarned;
            saveLocalAdCache();
            
            localStorage.setItem(processedKey, refCode);
            saveUserData();
            updateUI();
            showToast(`🎉 +$${APP_CONFIG.welcomeBonus} welcome bonus!`, "success");
        }
    } catch(e) {
        console.error("Referral error:", e);
    }
}

function copyInviteLink() {
    navigator.clipboard.writeText(getReferralLink());
    showToast(t("linkCopied"), "success");
}

function shareInviteLink() {
    const link = getReferralLink();
    const text = `Join AdNova Network and earn real money!\n\n${link}`;
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. 🎬 WATCH ADS
// ═══════════════════════════════════════════════════════════════════════════

async function watchAd() {
    if (adPlaying) {
        showToast("Ad playing...", "warning");
        return;
    }
    if (localAdCache.adsToday >= APP_CONFIG.dailyAdLimit) {
        showToast(t("dailyLimitReached"), "warning");
        return;
    }
    
    adPlaying = true;
    const btn = document.getElementById("watchAdBtn");
    if (btn) {
        btn.disabled = true;
        btn.querySelector('.watch-ad-title').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }
    
    showToast(t("loadingAd"), "info");
    initAdPlatforms();
    
    const success = await showAdSequence();
    
    if (success) {
        const reward = getCurrentAdReward();
        updateLocalAdCache(reward);
        
        showEarnToast(reward);
        showToast(t("adRewardAdded", { amount: reward.toFixed(2) }), "success");
        
        fetch("/api/ad-watched", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg?.initDataUnsafe || {} })
        }).catch(e => console.error);
    } else {
        showToast(t("adError"), "error");
    }
    
    adPlaying = false;
    if (btn) {
        btn.disabled = false;
        btn.querySelector('.watch-ad-title').innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn");
    }
}

function showEarnToast(reward) {
    const toast = document.getElementById("earn-toast");
    if (!toast) return;
    const span = document.getElementById("earnToastAmount");
    if (span) span.textContent = `+ $${reward.toFixed(2)} Earned`;
    toast.classList.remove("hide");
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. 📋 TASKS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasksFromFirebase() {
    try {
        console.log("📋 Loading tasks from Firebase...");
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (data.success && data.tasks) {
            tasksList = data.tasks;
            console.log(`✅ Loaded ${tasksList.length} tasks`);
            renderTasks();
        } else {
            console.log("⚠️ No tasks found");
            tasksList = [];
            renderTasks();
        }
    } catch(e) {
        console.error("Load tasks error:", e);
        tasksList = [];
        renderTasks();
    }
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    
    if (tasksList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><p>No tasks available</p><span>Check back later for new tasks!</span></div>';
        return;
    }
    
    let html = '<div class="tasks-grid">';
    for (const task of tasksList) {
        const isCompleted = userCompletedTasks.includes(task.id);
        
        let isFull = false;
        let limitedHtml = '';
        
        if (task.isLimited) {
            const completed = task.completedCount || 0;
            const max = task.maxCompletions || 0;
            const remaining = max - completed;
            const percent = (completed / max) * 100;
            
            if (remaining <= 0) {
                isFull = true;
            }
            
            limitedHtml = `
                <div class="task-limited">
                    <div class="task-limited-bar">
                        <div class="task-limited-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="task-limited-text">
                        🏆 ${remaining} / ${max} remaining
                    </div>
                </div>
            `;
        }
        
        let icon = "fab fa-telegram";
        let actionText = "Join";
        let isCodeTask = false;
        
        if (task.type === "youtube") {
            icon = "fab fa-youtube";
            actionText = "Subscribe";
        } else if (task.type === "tiktok") {
            icon = "fab fa-tiktok";
            actionText = "Follow";
        } else if (task.type === "bot") {
            icon = "fab fa-telegram-plane";
            actionText = "Start";
        } else if (task.type === "twitter") {
            icon = "fab fa-twitter";
            actionText = "Follow";
        } else if (task.type === "code") {
            icon = "fas fa-key";
            actionText = "Enter Code";
            isCodeTask = true;
        }
        
        const identifier = task.username || task.link || task.identifier || "";
        const taskHint = isCodeTask ? (task.hint || "🔑 Enter the secret code to claim reward") : "⚡ Instantly reward";
        
        let buttonHtml = '';
        if (isCompleted) {
            buttonHtml = `<span class="task-completed-badge">✅ Completed</span>`;
        } else if (isFull) {
            buttonHtml = `<span class="task-full-badge">🔒 Fully Claimed</span>`;
        } else if (isCodeTask) {
            buttonHtml = `<button class="task-btn code-task-btn" onclick="openCodeModal('${task.id}', '${escapeHtml(task.name)}', ${task.reward}, '${escapeHtml(task.hint || '')}')">🔐 ${actionText}</button>`;
        } else {
            buttonHtml = `<button class="task-btn" onclick="verifyTask('${task.id}', '${task.type}', '${escapeHtml(identifier)}', ${task.reward})">${actionText}</button>`;
        }
        
        html += `
            <div class="task-card ${isCompleted ? 'completed' : ''}">
                <div class="task-left">
                    <div class="task-icon"><i class="${icon}"></i></div>
                    <div class="task-info">
                        <h4>${escapeHtml(task.name)}</h4>
                        <p class="task-hint">${taskHint}</p>
                        ${limitedHtml}
                    </div>
                </div>
                <div class="task-right">
                    <div class="task-reward">+$${task.reward.toFixed(2)}</div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
}

async function verifyTask(taskId, type, identifier, reward) {
    let url = "";
    
    if (type === "channel" || type === "bot") {
        url = `https://t.me/${identifier.replace('@', '')}`;
    } else if (type === "youtube") {
        url = identifier.startsWith("http") ? identifier : `https://youtube.com/@${identifier.replace('@', '')}`;
    } else if (type === "tiktok") {
        url = identifier.startsWith("http") ? identifier : `https://tiktok.com/@${identifier.replace('@', '')}`;
    } else if (type === "twitter") {
        url = identifier.startsWith("http") ? identifier : `https://twitter.com/${identifier.replace('@', '')}`;
    }
    
    if (!url) {
        showToast("Invalid task link", "error");
        return;
    }
    
    console.log(`🔗 Opening ${type} link: ${url}`);
    
    if (type === "channel" || type === "bot") {
        if (tg && tg.openTelegramLink) {
            tg.openTelegramLink(url);
        } else {
            window.open(url, "_blank");
        }
    } else {
        window.open(url, "_blank");
    }
    
    showToast("Verifying membership...", "info");
    
    setTimeout(async () => {
        try {
            const res = await fetch("/api/verify-channel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUserId,
                    channelUsername: identifier,
                    taskId: taskId,
                    reward: reward,
                    taskType: type
                })
            });
            const data = await res.json();
            
            if (data.success && !userCompletedTasks.includes(taskId)) {
                userCompletedTasks.push(taskId);
                currentUser.balance += reward;
                currentUser.totalEarned += reward;
                localAdCache.balance += reward;
                localAdCache.totalEarned += reward;
                saveLocalAdCache();
                saveUserData();
                updateUI();
                renderTasks();
                showToast(t("taskCompleted", { amount: reward.toFixed(2) }), "success");
            } else {
                showToast(data.error || "Please complete the action first", "error");
            }
        } catch(e) {
            console.error("Verification error:", e);
            showToast("Verification error", "error");
        }
    }, 5000);
}

// ====== Code Modal Functions ======

let currentCodeTask = null;

function openCodeModal(taskId, taskName, reward, hint) {
    console.log("🔐 Opening code modal for:", taskName);
    
    currentCodeTask = { id: taskId, reward: reward };
    
    let modal = document.getElementById('codeModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'codeModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content code-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-key" style="color: #d4af37;"></i> <span id="codeModalTitle">Enter Secret Code</span></h3>
                    <button class="close-btn" onclick="closeCodeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="code-hint" id="codeHint">
                        <i class="fas fa-lightbulb" style="color: #d4af37;"></i>
                        <span></span>
                    </div>
                    <div class="code-input-group">
                        <input type="text" id="codeInput" class="code-input" 
                               placeholder="Enter code here..." autocomplete="off">
                        <button class="code-submit-btn" id="codeSubmitBtn" onclick="submitCode()">
                            <i class="fas fa-check-circle"></i> Verify & Claim
                        </button>
                    </div>
                    <div class="code-reward-info">
                        <i class="fas fa-coins" style="color: #d4af37;"></i>
                        <span>Reward: <strong id="codeRewardAmount">$0.00</strong></span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const titleSpan = document.getElementById('codeModalTitle');
    if (titleSpan) titleSpan.textContent = taskName;
    
    const hintSpan = document.querySelector('#codeHint span');
    if (hintSpan) hintSpan.textContent = hint || 'No hint provided';
    
    const rewardSpan = document.getElementById('codeRewardAmount');
    if (rewardSpan) rewardSpan.textContent = `$${reward.toFixed(2)}`;
    
    const inputField = document.getElementById('codeInput');
    if (inputField) inputField.value = '';
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    setTimeout(() => {
        const input = document.getElementById('codeInput');
        if (input) input.focus();
    }, 100);
}

function closeCodeModal() {
    const modal = document.getElementById('codeModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    currentCodeTask = null;
}

async function submitCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput?.value.trim();
    
    if (!code) {
        showToast('⚠️ Please enter the verification code', 'warning');
        if (codeInput) codeInput.focus();
        return;
    }
    
    if (!currentCodeTask) {
        showToast('❌ Invalid task. Please try again.', 'error');
        closeCodeModal();
        return;
    }
    
    const btn = document.getElementById('codeSubmitBtn');
    const originalText = btn?.innerHTML || 'Verify & Claim';
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    }
    
    try {
        const response = await fetch("/api/verify-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUserId,
                taskId: currentCodeTask.id,
                code: code.toUpperCase()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (currentUser) {
                currentUser.balance = (currentUser.balance || 0) + currentCodeTask.reward;
                currentUser.totalEarned = (currentUser.totalEarned || 0) + currentCodeTask.reward;
            }
            
            if (typeof localAdCache !== 'undefined') {
                localAdCache.balance = (localAdCache.balance || 0) + currentCodeTask.reward;
                localAdCache.totalEarned = (localAdCache.totalEarned || 0) + currentCodeTask.reward;
                if (typeof saveLocalAdCache === 'function') saveLocalAdCache();
            }
            
            if (typeof userCompletedTasks !== 'undefined' && !userCompletedTasks.includes(currentCodeTask.id)) {
                userCompletedTasks.push(currentCodeTask.id);
            }
            
            if (typeof saveUserData === 'function') saveUserData();
            if (typeof updateUI === 'function') updateUI();
            if (typeof renderTasks === 'function') renderTasks();
            
            showToast(`🎉 +$${currentCodeTask.reward.toFixed(2)} Earned!`, 'success');
            closeCodeModal();
        } else {
            showToast(data.error || '❌ Invalid code! Please try again.', 'error');
            if (codeInput) {
                codeInput.focus();
                codeInput.select();
            }
        }
    } catch(error) {
        console.error("Code verification error:", error);
        showToast('🌐 Network error. Please try again.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. 💸 WITHDRAW SYSTEM
// ══════════════════════════════════════════════════════════════════════════

function renderWithdrawMethods() {
    const container = document.getElementById("withdrawMethodsContainer");
    if (!container) return;
    
    container.innerHTML = WITHDRAWAL_METHODS.map(m => `
        <div class="method-option ${m.id === selectedWithdrawMethod ? "selected" : ""}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')">
            ${m.emoji ? `<span class="method-emoji">${m.emoji}</span>` : `<i class="${m.icon}"></i>`}
            <span>${m.name}</span>
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
    if (inputEl && method) {
        inputEl.placeholder = method.placeholder;
        inputEl.setAttribute("data-method", method.id);
    }
}

function validateDestination() {
    const method = WITHDRAWAL_METHODS.find(m => m.id === selectedWithdrawMethod);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    if (!method || !destination) return false;
    if (method.regex && !method.regex.test(destination)) {
        showToast(`Invalid ${method.name} format`, "warning");
        return false;
    }
    return true;
}

async function processWithdrawal(amount, destination) {
    const btn = document.getElementById("submitWithdrawBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        const res = await fetch("/api/withdraw/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUserId,
                userName: currentUser.userName,
                amount: amount,
                method: selectedWithdrawMethod,
                destination: destination
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            currentUser.balance = data.newBalance;
            localAdCache.balance = data.newBalance;
            saveLocalAdCache();
            
            currentUser.withdrawals.unshift({
                id: Date.now(),
                amount: amount,
                method: selectedWithdrawMethod,
                destination: destination,
                status: "pending",
                date: new Date().toISOString()
            });
            saveUserData();
            updateUI();
            showToast("Withdrawal request submitted!", "success");
            document.getElementById("wdAmountInput").value = "";
            document.getElementById("wdDestInput").value = "";
            renderWithdrawalHistory();
        } else if (data.needVerification) {
            showVerificationModal(data.currentInvites, data.requiredInvites, amount, destination);
        } else {
            showToast(data.error || t("error"), "error");
        }
    } catch(e) {
        showToast(t("error"), "error");
    }
    
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t("submitWithdrawal");
    }
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    const limits = getVIPWithdrawalLimits();
    
    if (!amount || amount < limits.min) {
        showToast(`Minimum withdrawal is $${limits.min}`, "warning");
        return;
    }
    if (amount > limits.max) {
        showToast(`Maximum withdrawal is $${limits.max}`, "warning");
        return;
    }
    if (amount > localAdCache.balance) {
        showToast(t("insufficientBalance"), "warning");
        return;
    }
    if (!destination) {
        showToast("Please enter destination", "warning");
        return;
    }
    if (!validateDestination()) return;
    
    if (currentUser.isVerified) {
        await processWithdrawal(amount, destination);
        return;
    }
    
    showToast("Verification required", "info");
    
    try {
        const userRes = await fetch(`/api/users/${currentUserId}`);
        const userDataResult = await userRes.json();
        const currentInvites = userDataResult.data?.inviteCount || currentUser.inviteCount || 0;
        showVerificationModal(currentInvites, APP_CONFIG.requiredReferralsForVerify, amount, destination);
    } catch(e) {
        console.error("Error fetching user data:", e);
        showVerificationModal(currentUser.inviteCount || 0, APP_CONFIG.requiredReferralsForVerify, amount, destination);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.5. 📜 WITHDRAWAL HISTORY
// ═══════════════════════════════════════════════════════════════════════════

function renderWithdrawalHistory() {
    const container = document.getElementById("withdrawalHistoryList");
    const viewAllBtn = document.getElementById("viewAllWithdrawalsBtn");

    if (!container || !currentUser) return;

    const withdrawals = currentUser.withdrawals || [];
    const notifications = currentUser.notifications || [];

    if (withdrawals.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-receipt"></i>
                <span>📭 No withdrawal requests yet</span>
            </div>
        `;
        if (viewAllBtn) viewAllBtn.style.display = "none";
        return;
    }

    const recentWithdrawals = withdrawals.slice(0, 3);
    let html = "";

    for (const wd of recentWithdrawals) {
        const relatedNotif = notifications.find(n =>
            n.type === "withdraw" &&
            n.message.includes(`$${wd.amount?.toFixed(2)}`) &&
            Math.abs(new Date(n.timestamp) - new Date(wd.date)) < 3600000
        );

        let status = wd.status || "pending";
        let rejectReason = wd.rejectReason || null;
        let statusText = "";
        let statusIcon = "";
        let statusClass = "";

        if (relatedNotif) {
            if (relatedNotif.title.includes("Approved") || relatedNotif.message.includes("approved")) {
                status = "approved";
                statusText = "✅ Approved";
                statusIcon = "✅";
                statusClass = "approved";
            } else if (relatedNotif.title.includes("Rejected") || relatedNotif.message.includes("rejected")) {
                status = "rejected";
                statusText = "❌ Rejected";
                statusIcon = "❌";
                statusClass = "rejected";
                const reasonMatch = relatedNotif.message.match(/Reason: (.*)/i);
                if (reasonMatch) rejectReason = reasonMatch[1];
            } else {
                statusText = "⏳ Pending";
                statusIcon = "⏳";
                statusClass = "pending";
            }
        } else {
            if (status === "approved") {
                statusText = "✅ Approved";
                statusIcon = "✅";
                statusClass = "approved";
            } else if (status === "rejected") {
                statusText = "❌ Rejected";
                statusIcon = "❌";
                statusClass = "rejected";
            } else {
                statusText = "⏳ Pending";
                statusIcon = "⏳";
                statusClass = "pending";
            }
        }

        const date = new Date(wd.date);
        const formattedDateTime = date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        const methodName = getMethodName(wd.method);
        const methodIcon = getMethodIcon(wd.method);

        html += '<div class="withdrawal-item ' + statusClass + '">';
        html += '<div class="withdrawal-status-icon">' + statusIcon + '</div>';
        html += '<div class="withdrawal-info">';
        html += '<div class="withdrawal-amount">$' + (wd.amount?.toFixed(2) || '0.00') + '</div>';
        html += '<div class="withdrawal-status-text">' + statusText + '</div>';
        html += '<div class="withdrawal-details">';
        html += '<span class="withdrawal-method"><i class="' + methodIcon + '"></i> ' + methodName + '</span>';
        html += '<span class="withdrawal-date"><i class="far fa-clock"></i> ' + formattedDateTime + '</span>';
        html += '</div>';

        if (rejectReason && String(rejectReason).trim().length > 0) {
            html += '<div class="withdrawal-reason-box">';
            html += '<i class="fas fa-exclamation-circle"></i>';
            html += '<span class="withdrawal-reason-label">📝 Reason:</span>';
            html += '<span class="withdrawal-reason-text">' + escapeHtml(String(rejectReason)) + '</span>';
            html += '</div>';
        }

        html += '</div></div>';
    }

    container.innerHTML = html;

    if (viewAllBtn) {
        viewAllBtn.style.display = withdrawals.length > 3 ? "flex" : "none";
    }
}

function updateWithdrawalStatusFromNotification(notification) {
    if (!notification || notification.type !== "withdraw") return;
    
    let newStatus = null;
    let rejectReason = null;
    
    if (notification.title.includes("Approved") || notification.message.includes("approved")) {
        newStatus = "approved";
    } else if (notification.title.includes("Rejected") || notification.message.includes("rejected")) {
        newStatus = "rejected";
        const reasonMatch = notification.message.match(/Reason: (.*?)(\n|$)/i);
        if (reasonMatch) rejectReason = reasonMatch[1].trim();
    }
    
    if (newStatus && currentUser?.withdrawals) {
        const amountMatch = notification.message.match(/\$([0-9.]+)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
        
        let updated = false;
        for (const wd of currentUser.withdrawals) {
            if (amount && Math.abs(wd.amount - amount) < 0.01 && wd.status !== newStatus) {
                wd.status = newStatus;
                if (rejectReason) wd.rejectReason = rejectReason;
                updated = true;
                break;
            }
        }
        
        if (updated) {
            saveUserData();
            renderWithdrawalHistory();
            updateUI();
            console.log(`✅ Withdrawal status updated locally to: ${newStatus}`);
            return true;
        }
    }
    return false;
}

function showAllWithdrawals() {
    const withdrawals = currentUser?.withdrawals || [];
    const notifications = currentUser?.notifications || [];

    if (withdrawals.length === 0) {
        showToast("📭 No withdrawal history", "info");
        return;
    }

    let modalHtml = `
        <div id="allWithdrawalsModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> 📜 All Withdrawals</h3>
                    <button class="close-btn" onclick="closeModal('allWithdrawalsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="withdrawal-history-list">
    `;

    for (const wd of withdrawals) {
        const relatedNotif = notifications.find(n =>
            n.type === "withdraw" &&
            n.message.includes(`$${wd.amount?.toFixed(2)}`) &&
            Math.abs(new Date(n.timestamp) - new Date(wd.date)) < 3600000
        );

        let status = wd.status || "pending";
        let rejectReason = wd.rejectReason || null;
        let statusText = "";
        let statusIcon = "";
        let statusClass = "";

        if (relatedNotif) {
            if (relatedNotif.title.includes("Approved") || relatedNotif.message.includes("approved")) {
                status = "approved";
                statusText = "✅ Approved";
                statusIcon = "✅";
                statusClass = "approved";
            } else if (relatedNotif.title.includes("Rejected") || relatedNotif.message.includes("rejected")) {
                status = "rejected";
                statusText = "❌ Rejected";
                statusIcon = "❌";
                statusClass = "rejected";
                const reasonMatch = relatedNotif.message.match(/Reason: (.*)/i);
                if (reasonMatch) rejectReason = reasonMatch[1];
            } else {
                statusText = "⏳ Pending";
                statusIcon = "⏳";
                statusClass = "pending";
            }
        } else {
            if (status === "approved") {
                statusText = "✅ Approved";
                statusIcon = "✅";
                statusClass = "approved";
            } else if (status === "rejected") {
                statusText = "❌ Rejected";
                statusIcon = "❌";
                statusClass = "rejected";
            } else {
                statusText = "⏳ Pending";
                statusIcon = "⏳";
                statusClass = "pending";
            }
        }

        const date = new Date(wd.date);
        const formattedDateTime = date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        const methodName = getMethodName(wd.method);
        const methodIcon = getMethodIcon(wd.method);

        modalHtml += '<div class="withdrawal-item ' + statusClass + '">';
        modalHtml += '<div class="withdrawal-status-icon">' + statusIcon + '</div>';
        modalHtml += '<div class="withdrawal-info">';
        modalHtml += '<div class="withdrawal-amount">$' + (wd.amount?.toFixed(2) || '0.00') + '</div>';
        modalHtml += '<div class="withdrawal-status-text">' + statusText + '</div>';
        modalHtml += '<div class="withdrawal-details">';
        modalHtml += '<span class="withdrawal-method"><i class="' + methodIcon + '"></i> ' + methodName + '</span>';
        modalHtml += '<span class="withdrawal-date"><i class="far fa-clock"></i> ' + formattedDateTime + '</span>';
        modalHtml += '</div>';

        if (rejectReason && String(rejectReason).trim().length > 0) {
            modalHtml += '<div class="withdrawal-reason-box">';
            modalHtml += '<i class="fas fa-exclamation-circle"></i>';
            modalHtml += '<span class="withdrawal-reason-label">📝 Reason:</span>';
            modalHtml += '<span class="withdrawal-reason-text">' + escapeHtml(String(rejectReason)) + '</span>';
            modalHtml += '</div>';
        }

        modalHtml += '</div></div>';
    }

    modalHtml += `
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById("allWithdrawalsModal");
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function getMethodName(methodId) {
    const methods = {
        'paypal': 'PayPal',
        'skrill': 'Skrill',
        'payoneer': 'Payoneer',
        'usdt_bep20': 'USDT (BEP20)',
        'usdt_trc20': 'USDT (TRC20)',
        'ton': 'TON',
        'binance_pay': 'Binance Pay',
        'sbp': 'SBP',
        'mobile': 'Mobile',
        'pubg': 'PUBG UC',
        'freefire': 'Free Fire'
    };
    return methods[methodId] || methodId;
}

function getMethodIcon(methodId) {
    const icons = {
        'paypal': 'fab fa-paypal',
        'skrill': 'fas fa-credit-card',
        'payoneer': 'fas fa-building',
        'usdt_bep20': 'fab fa-bitcoin',
        'usdt_trc20': 'fab fa-bitcoin',
        'ton': 'fab fa-telegram',
        'binance_pay': 'fas fa-shield-alt',
        'sbp': 'fas fa-phone',
        'mobile': 'fas fa-mobile-alt',
        'pubg': 'fas fa-gamepad',
        'freefire': 'fas fa-gem'
    };
    return icons[methodId] || 'fas fa-credit-card';
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.6. 🔒 VERIFICATION MODAL
// ═══════════════════════════════════════════════════════════════════════════

function showVerificationModal(currentInvites, requiredInvites, amount, destination) {
    pendingWithdrawalData = { amount, destination };
    
    const remainingInvites = requiredInvites - currentInvites;
    const progressPercent = (currentInvites / requiredInvites) * 100;
    
    const modalHtml = `
        <div id="verificationModal" class="modal show">
            <div class="modal-content verify-modal">
                <button class="close-btn" onclick="closeModal('verificationModal')">
                    <i class="fas fa-times"></i>
                </button>
                <div class="verify-modal-icon">🔒</div>
                <h3>Verification Required</h3>
                <p class="verify-description-text">To withdraw funds, you must verify your account. Choose one method below:</p>
                
                <div class="verify-option" onclick="showReferralInvite()">
                    <div class="verify-option-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="verify-option-content">
                        <div class="verify-option-title">Invite Friends Method</div>
                        <div class="verify-option-desc">Invite ${requiredInvites} friends to the platform</div>
                        <div class="verify-progress-bar-container">
                            <div class="verify-progress-bar" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="verify-stats">${currentInvites} / ${requiredInvites} invites</div>
                        ${remainingInvites > 0 ? 
                            `<div class="verify-warning"><i class="fas fa-exclamation-triangle"></i> You need ${remainingInvites} more invites</div>` : 
                            `<div class="verify-success"><i class="fas fa-check-circle"></i> You qualify! Click to verify</div>`
                        }
                    </div>
                </div>
                
                <div class="verify-option" onclick="startTonVerification()">
                    <div class="verify-option-icon">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="verify-option-content">
                        <div class="verify-option-title">TON Wallet Method</div>
                        <div class="verify-option-desc">Pay 0.01 TON (~$0.02 USD) to verify instantly</div>
                        <div class="verify-benefits">
                            <span><i class="fas fa-check-circle"></i> One-time payment only</span>
                            <span><i class="fas fa-rotate-right"></i> Will be returned on first withdrawal</span>
                        </div>
                        <div class="verify-ton-btn">
                            <i class="fab fa-telegram"></i> Verify with TON
                        </div>
                    </div>
                </div>
                
                <button class="verify-later-btn" onclick="closeModal('verificationModal')">
                    <i class="fas fa-clock"></i> Remind Me Later
                </button>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById("verificationModal");
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function verifyByReferrals() {
    showToast("Verifying your account...", "info");
    
    try {
        const response = await fetch("/api/verify-by-referrals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser.isVerified = true;
            currentUser.verificationMethod = 'referrals';
            currentUser.verificationDate = new Date().toISOString();
            saveUserData();
            
            showToast("✅ Account verified! Processing your withdrawal...", "success");
            closeModal('verificationModal');
            
            if (pendingWithdrawalData) {
                await processWithdrawal(pendingWithdrawalData.amount, pendingWithdrawalData.destination);
                pendingWithdrawalData = null;
            }
        } else {
            showToast(data.error, "warning");
        }
    } catch(e) {
        console.error("Verification error:", e);
        showToast("Error verifying account", "error");
    }
}

function showReferralInvite() {
    if (currentUser.inviteCount >= APP_CONFIG.requiredReferralsForVerify) {
        verifyByReferrals();
    } else {
        closeModal('verificationModal');
        switchTab('invite');
        showToast(`You need ${APP_CONFIG.requiredReferralsForVerify - currentUser.inviteCount} more invites to verify!`, "info");
    }
}

async function startTonVerification() {
    if (!window.tonConnectUI) {
        showToast("TON Connect not ready", "error");
        return;
    }
    
    if (!PLATFORM_TON_WALLET) {
        showToast("Platform wallet not configured. Please contact support.", "error");
        console.error("PLATFORM_TON_WALLET is not set");
        return;
    }
    
    if (!tonConnected || !tonWalletAddress) {
        showToast("Please connect your TON wallet first", "info");
        await connectTONWallet();
        if (!tonConnected || !tonWalletAddress) {
            showToast("Please connect your TON wallet to continue", "warning");
            return;
        }
    }
    
    showToast("Please confirm transaction in TON Wallet...", "info");
    
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
            address: PLATFORM_TON_WALLET,
            amount: "10000000"
        }]
    };
    
    try {
        const result = await window.tonConnectUI.sendTransaction(transaction);
        
        const response = await fetch("/api/ton/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUserId,
                txHash: result.boc,
                amount: "0.01"
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser.isVerified = true;
            currentUser.tonWalletVerified = true;
            currentUser.verificationMethod = 'ton';
            currentUser.verificationDate = new Date().toISOString();
            saveUserData();
            
            showToast("✅ Wallet verified successfully! Processing withdrawal...", "success");
            
            if (pendingWithdrawalData) {
                await processWithdrawal(pendingWithdrawalData.amount, pendingWithdrawalData.destination);
                pendingWithdrawalData = null;
            } else {
                updateUI();
            }
        } else {
            showToast("Verification failed: " + (data.error || "Unknown error"), "error");
        }
    } catch(e) {
        console.error("Transaction error:", e);
        showToast("Transaction cancelled or failed", "warning");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. 👑 ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════

function checkAdminAndShowCrown() {
    if (APP_CONFIG.adminId && currentUserId === APP_CONFIG.adminId.toString()) {
        const crownBtn = document.getElementById("adminCrownBtn");
        if (crownBtn) crownBtn.style.display = "flex";
    }
}

function showAdminAuth() {
    document.getElementById("adminAuthModal")?.classList.add("show");
}

async function verifyAdminPassword() {
    const pwd = document.getElementById("adminPasswordInput")?.value;
    const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();
    if (data.success) {
        adminAuthenticated = true;
        adminToken = pwd;
        localStorage.setItem("admin_token", pwd);
        document.getElementById("adminAuthModal")?.classList.remove("show");
        showAdminPanel();
    } else {
        document.getElementById("adminAuthError")?.style.setProperty("display", "block");
    }
}

async function showAdminPanel() {
    if (!adminAuthenticated) {
        showAdminAuth();
        return;
    }
    document.getElementById("adminPanel")?.classList.remove("hidden");
    await loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() {
    document.getElementById("adminPanel")?.classList.add("hidden");
}

async function loadAdminData() {
    try {
        const headers = { "Authorization": `Bearer ${adminToken}` };
        const statsRes = await fetch("/api/admin/stats", { headers });
        const statsData = await statsRes.json();
        if (statsData.success) adminStats = statsData.stats;
        
        const withdrawalsRes = await fetch("/api/admin/pending-withdrawals", { headers });
        const withdrawalsData = await withdrawalsRes.json();
        if (withdrawalsData.success) pendingWithdrawals = withdrawalsData.withdrawals || [];
        
        const usersRes = await fetch("/api/admin/users", { headers });
        const usersData = await usersRes.json();
        if (usersData.success) allUsers = usersData.users || [];
        
        const tasksRes = await fetch("/api/tasks");
        const tasksData = await tasksRes.json();
        if (tasksData.success) {
            adminTasksList = tasksData.tasks || [];
            tasksList = adminTasksList;
        }
    } catch(e) {
        console.error("Load admin data error:", e);
    }
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
    else if (section === "stats") renderStatsDetails(container);
}

function renderPendingWithdrawals(container) {
    if (pendingWithdrawals.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending withdrawals</div>';
        return;
    }
    let html = "";
    for (const w of pendingWithdrawals) {
        html += `
            <div class="admin-card">
                <div class="admin-card-header">
                    <span>👤 ${escapeHtml(w.userName || w.userId)}</span>
                    <span class="withdraw-amount">$${w.amount?.toFixed(2)}</span>
                </div>
                <div class="admin-card-details">
                    <div>ID: ${w.userId}</div>
                    <div>Method: ${w.method}</div>
                    <div>Destination: ${escapeHtml(w.destination)}</div>
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
    if (allUsers.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID or name..." onkeyup="filterUsers()"></div>';
    for (const u of allUsers) {
        html += `
            <div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${escapeHtml(u.userName)}">
                <div class="admin-card-header">
                    <span>👤 ${escapeHtml(u.userName || "User")}</span>
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

function renderStatsDetails(container) {
    container.innerHTML = `
        <div class="stats-details">
            <div class="stat-detail-card">
                <i class="fas fa-users"></i>
                <div class="stat-detail-value">${adminStats.totalUsers || 0}</div>
                <div class="stat-detail-label">Total Registered Users</div>
            </div>
            <div class="stat-detail-card">
                <i class="fas fa-dollar-sign"></i>
                <div class="stat-detail-value">$${(adminStats.totalBalance || 0).toFixed(2)}</div>
                <div class="stat-detail-label">Total Platform Balance</div>
            </div>
            <div class="stat-detail-card">
                <i class="fas fa-chart-line"></i>
                <div class="stat-detail-value">$${(adminStats.totalEarned || 0).toFixed(2)}</div>
                <div class="stat-detail-label">Total Earned All Time</div>
            </div>
        </div>
    `;
}

function getTaskTypeIcon(type) {
    const icons = {
        'channel': '📢',
        'bot': '🤖',
        'youtube': '🎥',
        'tiktok': '🎵',
        'twitter': '🐦'
    };
    return icons[type] || '📌';
}

function getTaskTypeName(type) {
    const names = {
        'channel': 'Telegram Channel',
        'bot': 'Telegram Bot',
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'twitter': 'Twitter'
    };
    return names[type] || type;
}

function getResetPeriodName(period) {
    const names = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'once': 'Once'
    };
    return names[period] || period;
}

function renderTasksManagement(container) {
    if (adminTasksList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No tasks available</p>
                <button class="btn-add-task" onclick="showAddTaskModal()">➕ Add New Task</button>
            </div>
        `;
        return;
    }
    let html = `
        <div class="admin-section-header">
            <h4><i class="fas fa-tasks"></i> Manage Tasks</h4>
            <button class="btn-add-task" onclick="showAddTaskModal()">➕ Add New Task</button>
        </div>
        <div class="tasks-management-list">
    `;
    for (const task of adminTasksList) {
        html += `
            <div class="task-management-card" data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-type-badge ${task.type}">
                        ${getTaskTypeIcon(task.type)} ${getTaskTypeName(task.type)}
                    </div>
                    <div class="task-details">
                        <div class="task-name">${escapeHtml(task.name)}</div>
                        <div class="task-identifier">${escapeHtml(task.username || task.link || task.identifier || '')}</div>
                        <div class="task-meta">
                            <span class="task-reward-badge">💰 $${task.reward.toFixed(2)}</span>
                            <span class="task-reset-badge ${task.resetPeriod}">🔄 ${getResetPeriodName(task.resetPeriod)}</span>
                            <span class="task-status-badge ${task.active !== false ? 'active' : 'inactive'}">
                                ${task.active !== false ? '✅ Active' : '⏸️ Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn edit" onclick="openEditTaskModal('${task.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn toggle" onclick="toggleTaskStatus('${task.id}', ${task.active !== false})" title="Toggle Status">
                        <i class="fas ${task.active !== false ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="task-action-btn delete" onclick="deleteTask('${task.id}')" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
}

function showAddTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'addTaskModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> ${t('addTask')}</h3>
                <button class="close-btn" onclick="closeModal('addTaskModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>${t('taskName')}</label>
                    <input type="text" id="taskNameInput" class="form-input" placeholder="e.g., Join AdNova Channel">
                </div>
                <div class="form-group">
                    <label>${t('taskType')}</label>
                    <select id="taskTypeSelect" class="form-select">
                        <option value="channel">📢 Telegram Channel / Group</option>
                        <option value="bot">🤖 Telegram Bot</option>
                        <option value="youtube">🎥 YouTube</option>
                        <option value="tiktok">🎵 TikTok</option>
                        <option value="twitter">🐦 Twitter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${t('taskIdentifier')}</label>
                    <input type="text" id="taskIdentifierInput" class="form-input" placeholder="@username or link">
                </div>
                <div class="form-group">
                    <label>${t('taskReward')} (USD)</label>
                    <input type="number" id="taskRewardInput" class="form-input" step="0.01" min="0.01" placeholder="0.05">
                </div>
                <div class="form-group">
                    <label>${t('resetPeriod')}</label>
                    <select id="taskResetSelect" class="form-select">
                        <option value="daily">${t('daily')}</option>
                        <option value="weekly">${t('weekly')}</option>
                        <option value="once">${t('once')}</option>
                    </select>
                </div>
                <button class="modal-btn" onclick="addNewTask()">
                    <i class="fas fa-save"></i> ${t('addTask')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function addNewTask() {
    const name = document.getElementById('taskNameInput')?.value.trim();
    const type = document.getElementById('taskTypeSelect')?.value;
    const identifier = document.getElementById('taskIdentifierInput')?.value.trim();
    const reward = parseFloat(document.getElementById('taskRewardInput')?.value);
    const resetPeriod = document.getElementById('taskResetSelect')?.value;
    
    if (!name) {
        showToast("Please enter task name", "error");
        return;
    }
    if (!identifier) {
        showToast("Please enter username or link", "error");
        return;
    }
    if (isNaN(reward) || reward <= 0) {
        showToast("Please enter valid reward", "error");
        return;
    }
    
    const newTask = {
        name: name,
        type: type,
        identifier: identifier,
        reward: reward,
        resetPeriod: resetPeriod,
        username: identifier,
        link: identifier,
        active: true
    };
    
    try {
        const res = await fetch("/api/admin/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(newTask)
        });
        const data = await res.json();
        if (data.success) {
            showToast("Task added successfully!", "success");
            closeModal('addTaskModal');
            await loadAdminData();
            await loadTasksFromFirebase();
            showAdminSection('tasks');
        } else {
            showToast("Failed: " + data.error, "error");
        }
    } catch(e) {
        showToast("Error adding task", "error");
    }
}

function openEditTaskModal(taskId) {
    const task = adminTasksList.find(t => t.id === taskId);
    if (!task) return;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'editTaskModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> ${t('editTask')}</h3>
                <button class="close-btn" onclick="closeModal('editTaskModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>${t('taskName')}</label>
                    <input type="text" id="editTaskName" class="form-input" value="${escapeHtml(task.name)}">
                </div>
                <div class="form-group">
                    <label>${t('taskReward')} (USD)</label>
                    <input type="number" id="editTaskReward" class="form-input" step="0.01" value="${task.reward}">
                </div>
                <button class="modal-btn" onclick="updateTask('${taskId}')">
                    <i class="fas fa-save"></i> ${t('editTask')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateTask(taskId) {
    const name = document.getElementById('editTaskName')?.value.trim();
    const reward = parseFloat(document.getElementById('editTaskReward')?.value);
    
    if (!name) {
        showToast("Please enter task name", "error");
        return;
    }
    if (isNaN(reward) || reward <= 0) {
        showToast("Please enter valid reward", "error");
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ name: name, reward: reward })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Task updated successfully!", "success");
            closeModal('editTaskModal');
            await loadAdminData();
            await loadTasksFromFirebase();
            showAdminSection('tasks');
        } else {
            showToast("Failed: " + data.error, "error");
        }
    } catch(e) {
        showToast("Error updating task", "error");
    }
}

async function toggleTaskStatus(taskId, currentActive) {
    try {
        const res = await fetch(`/api/admin/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ active: !currentActive })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Task ${!currentActive ? 'activated' : 'deactivated'}!`, "success");
            await loadAdminData();
            await loadTasksFromFirebase();
            showAdminSection('tasks');
        } else {
            showToast("Failed: " + data.error, "error");
        }
    } catch(e) {
        showToast("Error toggling task", "error");
    }
}

async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task permanently?")) return;
    try {
        const res = await fetch(`/api/admin/tasks/${taskId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast("Task deleted successfully!", "success");
            await loadAdminData();
            await loadTasksFromFirebase();
            showAdminSection('tasks');
        } else {
            showToast("Failed: " + data.error, "error");
        }
    } catch(e) {
        showToast("Error deleting task", "error");
    }
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt("Amount to add (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/add-balance", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: userId, amount: amount })
    });
    const data = await res.json();
    if (data.success) {
        showToast(`+$${amount} added!`, "success");
        location.reload();
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt("Amount to remove (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/remove-balance", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: userId, amount: amount })
    });
    const data = await res.json();
    if (data.success) {
        showToast(`-$${amount} removed!`, "success");
        location.reload();
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

async function adminBlockUser(userId) {
    if (!confirm("⚠️ PERMANENTLY block this user from withdrawals?")) return;
    const res = await fetch("/api/admin/block-user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ userId: userId })
    });
    const data = await res.json();
    if (data.success) {
        showToast("User blocked!", "success");
        location.reload();
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

async function approveWithdrawal(id, userId, amount) {
    if (!confirm(`Approve $${amount} withdrawal?`)) return;
    const res = await fetch("/api/admin/approve-withdrawal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ withdrawalId: id })
    });
    const data = await res.json();
    if (data.success) {
        showToast("Approved!", "success");
        location.reload();
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

async function rejectWithdrawal(id, userId, amount) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    if (!confirm(`Reject $${amount} withdrawal?`)) return;
    const res = await fetch("/api/admin/reject-withdrawal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ withdrawalId: id, reason: reason })
    });
    const data = await res.json();
    if (data.success) {
        showToast("Rejected!", "success");
        location.reload();
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

function renderBroadcastSection(container) {
    container.innerHTML = `
        <div class="broadcast-section">
            <textarea id="broadcastMessage" placeholder="Enter message to broadcast to all users..." rows="4"></textarea>
            <button class="btn-broadcast" onclick="sendBroadcast()">📢 Send Broadcast</button>
            <p class="broadcast-hint">This will send a notification to all ${adminStats.totalUsers || 0} users</p>
        </div>
    `;
}

async function sendBroadcast() {
    const message = document.getElementById("broadcastMessage")?.value;
    if (!message) {
        showToast("Enter a message", "warning");
        return;
    }
    const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ message: message })
    });
    const data = await res.json();
    if (data.success) {
        showToast(`Broadcast sent to ${data.notifiedCount} users!`, "success");
        document.getElementById("broadcastMessage").value = "";
    } else {
        showToast("Failed: " + data.error, "error");
    }
}

function filterUsers() {
    const term = document.getElementById("userSearchInput")?.value.toLowerCase();
    document.querySelectorAll(".user-card").forEach(card => {
        const match = card.getAttribute("data-user-id")?.toLowerCase().includes(term) ||
                     card.getAttribute("data-user-name")?.toLowerCase().includes(term);
        card.style.display = match ? "block" : "none";
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. 🔔 NOTIFICATIONS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge && currentUser) {
        const unread = currentUser.notifications?.filter(n => !n.read).length || 0;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? "flex" : "none";
        
        const bellIcon = document.querySelector("#notificationBtn i");
        if (bellIcon) {
            if (unread > 0) {
                bellIcon.style.color = "#d4af37";
            } else {
                bellIcon.style.color = "";
            }
        }
    }
}

function renderNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container || !currentUser) return;
    const notifs = currentUser.notifications || [];
    
    const sortedNotifs = [...notifs].reverse();
    
    if (sortedNotifs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p><span>You are all caught up!</span></div>';
        return;
    }
    
    let html = "";
    for (const n of sortedNotifs) {
        if (n.type === "withdraw") {
            updateWithdrawalStatusFromNotification(n);
        }
        
        const date = new Date(n.timestamp);
        const formattedDateTime = date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let iconClass = "info";
        let iconName = "fa-bell";
        if (n.type === "success") {
            iconClass = "success";
            iconName = "fa-check-circle";
        } else if (n.type === "error") {
            iconClass = "error";
            iconName = "fa-times-circle";
        } else if (n.type === "warning") {
            iconClass = "warning";
            iconName = "fa-exclamation-triangle";
        } else if (n.type === "withdraw") {
            iconClass = "withdraw";
            iconName = "fa-money-bill-wave";
        } else if (n.type === "referral") {
            iconClass = "referral";
            iconName = "fa-user-plus";
        } else if (n.type === "welcome") {
            iconClass = "success";
            iconName = "fa-gift";
        } else if (n.type === "admin") {
            iconClass = "info";
            iconName = "fa-crown";
        }
        
        html += `
            <div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead('${n.id}')">
                <div class="notification-icon ${iconClass}">
                    <i class="fas ${iconName}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <div class="notification-title">${escapeHtml(n.title)}</div>
                        <div class="notification-time">
                            <i class="far fa-clock"></i> ${formattedDateTime}
                        </div>
                    </div>
                    <div class="notification-message">${escapeHtml(n.message)}</div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function markNotificationRead(id) {
    const n = currentUser.notifications?.find(n => n.id == id);
    if (n && !n.read) {
        n.read = true;
        saveUserData();
        updateNotificationBadge();
        renderNotifications();
    }
}

function clearReadNotifications() {
    if (!currentUser.notifications) return;
    currentUser.notifications = currentUser.notifications.filter(n => !n.read);
    saveUserData();
    updateNotificationBadge();
    renderNotifications();
    showToast("Cleared read notifications", "success");
}

function clearAllNotifications() {
    currentUser.notifications = [];
    saveUserData();
    updateNotificationBadge();
    renderNotifications();
    showToast("All notifications cleared", "success");
}

function showNotificationsModal() {
    renderNotifications();
    document.getElementById("notificationsModal")?.classList.add("show");
}

function closeNotificationsModal() {
    document.getElementById("notificationsModal")?.classList.remove("show");
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. 💎 TON CONNECT
// ═══════════════════════════════════════════════════════════════════════════

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
        } catch(e) {
            console.error("TON init error:", e);
        }
    }
}

async function connectTONWallet() {
    if (tonConnected && window.tonConnectUI) {
        try { await window.tonConnectUI.disconnect(); } catch(e) {}
        tonConnected = false;
        tonWalletAddress = null;
        if (currentUser) {
            currentUser.tonWallet = null;
            saveUserData();
        }
        updateTONUI();
        showToast("Wallet disconnected", "info");
        return;
    }
    if (!window.tonConnectUI) {
        showToast("TON Connect not ready", "error");
        return;
    }
    try {
        await window.tonConnectUI.openModal();
        const interval = setInterval(() => {
            if (window.tonConnectUI.wallet) {
                clearInterval(interval);
                tonConnected = true;
                tonWalletAddress = window.tonConnectUI.wallet.account.address;
                if (currentUser) {
                    currentUser.tonWallet = tonWalletAddress;
                    saveUserData();
                }
                updateTONUI();
                showToast("TON Wallet Connected!", "success");
            }
        }, 500);
        setTimeout(() => clearInterval(interval), 30000);
    } catch(e) {
        showToast("Connection failed", "error");
    }
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
    if (btn) {
        btn.textContent = tonConnected ? "Disconnect TON" : "Connect TON";
    }
}

async function startTonVerification() {
    closeModal('verificationModal');
    
    if (!window.tonConnectUI) {
        showToast("TON Connect not ready", "error");
        return;
    }
    
    if (!PLATFORM_TON_WALLET) {
        showToast("Platform wallet not configured. Please contact support.", "error");
        console.error("PLATFORM_TON_WALLET is not set");
        return;
    }
    
    if (!tonConnected || !tonWalletAddress) {
        showToast("Please connect your TON wallet first", "info");
        await connectTONWallet();
        if (!tonConnected || !tonWalletAddress) {
            showToast("Please connect your TON wallet to continue", "warning");
            return;
        }
    }
    
    showToast("Please confirm transaction in TON Wallet...", "info");
    
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
            address: PLATFORM_TON_WALLET,
            amount: "10000000"
        }]
    };
    
    try {
        const result = await window.tonConnectUI.sendTransaction(transaction);
        
        const response = await fetch("/api/ton/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUserId,
                txHash: result.boc,
                amount: "0.01"
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser.isVerified = true;
            currentUser.tonWalletVerified = true;
            currentUser.verificationMethod = 'ton';
            currentUser.verificationDate = new Date().toISOString();
            saveUserData();
            
            showToast("✅ Wallet verified successfully! Processing withdrawal...", "success");
            
            if (pendingWithdrawalData) {
                await processWithdrawal(pendingWithdrawalData.amount, pendingWithdrawalData.destination);
                pendingWithdrawalData = null;
            } else {
                updateUI();
            }
        } else {
            showToast("Verification failed: " + (data.error || "Unknown error"), "error");
        }
    } catch(e) {
        console.error("Transaction error:", e);
        showToast("Transaction cancelled or failed", "warning");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 16. 🎨 UI UPDATES
// ═══════════════════════════════════════════════════════════════════════════

function updateUI() {
    if (!currentUser) return;
    
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.textContent = `$${localAdCache.balance?.toFixed(2) || "0.00"}`;
    
    const progressFill = document.getElementById("adProgressFill");
    if (progressFill) {
        const prog = ((localAdCache.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
        progressFill.style.width = `${prog}%`;
    }
    
    const progressLabel = document.getElementById("adProgressLabel");
    if (progressLabel) progressLabel.textContent = `${localAdCache.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    
    const totalAds = document.getElementById("totalAdsWatched");
    if (totalAds) totalAds.innerHTML = `${localAdCache.adsWatched || 0} <span>ads</span>`;
    
    const totalEarned = document.getElementById("totalAdsEarned");
    if (totalEarned) totalEarned.textContent = `$${localAdCache.totalEarned?.toFixed(2) || "0.00"}`;
    
    const totalInvites = document.getElementById("totalInvites");
    if (totalInvites) totalInvites.textContent = currentUser.inviteCount || 0;
    
    const inviteEarned = document.getElementById("totalEarnedFromInvites");
    if (inviteEarned) inviteEarned.textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    
    const inviteLink = document.getElementById("inviteLink");
    if (inviteLink) inviteLink.textContent = getReferralLink();
    
    const availBalance = document.getElementById("wdAvailBalance");
    if (availBalance) availBalance.textContent = `$${localAdCache.balance?.toFixed(2) || "0.00"}`;
    
    // تحديث اسم المستخدم مع شارة VIP
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
        const vipData = loadVIPStatus();
        if (vipData && VIP_PLANS[vipData.level]) {
            userNameEl.innerHTML = `${currentUser.userName || "User"} ${VIP_PLANS[vipData.level].icon}`;
        } else {
            userNameEl.innerHTML = currentUser.userName || "User";
        }
    }
    
    const userChatId = document.getElementById("userChatId");
    if (userChatId) userChatId.textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`;
    
    const avatarSpan = document.getElementById("userAvatarText");
    const avatarImg = document.getElementById("userAvatarImg");
    if (currentUser.userPhoto && avatarImg) {
        avatarImg.src = currentUser.userPhoto;
        avatarImg.style.display = "block";
        avatarImg.style.width = "44px";
        avatarImg.style.height = "44px";
        avatarImg.style.borderRadius = "50%";
        avatarImg.style.objectFit = "cover";
        if (avatarSpan) avatarSpan.style.display = "none";
    } else if (avatarSpan) {
        avatarSpan.textContent = (currentUser.userName || "U").charAt(0).toUpperCase();
        avatarSpan.style.display = "flex";
        if (avatarImg) avatarImg.style.display = "none";
    }
    
    updateNotificationBadge();
    updateTONUI();
    renderWithdrawalHistory();
}

function refreshCurrentPage() {
    if (currentPage === "tasks") {
        renderTasks();
    } else if (currentPage === "invite") {
        const link = document.getElementById("inviteLink");
        if (link) link.textContent = getReferralLink();
    } else if (currentPage === "withdraw") {
        renderWithdrawMethods();
    } else if (currentPage === "ads") {
        renderWithdrawalHistory();
    }
}

function switchTab(page) {
    currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`)?.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-page") === page) item.classList.add("active");
    });
    if (page === "tasks") {
        renderTasks();
    } else if (page === "invite") {
        refreshCurrentPage();
    } else if (page === "withdraw") {
        renderWithdrawMethods();
    } else if (page === "ads") {
        renderWithdrawalHistory();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 17. 🍞 TOAST MESSAGES & MODALS
// ═══════════════════════════════════════════════════════════════════════════

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-inner">
            <span class="toast-icon">${type === "success" ? "✓" : "ℹ"}</span>
            <span class="toast-msg">${escapeHtml(message)}</span>
            <div class="toast-bar"></div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
    setTimeout(() => {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }, 300);
}

function closeConfirmModal() {
    document.getElementById("confirmModal")?.classList.remove("show");
}

// ═══════════════════════════════════════════════════════════════════════════
// 18. 💬 SUPPORT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function openSupportChat() {
    const supportUsername = "AdNovaSupport";
    const url = `https://t.me/${supportUsername}`;
    
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(url);
    } else {
        window.open(url, "_blank");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 18.5. 🎲 FLOATING WITHDRAWAL NOTIFICATIONS (وهمية)
// ═══════════════════════════════════════════════════════════════════════════

let floatingNotificationInterval = null;

const WITHDRAWAL_NOTIFICATIONS = [
    { message: "💸 Withdrawal via PayPal • user***@gmail.com • $12.50", method: "paypal", amount: 12.50 },
    { message: "💸 Withdrawal via PayPal • john***@outlook.com • $24.80", method: "paypal", amount: 24.80 },
    { message: "💸 Withdrawal via PayPal • sarah***@yahoo.com • $37.20", method: "paypal", amount: 37.20 },
    { message: "💸 Withdrawal via PayPal • mike***@gmail.com • $51.35", method: "paypal", amount: 51.35 },
    { message: "💸 Withdrawal via Payoneer • busin***@company.com • $156.40", method: "payoneer", amount: 156.40 },
    { message: "💸 Withdrawal via USDT (BEP20) • 0x3f...a2d1 • $25.00", method: "usdt_bep20", amount: 25.00 },
    { message: "💸 Withdrawal via USDT (TRC20) • TEx...9kL3 • $15.30", method: "usdt_trc20", amount: 15.30 },
    { message: "💸 Withdrawal via TON • EQD...kL9p • $45.00", method: "ton", amount: 45.00 },
    { message: "💸 Withdrawal via Binance Pay • ID: 382*** • $22.50", method: "binance_pay", amount: 22.50 },
    { message: "💸 Withdrawal via SBP • +7 912***4567 • $18.40", method: "sbp", amount: 18.40 },
    { message: "💸 Withdrawal via Mobile Recharge • +44 7***890 • $5.50", method: "mobile", amount: 5.50 },
    { message: "💸 Withdrawal via PUBG UC • PlayerID: 987*** • $30.00", method: "pubg", amount: 30.00 },
    { message: "💸 Withdrawal via Free Fire • PlayerID: 159*** • $25.00", method: "freefire", amount: 25.00 }
];

function showFloatingWithdrawalToast() {
    const randomIndex = Math.floor(Math.random() * WITHDRAWAL_NOTIFICATIONS.length);
    const notification = WITHDRAWAL_NOTIFICATIONS[randomIndex];
    
    let toast = document.getElementById('floatingWithdrawalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'floatingWithdrawalToast';
        toast.className = 'floating-toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-money-bill-wave" style="font-size: 18px; color: #d4af37;"></i>
            <span>${notification.message}</span>
        </div>
    `;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
    
    console.log(`📢 Floating notification: ${notification.message}`);
}

function startFloatingWithdrawalNotifications() {
    if (floatingNotificationInterval) {
        if (floatingNotificationInterval._idleTimeout) clearTimeout(floatingNotificationInterval);
        floatingNotificationInterval = null;
    }
    
    const getRandomDelay = () => {
        const min = 3 * 60 * 1000;
        const max = 10 * 60 * 1000;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    const scheduleNext = () => {
        const delay = getRandomDelay();
        console.log(`⏰ Next floating notification in ${Math.round(delay / 60000)} minutes`);
        
        floatingNotificationInterval = setTimeout(() => {
            showFloatingWithdrawalToast();
            scheduleNext();
        }, delay);
    };
    
    scheduleNext();
}

function stopFloatingWithdrawalNotifications() {
    if (floatingNotificationInterval) {
        clearTimeout(floatingNotificationInterval);
        floatingNotificationInterval = null;
        console.log("🛑 Floating notifications stopped");
    }
}

function testFloatingNotification() {
    showFloatingWithdrawalToast();
}

// ═══════════════════════════════════════════════════════════════════════════
// 18.6. 👑 VIP SYSTEM (كامل مع TON Connect)
// ═══════════════════════════════════════════════════════════════════════════

const VIP_PLANS = {
    silver: { name: 'Silver', priceTON: 5, multiplier: 3, minWithdraw: 1, maxWithdraw: 500, referralBonus: 1.00, days: 7, icon: '🥈', color: '#c0c0c0' },
    gold: { name: 'Gold', priceTON: 25, multiplier: 6, minWithdraw: 1, maxWithdraw: 750, referralBonus: 1.00, days: 7, icon: '🥇', color: '#d4af37' },
    platinum: { name: 'Platinum', priceTON: 50, multiplier: 10, minWithdraw: 1, maxWithdraw: 1000, referralBonus: 1.00, days: 7, icon: '👑', color: '#e5e4e2' }
};

function saveVIPStatus(level, expiryDate) {
    localStorage.setItem('vip_data', JSON.stringify({
        level: level,
        expiryDate: expiryDate,
        activatedAt: new Date().toISOString()
    }));
}

function loadVIPStatus() {
    const saved = localStorage.getItem('vip_data');
    if (!saved) return null;
    
    const vip = JSON.parse(saved);
    const now = new Date();
    const expiry = new Date(vip.expiryDate);
    
    if (expiry > now) {
        return vip;
    } else {
        localStorage.removeItem('vip_data');
        return null;
    }
}

function getVIPMultiplier() {
    const vip = loadVIPStatus();
    if (vip && VIP_PLANS[vip.level]) {
        return VIP_PLANS[vip.level].multiplier;
    }
    return 1;
}

function getCurrentAdReward() {
    const baseReward = APP_CONFIG.adReward || 0.10;
    const multiplier = getVIPMultiplier();
    return baseReward * multiplier;
}

function getVIPWithdrawalLimits() {
    const vip = loadVIPStatus();
    if (vip && VIP_PLANS[vip.level]) {
        return {
            min: VIP_PLANS[vip.level].minWithdraw,
            max: VIP_PLANS[vip.level].maxWithdraw
        };
    }
    return { min: APP_CONFIG.minWithdraw || 10, max: 500 };
}

function getVIPReferralBonus() {
    const vip = loadVIPStatus();
    if (vip && VIP_PLANS[vip.level]) {
        return VIP_PLANS[vip.level].referralBonus;
    }
    return APP_CONFIG.referralBonus || 0.50;
}

function getVIPRemainingDays() {
    const vip = loadVIPStatus();
    if (!vip) return 0;
    
    const now = new Date();
    const expiry = new Date(vip.expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

function showVIPModal() {
    const modal = document.getElementById('vipModal');
    if (!modal) return;
    
    renderVIPPlans();
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeVIPModal() {
    const modal = document.getElementById('vipModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function renderVIPPlans() {
    const container = document.getElementById('vipPlansContainer');
    if (!container) return;
    
    const plansHtml = Object.entries(VIP_PLANS).map(([key, plan]) => {
        const dailyReward = (APP_CONFIG.dailyAdLimit * APP_CONFIG.adReward * plan.multiplier).toFixed(2);
        
        return `
            <div class="vip-plan-card ${key}">
                <div class="vip-plan-header">
                    <span class="vip-plan-icon">${plan.icon}</span>
                    <h3>${plan.name}</h3>
                </div>
                <div class="vip-plan-price">
                    <span class="price-amount">${plan.priceTON}</span>
                    <span class="price-currency">TON</span>
                </div>
                <div class="vip-plan-features">
                    <div class="vip-feature">
                        <i class="fas fa-star"></i>
                        <span>×${plan.multiplier} Ad Reward</span>
                    </div>
                    <div class="vip-feature">
                        <i class="fas fa-dollar-sign"></i>
                        <span>Min Withdraw: $${plan.minWithdraw}</span>
                    </div>
                    <div class="vip-feature">
                        <i class="fas fa-chart-line"></i>
                        <span>Max Withdraw: $${plan.maxWithdraw}</span>
                    </div>
                    <div class="vip-feature">
                        <i class="fas fa-calendar-week"></i>
                        <span>${plan.days} Days Duration</span>
                    </div>
                    <div class="vip-feature highlight">
                        <i class="fas fa-coins"></i>
                        <span>Daily Reward: $${dailyReward}</span>
                    </div>
                </div>
                <button class="vip-upgrade-btn" onclick="purchaseVIPPlan('${key}')">
                    <i class="fab fa-telegram"></i> Upgrade Now
                </button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = plansHtml;
}

async function purchaseVIPPlan(planId) {
    const plan = VIP_PLANS[planId];
    if (!plan) {
        showToast("Invalid plan selected", "error");
        return;
    }
    
    if (!window.tonConnectUI) {
        showToast("TON Connect not ready. Please refresh the page.", "error");
        return;
    }
    
    if (!tonConnected || !tonWalletAddress) {
        showToast("Please connect your TON wallet first", "info");
        await connectTONWallet();
        if (!tonConnected || !tonWalletAddress) {
            showToast("Please connect your TON wallet to continue", "warning");
            return;
        }
    }
    
    const amountTON = plan.priceTON;
    const amountNano = (amountTON * 1000000000).toString();
    
    showToast(`Processing ${amountTON} TON payment...`, "info");
    
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
            address: PLATFORM_TON_WALLET || "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount: amountNano
        }]
    };
    
    try {
        const result = await window.tonConnectUI.sendTransaction(transaction);
        
        console.log("Transaction sent:", result);
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.days);
        
        saveVIPStatus(planId, expiryDate.toISOString());
        
        showToast(`🎉 Success! You are now ${plan.name} VIP for ${plan.days} days!`, "success");
        
        closeVIPModal();
        updateUI();
        
        if (currentUser) {
            currentUser.balance = localAdCache.balance;
            currentUser.totalEarned = localAdCache.totalEarned;
            saveUserData();
        }
        
    } catch (error) {
        console.error("Transaction error:", error);
        showToast("Transaction cancelled or failed. Please try again.", "error");
    }
}

// جعل دوال VIP متاحة عالمياً
window.saveVIPStatus = saveVIPStatus;
window.loadVIPStatus = loadVIPStatus;
window.getVIPMultiplier = getVIPMultiplier;
window.getCurrentAdReward = getCurrentAdReward;
window.getVIPWithdrawalLimits = getVIPWithdrawalLimits;
window.getVIPReferralBonus = getVIPReferralBonus;
window.getVIPRemainingDays = getVIPRemainingDays;
window.showVIPModal = showVIPModal;
window.closeVIPModal = closeVIPModal;
window.purchaseVIPPlan = purchaseVIPPlan;
window.showFloatingWithdrawalToast = showFloatingWithdrawalToast;
window.startFloatingWithdrawalNotifications = startFloatingWithdrawalNotifications;
window.testFloatingNotification = testFloatingNotification;

// ═══════════════════════════════════════════════════════════════════════════
// 19. 🚀 INITIALIZATION
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
    
    startFloatingWithdrawalNotifications();
    
    setTimeout(hideSplash, 500);
    setInterval(() => {
        if (localAdCache) {
            const today = new Date().toISOString().split("T")[0];
            if (localAdCache.lastAdDate !== today) {
                localAdCache.adsToday = 0;
                localAdCache.lastAdDate = today;
                saveLocalAdCache();
                updateUI();
            }
        }
    }, 60000);
}

setTimeout(hideSplash, 3000);
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

// ═══════════════════════════════════════════════════════════════════════════
// 20. 🌐 GLOBAL EXPORTS
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
window.addNewTask = addNewTask;
window.openEditTaskModal = openEditTaskModal;
window.updateTask = updateTask;
window.deleteTask = deleteTask;
window.toggleTaskStatus = toggleTaskStatus;
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.connectTONWallet = connectTONWallet;
window.closeModal = closeModal;
window.closeConfirmModal = closeConfirmModal;
window.showAllWithdrawals = showAllWithdrawals;
window.verifyByReferrals = verifyByReferrals;
window.showReferralInvite = showReferralInvite;
window.startTonVerification = startTonVerification;
window.openSupportChat = openSupportChat;
window.initAdPlatforms = initAdPlatforms;
window.showSingleAd = showSingleAd;
window.showAdSequence = showAdSequence;

console.log("[AdNova] Platform ready | Ad Reward: $" + APP_CONFIG.adReward);
console.log("[AdNova] Features: Referrals | Withdrawal Methods | Dynamic Tasks | Admin Panel | 10 Languages | TON Connect | Support Chat");
console.log("[AdNova] VIP System: Silver x3, Gold x6, Platinum x10 | 7 days duration");
console.log("[AdNova] Floating Notifications: Every 3-10 minutes | Withdrawal only");
console.log("[AdNova] Ad Performance: Local cache with sync every 6 hours ✅");

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
