// ============================================================================
// ADNOVA NETWORK - COMPLETE FRONTEND v7.0
// جميع الميزات - بدون مفاتيح حساسة (تُجلب من الخادم)
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

// إعدادات التطبيق (ستُجلب من الخادم)
let APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkbot"
};

// ============================================================================
// 3. LANGUAGES LIST (لنافذة اختيار اللغة)
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
// 4. TRANSLATIONS (10 لغات كاملة)
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
        joinChannelsDesc: "Earn $0.05 per channel",
        startBots: "Start Bots",
        startBotsDesc: "Earn $0.05 per bot",
        progress: "Progress",
        joinBtn: "Join",
        startBtn: "Start",
        inviteAndEarn: "Invite & Earn",
        inviteHeroSub: "Copy and share your invite link to earn more",
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
        adminAuthDesc: "Enter admin password",
        verify: "Verify",
        loadingAd: "Loading ad...",
        adRewardAdded: "+$${amount} added!",
        dailyLimitReached: "Daily limit reached! Come back tomorrow",
        adError: "Error loading ad",
        linkCopied: "Link copied!",
        channelReward: "+$0.05 added!",
        taskError: "Please join first",
        minWithdraw: "Minimum withdrawal is $10",
        exceedsBalance: "Amount exceeds your balance",
        needInvites: "Need 10 invites to withdraw",
        withdrawSuccess: "Withdrawal request submitted!",
        insufficientBalance: "Insufficient balance",
        chooseLanguage: "Choose your language",
        welcome: "Welcome",
        close: "Close",
        confirm: "Confirm",
        cancel: "Cancel",
        processing: "Processing...",
        success: "Success!",
        error: "Error!",
        warning: "Warning!"
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
        joinChannelsDesc: "اربح $0.05 لكل قناة",
        startBots: "تشغيل البوتات",
        startBotsDesc: "اربح $0.05 لكل بوت",
        progress: "التقدم",
        joinBtn: "انضمام",
        startBtn: "تشغيل",
        inviteAndEarn: "ادع واكسب",
        inviteHeroSub: "انسخ رابط دعوتك وشاركه لتكسب أكثر",
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
        adminAuthDesc: "أدخل كلمة مرور المشرف",
        verify: "تحقق",
        loadingAd: "جاري تحميل الإعلان...",
        adRewardAdded: "+$${amount} أضيفت!",
        dailyLimitReached: "تم الوصول للحد اليومي! عد غداً",
        adError: "خطأ في تحميل الإعلان",
        linkCopied: "تم نسخ الرابط!",
        channelReward: "+$0.05 أضيفت!",
        taskError: "يرجى الانضمام أولاً",
        minWithdraw: "الحد الأدنى للسحب هو $10",
        exceedsBalance: "المبلغ يتجاوز رصيدك",
        needInvites: "تحتاج 10 دعوات للسحب",
        withdrawSuccess: "تم إرسال طلب السحب!",
        insufficientBalance: "رصيد غير كافٍ",
        chooseLanguage: "اختر لغتك المفضلة",
        welcome: "مرحباً",
        close: "إغلاق",
        confirm: "تأكيد",
        cancel: "إلغاء",
        processing: "جاري المعالجة...",
        success: "تم بنجاح!",
        error: "خطأ!",
        warning: "تحذير!"
    },
    es: {
        appName: "AdNova Network",
        totalBalance: "Saldo Total",
        availableToWithdraw: "Disponible para retirar",
        watchAds: "Ver Anuncios",
        completeTasks: "Completar Tareas",
        inviteFriends: "Invitar Amigos",
        watchAndEarn: "Mira Anuncios y Gana",
        watchAdBtn: "Ver Anuncio",
        watchAdBtnSub: "Completa el video para ganar al instante",
        readyToEarn: "Listo para ganar",
        totalWatched: "Total Visto",
        adsUnit: "anuncios",
        totalEarned: "Total Ganado",
        taskHeaderTitle: "Completa tareas y gana recompensas",
        joinChannels: "Unirse a Canales",
        joinChannelsDesc: "Gana $0.05 por canal",
        startBots: "Iniciar Bots",
        startBotsDesc: "Gana $0.05 por bot",
        progress: "Progreso",
        joinBtn: "Unirse",
        startBtn: "Iniciar",
        inviteAndEarn: "Invita y Gana",
        inviteHeroSub: "Copia y comparte tu enlace de invitación",
        yourInviteLink: "Tu Enlace de Invitación",
        copy: "Copiar",
        shareWithFriends: "Compartir con Amigos",
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
        clearRead: "Borrar Leídas",
        clearAll: "Borrar Todo",
        adminAuthTitle: "Autenticación Admin",
        adminAuthDesc: "Ingresa la contraseña de admin",
        verify: "Verificar",
        loadingAd: "Cargando anuncio...",
        adRewardAdded: "+$${amount} añadido!",
        dailyLimitReached: "Límite diario alcanzado",
        adError: "Error al cargar anuncio",
        linkCopied: "¡Enlace copiado!",
        channelReward: "+$0.05 añadido!",
        taskError: "Por favor únete primero",
        minWithdraw: "El retiro mínimo es $10",
        exceedsBalance: "El monto excede tu saldo",
        needInvites: "Necesitas 10 invitaciones",
        withdrawSuccess: "¡Solicitud enviada!",
        insufficientBalance: "Saldo insuficiente",
        chooseLanguage: "Elige tu idioma",
        welcome: "Bienvenido",
        close: "Cerrar",
        confirm: "Confirmar",
        cancel: "Cancelar",
        processing: "Procesando...",
        success: "¡Éxito!",
        error: "¡Error!",
        warning: "¡Advertencia!"
    },
    fr: {
        appName: "AdNova Network",
        totalBalance: "Solde Total",
        availableToWithdraw: "Disponible au retrait",
        watchAds: "Voir les Annonces",
        completeTasks: "Compléter les Tâches",
        inviteFriends: "Inviter des Amis",
        watchAndEarn: "Regardez et Gagnez",
        watchAdBtn: "Voir l'Annonce",
        watchAdBtnSub: "Regardez la vidéo jusqu'au bout",
        readyToEarn: "Prêt à gagner",
        totalWatched: "Total Vu",
        adsUnit: "annonces",
        totalEarned: "Total Gagné",
        taskHeaderTitle: "Complétez des tâches et gagnez",
        joinChannels: "Rejoindre les Chaînes",
        joinChannelsDesc: "Gagnez $0.05 par chaîne",
        startBots: "Démarrer les Bots",
        startBotsDesc: "Gagnez $0.05 par bot",
        progress: "Progrès",
        joinBtn: "Rejoindre",
        startBtn: "Démarrer",
        inviteAndEarn: "Invitez et Gagnez",
        inviteHeroSub: "Copiez et partagez votre lien",
        yourInviteLink: "Votre Lien d'Invitation",
        copy: "Copier",
        shareWithFriends: "Partager avec des Amis",
        friendsInvited: "Amis Invités",
        earnedFromInvites: "Gagné par Invitations",
        paymentMethod: "Mode de Paiement",
        amount: "Montant",
        availableBalance: "Solde disponible:",
        submitWithdrawal: "Soumettre la Demande",
        navAds: "Annonces",
        navTasks: "Tâches",
        navInvite: "Inviter",
        navWithdraw: "Retirer",
        notificationsTitle: "Notifications",
        clearRead: "Effacer Lus",
        clearAll: "Tout Effacer",
        adminAuthTitle: "Authentification Admin",
        adminAuthDesc: "Entrez le mot de passe admin",
        verify: "Vérifier",
        loadingAd: "Chargement de l'annonce...",
        adRewardAdded: "+$${amount} ajouté!",
        dailyLimitReached: "Limite quotidienne atteinte",
        adError: "Erreur de chargement",
        linkCopied: "Lien copié!",
        channelReward: "+$0.05 ajouté!",
        taskError: "Veuillez d'abord rejoindre",
        minWithdraw: "Le retrait minimum est $10",
        exceedsBalance: "Montant dépasse votre solde",
        needInvites: "Besoin de 10 invitations",
        withdrawSuccess: "Demande soumise!",
        insufficientBalance: "Solde insuffisant",
        chooseLanguage: "Choisissez votre langue",
        welcome: "Bienvenue",
        close: "Fermer",
        confirm: "Confirmer",
        cancel: "Annuler",
        processing: "Traitement...",
        success: "Succès!",
        error: "Erreur!",
        warning: "Attention!"
    },
    ru: {
        appName: "AdNova Network",
        totalBalance: "Общий Баланс",
        availableToWithdraw: "Доступно для вывода",
        watchAds: "Смотреть Рекламу",
        completeTasks: "Выполнить Задания",
        inviteFriends: "Пригласить Друзей",
        watchAndEarn: "Смотри и Зарабатывай",
        watchAdBtn: "Смотреть Рекламу",
        watchAdBtnSub: "Досмотрите видео до конца",
        readyToEarn: "Готов к заработку",
        totalWatched: "Всего Просмотрено",
        adsUnit: "реклам",
        totalEarned: "Всего Заработано",
        taskHeaderTitle: "Выполняйте задания и получайте награды",
        joinChannels: "Вступить в Каналы",
        joinChannelsDesc: "Заработайте $0.05 за канал",
        startBots: "Запустить Ботов",
        startBotsDesc: "Заработайте $0.05 за бота",
        progress: "Прогресс",
        joinBtn: "Вступить",
        startBtn: "Запустить",
        inviteAndEarn: "Приглашай и Зарабатывай",
        inviteHeroSub: "Скопируйте и поделитесь ссылкой",
        yourInviteLink: "Ваша Реферальная Ссылка",
        copy: "Копировать",
        shareWithFriends: "Поделиться с Друзьями",
        friendsInvited: "Приглашено Друзей",
        earnedFromInvites: "Заработано с Приглашений",
        paymentMethod: "Способ Оплаты",
        amount: "Сумма",
        availableBalance: "Доступный баланс:",
        submitWithdrawal: "Отправить Заявку",
        navAds: "Реклама",
        navTasks: "Задания",
        navInvite: "Пригласить",
        navWithdraw: "Вывод",
        notificationsTitle: "Уведомления",
        clearRead: "Очистить Прочитанные",
        clearAll: "Очистить Все",
        adminAuthTitle: "Авторизация Админа",
        adminAuthDesc: "Введите пароль администратора",
        verify: "Подтвердить",
        loadingAd: "Загрузка рекламы...",
        adRewardAdded: "+$${amount} добавлено!",
        dailyLimitReached: "Дневной лимит достигнут",
        adError: "Ошибка загрузки рекламы",
        linkCopied: "Ссылка скопирована!",
        channelReward: "+$0.05 добавлено!",
        taskError: "Пожалуйста, вступите сначала",
        minWithdraw: "Минимальный вывод $10",
        exceedsBalance: "Сумма превышает баланс",
        needInvites: "Нужно 10 приглашений",
        withdrawSuccess: "Заявка отправлена!",
        insufficientBalance: "Недостаточно средств",
        chooseLanguage: "Выберите язык",
        welcome: "Добро пожаловать",
        close: "Закрыть",
        confirm: "Подтвердить",
        cancel: "Отмена",
        processing: "Обработка...",
        success: "Успех!",
        error: "Ошибка!",
        warning: "Внимание!"
    },
    pt: {
        appName: "AdNova Network",
        totalBalance: "Saldo Total",
        availableToWithdraw: "Disponível para saque",
        watchAds: "Ver Anúncios",
        completeTasks: "Completar Tarefas",
        inviteFriends: "Convidar Amigos",
        watchAndEarn: "Assista e Ganhe",
        watchAdBtn: "Ver Anúncio",
        watchAdBtnSub: "Assista o vídeo completo",
        readyToEarn: "Pronto para ganhar",
        totalWatched: "Total Assistido",
        adsUnit: "anúncios",
        totalEarned: "Total Ganho",
        taskHeaderTitle: "Complete tarefas e ganhe recompensas",
        joinChannels: "Entrar nos Canais",
        joinChannelsDesc: "Ganhe $0.05 por canal",
        startBots: "Iniciar Bots",
        startBotsDesc: "Ganhe $0.05 por bot",
        progress: "Progresso",
        joinBtn: "Entrar",
        startBtn: "Iniciar",
        inviteAndEarn: "Convide e Ganhe",
        inviteHeroSub: "Copie e compartilhe seu link",
        yourInviteLink: "Seu Link de Convite",
        copy: "Copiar",
        shareWithFriends: "Compartilhar com Amigos",
        friendsInvited: "Amigos Convidados",
        earnedFromInvites: "Ganho de Convites",
        paymentMethod: "Método de Pagamento",
        amount: "Valor",
        availableBalance: "Saldo disponível:",
        submitWithdrawal: "Enviar Solicitação",
        navAds: "Anúncios",
        navTasks: "Tarefas",
        navInvite: "Convidar",
        navWithdraw: "Sacar",
        notificationsTitle: "Notificações",
        clearRead: "Limpar Lidos",
        clearAll: "Limpar Tudo",
        adminAuthTitle: "Autenticação Admin",
        adminAuthDesc: "Digite a senha de admin",
        verify: "Verificar",
        loadingAd: "Carregando anúncio...",
        adRewardAdded: "+$${amount} adicionado!",
        dailyLimitReached: "Limite diário atingido",
        adError: "Erro ao carregar anúncio",
        linkCopied: "Link copiado!",
        channelReward: "+$0.05 adicionado!",
        taskError: "Por favor, entre primeiro",
        minWithdraw: "O saque mínimo é $10",
        exceedsBalance: "Valor excede seu saldo",
        needInvites: "Precisa de 10 convites",
        withdrawSuccess: "Solicitação enviada!",
        insufficientBalance: "Saldo insuficiente",
        chooseLanguage: "Escolha seu idioma",
        welcome: "Bem-vindo",
        close: "Fechar",
        confirm: "Confirmar",
        cancel: "Cancelar",
        processing: "Processando...",
        success: "Sucesso!",
        error: "Erro!",
        warning: "Atenção!"
    },
    hi: {
        appName: "एडनोवा नेटवर्क",
        totalBalance: "कुल शेष राशि",
        availableToWithdraw: "निकासी के लिए उपलब्ध",
        watchAds: "विज्ञापन देखें",
        completeTasks: "कार्य पूरे करें",
        inviteFriends: "दोस्तों को आमंत्रित करें",
        watchAndEarn: "देखें और कमाएं",
        watchAdBtn: "विज्ञापन देखें",
        watchAdBtnSub: "वीडियो पूरा देखें",
        readyToEarn: "कमाने के लिए तैयार",
        totalWatched: "कुल देखे गए",
        adsUnit: "विज्ञापन",
        totalEarned: "कुल कमाई",
        taskHeaderTitle: "कार्य पूरे करें और पुरस्कार पाएं",
        joinChannels: "चैनल ज्वाइन करें",
        joinChannelsDesc: "प्रति चैनल $0.05 कमाएं",
        startBots: "बॉट शुरू करें",
        startBotsDesc: "प्रति बॉट $0.05 कमाएं",
        progress: "प्रगति",
        joinBtn: "ज्वाइन करें",
        startBtn: "शुरू करें",
        inviteAndEarn: "आमंत्रित करें और कमाएं",
        inviteHeroSub: "अपना लिंक कॉपी और शेयर करें",
        yourInviteLink: "आपका आमंत्रण लिंक",
        copy: "कॉपी करें",
        shareWithFriends: "दोस्तों के साथ शेयर करें",
        friendsInvited: "आमंत्रित मित्र",
        earnedFromInvites: "आमंत्रण से कमाई",
        paymentMethod: "भुगतान विधि",
        amount: "राशि",
        availableBalance: "उपलब्ध शेष:",
        submitWithdrawal: "निकासी अनुरोध भेजें",
        navAds: "विज्ञापन",
        navTasks: "कार्य",
        navInvite: "आमंत्रित",
        navWithdraw: "निकासी",
        notificationsTitle: "सूचनाएँ",
        clearRead: "पढ़ी हुई साफ़ करें",
        clearAll: "सभी साफ़ करें",
        adminAuthTitle: "व्यवस्थापक प्रमाणीकरण",
        adminAuthDesc: "व्यवस्थापक पासवर्ड दर्ज करें",
        verify: "सत्यापित करें",
        loadingAd: "विज्ञापन लोड हो रहा है...",
        adRewardAdded: "+$${amount} जोड़ा गया!",
        dailyLimitReached: "दैनिक सीमा समाप्त",
        adError: "विज्ञापन लोड करने में त्रुटि",
        linkCopied: "लिंक कॉपी हो गया!",
        channelReward: "+$0.05 जोड़ा गया!",
        taskError: "पहले ज्वाइन करें",
        minWithdraw: "न्यूनतम निकासी $10 है",
        exceedsBalance: "राशि आपके शेष से अधिक है",
        needInvites: "10 आमंत्रण की आवश्यकता",
        withdrawSuccess: "निकासी अनुरोध भेजा गया!",
        insufficientBalance: "अपर्याप्त शेष राशि",
        chooseLanguage: "अपनी भाषा चुनें",
        welcome: "स्वागत है",
        close: "बंद करें",
        confirm: "पुष्टि करें",
        cancel: "रद्द करें",
        processing: "प्रोसेसिंग...",
        success: "सफल!",
        error: "त्रुटि!",
        warning: "चेतावनी!"
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
        watchAdBtnSub: "Tonton video sampai selesai",
        readyToEarn: "Siap menghasilkan",
        totalWatched: "Total Ditonton",
        adsUnit: "iklan",
        totalEarned: "Total Pendapatan",
        taskHeaderTitle: "Selesaikan tugas & dapatkan hadiah",
        joinChannels: "Bergabung dengan Saluran",
        joinChannelsDesc: "Dapatkan $0.05 per saluran",
        startBots: "Mulai Bot",
        startBotsDesc: "Dapatkan $0.05 per bot",
        progress: "Kemajuan",
        joinBtn: "Bergabung",
        startBtn: "Mulai",
        inviteAndEarn: "Undang & Dapatkan",
        inviteHeroSub: "Salin dan bagikan tautan undangan Anda",
        yourInviteLink: "Tautan Undangan Anda",
        copy: "Salin",
        shareWithFriends: "Bagikan ke Teman",
        friendsInvited: "Teman Diundang",
        earnedFromInvites: "Pendapatan dari Undangan",
        paymentMethod: "Metode Pembayaran",
        amount: "Jumlah",
        availableBalance: "Saldo tersedia:",
        submitWithdrawal: "Kirim Permintaan",
        navAds: "Iklan",
        navTasks: "Tugas",
        navInvite: "Undang",
        navWithdraw: "Tarik",
        notificationsTitle: "Notifikasi",
        clearRead: "Hapus yang Dibaca",
        clearAll: "Hapus Semua",
        adminAuthTitle: "Otentikasi Admin",
        adminAuthDesc: "Masukkan kata sandi admin",
        verify: "Verifikasi",
        loadingAd: "Memuat iklan...",
        adRewardAdded: "+$${amount} ditambahkan!",
        dailyLimitReached: "Batas harian tercapai",
        adError: "Gagal memuat iklan",
        linkCopied: "Tautan disalin!",
        channelReward: "+$0.05 ditambahkan!",
        taskError: "Silakan bergabung dulu",
        minWithdraw: "Penarikan minimum $10",
        exceedsBalance: "Jumlah melebihi saldo",
        needInvites: "Butuh 10 undangan",
        withdrawSuccess: "Permintaan penarikan dikirim!",
        insufficientBalance: "Saldo tidak mencukupi",
        chooseLanguage: "Pilih bahasa Anda",
        welcome: "Selamat datang",
        close: "Tutup",
        confirm: "Konfirmasi",
        cancel: "Batal",
        processing: "Memproses...",
        success: "Berhasil!",
        error: "Kesalahan!",
        warning: "Peringatan!"
    },
    tr: {
        appName: "AdNova Network",
        totalBalance: "Toplam Bakiye",
        availableToWithdraw: "Çekilebilir Bakiye",
        watchAds: "Reklam İzle",
        completeTasks: "Görevleri Tamamla",
        inviteFriends: "Arkadaşları Davet Et",
        watchAndEarn: "İzle ve Kazan",
        watchAdBtn: "Reklam İzle",
        watchAdBtnSub: "Videoyu sonuna kadar izle",
        readyToEarn: "Kazanmaya hazır",
        totalWatched: "Toplam İzlenen",
        adsUnit: "reklam",
        totalEarned: "Toplam Kazanılan",
        taskHeaderTitle: "Görevleri tamamla ve ödül kazan",
        joinChannels: "Kanallara Katıl",
        joinChannelsDesc: "Kanal başına $0.05 kazan",
        startBots: "Botları Başlat",
        startBotsDesc: "Bot başına $0.05 kazan",
        progress: "İlerleme",
        joinBtn: "Katıl",
        startBtn: "Başlat",
        inviteAndEarn: "Davet Et ve Kazan",
        inviteHeroSub: "Davet bağlantını kopyala ve paylaş",
        yourInviteLink: "Davet Bağlantın",
        copy: "Kopyala",
        shareWithFriends: "Arkadaşlarla Paylaş",
        friendsInvited: "Davet Edilen Arkadaşlar",
        earnedFromInvites: "Davetlerden Kazanılan",
        paymentMethod: "Ödeme Yöntemi",
        amount: "Tutar",
        availableBalance: "Mevcut bakiye:",
        submitWithdrawal: "Çekim Talebi Gönder",
        navAds: "Reklamlar",
        navTasks: "Görevler",
        navInvite: "Davet",
        navWithdraw: "Çek",
        notificationsTitle: "Bildirimler",
        clearRead: "Okunanları Temizle",
        clearAll: "Hepsini Temizle",
        adminAuthTitle: "Admin Yetkilendirmesi",
        adminAuthDesc: "Admin şifresini girin",
        verify: "Doğrula",
        loadingAd: "Reklam yükleniyor...",
        adRewardAdded: "+$${amount} eklendi!",
        dailyLimitReached: "Günlük limit aşıldı",
        adError: "Reklam yüklenirken hata",
        linkCopied: "Bağlantı kopyalandı!",
        channelReward: "+$0.05 eklendi!",
        taskError: "Lütfen önce katılın",
        minWithdraw: "Minimum çekim $10",
        exceedsBalance: "Tutar bakiyenizi aşıyor",
        needInvites: "10 davete ihtiyaç var",
        withdrawSuccess: "Çekim talebi gönderildi!",
        insufficientBalance: "Yetersiz bakiye",
        chooseLanguage: "Dil seçin",
        welcome: "Hoş geldiniz",
        close: "Kapat",
        confirm: "Onayla",
        cancel: "İptal",
        processing: "İşleniyor...",
        success: "Başarılı!",
        error: "Hata!",
        warning: "Uyarı!"
    },
    fa: {
        appName: "شبکه ادنوا",
        totalBalance: "موجودی کل",
        availableToWithdraw: "قابل برداشت",
        watchAds: "تماشای تبلیغات",
        completeTasks: "انجام وظایف",
        inviteFriends: "دعوت دوستان",
        watchAndEarn: "تماشا کن و درآمد کسب کن",
        watchAdBtn: "تماشای تبلیغ",
        watchAdBtnSub: "ویدیو را کامل ببینید",
        readyToEarn: "آماده کسب درآمد",
        totalWatched: "کل تماشا شده",
        adsUnit: "تبلیغ",
        totalEarned: "کل درآمد",
        taskHeaderTitle: "وظایف را کامل کنید و پاداش بگیرید",
        joinChannels: "عضویت در کانال‌ها",
        joinChannelsDesc: "به ازای هر کانال $0.05 دریافت کنید",
        startBots: "شروع ربات‌ها",
        startBotsDesc: "به ازای هر ربات $0.05 دریافت کنید",
        progress: "پیشرفت",
        joinBtn: "عضویت",
        startBtn: "شروع",
        inviteAndEarn: "دعوت کن و درآمد کسب کن",
        inviteHeroSub: "لینک دعوت خود را کپی و به اشتراک بگذارید",
        yourInviteLink: "لینک دعوت شما",
        copy: "کپی",
        shareWithFriends: "اشتراک‌گذاری با دوستان",
        friendsInvited: "دوستان دعوت شده",
        earnedFromInvites: "درآمد از دعوت‌ها",
        paymentMethod: "روش پرداخت",
        amount: "مبلغ",
        availableBalance: "موجودی موجود:",
        submitWithdrawal: "ارسال درخواست برداشت",
        navAds: "تبلیغات",
        navTasks: "وظایف",
        navInvite: "دعوت",
        navWithdraw: "برداشت",
        notificationsTitle: "اعلان‌ها",
        clearRead: "حذف خوانده‌ها",
        clearAll: "حذف همه",
        adminAuthTitle: "احراز هویت مدیر",
        adminAuthDesc: "رمز عبور مدیر را وارد کنید",
        verify: "تأیید",
        loadingAd: "در حال بارگذاری تبلیغ...",
        adRewardAdded: "+$${amount} اضافه شد!",
        dailyLimitReached: "حد مجاز روزانه تکمیل شد",
        adError: "خطا در بارگذاری تبلیغ",
        linkCopied: "لینک کپی شد!",
        channelReward: "+$0.05 اضافه شد!",
        taskError: "لطفاً ابتدا عضو شوید",
        minWithdraw: "حداقل برداشت $10 است",
        exceedsBalance: "مبلغ از موجودی شما بیشتر است",
        needInvites: "به 10 دعوت نیاز دارید",
        withdrawSuccess: "درخواست برداشت ارسال شد!",
        insufficientBalance: "موجودی ناکافی",
        chooseLanguage: "زبان خود را انتخاب کنید",
        welcome: "خوش آمدید",
        close: "بستن",
        confirm: "تأیید",
        cancel: "انصراف",
        processing: "در حال پردازش...",
        success: "موفق!",
        error: "خطا!",
        warning: "هشدار!"
    }
};

// دالة الترجمة
function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(p => {
        text = text.replace(`\${${p}}`, params[p]);
    });
    return text;
}

// نافذة اختيار اللغة
let langModalOpen = false;

function openLanguageModal() {
    const modal = document.getElementById("langModal");
    if (!modal) return;
    
    const grid = document.getElementById("langOptionsGrid");
    if (!grid) return;
    
    grid.innerHTML = LANGUAGES.map(lang => `
        <div class="lang-option ${currentLanguage === lang.code ? "active" : ""}" 
             data-lang="${lang.code}"
             onclick="setLanguage('${lang.code}')">
            <div class="lang-option-flag">${lang.flag}</div>
            <div class="lang-option-body">
                <div class="lang-option-name">${lang.name}</div>
                <div class="lang-option-native">${lang.nativeName}</div>
            </div>
            <div class="lang-option-radio"><div class="lang-option-radio-inner"></div></div>
        </div>
    `).join("");
    
    modal.classList.add("open");
    langModalOpen = true;
}

function closeLanguageModal() {
    const modal = document.getElementById("langModal");
    if (modal) {
        modal.classList.remove("open");
        langModalOpen = false;
    }
}

function setLanguage(langCode) {
    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;
    
    currentLanguage = langCode;
    localStorage.setItem("adnova_lang", currentLanguage);
    
    // تطبيق RTL للعربية والفارسية
    const html = document.documentElement;
    if (lang.dir === "rtl") {
        html.setAttribute("dir", "rtl");
        document.body.classList.add("rtl");
    } else {
        html.setAttribute("dir", "ltr");
        document.body.classList.remove("rtl");
    }
    
    // تحديث جميع النصوص
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) el.textContent = t(key);
    });
    
    // تحديث اسم التطبيق
    const splashTitle = document.querySelector(".splash-sub span:not(.splash-deco)");
    if (splashTitle) splashTitle.textContent = t("appName");
    document.title = t("appName") + " - Earn Real Money";
    
    // تحديث الزر
    const langBtn = document.getElementById("langBtnLabel");
    if (langBtn) langBtn.textContent = lang.name;
    
    // تحديث الصفحة الحالية
    refreshCurrentPage();
    
    closeLanguageModal();
    showToast(t("success"), "success");
}

// ============================================================================
// 5. AD PLATFORMS (4 منصات)
// ============================================================================

function initAllAdPlatforms() {
    if (adPlatformsInitialized) return;
    
    // Monetag
    if (typeof show_10950362 !== 'undefined') {
        console.log("[AdNova] Monetag ready");
    }
    
    // OnClickA
    if (typeof window.initCdTma === 'function') {
        window.initCdTma({ id: '6118161' }).then(show => {
            window.showOnClickaAd = show;
        }).catch(e => console.error("[AdNova] OnClickA error:", e));
    }
    
    // RichAds
    if (typeof TelegramAdsController !== 'undefined') {
        window.richadsController = new TelegramAdsController();
        window.richadsController.initialize({ pubId: "1009657", appId: "7284", debug: false });
    }
    
    // Adexium
    if (typeof AdexiumWidget !== 'undefined') {
        window.adexiumWidget = new AdexiumWidget({
            wid: '074d0b62-98c8-430a-8ad9-183693879f0d',
            adFormat: 'interstitial'
        });
    }
    
    adPlatformsInitialized = true;
    console.log("[AdNova] All ad platforms initialized");
}

// عرض إعلان
async function showAdFromAnyPlatform() {
    const platforms = [
        { name: "Monetag", show: () => show_10950362?.() },
        { name: "OnClickA", show: () => window.showOnClickaAd?.() },
        { name: "RichAds", show: () => showRichAdsAd() },
        { name: "Adexium", show: () => showAdexiumAd() }
    ];
    
    const shuffled = [...platforms].sort(() => Math.random() - 0.5);
    
    for (const platform of shuffled) {
        try {
            if (!platform.show) continue;
            await platform.show();
            return true;
        } catch (error) {
            console.error(`[AdNova] ${platform.name} failed:`, error);
        }
    }
    return false;
}

function showRichAdsAd() {
    return new Promise((resolve, reject) => {
        if (!window.richadsController) {
            reject("RichAds not ready");
            return;
        }
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) reject("Timeout");
        }, 15000);
        const onSuccess = () => {
            if (!resolved) { resolved = true; clearTimeout(timeout); resolve(); }
        };
        const onError = (err) => {
            if (!resolved) { clearTimeout(timeout); reject(err); }
        };
        if (typeof window.richadsController.triggerInterstitialVideo === 'function') {
            window.richadsController.triggerInterstitialVideo().then(onSuccess).catch(onError);
        } else {
            reject("No show method");
        }
    });
}

function showAdexiumAd() {
    return new Promise((resolve, reject) => {
        if (!window.adexiumWidget) {
            reject("Adexium not ready");
            return;
        }
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) reject("Timeout");
        }, 15000);
        window.adexiumWidget.on("adPlaybackCompleted", () => {
            if (!resolved) { resolved = true; clearTimeout(timeout); resolve(); }
        });
        window.adexiumWidget.on("adClosed", () => {
            if (!resolved) { clearTimeout(timeout); reject("Ad closed"); }
        });
        window.adexiumWidget.on("noAdFound", () => {
            if (!resolved) { clearTimeout(timeout); reject("No ad"); }
        });
        window.adexiumWidget.requestAd("interstitial");
    });
}

// ============================================================================
// 6. LOCAL STORAGE MANAGEMENT
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
            balance: 0,
            totalEarned: 0,
            adsWatched: 0,
            adsToday: 0,
            lastAdDate: today,
            inviteCount: 0,
            referredBy: null,
            referrals: [],
            withdrawals: [],
            notifications: [],
            withdrawBlocked: false
        };
        saveUserData();
        processReferralFromUrl();
    }
    
    const today = new Date().toISOString().split("T")[0];
    if (currentUser.lastAdDate !== today) {
        currentUser.adsToday = 0;
        currentUser.lastAdDate = today;
        saveUserData();
    }
    
    updateUI();
    loadTasksProgress();
    
    // جلب الإعدادات من الخادم
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            if (data) {
                APP_CONFIG = { ...APP_CONFIG, ...data };
                updateUI();
            }
        })
        .catch(e => console.error("[AdNova] Config error:", e));
    
    return currentUser;
}

function saveUserData() {
    localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser));
}

// ============================================================================
// 7. REFERRAL SYSTEM (startapp مرتين)
// ============================================================================

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get("startapp");
    if (!ref && tg?.initDataUnsafe?.start_param) {
        ref = tg.initDataUnsafe.start_param;
    }
    if (!ref) ref = urlParams.get("ref");
    return ref;
}

function processReferralFromUrl() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrerId: refCode, newUserId: currentUserId, newUserName: currentUser.userName })
    }).catch(e => console.error("[AdNova] Referral error:", e));
    
    currentUser.referredBy = refCode;
    localStorage.setItem(processedKey, refCode);
    saveUserData();
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
    const text = `Join AdNova Network and earn real money!\n\n${link}`;
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
    }
}

// ============================================================================
// 8. ADS SYSTEM
// ============================================================================

async function watchAd() {
    if (adPlaying) {
        showToast("Ad is already playing...", "warning");
        return;
    }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) {
        showToast(t("dailyLimitReached"), "warning");
        return;
    }
    
    adPlaying = true;
    const watchBtn = document.getElementById("watchAdBtn");
    if (watchBtn) {
        watchBtn.disabled = true;
        watchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading ad...';
    }
    
    showToast(t("loadingAd"), "info");
    initAllAdPlatforms();
    
    let adCompleted = false;
    
    // عرض إعلانين متتاليين
    for (let i = 0; i < 2; i++) {
        const success = await showAdFromAnyPlatform();
        if (!success) {
            showToast(t("adError"), "error");
            adPlaying = false;
            if (watchBtn) {
                watchBtn.disabled = false;
                watchBtn.innerHTML = '<i class="fas fa-play"></i> ' + t("watchAdBtn");
            }
            return;
        }
        adCompleted = true;
    }
    
    if (adCompleted) {
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

// ============================================================================
// 9. TASKS SYSTEM
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
    
    const total = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = completedChannels + completedBots;
    const progressPercent = total > 0 ? (completed / total) * 100 : 0;
    
    const channelsEl = document.getElementById("channelProgressCount");
    const botsEl = document.getElementById("botProgressCount");
    const fillEl = document.getElementById("tasksProgressFill");
    const rewardEl = document.getElementById("tasksTotalReward");
    
    if (channelsEl) channelsEl.textContent = `${completedChannels}/${TASKS_CONFIG.channels.length}`;
    if (botsEl) botsEl.textContent = `${completedBots}/${TASKS_CONFIG.bots.length}`;
    if (fillEl) fillEl.style.width = `${progressPercent}%`;
    if (rewardEl) rewardEl.textContent = `$${totalReward.toFixed(2)}`;
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
        } else {
            showToast(t("taskError"), "error");
        }
    }, 3000);
}

// ============================================================================
// 10. WITHDRAW SYSTEM
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
    if (destInput && method) destInput.placeholder = method.placeholder;
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
    
    const response = await fetch('/api/withdraw/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: currentUserId,
            userName: currentUser.userName,
            amount: amount,
            method: selectedWithdrawMethod,
            destination: destination
        })
    });
    
    const data = await response.json();
    
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
        showToast(t("withdrawSuccess"), "success");
        
        if (document.getElementById("wdAmountInput")) document.getElementById("wdAmountInput").value = "";
        if (document.getElementById("wdDestInput")) document.getElementById("wdDestInput").value = "";
    } else {
        showToast(data.error || t("error"), "error");
    }
}

// ============================================================================
// 11. NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = "info") {
    if (!currentUser) return;
    currentUser.notifications.unshift({
        id: Date.now(),
        title: title,
        message: message,
        type: type,
        read: false,
        timestamp: new Date().toISOString()
    });
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
    
    const notifications = currentUser.notifications || [];
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
        return;
    }
    
    let html = "";
    notifications.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        html += `
            <div class="notification-item ${n.read ? "" : "unread"}">
                <div class="notification-icon ${n.type}"><i class="fas fa-bell"></i></div>
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

function showNotificationsModal() {
    renderNotifications();
    document.getElementById("notificationsModal")?.classList.add("show");
}

function closeNotificationsModal() {
    document.getElementById("notificationsModal")?.classList.remove("show");
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

// ============================================================================
// 12. UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    
    const balanceEl = document.getElementById("balance");
    const adsTodayEl = document.getElementById("adsWatchedToday");
    const adsTotalEl = document.getElementById("totalAdsWatched");
    const totalEarnedEl = document.getElementById("totalAdsEarned");
    const progressFill = document.getElementById("adProgressFill");
    const progressLabel = document.getElementById("adProgressLabel");
    
    if (balanceEl) balanceEl.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    if (adsTodayEl) adsTodayEl.textContent = `${currentUser.adsToday || 0}/${APP_CONFIG.dailyAdLimit}`;
    if (adsTotalEl) adsTotalEl.textContent = currentUser.adsWatched || 0;
    if (totalEarnedEl) totalEarnedEl.textContent = `$${currentUser.totalEarned?.toFixed(2) || "0.00"}`;
    
    const progress = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    
    const inviteCountEl = document.getElementById("totalInvites");
    const inviteEarnedEl = document.getElementById("totalEarnedFromInvites");
    const inviteLinkEl = document.getElementById("inviteLink");
    
    if (inviteCountEl) inviteCountEl.textContent = currentUser.inviteCount || 0;
    if (inviteEarnedEl) inviteEarnedEl.textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    if (inviteLinkEl) inviteLinkEl.textContent = getReferralLink();
    
    const availBalanceEl = document.getElementById("wdAvailBalance");
    if (availBalanceEl) availBalanceEl.textContent = `$${currentUser.balance?.toFixed(2) || "0.00"}`;
    
    const userNameEl = document.getElementById("userName");
    const userChatIdEl = document.getElementById("userChatId");
    if (userNameEl) userNameEl.textContent = currentUser.userName || "User";
    if (userChatIdEl) userChatIdEl.textContent = `ID: ${currentUserId?.slice(-8) || "-----"}`;
    
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
// 13. NAVIGATION
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
// 14. TOAST
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
// 15. ADMIN PANEL (يستخدم الخادم)
// ============================================================================

let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0 };
let pendingWithdrawals = [];
let allUsers = [];

function checkAdminAndShowCrown() {
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            if (currentUserId === data.adminId) {
                const crownBtn = document.getElementById("adminCrownBtn");
                if (crownBtn) crownBtn.style.display = "flex";
            }
        })
        .catch(e => console.error("[AdNova] Config error:", e));
}

function showAdminAuth() {
    document.getElementById("adminAuthModal")?.classList.add("show");
}

async function verifyAdminPassword() {
    const password = document.getElementById("adminPasswordInput")?.value;
    const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (data.success) {
        adminAuthenticated = true;
        document.getElementById("adminAuthModal")?.classList.remove("show");
        showAdminPanel();
    } else {
        const errorEl = document.getElementById("adminAuthError");
        if (errorEl) errorEl.style.display = "block";
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
    const stats = await fetch('/api/admin/stats').then(r => r.json()).catch(() => ({}));
    if (stats.success) adminStats = stats.stats;
    
    const withdrawals = await fetch('/api/admin/pending-withdrawals').then(r => r.json()).catch(() => ({}));
    if (withdrawals.success) pendingWithdrawals = withdrawals.withdrawals || [];
    
    const users = await fetch('/api/admin/users').then(r => r.json()).catch(() => ({}));
    if (users.success) allUsers = users.users || [];
}

function renderAdminDashboard() {
    const container = document.getElementById("adminContent");
    if (!container) return;
    container.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card"><i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers}</div><div class="stat-label">Total Users</div></div>
            <div class="admin-stat-card"><i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals}</div><div class="stat-label">Pending</div></div>
            <div class="admin-stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${adminStats.totalBalance.toFixed(2)}</div><div class="stat-label">Total Balance</div></div>
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
    if (section === "pending") renderPendingWithdrawals(container);
    else if (section === "users") renderUsersList(container);
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
                <div class="admin-card-header"><span>👤 ${w.userName || w.userId}</span><span class="withdraw-amount">$${w.amount.toFixed(2)}</span></div>
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
    let html = '<div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID..." onkeyup="filterUsers()"></div>';
    allUsers.forEach(user => {
        html += `
            <div class="admin-card user-card" data-user-id="${user.userId}" data-user-name="${user.userName}">
                <div class="admin-card-header"><span>👤 ${user.userName || "User"}</span><span class="user-balance">💰 $${user.balance?.toFixed(2) || "0.00"}</span></div>
                <div class="admin-card-details">
                    <div>ID: ${user.userId}</div>
                    <div>👥 Invites: ${user.inviteCount || 0} | 📺 Ads: ${user.adsWatched || 0}</div>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-add" onclick="adminAddBalance('${user.userId}')">➕ Add</button>
                    <button class="btn-remove" onclick="adminRemoveBalance('${user.userId}')">➖ Remove</button>
                    <button class="btn-block" onclick="adminBlockUser('${user.userId}')">🔒 Block</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function filterUsers() {
    const term = document.getElementById("userSearchInput")?.value.toLowerCase();
    document.querySelectorAll(".user-card").forEach(card => {
        const match = card.getAttribute("data-user-id")?.toLowerCase().includes(term) ||
                      card.getAttribute("data-user-name")?.toLowerCase().includes(term);
        card.style.display = match ? "block" : "none";
    });
}

async function approveWithdrawal(id, userId, amount) {
    const response = await fetch('/api/admin/approve-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id })
    });
    if (response.ok) {
        showToast("Withdrawal approved!", "success");
        await loadAdminData();
        renderPendingWithdrawals(document.getElementById("adminSectionContent"));
    }
}

async function rejectWithdrawal(id, userId, amount) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    const response = await fetch('/api/admin/reject-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, reason })
    });
    if (response.ok) {
        showToast("Withdrawal rejected!", "success");
        await loadAdminData();
        renderPendingWithdrawals(document.getElementById("adminSectionContent"));
    }
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt("Amount to add (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const response = await fetch('/api/admin/add-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount })
    });
    if (response.ok) {
        showToast(`$${amount.toFixed(2)} added!`, "success");
        await loadAdminData();
        renderUsersList(document.getElementById("adminSectionContent"));
        if (userId === currentUserId) {
            currentUser.balance += amount;
            updateUI();
        }
    }
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt("Amount to remove (USD):"));
    if (isNaN(amount) || amount <= 0) return;
    const response = await fetch('/api/admin/remove-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount })
    });
    if (response.ok) {
        showToast(`$${amount.toFixed(2)} removed!`, "success");
        await loadAdminData();
        renderUsersList(document.getElementById("adminSectionContent"));
        if (userId === currentUserId) {
            currentUser.balance -= amount;
            updateUI();
        }
    }
}

async function adminBlockUser(userId) {
    if (!confirm("⚠️ Permanently block this user?")) return;
    const response = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (response.ok) {
        showToast("User blocked!", "success");
        await loadAdminData();
        renderUsersList(document.getElementById("adminSectionContent"));
    }
}

// ============================================================================
// 16. INITIALIZATION & FIX (إصلاح شاشة التحميل)
// ============================================================================

// دالة إخفاء شاشة التحميل - قوية ومضمونة
function hideSplash() {
    console.log("[AdNova] Hiding splash screen...");
    
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    
    if (splash) {
        splash.style.transition = "opacity 0.5s ease";
        splash.style.opacity = "0";
        
        setTimeout(() => {
            splash.style.display = "none";
            if (main) {
                main.style.display = "block";
                main.style.animation = "fadeIn 0.5s ease";
            }
            console.log("[AdNova] Splash screen hidden, main content visible");
        }, 500);
    } else {
        if (main) main.style.display = "block";
    }
}

// دالة إجبارية لإخفاء شاشة التحميل بعد 3 ثوان كحد أقصى
function forceHideSplash() {
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("mainContent");
    
    if (splash && splash.style.display !== "none") {
        console.log("[AdNova] Force hiding splash screen");
        splash.style.display = "none";
        if (main) main.style.display = "block";
    }
}

// بدء التطبيق مع ضمان إخفاء شاشة التحميل
function init() {
    console.log("[AdNova] Initializing application...");
    
    // تطبيق اللغة المحفوظة
    const savedLang = localStorage.getItem("adnova_lang");
    if (savedLang) {
        const lang = LANGUAGES.find(l => l.code === savedLang);
        if (lang) {
            currentLanguage = savedLang;
            if (lang.dir === "rtl") {
                document.documentElement.setAttribute("dir", "rtl");
                document.body.classList.add("rtl");
            }
        }
    }
    
    // تحديث العناصر الثابتة
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) el.textContent = t(key);
    });
    
    // تحميل البيانات
    loadUserData();
    renderWithdrawMethods();
    checkAdminAndShowCrown();
    initAllAdPlatforms();
    
    // إخفاء شاشة التحميل فوراً بعد 100ms
    setTimeout(hideSplash, 100);
    
    // إخفاء إجباري بعد 3 ثوان كحد أقصى
    setTimeout(forceHideSplash, 3000);
    
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
}

// بدء التطبيق
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

// ============================================================================
// 17. GLOBAL EXPORTS
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

console.log("[AdNova] Fully loaded with 10 languages!");
console.log(`💰 Ad Reward: $${APP_CONFIG.adReward} | Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw} | Required Referrals: ${APP_CONFIG.requiredReferrals}`);
