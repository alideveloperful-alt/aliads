// ============================================================
// ADNOVA NETWORK - SERVER v1.0
// منصة إعلانات حقيقية - سحب يدوي شفاف
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 🔐 قراءة Secret Files من Render
// ============================================================

let serviceAccount = null;
let firebaseWebConfig = {};
let ADMIN_ID = null;
let ADMIN_PASSWORD = null;
let TON_API_KEY = null;

try {
    const firebasePath = '/etc/secrets/firebase-admin-key.json';
    if (fs.existsSync(firebasePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
        console.log('✅ Firebase Admin key loaded');
    }
} catch (error) {
    console.error('❌ Firebase Admin key error:', error.message);
}

try {
    const configPath = '/etc/secrets/firebase-web-config.json';
    firebaseWebConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Firebase Web config loaded');
} catch (error) {
    console.error('❌ Firebase Web config error:', error.message);
}

try {
    const adminPath = '/etc/secrets/admin-config.json';
    const adminConfig = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    ADMIN_ID = adminConfig.admin_id;
    ADMIN_PASSWORD = adminConfig.admin_password;
    console.log('✅ Admin config loaded');
} catch (error) {
    console.error('❌ Admin config error:', error.message);
}

try {
    const tonPath = '/etc/secrets/ton-api-key.txt';
    TON_API_KEY = fs.readFileSync(tonPath, 'utf8').trim();
    console.log('✅ TON API key loaded');
} catch (error) {
    console.error('❌ TON API key error:', error.message);
}

// ============================================================
// Environment Variables
// ============================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const OWNER_WALLET = process.env.OWNER_WALLET;

// ============================================================
// إعدادات التطبيق (AdNova)
// ============================================================
const CONFIG = {
    WELCOME_BONUS: 0.10,        // 0.10$ مكافأة ترحيب
    REFERRAL_BONUS: 0.50,       // 0.50$ لكل دعوة
    AD_REWARD: 0.01,            // 0.01$ لكل إعلان (1 سنت)
    DAILY_AD_LIMIT: 50,         // 50 إعلان كحد أقصى يومياً
    MIN_WITHDRAW: 10.00,        // الحد الأدنى للسحب 10$
    REQUIRED_REFERRALS: 10,     // تحتاج 10 دعوات للسحب
    AD_COOLDOWN_SECONDS: 30     // 30 ثانية بين كل إعلان
};

// ============================================================
// 🔥 Firebase Admin SDK Setup
// ============================================================
const admin = require('firebase-admin');
let db = null;

if (serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log('🔥 Firebase Admin SDK initialized');
    } catch (error) {
        console.error('❌ Firebase init error:', error.message);
    }
}

// ============================================================
// 🛠️ Helper Functions
// ============================================================

function createNewUserData(userId, userName, userUsername, refCode) {
    const now = new Date().toISOString();
    
    return {
        userId,
        userName,
        userUsername: userUsername || '',
        balance: CONFIG.WELCOME_BONUS,           // الرصيد بالدولار
        referralCode: userId,
        referredBy: refCode || null,
        referrals: [],                           // قائمة المعرفات المدعوين
        inviteCount: 0,                          // عدد الدعوات
        totalEarned: CONFIG.WELCOME_BONUS,       // إجمالي ما ربحه
        adsWatched: 0,                           // عدد الإعلانات المشاهدة
        adsToday: 0,                             // إعلانات اليوم
        lastAdTime: 0,                           // آخر وقت شاهد فيه إعلان
        lastResetDate: now.split('T')[0],        // تاريخ آخر تصفير للإعلانات اليومية
        withdrawBlocked: false,                  // هل السحب محظور؟
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // سجل المعاملات (محلياً)
        transactions: [],
        
        // الإشعارات
        notifications: [{
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            type: 'welcome',
            title: '🎉 Welcome to AdNova!',
            message: `You received $${CONFIG.WELCOME_BONUS.toFixed(2)} welcome bonus!`,
            read: false,
            timestamp: now
        }],
        
        // معلومات السحب
        withdrawals: [],  // طلبات السحب
        withdrawalUnlocked: false  // هل فتح السحب؟ (يتطلب 10$ + 10 دعوات)
    };
}

function isAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return false;
    }
    return authHeader === `Bearer ${ADMIN_PASSWORD}`;
}

// دالة إعادة تعيين الإعلانات اليومية
async function resetDailyAdsIfNeeded(userId, userData) {
    const today = new Date().toISOString().split('T')[0];
    
    if (userData.lastResetDate !== today) {
        userData.adsToday = 0;
        userData.lastResetDate = today;
        
        await db.collection('users').doc(userId).update({
            adsToday: 0,
            lastResetDate: today
        });
        
        return true;
    }
    return false;
}

// دالة التحقق من أهلية السحب
function checkWithdrawalEligibility(userData) {
    const hasMinimumBalance = userData.balance >= CONFIG.MIN_WITHDRAW;
    const hasRequiredReferrals = userData.inviteCount >= CONFIG.REQUIRED_REFERRALS;
    
    return {
        eligible: hasMinimumBalance && hasRequiredReferrals,
        needsMoreBalance: !hasMinimumBalance,
        needsMoreReferrals: hasMinimumBalance && !hasRequiredReferrals,
        minBalance: CONFIG.MIN_WITHDRAW,
        requiredReferrals: CONFIG.REQUIRED_REFERRALS,
        currentBalance: userData.balance,
        currentReferrals: userData.inviteCount
    };
}

// ====== إرسال إشعار لمستخدم ======
async function sendNotification(targetUserId, notification) {
    if (!db) return false;
    
    try {
        const notifData = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            type: notification.type || 'info',
            title: notification.title || 'Notification',
            message: notification.message,
            read: false,
            timestamp: new Date().toISOString()
        };
        
        await db.collection('users').doc(targetUserId).update({
            notifications: admin.firestore.FieldValue.arrayUnion(notifData)
        });
        
        console.log(`✅ Notification sent to ${targetUserId}: ${notification.title}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        return false;
    }
}

// ====== إرسال بث لجميع المستخدمين ======
async function broadcastToAllUsers(message, target = 'all') {
    if (!db) return { success: false, error: 'Database not connected' };
    
    try {
        const broadcastRef = await db.collection('broadcasts').add({
            message: message,
            target: target,
            sentBy: 'admin',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
        });
        
        console.log(`✅ Broadcast saved: ${broadcastRef.id}`);
        
        const usersSnapshot = await db.collection('users').get();
        let notifiedCount = 0;
        
        let batch = db.batch();
        let batchCount = 0;
        
        const notification = {
            id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'broadcast',
            title: '📢 Announcement',
            message: message,
            read: false,
            timestamp: new Date().toISOString()
        };
        
        for (const doc of usersSnapshot.docs) {
            const userRef = db.collection('users').doc(doc.id);
            batch.update(userRef, {
                notifications: admin.firestore.FieldValue.arrayUnion(notification)
            });
            notifiedCount++;
            batchCount++;
            
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        if (batchCount > 0) {
            await batch.commit();
        }
        
        console.log(`📢 Broadcast notification added to ${notifiedCount} users`);
        
        return { success: true, broadcastId: broadcastRef.id, notifiedCount };
        
    } catch (error) {
        console.error('❌ Broadcast error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// 🤖 Telegram Bot Setup
// ============================================================
const bot = new Telegraf(BOT_TOKEN);
const welcomeCache = new Map();
const botAdminSessions = new Map();

async function sendWelcomeMessage(ctx, userId, userName, isNewUser = false) {
    let welcomeBonusText = '';
    if (isNewUser) {
        welcomeBonusText = `\n🎁 Welcome Bonus: *$${CONFIG.WELCOME_BONUS.toFixed(2)}*`;
    }
    
    const referralBonusValue = CONFIG.REFERRAL_BONUS.toFixed(2);
    
    await ctx.reply(
        `🌟 *Welcome to AdNova Network, ${userName}!*${welcomeBonusText}\n\n` +
        `💰 *Earn Real Money by Watching Ads*\n` +
        `📺 Each ad: *$${CONFIG.AD_REWARD.toFixed(2)}*\n` +
        `📊 Daily limit: *${CONFIG.DAILY_AD_LIMIT} ads* ($${(CONFIG.DAILY_AD_LIMIT * CONFIG.AD_REWARD).toFixed(2)}/day)\n\n` +
        `👥 Referral Bonus: *$${referralBonusValue}* per friend\n` +
        `🎯 Need *${CONFIG.REQUIRED_REFERRALS} referrals* + *$${CONFIG.MIN_WITHDRAW.toFixed(2)}* to withdraw\n\n` +
        `💸 Withdrawal Methods:\n` +
        `• PayPal • Skrill • Payoneer • SBP • USDT (BEP20/TRC20) • TON • Mobile Recharge • PUBG UC • Free Fire Diamonds\n\n` +
        `👇 *Open the app to start earning:*`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚀 Open AdNova App', web_app: { url: APP_URL } }],
                    [{ text: '📢 Official Channel', url: 'https://t.me/AdNovaNetwork' }],
                    [{ text: '👥 Support Group', url: 'https://t.me/AdNovaSupport' }]
                ]
            }
        }
    );
}

bot.start(async (ctx) => {
    const refCode = ctx.startPayload;
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || 'AdNova User';
    const userUsername = ctx.from.username || '';
    
    console.log(`🚀 /start command from ${userId} (${userName}), ref: ${refCode || 'none'}`);
    
    const cacheKey = `${userId}_welcome`;
    const now = Date.now();
    if (welcomeCache.has(cacheKey) && (now - welcomeCache.get(cacheKey)) < 5000) {
        console.log(`⏭️ Skipping duplicate welcome for ${userId}`);
        return;
    }
    welcomeCache.set(cacheKey, now);
    
    let isNewUser = false;
    
    if (db) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            isNewUser = true;
            const userData = createNewUserData(userId, userName, userUsername, refCode);
            await userRef.set(userData);
            console.log(`✅ New user created via bot: ${userId}`);
            
            // معالجة الإحالة
            if (refCode && refCode !== userId) {
                const referrerRef = db.collection('users').doc(refCode);
                const referrerDoc = await referrerRef.get();
                if (referrerDoc.exists) {
                    const referrerData = referrerDoc.data();
                    if (!referrerData.referrals?.includes(userId)) {
                        const newBalance = (referrerData.balance || 0) + CONFIG.REFERRAL_BONUS;
                        
                        await referrerRef.update({
                            referrals: admin.firestore.FieldValue.arrayUnion(userId),
                            inviteCount: admin.firestore.FieldValue.increment(1),
                            balance: newBalance,
                            totalEarned: (referrerData.totalEarned || 0) + CONFIG.REFERRAL_BONUS
                        });
                        
                        await sendNotification(refCode, {
                            type: 'referral',
                            title: '🎉 New Referral!',
                            message: `+$${CONFIG.REFERRAL_BONUS.toFixed(2)} added to your balance!`
                        });
                        
                        bot.telegram.sendMessage(refCode, 
                            `🎉 *New Referral!*\n\n+$${CONFIG.REFERRAL_BONUS.toFixed(2)} added to your balance!\nTotal referrals: ${(referrerData.inviteCount || 0) + 1}`, 
                            { parse_mode: 'Markdown' }
                        ).catch(() => {});
                        
                        console.log(`✅ Referral processed: ${refCode} referred ${userId}`);
                    }
                }
            }
        } else {
            console.log(`✅ Existing user: ${userId}`);
        }
    }
    
    await sendWelcomeMessage(ctx, userId, userName, isNewUser);
});

bot.command('stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!db) return ctx.reply('⚠️ Maintenance mode...');
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        const eligibility = checkWithdrawalEligibility(data);
        
        let withdrawalStatus = '';
        if (eligibility.eligible) {
            withdrawalStatus = '✅ *READY TO WITHDRAW!*';
        } else if (eligibility.needsMoreBalance) {
            withdrawalStatus = `❌ Need $${(eligibility.minBalance - eligibility.currentBalance).toFixed(2)} more to withdraw`;
        } else if (eligibility.needsMoreReferrals) {
            withdrawalStatus = `❌ Need ${eligibility.requiredReferrals - eligibility.currentReferrals} more referrals to withdraw`;
        }
        
        await ctx.reply(
            `🌟 *Your AdNova Stats*\n\n` +
            `💰 Balance: *$${data.balance?.toFixed(2) || '0.00'}*\n` +
            `👥 Invites: *${data.inviteCount || 0}* / ${CONFIG.REQUIRED_REFERRALS}\n` +
            `📺 Ads Watched: *${data.adsWatched || 0}*\n` +
            `📊 Today: *${data.adsToday || 0}* / ${CONFIG.DAILY_AD_LIMIT}\n` +
            `💵 Total Earned: *$${data.totalEarned?.toFixed(2) || '0.00'}*\n\n` +
            `${withdrawalStatus}\n\n` +
            `🔗 Your referral link:\nt.me/${ctx.botInfo.username}?start=${userId}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply('❌ User not found. Please start the bot first with /start');
    }
});

// ====== ADMIN AUTHENTICATION FOR BOT ======
bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) {
        return ctx.reply('⛔ Not authorized!');
    }
    
    ctx.reply('🔐 Please enter the admin password:');
    botAdminSessions.set(userId, { step: 'awaiting_password' });
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const session = botAdminSessions.get(userId);
    
    if (!session) return;
    
    const text = ctx.message.text;
    
    if (session.step === 'awaiting_password') {
        if (text === ADMIN_PASSWORD) {
            botAdminSessions.set(userId, { step: 'authenticated' });
            ctx.reply(
                '✅ *Authentication Successful!*\n\n' +
                'Admin commands:\n' +
                '• `/broadcast` - Send message to all users\n' +
                '• `/stats` - View bot statistics',
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply('❌ Wrong password!');
            botAdminSessions.delete(userId);
        }
        return;
    }
    
    if (session.step === 'authenticated') {
        if (text === '/broadcast') {
            ctx.reply('📝 Send me the message you want to broadcast:');
            botAdminSessions.set(userId, { step: 'awaiting_broadcast' });
        } else if (text === '/stats') {
            const stats = await getBotStats();
            ctx.reply(stats, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('Available commands:\n/broadcast - Send broadcast\n/stats - View statistics');
        }
        return;
    }
    
    if (session.step === 'awaiting_broadcast') {
        ctx.reply('📢 Broadcasting to all users...');
        
        const result = await broadcastToAllUsers(text, 'all');
        
        if (result.success) {
            ctx.reply(`✅ *Broadcast Complete!*\n\n📊 Sent to: ${result.notifiedCount} users`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('❌ Error sending broadcast');
        }
        
        botAdminSessions.delete(userId);
    }
});

async function getBotStats() {
    if (!db) return 'Database not connected';
    
    const usersSnapshot = await db.collection('users').get();
    const pendingWithdrawals = await db.collection('withdrawals').where('status', '==', 'pending').get();
    
    let totalBalance = 0;
    usersSnapshot.forEach(doc => {
        totalBalance += doc.data().balance || 0;
    });
    
    return `📊 *Bot Statistics*\n\n` +
        `👥 Total Users: ${usersSnapshot.size}\n` +
        `💸 Pending Withdrawals: ${pendingWithdrawals.size}\n` +
        `💰 Total Balance Held: $${totalBalance.toFixed(2)}\n` +
        `🕐 Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
}

bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => bot.launch({ dropPendingUpdates: true }))
    .then(() => console.log('🤖 AdNova Bot started with Long Polling'))
    .catch(err => console.error('❌ Bot launch error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ============================================================
// 🌐 Middleware
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ============================================================
// 📡 API Endpoints
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'AdNova Network Online', firebase: db ? 'connected' : 'disconnected', timestamp: Date.now() });
});

app.get('/api/config', (req, res) => {
    res.json({
        firebaseConfig: firebaseWebConfig,
        appUrl: APP_URL,
        adminId: ADMIN_ID,
        ownerWallet: OWNER_WALLET,
        botLink: 'https://t.me/AdNovaNetworkbot/app',
        supportUsername: 'AdNovaSupport',
        // إرسال إعدادات التطبيق للواجهة الأمامية
        adConfig: {
            reward: CONFIG.AD_REWARD,
            dailyLimit: CONFIG.DAILY_AD_LIMIT,
            cooldownSeconds: CONFIG.AD_COOLDOWN_SECONDS,
            minWithdraw: CONFIG.MIN_WITHDRAW,
            requiredReferrals: CONFIG.REQUIRED_REFERRALS
        },
        withdrawalMethods: [
            { id: 'paypal', name: 'PayPal', icon: 'fab fa-paypal' },
            { id: 'skrill', name: 'Skrill', icon: 'fab fa-skrill' },
            { id: 'payoneer', name: 'Payoneer', icon: 'fas fa-building' },
            { id: 'sbp', name: 'SBP (Russian System)', icon: 'fas fa-university' },
            { id: 'usdt_bep20', name: 'USDT (BEP20)', icon: 'fab fa-bitcoin' },
            { id: 'usdt_trc20', name: 'USDT (TRC20)', icon: 'fab fa-bitcoin' },
            { id: 'ton', name: 'TON Network', icon: 'fab fa-telegram' },
            { id: 'mobile', name: 'Mobile Recharge', icon: 'fas fa-mobile-alt' },
            { id: 'pubg', name: 'PUBG UC', icon: 'fas fa-gamepad' },
            { id: 'freefire', name: 'Free Fire Diamonds', icon: 'fas fa-fire' }
        ]
    });
});

// ====== ADMIN VERIFY ======
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.json({ success: false, error: 'Password required' });
    }
    
    if (password === ADMIN_PASSWORD) {
        console.log('✅ Admin verified successfully');
        res.json({ success: true, message: 'Authenticated' });
    } else {
        console.log('❌ Admin verification failed');
        res.json({ success: false, error: 'Invalid password' });
    }
});

// ====== INIT USER ======
app.post('/api/init-user', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.json({ success: false, error: 'No initData' });
        
        const params = new URLSearchParams(initData);
        const userJson = params.get('user');
        if (!userJson) return res.json({ success: false, error: 'No user data' });
        
        const user = JSON.parse(decodeURIComponent(userJson));
        const userId = user.id.toString();
        const userName = user.first_name || 'AdNova User';
        const userUsername = user.username || '';
        
        console.log('📱 Init user:', userId, userName);
        
        if (!db) return res.json({ success: false, error: 'Database not connected' });
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        let userData;
        if (userDoc.exists) {
            userData = userDoc.data();
            // إعادة تعيين الإعلانات اليومية إذا لزم الأمر
            await resetDailyAdsIfNeeded(userId, userData);
            console.log('✅ Existing user:', userId);
        } else {
            userData = createNewUserData(userId, userName, userUsername, null);
            await userRef.set(userData);
            console.log('✅ New user created via init:', userId);
        }
        
        res.json({ success: true, userId: userId, userData: userData, config: CONFIG });
    } catch (error) {
        console.error('❌ Init user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== GET USER DATA ======
app.get('/api/users/:userId', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const doc = await db.collection('users').doc(req.params.userId).get();
        if (doc.exists) {
            const userData = doc.data();
            // التحقق من أهلية السحب
            const eligibility = checkWithdrawalEligibility(userData);
            userData.withdrawalEligibility = eligibility;
            res.json({ success: true, data: userData });
        } else {
            res.json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== UPDATE USER DATA ======
app.patch('/api/users/:userId', async (req, res) => {
    if (!db) return res.json({ success: true, mock: true });
    try {
        const { updates } = req.body;
        await db.collection('users').doc(req.params.userId).update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== REWARD API (بعد مشاهدة الإعلان) ======
app.post('/api/reward', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { initData, adType } = req.body;
        
        // استخراج معلومات المستخدم من initData
        const params = new URLSearchParams(initData);
        const userJson = params.get('user');
        if (!userJson) return res.json({ success: false, error: 'No user data' });
        
        const user = JSON.parse(decodeURIComponent(userJson));
        const userId = user.id.toString();
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        let userData = userDoc.data();
        
        // إعادة تعيين الإعلانات اليومية إذا لزم الأمر
        await resetDailyAdsIfNeeded(userId, userData);
        
        // التحقق من الحد اليومي
        if (userData.adsToday >= CONFIG.DAILY_AD_LIMIT) {
            return res.json({ success: false, error: 'Daily limit reached', limitReached: true });
        }
        
        // التحقق من فترة التهدئة (cooldown)
        const now = Date.now();
        const timeSinceLastAd = now - (userData.lastAdTime || 0);
        if (timeSinceLastAd < CONFIG.AD_COOLDOWN_SECONDS * 1000) {
            const waitSeconds = Math.ceil((CONFIG.AD_COOLDOWN_SECONDS * 1000 - timeSinceLastAd) / 1000);
            return res.json({ success: false, error: `Please wait ${waitSeconds} seconds`, cooldown: true, waitSeconds });
        }
        
        // إضافة المكافأة
        const newBalance = (userData.balance || 0) + CONFIG.AD_REWARD;
        const newTotalEarned = (userData.totalEarned || 0) + CONFIG.AD_REWARD;
        const newAdsWatched = (userData.adsWatched || 0) + 1;
        const newAdsToday = (userData.adsToday || 0) + 1;
        
        await userRef.update({
            balance: newBalance,
            totalEarned: newTotalEarned,
            adsWatched: newAdsWatched,
            adsToday: newAdsToday,
            lastAdTime: now,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // إضافة معاملة للسجل
        const transaction = {
            userId,
            userName: userData.userName,
            type: 'earn',
            amount: CONFIG.AD_REWARD,
            currency: 'USD',
            status: 'completed',
            timestamp: new Date().toISOString(),
            details: 'Watched an ad'
        };
        
        await db.collection('transactions').add(transaction);
        
        console.log(`💰 Reward added: ${userId} +$${CONFIG.AD_REWARD} (Total: $${newBalance.toFixed(2)})`);
        
        res.json({ 
            success: true, 
            balance: newBalance,
            totalEarned: newTotalEarned,
            adsWatched: newAdsWatched,
            adsToday: newAdsToday,
            reward: CONFIG.AD_REWARD
        });
        
    } catch (error) {
        console.error('❌ Reward error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== REFERRAL API ======
app.post('/api/referral', async (req, res) => {
    if (!db) return res.json({ success: true, mock: true });
    try {
        const { referrerId, newUserId } = req.body;
        if (!referrerId || !newUserId || referrerId === newUserId) return res.json({ success: false, error: 'Invalid data' });
        
        const referrerRef = db.collection('users').doc(referrerId);
        const referrerDoc = await referrerRef.get();
        
        if (referrerDoc.exists) {
            const referrerData = referrerDoc.data();
            if (!referrerData.referrals?.includes(newUserId)) {
                const newBalance = (referrerData.balance || 0) + CONFIG.REFERRAL_BONUS;
                const newTotalEarned = (referrerData.totalEarned || 0) + CONFIG.REFERRAL_BONUS;
                
                await referrerRef.update({
                    referrals: admin.firestore.FieldValue.arrayUnion(newUserId),
                    inviteCount: admin.firestore.FieldValue.increment(1),
                    balance: newBalance,
                    totalEarned: newTotalEarned
                });
                
                await sendNotification(referrerId, {
                    type: 'referral',
                    title: '🎉 New Referral!',
                    message: `+$${CONFIG.REFERRAL_BONUS.toFixed(2)} added to your balance!`
                });
                
                bot.telegram.sendMessage(referrerId, 
                    `🎉 *New Referral!*\n\n+$${CONFIG.REFERRAL_BONUS.toFixed(2)} added to your balance!`, 
                    { parse_mode: 'Markdown' }
                ).catch(() => {});
                
                console.log(`✅ Referral bonus: ${referrerId} +$${CONFIG.REFERRAL_BONUS}`);
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== WITHDRAW REQUEST API ======
app.post('/api/withdraw/request', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { userId, userName, amount, method, destination } = req.body;
        
        if (!userId || !amount || !method || !destination) {
            return res.json({ success: false, error: 'Missing required fields' });
        }
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const userData = userDoc.data();
        
        if (userData.withdrawBlocked) {
            return res.json({ success: false, error: 'Your account is blocked from withdrawals' });
        }
        
        // التحقق من أهلية السحب
        const eligibility = checkWithdrawalEligibility(userData);
        
        if (!eligibility.eligible) {
            let errorMsg = '';
            if (eligibility.needsMoreBalance) {
                errorMsg = `Minimum withdrawal is $${CONFIG.MIN_WITHDRAW}. You have $${userData.balance.toFixed(2)}`;
            } else if (eligibility.needsMoreReferrals) {
                errorMsg = `You need ${CONFIG.REQUIRED_REFERRALS - userData.inviteCount} more referrals to withdraw`;
            }
            return res.json({ success: false, error: errorMsg });
        }
        
        if ((userData.balance || 0) < amount) {
            return res.json({ success: false, error: 'Insufficient balance' });
        }
        
        if (amount < CONFIG.MIN_WITHDRAW) {
            return res.json({ success: false, error: `Minimum withdrawal is $${CONFIG.MIN_WITHDRAW}` });
        }
        
        // خصم المبلغ من الرصيد
        const newBalance = (userData.balance || 0) - amount;
        
        const withdrawRequest = {
            userId,
            userName,
            amount,
            method,
            destination,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('withdrawals').add(withdrawRequest);
        
        await userRef.update({
            balance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // إضافة معاملة للسجل
        const transaction = {
            userId,
            userName,
            type: 'withdraw',
            amount: amount,
            currency: 'USD',
            status: 'pending',
            timestamp: new Date().toISOString(),
            firebaseId: docRef.id,
            method,
            destination
        };
        
        await db.collection('transactions').add(transaction);
        
        await sendNotification(userId, {
            type: 'withdraw',
            title: '💸 Withdrawal Requested',
            message: `Your withdrawal request of $${amount.toFixed(2)} via ${method} is being processed.`
        });
        
        // إشعار للمشرف عبر البوت
        bot.telegram.sendMessage(ADMIN_ID, 
            `💸 *New Withdrawal Request*\n\n` +
            `👤 ${userName} (${userId})\n` +
            `💰 Amount: $${amount.toFixed(2)}\n` +
            `💳 Method: ${method}\n` +
            `📮 Destination: ${destination}`,
            { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        console.log(`✅ Withdrawal request saved: ${docRef.id} - $${amount} via ${method}`);
        res.json({ success: true, requestId: docRef.id, newBalance });
        
    } catch (error) {
        console.error('❌ Withdraw error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== ADMIN APIs ======

// إحصائيات المشرف
app.get('/api/admin/stats', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    
    try {
        const usersSnapshot = await db.collection('users').get();
        const pendingWithdrawals = await db.collection('withdrawals').where('status', '==', 'pending').get();
        
        let totalBalance = 0;
        let totalEarned = 0;
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            totalBalance += data.balance || 0;
            totalEarned += data.totalEarned || 0;
        });
        
        res.json({
            success: true,
            stats: {
                totalUsers: usersSnapshot.size,
                pendingWithdrawals: pendingWithdrawals.size,
                totalBalance: totalBalance,
                totalEarned: totalEarned
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على طلبات السحب المعلقة
app.get('/api/admin/pending-withdrawals', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, withdrawals: [] });
    
    try {
        const snapshot = await db.collection('withdrawals')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        
        const withdrawals = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const userDoc = await db.collection('users').doc(data.userId).get();
            const userData = userDoc.exists ? userDoc.data() : null;
            
            withdrawals.push({
                id: doc.id,
                ...data,
                user: userData ? {
                    userName: userData.userName,
                    inviteCount: userData.inviteCount || 0,
                    adsWatched: userData.adsWatched || 0
                } : null
            });
        }
        
        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على جميع المستخدمين
app.get('/api/admin/users', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, users: [] });
    
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        
        const users = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            users.push({
                userId: data.userId,
                userName: data.userName,
                balance: data.balance,
                inviteCount: data.inviteCount,
                adsWatched: data.adsWatched,
                totalEarned: data.totalEarned,
                withdrawBlocked: data.withdrawBlocked || false,
                createdAt: data.createdAt
            });
        }
        
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// البحث عن مستخدم
app.post('/api/admin/search-user', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    
    try {
        const { userId } = req.body;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user: userDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إضافة رصيد (يدوي من المشرف)
app.post('/api/admin/add-balance', async (req, res) => {
    if (!isAdmin(req)) {
        console.log('❌ Unauthorized add-balance attempt');
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { userId, amount, reason } = req.body;
        console.log(`💰 Admin adding balance: ${userId} - $${amount}`);
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const userData = userDoc.data();
        const newBalance = (userData.balance || 0) + amount;
        
        await userRef.update({ 
            balance: newBalance,
            totalEarned: (userData.totalEarned || 0) + amount
        });
        
        const transaction = {
            userId,
            userName: userData.userName,
            type: 'admin_add',
            amount: amount,
            currency: 'USD',
            status: 'completed',
            timestamp: new Date().toISOString(),
            details: reason || 'Admin added balance'
        };
        await db.collection('transactions').add(transaction);
        
        await sendNotification(userId, {
            type: 'admin_add',
            title: '💰 Balance Added',
            message: `Admin added $${amount.toFixed(2)} to your account.${reason ? ` Reason: ${reason}` : ''}`
        });
        
        bot.telegram.sendMessage(userId, `💰 *Admin added $${amount.toFixed(2)}* to your account!`, { parse_mode: 'Markdown' }).catch(() => {});
        
        res.json({ success: true, newBalance });
    } catch (error) {
        console.error('❌ Add balance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// خصم رصيد (يدوي من المشرف)
app.post('/api/admin/remove-balance', async (req, res) => {
    if (!isAdmin(req)) {
        console.log('❌ Unauthorized remove-balance attempt');
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { userId, amount, reason } = req.body;
        console.log(`💰 Admin removing balance: ${userId} - $${amount}`);
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const userData = userDoc.data();
        const newBalance = Math.max(0, (userData.balance || 0) - amount);
        
        await userRef.update({ balance: newBalance });
        
        const transaction = {
            userId,
            userName: userData.userName,
            type: 'admin_remove',
            amount: amount,
            currency: 'USD',
            status: 'completed',
            timestamp: new Date().toISOString(),
            details: reason || 'Admin removed balance'
        };
        await db.collection('transactions').add(transaction);
        
        await sendNotification(userId, {
            type: 'admin_remove',
            title: '💰 Balance Adjusted',
            message: `Admin removed $${amount.toFixed(2)} from your account.${reason ? ` Reason: ${reason}` : ''}`
        });
        
        bot.telegram.sendMessage(userId, `💰 *Admin removed $${amount.toFixed(2)}* from your account.`, { parse_mode: 'Markdown' }).catch(() => {});
        
        res.json({ success: true, newBalance });
    } catch (error) {
        console.error('❌ Remove balance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// حظر المستخدم من السحب
app.post('/api/admin/block-user', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { userId } = req.body;
        console.log(`🚫 Admin blocking user: ${userId}`);
        
        await db.collection('users').doc(userId).update({
            withdrawBlocked: true,
            withdrawBlockedAt: admin.firestore.FieldValue.serverTimestamp(),
            withdrawBlockedBy: 'admin',
            withdrawBlockedReason: req.body.reason || 'Policy violation'
        });
        
        await sendNotification(userId, {
            type: 'blocked',
            title: '🚫 Account Restricted',
            message: 'Your withdrawal access has been permanently blocked. Contact support for more information.'
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إلغاء حظر المستخدم
app.post('/api/admin/unblock-user', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { userId } = req.body;
        console.log(`🔓 Admin unblocking user: ${userId}`);
        
        await db.collection('users').doc(userId).update({
            withdrawBlocked: false,
            withdrawBlockedAt: admin.firestore.FieldValue.delete(),
            withdrawBlockedBy: admin.firestore.FieldValue.delete(),
            withdrawBlockedReason: admin.firestore.FieldValue.delete()
        });
        
        await sendNotification(userId, {
            type: 'unblocked',
            title: '✅ Account Restored',
            message: 'Your withdrawal access has been restored.'
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// بث رسالة
app.post('/api/admin/broadcast', async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    try {
        const { message, target } = req.body;
        
        if (!message) {
            return res.json({ success: false, error: 'No message provided' });
        }
        
        console.log(`📢 Broadcasting message: ${message.substring(0, 50)}...`);
        
        const result = await broadcastToAllUsers(message, target || 'all');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Broadcast error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// الموافقة على طلب سحب
app.post('/api/admin/approve-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { withdrawalId } = req.body;
        
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        
        if (!withdrawalDoc.exists) {
            return res.json({ success: false, error: 'Withdrawal not found' });
        }
        
        const data = withdrawalDoc.data();
        console.log(`✅ Approving withdrawal: ${withdrawalId} - $${data.amount} for ${data.userId}`);
        
        await withdrawalRef.update({
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: 'admin'
        });
        
        await sendNotification(data.userId, {
            type: 'withdraw',
            title: '✅ Withdrawal Approved!',
            message: `Your withdrawal of $${data.amount.toFixed(2)} has been approved and sent to your ${data.method} account.`
        });
        
        bot.telegram.sendMessage(
            data.userId,
            `✅ *Withdrawal Approved!*\n\nYour withdrawal of $${data.amount.toFixed(2)} has been approved and sent to your ${data.method} account.`,
            { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// رفض طلب سحب
app.post('/api/admin/reject-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const { withdrawalId, reason } = req.body;
        
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        
        if (!withdrawalDoc.exists) {
            return res.json({ success: false, error: 'Withdrawal not found' });
        }
        
        const data = withdrawalDoc.data();
        console.log(`❌ Rejecting withdrawal: ${withdrawalId} - Reason: ${reason}`);
        
        // إعادة الرصيد للمستخدم
        const userRef = db.collection('users').doc(data.userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        await userRef.update({
            balance: (userData.balance || 0) + data.amount
        });
        
        await withdrawalRef.update({
            status: 'rejected',
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: 'admin',
            rejectReason: reason || 'No reason provided'
        });
        
        await sendNotification(data.userId, {
            type: 'withdraw',
            title: '❌ Withdrawal Rejected',
            message: `Your withdrawal of $${data.amount.toFixed(2)} was rejected. Reason: ${reason || 'Not specified'}\n\nThe amount has been returned to your balance.`
        });
        
        bot.telegram.sendMessage(
            data.userId,
            `❌ *Withdrawal Rejected*\n\nYour withdrawal of $${data.amount.toFixed(2)} was rejected.\nReason: ${reason || 'Not specified'}\n\nThe amount has been returned.`,
            { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// 🏠 Serve Frontend
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// 🚀 Start Server
// ============================================================
app.listen(PORT, () => {
    console.log(`\n🌟 AdNova Network Server - v1.0`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔥 Firebase: ${db ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`👑 Admin ID: ${ADMIN_ID || '❌ Not configured'}`);
    console.log(`🤖 Bot: ${BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🌐 App URL: ${APP_URL}`);
    console.log(`\n💰 Ad Reward: $${CONFIG.AD_REWARD}`);
    console.log(`📊 Daily Limit: ${CONFIG.DAILY_AD_LIMIT} ads`);
    console.log(`💸 Min Withdraw: $${CONFIG.MIN_WITHDRAW}`);
    console.log(`👥 Required Referrals: ${CONFIG.REQUIRED_REFERRALS}`);
    console.log(`\n✅ AdNova Network ready for production!\n`);
});
