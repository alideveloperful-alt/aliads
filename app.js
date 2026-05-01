// ============================================================================
// ADNOVA NETWORK - COMPLETE FRONTEND v1.0
// تطبيق إعلانات حقيقي + لوحة مشرف متكاملة + نظام ترجمة
// ============================================================================

// ============================================================================
// SECTION 1: TELEGRAM WEBAPP INITIALIZATION
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

// إعدادات التطبيق (معتمدة على الكاش أولاً)
let APP_CONFIG = {
    adReward: 0.01,
    dailyLimit: 50,
    minWithdraw: 10,
    requiredReferrals: 10,
    cooldownSeconds: 30,
    withdrawalMethods: [
        { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal', placeholder: 'example@email.com' },
        { id: 'skrill', name: 'Skrill', icon: 'fab fa-skrill', placeholder: 'example@email.com' },
        { id: 'payoneer', name: 'Payoneer', icon: 'fas fa-building', placeholder: 'example@email.com' },
        { id: 'sbp', name: 'SBP', icon: 'fas fa-university', placeholder: '+7 XXX XXX XX XX' },
        { id: 'usdt_bep20', name: 'USDT (BEP20)', icon: 'fab fa-bitcoin', placeholder: '0x...' },
        { id: 'usdt_trc20', name: 'USDT (TRC20)', icon: 'fab fa-bitcoin', placeholder: 'T...' },
        { id: 'ton', name: 'TON', icon: 'fab fa-telegram', placeholder: 'EQ...' },
        { id: 'mobile', name: 'Mobile', icon: 'fas fa-mobile-alt', placeholder: '+XXX XXX XXX' },
        { id: 'pubg', name: 'PUBG UC', icon: 'fas fa-gamepad', placeholder: 'Player ID' },
        { id: 'freefire', name: 'Free Fire', icon: 'fas fa-fire', placeholder: 'Player ID' }
    ]
};

// بيانات المهام (تُخزن في الكاش مؤقتاً)
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

// مفتاح الكاش (Cache Key)
const CACHE_KEYS = {
    USER_DATA: 'adnova_user_data',
    CONFIG: 'adnova_config',
    TASKS: 'adnova_tasks',
    NOTIFICATIONS: 'adnova_notifications'
};

// ============================================================================
// SECTION 3: TRANSLATION SYSTEM (i18n) - 10 LANGUAGES
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
        'ads.total': 'Total',
        'ads.earned': 'Total Earned',
        'ads.watch': 'Watch Ad',
        'ads.reward': '+${reward} per ad',
        'ads.daily.limit': 'Daily Limit: ${limit} ads',
        'ads.ready': 'Ready to earn!',
        'ads.loading': 'Loading ad...',
        'ads.processing': 'Processing reward...',
        'ads.success': '+$${amount} added!',
        'ads.limit.reached': 'Daily limit reached! Come back tomorrow.',
        'ads.cooldown': 'Please wait ${seconds} seconds...',
        'ads.error': 'Error loading ad. Try again.',
        
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
        'withdraw.amount': 'Amount',
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
        'ads.total': 'الإجمالي',
        'ads.earned': 'إجمالي الأرباح',
        'ads.watch': 'شاهد إعلان',
        'ads.reward': '+${reward} لكل إعلان',
        'ads.daily.limit': 'الحد اليومي: ${limit} إعلان',
        'ads.ready': 'جاهز للربح!',
        'ads.loading': 'جاري تحميل الإعلان...',
        'ads.processing': 'جاري معالجة المكافأة...',
        'ads.success': '+$${amount} أضيفت!',
        'ads.limit.reached': 'تم الوصول للحد اليومي! عد غداً.',
        'ads.cooldown': 'انتظر ${seconds} ثواني...',
        'ads.error': 'خطأ في تحميل الإعلان. حاول مرة أخرى.',
        
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
        'withdraw.amount': 'المبلغ',
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
        
        'toast.copied': 'تم النسخ إلى الحافظة!',
        'loading': 'جاري التحميل...',
        'error': 'حدث خطأ',
        'success': 'تم بنجاح!'
    },
    
    es: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Anuncios',
        'nav.tasks': 'Tareas',
        'nav.invite': 'Invitar',
        'nav.withdraw': 'Retirar',
        'nav.admin': 'Admin',
        
        'ads.title': 'Mira Anuncios y Gana',
        'ads.balance': 'Tu Saldo',
        'ads.today': 'Hoy',
        'ads.total': 'Total',
        'ads.earned': 'Ganado Total',
        'ads.watch': 'Ver Anuncio',
        'ads.reward': '+${reward} por anuncio',
        'ads.daily.limit': 'Límite Diario: ${limit} anuncios',
        'ads.ready': '¡Listo para ganar!',
        'ads.loading': 'Cargando anuncio...',
        'ads.processing': 'Procesando recompensa...',
        'ads.success': '+$${amount} añadido!',
        'ads.limit.reached': '¡Límite diario alcanzado! Vuelve mañana.',
        'ads.cooldown': 'Espera ${seconds} segundos...',
        'ads.error': 'Error al cargar el anuncio. Intenta de nuevo.',
        
        'tasks.title': 'Completa Tareas',
        'tasks.subtitle': 'Gana recompensas extras',
        'tasks.channels': 'Canales de Telegram',
        'tasks.bots': 'Bots de Telegram',
        'tasks.completed': 'Completado',
        'tasks.progress': 'Progreso',
        'tasks.total.reward': 'Recompensa Total: $${amount}',
        'tasks.join': 'Unirse',
        'tasks.start': 'Iniciar',
        'tasks.done': 'Hecho',
        'tasks.verify': 'Verificando...',
        'tasks.success': '+$${amount} añadido!',
        'tasks.error': 'Por favor únete primero',
        
        'invite.title': 'Invita y Gana',
        'invite.subtitle': 'Obtén $${reward} por cada amigo',
        'invite.link': 'Tu Enlace de Invitación',
        'invite.copy': 'Copiar',
        'invite.copied': '¡Enlace copiado!',
        'invite.share': 'Compartir',
        'invite.total': 'Invitaciones Totales',
        'invite.earned': 'Ganado por Invitaciones',
        'invite.needed': 'Necesitas ${needed} invitaciones más para retirar',
        
        'withdraw.title': 'Retirar Fondos',
        'withdraw.subtitle': 'Mínimo $${min}',
        'withdraw.method': 'Método de Pago',
        'withdraw.destination': 'Destino',
        'withdraw.amount': 'Cantidad',
        'withdraw.available': 'Disponible: $${balance}',
        'withdraw.submit': 'Enviar Solicitud',
        'withdraw.processing': 'Procesando...',
        'withdraw.success': '¡Solicitud de retiro enviada!',
        'withdraw.error': 'Error al enviar la solicitud',
        'withdraw.insufficient': 'Saldo insuficiente',
        'withdraw.needs.referrals': 'Necesitas ${needed} invitaciones más',
        'withdraw.need.min': 'El retiro mínimo es $${min}',
        'withdraw.pending': 'Tu solicitud está siendo procesada',
        
        'notifications.title': 'Notificaciones',
        'notifications.empty': 'No hay notificaciones',
        'notifications.clear.read': 'Borrar Leídas',
        'notifications.clear.all': 'Borrar Todo',
        'notifications.confirm.clear.read': '¿Borrar todas las notificaciones leídas?',
        'notifications.confirm.clear.all': '¿Borrar todas las notificaciones?',
        
        'toast.copied': '¡Copiado al portapapeles!',
        'loading': 'Cargando...',
        'error': 'Ocurrió un error',
        'success': '¡Éxito!'
    },
    
    fr: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Annonces',
        'nav.tasks': 'Tâches',
        'nav.invite': 'Inviter',
        'nav.withdraw': 'Retirer',
        'nav.admin': 'Admin',
        
        'ads.title': 'Regardez des annonces et gagnez',
        'ads.balance': 'Votre Solde',
        'ads.today': "Aujourd'hui",
        'ads.total': 'Total',
        'ads.earned': 'Total Gagné',
        'ads.watch': 'Voir Annonce',
        'ads.reward': '+${reward} par annonce',
        'ads.daily.limit': 'Limite Quotidienne: ${limit} annonces',
        'ads.ready': 'Prêt à gagner!',
        'ads.loading': 'Chargement de l\'annonce...',
        'ads.processing': 'Traitement de la récompense...',
        'ads.success': '+$${amount} ajouté!',
        'ads.limit.reached': 'Limite quotidienne atteinte! Revenez demain.',
        'ads.cooldown': 'Attendez ${seconds} secondes...',
        'ads.error': 'Erreur de chargement. Réessayez.',
        
        'tasks.title': 'Complétez des tâches',
        'tasks.subtitle': 'Gagnez des récompenses supplémentaires',
        'tasks.channels': 'Chaînes Telegram',
        'tasks.bots': 'Bots Telegram',
        'tasks.completed': 'Terminé',
        'tasks.progress': 'Progrès',
        'tasks.total.reward': 'Récompense Totale: $${amount}',
        'tasks.join': 'Rejoindre',
        'tasks.start': 'Démarrer',
        'tasks.done': 'Fait',
        
        'invite.title': 'Invitez et gagnez',
        'invite.subtitle': 'Obtenez $${reward} par ami',
        'invite.link': 'Votre lien d\'invitation',
        'invite.copy': 'Copier',
        'invite.copied': 'Lien copié!',
        'invite.share': 'Partager',
        'invite.total': 'Invitations Totales',
        'invite.earned': 'Gagné par les invitations',
        
        'withdraw.title': 'Retirer des fonds',
        'withdraw.subtitle': 'Minimum $${min}',
        'withdraw.method': 'Méthode de paiement',
        'withdraw.destination': 'Destination',
        'withdraw.amount': 'Montant',
        'withdraw.available': 'Disponible: $${balance}',
        'withdraw.submit': 'Soumettre la demande',
        'withdraw.success': 'Demande de retrait soumise!',
        'withdraw.insufficient': 'Solde insuffisant',
        'withdraw.needs.referrals': 'Besoin de ${needed} invitations supplémentaires',
        'withdraw.need.min': 'Le retrait minimum est de $${min}',
        
        'toast.copied': 'Copié dans le presse-papiers!',
        'loading': 'Chargement...',
        'error': 'Une erreur est survenue',
        'success': 'Succès!'
    },
    
    ru: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Реклама',
        'nav.tasks': 'Задачи',
        'nav.invite': 'Пригласить',
        'nav.withdraw': 'Вывод',
        'nav.admin': 'Админ',
        
        'ads.title': 'Смотрите рекламу и зарабатывайте',
        'ads.balance': 'Ваш Баланс',
        'ads.today': 'Сегодня',
        'ads.total': 'Всего',
        'ads.earned': 'Всего Заработано',
        'ads.watch': 'Смотреть Рекламу',
        'ads.reward': '+${reward} за рекламу',
        'ads.daily.limit': 'Дневной лимит: ${limit} реклам',
        'ads.ready': 'Готов к заработку!',
        'ads.loading': 'Загрузка рекламы...',
        'ads.success': '+$${amount} добавлено!',
        'ads.limit.reached': 'Дневной лимит достигнут! Возвращайтесь завтра.',
        
        'tasks.title': 'Выполните задачи',
        'tasks.subtitle': 'Получите дополнительные награды',
        'tasks.channels': 'Telegram Каналы',
        'tasks.bots': 'Telegram Боты',
        'tasks.completed': 'Выполнено',
        'tasks.progress': 'Прогресс',
        'tasks.join': 'Присоединиться',
        'tasks.start': 'Запустить',
        'tasks.done': 'Готово',
        
        'invite.title': 'Приглашайте и зарабатывайте',
        'invite.subtitle': 'Получите $${reward} за каждого друга',
        'invite.link': 'Ваша реферальная ссылка',
        'invite.copy': 'Копировать',
        'invite.copied': 'Ссылка скопирована!',
        'invite.share': 'Поделиться',
        'invite.total': 'Всего приглашений',
        'invite.earned': 'Заработано на приглашениях',
        
        'withdraw.title': 'Вывод средств',
        'withdraw.subtitle': 'Минимум $${min}',
        'withdraw.method': 'Способ оплаты',
        'withdraw.destination': 'Назначение',
        'withdraw.amount': 'Сумма',
        'withdraw.available': 'Доступно: $${balance}',
        'withdraw.submit': 'Отправить запрос',
        'withdraw.success': 'Запрос на вывод отправлен!',
        'withdraw.insufficient': 'Недостаточно средств',
        'withdraw.needs.referrals': 'Нужно еще ${needed} приглашений',
        'withdraw.need.min': 'Минимальная сумма вывода $${min}',
        
        'toast.copied': 'Скопировано в буфер обмена!',
        'loading': 'Загрузка...',
        'error': 'Произошла ошибка',
        'success': 'Успешно!'
    },
    
    pt: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Anúncios',
        'nav.tasks': 'Tarefas',
        'nav.invite': 'Convidar',
        'nav.withdraw': 'Sacar',
        'nav.admin': 'Admin',
        
        'ads.title': 'Assista anúncios e ganhe',
        'ads.balance': 'Seu Saldo',
        'ads.today': 'Hoje',
        'ads.total': 'Total',
        'ads.earned': 'Total Ganho',
        'ads.watch': 'Ver Anúncio',
        'ads.reward': '+${reward} por anúncio',
        'ads.daily.limit': 'Limite Diário: ${limit} anúncios',
        'ads.ready': 'Pronto para ganhar!',
        'ads.loading': 'Carregando anúncio...',
        'ads.success': '+$${amount} adicionado!',
        'ads.limit.reached': 'Limite diário atingido! Volte amanhã.',
        
        'tasks.title': 'Complete tarefas',
        'tasks.subtitle': 'Ganhe recompensas extras',
        'tasks.channels': 'Canais do Telegram',
        'tasks.bots': 'Bots do Telegram',
        'tasks.completed': 'Concluído',
        'tasks.progress': 'Progresso',
        'tasks.join': 'Entrar',
        'tasks.start': 'Iniciar',
        'tasks.done': 'Feito',
        
        'invite.title': 'Convide e ganhe',
        'invite.subtitle': 'Ganhe $${reward} por cada amigo',
        'invite.link': 'Seu link de convite',
        'invite.copy': 'Copiar',
        'invite.copied': 'Link copiado!',
        'invite.share': 'Compartilhar',
        'invite.total': 'Total de Convites',
        'invite.earned': 'Ganho com Convites',
        
        'withdraw.title': 'Sacar fundos',
        'withdraw.subtitle': 'Mínimo $${min}',
        'withdraw.method': 'Método de pagamento',
        'withdraw.destination': 'Destino',
        'withdraw.amount': 'Valor',
        'withdraw.available': 'Disponível: $${balance}',
        'withdraw.submit': 'Enviar solicitação',
        'withdraw.success': 'Solicitação de saque enviada!',
        'withdraw.insufficient': 'Saldo insuficiente',
        'withdraw.needs.referrals': 'Precisa de mais ${needed} convites',
        'withdraw.need.min': 'O saque mínimo é $${min}',
        
        'toast.copied': 'Copiado para a área de transferência!',
        'loading': 'Carregando...',
        'error': 'Ocorreu um erro',
        'success': 'Sucesso!'
    },
    
    hi: {
        'app.name': 'एडनोवा नेटवर्क',
        'nav.ads': 'विज्ञापन',
        'nav.tasks': 'कार्य',
        'nav.invite': 'आमंत्रित करें',
        'nav.withdraw': 'निकासी',
        'nav.admin': 'व्यवस्थापक',
        
        'ads.title': 'विज्ञापन देखें और कमाएं',
        'ads.balance': 'आपकी शेष राशि',
        'ads.today': 'आज',
        'ads.total': 'कुल',
        'ads.earned': 'कुल कमाई',
        'ads.watch': 'विज्ञापन देखें',
        'ads.reward': '+${reward} प्रति विज्ञापन',
        'ads.daily.limit': 'दैनिक सीमा: ${limit} विज्ञापन',
        'ads.ready': 'कमाने के लिए तैयार!',
        'ads.loading': 'विज्ञापन लोड हो रहा है...',
        'ads.success': '+$${amount} जोड़ा गया!',
        'ads.limit.reached': 'दैनिक सीमा पूरी हुई! कल आएं।',
        
        'tasks.title': 'कार्य पूरे करें',
        'tasks.subtitle': 'अतिरिक्त पुरस्कार कमाएं',
        'tasks.channels': 'टेलीग्राम चैनल',
        'tasks.bots': 'टेलीग्राम बॉट',
        'tasks.completed': 'पूरा हुआ',
        'tasks.progress': 'प्रगति',
        'tasks.join': 'जुड़ें',
        'tasks.start': 'शुरू करें',
        'tasks.done': 'हो गया',
        
        'invite.title': 'आमंत्रित करें और कमाएं',
        'invite.subtitle': 'प्रति मित्र $${reward} प्राप्त करें',
        'invite.link': 'आपका आमंत्रण लिंक',
        'invite.copy': 'कॉपी करें',
        'invite.copied': 'लिंक कॉपी हो गया!',
        'invite.share': 'साझा करें',
        'invite.total': 'कुल आमंत्रण',
        'invite.earned': 'आमंत्रण से कमाई',
        
        'withdraw.title': 'धन निकालें',
        'withdraw.subtitle': 'न्यूनतम $${min}',
        'withdraw.method': 'भुगतान विधि',
        'withdraw.destination': 'गंतव्य',
        'withdraw.amount': 'राशि',
        'withdraw.available': 'उपलब्ध: $${balance}',
        'withdraw.submit': 'अनुरोध भेजें',
        'withdraw.success': 'निकासी अनुरोध भेजा गया!',
        'withdraw.insufficient': 'अपर्याप्त शेष राशि',
        'withdraw.needs.referrals': '${needed} और आमंत्रण की आवश्यकता',
        'withdraw.need.min': 'न्यूनतम निकासी $${min} है',
        
        'toast.copied': 'क्लिपबोर्ड पर कॉपी हो गया!',
        'loading': 'लोड हो रहा है...',
        'error': 'एक त्रुटि हुई',
        'success': 'सफल!'
    },
    
    id: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Iklan',
        'nav.tasks': 'Tugas',
        'nav.invite': 'Undang',
        'nav.withdraw': 'Tarik',
        'nav.admin': 'Admin',
        
        'ads.title': 'Tonton Iklan & Dapatkan',
        'ads.balance': 'Saldo Anda',
        'ads.today': 'Hari Ini',
        'ads.total': 'Total',
        'ads.earned': 'Total Pendapatan',
        'ads.watch': 'Tonton Iklan',
        'ads.reward': '+${reward} per iklan',
        'ads.daily.limit': 'Batas Harian: ${limit} iklan',
        'ads.ready': 'Siap menghasilkan!',
        'ads.loading': 'Memuat iklan...',
        'ads.success': '+$${amount} ditambahkan!',
        'ads.limit.reached': 'Batas harian tercapai! Kembali besok.',
        
        'tasks.title': 'Selesaikan Tugas',
        'tasks.subtitle': 'Dapatkan hadiah tambahan',
        'tasks.channels': 'Saluran Telegram',
        'tasks.bots': 'Bot Telegram',
        'tasks.completed': 'Selesai',
        'tasks.progress': 'Kemajuan',
        'tasks.join': 'Gabung',
        'tasks.start': 'Mulai',
        'tasks.done': 'Selesai',
        
        'invite.title': 'Undang & Dapatkan',
        'invite.subtitle': 'Dapatkan $${reward} per teman',
        'invite.link': 'Tautan Undangan Anda',
        'invite.copy': 'Salin',
        'invite.copied': 'Tautan disalin!',
        'invite.share': 'Bagikan',
        'invite.total': 'Total Undangan',
        'invite.earned': 'Pendapatan dari Undangan',
        
        'withdraw.title': 'Tarik Dana',
        'withdraw.subtitle': 'Minimum $${min}',
        'withdraw.method': 'Metode Pembayaran',
        'withdraw.destination': 'Tujuan',
        'withdraw.amount': 'Jumlah',
        'withdraw.available': 'Tersedia: $${balance}',
        'withdraw.submit': 'Kirim Permintaan',
        'withdraw.success': 'Permintaan penarikan dikirim!',
        'withdraw.insufficient': 'Saldo tidak mencukupi',
        'withdraw.needs.referrals': 'Butuh ${needed} undangan lagi',
        'withdraw.need.min': 'Penarikan minimum adalah $${min}',
        
        'toast.copied': 'Disalin ke clipboard!',
        'loading': 'Memuat...',
        'error': 'Terjadi kesalahan',
        'success': 'Berhasil!'
    },
    
    tr: {
        'app.name': 'AdNova Network',
        'nav.ads': 'Reklamlar',
        'nav.tasks': 'Görevler',
        'nav.invite': 'Davet Et',
        'nav.withdraw': 'Çek',
        'nav.admin': 'Admin',
        
        'ads.title': 'Reklam İzle ve Kazan',
        'ads.balance': 'Bakiyeniz',
        'ads.today': 'Bugün',
        'ads.total': 'Toplam',
        'ads.earned': 'Toplam Kazanç',
        'ads.watch': 'Reklam İzle',
        'ads.reward': '+${reward} reklam başına',
        'ads.daily.limit': 'Günlük Limit: ${limit} reklam',
        'ads.ready': 'Kazanmaya hazır!',
        'ads.loading': 'Reklam yükleniyor...',
        'ads.success': '+$${amount} eklendi!',
        'ads.limit.reached': 'Günlük limite ulaşıldı! Yarın gel.',
        
        'tasks.title': 'Görevleri Tamamla',
        'tasks.subtitle': 'Ek ödüller kazan',
        'tasks.channels': 'Telegram Kanalları',
        'tasks.bots': 'Telegram Botları',
        'tasks.completed': 'Tamamlandı',
        'tasks.progress': 'İlerleme',
        'tasks.join': 'Katıl',
        'tasks.start': 'Başlat',
        'tasks.done': 'Tamam',
        
        'invite.title': 'Davet Et ve Kazan',
        'invite.subtitle': 'Her arkadaş için $${reward} kazan',
        'invite.link': 'Davet Bağlantınız',
        'invite.copy': 'Kopyala',
        'invite.copied': 'Bağlantı kopyalandı!',
        'invite.share': 'Paylaş',
        'invite.total': 'Toplam Davet',
        'invite.earned': 'Davetlerden Kazanç',
        
        'withdraw.title': 'Para Çek',
        'withdraw.subtitle': 'Minimum $${min}',
        'withdraw.method': 'Ödeme Yöntemi',
        'withdraw.destination': 'Hedef',
        'withdraw.amount': 'Tutar',
        'withdraw.available': 'Mevcut: $${balance}',
        'withdraw.submit': 'Talep Gönder',
        'withdraw.success': 'Para çekme talebi gönderildi!',
        'withdraw.insufficient': 'Yetersiz bakiye',
        'withdraw.needs.referrals': '${needed} daha fazla davete ihtiyaç var',
        'withdraw.need.min': 'Minimum çekim $${min}',
        
        'toast.copied': 'Panoya kopyalandı!',
        'loading': 'Yükleniyor...',
        'error': 'Bir hata oluştu',
        'success': 'Başarılı!'
    },
    
    fa: {
        'app.name': 'شبکه ادنوا',
        'nav.ads': 'تبلیغات',
        'nav.tasks': 'وظایف',
        'nav.invite': 'دعوت',
        'nav.withdraw': 'برداشت',
        'nav.admin': 'مدیر',
        
        'ads.title': 'تبلیغات ببینید و درآمد کسب کنید',
        'ads.balance': 'موجودی شما',
        'ads.today': 'امروز',
        'ads.total': 'کل',
        'ads.earned': 'کل درآمد',
        'ads.watch': 'مشاهده تبلیغ',
        'ads.reward': '+${reward} برای هر تبلیغ',
        'ads.daily.limit': 'سقف روزانه: ${limit} تبلیغ',
        'ads.ready': 'آماده کسب درآمد!',
        'ads.loading': 'در حال بارگذاری تبلیغ...',
        'ads.success': '+$${amount} اضافه شد!',
        'ads.limit.reached': 'سقف روزانه تکمیل شد! فردا برگردید.',
        
        'tasks.title': 'وظایف را کامل کنید',
        'tasks.subtitle': 'پاداش اضافی کسب کنید',
        'tasks.channels': 'کانال‌های تلگرام',
        'tasks.bots': 'بات‌های تلگرام',
        'tasks.completed': 'تکمیل شده',
        'tasks.progress': 'پیشرفت',
        'tasks.join': 'عضو شوید',
        'tasks.start': 'شروع کنید',
        'tasks.done': 'انجام شد',
        
        'invite.title': 'دعوت کنید و درآمد کسب کنید',
        'invite.subtitle': 'برای هر دوست $${reward} دریافت کنید',
        'invite.link': 'لینک دعوت شما',
        'invite.copy': 'کپی',
        'invite.copied': 'لینک کپی شد!',
        'invite.share': 'اشتراک‌گذاری',
        'invite.total': 'کل دعوت‌ها',
        'invite.earned': 'درآمد از دعوت‌ها',
        
        'withdraw.title': 'برداشت وجه',
        'withdraw.subtitle': 'حداقل $${min}',
        'withdraw.method': 'روش پرداخت',
        'withdraw.destination': 'مقصد',
        'withdraw.amount': 'مبلغ',
        'withdraw.available': 'موجودی: $${balance}',
        'withdraw.submit': 'ارسال درخواست',
        'withdraw.success': 'درخواست برداشت ارسال شد!',
        'withdraw.insufficient': 'موجودی ناکافی',
        'withdraw.needs.referrals': 'به ${needed} دعوت دیگر نیاز است',
        'withdraw.need.min': 'حداقل برداشت $${min} است',
        
        'toast.copied': 'در کلیپ‌بورد کپی شد!',
        'loading': 'در حال بارگذاری...',
        'error': 'خطایی رخ داده است',
        'success': 'موفقیت آمیز!'
    }
};

// دالة الترجمة
function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
    
    Object.keys(params).forEach(param => {
        text = text.replace(`\${${param}}`, params[param]);
    });
    
    return text;
}

// تطبيق اللغة على الواجهة
function applyLanguage() {
    const html = document.documentElement;
    
    // RTL للعربية والفارسية
    if (currentLanguage === 'ar' || currentLanguage === 'fa') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', currentLanguage);
        document.body.classList.add('rtl');
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', currentLanguage);
        document.body.classList.remove('rtl');
    }
    
    // تحديث زر اللغة
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        const langNames = { en: 'English', ar: 'العربية', es: 'Español', fr: 'Français', ru: 'Русский', pt: 'Português', hi: 'हिन्दी', id: 'Indonesia', tr: 'Türkçe', fa: 'فارسی' };
        langBtn.innerHTML = `<span class="lang-flag">${getLanguageFlag(currentLanguage)}</span> <span>${langNames[currentLanguage]}</span>`;
    }
    
    // تحديث كل العناصر التي تحمل data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            el.textContent = t(key);
        }
    });
    
    // تحديث الصفحة الحالية
    refreshCurrentPage();
}

function getLanguageFlag(lang) {
    const flags = { en: '🇬🇧', ar: '🇸🇦', es: '🇪🇸', fr: '🇫🇷', ru: '🇷🇺', pt: '🇧🇷', hi: '🇮🇳', id: '🇮🇩', tr: '🇹🇷', fa: '🇮🇷' };
    return flags[lang] || '🌐';
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

// ============================================================================
// SECTION 4: CACHE MANAGEMENT (معتمدة على الكاش)
// ============================================================================

function saveUserToLocal() {
    if (currentUser) {
        const userToSave = {
            ...currentUser,
            notifications: currentUser.notifications?.slice(0, 50) || [],
            transactions: currentUser.transactions?.slice(0, 100) || []
        };
        localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(userToSave));
    }
}

function loadUserFromLocal() {
    const cached = localStorage.getItem(CACHE_KEYS.USER_DATA);
    if (cached) {
        try {
            const user = JSON.parse(cached);
            if (user && user.userId) {
                console.log("📦 Using cached user data");
                return user;
            }
        } catch (e) {}
    }
    return null;
}

function clearUserCache() {
    localStorage.removeItem(CACHE_KEYS.USER_DATA);
    localStorage.removeItem(CACHE_KEYS.CONFIG);
}

// ============================================================================
// SECTION 5: API CALLS (مع دعم الكاش)
// ============================================================================

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    if (adminAuthenticated && adminAuthToken) {
        options.headers['Authorization'] = `Bearer ${adminAuthToken}`;
    }
    
    try {
        const response = await fetch(endpoint, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// SECTION 6: USER INITIALIZATION
// ============================================================================

async function initUser() {
    console.log("🚀 Initializing AdNova...");
    
    // محاولة تحميل من الكاش أولاً
    const cachedUser = loadUserFromLocal();
    if (cachedUser) {
        currentUser = cachedUser;
        currentUserId = cachedUser.userId;
        updateUI();
        console.log("📦 UI updated from cache");
    }
    
    // التحقق من وجود مستخدم تليجرام
    let initData = null;
    let tgUser = null;
    
    if (tg) {
        tg.ready();
        tg.expand();
        
        if (tg.initDataUnsafe?.user?.id) {
            tgUser = tg.initDataUnsafe.user;
            initData = tg.initData;
        } else if (tg.initData) {
            const params = new URLSearchParams(tg.initData);
            const userJson = params.get('user');
            if (userJson) {
                tgUser = JSON.parse(decodeURIComponent(userJson));
                initData = tg.initData;
            }
        }
    }
    
    if (!initData || !tgUser) {
        console.log("⚠️ No Telegram user, using demo mode");
        currentUser = {
            userId: 'demo_' + Date.now(),
            userName: 'Demo User',
            balance: 0.50,
            inviteCount: 0,
            adsWatched: 0,
            adsToday: 0,
            totalEarned: 0.50,
            transactions: [],
            notifications: [],
            withdrawals: [],
            withdrawBlocked: false
        };
        currentUserId = currentUser.userId;
        updateUI();
        hideSplash();
        return;
    }
    
    currentUserId = tgUser.id.toString();
    
    // جلب البيانات من الخادم
    try {
        const response = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.userData;
            
            // دمج الإشعارات من الكاش إن وجدت
            if (cachedUser?.notifications) {
                const existingIds = new Set(currentUser.notifications?.map(n => n.id) || []);
                const newNotifs = cachedUser.notifications.filter(n => !existingIds.has(n.id));
                if (newNotifs.length) {
                    currentUser.notifications = [...newNotifs, ...(currentUser.notifications || [])];
                }
            }
            
            // تحديث إعدادات التطبيق
            if (data.config) {
                APP_CONFIG = { ...APP_CONFIG, ...data.config };
            }
            
            saveUserToLocal();
            updateUI();
            
            // معالجة الإحالة
            const startParam = tg.initDataUnsafe?.start_param;
            if (startParam && startParam !== currentUserId && !currentUser.referredBy) {
                await processReferral(startParam);
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error("❌ Init error:", error);
        if (!cachedUser) {
            showToast(t('error'), 'error');
        }
    }
    
    hideSplash();
}

async function processReferral(referrerId) {
    try {
        const response = await apiCall('/api/referral', 'POST', {
            referrerId,
            newUserId: currentUserId
        });
        
        if (response.success) {
            showToast(t('invite.reward'), 'success');
            // تحديث الرصيد محلياً
            currentUser.balance = (currentUser.balance || 0) + APP_CONFIG.referralReward;
            currentUser.inviteCount = (currentUser.inviteCount || 0) + 1;
            updateUI();
            
            showNotification('🎉 New Referral!', `+$${APP_CONFIG.referralReward} added!`, 'success');
        }
    } catch (error) {
        console.error("Referral error:", error);
    }
}

// ============================================================================
// SECTION 7: UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    
    // تحديث الرصيد
    if (balanceEl) balanceEl.textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    
    // تحديث إحصائيات الإعلانات
    if (adsWatchedTodayEl) adsWatchedTodayEl.textContent = `${currentUser.adsToday || 0}/${APP_CONFIG.dailyLimit}`;
    if (adsWatchedTotalEl) adsWatchedTotalEl.textContent = currentUser.adsWatched || 0;
    if (totalEarnedEl) totalEarnedEl.textContent = `$${currentUser.totalEarned?.toFixed(2) || '0.00'}`;
    if (dailyLimitEl) dailyLimitEl.textContent = APP_CONFIG.dailyLimit;
    
    // تحديث شريط التقدم للإعلانات
    const progressPercent = ((currentUser.adsToday || 0) / APP_CONFIG.dailyLimit) * 100;
    if (adProgressFill) adProgressFill.style.width = `${Math.min(progressPercent, 100)}%`;
    if (adProgressLabel) adProgressLabel.textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyLimit} ${t('ads.today')}`;
    
    // تحديث حالة زر الإعلان
    if (watchAdBtn) {
        const canWatch = (currentUser.adsToday || 0) < APP_CONFIG.dailyLimit;
        watchAdBtn.disabled = !canWatch;
        if (!canWatch && adStatusText) {
            adStatusText.textContent = t('ads.limit.reached');
            adStatusDiv?.classList.remove('info');
            adStatusDiv?.classList.add('warning');
        }
    }
    
    // تحديث صفحة الدعوات
    if (inviteCountEl) inviteCountEl.textContent = currentUser.inviteCount || 0;
    const inviteEarned = ((currentUser.inviteCount || 0) * APP_CONFIG.referralReward).toFixed(2);
    if (inviteEarnedEl) inviteEarnedEl.textContent = `$${inviteEarned}`;
    const neededReferrals = Math.max(0, APP_CONFIG.requiredReferrals - (currentUser.inviteCount || 0));
    if (referralNeededEl) referralNeededEl.textContent = neededReferrals;
    
    // تحديث رابط الدعوة
    if (inviteLinkEl) {
        const botUsername = 'AdNovaNetworkbot';
        inviteLinkEl.value = `https://t.me/${botUsername}/app?startapp=${currentUserId}`;
    }
    
    // تحديث صفحة السحب
    if (withdrawAvailable) withdrawAvailable.textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    if (withdrawMinAmount) withdrawMinAmount.textContent = `$${APP_CONFIG.minWithdraw}`;
    if (withdrawReferralsNeeded) withdrawReferralsNeeded.textContent = neededReferrals;
    
    // التحقق من أهلية السحب
    const canWithdraw = (currentUser.balance || 0) >= APP_CONFIG.minWithdraw && 
                        (currentUser.inviteCount || 0) >= APP_CONFIG.requiredReferrals;
    if (submitWithdrawBtn) {
        submitWithdrawBtn.disabled = !canWithdraw;
    }
    
    // تحديث الإشعارات
    updateNotificationBadge();
}

function refreshCurrentPage() {
    if (currentPage === 'ads') {
        // تحديث نصوص صفحة الإعلانات
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && el.closest('#page-ads')) {
                el.textContent = t(key);
            }
        });
        if (adStatusText && !watchAdBtn?.disabled) {
            adStatusText.textContent = t('ads.ready');
            adStatusDiv?.classList.remove('warning');
            adStatusDiv?.classList.add('info');
        }
    } else if (currentPage === 'tasks') {
        renderTasks();
    } else if (currentPage === 'invite') {
        // تحديث نصوص صفحة الدعوات
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && el.closest('#page-invite')) {
                el.textContent = t(key, { reward: APP_CONFIG.referralReward, needed: Math.max(0, APP_CONFIG.requiredReferrals - (currentUser?.inviteCount || 0)) });
            }
        });
    } else if (currentPage === 'withdraw') {
        // تحديث نصوص صفحة السحب
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && el.closest('#page-withdraw')) {
                el.textContent = t(key, { min: APP_CONFIG.minWithdraw, balance: currentUser?.balance?.toFixed(2) || '0.00' });
            }
        });
    }
}

// ============================================================================
// SECTION 8: TASKS SYSTEM
// ============================================================================

function renderTasks() {
    if (!tasksContainer) return;
    
    let html = '';
    let completedChannels = 0;
    let completedBots = 0;
    let totalReward = 0;
    
    // عرض القنوات
    html += `<div class="tasks-section"><h3>${t('tasks.channels')}</h3>`;
    TASKS_CONFIG.channels.forEach((channel, index) => {
        const isCompleted = channel.completed;
        if (isCompleted) completedChannels++;
        totalReward += channel.reward;
        
        html += `
            <div class="task-card" data-task-id="${channel.id}" data-task-type="channel">
                <div class="task-icon"><i class="fab fa-telegram"></i></div>
                <div class="task-info">
                    <h4>${channel.name}</h4>
                    <p>@${channel.username}</p>
                </div>
                <div class="task-reward">+$${channel.reward}</div>
                <button class="task-btn ${isCompleted ? 'completed' : ''}" onclick="completeTask('${channel.id}', 'channel', '${channel.username}')" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? '<i class="fas fa-check"></i> ' + t('tasks.done') : t('tasks.join')}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    // عرض البوتات
    html += `<div class="tasks-section"><h3>${t('tasks.bots')}</h3>`;
    TASKS_CONFIG.bots.forEach((bot, index) => {
        const isCompleted = bot.completed;
        if (isCompleted) completedBots++;
        totalReward += bot.reward;
        
        html += `
            <div class="task-card" data-task-id="${bot.id}" data-task-type="bot">
                <div class="task-icon"><i class="fas fa-robot"></i></div>
                <div class="task-info">
                    <h4>${bot.name}</h4>
                    <p>@${bot.username}</p>
                </div>
                <div class="task-reward">+$${bot.reward}</div>
                <button class="task-btn ${isCompleted ? 'completed' : ''}" onclick="completeTask('${bot.id}', 'bot', '${bot.username}')" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? '<i class="fas fa-check"></i> ' + t('tasks.done') : t('tasks.start')}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    tasksContainer.innerHTML = html;
    
    // تحديث الإحصائيات
    const totalTasks = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completedTasks = completedChannels + completedBots;
    const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    if (channelsCountEl) channelsCountEl.textContent = `${completedChannels}/${TASKS_CONFIG.channels.length}`;
    if (botsCountEl) botsCountEl.textContent = `${completedBots}/${TASKS_CONFIG.bots.length}`;
    if (tasksProgressFill) tasksProgressFill.style.width = `${progressPercent}%`;
    if (tasksTotalRewardEl) tasksTotalRewardEl.textContent = `$${totalReward.toFixed(2)}`;
}

function completeTask(taskId, type, username) {
    // فتح رابط التليجرام
    const link = `https://t.me/${username}`;
    tg?.openLink ? tg.openLink(link) : window.open(link, '_blank');
    
    // محاكاة التحقق بعد 3 ثواني
    setTimeout(() => {
        verifyTask(taskId, type);
    }, 3000);
}

async function verifyTask(taskId, type) {
    let taskCompleted = false;
    let reward = 0;
    
    if (type === 'channel') {
        const channel = TASKS_CONFIG.channels.find(c => c.id === taskId);
        if (channel && !channel.completed) {
            channel.completed = true;
            reward = channel.reward;
            taskCompleted = true;
        }
    } else if (type === 'bot') {
        const bot = TASKS_CONFIG.bots.find(b => b.id === taskId);
        if (bot && !bot.completed) {
            bot.completed = true;
            reward = bot.reward;
            taskCompleted = true;
        }
    }
    
    if (taskCompleted) {
        // تحديث الرصيد
        currentUser.balance = (currentUser.balance || 0) + reward;
        currentUser.totalEarned = (currentUser.totalEarned || 0) + reward;
        
        saveUserToLocal();
        updateUI();
        renderTasks();
        showToast(t('tasks.success', { amount: reward }), 'success');
    } else {
        showToast(t('tasks.error'), 'error');
    }
}

// ============================================================================
// SECTION 9: ADS SYSTEM
// ============================================================================

let adCooldown = false;

async function watchAd() {
    if (adCooldown) {
        showToast(t('ads.cooldown', { seconds: adCooldown }), 'warning');
        return;
    }
    
    if ((currentUser.adsToday || 0) >= APP_CONFIG.dailyLimit) {
        showToast(t('ads.limit.reached'), 'warning');
        return;
    }
    
    adCooldown = true;
    watchAdBtn.disabled = true;
    showToast(t('ads.loading'), 'info');
    
    // محاكاة مشاهدة إعلان (سيتم ربطها بشبكات إعلانية حقيقية لاحقاً)
    setTimeout(async () => {
        try {
            // إرسال طلب المكافأة إلى الخادم
            const response = await apiCall('/api/reward', 'POST', {
                initData: tg?.initData || ''
            });
            
            if (response.success) {
                currentUser.balance = response.balance;
                currentUser.totalEarned = response.totalEarned;
                currentUser.adsWatched = response.adsWatched;
                currentUser.adsToday = response.adsToday;
                
                saveUserToLocal();
                updateUI();
                showToast(t('ads.success', { amount: APP_CONFIG.adReward }), 'success');
            } else {
                showToast(response.error || t('ads.error'), 'error');
            }
        } catch (error) {
            showToast(t('ads.error'), 'error');
        } finally {
            adCooldown = false;
            watchAdBtn.disabled = false;
            
            if ((currentUser.adsToday || 0) >= APP_CONFIG.dailyLimit) {
                adStatusText.textContent = t('ads.limit.reached');
                adStatusDiv?.classList.remove('info');
                adStatusDiv?.classList.add('warning');
            } else {
                adStatusText.textContent = t('ads.ready');
                adStatusDiv?.classList.remove('warning');
                adStatusDiv?.classList.add('info');
            }
        }
    }, 2000);
}

// ============================================================================
// SECTION 10: INVITE SYSTEM
// ============================================================================

function copyInviteLink() {
    const link = inviteLinkEl?.value;
    if (link) {
        navigator.clipboard.writeText(link);
        showToast(t('invite.copied'), 'success');
    }
}

function shareInviteLink() {
    const link = inviteLinkEl?.value;
    if (link) {
        const text = `🌟 Join AdNova Network and earn real money by watching ads!\n\nUse my invite link: ${link}`;
        if (tg?.shareToStory) {
            tg.shareToStory(text);
        } else {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
            tg?.openTelegramLink ? tg.openTelegramLink(shareUrl) : window.open(shareUrl, '_blank');
        }
    }
}

// ============================================================================
// SECTION 11: WITHDRAW SYSTEM
// ============================================================================

let selectedMethod = 'paypal';

function selectWithdrawMethod(methodId) {
    selectedMethod = methodId;
    const method = APP_CONFIG.withdrawalMethods.find(m => m.id === methodId);
    
    // تحديث واجهة طرق الدفع
    document.querySelectorAll('.method-option').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add('selected');
    
    // تحديث حقل الوجهة
    if (withdrawDestination) {
        withdrawDestination.placeholder = method?.placeholder || 'Enter destination';
        withdrawDestination.value = '';
    }
}

async function submitWithdraw() {
    const amount = parseFloat(withdrawAmount?.value);
    const destination = withdrawDestination?.value.trim();
    
    if (!amount || amount < APP_CONFIG.minWithdraw) {
        showToast(t('withdraw.need.min', { min: APP_CONFIG.minWithdraw }), 'warning');
        return;
    }
    
    if (amount > (currentUser.balance || 0)) {
        showToast(t('withdraw.insufficient'), 'warning');
        return;
    }
    
    if ((currentUser.inviteCount || 0) < APP_CONFIG.requiredReferrals) {
        showToast(t('withdraw.needs.referrals', { needed: APP_CONFIG.requiredReferrals - (currentUser.inviteCount || 0) }), 'warning');
        return;
    }
    
    if (!destination) {
        showToast('Please enter destination', 'warning');
        return;
    }
    
    submitWithdrawBtn.disabled = true;
    submitWithdrawBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('withdraw.processing');
    
    try {
        const response = await apiCall('/api/withdraw/request', 'POST', {
            userId: currentUserId,
            userName: currentUser.userName,
            amount,
            method: selectedMethod,
            destination
        });
        
        if (response.success) {
            currentUser.balance = response.newBalance;
            currentUser.withdrawals = currentUser.withdrawals || [];
            currentUser.withdrawals.unshift({
                amount,
                method: selectedMethod,
                destination,
                status: 'pending',
                date: new Date().toISOString()
            });
            
            saveUserToLocal();
            updateUI();
            showToast(t('withdraw.success'), 'success');
            
            // إعادة تعيين النموذج
            withdrawAmount.value = '';
            withdrawDestination.value = '';
            
            showNotification('💸 Withdrawal Requested', `$${amount} via ${selectedMethod} is being processed`, 'info');
        } else {
            showToast(response.error || t('withdraw.error'), 'error');
        }
    } catch (error) {
        showToast(t('withdraw.error'), 'error');
    } finally {
        submitWithdrawBtn.disabled = false;
        submitWithdrawBtn.innerHTML = t('withdraw.submit');
    }
}

// ============================================================================
// SECTION 12: NOTIFICATIONS SYSTEM
// ============================================================================

function updateNotificationBadge() {
    if (!currentUser?.notifications) return;
    unreadNotifications = currentUser.notifications.filter(n => !n.read).length;
    if (notificationBadge) {
        notificationBadge.textContent = unreadNotifications;
        notificationBadge.style.display = unreadNotifications > 0 ? 'flex' : 'none';
    }
}

function renderNotifications() {
    if (!notificationsList || !currentUser?.notifications) return;
    
    const notifications = [...currentUser.notifications].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>${t('notifications.empty')}</p></div>`;
        return;
    }
    
    let html = '';
    notifications.forEach(notif => {
        const date = new Date(notif.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let icon = 'fa-bell';
        if (notif.type === 'success') icon = 'fa-check-circle';
        if (notif.type === 'error') icon = 'fa-exclamation-circle';
        if (notif.type === 'referral') icon = 'fa-users';
        if (notif.type === 'withdraw') icon = 'fa-money-bill-wave';
        
        html += `
            <div class="notification-item ${!notif.read ? 'unread' : ''}" onclick="markNotificationRead('${notif.id}')">
                <div class="notification-icon ${notif.type}"><i class="fas ${icon}"></i></div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${formattedDate}</div>
                </div>
            </div>
        `;
    });
    
    notificationsList.innerHTML = html;
}

function markNotificationRead(notificationId) {
    if (!currentUser?.notifications) return;
    const notif = currentUser.notifications.find(n => n.id === notificationId);
    if (notif && !notif.read) {
        notif.read = true;
        saveUserToLocal();
        updateNotificationBadge();
        renderNotifications();
    }
}

function clearReadNotifications() {
    if (!currentUser?.notifications) return;
    const readCount = currentUser.notifications.filter(n => n.read).length;
    if (readCount === 0) {
        showToast(t('notifications.no_read'), 'info');
        return;
    }
    
    if (confirm(t('notifications.confirm.clear.read'))) {
        currentUser.notifications = currentUser.notifications.filter(n => !n.read);
        saveUserToLocal();
        updateNotificationBadge();
        renderNotifications();
        showToast(t('notifications.cleared', { count: readCount }), 'success');
    }
}

function clearAllNotifications() {
    if (!currentUser?.notifications) return;
    if (confirm(t('notifications.confirm.clear.all'))) {
        currentUser.notifications = [];
        saveUserToLocal();
        updateNotificationBadge();
        renderNotifications();
        showToast('All notifications cleared', 'success');
    }
}

// ============================================================================
// SECTION 13: ADMIN PANEL (مدمجة بالكامل)
// ============================================================================

let adminStats = {
    totalUsers: 0,
    pendingWithdrawals: 0,
    totalBalance: 0,
    totalEarned: 0
};

let pendingWithdrawals = [];
let allUsers = [];

function showAdminAuth() {
    if (adminAuthModal) {
        adminAuthModal.classList.add('show');
        adminPasswordInput.value = '';
        adminAuthError.style.display = 'none';
    }
}

async function verifyAdminPassword() {
    const password = adminPasswordInput.value;
    if (!password) return;
    
    try {
        const response = await apiCall('/api/admin/verify', 'POST', { password });
        if (response.success) {
            adminAuthenticated = true;
            adminAuthToken = password;
            adminAuthModal.classList.remove('show');
            showAdminPanel();
        } else {
            adminAuthError.style.display = 'block';
        }
    } catch (error) {
        adminAuthError.style.display = 'block';
    }
}

async function showAdminPanel() {
    if (!adminAuthenticated) {
        showAdminAuth();
        return;
    }
    
    adminPanel.classList.remove('hidden');
    await loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() {
    adminPanel.classList.add('hidden');
}

async function loadAdminData() {
    try {
        const statsRes = await apiCall('/api/admin/stats', 'GET', null, true);
        if (statsRes.success) {
            adminStats = statsRes.stats;
        }
        
        const withdrawalsRes = await apiCall('/api/admin/pending-withdrawals', 'GET', null, true);
        if (withdrawalsRes.success) {
            pendingWithdrawals = withdrawalsRes.withdrawals || [];
        }
        
        const usersRes = await apiCall('/api/admin/users', 'GET', null, true);
        if (usersRes.success) {
            allUsers = usersRes.users || [];
        }
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

function renderAdminDashboard() {
    if (!adminContent) return;
    
    // عرض الإحصائيات
    adminContent.innerHTML = `
        <div class="admin-stats-grid">
            <div class="admin-stat-card" onclick="showAdminSection('dashboard')">
                <i class="fas fa-users"></i>
                <div class="stat-value">${adminStats.totalUsers}</div>
                <div class="stat-label">${t('admin.total.users')}</div>
            </div>
            <div class="admin-stat-card" onclick="showAdminSection('pending')">
                <i class="fas fa-clock"></i>
                <div class="stat-value">${adminStats.pendingWithdrawals}</div>
                <div class="stat-label">${t('admin.pending.count')}</div>
            </div>
            <div class="admin-stat-card">
                <i class="fas fa-dollar-sign"></i>
                <div class="stat-value">$${adminStats.totalBalance?.toFixed(2) || '0.00'}</div>
                <div class="stat-label">${t('admin.total.balance')}</div>
            </div>
            <div class="admin-stat-card">
                <i class="fas fa-chart-line"></i>
                <div class="stat-value">$${adminStats.totalEarned?.toFixed(2) || '0.00'}</div>
                <div class="stat-label">${t('admin.total.earned')}</div>
            </div>
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
    
    // تحديث تبويب نشط
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    if (section === 'pending') document.querySelectorAll('.admin-tab')[0]?.classList.add('active');
    if (section === 'users') document.querySelectorAll('.admin-tab')[1]?.classList.add('active');
    if (section === 'broadcast') document.querySelectorAll('.admin-tab')[2]?.classList.add('active');
    
    if (section === 'pending') {
        renderPendingWithdrawals(container);
    } else if (section === 'users') {
        renderUsersList(container);
    } else if (section === 'broadcast') {
        renderBroadcastInterface(container);
    }
}

function renderPendingWithdrawals(container) {
    if (!pendingWithdrawals.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No pending withdrawals</p></div>`;
        return;
    }
    
    let html = '<div class="admin-withdrawals-list">';
    pendingWithdrawals.forEach(w => {
        const date = new Date(w.createdAt?.seconds * 1000 || Date.now());
        html += `
            <div class="admin-card">
                <div class="admin-card-header">
                    <span class="user-name">👤 ${w.userName || w.userId.substring(0, 8)}</span>
                    <span class="withdraw-amount">$${w.amount.toFixed(2)}</span>
                </div>
                <div class="admin-card-details">
                    <div><strong>ID:</strong> ${w.userId}</div>
                    <div><strong>Method:</strong> ${w.method}</div>
                    <div><strong>Destination:</strong> ${w.destination}</div>
                    <div><strong>Date:</strong> ${date.toLocaleString()}</div>
                    <div class="admin-stats-row">
                        <span class="stat-badge">📊 Invites: ${w.user?.inviteCount || 0}</span>
                        <span class="stat-badge">📺 Ads: ${w.user?.adsWatched || 0}</span>
                    </div>
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
                <div class="admin-card-header">
                    <span class="user-name">👤 ${user.userName || 'User'}</span>
                    <span class="user-balance">💰 $${user.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="admin-card-details">
                    <div><strong>ID:</strong> ${user.userId}</div>
                    <div class="admin-stats-row">
                        <span class="stat-badge">👥 Invites: ${user.inviteCount || 0}</span>
                        <span class="stat-badge">📺 Ads: ${user.adsWatched || 0}</span>
                        <span class="stat-badge">💵 Earned: $${user.totalEarned?.toFixed(2) || '0.00'}</span>
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

async function approveWithdrawal(withdrawalId) {
    const response = await apiCall('/api/admin/approve-withdrawal', 'POST', { withdrawalId }, true);
    if (response.success) {
        showToast('Withdrawal approved!', 'success');
        await loadAdminData();
        showAdminSection('pending');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function rejectWithdrawal(withdrawalId) {
    const reason = prompt(t('admin.reject.reason'));
    if (!reason) return;
    
    const response = await apiCall('/api/admin/reject-withdrawal', 'POST', { withdrawalId, reason }, true);
    if (response.success) {
        showToast('Withdrawal rejected!', 'success');
        await loadAdminData();
        showAdminSection('pending');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function adminAddBalance(userId) {
    const amount = parseFloat(prompt('Enter amount to add (USD):'));
    if (isNaN(amount) || amount <= 0) return;
    
    const response = await apiCall('/api/admin/add-balance', 'POST', { userId, amount }, true);
    if (response.success) {
        showToast(`$${amount} added to user!`, 'success');
        await loadAdminData();
        showAdminSection('users');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function adminRemoveBalance(userId) {
    const amount = parseFloat(prompt('Enter amount to remove (USD):'));
    if (isNaN(amount) || amount <= 0) return;
    
    const response = await apiCall('/api/admin/remove-balance', 'POST', { userId, amount }, true);
    if (response.success) {
        showToast(`$${amount} removed from user!`, 'success');
        await loadAdminData();
        showAdminSection('users');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function adminBlockUser(userId) {
    if (!confirm('⚠️ Permanently block this user from withdrawals?')) return;
    
    const response = await apiCall('/api/admin/block-user', 'POST', { userId }, true);
    if (response.success) {
        showToast('User blocked!', 'success');
        await loadAdminData();
        showAdminSection('users');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function adminUnblockUser(userId) {
    const response = await apiCall('/api/admin/unblock-user', 'POST', { userId }, true);
    if (response.success) {
        showToast('User unblocked!', 'success');
        await loadAdminData();
        showAdminSection('users');
    } else {
        showToast('Error: ' + response.error, 'error');
    }
}

async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage')?.value;
    if (!message) return;
    
    const response = await apiCall('/api/admin/broadcast', 'POST', { message }, true);
    if (response.success) {
        showToast(t('admin.broadcast.success', { count: response.notifiedCount }), 'success');
        document.getElementById('broadcastMessage').value = '';
    } else {
        showToast('Error sending broadcast', 'error');
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase();
    const userCards = document.querySelectorAll('.user-card');
    
    userCards.forEach(card => {
        const userId = card.getAttribute('data-user-id')?.toLowerCase();
        const userName = card.getAttribute('data-user-name')?.toLowerCase();
        const matches = userId?.includes(searchTerm) || userName?.includes(searchTerm);
        card.style.display = matches ? 'block' : 'none';
    });
}

// ============================================================================
// SECTION 14: NAVIGATION
// ============================================================================

function switchTab(page) {
    currentPage = page;
    
    // إخفاء جميع الصفحات
    pages.forEach(p => {
        const pageEl = document.getElementById(`page-${p}`);
        if (pageEl) pageEl.classList.remove('active');
    });
    
    // إظهار الصفحة المحددة
    const activePage = document.getElementById(`page-${page}`);
    if (activePage) activePage.classList.add('active');
    
    // تحديث التنقل السفلي
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // تحديث المحتوى حسب الصفحة
    if (page === 'tasks') {
        renderTasks();
    } else if (page === 'invite') {
        refreshCurrentPage();
    } else if (page === 'withdraw') {
        refreshCurrentPage();
        // إعادة تعيين طريقة السحب المحددة
        if (APP_CONFIG.withdrawalMethods.length) {
            selectWithdrawMethod(APP_CONFIG.withdrawalMethods[0].id);
        }
    } else if (page === 'ads') {
        refreshCurrentPage();
    }
}

// ============================================================================
// SECTION 15: NOTIFICATION FUNCTIONS
// ============================================================================

function showNotification(title, message, type = 'info') {
    if (!currentUser) return;
    
    const notification = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
        title: title,
        message: message,
        type: type,
        read: false,
        timestamp: new Date().toISOString()
    };
    
    if (!currentUser.notifications) currentUser.notifications = [];
    currentUser.notifications.unshift(notification);
    
    // حفظ في الكاش
    saveUserToLocal();
    updateNotificationBadge();
    
    // إرسال إلى الخادم
    fetch('/api/users/' + currentUserId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { notifications: currentUser.notifications } })
    }).catch(e => console.error('Error saving notification:', e));
    
    // عرض توست فوري
    showToast(message, type);
}

function showNotificationsModal() {
    renderNotifications();
    notificationsModal.classList.add('show');
}

function closeNotificationsModal() {
    notificationsModal.classList.remove('show');
}

// ============================================================================
// SECTION 16: INITIALIZATION
// ============================================================================

function hideSplash() {
    if (splashScreen) {
        splashScreen.classList.add('hidden');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (bottomNav) bottomNav.style.display = 'flex';
        }, 500);
    }
}

// ============================================================================
// SECTION 17: EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🌟 AdNova Network - Loading...");
    
    // تعيين مستمعي الأحداث
    if (watchAdBtn) watchAdBtn.onclick = watchAd;
    if (copyInviteBtn) copyInviteBtn.onclick = copyInviteLink;
    if (shareInviteBtn) shareInviteBtn.onclick = shareInviteLink;
    if (submitWithdrawBtn) submitWithdrawBtn.onclick = submitWithdraw;
    if (notificationBtn) notificationBtn.onclick = showNotificationsModal;
    if (clearReadBtn) clearReadBtn.onclick = clearReadNotifications;
    if (clearAllBtn) clearAllBtn.onclick = clearAllNotifications;
    
    // تهيئة واجهة طرق الدفع
    if (withdrawMethodsContainer && APP_CONFIG.withdrawalMethods) {
        withdrawMethodsContainer.innerHTML = APP_CONFIG.withdrawalMethods.map(method => `
            <div class="method-option" data-method="${method.id}" onclick="selectWithdrawMethod('${method.id}')">
                <i class="${method.icon}"></i>
                <span>${method.name}</span>
            </div>
        `).join('');
    }
    
    // بدء التطبيق
    initUser();
});

// ============================================================================
// SECTION 18: EXPOSE GLOBALS
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
window.closeNotificationsModal = closeNotificationsModal;
window.showNotificationsModal = showNotificationsModal;

console.log("✅ AdNova Network - Fully Loaded!");
console.log("💰 Ad Reward: $" + APP_CONFIG.adReward);
console.log("📊 Daily Limit: " + APP_CONFIG.dailyLimit);
console.log("💸 Min Withdraw: $" + APP_CONFIG.minWithdraw);
console.log("👥 Required Referrals: " + APP_CONFIG.requiredReferrals);
