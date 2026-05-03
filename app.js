// ============================================================================
// ADNOVA NETWORK - FRONTEND v12.0 (النسخة النهائية الكاملة مع جميع التحديثات)
// ============================================================================
// منصة احترافية لمشاهدة الإعلانات وكسب المال الحقيقي
// جميع الميزات: إحالات، مهام متجددة، 14 طريقة سحب، لوحة مشرف، 10 لغات، TON Connect
// التحديثات الجديدة:
// - كرت تاريخ السحوبات في صفحة Ads
// - نافذة التحقق من البوتات (30 إحالة أو 0.01 TON) - تصميم فاتح/ذهبي
// - ترتيب الإشعارات (الأحدث أولاً)
// - أيقونات إيموجي لطرق الدفع (فقط للطرق التي لا تدعم FontAwesome)
// - تنسيق احترافي للمهام والإشعارات
// - إصلاح معاملات TON Connect مع عنوان المحفظة من الخادم
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

// متغير لتخزين بيانات السحب أثناء التحقق
let pendingWithdrawalData = null;

// عنوان محفظة TON الخاصة بالمنصة (يتم تعبئته من الخادم)
let PLATFORM_TON_WALLET = null;

let APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 1,
    requiredReferralsForVerify: 30,
    botUsername: "AdNovaNetworkBot",
    adminId: null,
    platformTonWallet: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. 💳 WITHDRAWAL METHODS (مع إضافة الإيموجي للطرق التي لا تدعمها FontAwesome)
// ═══════════════════════════════════════════════════════════════════════════

const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal", emoji: null, placeholder: "example@email.com", label: "PayPal Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "skrill", name: "Skrill", icon: null, emoji: "💳", placeholder: "example@email.com", label: "Skrill Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "payoneer", name: "Payoneer", icon: null, emoji: "🏦", placeholder: "example@email.com", label: "Payoneer Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin", emoji: null, placeholder: "0x...", label: "BSC Wallet Address", regex: /^0x[a-fA-F0-9]{40}$/ },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin", emoji: null, placeholder: "T...", label: "TRC20 Address", regex: /^T[a-zA-Z0-9]{33}$/ },
    { id: "ton", name: "TON", icon: "fab fa-telegram", emoji: null, placeholder: "EQ...", label: "TON Address", regex: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/ },
    { id: "binance_pay", name: "Binance Pay", icon: null, emoji: "🛡️", placeholder: "Binance ID", label: "Binance ID", regex: /^[a-zA-Z0-9]{5,20}$/ },
    { id: "sbp", name: "SBP (Russia)", icon: "fas fa-phone", emoji: null, placeholder: "+71234567890", label: "Phone +7", regex: /^\+7\d{10}$/ },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt", emoji: null, placeholder: "+1234567890", label: "Phone Number", regex: /^\+\d{10,15}$/ },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad", emoji: null, placeholder: "Player ID", label: "Player ID", regex: /^[a-zA-Z0-9]{5,20}$/ },
    { id: "freefire", name: "Free Fire", icon: null, emoji: "💎", placeholder: "Player ID", label: "Free Fire ID", regex: /^[a-zA-Z0-9]{5,20}$/ }
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. 🎬 AD PLATFORMS
// ═══════════════════════════════════════════════════════════════════════════

const AD_PLATFORMS = [
    { name: "Monetag", show: () => typeof show_10950362 === "function" ? show_10950362() : Promise.reject() },
    { name: "OnClickA", init: () => { if (typeof window.initCdTma === "function") { window.initCdTma({ id: '6118161' }).then(s => window.showOnClickaAd = s); } }, show: () => window.showOnClickaAd ? window.showOnClickaAd() : Promise.reject() },
    { name: "RichAds", init: () => { if (typeof TelegramAdsController !== "undefined") { window.richadsController = new TelegramAdsController(); window.richadsController.initialize({ pubId: "1009657", appId: "7284", debug: false }); } }, show: () => new Promise((resolve, reject) => { if (!window.richadsController) reject(); let tid = setTimeout(() => reject(), 15000); window.richadsController.triggerInterstitialVideo?.().then(() => { clearTimeout(tid); resolve(); }).catch(reject); }) },
    { name: "Adexium", init: () => { if (typeof AdexiumWidget !== "undefined") { window.adexiumWidget = new AdexiumWidget({ wid: '074d0b62-98c8-430a-8ad9-183693879f0d', adFormat: 'interstitial' }); } }, show: () => new Promise((resolve, reject) => { if (!window.adexiumWidget) reject(); let tid = setTimeout(() => reject(), 15000); window.adexiumWidget.on("adPlaybackCompleted", () => { clearTimeout(tid); resolve(); }); window.adexiumWidget.requestAd("interstitial"); }) },
    { name: "AdsGram", init: () => { if (typeof Adsgram !== "undefined") { window.AdsgramController = Adsgram.init({ blockId: "int-28433" }); } }, show: () => new Promise((resolve, reject) => { if (!window.AdsgramController) reject(); let tid = setTimeout(() => reject(), 15000); window.AdsgramController.show().then(() => { clearTimeout(tid); resolve(); }).catch(reject); }) }
];

function initAdPlatforms() {
    if (adPlatformsInitialized) return;
    AD_PLATFORMS.forEach(p => { if (p.init) try { p.init(); } catch(e) {} });
    adPlatformsInitialized = true;
}

async function showSingleAd() {
    const shuffled = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
        try { await p.show(); return true; } catch(e) {}
    }
    return false;
}

async function showAdSequence() {
    let successCount = 0;
    for (let i = 0; i < 2; i++) {
        const shown = await showSingleAd();
        if (shown) successCount++;
        if (!shown) break;
    }
    return successCount === 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🌍 TRANSLATION SYSTEM
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
        once: "Once"
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
        once: "مرة واحدة"
    },
    es: {
        appName: "AdNova Network",
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
        once: "Una vez"
    },
    fr: {
        appName: "AdNova Network",
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
        once: "Une fois"
    },
    ru: {
        appName: "AdNova Network",
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
        warningsTitle: "Уведомления",
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
        once: "Один раз"
    },
    pt: {
        appName: "AdNova Network",
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
        once: "Uma vez"
    },
    hi: {
        appName: "AdNova Network",
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
        once: "एक बार"
    },
    id: {
        appName: "AdNova Network",
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
        once: "Sekali"
    },
    tr: {
        appName: "AdNova Network",
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
        once: "Bir kere"
    },
    fa: {
        appName: "شبکه ادنوا",
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
        once: "یک بار"
    }
};

for (let lang of ["es", "fr", "ru", "pt", "hi", "id", "tr", "fa"]) {
    if (!translations[lang]) {
        translations[lang] = { ...translations.en };
    }
}

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
    
    await syncWithFirebase();
    updateUI();
    await loadTasksFromFirebase();
    checkAdminAndShowCrown();
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
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) {
        showToast(t("dailyLimitReached"), "warning");
        return;
    }
    
    adPlaying = true;
    const btn = document.getElementById("watchAdBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }
    
    showToast(t("loadingAd"), "info");
    initAdPlatforms();
    
    const success = await showAdSequence();
    
    if (success) {
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showEarnToast();
        showToast(t("adRewardAdded", { amount: APP_CONFIG.adReward.toFixed(2) }), "success");
        await fetch("/api/reward", {
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
        btn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn");
    }
}

function showEarnToast() {
    const toast = document.getElementById("earn-toast");
    if (!toast) return;
    const span = document.getElementById("earnToastAmount");
    if (span) span.textContent = `+ $${APP_CONFIG.adReward.toFixed(2)} Earned`;
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
        let icon = "fab fa-telegram";
        let actionText = "Join";
        
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
        }
        
        const identifier = task.username || task.link || task.identifier || "";
        html += `
            <div class="task-card ${isCompleted ? 'completed' : ''}">
                <div class="task-left">
                    <div class="task-icon"><i class="${icon}"></i></div>
                    <div class="task-info">
                        <h4>${escapeHtml(task.name)}</h4>
                        <p>${escapeHtml(identifier)}</p>
                    </div>
                </div>
                <div class="task-right">
                    <div class="task-reward">+$${task.reward.toFixed(2)}</div>
                    ${!isCompleted ? `<button class="task-btn" onclick="verifyTask('${task.id}', '${task.type}', '${escapeHtml(identifier)}', ${task.reward})">${actionText}</button>` : `<span class="task-completed-badge">✅ Completed</span>`}
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

// ═══════════════════════════════════════════════════════════════════════════
// 10. 💸 WITHDRAW SYSTEM (مع تعديل عرض الأيقونات ونظام التحقق)
// ═══════════════════════════════════════════════════════════════════════════

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

// دالة معالجة السحب الفعلية (منفصلة عن التحقق)
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

// دالة طلب السحب الرئيسية (مع التحقق من حالة المستخدم)
async function submitWithdraw() {
    const amount = parseFloat(document.getElementById("wdAmountInput")?.value);
    const destination = document.getElementById("wdDestInput")?.value.trim();
    
    if (!amount || amount < APP_CONFIG.minWithdraw) {
        showToast(`Minimum withdrawal is $${APP_CONFIG.minWithdraw}`, "warning");
        return;
    }
    if (amount > currentUser.balance) {
        showToast(t("insufficientBalance"), "warning");
        return;
    }
    if (!destination) {
        showToast("Please enter destination", "warning");
        return;
    }
    if (!validateDestination()) return;
    
    // التحقق من حالة التحقق
    if (currentUser.isVerified) {
        await processWithdrawal(amount, destination);
        return;
    }
    
    // لم يتم التحقق بعد - نعرض نافذة التحقق
    showToast("Verification required", "info");
    
    // جلب أحدث بيانات المستخدم من الخادم
    try {
        const userRes = await fetch(`/api/users/${currentUserId}`);
        const userData = await userRes.json();
        const currentInvites = userData.data?.inviteCount || currentUser.inviteCount || 0;
        showVerificationModal(currentInvites, APP_CONFIG.requiredReferralsForVerify, amount, destination);
    } catch(e) {
        console.error("Error fetching user data:", e);
        showVerificationModal(currentUser.inviteCount || 0, APP_CONFIG.requiredReferralsForVerify, amount, destination);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.5. 📜 WITHDRAWAL HISTORY (كرت تاريخ السحوبات الجديد)
// ═══════════════════════════════════════════════════════════════════════════

function renderWithdrawalHistory() {
    const container = document.getElementById("withdrawalHistoryList");
    const viewAllBtn = document.getElementById("viewAllWithdrawalsBtn");
    
    if (!container || !currentUser) return;
    
    const withdrawals = currentUser.withdrawals || [];
    
    if (withdrawals.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-receipt"></i>
                <span>No withdrawal requests yet</span>
            </div>
        `;
        if (viewAllBtn) viewAllBtn.style.display = "none";
        return;
    }
    
    // عرض آخر 3 سحوبات فقط
    const recentWithdrawals = withdrawals.slice(0, 3);
    let html = "";
    
    for (const wd of recentWithdrawals) {
        const status = wd.status || "pending";
        let statusIcon = "";
        let statusClass = "";
        
        if (status === "approved") {
            statusIcon = "✅";
            statusClass = "approved";
        } else if (status === "rejected") {
            statusIcon = "❌";
            statusClass = "rejected";
        } else {
            statusIcon = "⏳";
            statusClass = "pending";
        }
        
        const date = new Date(wd.date);
        const formattedDate = date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const methodName = getMethodName(wd.method);
        const methodIcon = getMethodIcon(wd.method);
        
        html += `
            <div class="withdrawal-item ${statusClass}">
                <div class="withdrawal-left">
                    <div class="withdrawal-status-icon">${statusIcon}</div>
                    <div class="withdrawal-info">
                        <div class="withdrawal-amount">$${wd.amount?.toFixed(2)}</div>
                        <div class="withdrawal-details">
                            <span class="withdrawal-method">
                                <i class="${methodIcon}"></i> ${methodName}
                            </span>
                            <span class="withdrawal-date">• ${formattedDate}</span>
                        </div>
                        ${wd.rejectReason ? `<div class="withdrawal-reason">❌ ${escapeHtml(wd.rejectReason)}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    if (viewAllBtn) {
        viewAllBtn.style.display = withdrawals.length > 3 ? "flex" : "none";
    }
}

function showAllWithdrawals() {
    const withdrawals = currentUser?.withdrawals || [];
    
    if (withdrawals.length === 0) {
        showToast("No withdrawal history", "info");
        return;
    }
    
    let modalHtml = `
        <div id="allWithdrawalsModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> All Withdrawals</h3>
                    <button class="close-btn" onclick="closeModal('allWithdrawalsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="withdrawal-history-list">
    `;
    
    for (const wd of withdrawals) {
        const status = wd.status || "pending";
        let statusIcon = "";
        let statusClass = "";
        
        if (status === "approved") {
            statusIcon = "✅";
            statusClass = "approved";
        } else if (status === "rejected") {
            statusIcon = "❌";
            statusClass = "rejected";
        } else {
            statusIcon = "⏳";
            statusClass = "pending";
        }
        
        const date = new Date(wd.date);
        const formattedDate = date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const methodName = getMethodName(wd.method);
        const methodIcon = getMethodIcon(wd.method);
        
        modalHtml += `
            <div class="withdrawal-item ${statusClass}">
                <div class="withdrawal-left">
                    <div class="withdrawal-status-icon">${statusIcon}</div>
                    <div class="withdrawal-info">
                        <div class="withdrawal-amount">$${wd.amount?.toFixed(2)}</div>
                        <div class="withdrawal-details">
                            <span class="withdrawal-method">
                                <i class="${methodIcon}"></i> ${methodName}
                            </span>
                            <span class="withdrawal-date">• ${formattedDate}</span>
                        </div>
                        ${wd.rejectReason ? `<div class="withdrawal-reason">❌ ${escapeHtml(wd.rejectReason)}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
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
// 10.6. 🔒 VERIFICATION MODAL (نافذة التحقق من البوتات - تصميم فاتح/ذهبي)
// ══════════════════════════════════════════════════════════════════════════

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
                <p>To withdraw funds, you must verify your account. Choose one method below:</p>
                
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
    
    // التحقق من وجود عنوان محفظة المنصة
    if (!PLATFORM_TON_WALLET) {
        showToast("Platform wallet not configured. Please contact support.", "error");
        console.error("PLATFORM_TON_WALLET is not set");
        return;
    }
    
    // التحقق من وجود محفظة متصلة
    if (!tonConnected || !tonWalletAddress) {
        showToast("Please connect your TON wallet first", "info");
        await connectTONWallet();
        // بعد محاولة الاتصال، نتحقق مرة أخرى
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
            amount: "10000000" // 0.01 TON = 10,000,000 nanoTON
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
            closeModal('verificationModal');
            
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
// 14. 🔔 NOTIFICATIONS SYSTEM (مع ترتيب الإشعارات - الأحدث أولاً)
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
    
    // عكس الترتيب: الأحدث أولاً
    const sortedNotifs = [...notifs].reverse();
    
    if (sortedNotifs.length === 0) {
        container.innerHTML = '<div class="empty-state">No notifications</div>';
        return;
    }
    
    let html = "";
    for (const n of sortedNotifs) {
        const date = new Date(n.timestamp);
        let iconClass = "info";
        if (n.type === "success") iconClass = "success";
        else if (n.type === "error") iconClass = "error";
        else if (n.type === "warning") iconClass = "warning";
        else if (n.type === "withdraw") iconClass = "withdraw";
        else if (n.type === "referral") iconClass = "referral";
        
        html += `
            <div class="notification-item ${n.read ? "" : "unread"}" onclick="markNotificationRead('${n.id}')">
                <div class="notification-icon ${iconClass}">
                    <i class="fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-times-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'withdraw' ? 'fa-money-bill-wave' : n.type === 'referral' ? 'fa-user-plus' : 'fa-bell'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(n.title)}</div>
                    <div class="notification-message">${escapeHtml(n.message)}</div>
                    <div class="notification-time"><i class="far fa-clock"></i> ${date.toLocaleString()}</div>
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

// ═══════════════════════════════════════════════════════════════════════════
// 16. 🎨 UI UPDATES (مع إضافة كرت تاريخ السحوبات وتحسين صورة المستخدم)
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
    
    // تحسين عرض صورة المستخدم
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
    
    // عرض كرت تاريخ السحوبات
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
// 18. 🚀 INITIALIZATION
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

setTimeout(hideSplash, 3000);
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

// ═══════════════════════════════════════════════════════════════════════════
// 19. 🌐 GLOBAL EXPORTS
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

// تصدير الدوال الجديدة
window.showAllWithdrawals = showAllWithdrawals;
window.verifyByReferrals = verifyByReferrals;
window.showReferralInvite = showReferralInvite;
window.startTonVerification = startTonVerification;

console.log("[AdNova] Platform ready | Ad Reward: $" + APP_CONFIG.adReward);
console.log("[AdNova] Features: Referrals | Withdrawal Methods | Dynamic Tasks | Admin Panel | 10 Languages | TON Connect");
console.log("[AdNova] Task Types: channel, bot, youtube, tiktok, twitter");
console.log("[AdNova] New Features: Withdrawal History | Bot Verification | Notification Sort | Method Emojis | Fixed TON Verification");

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
