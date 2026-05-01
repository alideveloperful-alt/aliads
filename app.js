// ============================================================================
// ADNOVA NETWORK - COMPLETE APPLICATION v2.0
// منصة إعلانات حقيقية - سحوبات يدوية شفافة
// جميع الميزات: إحالة (startapp مرتين)، 5 منصات إعلانية، لوحة مشرف، ترجمة، إشعارات
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
let adCooldown = false;
let currentLanguage = localStorage.getItem("adnova_lang") || "en";
let selectedWithdrawMethod = "paypal";

// إعدادات التطبيق
const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkbot",
    supportUsername: "AdNovaSupport"
};

// مهام القنوات والبوتات (قابلة للتحديث يدوياً)
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
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", placeholder: "example@email.com" },
    { id: "skrill", name: "Skrill", icon: "fab fa-skrill", placeholder: "example@email.com" },
    { id: "payoneer", name: "Payoneer", icon: "fas fa-building", placeholder: "example@email.com" },
    { id: "sbp", name: "SBP (Russian)", icon: "fas fa-university", placeholder: "+7 XXX XXX XX XX" },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", placeholder: "0x..." },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", placeholder: "T..." },
    { id: "ton", name: "TON Network", icon: "fab fa-telegram", placeholder: "EQ..." },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", placeholder: "+XXX XXX XXX" },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", placeholder: "Player ID" },
    { id: "freefire", name: "Free Fire Diamonds", icon: "fas fa-fire", placeholder: "Player ID" }
];

// ============================================================================
// 3. AD PLATFORMS (5 منصات إعلانية عالمية)
// ============================================================================

const AD_PLATFORMS = [
    {
        name: "Monetag",
        init: () => {},
        show: () => {
            if (typeof show_10895553 === "function") {
                return show_10895553();
            }
            return Promise.reject("Monetag not ready");
        }
    },
    {
        name: "AdsGram",
        init: () => {
            if (!window.AdsgramController && window.Adsgram) {
                window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" });
            }
        },
        show: () => {
            if (!window.AdsgramController && window.Adsgram) {
                window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" });
            }
            if (window.AdsgramController && typeof window.AdsgramController.show === "function") {
                return window.AdsgramController.show();
            }
            return Promise.reject("AdsGram not ready");
        }
    },
    {
        name: "OnClickA",
        init: () => {
            if (typeof window.initCdTma === "function") {
                window.initCdTma({ id: "6117305" }).then(show => {
                    window.showOnClickaAd = show;
                }).catch(e => console.error("OnClickA init error:", e));
            }
        },
        show: () => {
            if (window.showOnClickaAd && typeof window.showOnClickaAd === "function") {
                return window.showOnClickaAd();
            }
            return Promise.reject("OnClickA not ready");
        }
    },
    {
        name: "Adexium",
        init: () => {
            if (!window.adexiumWidget && typeof AdexiumWidget !== "undefined") {
                try {
                    window.adexiumWidget = new AdexiumWidget({
                        wid: "d671ae85-bab7-4128-9182-50151e2ca8a6",
                        adFormat: "interstitial"
                    });
                } catch (e) {
                    console.error("Adexium init error:", e);
                }
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.adexiumWidget && typeof AdexiumWidget !== "undefined") {
                        window.adexiumWidget = new AdexiumWidget({
                            wid: "d671ae85-bab7-4128-9182-50151e2ca8a6",
                            adFormat: "interstitial"
                        });
                    }
                    if (!window.adexiumWidget) {
                        reject("Adexium not initialized");
                        return;
                    }
                    
                    let resolved = false;
                    let timeoutId = setTimeout(() => {
                        if (!resolved) reject("Adexium timeout");
                    }, 15000);
                    
                    const cleanup = () => clearTimeout(timeoutId);
                    
                    window.adexiumWidget.on("adPlaybackCompleted", () => {
                        if (!resolved) {
                            resolved = true;
                            cleanup();
                            resolve();
                        }
                    });
                    
                    window.adexiumWidget.on("adClosed", () => {
                        if (!resolved) {
                            cleanup();
                            reject("Ad closed by user");
                        }
                    });
                    
                    window.adexiumWidget.on("noAdFound", () => {
                        if (!resolved) {
                            cleanup();
                            reject("No ad available");
                        }
                    });
                    
                    window.adexiumWidget.on("adReceived", (ad) => {
                        window.adexiumWidget.displayAd(ad);
                    });
                    
                    window.adexiumWidget.requestAd("interstitial");
                } catch (e) {
                    reject("Adexium error: " + e.message);
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
                        appId: "7207",
                        debug: false
                    });
                } catch (e) {
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
                            appId: "7207",
                            debug: false
                        });
                    }
                    if (!window.richadsController) {
                        reject("RichAds not initialized");
                        return;
                    }
                    
                    let resolved = false;
                    let timeoutId = setTimeout(() => {
                        if (!resolved) reject("RichAds timeout");
                    }, 15000);
                    
                    const onSuccess = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve();
                        }
                    };
                    
                    const onError = (err) => {
                        if (!resolved) {
                            clearTimeout(timeoutId);
                            reject(err || "RichAds ad failed");
                        }
                    };
                    
                    if (typeof window.richadsController.triggerInterstitialVideo === "function") {
                        window.richadsController.triggerInterstitialVideo().then(onSuccess).catch(onError);
                    } else if (typeof window.richadsController.showInterstitial === "function") {
                        window.richadsController.showInterstitial().then(onSuccess).catch(onError);
                    } else {
                        reject("RichAds no show method found");
                    }
                } catch (e) {
                    reject("RichAds error: " + e.message);
                }
            });
        }
    }
];

// تهيئة منصات الإعلانات
function initAdPlatforms() {
    AD_PLATFORMS.forEach(platform => {
        if (platform.init) {
            try {
                platform.init();
            } catch (e) {
                console.error(platform.name + " init failed:", e);
            }
        }
    });
}

// ============================================================================
// 4. TRANSLATION SYSTEM (10 LANGUAGES + RTL)
// ============================================================================

const translations = {
    en: {
        appName: "AdNova Network",
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
        joinChannels: "Join Channels",
        joinChannelsDesc: "Earn <strong>$0.05</strong> per channel",
        startBots: "Start Bots",
        startBotsDesc: "Earn <strong>$0.05</strong> per bot",
        progress: "Progress",
        joinBtn: "Join",
        startBtn: "Start",
        inviteAndEarn: "Invite & Earn",
        inviteHeroSub: "Copy and share your invite link with friends to earn more.",
        yourInviteLink: "Your Invite Link",
        copy: "Copy",
        shareWithFriends: "Share with Friends",
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
        adminAuthTitle: "Admin Authentication",
        adminAuthDesc: "Enter admin password to continue",
        verify: "Verify",
        loadingAd: "Loading ad...",
        adRewardAdded: "+${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow.",
        adError: "Error loading ad. Try again.",
        linkCopied: "Link copied!",
        channelReward: "+$0.05 added!",
        taskError: "Error completing task.",
        minWithdraw: "Minimum withdrawal is $10.00",
        exceedsBalance: "Amount exceeds your balance",
        needInvites: "You need to invite at least 5 friends",
        completeAllTasks: "Please complete all tasks first",
        needAds: "You need to watch at least 80 ads",
        withdrawSuccess: "Withdrawal request submitted!",
        withdrawError: "Error submitting request",
        insufficientBalance: "Insufficient balance"
    },
    ar: {
        appName: "أد نوفا نتورك",
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
        joinChannels: "الانضمام للقنوات",
        joinChannelsDesc: "اكسب <strong>$0.05</strong> لكل قناة",
        startBots: "تشغيل البوتات",
        startBotsDesc: "اكسب <strong>$0.05</strong> لكل بوت",
        progress: "التقدم",
        joinBtn: "انضمام",
        startBtn: "تشغيل",
        inviteAndEarn: "ادع واكسب",
        inviteHeroSub: "انسخ رابط دعوتك وشاركه مع أصدقائك لتكسب أكثر.",
        yourInviteLink: "رابط دعوتك",
        copy: "نسخ",
        shareWithFriends: "مشاركة مع الأصدقاء",
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
        adminAuthTitle: "مصادقة المشرف",
        adminAuthDesc: "أدخل كلمة مرور المشرف للمتابعة",
        verify: "تحقق",
        loadingAd: "جاري تحميل الإعلان...",
        adRewardAdded: "+${amount} أضيفت!",
        dailyLimitReached: "تم الوصول للحد اليومي! عد غداً.",
        adError: "خطأ في تحميل الإعلان. حاول مرة أخرى.",
        linkCopied: "تم نسخ الرابط!",
        channelReward: "+$0.05 أضيفت!",
        taskError: "خطأ في إكمال المهمة.",
        minWithdraw: "الحد الأدنى للسحب هو $10.00",
        exceedsBalance: "المبلغ يتجاوز رصيدك",
        needInvites: "تحتاج إلى دعوة 5 أصدقاء على الأقل",
        completeAllTasks: "يرجى إكمال جميع المهام أولاً",
        needAds: "تحتاج إلى مشاهدة 80 إعلاناً على الأقل",
        withdrawSuccess: "تم إرسال طلب السحب!",
        withdrawError: "خطأ في إرسال الطلب",
        insufficientBalance: "رصيد غير كافٍ"
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
    if (currentLanguage === "ar" || currentLanguage === "fa") {
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
    
    const langBtn = document.getElementById("langBtnLabel");
    if (langBtn) langBtn.textContent = currentLanguage === "ar" ? "العربية" : "English";
    
    // تحديث عنوان الصفحة
    document.title = t("appName") + " - Earn Real Money";
    
    // تحديث اسم التطبيق في شاشة التحميل
    const splashSub = document.querySelector(".splash-sub span:not(.splash-deco)");
    if (splashSub) splashSub.textContent = t("appName");
    
    refreshCurrentPage();
}

function toggleLanguage() {
    currentLanguage = currentLanguage === "en" ? "ar" : "en";
    localStorage.setItem("adnova_lang", currentLanguage);
    applyLanguage();
    showToast(t("copy"), "success");
}

// ============================================================================
// 5. LOCAL STORAGE MANAGEMENT
// ============================================================================

function getTelegramUserId() {
    if (tg?.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id.toString();
    }
    return localStorage.getItem("adnova_user_id") || "guest_" + Math.random().toString(36).substr(2, 9);
}

function getUserName() {
    return tg?.initDataUnsafe?.user?.first_name || localStorage.getItem("adnova_user_name") || "User";
}

function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        const today = new Date().toISOString().split("T")[0];
        currentUser = {
            userId: currentUserId,
            userName: getUserName(),
            balance: APP_CONFIG.welcomeBonus,
            totalEarned: APP_CONFIG.welcomeBonus,
            adsWatched: 0,
            adsToday: 0,
            lastAdDate: today,
            inviteCount: 0,
            referredBy: null,
            referrals: [],
            withdrawals: [],
            notifications: [{
                id: Date.now(),
                title: "🎉 Welcome!",
                message: `+$${APP_CONFIG.welcomeBonus} welcome bonus!`,
                type: "success",
                read: false,
                timestamp: new Date().toISOString()
            }],
            withdrawBlocked: false,
            settings: {}
        };
        saveUserData();
        processReferralFromUrl();
    }
    
    // إعادة تعيين الإعلانات اليومية
    const today = new Date().toISOString().split("T")[0];
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    updateUI();
    loadTasksProgress();
    return currentUser;
}

function saveUserData() {
    localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser));
}

// ============================================================================
// 6. REFERRAL SYSTEM (مع startapp مرتين)
// ============================================================================

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) {
        ref = tg.initDataUnsafe.start_param;
    }
    if (!ref) {
        ref = urlParams.get("ref");
    }
    return ref;
}

function processReferralFromUrl() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    // تحديث بيانات المُحيل
    const referrerData = localStorage.getItem(`adnova_user_${refCode}`);
    if (referrerData) {
        const referrer = JSON.parse(referrerData);
        if (!referrer.referrals.includes(currentUserId)) {
            referrer.referrals.push(currentUserId);
            referrer.inviteCount++;
            referrer.balance += APP_CONFIG.referralBonus;
            referrer.totalEarned += APP_CONFIG.referralBonus;
            referrer.notifications.unshift({
                id: Date.now(),
                title: "🎉 New Referral!",
                message: `+$${APP_CONFIG.referralBonus} added!`,
                type: "success",
                read: false,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem(`adnova_user_${refCode}`, JSON.stringify(referrer));
        }
    }
    
    // تحديث بيانات المستخدم الجديد
    currentUser.referredBy = refCode;
    currentUser.balance += APP_CONFIG.welcomeBonus;
    currentUser.totalEarned += APP_CONFIG.welcomeBonus;
    currentUser.notifications.unshift({
        id: Date.now(),
        title: "🎉 Welcome Bonus!",
        message: `+$${APP_CONFIG.welcomeBonus} added!`,
        type: "success",
        read: false,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(processedKey, refCode);
    saveUserData();
    updateUI();
}

function getReferralLink() {
    return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`;
}

function copyInviteLink() {
    const link = document.getElementById("inviteLink")?.textContent;
    if (link) {
        navigator.clipboard.writeText(link);
        showToast(t("linkCopied"), "success");
    }
}

function shareInviteLink() {
    const link = getReferralLink();
    const text = `Join AdNova Network and earn real money watching ads!\n\nJoin here: ${link}`;
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
    }
}

// ============================================================================
// 7. ADS SYSTEM
// ============================================================================

async function watchAd() {
    if (adCooldown) {
        showToast("Please wait a few seconds...", "warning");
        return;
    }
    
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) {
        showToast(t("dailyLimitReached"), "warning");
        return;
    }
    
    adCooldown = true;
    const watchBtn = document.getElementById("watchAdBtn");
    if (watchBtn) {
        watchBtn.disabled = true;
        watchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading ad...';
    }
    
    showToast(t("loadingAd"), "info");
    
    initAdPlatforms();
    const shuffledPlatforms = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    let adShown = false;
    
    for (const platform of shuffledPlatforms) {
        if (!adShown) {
            try {
                await platform.show();
                adShown = true;
                break;
            } catch (e) {
                console.error(platform.name + " failed:", e);
            }
        }
    }
    
    if (adShown) {
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showToast(t("adRewardAdded", { amount: APP_CONFIG.adReward.toFixed(2) }), "success");
        showEarnToast();
        checkWithdrawalUnlock();
    } else {
        showToast(t("adError"), "error");
    }
    
    adCooldown = false;
    if (watchBtn) {
        watchBtn.disabled = false;
        watchBtn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn");
    }
}

function showEarnToast() {
    const toast = document.getElementById("earn-toast");
    if (!toast) return;
    
    const amountSpan = document.getElementById("earnToastAmount");
    if (amountSpan) amountSpan.textContent = `+ $${APP_CONFIG.adReward.toFixed(2)} Earned`;
    
    toast.classList.remove("hide");
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
    }, 3000);
}

function checkWithdrawalUnlock() {
    const canWithdraw = (currentUser.balance >= APP_CONFIG.minWithdraw && 
                         currentUser.inviteCount >= APP_CONFIG.requiredReferrals);
    
    if (canWithdraw && !currentUser.withdrawalUnlocked) {
        currentUser.withdrawalUnlocked = true;
        saveUserData();
        addNotification("🎉 Withdrawal Unlocked!", 
            `You can now withdraw $${currentUser.balance.toFixed(2)}!`, 
            "success");
    }
}

// ============================================================================
// 8. TASKS SYSTEM
// ============================================================================

function loadTasksProgress() {
    const saved = localStorage.getItem(`adnova_tasks_${currentUserId}`);
    if (saved) {
        const progress = JSON.parse(saved);
        TASKS_CONFIG.channels.forEach(ch => {
            ch.completed = progress.channels?.includes(ch.id) || false;
        });
        TASKS_CONFIG.bots.forEach(bt => {
            bt.completed = progress.bots?.includes(bt.id) || false;
        });
    }
}

function saveTasksProgress() {
    const progress = {
        channels: TASKS_CONFIG.channels.filter(c => c.completed).map(c => c.id),
        bots: TASKS_CONFIG.bots.filter(b => b.completed).map(b => b.id)
    };
    localStorage.setItem(`adnova_tasks_${currentUserId}`, JSON.stringify(progress));
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    
    let html = "";
    let completedChannels = 0;
    let completedBots = 0;
    let totalReward = 0;
    
    // القنوات
    html += `<div class="tasks-section"><h3><i class="fab fa-telegram"></i> ${t("joinChannels")}</h3>`;
    TASKS_CONFIG.channels.forEach(ch => {
        if (ch.completed) completedChannels++;
        totalReward += ch.reward;
        html += `
            <div class="task-card">
                <div class="task-icon"><i class="fab fa-telegram"></i></div>
                <div class="task-info">
                    <h4>${ch.name}</h4>
                    <p>@${ch.username}</p>
                </div>
                <div class="task-reward">+$${ch.reward}</div>
                <button class="task-btn ${ch.completed ? "completed" : ""}" 
                        onclick="completeTask('${ch.id}', 'channel', '${ch.username}')" 
                        ${ch.completed ? "disabled" : ""}>
                    ${ch.completed ? "✓ " + t("copy") : t("joinBtn")}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    // البوتات
    html += `<div class="tasks-section"><h3><i class="fas fa-robot"></i> ${t("startBots")}</h3>`;
    TASKS_CONFIG.bots.forEach(bt => {
        if (bt.completed) completedBots++;
        totalReward += bt.reward;
        html += `
            <div class="task-card">
                <div class="task-icon"><i class="fas fa-robot"></i></div>
                <div class="task-info">
                    <h4>${bt.name}</h4>
                    <p>@${bt.username}</p>
                </div>
                <div class="task-reward">+$${bt.reward}</div>
                <button class="task-btn ${bt.completed ? "completed" : ""}" 
                        onclick="completeTask('${bt.id}', 'bot', '${bt.username}')" 
                        ${bt.completed ? "disabled" : ""}>
                    ${bt.completed ? "✓ " + t("copy") : t("startBtn")}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    container.innerHTML = html;
    
    // تحديث الإحصائيات
    const total = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = completedChannels + completedBots;
    const progressPercent = total > 0 ? (completed / total) * 100 : 0;
    
    const channelsCountEl = document.getElementById("channelProgressCount");
    const botsCountEl = document.getElementById("botProgressCount");
    const progressFillEl = document.getElementById("tasksProgressFill");
    const totalRewardEl = document.getElementById("tasksTotalReward");
    
    if (channelsCountEl) channelsCountEl.textContent = `${completedChannels}/${TASKS_CONFIG.channels.length}`;
    if (botsCountEl) botsCountEl.textContent = `${completedBots}/${TASKS_CONFIG.bots.length}`;
    if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;
    if (totalRewardEl) totalRewardEl.textContent = `$${totalReward.toFixed(2)}`;
}

function completeTask(taskId, type, username) {
    window.open(`https://t.me/${username}`, "_blank");
    
    setTimeout(() => {
        let task = null;
        if (type === "channel") {
            task = TASKS_CONFIG.channels.find(t => t.id === taskId);
        } else {
            task = TASKS_CONFIG.bots.find(t => t.id === taskId);
        }
        
        if (task && !task.completed) {
            task.completed = true;
            saveTasksProgress();
            
            currentUser.balance += task.reward;
            currentUser.totalEarned += task.reward;
            saveUserData();
            updateUI();
            renderTasks();
            showToast(t("channelReward"), "success");
            addNotification("✅ Task Completed!", `+$${task.reward.toFixed(2)} added!`, "success");
            checkWithdrawalUnlock();
        } else {
            showToast(t("taskError"), "error");
        }
    }, 3000);
}

// ============================================================================
// 9. WITHDRAW SYSTEM
// ============================================================================

function renderWithdrawMethods() {
    const container = document.getElementById("withdrawMethodsContainer");
    if (!container) return;
    
    container.innerHTML = WITHDRAWAL_METHODS.map(m => `
        <div class="method-option ${m.id === selectedWithdrawMethod ? "selected" : ""}" 
             data-method="${m.id}" 
             onclick="selectWithdrawMethod('${m.id}')">
            <i class="${m.icon}"></i>
            <span>${m.name}</span>
        </div>
    `).join("");
}

function selectWithdrawMethod(methodId) {
    selectedWithdrawMethod = methodId;
    document.querySelectorAll(".method-option").forEach(el => {
        el.classList.remove("selected");
    });
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add("selected");
    
    const method = WITHDRAWAL_METHODS.find(m => m.id === methodId);
    const destInput = document.getElementById("wdDestInput");
    if (destInput && method) {
        destInput.placeholder = method.placeholder;
    }
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    
    if (!amount || amount < APP_CONFIG.minWithdraw) {
        showToast(t("minWithdraw"), "warning");
        return;
    }
    
    if (amount > currentUser.balance) {
        showToast(t("insufficientBalance"), "warning");
        return;
    }
    
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) {
        showToast(t("needInvites"), "warning");
        return;
    }
    
    if (!destination) {
        showToast("Please enter destination", "warning");
        return;
    }
    
    const btn = document.getElementById("wdSubmitBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    // محاكاة طلب سحب
    setTimeout(() => {
        const withdrawal = {
            id: Date.now(),
            amount: amount,
            method: selectedWithdrawMethod,
            destination: destination,
            status: "pending",
            date: new Date().toISOString()
        };
        
        currentUser.withdrawals.unshift(withdrawal);
        currentUser.balance -= amount;
        saveUserData();
        updateUI();
        
        showToast(t("withdrawSuccess"), "success");
        
        if (document.getElementById("wdAmountInput")) document.getElementById("wdAmountInput").value = "";
        if (document.getElementById("wdDestInput")) document.getElementById("wdDestInput").value = "";
        
        addNotification("💸 Withdrawal Requested", 
            `$${amount.toFixed(2)} via ${selectedWithdrawMethod} is being processed`, 
            "info");
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t("submitWithdrawal");
        }
    }, 1000);
}

// ============================================================================
// 10. NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = "info") {
    if (!currentUser) return;
    
    const notification = {
        id: Date.now(),
        title: title,
        message: message,
        type: type,
        read: false,
        timestamp: new Date().toISOString()
    };
    
    currentUser.notifications.unshift(notification);
    if (currentUser.notifications.length > 50) {
        currentUser.notifications = currentUser.notifications.slice(0, 50);
    }
    saveUserData();
    updateNotificationBadge();
    
    if (document.getElementById("notificationsModal")?.classList.contains("show")) {
        renderNotifications();
    }
    
    showToast(message, type);
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
    
    const notifications = currentUser.notifications || [];
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
        return;
    }
    
    let html = "";
    notifications.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const icon = n.type === "success" ? "fa-check-circle" : (n.type === "error" ? "fa-exclamation-circle" : "fa-bell");
        
        html += `
            <div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead(${n.id})">
                <div class="notification-icon ${n.type}"><i class="fas ${icon}"></i></div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    <div class="notification-time">${formatted}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function markNotificationRead(id) {
    const n = currentUser.notifications.find(n => n.id == id);
    if (n && !n.read) {
        n.read = true;
        saveUserData();
        updateNotificationBadge();
        renderNotifications();
    }
}

function clearReadNotifications() {
    if (!currentUser.notifications) return;
    const readCount = currentUser.notifications.filter(n => n.read).length;
    if (readCount === 0) {
        showToast("No read notifications", "info");
        return;
    }
    
    currentUser.notifications = currentUser.notifications.filter(n => !n.read);
    saveUserData();
    updateNotificationBadge();
    renderNotifications();
    showToast(`Cleared ${readCount} notifications`, "success");
}

function clearAllNotifications() {
    if (!currentUser.notifications || currentUser.notifications.length === 0) return;
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

// ============================================================================
// 11. UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    
    // تحديث الرصيد والإحصائيات
    const balanceEl = document.getElementById("balance");
    const adsTodayEl = document.getElementById("adsWatchedToday");
    const adsTotalEl = document.getElementById("totalAdsWatched");
    const totalEarnedEl = document.getElementById("totalAdsEarned");
    const statsTodayEl = document.getElementById("statsToday");
    const progressFill = document.getElementById("adProgressFill");
    const progressLabel = document.getElementById("adProgressLabel");
    
    if (balanceEl) balanceEl.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    if (adsTodayEl) adsTodayEl.textContent = `${currentUser.adsToday || 0}/${APP_CONFIG.dailyAdLimit}`;
    if (adsTotalEl) adsTotalEl.textContent = currentUser.adsWatched || 0;
    if (totalEarnedEl) totalEarnedEl.textContent = `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`;
    if (statsTodayEl) statsTodayEl.textContent = `$${((currentUser.adsToday || 0) * APP_CONFIG.adReward).toFixed(2)}`;
    
    const progress = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    
    // صفحة الدعوات
    const inviteCountEl = document.getElementById("totalInvites");
    const inviteEarnedEl = document.getElementById("totalEarnedFromInvites");
    const inviteLinkEl = document.getElementById("inviteLink");
    
    if (inviteCountEl) inviteCountEl.textContent = currentUser.inviteCount || 0;
    if (inviteEarnedEl) inviteEarnedEl.textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    if (inviteLinkEl) inviteLinkEl.textContent = getReferralLink();
    
    // صفحة السحب
    const availBalanceEl = document.getElementById("wdAvailBalance");
    if (availBalanceEl) availBalanceEl.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    
    // اسم المستخدم
    const userNameEl = document.getElementById("userName");
    const userChatIdEl = document.getElementById("userChatId");
    const userAvatarText = document.getElementById("userAvatarText");
    const userAvatarImg = document.getElementById("userAvatarImg");
    
    if (userNameEl) userNameEl.textContent = currentUser.userName || "User";
    if (userChatIdEl) userChatIdEl.textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`;
    if (userAvatarText) userAvatarText.textContent = (currentUser.userName || "U").charAt(0).toUpperCase();
    
    if (tg?.initDataUnsafe?.user?.photo_url && userAvatarImg) {
        userAvatarImg.src = tg.initDataUnsafe.user.photo_url;
        userAvatarImg.style.display = "block";
        if (userAvatarText) userAvatarText.style.display = "none";
    }
    
    updateNotificationBadge();
}

function refreshCurrentPage() {
    if (currentPage === "tasks") {
        renderTasks();
    } else if (currentPage === "invite") {
        const inviteLinkEl = document.getElementById("inviteLink");
        if (inviteLinkEl) inviteLinkEl.textContent = getReferralLink();
    } else if (currentPage === "withdraw") {
        renderWithdrawMethods();
    }
}

// ============================================================================
// 12. NAVIGATION
// ============================================================================

function switchTab(page) {
    currentPage = page;
    
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`)?.classList.add("active");
    
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-page") === page) {
            item.classList.add("active");
        }
    });
    
    if (page === "tasks") {
        renderTasks();
    } else if (page === "invite") {
        const inviteLinkEl = document.getElementById("inviteLink");
        if (inviteLinkEl) inviteLinkEl.textContent = getReferralLink();
    } else if (page === "withdraw") {
        renderWithdrawMethods();
    }
}

// ============================================================================
// 13. TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };
    
    toast.innerHTML = `
        <div class="toast-inner">
            <span class="toast-icon">${icons[type] || "✓"}</span>
            <span class="toast-msg">${message}</span>
            <div class="toast-bar"></div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ============================================================================
// 14. ADMIN PANEL (مخفية بكلمة مرور)
// ============================================================================

let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0 };
let pendingWithdrawals = [];
let allUsers = [];

function checkAdminAndShowCrown() {
    const adminId = "1653918641";
    if (currentUserId === adminId) {
        const crownBtn = document.getElementById("adminCrownBtn");
        if (crownBtn) crownBtn.style.display = "flex";
    }
}

function showAdminAuth() {
    document.getElementById("adminAuthModal")?.classList.add("show");
}

function verifyAdminPassword() {
    const password = document.getElementById("adminPasswordInput")?.value;
    const adminPassword = "Admin97€";
    
    if (password === adminPassword) {
        adminAuthenticated = true;
        document.getElementById("adminAuthModal")?.classList.remove("show");
        showAdminPanel();
    } else {
        const errorEl = document.getElementById("adminAuthError");
        if (errorEl) errorEl.style.display = "block";
    }
}

function showAdminPanel() {
    if (!adminAuthenticated) {
        showAdminAuth();
        return;
    }
    
    document.getElementById("adminPanel")?.classList.remove("hidden");
    loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() {
    document.getElementById("adminPanel")?.classList.add("hidden");
}

function loadAdminData() {
    // جمع المستخدمين من localStorage
    allUsers = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("adnova_user_")) {
            try {
                const user = JSON.parse(localStorage.getItem(key));
                allUsers.push(user);
                adminStats.totalBalance += user.balance || 0;
            } catch (e) {}
        }
    }
    
    adminStats.totalUsers = allUsers.length;
    
    // جمع طلبات السحب المعلقة
    pendingWithdrawals = [];
    allUsers.forEach(user => {
        if (user.withdrawals) {
            user.withdrawals.forEach(w => {
                if (w.status === "pending") {
                    pendingWithdrawals.push({
                        ...w,
                        userId: user.userId,
                        userName: user.userName,
                        inviteCount: user.inviteCount,
                        adsWatched: user.adsWatched
                    });
                }
            });
        }
    });
    adminStats.pendingWithdrawals = pendingWithdrawals.length;
}

function renderAdminDashboard() {
    const container = document.getElementById("adminContent");
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card" onclick="showAdminSection('dashboard')">
                <i class="fas fa-users"></i>
                <div class="stat-value">${adminStats.totalUsers}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="admin-stat-card" onclick="showAdminSection('pending')">
                <i class="fas fa-clock"></i>
                <div class="stat-value">${adminStats.pendingWithdrawals}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="admin-stat-card">
                <i class="fas fa-dollar-sign"></i>
                <div class="stat-value">$${adminStats.totalBalance.toFixed(2)}</div>
                <div class="stat-label">Total Balance</div>
            </div>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="showAdminSection('pending')">Pending Withdrawals</button>
            <button class="admin-tab" onclick="showAdminSection('users')">Users</button>
        </div>
        <div id="adminSectionContent"></div>
    `;
    
    showAdminSection("pending");
}

function showAdminSection(section) {
    const container = document.getElementById("adminSectionContent");
    if (!container) return;
    
    if (section === "pending") {
        renderPendingWithdrawals(container);
    } else if (section === "users") {
        renderUsersList(container);
    }
}

function renderPendingWithdrawals(container) {
    if (pendingWithdrawals.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending withdrawals</div>';
        return;
    }
    
    let html = "";
    pendingWithdrawals.forEach(w => {
        const date = new Date(w.date);
        html += `
            <div class="admin-card">
                <div class="admin-card-header">
                    <span>👤 ${w.userName || w.userId}</span>
                    <span class="withdraw-amount">$${w.amount.toFixed(2)}</span>
                </div>
                <div class="admin-card-details">
                    <div>ID: ${w.userId}</div>
                    <div>👥 Invites: ${w.inviteCount || 0}</div>
                    <div>📺 Ads: ${w.adsWatched || 0}</div>
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
    });
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (allUsers.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }
    
    let html = '<div class="admin-users-list"><div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID or name..." onkeyup="filterUsers()"></div>';
    
    allUsers.forEach(user => {
        html += `
            <div class="admin-card user-card" data-user-id="${user.userId}" data-user-name="${user.userName}">
                <div class="admin-card-header">
                    <span>👤 ${user.userName || "User"}</span>
                    <span class="user-balance">💰 $${user.balance?.toFixed(2) || "0.00"}</span>
                </div>
                <div class="admin-card-details">
                    <div>ID: ${user.userId}</div>
                    <div>👥 Invites: ${user.inviteCount || 0} | 📺 Ads: ${user.adsWatched || 0}</div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-add" onclick="adminAddBalance('${user.userId}')">➕ Add Balance</button>
                    <button class="btn-remove" onclick="adminRemoveBalance('${user.userId}')">➖ Remove Balance</button>
                    <button class="btn-block" onclick="adminBlockUser('${user.userId}')">🔒 Block</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function filterUsers() {
    const term = document.getElementById("userSearchInput")?.value.toLowerCase();
    document.querySelectorAll(".user-card").forEach(card => {
        const userId = card.getAttribute("data-user-id")?.toLowerCase();
        const userName = card.getAttribute("data-user-name")?.toLowerCase();
        const match = userId?.includes(term) || userName?.includes(term);
        card.style.display = match ? "block" : "none";
    });
}

function approveWithdrawal(withdrawalId, userId, amount) {
    const userKey = `adnova_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
        const user = JSON.parse(userData);
        const withdrawalIndex = user.withdrawals?.findIndex(w => w.id == withdrawalId);
        if (withdrawalIndex !== -1 && user.withdrawals[withdrawalIndex]) {
            user.withdrawals[withdrawalIndex].status = "approved";
            localStorage.setItem(userKey, JSON.stringify(user));
        }
    }
    
    showToast("Withdrawal approved!", "success");
    loadAdminData();
    renderPendingWithdrawals(document.getElementById("adminSectionContent"));
}

function rejectWithdrawal(withdrawalId, userId, amount) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    
    const userKey = `adnova_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
        const user = JSON.parse(userData);
        const withdrawalIndex = user.withdrawals?.findIndex(w => w.id == withdrawalId);
        if (withdrawalIndex !== -1 && user.withdrawals[withdrawalIndex]) {
            user.withdrawals[withdrawalIndex].status = "rejected";
            user.withdrawals[withdrawalIndex].reason = reason;
            user.balance = (user.balance || 0) + amount;
            localStorage.setItem(userKey, JSON.stringify(user));
        }
    }
    
    showToast("Withdrawal rejected!", "success");
    loadAdminData();
    renderPendingWithdrawals(document.getElementById("adminSectionContent"));
}

function adminAddBalance(userId) {
    const amount = parseFloat(prompt("Amount to add (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    
    const userKey = `adnova_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
        const user = JSON.parse(userData);
        user.balance = (user.balance || 0) + amount;
        user.totalEarned = (user.totalEarned || 0) + amount;
        localStorage.setItem(userKey, JSON.stringify(user));
        
        if (userId === currentUserId) {
            currentUser = user;
            updateUI();
        }
        
        showToast(`$${amount.toFixed(2)} added!`, "success");
        loadAdminData();
        showAdminSection("users");
    }
}

function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt("Amount to remove (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    
    const userKey = `adnova_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
        const user = JSON.parse(userData);
        user.balance = Math.max(0, (user.balance || 0) - amount);
        localStorage.setItem(userKey, JSON.stringify(user));
        
        if (userId === currentUserId) {
            currentUser = user;
            updateUI();
        }
        
        showToast(`$${amount.toFixed(2)} removed!`, "success");
        loadAdminData();
        showAdminSection("users");
    }
}

function adminBlockUser(userId) {
    if (!confirm("⚠️ Permanently block this user from withdrawals?")) return;
    
    const userKey = `adnova_user_${userId}`;
    const userData = localStorage.getItem(userKey);
    if (userData) {
        const user = JSON.parse(userData);
        user.withdrawBlocked = true;
        localStorage.setItem(userKey, JSON.stringify(user));
        
        if (userId === currentUserId) {
            currentUser = user;
        }
        
        showToast("User blocked!", "success");
        loadAdminData();
        showAdminSection("users");
    }
}

// ============================================================================
// 15. INITIALIZATION & FIX (إصلاح شاشة التحميل)
// ============================================================================

function hideSplash() {
    console.log("[AdNova] Hiding splash screen...");
    
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    
    if (splash) {
        splash.classList.add("hidden");
        setTimeout(() => {
            splash.style.display = "none";
            if (main) {
                main.style.display = "block";
                console.log("[AdNova] Main content visible");
            }
        }, 500);
    } else if (main) {
        main.style.display = "block";
    }
}

function init() {
    console.log("[AdNova] Initializing application...");
    
    // تطبيق اللغة أولاً
    applyLanguage();
    
    // تحميل بيانات المستخدم
    loadUserData();
    
    // تهيئة واجهة السحب
    renderWithdrawMethods();
    
    // التحقق من المشرف
    checkAdminAndShowCrown();
    
    // إخفاء شاشة التحميل بعد 1.5 ثانية كحد أقصى
    setTimeout(hideSplash, 1500);
    
    // إعادة تعيين الإعلانات اليومية كل دقيقة
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
    
    console.log("[AdNova] Application ready!");
}

// بدء التطبيق
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

// ============================================================================
// 16. GLOBAL EXPORTS
// ============================================================================

window.switchTab = switchTab;
window.toggleLanguage = toggleLanguage;
window.watchAd = watchAd;
window.completeTask = completeTask;
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

console.log("[AdNova] AdNova Network - Fully Loaded!");
console.log(`💰 Ad Reward: $${APP_CONFIG.adReward} | Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw} | Required Referrals: ${APP_CONFIG.requiredReferrals}`);
