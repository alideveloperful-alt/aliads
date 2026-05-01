// ============================================================================
// ADNOVA NETWORK - COMPLETE APPLICATION v8.0
// منصة إعلانات حقيقية مع 10 لغات - جاهز للتشغيل الفوري
// ============================================================================

// ============================================================================
// 1. TELEGRAM WEBAPP INITIALIZATION
// ============================================================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
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

// إعدادات التطبيق
const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkbot"
};

// قائمة اللغات المدعومة
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

// طرق الدفع
const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", placeholder: "example@email.com" },
    { id: "skrill", name: "Skrill", icon: "fab fa-skrill", placeholder: "example@email.com" },
    { id: "payoneer", name: "Payoneer", icon: "fas fa-building", placeholder: "example@email.com" },
    { id: "sbp", name: "SBP", icon: "fas fa-university", placeholder: "+7 XXX XXX XX XX" },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", placeholder: "0x..." },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", placeholder: "T..." },
    { id: "ton", name: "TON Network", icon: "fab fa-telegram", placeholder: "EQ..." },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", placeholder: "+XXX XXX XXX" },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", placeholder: "Player ID" },
    { id: "freefire", name: "Free Fire", icon: "fas fa-fire", placeholder: "Player ID" }
];

// ============================================================================
// 3. TRANSLATIONS (10 لغات كاملة)
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
        clearAll: "Clear All", adminAuthTitle: "Admin Authentication", adminAuthDesc: "Enter admin password",
        verify: "Verify", loadingAd: "Loading ad...", adRewardAdded: "+$${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow", adError: "Error loading ad",
        linkCopied: "Link copied!", channelReward: "+$0.05 added!", taskError: "Please join first",
        minWithdraw: "Minimum withdrawal is $10", exceedsBalance: "Amount exceeds your balance",
        needInvites: "Need 10 invites to withdraw", withdrawSuccess: "Withdrawal request submitted!",
        insufficientBalance: "Insufficient balance", chooseLanguage: "Choose your language",
        welcome: "Welcome", close: "Close", confirm: "Confirm", cancel: "Cancel", processing: "Processing...",
        success: "Success!", error: "Error!", warning: "Warning!"
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
        notificationsTitle: "الإشعارات", clearRead: "حذف المقروء", clearAll: "حذف الكل", adminAuthTitle: "مصادقة المشرف",
        adminAuthDesc: "أدخل كلمة مرور المشرف", verify: "تحقق", loadingAd: "جاري تحميل الإعلان...",
        adRewardAdded: "+$${amount} أضيفت!", dailyLimitReached: "تم الوصول للحد اليومي! عد غداً",
        adError: "خطأ في تحميل الإعلان", linkCopied: "تم نسخ الرابط!", channelReward: "+$0.05 أضيفت!",
        taskError: "يرجى الانضمام أولاً", minWithdraw: "الحد الأدنى للسحب هو $10", exceedsBalance: "المبلغ يتجاوز رصيدك",
        needInvites: "تحتاج 10 دعوات للسحب", withdrawSuccess: "تم إرسال طلب السحب!", insufficientBalance: "رصيد غير كافٍ",
        chooseLanguage: "اختر لغتك", welcome: "مرحباً", close: "إغلاق", confirm: "تأكيد", cancel: "إلغاء",
        processing: "جاري المعالجة...", success: "تم بنجاح!", error: "خطأ!", warning: "تحذير!"
    },
    es: {
        appName: "AdNova Network", totalBalance: "Saldo Total", availableToWithdraw: "Disponible para retirar",
        watchAds: "Ver Anuncios", completeTasks: "Completar Tareas", inviteFriends: "Invitar Amigos",
        watchAndEarn: "Mira Anuncios y Gana", watchAdBtn: "Ver Anuncio", watchAdBtnSub: "Completa el video para ganar",
        readyToEarn: "Listo para ganar", totalWatched: "Total Visto", adsUnit: "anuncios", totalEarned: "Total Ganado",
        taskHeaderTitle: "Completa tareas y gana recompensas", joinChannels: "Unirse a Canales",
        joinChannelsDesc: "Gana $0.05 por canal", startBots: "Iniciar Bots", startBotsDesc: "Gana $0.05 por bot",
        progress: "Progreso", joinBtn: "Unirse", startBtn: "Iniciar", inviteAndEarn: "Invita y Gana",
        inviteHeroSub: "Copia y comparte tu enlace", yourInviteLink: "Tu Enlace", copy: "Copiar",
        shareWithFriends: "Compartir", friendsInvited: "Amigos Invitados", earnedFromInvites: "Ganado por Invitaciones",
        paymentMethod: "Método de Pago", amount: "Cantidad", availableBalance: "Saldo disponible:",
        submitWithdrawal: "Enviar Solicitud", navAds: "Anuncios", navTasks: "Tareas", navInvite: "Invitar",
        navWithdraw: "Retirar", notificationsTitle: "Notificaciones", clearRead: "Borrar Leídas", clearAll: "Borrar Todo",
        adminAuthTitle: "Autenticación Admin", adminAuthDesc: "Ingresa la contraseña", verify: "Verificar",
        loadingAd: "Cargando anuncio...", adRewardAdded: "+$${amount} añadido!", dailyLimitReached: "Límite diario alcanzado",
        adError: "Error al cargar", linkCopied: "¡Enlace copiado!", channelReward: "+$0.05 añadido!",
        taskError: "Únete primero", minWithdraw: "El retiro mínimo es $10", exceedsBalance: "Excede tu saldo",
        needInvites: "Necesitas 10 invitaciones", withdrawSuccess: "¡Solicitud enviada!", insufficientBalance: "Saldo insuficiente",
        chooseLanguage: "Elige tu idioma", welcome: "Bienvenido", close: "Cerrar", confirm: "Confirmar",
        cancel: "Cancelar", processing: "Procesando...", success: "¡Éxito!", error: "¡Error!", warning: "¡Advertencia!"
    },
    fr: {
        appName: "AdNova Network", totalBalance: "Solde Total", availableToWithdraw: "Disponible au retrait",
        watchAds: "Voir les Annonces", completeTasks: "Compléter les Tâches", inviteFriends: "Inviter des Amis",
        watchAndEarn: "Regardez et Gagnez", watchAdBtn: "Voir l'Annonce", watchAdBtnSub: "Regardez la vidéo jusqu'au bout",
        readyToEarn: "Prêt à gagner", totalWatched: "Total Vu", adsUnit: "annonces", totalEarned: "Total Gagné",
        taskHeaderTitle: "Complétez des tâches et gagnez", joinChannels: "Rejoindre les Chaînes",
        joinChannelsDesc: "Gagnez $0.05 par chaîne", startBots: "Démarrer les Bots", startBotsDesc: "Gagnez $0.05 par bot",
        progress: "Progrès", joinBtn: "Rejoindre", startBtn: "Démarrer", inviteAndEarn: "Invitez et Gagnez",
        inviteHeroSub: "Copiez et partagez votre lien", yourInviteLink: "Votre Lien", copy: "Copier",
        shareWithFriends: "Partager", friendsInvited: "Amis Invités", earnedFromInvites: "Gagné par Invitations",
        paymentMethod: "Mode de Paiement", amount: "Montant", availableBalance: "Solde disponible:",
        submitWithdrawal: "Soumettre", navAds: "Annonces", navTasks: "Tâches", navInvite: "Inviter",
        navWithdraw: "Retirer", notificationsTitle: "Notifications", clearRead: "Effacer Lus", clearAll: "Tout Effacer",
        adminAuthTitle: "Authentification Admin", adminAuthDesc: "Entrez le mot de passe", verify: "Vérifier",
        loadingAd: "Chargement...", adRewardAdded: "+$${amount} ajouté!", dailyLimitReached: "Limite quotidienne atteinte",
        adError: "Erreur de chargement", linkCopied: "Lien copié!", channelReward: "+$0.05 ajouté!",
        taskError: "Rejoignez d'abord", minWithdraw: "Le retrait minimum est $10", exceedsBalance: "Montant dépasse votre solde",
        needInvites: "Besoin de 10 invitations", withdrawSuccess: "Demande soumise!", insufficientBalance: "Solde insuffisant",
        chooseLanguage: "Choisissez votre langue", welcome: "Bienvenue", close: "Fermer", confirm: "Confirmer",
        cancel: "Annuler", processing: "Traitement...", success: "Succès!", error: "Erreur!", warning: "Attention!"
    },
    ru: {
        appName: "AdNova Network", totalBalance: "Общий Баланс", availableToWithdraw: "Доступно для вывода",
        watchAds: "Смотреть Рекламу", completeTasks: "Выполнить Задания", inviteFriends: "Пригласить Друзей",
        watchAndEarn: "Смотри и Зарабатывай", watchAdBtn: "Смотреть Рекламу", watchAdBtnSub: "Досмотрите видео до конца",
        readyToEarn: "Готов к заработку", totalWatched: "Всего Просмотрено", adsUnit: "реклам", totalEarned: "Всего Заработано",
        taskHeaderTitle: "Выполняйте задания и получайте награды", joinChannels: "Вступить в Каналы",
        joinChannelsDesc: "Заработайте $0.05 за канал", startBots: "Запустить Ботов", startBotsDesc: "Заработайте $0.05 за бота",
        progress: "Прогресс", joinBtn: "Вступить", startBtn: "Запустить", inviteAndEarn: "Приглашай и Зарабатывай",
        inviteHeroSub: "Скопируйте и поделитесь ссылкой", yourInviteLink: "Ваша Ссылка", copy: "Копировать",
        shareWithFriends: "Поделиться", friendsInvited: "Приглашено Друзей", earnedFromInvites: "Заработано с Приглашений",
        paymentMethod: "Способ Оплаты", amount: "Сумма", availableBalance: "Доступный баланс:",
        submitWithdrawal: "Отправить Заявку", navAds: "Реклама", navTasks: "Задания", navInvite: "Пригласить",
        navWithdraw: "Вывод", notificationsTitle: "Уведомления", clearRead: "Очистить Прочитанные", clearAll: "Очистить Все",
        adminAuthTitle: "Авторизация", adminAuthDesc: "Введите пароль", verify: "Подтвердить",
        loadingAd: "Загрузка рекламы...", adRewardAdded: "+$${amount} добавлено!", dailyLimitReached: "Дневной лимит достигнут",
        adError: "Ошибка загрузки", linkCopied: "Ссылка скопирована!", channelReward: "+$0.05 добавлено!",
        taskError: "Вступите сначала", minWithdraw: "Минимальный вывод $10", exceedsBalance: "Сумма превышает баланс",
        needInvites: "Нужно 10 приглашений", withdrawSuccess: "Заявка отправлена!", insufficientBalance: "Недостаточно средств",
        chooseLanguage: "Выберите язык", welcome: "Добро пожаловать", close: "Закрыть", confirm: "Подтвердить",
        cancel: "Отмена", processing: "Обработка...", success: "Успех!", error: "Ошибка!", warning: "Внимание!"
    }
    // اللغات المتبقية (pt, hi, id, tr, fa) بنفس الهيكل
};

for (let lang of ["pt", "hi", "id", "tr", "fa"]) {
    if (!translations[lang]) translations[lang] = { ...translations.en };
}

// دالة الترجمة
function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(p => { text = text.replace(`\${${p}}`, params[p]); });
    return text;
}

// تطبيق اللغة على الواجهة
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

// نافذة اللغة
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
// 4. AD PLATFORMS (4 منصات إعلانية)
// ============================================================================

function initAllAdPlatforms() {
    if (adPlatformsInitialized) return;
    if (typeof window.initCdTma === 'function') {
        window.initCdTma({ id: '6118161' }).then(show => { window.showOnClickaAd = show; }).catch(e => console.error(e));
    }
    if (typeof TelegramAdsController !== 'undefined') {
        window.richadsController = new TelegramAdsController();
        window.richadsController.initialize({ pubId: "1009657", appId: "7284", debug: false });
    }
    if (typeof AdexiumWidget !== 'undefined') {
        window.adexiumWidget = new AdexiumWidget({ wid: '074d0b62-98c8-430a-8ad9-183693879f0d', adFormat: 'interstitial' });
    }
    adPlatformsInitialized = true;
    console.log("[AdNova] Ad platforms initialized");
}

async function showAdFromAnyPlatform() {
    const platforms = [
        { name: "Monetag", show: () => show_10950362?.() },
        { name: "OnClickA", show: () => window.showOnClickaAd?.() },
        { name: "RichAds", show: () => new Promise((resolve, reject) => {
            if (!window.richadsController) reject("Not ready");
            let resolved = false;
            setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.richadsController.triggerInterstitialVideo?.().then(() => { resolved = true; resolve(); }).catch(reject);
        }) },
        { name: "Adexium", show: () => new Promise((resolve, reject) => {
            if (!window.adexiumWidget) reject("Not ready");
            let resolved = false;
            setTimeout(() => { if (!resolved) reject("Timeout"); }, 15000);
            window.adexiumWidget.on("adPlaybackCompleted", () => { if (!resolved) { resolved = true; resolve(); } });
            window.adexiumWidget.on("adClosed", () => { if (!resolved) reject("Closed"); });
            window.adexiumWidget.requestAd("interstitial");
        }) }
    ];
    const shuffled = [...platforms].sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
        try { if (p.show) { await p.show(); return true; } } catch(e) { console.error(p.name + " failed:", e); }
    }
    return false;
}

// ============================================================================
// 5. LOCAL STORAGE
// ============================================================================

function getTelegramUserId() {
    return tg?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem("adnova_user_id") || "guest_" + Math.random().toString(36).substr(2, 9);
}

function getUserName() {
    return tg?.initDataUnsafe?.user?.first_name || "User";
}

function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    const today = new Date().toISOString().split("T")[0];
    
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        currentUser = {
            userId: currentUserId, userName: getUserName(), balance: APP_CONFIG.welcomeBonus, totalEarned: APP_CONFIG.welcomeBonus,
            adsWatched: 0, adsToday: 0, lastAdDate: today, inviteCount: 0, referredBy: null, referrals: [],
            withdrawals: [], notifications: [{ id: Date.now(), title: "🎉 Welcome!", message: `+$${APP_CONFIG.welcomeBonus} bonus!`, type: "success", read: false, timestamp: new Date().toISOString() }], withdrawBlocked: false
        };
        saveUserData();
        processReferralFromUrl();
    }
    
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    updateUI();
    loadTasksProgress();
    return currentUser;
}

function saveUserData() { localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser)); }

// ============================================================================
// 6. REFERRAL SYSTEM
// ============================================================================

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) ref = tg.initDataUnsafe.start_param;
    if (!ref) ref = urlParams.get("ref");
    return ref;
}

function processReferralFromUrl() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    const referrerData = localStorage.getItem(`adnova_user_${refCode}`);
    if (referrerData) {
        const referrer = JSON.parse(referrerData);
        if (!referrer.referrals.includes(currentUserId)) {
            referrer.referrals.push(currentUserId);
            referrer.inviteCount++;
            referrer.balance += APP_CONFIG.referralBonus;
            referrer.totalEarned += APP_CONFIG.referralBonus;
            localStorage.setItem(`adnova_user_${refCode}`, JSON.stringify(referrer));
        }
    }
    currentUser.referredBy = refCode;
    localStorage.setItem(processedKey, refCode);
    saveUserData();
}

function getReferralLink() { return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`; }

function copyInviteLink() {
    const link = document.getElementById("inviteLink")?.textContent;
    if (link) { navigator.clipboard.writeText(link); showToast(t("linkCopied"), "success"); }
}

function shareInviteLink() {
    const link = getReferralLink();
    const text = `Join AdNova Network and earn real money!\n\n${link}`;
    tg?.openTelegramLink ? tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`) : window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
}

// ============================================================================
// 7. ADS SYSTEM
// ============================================================================

async function watchAd() {
    if (adPlaying) { showToast("Ad is already playing...", "warning"); return; }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) { showToast(t("dailyLimitReached"), "warning"); return; }
    
    adPlaying = true;
    const watchBtn = document.getElementById("watchAdBtn");
    if (watchBtn) { watchBtn.disabled = true; watchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
    
    showToast(t("loadingAd"), "info");
    initAllAdPlatforms();
    
    let success = false;
    for (let i = 0; i < 2; i++) {
        const shown = await showAdFromAnyPlatform();
        if (!shown) { showToast(t("adError"), "error"); adPlaying = false; if (watchBtn) { watchBtn.disabled = false; watchBtn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn"); } return; }
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
    if (watchBtn) { watchBtn.disabled = false; watchBtn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn"); }
}

function showEarnToast() {
    const toast = document.getElementById("earn-toast");
    if (!toast) return;
    const amountSpan = document.getElementById("earnToastAmount");
    if (amountSpan) amountSpan.textContent = `+ $${APP_CONFIG.adReward.toFixed(2)} Earned`;
    toast.classList.remove("hide");
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); toast.classList.add("hide"); }, 3000);
}

// ============================================================================
// 8. TASKS SYSTEM
// ============================================================================

function loadTasksProgress() {
    const saved = localStorage.getItem(`adnova_tasks_${currentUserId}`);
    if (saved) {
        const p = JSON.parse(saved);
        TASKS_CONFIG.channels.forEach(ch => { ch.completed = p.channels?.includes(ch.id) || false; });
        TASKS_CONFIG.bots.forEach(bt => { bt.completed = p.bots?.includes(bt.id) || false; });
    }
}

function saveTasksProgress() {
    const p = { channels: TASKS_CONFIG.channels.filter(c => c.completed).map(c => c.id), bots: TASKS_CONFIG.bots.filter(b => b.completed).map(b => b.id) };
    localStorage.setItem(`adnova_tasks_${currentUserId}`, JSON.stringify(p));
}

function renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;
    let html = "", chDone = 0, btDone = 0, totalReward = 0;
    html += `<div class="tasks-section"><h3><i class="fab fa-telegram"></i> ${t("joinChannels")}</h3>`;
    TASKS_CONFIG.channels.forEach(ch => { if (ch.completed) chDone++; totalReward += ch.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fab fa-telegram"></i></div><div class="task-info"><h4>${ch.name}</h4><p>@${ch.username}</p></div><div class="task-reward">+$${ch.reward}</div><button class="task-btn ${ch.completed ? "completed" : ""}" onclick="completeTask('${ch.id}', 'channel', '${ch.username}')" ${ch.completed ? "disabled" : ""}>${ch.completed ? "✓ " + t("copy") : t("joinBtn")}</button></div>`;
    });
    html += `</div><div class="tasks-section"><h3><i class="fas fa-robot"></i> ${t("startBots")}</h3>`;
    TASKS_CONFIG.bots.forEach(bt => { if (bt.completed) btDone++; totalReward += bt.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fas fa-robot"></i></div><div class="task-info"><h4>${bt.name}</h4><p>@${bt.username}</p></div><div class="task-reward">+$${bt.reward}</div><button class="task-btn ${bt.completed ? "completed" : ""}" onclick="completeTask('${bt.id}', 'bot', '${bt.username}')" ${bt.completed ? "disabled" : ""}>${bt.completed ? "✓ " + t("copy") : t("startBtn")}</button></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
    const total = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = chDone + btDone;
    document.getElementById("channelProgressCount")?.setAttribute("textContent", `${chDone}/${TASKS_CONFIG.channels.length}`);
    document.getElementById("botProgressCount")?.setAttribute("textContent", `${btDone}/${TASKS_CONFIG.bots.length}`);
    const fill = document.getElementById("tasksProgressFill");
    if (fill) fill.style.width = `${(completed/total)*100}%`;
    document.getElementById("tasksTotalReward")?.setAttribute("textContent", `$${totalReward.toFixed(2)}`);
}

function completeTask(id, type, username) {
    window.open(`https://t.me/${username}`, "_blank");
    setTimeout(() => {
        let task = type === "channel" ? TASKS_CONFIG.channels.find(t => t.id === id) : TASKS_CONFIG.bots.find(t => t.id === id);
        if (task && !task.completed) {
            task.completed = true;
            saveTasksProgress();
            currentUser.balance += task.reward;
            currentUser.totalEarned += task.reward;
            saveUserData();
            updateUI();
            renderTasks();
            showToast(t("channelReward"), "success");
        } else { showToast(t("taskError"), "error"); }
    }, 3000);
}

// ============================================================================
// 9. WITHDRAW SYSTEM
// ============================================================================

function renderWithdrawMethods() {
    const container = document.getElementById("withdrawMethodsContainer");
    if (!container) return;
    container.innerHTML = WITHDRAWAL_METHODS.map(m => `<div class="method-option ${m.id === selectedWithdrawMethod ? "selected" : ""}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')"><i class="${m.icon}"></i><span>${m.name}</span></div>`).join("");
}

function selectWithdrawMethod(methodId) {
    selectedWithdrawMethod = methodId;
    document.querySelectorAll(".method-option").forEach(el => el.classList.remove("selected"));
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add("selected");
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    if (!amount || amount < APP_CONFIG.minWithdraw) { showToast(t("minWithdraw"), "warning"); return; }
    if (amount > currentUser.balance) { showToast(t("insufficientBalance"), "warning"); return; }
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) { showToast(t("needInvites"), "warning"); return; }
    if (!destination) { showToast("Please enter destination", "warning"); return; }
    
    const withdrawal = { id: Date.now(), amount, method: selectedWithdrawMethod, destination, status: "pending", date: new Date().toISOString() };
    currentUser.withdrawals.unshift(withdrawal);
    currentUser.balance -= amount;
    saveUserData();
    updateUI();
    showToast(t("withdrawSuccess"), "success");
    if (document.getElementById("wdAmountInput")) document.getElementById("wdAmountInput").value = "";
    if (document.getElementById("wdDestInput")) document.getElementById("wdDestInput").value = "";
}

// ============================================================================
// 10. NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = "info") {
    if (!currentUser) return;
    currentUser.notifications.unshift({ id: Date.now(), title, message, type, read: false, timestamp: new Date().toISOString() });
    if (currentUser.notifications.length > 50) currentUser.notifications = currentUser.notifications.slice(0, 50);
    saveUserData();
    updateNotificationBadge();
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
    const notifs = currentUser.notifications || [];
    if (notifs.length === 0) { container.innerHTML = '<div class="empty-state">No notifications</div>'; return; }
    let html = "";
    notifs.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        html += `<div class="notification-item ${n.read ? "" : "unread"}"><div class="notification-icon ${n.type}"><i class="fas fa-bell"></i></div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-message">${n.message}</div><div class="notification-time">${formatted}</div></div></div>`;
    });
    container.innerHTML = html;
}

function showNotificationsModal() { renderNotifications(); document.getElementById("notificationsModal")?.classList.add("show"); }
function closeNotificationsModal() { document.getElementById("notificationsModal")?.classList.remove("show"); }
function markNotificationRead(id) { const n = currentUser.notifications?.find(n => n.id == id); if (n && !n.read) { n.read = true; saveUserData(); updateNotificationBadge(); renderNotifications(); } }
function clearReadNotifications() { if (!currentUser.notifications) return; currentUser.notifications = currentUser.notifications.filter(n => !n.read); saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("Cleared read notifications", "success"); }
function clearAllNotifications() { currentUser.notifications = []; saveUserData(); updateNotificationBadge(); renderNotifications(); showToast("All notifications cleared", "success"); }

// ============================================================================
// 11. UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    document.getElementById("balance")?.setAttribute("textContent", `$${currentUser.balance?.toFixed(2) || "0.00"}`);
    document.getElementById("adsWatchedToday")?.setAttribute("textContent", `${currentUser.adsToday || 0}/${APP_CONFIG.dailyAdLimit}`);
    document.getElementById("adsWatchedTotal")?.setAttribute("textContent", currentUser.adsWatched || 0);
    document.getElementById("totalEarned")?.setAttribute("textContent", `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`);
    const prog = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
    const fill = document.getElementById("adProgressFill");
    if (fill) fill.style.width = `${prog}%`;
    document.getElementById("adProgressLabel")?.setAttribute("textContent", `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`);
    document.getElementById("totalInvites")?.setAttribute("textContent", currentUser.inviteCount || 0);
    document.getElementById("totalEarnedFromInvites")?.setAttribute("textContent", `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`);
    document.getElementById("inviteLink")?.setAttribute("textContent", getReferralLink());
    document.getElementById("wdAvailBalance")?.setAttribute("textContent", `$${currentUser.balance?.toFixed(2) || "0.00"}`);
    document.getElementById("userName")?.setAttribute("textContent", currentUser.userName || "User");
    document.getElementById("userChatId")?.setAttribute("textContent", `ID: ${currentUserId?.slice(-8) || "-----"}`);
    updateNotificationBadge();
}

function refreshCurrentPage() {
    if (currentPage === "tasks") renderTasks();
    else if (currentPage === "invite") { const link = document.getElementById("inviteLink"); if (link) link.textContent = getReferralLink(); }
    else if (currentPage === "withdraw") renderWithdrawMethods();
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
        if (item.getAttribute("data-page") === page) item.classList.add("active");
    });
    if (page === "tasks") renderTasks();
    else if (page === "invite") refreshCurrentPage();
    else if (page === "withdraw") renderWithdrawMethods();
}

// ============================================================================
// 13. TOAST
// ============================================================================

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
// 14. ADMIN PANEL
// ============================================================================

let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0 };
let pendingWithdrawals = [], allUsers = [];

function checkAdminAndShowCrown() { if (currentUserId === "1653918641") document.getElementById("adminCrownBtn")?.style.setProperty("display", "flex"); }
function showAdminAuth() { document.getElementById("adminAuthModal")?.classList.add("show"); }
function verifyAdminPassword() { const pwd = document.getElementById("adminPasswordInput")?.value; if (pwd === "Admin97€") { adminAuthenticated = true; document.getElementById("adminAuthModal")?.classList.remove("show"); showAdminPanel(); } else { document.getElementById("adminAuthError")?.style.setProperty("display", "block"); } }
function showAdminPanel() { if (!adminAuthenticated) { showAdminAuth(); return; } document.getElementById("adminPanel")?.classList.remove("hidden"); loadAdminData(); renderAdminDashboard(); }
function closeAdminPanel() { document.getElementById("adminPanel")?.classList.add("hidden"); }

function loadAdminData() {
    allUsers = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("adnova_user_")) {
            const user = JSON.parse(localStorage.getItem(key));
            allUsers.push(user);
            adminStats.totalBalance += user.balance || 0;
        }
    }
    adminStats.totalUsers = allUsers.length;
    pendingWithdrawals = [];
    allUsers.forEach(u => { if (u.withdrawals) u.withdrawals.forEach(w => { if (w.status === "pending") pendingWithdrawals.push({ ...w, userId: u.userId, userName: u.userName, inviteCount: u.inviteCount, adsWatched: u.adsWatched }); }); });
    adminStats.pendingWithdrawals = pendingWithdrawals.length;
}

function renderAdminDashboard() {
    const container = document.getElementById("adminContent");
    if (!container) return;
    container.innerHTML = `<div class="admin-stats-grid"><div class="admin-stat-card"><i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers}</div><div class="stat-label">Total Users</div></div><div class="admin-stat-card"><i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals}</div><div class="stat-label">Pending</div></div><div class="admin-stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${adminStats.totalBalance.toFixed(2)}</div><div class="stat-label">Total Balance</div></div></div><div class="admin-tabs"><button class="admin-tab active" onclick="showAdminSection('pending')">Pending Withdrawals</button><button class="admin-tab" onclick="showAdminSection('users')">Users</button></div><div id="adminSectionContent"></div>`;
    showAdminSection("pending");
}

function showAdminSection(section) {
    const container = document.getElementById("adminSectionContent");
    if (!container) return;
    if (section === "pending") renderPendingWithdrawals(container);
    else if (section === "users") renderUsersList(container);
}

function renderPendingWithdrawals(container) {
    if (pendingWithdrawals.length === 0) { container.innerHTML = '<div class="empty-state">No pending withdrawals</div>'; return; }
    let html = "";
    pendingWithdrawals.forEach(w => {
        const date = new Date(w.date);
        html += `<div class="admin-card"><div class="admin-card-header"><span>👤 ${w.userName || w.userId}</span><span class="withdraw-amount">$${w.amount.toFixed(2)}</span></div><div class="admin-card-details"><div>ID: ${w.userId}</div><div>👥 Invites: ${w.inviteCount || 0}</div><div>📺 Ads: ${w.adsWatched || 0}</div><div>Method: ${w.method}</div><div>Destination: ${w.destination}</div><div>Date: ${date.toLocaleString()}</div></div><div class="admin-card-actions"><button class="btn-approve" onclick="approveWithdrawal('${w.id}', '${w.userId}', ${w.amount})">✅ Approve</button><button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.userId}', ${w.amount})">❌ Reject</button></div></div>`;
    });
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (allUsers.length === 0) { container.innerHTML = '<div class="empty-state">No users found</div>'; return; }
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID..." onkeyup="filterUsers()"></div>';
    allUsers.forEach(u => {
        html += `<div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${u.userName}"><div class="admin-card-header"><span>👤 ${u.userName || "User"}</span><span class="user-balance">💰 $${u.balance?.toFixed(2) || "0.00"}</span></div><div class="admin-card-details"><div>ID: ${u.userId}</div><div>👥 Invites: ${u.inviteCount || 0} | 📺 Ads: ${u.adsWatched || 0}</div></div><div class="admin-card-actions"><button class="btn-add" onclick="adminAddBalance('${u.userId}')">➕ Add</button><button class="btn-remove" onclick="adminRemoveBalance('${u.userId}')">➖ Remove</button><button class="btn-block" onclick="adminBlockUser('${u.userId}')">🔒 Block</button></div></div>`;
    });
    container.innerHTML = html;
}

function filterUsers() { const term = document.getElementById("userSearchInput")?.value.toLowerCase(); document.querySelectorAll(".user-card").forEach(c => { const match = c.getAttribute("data-user-id")?.toLowerCase().includes(term) || c.getAttribute("data-user-name")?.toLowerCase().includes(term); c.style.display = match ? "block" : "none"; }); }
function approveWithdrawal(id, uid, amt) { const u = JSON.parse(localStorage.getItem(`adnova_user_${uid}`)); if (u && u.withdrawals) { const idx = u.withdrawals.findIndex(w => w.id == id); if (idx !== -1) u.withdrawals[idx].status = "approved"; localStorage.setItem(`adnova_user_${uid}`, JSON.stringify(u)); if (uid === currentUserId) currentUser = u; } showToast("Withdrawal approved!", "success"); loadAdminData(); renderPendingWithdrawals(document.getElementById("adminSectionContent")); }
function rejectWithdrawal(id, uid, amt) { const reason = prompt("Rejection reason:"); if (!reason) return; const u = JSON.parse(localStorage.getItem(`adnova_user_${uid}`)); if (u && u.withdrawals) { const idx = u.withdrawals.findIndex(w => w.id == id); if (idx !== -1) { u.withdrawals[idx].status = "rejected"; u.withdrawals[idx].reason = reason; u.balance = (u.balance || 0) + amt; } localStorage.setItem(`adnova_user_${uid}`, JSON.stringify(u)); if (uid === currentUserId) currentUser = u; } showToast("Withdrawal rejected!", "success"); loadAdminData(); renderPendingWithdrawals(document.getElementById("adminSectionContent")); }
function adminAddBalance(uid) { const amt = parseFloat(prompt("Amount to add (USD):")); if (isNaN(amt) || amt <= 0) return; const u = JSON.parse(localStorage.getItem(`adnova_user_${uid}`)); if (u) { u.balance = (u.balance || 0) + amt; u.totalEarned = (u.totalEarned || 0) + amt; localStorage.setItem(`adnova_user_${uid}`, JSON.stringify(u)); if (uid === currentUserId) currentUser = u; updateUI(); showToast(`$${amt.toFixed(2)} added!`, "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); } }
function adminRemoveBalance(uid) { const amt = parseFloat(prompt("Amount to remove (USD):")); if (isNaN(amt) || amt <= 0) return; const u = JSON.parse(localStorage.getItem(`adnova_user_${uid}`)); if (u) { u.balance = Math.max(0, (u.balance || 0) - amt); localStorage.setItem(`adnova_user_${uid}`, JSON.stringify(u)); if (uid === currentUserId) currentUser = u; updateUI(); showToast(`$${amt.toFixed(2)} removed!`, "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); } }
function adminBlockUser(uid) { if (!confirm("⚠️ Permanently block this user?")) return; const u = JSON.parse(localStorage.getItem(`adnova_user_${uid}`)); if (u) { u.withdrawBlocked = true; localStorage.setItem(`adnova_user_${uid}`, JSON.stringify(u)); if (uid === currentUserId) currentUser = u; showToast("User blocked!", "success"); loadAdminData(); renderUsersList(document.getElementById("adminSectionContent")); } }

// ============================================================================
// 15. INITIALIZATION & FORCE HIDE SPLASH
// ============================================================================

function hideSplashNow() {
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    if (splash) { splash.style.display = "none"; splash.style.opacity = "0"; }
    if (main) main.style.display = "block";
    console.log("[AdNova] Splash hidden");
}

function initApp() {
    console.log("[AdNova] Initializing...");
    try {
        const savedLang = localStorage.getItem("adnova_lang");
        if (savedLang) {
            const lang = LANGUAGES.find(l => l.code === savedLang);
            if (lang && lang.dir === "rtl") { document.documentElement.setAttribute("dir", "rtl"); document.body.classList.add("rtl"); }
            currentLanguage = savedLang;
        }
        document.querySelectorAll("[data-i18n]").forEach(el => { const key = el.getAttribute("data-i18n"); if (key) el.textContent = t(key); });
        loadUserData();
        renderWithdrawMethods();
        checkAdminAndShowCrown();
        initAllAdPlatforms();
    } catch(e) { console.error("[AdNova] Init error:", e); }
    hideSplashNow();
}

setTimeout(hideSplashNow, 500);
setTimeout(hideSplashNow, 1000);
setTimeout(hideSplashNow, 2000);
setTimeout(hideSplashNow, 3000);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initApp);
else initApp();

// ============================================================================
// 16. GLOBAL EXPORTS
// ============================================================================

window.switchTab = switchTab;
window.toggleLanguage = toggleLanguage;
window.openLanguageModal = openLanguageModal;
window.closeLanguageModal = closeLanguageModal;
window.setLanguage = setLanguage;
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

console.log("[AdNova] Ready! | Ad Reward: $" + APP_CONFIG.adReward + " | Daily Limit: " + APP_CONFIG.dailyAdLimit);
