// ============================================================================
// ADNOVA NETWORK - COMPLETE FRONTEND v3.0
// جميع الميزات - بدون مفاتيح حساسة (تُجلب من الخادم)
// ============================================================================

// ============================================================================
// 1. TELEGRAM WEBAPP INITIALIZATION
// ============================================================================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation?.();
    console.log("✅ Telegram WebApp initialized");
}

// ============================================================================
// 2. GLOBAL STATE
// ============================================================================

let currentUser = null;
let currentUserId = null;
let currentPage = 'ads';
let adminAuthenticated = false;
let adminAuthToken = null;
let unreadNotifications = 0;
let currentLanguage = localStorage.getItem('adnova_lang') || 'en';
let adCooldown = false;
let selectedWithdrawMethod = 'paypal';
let adminStats = { totalUsers: 0, pendingWithdrawals: 0, totalBalance: 0, totalEarned: 0 };
let pendingWithdrawals = [];
let allUsers = [];

// إعدادات التطبيق (تُجلب من الخادم)
let APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: 'AdNovaNetworkbot'
};

// مهام القنوات والبوتات (تُجلب من الخادم أو تخزين محلي)
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
// 3. TRANSLATION SYSTEM (10 LANGUAGES + RTL)
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
        'notifications.title': 'Notifications',
        'notifications.empty': 'No notifications',
        'notifications.clear.read': 'Clear Read',
        'notifications.clear.all': 'Clear All',
        'admin.title': 'Admin Panel',
        'admin.pending': 'Pending Withdrawals',
        'admin.users': 'Users',
        'admin.broadcast': 'Broadcast',
        'admin.total.users': 'Total Users',
        'admin.pending.count': 'Pending',
        'admin.total.balance': 'Total Balance',
        'admin.total.earned': 'Total Earned',
        'admin.approve': 'Approve',
        'admin.reject': 'Reject',
        'admin.block': 'Block',
        'admin.add.balance': 'Add Balance',
        'admin.remove.balance': 'Remove Balance',
        'admin.broadcast.message': 'Broadcast Message',
        'admin.broadcast.send': 'Send',
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
        'tasks.title': 'أكمل المهام',
        'tasks.subtitle': 'اربح مكافآت إضافية',
        'tasks.channels': 'قنوات تليجرام',
        'tasks.bots': 'بوتات تليجرام',
        'tasks.join': 'انضم',
        'tasks.start': 'ابدأ',
        'tasks.done': 'تم',
        'invite.title': 'ادعُ واربح',
        'invite.subtitle': 'احصل على $${reward} لكل صديق',
        'invite.link': 'رابط دعوتك',
        'invite.copy': 'نسخ',
        'invite.copied': 'تم نسخ الرابط!',
        'invite.share': 'مشاركة',
        'invite.total': 'إجمالي الدعوات',
        'invite.earned': 'الأرباح من الدعوات',
        'withdraw.title': 'سحب الأموال',
        'withdraw.subtitle': 'الحد الأدنى $${min}',
        'withdraw.method': 'طريقة الدفع',
        'withdraw.destination': 'جهة الدفع',
        'withdraw.amount': 'المبلغ',
        'withdraw.available': 'المتاح: $${balance}',
        'withdraw.submit': 'إرسال الطلب',
        'notifications.title': 'الإشعارات',
        'toast.copied': 'تم النسخ إلى الحافظة!'
    }
    // باقي اللغات (es, fr, ru, pt, hi, id, tr, fa) بنفس الهيكل
};

function t(key, params = {}) {
    let text = TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || key;
    Object.keys(params).forEach(p => { text = text.replace(`\${${p}}`, params[p]); });
    return text;
}

function applyLanguage() {
    const html = document.documentElement;
    if (currentLanguage === 'ar' || currentLanguage === 'fa') {
        html.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
    } else {
        html.setAttribute('dir', 'ltr');
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
    const idx = (languages.indexOf(currentLanguage) + 1) % languages.length;
    currentLanguage = languages[idx];
    localStorage.setItem('adnova_lang', currentLanguage);
    applyLanguage();
    showToast(t('success'), 'success');
}

// ============================================================================
// 4. AD PLATFORMS (5 منصات إعلانية)
// ============================================================================

const AD_PLATFORMS = [
    {
        name: 'Monetag',
        show: () => typeof show_10895553 === 'function' ? show_10895553() : Promise.reject('Monetag not ready')
    },
    {
        name: 'AdsGram',
        init: () => { if (!window.AdsgramController && window.Adsgram) { window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" }); } },
        show: () => {
            if (!window.AdsgramController && window.Adsgram) window.AdsgramController = window.Adsgram.init({ blockId: "int-28433" });
            return window.AdsgramController?.show ? window.AdsgramController.show() : Promise.reject('AdsGram not ready');
        }
    },
    {
        name: 'OnClickA',
        init: () => { if (typeof window.initCdTma === 'function') { window.initCdTma({ id: '6117305' }).then(s => window.showOnClickaAd = s); } },
        show: () => window.showOnClickaAd ? window.showOnClickaAd() : Promise.reject('OnClickA not ready')
    },
    {
        name: 'Adexium',
        init: () => { if (!window.adexiumWidget && typeof AdexiumWidget !== 'undefined') { window.adexiumWidget = new AdexiumWidget({ wid: 'd671ae85-bab7-4128-9182-50151e2ca8a6', adFormat: 'interstitial' }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.adexiumWidget) reject('Adexium not ready');
            let resolved = false;
            const timeout = setTimeout(() => { if (!resolved) reject('Timeout'); }, 15000);
            window.adexiumWidget.on('adPlaybackCompleted', () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(); } });
            window.adexiumWidget.on('adClosed', () => { if (!resolved) { clearTimeout(timeout); reject('Ad closed'); } });
            window.adexiumWidget.on('noAdFound', () => { if (!resolved) { clearTimeout(timeout); reject('No ad'); } });
            window.adexiumWidget.requestAd('interstitial');
        })
    },
    {
        name: 'RichAds',
        init: () => { if (!window.richadsController && typeof TelegramAdsController !== 'undefined') { window.richadsController = new TelegramAdsController(); window.richadsController.initialize({ pubId: "1009657", appId: "7207", debug: false }); } },
        show: () => new Promise((resolve, reject) => {
            if (!window.richadsController) reject('RichAds not ready');
            let resolved = false;
            const timeout = setTimeout(() => { if (!resolved) reject('Timeout'); }, 15000);
            const onSuccess = () => { if (!resolved) { resolved = true; clearTimeout(timeout); resolve(); } };
            const onError = (e) => { if (!resolved) { clearTimeout(timeout); reject(e); } };
            if (typeof window.richadsController.triggerInterstitialVideo === 'function') window.richadsController.triggerInterstitialVideo().then(onSuccess).catch(onError);
            else if (typeof window.richadsController.showInterstitial === 'function') window.richadsController.showInterstitial().then(onSuccess).catch(onError);
            else reject('No show method');
        })
    }
];

function initAdPlatforms() { AD_PLATFORMS.forEach(p => { if (p.init) try { p.init(); } catch(e) {} }); }

// ============================================================================
// 5. USER DATA MANAGEMENT (localStorage + Server)
// ============================================================================

function getTelegramUserId() { return tg?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('adnova_user_id') || 'guest_' + Math.random().toString(36).substr(2, 9); }
function getUserName() { return tg?.initDataUnsafe?.user?.first_name || localStorage.getItem('adnova_user_name') || 'User'; }

function loadUserData() {
    currentUserId = getTelegramUserId();
    const saved = localStorage.getItem(`adnova_user_${currentUserId}`);
    if (saved) { currentUser = JSON.parse(saved); }
    else {
        currentUser = {
            userId: currentUserId, userName: getUserName(), balance: 0, totalEarned: 0, adsWatched: 0, adsToday: 0,
            lastAdDate: new Date().toISOString().split('T')[0], inviteCount: 0, referredBy: null, referrals: [],
            withdrawals: [], notifications: [], withdrawalUnlocked: false, settings: {}
        };
        saveUserData();
        processReferralFromUrl();
    }
    const today = new Date().toISOString().split('T')[0];
    if (currentUser.lastAdDate !== today) { currentUser.adsToday = 0; currentUser.lastAdDate = today; saveUserData(); }
    updateUI();
    return currentUser;
}

function saveUserData() { localStorage.setItem(`adnova_user_${currentUserId}`, JSON.stringify(currentUser)); }

// ============================================================================
// 6. REFERRAL SYSTEM (مع startapp مرتين)
// ============================================================================

function getReferralFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get('startapp');
    if (!ref && tg?.initDataUnsafe?.start_param) ref = tg.initDataUnsafe.start_param;
    if (!ref) ref = urlParams.get('ref');
    return ref;
}

function processReferralFromUrl() {
    const refCode = getReferralFromUrl();
    if (!refCode || refCode === currentUserId || currentUser.referredBy) return;
    const processedKey = `ref_processed_${currentUserId}`;
    if (localStorage.getItem(processedKey) === refCode) return;
    
    // تحديث المُحيل
    const referrerData = localStorage.getItem(`adnova_user_${refCode}`);
    if (referrerData) {
        const referrer = JSON.parse(referrerData);
        if (!referrer.referrals.includes(currentUserId)) {
            referrer.referrals.push(currentUserId);
            referrer.inviteCount++;
            referrer.balance += APP_CONFIG.referralBonus;
            referrer.totalEarned += APP_CONFIG.referralBonus;
            referrer.notifications.unshift({ id: Date.now(), title: '🎉 New Referral!', message: `+$${APP_CONFIG.referralBonus} added!`, type: 'success', read: false, timestamp: new Date().toISOString() });
            localStorage.setItem(`adnova_user_${refCode}`, JSON.stringify(referrer));
        }
    }
    currentUser.referredBy = refCode;
    currentUser.balance += APP_CONFIG.welcomeBonus;
    currentUser.totalEarned += APP_CONFIG.welcomeBonus;
    currentUser.notifications.unshift({ id: Date.now(), title: '🎉 Welcome!', message: `+$${APP_CONFIG.welcomeBonus} welcome bonus!`, type: 'success', read: false, timestamp: new Date().toISOString() });
    localStorage.setItem(processedKey, refCode);
    saveUserData();
}

function getReferralLink() { return `https://t.me/${APP_CONFIG.botUsername}/app?startapp=${currentUserId}`; }
function copyInviteLink() { const link = document.getElementById('inviteLink')?.value; if (link) { navigator.clipboard.writeText(link); showToast(t('invite.copied'), 'success'); } }
function shareInviteLink() { const link = getReferralLink(); const text = `Join AdNova Network and earn real money!\n\n${link}`; if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`); else window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank'); }

// ============================================================================
// 7. ADS SYSTEM
// ============================================================================

async function watchAd() {
    if (adCooldown) { showToast(t('ads.cooldown', { seconds: '3' }), 'warning'); return; }
    if (currentUser.adsToday >= APP_CONFIG.dailyAdLimit) { showToast(t('ads.limit.reached'), 'warning'); return; }
    
    adCooldown = true;
    const btn = document.getElementById('watchAdBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
    
    initAdPlatforms();
    const shuffled = [...AD_PLATFORMS].sort(() => Math.random() - 0.5);
    let adShown = false;
    for (const p of shuffled) { if (!adShown) { try { await p.show(); adShown = true; } catch(e) {} } }
    
    if (adShown) {
        currentUser.balance += APP_CONFIG.adReward;
        currentUser.totalEarned += APP_CONFIG.adReward;
        currentUser.adsWatched++;
        currentUser.adsToday++;
        saveUserData();
        updateUI();
        showToast(t('ads.success', { amount: APP_CONFIG.adReward.toFixed(2) }), 'success');
        checkWithdrawalUnlock();
    } else { showToast(t('ads.error'), 'error'); }
    
    adCooldown = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> ' + t('ads.watch'); }
}

function checkWithdrawalUnlock() {
    const can = currentUser.balance >= APP_CONFIG.minWithdraw && currentUser.inviteCount >= APP_CONFIG.requiredReferrals;
    if (can && !currentUser.withdrawalUnlocked) {
        currentUser.withdrawalUnlocked = true;
        saveUserData();
        addNotification('🎉 Withdrawal Unlocked!', `You can now withdraw $${currentUser.balance.toFixed(2)}!`, 'success');
    }
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
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    let html = '', chComp = 0, btComp = 0, totalReward = 0;
    html += `<div class="tasks-section"><h3>📢 ${t('tasks.channels')}</h3>`;
    TASKS_CONFIG.channels.forEach(ch => { if (ch.completed) chComp++; totalReward += ch.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fab fa-telegram"></i></div><div class="task-info"><h4>${ch.name}</h4><p>@${ch.username}</p></div><div class="task-reward">+$${ch.reward}</div><button class="task-btn ${ch.completed ? 'completed' : ''}" onclick="completeTask('${ch.id}', 'channel', '${ch.username}')" ${ch.completed ? 'disabled' : ''}>${ch.completed ? '✓ ' + t('tasks.done') : t('tasks.join')}</button></div>`;
    });
    html += `</div><div class="tasks-section"><h3>🤖 ${t('tasks.bots')}</h3>`;
    TASKS_CONFIG.bots.forEach(bt => { if (bt.completed) btComp++; totalReward += bt.reward;
        html += `<div class="task-card"><div class="task-icon"><i class="fas fa-robot"></i></div><div class="task-info"><h4>${bt.name}</h4><p>@${bt.username}</p></div><div class="task-reward">+$${bt.reward}</div><button class="task-btn ${bt.completed ? 'completed' : ''}" onclick="completeTask('${bt.id}', 'bot', '${bt.username}')" ${bt.completed ? 'disabled' : ''}>${bt.completed ? '✓ ' + t('tasks.done') : t('tasks.start')}</button></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
    const total = TASKS_CONFIG.channels.length + TASKS_CONFIG.bots.length;
    const completed = chComp + btComp;
    document.getElementById('channelsCount').textContent = `${chComp}/${TASKS_CONFIG.channels.length}`;
    document.getElementById('botsCount').textContent = `${btComp}/${TASKS_CONFIG.bots.length}`;
    document.getElementById('tasksProgressFill').style.width = `${(completed/total)*100}%`;
    document.getElementById('tasksTotalReward').textContent = `$${totalReward.toFixed(2)}`;
}

function completeTask(id, type, username) {
    window.open(`https://t.me/${username}`, '_blank');
    setTimeout(() => {
        let task = type === 'channel' ? TASKS_CONFIG.channels.find(t => t.id === id) : TASKS_CONFIG.bots.find(t => t.id === id);
        if (task && !task.completed) {
            task.completed = true;
            saveTasksProgress();
            currentUser.balance += task.reward;
            currentUser.totalEarned += task.reward;
            saveUserData();
            updateUI();
            renderTasks();
            showToast(t('tasks.success', { amount: task.reward.toFixed(2) }), 'success');
            addNotification('✅ Task Completed!', `+$${task.reward.toFixed(2)} added!`, 'success');
            checkWithdrawalUnlock();
        } else { showToast(t('tasks.error'), 'error'); }
    }, 3000);
}

// ============================================================================
// 9. WITHDRAW SYSTEM
// ============================================================================

function renderWithdrawMethods() {
    const container = document.getElementById('withdrawMethodsContainer');
    if (!container) return;
    container.innerHTML = CONFIG.WITHDRAWAL_METHODS.map(m => `<div class="method-option ${m.id === selectedWithdrawMethod ? 'selected' : ''}" data-method="${m.id}" onclick="selectWithdrawMethod('${m.id}')"><i class="${m.icon}"></i><span>${m.name}</span></div>`).join('');
}

function selectWithdrawMethod(methodId) {
    selectedWithdrawMethod = methodId;
    document.querySelectorAll('.method-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.method-option[data-method="${methodId}"]`)?.classList.add('selected');
    const m = CONFIG.WITHDRAWAL_METHODS.find(m => m.id === methodId);
    if (m && document.getElementById('withdrawDestination')) document.getElementById('withdrawDestination').placeholder = m.placeholder;
}

async function submitWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
    const dest = document.getElementById('withdrawDestination')?.value.trim();
    if (!amount || amount < APP_CONFIG.minWithdraw) { showToast(t('withdraw.need.min', { min: APP_CONFIG.minWithdraw }), 'warning'); return; }
    if (amount > currentUser.balance) { showToast(t('withdraw.insufficient'), 'warning'); return; }
    if (currentUser.inviteCount < APP_CONFIG.requiredReferrals) { showToast(t('withdraw.needs.referrals', { needed: APP_CONFIG.requiredReferrals - currentUser.inviteCount }), 'warning'); return; }
    if (!dest) { showToast('Please enter destination', 'warning'); return; }
    
    const btn = document.getElementById('submitWithdrawBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('withdraw.processing'); }
    
    try {
        const response = await fetch('/api/withdraw/request', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, userName: currentUser.userName, amount, method: selectedWithdrawMethod, destination: dest })
        });
        const data = await response.json();
        if (data.success) {
            currentUser.balance = data.newBalance;
            currentUser.withdrawals.unshift({ id: Date.now(), amount, method: selectedWithdrawMethod, destination: dest, status: 'pending', date: new Date().toISOString() });
            saveUserData();
            updateUI();
            showToast(t('withdraw.success'), 'success');
            document.getElementById('withdrawAmount').value = '';
            document.getElementById('withdrawDestination').value = '';
            addNotification('💸 Withdrawal Requested', `$${amount.toFixed(2)} via ${selectedWithdrawMethod} is being processed`, 'info');
        } else { showToast(data.error || t('withdraw.error'), 'error'); }
    } catch(e) { showToast(t('withdraw.error'), 'error'); }
    if (btn) { btn.disabled = false; btn.innerHTML = t('withdraw.submit'); }
}

// ============================================================================
// 10. NOTIFICATIONS SYSTEM
// ============================================================================

function addNotification(title, message, type = 'info') {
    if (!currentUser) return;
    currentUser.notifications.unshift({ id: Date.now(), title, message, type, read: false, timestamp: new Date().toISOString() });
    if (currentUser.notifications.length > 50) currentUser.notifications = currentUser.notifications.slice(0, 50);
    saveUserData();
    updateNotificationBadge();
    if (document.getElementById('notificationsModal')?.classList.contains('show')) renderNotifications();
    showToast(message, type);
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge && currentUser) {
        const unread = currentUser.notifications.filter(n => !n.read).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container || !currentUser) return;
    const notifs = currentUser.notifications || [];
    if (notifs.length === 0) { container.innerHTML = '<div class="empty-state">📭 ' + t('notifications.empty') + '</div>'; return; }
    let html = '';
    notifs.forEach(n => {
        const date = new Date(n.timestamp);
        const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += `<div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')"><div class="notification-icon ${n.type}"><i class="fas ${n.type === 'success' ? 'fa-check-circle' : 'fa-bell'}"></i></div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-message">${n.message}</div><div class="notification-time">${formatted}</div></div></div>`;
    });
    container.innerHTML = html;
}

function markNotificationRead(id) {
    const n = currentUser.notifications.find(n => n.id == id);
    if (n && !n.read) { n.read = true; saveUserData(); updateNotificationBadge(); renderNotifications(); }
}

function clearReadNotifications() {
    if (!currentUser.notifications) return;
    const readCount = currentUser.notifications.filter(n => n.read).length;
    if (readCount === 0) { showToast('No read notifications', 'info'); return; }
    if (confirm(t('notifications.confirm.clear.read'))) {
        currentUser.notifications = currentUser.notifications.filter(n => !n.read);
        saveUserData(); updateNotificationBadge(); renderNotifications();
        showToast(`Cleared ${readCount} notifications`, 'success');
    }
}

function clearAllNotifications() {
    if (!currentUser.notifications?.length) return;
    if (confirm(t('notifications.confirm.clear.all'))) {
        currentUser.notifications = [];
        saveUserData(); updateNotificationBadge(); renderNotifications();
        showToast('All notifications cleared', 'success');
    }
}

function showNotificationsModal() { renderNotifications(); document.getElementById('notificationsModal')?.classList.add('show'); }
function closeNotificationsModal() { document.getElementById('notificationsModal')?.classList.remove('show'); }

// ============================================================================
// 11. ADMIN PANEL (مخفية بكلمة مرور - جميع البيانات من الخادم)
// ============================================================================

function showAdminAuth() { document.getElementById('adminAuthModal')?.classList.add('show'); }

async function verifyAdminPassword() {
    const password = document.getElementById('adminPasswordInput')?.value;
    if (!password) return;
    const response = await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await response.json();
    if (data.success) {
        adminAuthenticated = true;
        document.getElementById('adminAuthModal')?.classList.remove('show');
        showAdminPanel();
    } else { document.getElementById('adminAuthError').style.display = 'block'; }
}

async function showAdminPanel() {
    if (!adminAuthenticated) { showAdminAuth(); return; }
    document.getElementById('adminPanel')?.classList.remove('hidden');
    await loadAdminData();
    renderAdminDashboard();
}

function closeAdminPanel() { document.getElementById('adminPanel')?.classList.add('hidden'); }

async function loadAdminData() {
    const stats = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }).then(r => r.json()).catch(() => ({}));
    if (stats.success) adminStats = stats.stats;
    const withdrawals = await fetch('/api/admin/pending-withdrawals', { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }).then(r => r.json()).catch(() => ({}));
    if (withdrawals.success) pendingWithdrawals = withdrawals.withdrawals || [];
    const users = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }).then(r => r.json()).catch(() => ({}));
    if (users.success) allUsers = users.users || [];
}

function renderAdminDashboard() {
    const container = document.getElementById('adminContent');
    if (!container) return;
    container.innerHTML = `<div class="admin-stats-grid"><div class="admin-stat-card"><i class="fas fa-users"></i><div class="stat-value">${adminStats.totalUsers}</div><div class="stat-label">${t('admin.total.users')}</div></div><div class="admin-stat-card"><i class="fas fa-clock"></i><div class="stat-value">${adminStats.pendingWithdrawals}</div><div class="stat-label">${t('admin.pending.count')}</div></div><div class="admin-stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-value">$${adminStats.totalBalance?.toFixed(2) || '0.00'}</div><div class="stat-label">${t('admin.total.balance')}</div></div><div class="admin-stat-card"><i class="fas fa-chart-line"></i><div class="stat-value">$${adminStats.totalEarned?.toFixed(2) || '0.00'}</div><div class="stat-label">${t('admin.total.earned')}</div></div></div><div class="admin-tabs"><button class="admin-tab active" onclick="showAdminSection('pending')">${t('admin.pending')}</button><button class="admin-tab" onclick="showAdminSection('users')">${t('admin.users')}</button><button class="admin-tab" onclick="showAdminSection('broadcast')">${t('admin.broadcast')}</button></div><div id="adminSectionContent"></div>`;
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
    if (!pendingWithdrawals.length) { container.innerHTML = '<div class="empty-state">No pending withdrawals</div>'; return; }
    let html = '';
    pendingWithdrawals.forEach(w => {
        const date = new Date(w.createdAt?.seconds * 1000 || Date.now());
        html += `<div class="admin-card"><div class="admin-card-header"><span>👤 ${w.userName || w.userId}</span><span class="withdraw-amount">$${w.amount.toFixed(2)}</span></div><div class="admin-card-details"><div>ID: ${w.userId}</div><div>📊 Invites: ${w.user?.inviteCount || 0}</div><div>📺 Ads: ${w.user?.adsWatched || 0}</div><div>Method: ${w.method}</div><div>Destination: ${w.destination}</div><div>Date: ${date.toLocaleString()}</div></div><div class="admin-card-actions"><button class="btn-approve" onclick="approveWithdrawal('${w.id}')">✅ ${t('admin.approve')}</button><button class="btn-reject" onclick="rejectWithdrawal('${w.id}')">❌ ${t('admin.reject')}</button></div></div>`;
    });
    container.innerHTML = html;
}

function renderUsersList(container) {
    if (!allUsers.length) { container.innerHTML = '<div class="empty-state">No users found</div>'; return; }
    let html = '<div class="admin-users-list"><div class="search-bar"><input type="text" id="userSearchInput" placeholder="Search by ID or name..." onkeyup="filterUsers()"></div>';
    allUsers.forEach(u => {
        html += `<div class="admin-card user-card" data-user-id="${u.userId}" data-user-name="${u.userName}"><div class="admin-card-header"><span>👤 ${u.userName || 'User'}</span><span class="user-balance">💰 $${u.balance?.toFixed(2) || '0.00'}</span></div><div class="admin-card-details"><div>ID: ${u.userId}</div><div>👥 Invites: ${u.inviteCount || 0} | 📺 Ads: ${u.adsWatched || 0}</div></div><div class="admin-card-actions"><button class="btn-add" onclick="adminAddBalance('${u.userId}')">➕ ${t('admin.add.balance')}</button><button class="btn-remove" onclick="adminRemoveBalance('${u.userId}')">➖ ${t('admin.remove.balance')}</button>${u.withdrawBlocked ? `<button class="btn-unblock" onclick="adminUnblockUser('${u.userId}')">🔓 ${t('admin.unblock')}</button>` : `<button class="btn-block" onclick="adminBlockUser('${u.userId}')">🔒 ${t('admin.block')}</button>`}</div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderBroadcastInterface(container) { container.innerHTML = `<div class="broadcast-container"><textarea id="broadcastMessage" placeholder="${t('admin.broadcast.message')}" rows="4"></textarea><button class="btn-broadcast" onclick="sendBroadcast()">📢 ${t('admin.broadcast.send')}</button></div>`; }

async function approveWithdrawal(id) { const res = await fetch('/api/admin/approve-withdrawal', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ withdrawalId: id }) }).then(r => r.json()); if (res.success) { showToast('Approved!', 'success'); await loadAdminData(); showAdminSection('pending'); } else showToast('Error', 'error'); }
async function rejectWithdrawal(id) { const reason = prompt(t('admin.reject.reason')); if (!reason) return; const res = await fetch('/api/admin/reject-withdrawal', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ withdrawalId: id, reason }) }).then(r => r.json()); if (res.success) { showToast('Rejected!', 'success'); await loadAdminData(); showAdminSection('pending'); } else showToast('Error', 'error'); }
async function adminAddBalance(userId) { const amount = parseFloat(prompt('Amount to add (USD):')); if (isNaN(amount) || amount <= 0) return; const res = await fetch('/api/admin/add-balance', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ userId, amount }) }).then(r => r.json()); if (res.success) { showToast(`$${amount} added!`, 'success'); await loadAdminData(); showAdminSection('users'); } else showToast('Error', 'error'); }
async function adminRemoveBalance(userId) { const amount = parseFloat(prompt('Amount to remove (USD):')); if (isNaN(amount) || amount <= 0) return; const res = await fetch('/api/admin/remove-balance', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ userId, amount }) }).then(r => r.json()); if (res.success) { showToast(`$${amount} removed!`, 'success'); await loadAdminData(); showAdminSection('users'); } else showToast('Error', 'error'); }
async function adminBlockUser(userId) { if (!confirm('⚠️ Permanently block this user from withdrawals?')) return; const res = await fetch('/api/admin/block-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ userId }) }).then(r => r.json()); if (res.success) { showToast('User blocked!', 'success'); await loadAdminData(); showAdminSection('users'); } else showToast('Error', 'error'); }
async function adminUnblockUser(userId) { const res = await fetch('/api/admin/unblock-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ userId }) }).then(r => r.json()); if (res.success) { showToast('User unblocked!', 'success'); await loadAdminData(); showAdminSection('users'); } else showToast('Error', 'error'); }
async function sendBroadcast() { const msg = document.getElementById('broadcastMessage')?.value; if (!msg) return; const res = await fetch('/api/admin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ message: msg }) }).then(r => r.json()); if (res.success) showToast(`Broadcast sent to ${res.notifiedCount} users`, 'success'); else showToast('Error', 'error'); }
function filterUsers() { const term = document.getElementById('userSearchInput')?.value.toLowerCase(); document.querySelectorAll('.user-card').forEach(c => { const match = c.getAttribute('data-user-id')?.toLowerCase().includes(term) || c.getAttribute('data-user-name')?.toLowerCase().includes(term); c.style.display = match ? 'block' : 'none'; }); }

// ============================================================================
// 12. UI UPDATES
// ============================================================================

function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    document.getElementById('adsWatchedToday').textContent = `${currentUser.adsToday || 0}/${APP_CONFIG.dailyAdLimit}`;
    document.getElementById('adsWatchedTotal').textContent = currentUser.adsWatched || 0;
    document.getElementById('totalEarned').textContent = `$${currentUser.totalEarned?.toFixed(2) || '0.00'}`;
    document.getElementById('statsToday').textContent = `$${((currentUser.adsToday || 0) * APP_CONFIG.adReward).toFixed(2)}`;
    document.getElementById('statsTotal').textContent = `$${currentUser.totalEarned?.toFixed(2) || '0.00'}`;
    const progress = ((currentUser.adsToday || 0) / APP_CONFIG.dailyAdLimit) * 100;
    document.getElementById('adProgressFill').style.width = `${progress}%`;
    document.getElementById('adProgressLabel').textContent = `${currentUser.adsToday || 0} / ${APP_CONFIG.dailyAdLimit} today`;
    document.getElementById('inviteCount').textContent = currentUser.inviteCount || 0;
    document.getElementById('inviteEarned').textContent = `$${((currentUser.inviteCount || 0) * APP_CONFIG.referralBonus).toFixed(2)}`;
    document.getElementById('referralNeeded').textContent = Math.max(0, APP_CONFIG.requiredReferrals - (currentUser.inviteCount || 0));
    document.getElementById('inviteLink').value = getReferralLink();
    document.getElementById('withdrawAvailable').textContent = `$${currentUser.balance?.toFixed(2) || '0.00'}`;
    const canWithdraw = (currentUser.balance || 0) >= APP_CONFIG.minWithdraw && (currentUser.inviteCount || 0) >= APP_CONFIG.requiredReferrals;
    document.getElementById('submitWithdrawBtn').disabled = !canWithdraw;
    document.getElementById('userName').textContent = currentUser.userName || 'User';
    document.getElementById('userTgId').textContent = `ID: ${currentUserId?.slice(-8) || '-----'}`;
    updateNotificationBadge();
}

function refreshCurrentPage() {
    if (currentPage === 'ads') document.getElementById('adStatusText').textContent = t('ads.ready');
    else if (currentPage === 'tasks') renderTasks();
    else if (currentPage === 'invite') document.getElementById('inviteLink').value = getReferralLink();
}

// ============================================================================
// 13. NAVIGATION
// ============================================================================

function switchTab(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => { item.classList.remove('active'); if (item.getAttribute('data-page') === page) item.classList.add('active'); });
    if (page === 'tasks') { loadTasksProgress(); renderTasks(); }
    else if (page === 'invite') document.getElementById('inviteLink').value = getReferralLink();
    else if (page === 'withdraw') renderWithdrawMethods();
    refreshCurrentPage();
}

// ============================================================================
// 14. TOAST & HELPERS
// ============================================================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<div class="toast-inner"><span class="toast-icon">${icons[type] || '✓'}</span><span class="toast-msg">${message}</span><div class="toast-bar"></div></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================================
// 15. FORCE HIDE SPLASH (FIX)
// ============================================================================

function forceHideSplash() {
    const splash = document.getElementById('splashScreen');
    const main = document.getElementById('mainContent');
    const nav = document.getElementById('bottomNav');
    if (splash) { splash.classList.add('hidden'); setTimeout(() => { splash.style.display = 'none'; }, 500); }
    if (main) main.style.display = 'block';
    if (nav) nav.style.display = 'flex';
}
setTimeout(forceHideSplash, 3000);

// ============================================================================
// 16. INITIALIZATION
// ============================================================================

function init() {
    loadUserData();
    loadTasksProgress();
    renderWithdrawMethods();
    updateUI();
    forceHideSplash();
    if (currentUserId === '1653918641') document.getElementById('adminCrownBtn')?.style.setProperty('display', 'flex');
    setInterval(() => { if (currentUser) { const today = new Date().toISOString().split('T')[0]; if (currentUser.lastAdDate !== today) { currentUser.adsToday = 0; currentUser.lastAdDate = today; saveUserData(); updateUI(); } } }, 60000);
}

document.addEventListener('DOMContentLoaded', init);

// ============================================================================
// 17. GLOBAL EXPORTS
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
window.adminUnblockUser = adminUnblockUser;
window.sendBroadcast = sendBroadcast;
window.filterUsers = filterUsers;
window.markNotificationRead = markNotificationRead;
window.clearReadNotifications = clearReadNotifications;
window.clearAllNotifications = clearAllNotifications;
window.showNotificationsModal = showNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;

console.log("✅ AdNova Network - Complete Version Loaded!");
console.log(`💰 Ad Reward: $${APP_CONFIG.adReward} | Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw} | Required Referrals: ${APP_CONFIG.requiredReferrals}`);
