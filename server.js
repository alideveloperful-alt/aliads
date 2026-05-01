// ============================================================================
// ADNOVA NETWORK - SERVER v4.0 (النسخة الأسطورية)
// خادم متكامل مع Firebase، بوت تليجرام، APIs آمنة، لوحة مشرف متطورة
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// 1. 📦 المكتبات والاعتماديات (Dependencies)
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// 2. 🔐 إعدادات الأمان والملفات السرية (Secrets from Render)
// ═══════════════════════════════════════════════════════════════════════════

let serviceAccount = null;
let firebaseWebConfig = {};
let ADMIN_ID = null;
let ADMIN_PASSWORD = null;
let TON_API_KEY = null;
let BOT_TOKEN = null;
let APP_URL = null;

// محاولة تحميل Firebase Admin Key
try {
    const firebasePath = '/etc/secrets/firebase-admin-key.json';
    if (fs.existsSync(firebasePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
        console.log('✅ Firebase Admin key loaded');
    }
} catch (error) {
    console.error('❌ Firebase Admin key error:', error.message);
}

// محاولة تحميل Firebase Web Config
try {
    const configPath = '/etc/secrets/firebase-web-config.json';
    firebaseWebConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Firebase Web config loaded');
} catch (error) {
    console.error('❌ Firebase Web config error:', error.message);
}

// محاولة تحميل إعدادات المشرف
try {
    const adminPath = '/etc/secrets/admin-config.json';
    const adminConfig = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    ADMIN_ID = adminConfig.admin_id;
    ADMIN_PASSWORD = adminConfig.admin_password;
    console.log('✅ Admin config loaded | ID:', ADMIN_ID);
} catch (error) {
    console.error('❌ Admin config error:', error.message);
}

// محاولة تحميل TON API Key
try {
    const tonPath = '/etc/secrets/ton-api-key.txt';
    TON_API_KEY = fs.readFileSync(tonPath, 'utf8').trim();
    console.log('✅ TON API key loaded');
} catch (error) {
    console.error('❌ TON API key error:', error.message);
}

// متغيرات البيئة
BOT_TOKEN = process.env.BOT_TOKEN;
APP_URL = process.env.APP_URL;

// ═══════════════════════════════════════════════════════════════════════════
// 3. ⚙️ إعدادات التطبيق (App Configuration)
// ═══════════════════════════════════════════════════════════════════════════

const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 10,
    botUsername: "AdNovaNetworkBot"
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. 🔥 Firebase Admin SDK
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🤖 Telegram Bot
// ═══════════════════════════════════════════════════════════════════════════

const bot = new Telegraf(BOT_TOKEN);
const botAdminSessions = new Map();

// أمر /start
bot.start(async (ctx) => {
    const refCode = ctx.startPayload;
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || 'AdNova User';
    const userUsername = ctx.from.username || '';
    
    console.log(`🚀 /start from ${userId}, ref: ${refCode || 'none'}`);
    
    let isNewUser = false;
    
    if (db) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            isNewUser = true;
            const userData = createNewUser(userId, userName, userUsername, refCode);
            await userRef.set(userData);
            console.log(`✅ New user created via bot: ${userId}`);
            
            // معالجة الإحالة
            if (refCode && refCode !== userId) {
                await processReferralFromBot(refCode, userId, userName);
            }
        }
    }
    
    const welcomeText = `🌟 *Welcome to AdNova Network, ${userName}!*\n\n` +
        (isNewUser ? `🎁 Welcome Bonus: *$${APP_CONFIG.welcomeBonus.toFixed(2)}*\n\n` : '') +
        `💰 *How to earn:*\n` +
        `📺 Watch ads: *$${APP_CONFIG.adReward.toFixed(2)}* per ad (${APP_CONFIG.dailyAdLimit}/day)\n` +
        `👥 Invite friends: *$${APP_CONFIG.referralBonus.toFixed(2)}* per referral\n` +
        `🎯 Need *${APP_CONFIG.requiredReferrals} referrals* + *$${APP_CONFIG.minWithdraw}* to withdraw\n\n` +
        `👇 *Open the app:*`;
    
    await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Open AdNova App', web_app: { url: APP_URL } }],
                [{ text: '👥 Support Group', url: 'https://t.me/AdNovaSupport' }]
            ]
        }
    });
});

// أمر /stats
bot.command('stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!db) return ctx.reply('⚠️ Maintenance mode...');
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        await ctx.reply(
            `📊 *Your AdNova Stats*\n\n` +
            `💰 Balance: *$${data.balance?.toFixed(2) || '0.00'}*\n` +
            `👥 Invites: *${data.inviteCount || 0}* / ${APP_CONFIG.requiredReferrals}\n` +
            `📺 Ads watched: *${data.adsWatched || 0}*\n` +
            `📅 Today: *${data.adsToday || 0}* / ${APP_CONFIG.dailyAdLimit}\n\n` +
            `🔗 Your referral link:\nt.me/${APP_CONFIG.botUsername}?start=${userId}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply('❌ User not found. Please start the bot first with /start');
    }
});

// دالة مساعدة لإضافة إشعار
async function addNotification(targetUserId, notification) {
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
        return true;
    } catch (error) {
        console.error('Notification error:', error);
        return false;
    }
}

// دالة إنشاء مستخدم جديد
function createNewUser(userId, userName, userUsername, refCode) {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    return {
        userId: userId,
        userName: userName || 'User',
        userUsername: userUsername || '',
        balance: APP_CONFIG.welcomeBonus,
        totalEarned: APP_CONFIG.welcomeBonus,
        adsWatched: 0,
        adsToday: 0,
        lastAdDate: today,
        inviteCount: 0,
        referredBy: refCode || null,
        referrals: [],
        withdrawals: [],
        claimedMilestones: [],
        tonWallet: null,
        withdrawBlocked: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        notifications: [{
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            type: 'welcome',
            title: '🎉 Welcome to AdNova!',
            message: `You received $${APP_CONFIG.welcomeBonus} welcome bonus!`,
            read: false,
            timestamp: new Date().toISOString()
        }]
    };
}

// معالجة الإحالة من البوت
async function processReferralFromBot(referrerId, newUserId, newUserName) {
    if (!db) return;
    try {
        const referrerRef = db.collection('users').doc(referrerId);
        const referrerDoc = await referrerRef.get();
        
        if (referrerDoc.exists) {
            const referrerData = referrerDoc.data();
            if (!referrerData.referrals?.includes(newUserId)) {
                await referrerRef.update({
                    referrals: admin.firestore.FieldValue.arrayUnion(newUserId),
                    inviteCount: admin.firestore.FieldValue.increment(1),
                    balance: admin.firestore.FieldValue.increment(APP_CONFIG.referralBonus),
                    totalEarned: admin.firestore.FieldValue.increment(APP_CONFIG.referralBonus)
                });
                
                await addNotification(referrerId, {
                    type: 'referral',
                    title: '🎉 New Referral!',
                    message: `+$${APP_CONFIG.referralBonus.toFixed(2)} added to your balance!`
                });
                
                // إرسال رسالة للمُحيل
                bot.telegram.sendMessage(referrerId, 
                    `🎉 *New Referral!*\n\n+$${APP_CONFIG.referralBonus.toFixed(2)} added!\nTotal referrals: ${(referrerData.inviteCount || 0) + 1}`, 
                    { parse_mode: 'Markdown' }
                ).catch(() => {});
            }
        }
    } catch (error) {
        console.error('Referral processing error:', error);
    }
}

// التحقق من عضوية المستخدم في قناة
async function verifyChannelMembership(userId, channelUsername) {
    try {
        const chatMember = await bot.telegram.getChatMember(`@${channelUsername}`, parseInt(userId));
        const status = chatMember.status;
        return ['member', 'administrator', 'creator'].includes(status);
    } catch (error) {
        console.error(`Verify channel error for ${channelUsername}:`, error.message);
        return false;
    }
}

// إرسال إشعار جماعي
async function broadcastToAllUsers(message) {
    if (!db) return { success: false, error: 'Database not connected' };
    try {
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
            batch.update(db.collection('users').doc(doc.id), {
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
        if (batchCount > 0) await batch.commit();
        return { success: true, notifiedCount };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// تشغيل البوت
bot.launch({ dropPendingUpdates: true })
    .then(() => console.log('🤖 Bot started'))
    .catch(err => console.error('❌ Bot error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ═══════════════════════════════════════════════════════════════════════════
// 6. 🌐 Middleware والإعدادات العامة
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// التحقق من صلاحيات المشرف
function isAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    return authHeader === `Bearer ${ADMIN_PASSWORD}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. 🌍 الـ APIs العامة (Public APIs)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', firebase: db ? 'connected' : 'disconnected', timestamp: Date.now() });
});

app.get('/api/config', (req, res) => {
    res.json({
        firebaseConfig: firebaseWebConfig,
        appUrl: APP_URL,
        adminId: ADMIN_ID,  // مهم جداً لإظهار تاج المشرف
        welcomeBonus: APP_CONFIG.welcomeBonus,
        referralBonus: APP_CONFIG.referralBonus,
        adReward: APP_CONFIG.adReward,
        dailyAdLimit: APP_CONFIG.dailyAdLimit,
        minWithdraw: APP_CONFIG.minWithdraw,
        requiredReferrals: APP_CONFIG.requiredReferrals,
        botUsername: APP_CONFIG.botUsername
    });
});

app.get('/api/ping', (req, res) => {
    res.json({ alive: true, timestamp: Date.now() });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. 👤 APIs المستخدمين (User APIs)
// ═══════════════════════════════════════════════════════════════════════════

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
        
        if (!db) return res.json({ success: false, error: 'Database not connected' });
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        let userData;
        if (userDoc.exists) {
            userData = userDoc.data();
            console.log('✅ Existing user:', userId);
        } else {
            userData = createNewUser(userId, userName, userUsername, null);
            await userRef.set(userData);
            console.log('✅ New user created:', userId);
        }
        
        res.json({ success: true, userId: userId, userData: userData });
    } catch (error) {
        console.error('Init user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const doc = await db.collection('users').doc(req.params.userId).get();
        res.json({ success: true, data: doc.exists ? doc.data() : null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/:userId', async (req, res) => {
    if (!db) return res.json({ success: true, mock: true });
    try {
        const { userId, userData } = req.body;
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            await userRef.set(userData);
        } else {
            await userRef.update(userData);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. 🔗 API الإحالة (Referral API)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/referral', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const { referrerId, newUserId, newUserName } = req.body;
        if (!referrerId || !newUserId || referrerId === newUserId) {
            return res.json({ success: false, error: 'Invalid data' });
        }
        
        const referrerRef = db.collection('users').doc(referrerId);
        const referrerDoc = await referrerRef.get();
        
        if (referrerDoc.exists) {
            const referrerData = referrerDoc.data();
            if (!referrerData.referrals?.includes(newUserId)) {
                await referrerRef.update({
                    referrals: admin.firestore.FieldValue.arrayUnion(newUserId),
                    inviteCount: admin.firestore.FieldValue.increment(1),
                    balance: admin.firestore.FieldValue.increment(APP_CONFIG.referralBonus),
                    totalEarned: admin.firestore.FieldValue.increment(APP_CONFIG.referralBonus)
                });
                
                await addNotification(referrerId, {
                    type: 'referral',
                    title: '🎉 New Referral!',
                    message: `+$${APP_CONFIG.referralBonus.toFixed(2)} added to your balance!`
                });
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. 🎬 API مكافأة مشاهدة الإعلان (Reward API)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/reward', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const { initData } = req.body;
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
        
        const userData = userDoc.data();
        const today = new Date().toISOString().split('T')[0];
        
        // إعادة تعيين العداد اليومي
        if (userData.lastAdDate !== today) {
            userData.adsToday = 0;
        }
        
        // التحقق من الحد اليومي
        if (userData.adsToday >= APP_CONFIG.dailyAdLimit) {
            return res.json({ success: false, error: 'Daily limit reached', limitReached: true });
        }
        
        // إضافة المكافأة مباشرة
        const newBalance = (userData.balance || 0) + APP_CONFIG.adReward;
        const newTotalEarned = (userData.totalEarned || 0) + APP_CONFIG.adReward;
        const newAdsWatched = (userData.adsWatched || 0) + 1;
        const newAdsToday = (userData.adsToday || 0) + 1;
        
        await userRef.update({
            balance: newBalance,
            totalEarned: newTotalEarned,
            adsWatched: newAdsWatched,
            adsToday: newAdsToday,
            lastAdDate: today
        });
        
        res.json({ 
            success: true, 
            balance: newBalance, 
            totalEarned: newTotalEarned, 
            adsWatched: newAdsWatched, 
            adsToday: newAdsToday 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. ✅ API التحقق من انضمام القنوات (Verify Channel API)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/verify-channel', async (req, res) => {
    try {
        const { userId, channelUsername, taskId, reward } = req.body;
        
        if (!userId || !channelUsername) {
            return res.json({ success: false, error: 'Missing required fields' });
        }
        
        // التحقق الحقيقي من عضوية المستخدم
        const isMember = await verifyChannelMembership(userId, channelUsername);
        
        if (!isMember) {
            return res.json({ success: false, error: 'User is not a member of the channel' });
        }
        
        // إذا كان التحقق ناجحاً، نضيف المكافأة
        if (db && reward) {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                await userRef.update({
                    balance: admin.firestore.FieldValue.increment(reward),
                    totalEarned: admin.firestore.FieldValue.increment(reward)
                });
                
                await addNotification(userId, {
                    type: 'success',
                    title: '✅ Task Completed!',
                    message: `+$${reward.toFixed(2)} added from ${channelUsername}`
                });
            }
        }
        
        res.json({ success: true, message: 'Verification successful' });
    } catch (error) {
        console.error('Verify channel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. 💸 API طلبات السحب (Withdraw API)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/withdraw/request', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const { userId, userName, amount, method, destination } = req.body;
        
        if (!userId || !amount || !method || !destination) {
            return res.json({ success: false, error: 'Missing fields' });
        }
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const userData = userDoc.data();
        
        // التحقق من الحظر
        if (userData.withdrawBlocked) {
            return res.json({ success: false, error: 'Account blocked from withdrawals' });
        }
        
        // التحقق من الحد الأدنى
        if (amount < APP_CONFIG.minWithdraw) {
            return res.json({ success: false, error: `Minimum withdrawal is $${APP_CONFIG.minWithdraw}` });
        }
        
        // التحقق من الرصيد
        if (amount > (userData.balance || 0)) {
            return res.json({ success: false, error: 'Insufficient balance' });
        }
        
        // التحقق من عدد الإحالات
        if ((userData.inviteCount || 0) < APP_CONFIG.requiredReferrals) {
            return res.json({ success: false, error: `Need ${APP_CONFIG.requiredReferrals} referrals to withdraw` });
        }
        
        // خصم الرصيد
        const newBalance = (userData.balance || 0) - amount;
        
        // إنشاء طلب السحب
        const withdrawRequest = {
            userId, userName, amount, method, destination,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userInvites: userData.inviteCount || 0,
            userAds: userData.adsWatched || 0
        };
        
        const docRef = await db.collection('withdrawals').add(withdrawRequest);
        
        // تحديث رصيد المستخدم
        await userRef.update({ balance: newBalance });
        
        // إضافة إشعار
        await addNotification(userId, {
            type: 'withdraw',
            title: '💸 Withdrawal Requested',
            message: `Your withdrawal of $${amount.toFixed(2)} via ${method} is being processed.`
        });
        
        // إرسال إشعار للمشرف
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, 
                `💸 *New Withdrawal Request*\n\n👤 ${userName} (${userId})\n💰 $${amount.toFixed(2)}\n💳 Method: ${method}\n📮 Destination: ${destination}\n👥 Invites: ${userData.inviteCount || 0}`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
        
        res.json({ success: true, requestId: docRef.id, newBalance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. 👑 لوحة المشرف (Admin APIs)
// ═══════════════════════════════════════════════════════════════════════════

// التحقق من كلمة مرور المشرف
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (!password) return res.json({ success: false, error: 'Password required' });
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Authenticated' });
    } else {
        res.json({ success: false, error: 'Invalid password' });
    }
});

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
        res.json({ success: true, stats: { 
            totalUsers: usersSnapshot.size, 
            pendingWithdrawals: pendingWithdrawals.size, 
            totalBalance, 
            totalEarned 
        } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// قائمة جميع المستخدمين
app.get('/api/admin/users', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, users: [] });
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: data.userId, 
                userName: data.userName, 
                balance: data.balance,
                inviteCount: data.inviteCount, 
                adsWatched: data.adsWatched,
                totalEarned: data.totalEarned, 
                withdrawBlocked: data.withdrawBlocked || false
            });
        });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// طلبات السحب المعلقة
app.get('/api/admin/pending-withdrawals', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, withdrawals: [] });
    try {
        const snapshot = await db.collection('withdrawals').where('status', '==', 'pending').orderBy('createdAt', 'desc').get();
        const withdrawals = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            withdrawals.push({ id: doc.id, ...data });
        }
        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الموافقة على طلب سحب
app.post('/api/admin/approve-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { withdrawalId } = req.body;
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) return res.json({ success: false, error: 'Not found' });
        const data = withdrawalDoc.data();
        await withdrawalRef.update({ 
            status: 'approved', 
            approvedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        await addNotification(data.userId, {
            type: 'withdraw', 
            title: '✅ Withdrawal Approved!',
            message: `Your withdrawal of $${data.amount.toFixed(2)} has been approved.`
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// رفض طلب سحب
app.post('/api/admin/reject-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { withdrawalId, reason } = req.body;
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) return res.json({ success: false, error: 'Not found' });
        const data = withdrawalDoc.data();
        // إعادة الرصيد للمستخدم
        const userRef = db.collection('users').doc(data.userId);
        await userRef.update({ balance: admin.firestore.FieldValue.increment(data.amount) });
        await withdrawalRef.update({ 
            status: 'rejected', 
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(), 
            rejectReason: reason 
        });
        await addNotification(data.userId, {
            type: 'withdraw', 
            title: '❌ Withdrawal Rejected',
            message: `Your withdrawal of $${data.amount.toFixed(2)} was rejected. Reason: ${reason || 'Not specified'}\nThe amount has been returned.`
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إضافة رصيد لمستخدم
app.post('/api/admin/add-balance', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId, amount } = req.body;
        await db.collection('users').doc(userId).update({ 
            balance: admin.firestore.FieldValue.increment(amount), 
            totalEarned: admin.firestore.FieldValue.increment(amount) 
        });
        await addNotification(userId, { 
            type: 'admin', 
            title: '💰 Balance Added', 
            message: `Admin added $${amount.toFixed(2)} to your account.` 
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// خصم رصيد من مستخدم
app.post('/api/admin/remove-balance', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId, amount } = req.body;
        await db.collection('users').doc(userId).update({ 
            balance: admin.firestore.FieldValue.increment(-amount) 
        });
        await addNotification(userId, { 
            type: 'admin', 
            title: '💰 Balance Adjusted', 
            message: `Admin removed $${amount.toFixed(2)} from your account.` 
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// حظر مستخدم من السحب
app.post('/api/admin/block-user', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId } = req.body;
        await db.collection('users').doc(userId).update({ 
            withdrawBlocked: true, 
            withdrawBlockedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        await addNotification(userId, { 
            type: 'blocked', 
            title: '🚫 Account Restricted', 
            message: 'Your withdrawal access has been permanently blocked.' 
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إرسال إشعار جماعي
app.post('/api/admin/broadcast', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    const { message } = req.body;
    if (!message) return res.json({ success: false, error: 'No message' });
    const result = await broadcastToAllUsers(message);
    res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. 📋 إدارة المهام (Task Management APIs)
// ═══════════════════════════════════════════════════════════════════════════

// الحصول على جميع المهام
app.get('/api/tasks', async (req, res) => {
    if (!db) return res.json({ success: true, tasks: [] });
    try {
        const tasksSnapshot = await db.collection('tasks').get();
        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// إضافة مهمة جديدة (للمشرف فقط)
app.post('/api/admin/tasks', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { type, name, username, link, reward, resetPeriod } = req.body;
        if (!type || !name || !reward) {
            return res.json({ success: false, error: 'Missing required fields' });
        }
        const newTask = {
            id: Date.now().toString(),
            type, // 'telegram_channel', 'telegram_bot', 'youtube', 'tiktok'
            name,
            username: username || null,
            link: link || null,
            reward: parseFloat(reward),
            resetPeriod: resetPeriod || 'once', // 'daily', 'weekly', 'once'
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true
        };
        await db.collection('tasks').doc(newTask.id).set(newTask);
        res.json({ success: true, task: newTask });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// حذف مهمة (للمشرف فقط)
app.delete('/api/admin/tasks/:taskId', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { taskId } = req.params;
        await db.collection('tasks').doc(taskId).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// تحديث مهمة (للمشرف فقط)
app.put('/api/admin/tasks/:taskId', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { taskId } = req.params;
        const updates = req.body;
        await db.collection('tasks').doc(taskId).update(updates);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. 🚀 تشغيل الخادم
// ═══════════════════════════════════════════════════════════════════════════

// تقديم الواجهة الأمامية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tonconnect-manifest.json', (req, res) => {
    res.json({
        url: APP_URL,
        name: 'AdNova Network',
        iconUrl: `${APP_URL}/icon.png`,
        termsOfUseUrl: `${APP_URL}/terms`,
        privacyPolicyUrl: `${APP_URL}/privacy`
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`\n🌟 AdNova Network Server v4.0`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔥 Firebase: ${db ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`👑 Admin ID: ${ADMIN_ID || '❌ Not configured'}`);
    console.log(`🤖 Bot: ${BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🌐 App URL: ${APP_URL}`);
    console.log(`\n💰 Ad Reward: $${APP_CONFIG.adReward}`);
    console.log(`📊 Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
    console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw}`);
    console.log(`👥 Required Referrals: ${APP_CONFIG.requiredReferrals}`);
    console.log(`\n✅ Server ready for production!\n`);
});

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
