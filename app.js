// ============================================================================
// ADNOVA NETWORK - COMPLETE FRONTEND v2.0
// منصة إعلانات حقيقية - سحوبات يدوية شفافة
// ============================================================================

// ============================================================================
// SECTION 1: TELEGRAM WEBAPP & GLOBAL STATE
// ============================================================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    console.log("✅ Telegram WebApp initialized");
}

// ============================================================================
// SECTION 2: GLOBAL STATE & CACHE
// ============================================================================

let currentUser = null;
let currentUserId = null;
let currentPage = 'ads';
let isAdmin = false;
let adminAuthenticated = false;
let adminAuthToken = null;
let unreadNotifications = 0;
let currentLanguage = localStorage.getItem('adnova_lang') || 'en';
let adCooldown = false;
let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0, totalEarned: 0 };
let pendingWithdrawals = [];
let allUsers = [];

// ============================================================================
// SECTION 3: APP CONFIGURATION
// ============================================================================

const CONFIG = {
    // إعدادات التطبيق
    WELCOME_BONUS: 0.10,
    REFERRAL_BONUS: 0.50,
    AD_REWARD: 0.01,
    DAILY_AD_LIMIT: 50,
    MIN_WITHDRAW: 10.00,
    REQUIRED_REFERRALS: 10,
    AD_COOLDOWN_SECONDS: 30,
    
    // روابط
    BOT_USERNAME: 'AdNovaNetworkbot',
    SUPPORT_USERNAME: 'AdNovaSupport',
    
    // طرق السحب المدعومة
    WITHDRAWAL_METHODS: [
        { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal', placeholder: 'example@email.com' },
        { id: 'skrill', name: 'Skrill', icon: 'fab fa-skrill', placeholder: 'example@email.com' },
        { id: 'payoneer', name: 'Payoneer', icon: 'fas fa-building', placeholder: 'example@email.com' },
        { id: 'sbp', name: 'SBP (Russian)', icon: 'fas fa-university', placeholder: '+7 XXX XXX XX XX' },
        { id: 'usdt_bep20', name: 'USDT (BEP20)', icon: 'fab fa-bitcoin', placeholder: '0x...' },
        { id: 'usdt_trc20', name: 'USDT (TRC20)', icon: 'fab fa-bitcoin', placeholder: 'T...' },
        { id: 'ton', name: 'TON Network', icon: 'fab fa-telegram', placeholder: 'EQ...' },
        { id: 'mobile', name: 'Mobile Recharge', icon: 'fas fa-mobile-alt', placeholder: '+XXX XXX XXX' },
        { id: 'pubg', name: 'PUBG UC', icon: 'fas fa-gamepad', placeholder: 'Player ID' },
        { id: 'freefire', name: 'Free Fire Diamonds', icon: 'fas fa-fire', placeholder: 'Player ID' }
    ]
};

// مهام القنوات والبوتات
let TASKS_CONFIG = {
    channels: [
        { id: 'ch1', username: 'AdNovaNetwork', name: 'AdNova Official', reward: 0.05, completed: false },
        { id: 'ch2', username: 'AdNovaNews', name: 'AdNova News', reward: 0.05, completed: false },
        { id: 'ch3', username: 'AdNovaSupport', name: 'AdNova Support', reward: 0.05, completed: false }
    ],
    bots: [
        { id: 'bt1', username: 'AdNovaBot', name: 'AdNova Assistant', reward: 0.05, completed: false },
        { id: 'bt2', username: 'AdNovaRewardsBot', name: 'AdNova Rewards', reward: 0.05, completed: false }
    ]
};

// ============================================================================
// SECTION 4: TRANSLATION SYSTEM (10 LANGUAGES + RTL)
// ============================================================================

const TRANSLATIONS = {
    en: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Ads',
        'nav.tasks': 'Tasks',
        'nav.invite': 'Invite',
        'nav.withdraw': 'Withdraw',
        'nav.admin': 'Admin',
        
        'ads.title': 'Watch Ads & Earn',
        'ads.balance': 'Your Balance',
        'ads.today': 'Today',
        'ads.total': 'Total Watched',
        'ads.earned': 'Total Earned',
        'ads.watch': 'Watch Ad',
        'ads.reward': '+${reward} per ad',
        'ads.daily.limit': 'Daily: ${watched}/${limit}',
        'ads.ready': 'Ready to earn!',
        'ads.loading': 'Loading ad...',
        'ads.processing': 'Processing reward...',
        'ads.success': '+$${amount} added!',
        'ads.limit.reached': 'Daily limit reached! Come back tomorrow.',
        'ads.cooldown': 'Please wait ${seconds}s...',
        'ads.error': 'Error loading ad. Try again.',
        'ads.no.ads': 'No ads available. Try again later.',
        
        'tasks.title': 'Complete Tasks',
        'tasks.subtitle': 'Earn extra rewards',
        'tasks.channels': 'Telegram Channels',
        'tasks.bots': 'Telegram Bots',
        'tasks.completed': 'Completed',
        'tasks.progress': 'Progress',
        'tasks.total.reward': 'Total Reward: $${amount}',
        'tasks.join': 'Join',
        'tasks.start': 'Start',
        'tasks.done': 'Done',
        'tasks.verify': 'Verifying...',
        'tasks.success': '+$${amount} added!',
        'tasks.error': 'Please join first',
        
        'invite.title': 'Invite & Earn',
        'invite.subtitle': 'Get $${reward} for each friend',
        'invite.link': 'Your Invite Link',
        'invite.copy': 'Copy',
        'invite.copied': 'Link copied!',
        'invite.share': 'Share',
        'invite.total': 'Total Invites',
        'invite.earned': 'Earned from Invites',
        'invite.needed': 'Need ${needed} more invites to withdraw',
        
        'withdraw.title': 'Withdraw Funds',
        'withdraw.subtitle': 'Minimum $${min}',
        'withdraw.method': 'Payment Method',
        'withdraw.destination': 'Destination',
        'withdraw.amount': 'Amount (USD)',
        'withdraw.available': 'Available: $${balance}',
        'withdraw.submit': 'Submit Request',
        'withdraw.processing': 'Processing...',
        'withdraw.success': 'Withdrawal request submitted!',
        'withdraw.error': 'Error submitting request',
        'withdraw.insufficient': 'Insufficient balance',
        'withdraw.needs.referrals': 'Need ${needed} more referrals',
        'withdraw.need.min': 'Minimum withdrawal is $${min}',
        'withdraw.pending': 'Your request is being processed',
        
        'notifications.title': 'Notifications',
        'notifications.empty': 'No notifications',
        'notifications.clear.read': 'Clear Read',
        'notifications.clear.all': 'Clear All',
        'notifications.confirm.clear.read': 'Clear all read notifications?',
        'notifications.confirm.clear.all': 'Clear all notifications?',
        
        'admin.title': 'Admin Panel',
        'admin.auth.title': 'Admin Authentication',
        'admin.auth.desc': 'Enter admin password to continue',
        'admin.auth.placeholder': 'Enter password',
        'admin.auth.verify': 'Verify',
        'admin.auth.error': 'Invalid password',
        'admin.dashboard': 'Dashboard',
        'admin.pending': 'Pending Withdrawals',
        'admin.users': 'Users',
        'admin.broadcast': 'Broadcast',
        'admin.total.users': 'Total Users',
        'admin.pending.count': 'Pending',
        'admin.total.balance': 'Total Balance',
        'admin.total.earned': 'Total Earned',
        'admin.user.id': 'User ID',
        'admin.user.name': 'Name',
        'admin.user.balance': 'Balance',
        'admin.user.invites': 'Invites',
        'admin.user.ads': 'Ads',
        'admin.actions': 'Actions',
        'admin.approve': 'Approve',
        'admin.reject': 'Reject',
        'admin.block': 'Block',
        'admin.unblock': 'Unblock',
        'admin.add.balance': 'Add Balance',
        'admin.remove.balance': 'Remove Balance',
        'admin.broadcast.message': 'Broadcast Message',
        'admin.broadcast.send': 'Send',
        'admin.broadcast.success': 'Broadcast sent to ${count} users',
        'admin.reject.reason': 'Rejection reason',
        'admin.withdraw.referrals': 'Referrals: ${count}',
        'admin.withdraw.ads': 'Ads watched: ${count}',
        
        'toast.copied': 'Copied to clipboard!',
        'loading': 'Loading...',
        'error': 'Error occurred',
        'success': 'Success!'
    },
    ar: {
        'app.name': 'أد نوفا نتورك',
        'nav.ads': 'إعلانات',
        'nav.tasks': 'مهام',
        'nav.invite': 'دعوة',
        'nav.withdraw': 'سحب',
        'nav.admin': 'مشرف',
        
        'ads.title': 'شاهد الإعلانات واربح',
        'ads.balance': 'رصيدك',
        'ads.today': 'اليوم',
        'ads.total': 'إجمالي المشاهدات',
        'ads.earned': 'إجمالي الأرباح',
        'ads.watch': 'شاهد إعلان',
        'ads.reward': '+${reward} لكل إعلان',
        'ads.daily.limit': 'اليوم: ${watched}/${limit}',
        'ads.ready': 'جاهز للربح!',
        'ads.loading': 'جاري تحميل الإعلان...',
        'ads.processing': 'جاري معالجة المكافأة...',
        'ads.success': '+$${amount} أضيفت!',
        'ads.limit.reached': 'تم الوصول للحد اليومي! عد غداً.',
        'ads.cooldown': 'انتظر ${seconds} ثواني...',
        'ads.error': 'خطأ في تحميل الإعلان. حاول مرة أخرى.',
        'ads.no.ads': 'لا توجد إعلانات حالياً. حاول لاحقاً.',
        
        'tasks.title': 'أكمل المهام',
        'tasks.subtitle': 'اربح مكافآت إضافية',
        'tasks.channels': 'قنوات تليجرام',
        'tasks.bots': 'بوتات تليجرام',
        'tasks.completed': 'مكتمل',
        'tasks.progress': 'التقدم',
        'tasks.total.reward': 'إجمالي المكافأة: $${amount}',
        'tasks.join': 'انضم',
        'tasks.start': 'ابدأ',
        'tasks.done': 'تم',
        'tasks.verify': 'جاري التحقق...',
        'tasks.success': '+$${amount} أضيفت!',
        'tasks.error': 'يرجى الانضمام أولاً',
        
        'invite.title': 'ادعُ واربح',
        'invite.subtitle': 'احصل على $${reward} لكل صديق',
        'invite.link': 'رابط دعوتك',
        'invite.copy': 'نسخ',
        'invite.copied': 'تم نسخ الرابط!',
        'invite.share': 'مشاركة',
        'invite.total': 'إجمالي الدعوات',
        'invite.earned': 'الأرباح من الدعوات',
        'invite.needed': 'تحتاج ${needed} دعوات أخرى للسحب',
        
        'withdraw.title': 'سحب الأموال',
        'withdraw.subtitle': 'الحد الأدنى $${min}',
        'withdraw.method': 'طريقة الدفع',
        'withdraw.destination': 'جهة الدفع',
        'withdraw.amount': 'المبلغ (دولار)',
        'withdraw.available': 'المتاح: $${balance}',
        'withdraw.submit': 'إرسال الطلب',
        'withdraw.processing': 'جاري المعالجة...',
        'withdraw.success': 'تم إرسال طلب السحب!',
        'withdraw.error': 'خطأ في إرسال الطلب',
        'withdraw.insufficient': 'رصيد غير كافٍ',
        'withdraw.needs.referrals': 'تحتاج ${needed} دعوات أخرى',
        'withdraw.need.min': 'الحد الأدنى للسحب هو $${min}',
        'withdraw.pending': 'طلبك قيد المعالجة',
        
        'notifications.title': 'الإشعارات',
        'notifications.empty': 'لا توجد إشعارات',
        'notifications.clear.read': 'حذف المقروء',
        'notifications.clear.all': 'حذف الكل',
        'notifications.confirm.clear.read': 'حذف جميع الإشعارات المقروءة؟',
        'notifications.confirm.clear.all': 'حذف جميع الإشعارات؟',
        
        'admin.title': 'لوحة المشرف',
        'admin.auth.title': 'مصادقة المشرف',
        'admin.auth.desc': 'أدخل كلمة مرور المشرف للمتابعة',
        'admin.auth.placeholder': 'أدخل كلمة المرور',
        'admin.auth.verify': 'تحقق',
        'admin.auth.error': 'كلمة مرور غير صحيحة',
        'admin.dashboard': 'لوحة التحكم',
        'admin.pending': 'طلبات السحب المعلقة',
        'admin.users': 'المستخدمين',
        'admin.broadcast': 'بث',
        'admin.total.users': 'إجمالي المستخدمين',
        'admin.pending.count': 'معلق',
        'admin.total.balance': 'إجمالي الرصيد',
        'admin.total.earned': 'إجمالي الأرباح',
        'admin.user.id': 'معرف المستخدم',
        'admin.user.name': 'الاسم',
        'admin.user.balance': 'الرصيد',
        'admin.user.invites': 'الدعوات',
        'admin.user.ads': 'الإعلانات',
        'admin.actions': 'إجراءات',
        'admin.approve': 'موافقة',
        'admin.reject': 'رفض',
        'admin.block': 'حظر',
        'admin.unblock': 'إلغاء الحظر',
        'admin.add.balance': 'إضافة رصيد',
        'admin.remove.balance': 'خصم رصيد',
        'admin.broadcast.message': 'رسالة البث',
        'admin.broadcast.send': 'إرسال',
        'admin.broadcast.success': 'تم إرسال البث لـ ${count} مستخدم',
        'admin.reject.reason': 'سبب الرفض',
        'admin.withdraw.referrals': 'الإحالات: ${count}',
        'admin.withdraw.ads': 'الإعلانات المشاهدة: ${count}',
        
        'toast.copied': 'تم النسخ إلى الحافظة!',
        'loading': 'جاري التحميل...',
        'error': 'حدث خطأ',
        'success': 'تم بنجاح!'
    }
    // إضافة باقي اللغات (es, fr, ru, pt, hi, id, tr, fa) بنفس الهيكل
};

function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
    Object.keys(params).forEach(param => {
        text = text.replace(`\${${param}}`, params[param]);
    });
    return text;
}

function applyLanguage() {
    const html = document.documentElement;
    if (currentLanguage === 'ar' || currentLanguage === 'fa') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', currentLanguage);
        document.body.classList.add('rtl');
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', currentLanguage);
        document.body.classList.remove('rtl');
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    refreshCurrentPage();
}

function toggleLanguage() {
    const languages = ['en', 'ar', 'es', 'fr', 'ru', 'pt', 'hi', 'id', 'tr', 'fa'];
    const currentIndex = languages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    currentLanguage = languages[nextIndex];
    localStorage.setItem('adnova_lang', currentLanguage);
    applyLanguage();
    showToast(t('success'), 'success');
}

function getLanguageFlag(lang) {
    const flags = { en: '🇬🇧', ar: '🇸🇦', es: '🇪🇸', fr: '🇫🇷', ru: '🇷🇺', pt: '🇧🇷', hi: '🇮🇳', id: '🇮🇩', tr: '🇹🇷', fa: '🇮🇷' };
    return flags[lang] || '🌐';
}

// ============================================================================
// SECTION 5: AD PLATFORMS (5 Platforms - Global Ready)
// ============================================================================

const AD_PLATFORMS = [
    {
        name: 'Monetag',
        init: () => {},
        show: () => {
            if (typeof show_10895553 === 'function') {
                return show_10895553();
            }
            return Promise.reject('Monetag not ready');
        }
    },
    {
        name: 'AdsGram',
        init: () => {
            if (!window.AdsgramController && window.Adsgram) {
                window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" });
            }
        },
        show: () => {
            if (!window.AdsgramController && window.Adsgram) {
                window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" });
            }
            if (window.AdsgramController && typeof window.AdsgramController.show === 'function') {
                return window.AdsgramController.show();
            }
            return Promise.reject('AdsGram not ready');
        }
    },
    {
        name: 'OnClickA',
        init: () => {
            if (typeof window.initCdTma === 'function') {
                window.initCdTma({ id: '6117305' }).then(show => {
                    window.showOnClickaAd = show;
                }).catch(e => console.error('OnClickA init error:', e));
            }
        },
        show: () => {
            if (window.showOnClickaAd && typeof window.showOnClickaAd === 'function') {
                return window.showOnClickaAd();
            }
            return Promise.reject('OnClickA not ready');
        }
    },
    {
        name: 'Adexium',
        init: () => {
            if (!window.adexiumWidget && typeof AdexiumWidget !== 'undefined') {
                try {
                    window.adexiumWidget = new AdexiumWidget({
                        wid: 'd671ae85-bab7-4128-9182-50151e2ca8a6',
                        adFormat: 'interstitial'
                    });
                } catch (e) {}
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.adexiumWidget && typeof AdexiumWidget !== 'undefined') {
                        window.adexiumWidget = new AdexiumWidget({
                            wid: 'd671ae85-bab7-4128-9182-50151e2ca8a6',
                            adFormat: 'interstitial'
                        });
                    }
                    if (!window.adexiumWidget) { reject('Adexium not initialized'); return; }
                    
                    let resolved = false;
                    let timeoutId = setTimeout(() => { if (!resolved) reject('Timeout'); }, 15000);
                    
                    const cleanup = () => { clearTimeout(timeoutId); };
                    const onAdPlaybackCompleted = () => { if (!resolved) { resolved = true; cleanup(); resolve(); } };
                    const onAdClosed = () => { if (!resolved) { cleanup(); reject('Ad closed'); } };
                    const onNoAdFound = () => { if (!resolved) { cleanup(); reject('No ad'); } };
                    
                    window.adexiumWidget.on('adPlaybackCompleted', onAdPlaybackCompleted);
                    window.adexiumWidget.on('adClosed', onAdClosed);
                    window.adexiumWidget.on('noAdFound', onNoAdFound);
                    window.adexiumWidget.on('adReceived', (ad) => { window.adexiumWidget.displayAd(ad); });
                    
                    window.adexiumWidget.requestAd('interstitial');
                } catch (e) { reject(e.message); }
            });
        }
    },
    {
        name: 'RichAds',
        init: () => {
            if (!window.richadsController && typeof TelegramAdsController !== 'undefined') {
                try {
                    window.richadsController = new TelegramAdsController();
                    window.richadsController.initialize({ pubId: "1009657", appId: "7207", debug: false });
                } catch (e) {}
            }
        },
        show: () => {
            return new Promise((resolve, reject) => {
                try {
                    if (!window.richadsController && typeof TelegramAdsController !== 'undefined') {
                        window.richadsController = new TelegramAdsController();
                        window.richadsController.initialize({ pubId: "1009657", appId: "7207", debug: false });
                    }
                    if (!window.richadsController) { reject('RichAds not initialized'); return; }
                    
                    let resolved = false;
                    let timeoutId = setTimeout(() => { if (!resolved) reject('Timeout'); }, 15000);
                    const onSuccess = () => { if (!resolved) { resolved = true; clearTimeout(timeoutId); resolve(); } };
                    const onError = (err) => { if (!resolved) { clearTimeout(timeoutId); reject(err); } };
                    
                    if (typeof window.richadsController.triggerInterstitialVideo === 'function') {
                        window.richadsController.triggerInterstitialVideo().then(onSuccess).catch(onError);
                    } else if (typeof window.richadsController.showInterstitial === 'function') {
                        window.richadsController.showInterstitial().then(onSuccess).catch(onError);
                    } else {
                        reject('No show method');
                    }
                } catch (e) { reject(e.message); }
            });
        }
    }
];

// ============================================================================
// SECTION 6: CACHE MANAGEMENT
// ============================================================================

const CACHE_KEYS = {
    USER_DATA: 'adnova_user_data',
    CONFIG: 'adnova_config'
};

function saveUserToLocal() {
    if (currentUser) {
        const toSave = { ...currentUser, notifications: currentUser.notifications?.slice(0, 50) };
        localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(toSave));
    }
}

function loadUserFromLocal() {
    const cached = localStorage.getItem(CACHE_KEYS.USER_DATA);
    if (cached) {
        try {
            const user = JSON.parse(cached);
            if (user && user.userId) return user;
        } catch(e) {}
    }
    return null;
}

function clearUserCache() {
    localStorage.removeItem(CACHE_KEYS.USER_DATA);
}

// ============================================================================
// SECTION 7: API CALLS
// ============================================================================

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    if (adminAuthenticated && adminAuthToken) {
        options.headers['Authorization'] = `Bearer ${adminAuthToken}`;
    }
    try {
        const response = await fetch(endpoint, options);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// SECTION 8: REFERRAL SYSTEM (Professional - with dual startapp)
// ============================================================================

function getReferralCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let refCode = urlParams.get('startapp');
    if (!refCode && tg?.initDataUnsafe?.start_param) {
        refCode = tg.initDataUnsafe.start_param;
    }
    if (!refCode) {
        refCode = urlParams.get('ref');
    }
    return refCode;
}

function hasReferralCode() {
    return !!getReferralCodeFromUrl();
}

function generateReferralLink() {
    return `https://t.me/${CONFIG.BOT_USERNAME}/app?startapp=${currentUserId}`;
}

async function processReferral() {
    const referralCode = getReferralCodeFromUrl();
    if (!referralCode || !currentUser || referralCode === currentUserId || currentUser.referredBy) return;
    
    const processedKey = `referral_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === referralCode) return;
    
    const response = await apiCall('/api/referral', 'POST', {
        referrerId: referralCode,
        newUserId: currentUserId,
        newUserName: currentUser.userName
    });
    
    if (response.success) {
        currentUser.referredBy = referralCode;
        currentUser.balance = (currentUser.balance || 0) + CONFIG.REFERRAL_BONUS;
        currentUser.inviteCount = (currentUser.inviteCount || 0) + 1;
        localStorage.setItem(processedKey, referralCode);
        saveUserToLocal();
        updateUI();
        addNotification('🎉 New Referral!', `+$${CONFIG.REFERRAL_BONUS} added!`, 'success');
    }
}

// ============================================================================
// SECTION 9: WATCH AD SYSTEM
// ============================================================================

let adShownCount = 0;
let adPlatformsInitialized = false;

function initAdPlatforms() {
    if (adPlatformsInitialized) return;
    AD_PLATFORMS.forEach(platform => {
        if (platform.init) {
            try { platform.init(); } catch(e) { console.log(`${platform.name} init failed:`, e); }
        }
    });
    adPlatformsInitialized = true;
}

async function watchAd() {
    if (adCooldown) {
        showToast(t('ads.cooldown', { seconds: adCooldown }), 'warning');
        return;
    }
    if ((currentUser.adsToday || 0) >= CONFIG.DAILY_AD_LIMIT) {
        showToast(t('ads.limit.reached'), 'warning');
        return;
    }
    
    adCooldown = true;
    const watchBtn = document.getElementById('watchAdBtn');
    if (watchBtn) { watchBtn.disabled = true; watchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading ads...'; }
    
    initAdPlatforms();
    const shuffledPlatforms = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    let adsWatched = 0;
    
    // عرض إعلانين متتاليين
    for (let i = 0; i < Math.min(2, shuffledPlatforms.length); i++) {
        for (const platform of shuffledPlatforms) {
            if (adsWatched === i) {
                try {
                    await platform.show();
                    adsWatched++;
                    break;
                } catch (error) {
                    console.log(`${platform.name} failed:`, error);
                }
            }
        }
    }
    
    if (adsWatched === 2) {
        const reward = CONFIG.AD_REWARD;
        currentUser.balance = (currentUser.balance || 0) + reward;
        currentUser.totalEarned = (currentUser.totalEarned || 0) + reward;
        currentUser.adsWatched = (currentUser.adsWatched || 0) + 1;
        currentUser.adsToday = (currentUser.adsToday || 0) + 1;
        saveUserToLocal();
        updateUI();
        showToast(t('ads.success', { amount: reward.toFixed(2) }), 'success');
    } else {
        showToast(t('ads.no.ads'), 'error');
    }
    
    adCooldown = false;
    if (watchBtn) {
        watchBtn.disabled = false;
        watchBtn.innerHTML = '<i class="fas fa-play"></i> ' + t('ads.watch');
    }
}

// ============================================================================
// SECTION 10: TASKS SYSTEM
// ============================================================================

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    let html = '';
    let completedChannels = 0, completedBots = 0, totalReward = 0;
    
    html += `<div class="tasks-section"><h3>${t('tasks.channels')}</h3>`;
    TASKS_CONFIG.channels.forEach(ch => {
        if (ch.completed) completedChannels++;
        totalReward += ch.reward;
        html += `
            <div class="task-card">
                <div class="task-icon"><i class="fab fa-telegram"></i></div>
                <div class="task-info"><h4>${ch.name}</h4><p>@${ch.username}</p></div>
                <div class="task-reward">+$${ch.reward}</div>
                <button class="task-btn ${ch.completed ? 'completed' : ''}" onclick="completeTask('${ch.id}', 'channel', '${ch.username}')" ${ch.completed ? 'disabled' : ''}>
                    ${ch.completed ? '✓ ' + t('tasks.done') : t('tasks.join')}
                </button>
            </div>
        `;
    });
    html += `</div><div class="tasks-section"><h3>${t('tasks.bots')}</h3>`;
    TASKS_CONFIG.bots.forEach(bot => {
        if (bot.completed) completedBots++;
        totalReward += bot.reward;
        html += `
            <div class="task-card">
                <div class="task-icon"><i class="fas fa-robot"></i></div>
                <div class="task-info"><h4>${bot.name}</h4><p>@${bot.username}</p></div>
                <div class="task-reward">+$${bot.reward}</div>
                <button class="task-btn ${bot.completed ? 'completed' : ''}" onclick="completeTask('${bot.id}', 'bot', '${bot.username}')" ${bot.completed ? 'disabled' : ''}>
                    ${bot.completed ? '✓ ' + t('tasks.done') : t('tasks.start')}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
    
    const total = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = completedChannels + completedBots;
    document.getElementById('channelsCount')?.textContent = `${completedChannels}/${TASKS_CONFIG.channels.length}`;
    document.getElementById('botsCount')?.textContent = `${completedBots}/${TASKS_CONFIG.bots.length}`;
    document.getElementById('tasksProgressFill')?.style.setProperty('width', `${(completed/total)*100}%`);
    document.getElementById('tasksTotalReward')?.textContent = `$${totalReward.toFixed(2)}`;
}

function completeTask(taskId, type, username) {
    tg?.openLink ? tg.openLink(`https://t.me/${username}`) : window.open(`https://t.me/${username}`, '_blank');
    setTimeout(() => verifyTask(taskId, type), 3000);
}

async function verifyTask(taskId, type) {
    let taskCompleted = false, reward = 0;
    const tasks = type === 'channel' ? TASKS_CONFIG.channels : TASKS_CONFIG.bots;
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
        task.completed = true;
        reward = task.reward;
        taskCompleted = true;
    }
    if (taskCompleted) {
        currentUser.balance = (currentUser.balance || 0) + reward;
        currentUser.totalEarned = (currentUser.totalEarned || 0) + reward;
        saveUserToLocal();
        updateUI();
        renderTasks();
        showToast(t('tasks.success', { amount: reward.toFixed(2) }), 'success');
    } else {
        showToast(t('tasks.error'), 'error');
    }
}

// ============================================================================
// SECTION 11: INVITE SYSTEM
// ============================================================================

function copyInviteLink() {
    const link = document.getElementById('inviteLink')?.value;
    if (link) { navigator.clipboard.writeText(link); showToast(t('invite.copied'), 'success'); }
}

function shareInviteLink() {
    const link = generateReferralLink();
    const text = `🌟 Join AdNova Network and earn real money by watching ads!\n\nUse my invite link: ${link}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    tg?.openTelegramLink ? tg.openTelegramLink(shareUrl) : window.open(shareUrl, '_blank');
}

// ============================================================================
// SECTION 12: WITHDRAW SYSTEM
// ============================================================================

let selectedWithdrawMethod = 'paypal';

function renderWithdrawMethods() {
    const container = document.getElementById('withdrawMethodsContainer');
    if (!container) return;
    container.innerHTML = CONFIG.WITHDRAWAL_METHODS.map(m => `
        <div class="method-option ${m.id === selectedWithdrawMethod ? 'selected' : ''}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')">
            <i class="${m.icon}"></i><span>${m.name}</span>
        </div>
    `).join('');
}

function selectWithdrawMethod(methodId) {
    selectedWithdrawMethod = methodId;
    document.querySelectorAll('.method-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add('selected');
    const method = CONFIG.WITHDRAWAL_METHODS.find(m => m.id === methodId);
    const destInput = document.getElementById('withdrawDestination');
    if (destInput && method) destInput.placeholder = method.placeholder;
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
    const destination = document.getElementById('withdrawDestination')?.value.trim();
    const balance = currentUser?.balance || 0;
    
    if (!amount || amount < CONFIG.MIN_WITHDRAW) {
        showToast(t('withdraw.need.min', { min: CONFIG.MIN_WITHDRAW }), 'warning');
        return;
    }
    if (amount > balance) { showToast(t('withdraw.insufficient'), 'warning'); return; }
    if ((currentUser.inviteCount || 0) < CONFIG.REQUIRED_REFERRALS) {
        showToast(t('withdraw.needs.referrals', { needed: CONFIG.REQUIRED_REFERRALS - (currentUser.inviteCount || 0) }), 'warning');
        return;
    }
    if (!destination) { showToast('Please enter destination', 'warning'); return; }
    
    const btn = document.getElementById('submitWithdrawBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('withdraw.processing'); }
    
    const response = await apiCall('/api/withdraw/request', 'POST', {
        userId: currentUserId, userName: currentUser.userName,
        amount, method: selectedWithdrawMethod, destination
    });
    
    if (response.success) {
        currentUser.balance = response.newBalance;
        saveUserToLocal();
        updateUI();
        showToast(t('withdraw.success'), 'success');
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawDestination').value = '';
    } else {
        showToast(response.error || t('withdraw.error'), 'error');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = t('withdraw.submit'); }
}

// ============================================================================
// SECTION 13: NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = 'info') {
    if (!currentUser) return;
    const notification = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
        title, message, type, read: false, timestamp: new Date().toISOString()
    };
    currentUser.notifications = currentUser.notifications || [];
    currentUser.notifications.unshift(notification);
    if (currentUser.notifications.length > 50) currentUser.notifications = currentUser.notifications.slice(0, 50);
    saveUserToLocal();
    updateNotificationBadge();
    if (document.getElementById('notificationsModal')?.classList.contains('show')) renderNotifications();
    showToast(message, type);
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge && currentUser) {
        const unread = currentUser.notifications?.filter(n => !n.read).length || 0;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container || !currentUser) return;
    const notifications = currentUser.notifications || [];
    if (notifications.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>${t('notifications.empty')}</p></div>`;
        return;
    }
    let html = '';
    notifications.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = n.type === 'success' ? 'fa-check-circle' : (n.type === 'error' ? 'fa-exclamation-circle' : 'fa-bell');
        html += `
            <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
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
    const n = currentUser?.notifications?.find(n => n.id === id);
    if (n && !n.read) { n.read = true; saveUserToLocal(); updateNotificationBadge(); renderNotifications(); }
}

function clearReadNotifications() {
    if (!currentUser?.notifications) return;
    const read = currentUser.notifications.filter(n => n.read).length;
    if (read === 0) { showToast('No read notifications', 'info'); return; }
    if (confirm(t('notifications.confirm.clear.read'))) {
        currentUser.notifications = currentUser.notifications.filter(n => !n.read);
        saveUserToLocal(); updateNotificationBadge(); renderNotifications();
        showToast(`Cleared ${read} notifications`, 'success');
    }
}

function clearAllNotifications() {
    if (!currentUser?.notifications?.length) return;
    if (confirm(t('notifications.confirm.clear.all'))) {
        currentUser.notifications = [];
        saveUserToLocal(); updateNotificationBadge(); renderNotifications();
        showToast('All notifications cleared', 'success');
    }
}

function showNotificationsModal() { renderNotifications(); document.getElementById('notificationsModal')?.classList.add('show'); }
function closeNotificationsModal() { document.getElementById('notificationsModal')?.classList.remove('show'); }

// ============================================================================
// SECTION 14: UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance')?.textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    document.getElementById('adsWatchedToday')?.textContent = `${currentUser.adsToday || 0}/${CONFIG.DAILY_AD_LIMIT}`;
    document.getElementById('adsWatchedTotal')?.textContent = currentUser.adsWatched || 0;
    document.getElementById('totalEarned')?.textContent = `$${currentUser.totalEarned?.toFixed(2) || '0.00'}`;
    const progress = ((currentUser.adsToday || 0) / CONFIG.DAILY_AD_LIMIT) * 100;
    document.getElementById('adProgressFill')?.style.setProperty('width', `${progress}%`);
    document.getElementById('adProgressLabel')?.textContent = `${currentUser.adsToday || 0} / ${CONFIG.DAILY_AD_LIMIT} ${t('ads.today')}`;
    
    document.getElementById('inviteCount')?.textContent = currentUser.inviteCount || 0;
    const earned = ((currentUser.inviteCount || 0) * CONFIG.REFERRAL_BONUS).toFixed(2);
    document.getElementById('inviteEarned')?.textContent = `$${earned}`;
    const needed = Math.max(0, CONFIG.REQUIRED_REFERRALS - (currentUser.inviteCount || 0));
    document.getElementById('referralNeeded')?.textContent = needed;
    document.getElementById('inviteLink')?.setAttribute('value', generateReferralLink());
    
    document.getElementById('withdrawAvailable')?.textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    const canWithdraw = (currentUser.balance || 0) >= CONFIG.MIN_WITHDRAW && (currentUser.inviteCount || 0) >= CONFIG.REQUIRED_REFERRALS;
    document.getElementById('submitWithdrawBtn')?.setAttribute('disabled', !canWithdraw);
    updateNotificationBadge();
}

function refreshCurrentPage() {
    if (currentPage === 'ads') {
        document.getElementById('adStatusText')?.textContent = t('ads.ready');
        document.getElementById('watchAdBtn')?.innerHTML = `<i class="fas fa-play"></i> ${t('ads.watch')}`;
    } else if (currentPage === 'tasks') { renderTasks(); }
    else if (currentPage === 'invite') {
        const needed = Math.max(0, CONFIG.REQUIRED_REFERRALS - (currentUser?.inviteCount || 0));
        document.getElementById('inviteNeededText')?.textContent = t('invite.needed', { needed });
    }
}

// ============================================================================
// SECTION 15: ADMIN PANEL (Full - Hidden with Password)
// ============================================================================

function showAdminAuth() { document.getElementById('adminAuthModal')?.classList.add('show'); }

async function verifyAdminPassword() {
    const password = document.getElementById('adminPasswordInput')?.value;
    if (!password) return;
    const response = await apiCall('/api/admin/verify', 'POST', { password });
    if (response.success) {
        adminAuthenticated = true; adminAuthToken = password;
        document.getElementById('adminAuthModal')?.classList.remove('show');
        showAdminPanel();
    } else {
        document.getElementById('adminAuthError')?.style.setProperty('display', 'block');
    }
}

async function showAdminPanel() {
    if (!adminAuthenticated) { showAdminAuth(); return; }
    document.getElementById('adminPanel')?.classList.remove('hidden');
    await loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() { document.getElementById('adminPanel')?.classList.add('hidden'); }

async function loadAdminData() {
    const stats = await apiCall('/api/admin/stats', 'GET', null, true);
    if (stats.success) adminStats = stats.stats;
    const withdrawals = await apiCall('/api/admin/pending-withdrawals', 'GET', null, true);
    if (withdrawals.success) pendingWithdrawals = withdrawals.withdrawals || [];
    const users = await apiCall('/api/admin/users', 'GET', null, true);
    if (users.success) allUsers = users.users || [];
}

function renderAdminDashboard() {
    const container = document.getElementById('adminContent');
    if (!container) return;
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card" onclick="showAdminSection('dashboard')">
                <i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers}</div><div class="stat-label">${t('admin.total.users')}</div>
            </div>
            <div class="admin-stat-card" onclick="showAdminSection('pending')">
                <i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals}</div><div class="stat-label">${t('admin.pending.count')}</div>
            </div>
            <div class="admin-stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${adminStats.totalBalance?.toFixed(2) || '0.00'}</div><div class="stat-label">${t('admin.total.balance')}</div></div>
            <div class="admin-stat-card"><i class="fas fa-chart-line"></i><div class="stat-value">$${adminStats.totalEarned?.toFixed(2) || '0.00'}</div><div class="stat-label">${t('admin.total.earned')}</div></div>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" onclick="showAdminSection('pending')">${t('admin.pending')}</button>
            <button class="admin-tab" onclick="showAdminSection('users')">${t('admin.users')}</button>
            <button class="admin-tab" onclick="showAdminSection('broadcast')">${t('admin.broadcast')}</button>
        </div>
        <div id="adminSectionContent"></div>
    `;
    showAdminSection('pending');
}

function showAdminSection(section) {
    const container = document.getElementById('adminSectionContent');
    if (!container) return;
    if (section === 'pending') renderPendingWithdrawals(container);
    else if (section === 'users') renderUsersList(container);
    else if (section === 'broadcast') renderBroadcastInterface(container);
}

function renderPendingWithdrawals(container) {
    if (!pendingWithdrawals.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No pending withdrawals</p></div>`;
        return;
    }
    let html = '<div class="admin-withdrawals-list">';
    pendingWithdrawals.forEach(w => {
        const date = new Date(w.createdAt?.seconds * 1000 || Date.now());
        const invites = w.user?.inviteCount || 0;
        const ads = w.user?.adsWatched || 0;
        html += `
            <div class="admin-card">
                <div class="admin-card-header"><span class="user-name">👤 ${w.userName || w.userId.substring(0, 8)}</span><span class="withdraw-amount">$${w.amount.toFixed(2)}</span></div>
                <div class="admin-card-details">
                    <div><strong>${t('admin.user.id')}:</strong> ${w.userId}</div>
                    <div><strong>${t('admin.withdraw.referrals', { count: invites })}</strong></div>
                    <div><strong>${t('admin.withdraw.ads', { count: ads })}</strong></div>
                    <div><strong>Method:</strong> ${w.method}</div>
                    <div><strong>Destination:</strong> ${w.destination}</div>
                    <div><strong>Date:</strong> ${date.toLocaleString()}</div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-approve" onclick="approveWithdrawal('${w.id}')">✅ ${t('admin.approve')}</button>
                    <button class="btn-reject" onclick="rejectWithdrawal('${w.id}')">❌ ${t('admin.reject')}</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (!allUsers.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users-slash"></i><p>No users found</p></div>`;
        return;
    }
    let html = '<div class="admin-users-list"><div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID or name..." onkeyup="filterUsers()"></div>';
    allUsers.forEach(user => {
        html += `
            <div class="admin-card user-card" data-user-id="${user.userId}" data-user-name="${user.userName}">
                <div class="admin-card-header"><span class="user-name">👤 ${user.userName || 'User'}</span><span class="user-balance">💰 $${user.balance?.toFixed(2) || '0.00'}</span></div>
                <div class="admin-card-details">
                    <div><strong>ID:</strong> ${user.userId}</div>
                    <div class="admin-stats-row">
                        <span class="stat-badge">👥 ${t('admin.user.invites')}: ${user.inviteCount || 0}</span>
                        <span class="stat-badge">📺 ${t('admin.user.ads')}: ${user.adsWatched || 0}</span>
                        <span class="stat-badge">💵 ${t('admin.total.earned')}: $${user.totalEarned?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-add" onclick="adminAddBalance('${user.userId}')">➕ ${t('admin.add.balance')}</button>
                    <button class="btn-remove" onclick="adminRemoveBalance('${user.userId}')">➖ ${t('admin.remove.balance')}</button>
                    ${user.withdrawBlocked ? 
                        `<button class="btn-unblock" onclick="adminUnblockUser('${user.userId}')">🔓 ${t('admin.unblock')}</button>` :
                        `<button class="btn-block" onclick="adminBlockUser('${user.userId}')">🔒 ${t('admin.block')}</button>`
                    }
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderBroadcastInterface(container) {
    container.innerHTML = `
        <div class="broadcast-container">
            <textarea id="broadcastMessage" placeholder="${t('admin.broadcast.message')}" rows="4"></textarea>
            <button class="btn-broadcast" onclick="sendBroadcast()">📢 ${t('admin.broadcast.send')}</button>
        </div>
    `;
}

async function approveWithdrawal(id) {
    const res = await apiCall('/api/admin/approve-withdrawal', 'POST', { withdrawalId: id }, true);
    if (res.success) { showToast('Withdrawal approved!', 'success'); await loadAdminData(); showAdminSection('pending'); }
    else showToast('Error: ' + res.error, 'error');
}

async function rejectWithdrawal(id) {
    const reason = prompt(t('admin.reject.reason'));
    if (!reason) return;
    const res = await apiCall('/api/admin/reject-withdrawal', 'POST', { withdrawalId: id, reason }, true);
    if (res.success) { showToast('Withdrawal rejected!', 'success'); await loadAdminData(); showAdminSection('pending'); }
    else showToast('Error: ' + res.error, 'error');
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt('Enter amount to add (USD):'));
    if (isNaN(amount) || amount <= 0) return;
    const res = await apiCall('/api/admin/add-balance', 'POST', { userId, amount }, true);
    if (res.success) { showToast(`$${amount} added!`, 'success'); await loadAdminData(); showAdminSection('users'); }
    else showToast('Error: ' + res.error, 'error');
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt('Enter amount to remove (USD):'));
    if (isNaN(amount) || amount <= 0) return;
    const res = await apiCall('/api/admin/remove-balance', 'POST', { userId, amount }, true);
    if (res.success) { showToast(`$${amount} removed!`, 'success'); await loadAdminData(); showAdminSection('users'); }
    else showToast('Error: ' + res.error, 'error');
}

async function adminBlockUser(userId) {
    if (!confirm('⚠️ Permanently block this user from withdrawals?')) return;
    const res = await apiCall('/api/admin/block-user', 'POST', { userId }, true);
    if (res.success) { showToast('User blocked!', 'success'); await loadAdminData(); showAdminSection('users'); }
    else showToast('Error: ' + res.error, 'error');
}

async function adminUnblockUser(userId) {
    const res = await apiCall('/api/admin/unblock-user', 'POST', { userId }, true);
    if (res.success) { showToast('User unblocked!', 'success'); await loadAdminData(); showAdminSection('users'); }
    else showToast('Error: ' + res.error, 'error');
}

async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage')?.value;
    if (!message) return;
    const res = await apiCall('/api/admin/broadcast', 'POST', { message }, true);
    if (res.success) showToast(t('admin.broadcast.success', { count: res.notifiedCount }), 'success');
    else showToast('Error sending broadcast', 'error');
}

function filterUsers() {
    const term = document.getElementById('userSearchInput')?.value.toLowerCase();
    document.querySelectorAll('.user-card').forEach(card => {
        const match = card.getAttribute('data-user-id')?.toLowerCase().includes(term) || card.getAttribute('data-user-name')?.toLowerCase().includes(term);
        card.style.display = match ? 'block' : 'none';
    });
}

// ============================================================================
// SECTION 16: NAVIGATION
// ============================================================================

function switchTab(page) {
    currentPage = page;
    ['ads', 'tasks', 'invite', 'withdraw'].forEach(p => {
        document.getElementById(`page-${p}`)?.classList.toggle('active', p === page);
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    if (page === 'tasks') renderTasks();
    else if (page === 'invite') refreshCurrentPage();
    else if (page === 'withdraw') { renderWithdrawMethods(); refreshCurrentPage(); }
    else refreshCurrentPage();
}

// ============================================================================
// SECTION 17: TOAST & UI HELPERS
// ============================================================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<div class="toast-inner"><span class="toast-icon">${icons[type] || '✓'}</span><span class="toast-msg">${message}</span><div class="toast-bar"></div></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 500); }, 3000);
}

function showRandomSticker() { /* اختياري */ }

// ============================================================================
// SECTION 18: USER INITIALIZATION
// ============================================================================

async function initUser() {
    const cached = loadUserFromLocal();
    if (cached) { currentUser = cached; currentUserId = cached.userId; updateUI(); }
    
    let initData = null, tgUser = null;
    if (tg && tg.initDataUnsafe?.user?.id) { tgUser = tg.initDataUnsafe.user; initData = tg.initData; }
    
    if (!initData || !tgUser) {
        currentUser = { userId: 'demo_' + Date.now(), userName: 'Demo User', balance: 0.50, inviteCount: 0, adsWatched: 0, adsToday: 0, totalEarned: 0.50, notifications: [], withdrawals: [] };
        currentUserId = currentUser.userId;
        updateUI();
        hideSplash();
        return;
    }
    
    currentUserId = tgUser.id.toString();
    const response = await fetch('/api/init-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }) });
    const data = await response.json();
    if (data.success) {
        currentUser = data.userData;
        saveUserToLocal();
        updateUI();
        if (getReferralCodeFromUrl()) setTimeout(() => processReferral(), 1000);
        if (currentUserId === '1653918641') document.getElementById('adminCrownBtn')?.style.setProperty('display', 'flex');
    }
    hideSplash();
}

function hideSplash() {
    const splash = document.getElementById('splashScreen');
    if (splash) { splash.classList.add('hidden'); setTimeout(() => { splash.style.display = 'none'; document.getElementById('mainContent').style.display = 'block'; }, 500); }
}

// ============================================================================
// SECTION 19: EVENT LISTENERS & INIT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
    renderWithdrawMethods();
    initUser();
    setInterval(() => { if (currentUser && (currentUser.adsToday || 0) < CONFIG.DAILY_AD_LIMIT) updateUI(); }, 60000);
});

// ============================================================================
// SECTION 20: GLOBAL EXPORTS
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
window.showAdminSection = showAdminSection;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.adminAddBalance = adminAddBalance;
window.adminRemoveBalance = adminRemoveBalance;
window.adminBlockUser = adminBlockUser;
window.adminUnblockUser = adminUnblockUser;
window.sendBroadcast = sendBroadcast;
window.filterUsers = filterUsers;
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;

console.log("✅ AdNova Network - Fully Loaded!");
console.log(`💰 Ad Reward: $${CONFIG.AD_REWARD} | Daily Limit: ${CONFIG.DAILY_AD_LIMIT}`);
console.log(`💸 Min Withdraw: $${CONFIG.MIN_WITHDRAW} | Required Referrals: ${CONFIG.REQUIRED_REFERRALS}`);
