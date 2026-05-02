// ============================================================================
// ADNOVA NETWORK - SERVER v5.0 (النسخة الأسطورية النهائية)
// ============================================================================
// خادم متكامل مع Firebase، بوت تليجرام، APIs آمنة، إدارة مهام كاملة،
// التحقق الحقيقي من انضمام القنوات، لوحة مشرف متطورة
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// 1. 📦 المكتبات والاعتماديات (Dependencies)
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
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

// تحميل Firebase Admin Key
try {
    const firebasePath = '/etc/secrets/firebase-admin-key.json';
    if (fs.existsSync(firebasePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
        console.log('✅ Firebase Admin key loaded');
    }
} catch (error) {
    console.error('❌ Firebase Admin key error:', error.message);
}

// تحميل Firebase Web Config
try {
    const configPath = '/etc/secrets/firebase-web-config.json';
    if (fs.existsSync(configPath)) {
        firebaseWebConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Firebase Web config loaded');
    }
} catch (error) {
    console.error('❌ Firebase Web config error:', error.message);
}

// تحميل إعدادات المشرف
try {
    const adminPath = '/etc/secrets/admin-config.json';
    if (fs.existsSync(adminPath)) {
        const adminConfig = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
        ADMIN_ID = adminConfig.admin_id;
        ADMIN_PASSWORD = adminConfig.admin_password;
        console.log('✅ Admin config loaded | ID:', ADMIN_ID);
    }
} catch (error) {
    console.error('❌ Admin config error:', error.message);
}

// تحميل TON API Key
try {
    const tonPath = '/etc/secrets/ton-api-key.txt';
    if (fs.existsSync(tonPath)) {
        TON_API_KEY = fs.readFileSync(tonPath, 'utf8').trim();
        console.log('✅ TON API key loaded');
    }
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

// طرق السحب المدعومة (للمستخدم)
const WITHDRAWAL_METHODS = [
    { id: "paypal", name: "PayPal", icon: "fab fa-paypal" },
    { id: "skrill", name: "Skrill", icon: "fab fa-skrill" },
    { id: "payoneer", name: "Payoneer", icon: "fab fa-payoneer" },
    { id: "usdt_bep20", name: "USDT (BEP20)", icon: "fab fa-bitcoin" },
    { id: "usdt_trc20", name: "USDT (TRC20)", icon: "fab fa-bitcoin" },
    { id: "ton", name: "TON", icon: "fab fa-telegram" },
    { id: "binance_pay", name: "Binance Pay", icon: "fab fa-binance" },
    { id: "sbp", name: "SBP (Russia)", icon: "fas fa-phone" },
    { id: "mobile", name: "Mobile Recharge", icon: "fas fa-mobile-alt" },
    { id: "pubg", name: "PUBG UC", icon: "fas fa-gamepad" },
    { id: "freefire", name: "Free Fire", icon: "fas fa-fire" }
];

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
// 5. 🤖 Telegram Bot مع رسالة ترحيب أسطورية
// ═══════════════════════════════════════════════════════════════════════════

const bot = new Telegraf(BOT_TOKEN);
const botAdminSessions = new Map();

// رسالة الترحيب الأسطورية
bot.start(async (ctx) => {
    const refCode = ctx.startPayload;
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || 'AdNova User';
    const userUsername = ctx.from.username || '';
    
    console.log(`🚀 /start from ${userId}, ref: ${refCode || 'none'}`);
    
    let isNewUser = false;
    let userBalance = 0;
    
    if (db) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            isNewUser = true;
            const userData = createNewUser(userId, userName, userUsername, refCode);
            await userRef.set(userData);
            userBalance = APP_CONFIG.welcomeBonus;
            console.log(`✅ New user created via bot: ${userId}`);
            
            if (refCode && refCode !== userId) {
                await processReferralFromBot(refCode, userId, userName);
            }
        } else {
            const data = userDoc.data();
            userBalance = data.balance || 0;
        }
    }
    
    // ========== رسالة الترحيب الأسطورية ==========
    const welcomeMessage = `
🌟 *WELCOME TO ADNOVA NETWORK* 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Hello ${userName}!* 👋

We're excited to have you join the *#1 Earning Platform* on Telegram!

${isNewUser ? `🎁 *WELCOME BONUS CLAIMED!* 🎁\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 *+$${APP_CONFIG.welcomeBonus}* added to your balance!\n💎 *Current Balance:* $${userBalance.toFixed(2)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ''}

📺 *WATCH ADS & EARN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💰 *$${APP_CONFIG.adReward}* per ad watched
• 📊 *${APP_CONFIG.dailyAdLimit} ads* per day
• ⚡ *Instant credit* to your balance

👥 *INVITE FRIENDS & EARN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🎁 *$${APP_CONFIG.referralBonus}* for each friend who joins
• 👑 No limit on referrals
• 🏆 *Special bonuses* at milestones

✅ *COMPLETE TASKS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 📢 Join Telegram channels
• 🤖 Start Telegram bots
• 🎥 Subscribe to YouTube
• 🎵 Follow on TikTok
• 💰 Earn *$0.05 - $0.50* per task

💳 *WITHDRAWAL METHODS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💳 PayPal / Skrill / Payoneer
• ₿ USDT (BEP20 & TRC20)
• 📱 TON / SBP (Russia)
• 🎮 PUBG UC / Free Fire
• 📞 Mobile Recharge

📊 *REQUIREMENTS TO WITHDRAW*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💰 Minimum: *$${APP_CONFIG.minWithdraw}*
• 👥 Required referrals: *${APP_CONFIG.requiredReferrals}*
• ✅ Must complete at least *10 tasks*

🚀 *READY TO START?*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👇 *Click the button below to open the app*

🔒 *Your funds are SAFE* | ⚡ *Instant withdrawals* | 🎯 *24/7 Support*
    `;
    
    // لوحة أزرار جميلة
    const keyboard = {
        inline_keyboard: [
            [{ text: "🚀 OPEN ADNOVA APP", web_app: { url: APP_URL } }],
            [
                { text: "📊 MY STATS", callback_data: "my_stats" },
                { text: "💸 WITHDRAW", callback_data: "quick_withdraw" }
            ],
            [
                { text: "👥 SUPPORT GROUP", url: "https://t.me/AdNovaSupport" },
                { text: "📢 OFFICIAL CHANNEL", url: "https://t.me/AdNovaNetwork" }
            ]
        ]
    };
    
    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// أمر الإحصائيات السريع
bot.action('my_stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!db) return ctx.reply('⚠️ Database maintenance...');
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        await ctx.reply(
            `📊 *YOUR STATS* 📊\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `👥 *Referrals:* ${data.inviteCount || 0} / ${APP_CONFIG.requiredReferrals}\n` +
            `📺 *Ads Watched:* ${data.adsWatched || 0}\n` +
            `📅 *Today:* ${data.adsToday || 0} / ${APP_CONFIG.dailyAdLimit}\n` +
            `💵 *Total Earned:* $${data.totalEarned?.toFixed(2) || '0.00'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 *Your referral link:*\n` +
            `\`t.me/${APP_CONFIG.botUsername}?start=${userId}\``,
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply('❌ User not found. Please start the app first.');
    }
    await ctx.answerCbQuery();
});

// أمر سحب سريع
bot.action('quick_withdraw', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!db) return ctx.reply('⚠️ Database maintenance...');
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        const minWithdraw = APP_CONFIG.minWithdraw;
        const requiredRefs = APP_CONFIG.requiredReferrals;
        
        if (data.balance < minWithdraw) {
            await ctx.reply(`❌ *Minimum withdrawal is $${minWithdraw}*\nYour balance: $${data.balance?.toFixed(2) || '0.00'}\n\nKeep watching ads and inviting friends!`, { parse_mode: 'Markdown' });
        } else if ((data.inviteCount || 0) < requiredRefs) {
            await ctx.reply(`❌ *Need ${requiredRefs} referrals to withdraw*\nYour referrals: ${data.inviteCount || 0}\n\nShare your referral link to earn more!`, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(`✅ *You can withdraw!*\nYour balance: $${data.balance?.toFixed(2)}\n\nOpen the app to request withdrawal.`, { parse_mode: 'Markdown' });
        }
    }
    await ctx.answerCbQuery();
});

// أمر الإحصائيات عبر النص
bot.command('stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!db) return ctx.reply('⚠️ Maintenance mode...');
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        await ctx.reply(
            `📊 *YOUR ADNOVA STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `👥 *Invites:* ${data.inviteCount || 0} / ${APP_CONFIG.requiredReferrals}\n` +
            `📺 *Ads watched:* ${data.adsWatched || 0}\n` +
            `📅 *Today:* ${data.adsToday || 0} / ${APP_CONFIG.dailyAdLimit}\n` +
            `💵 *Total earned:* $${data.totalEarned?.toFixed(2) || '0.00'}\n\n` +
            `🔗 *Your referral link:*\n\`t.me/${APP_CONFIG.botUsername}?start=${userId}\``,
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply('❌ User not found. Please start the bot first with /start');
    }
});

// أمر مساعدة
bot.command('help', async (ctx) => {
    await ctx.reply(
        `📚 *HELP CENTER*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📺 *How to earn?*\n• Watch ads daily (${APP_CONFIG.dailyAdLimit} ads/day)\n• Complete tasks (channels & bots)\n• Invite friends (unlimited)\n\n` +
        `💳 *Withdrawal methods:*\n• PayPal / Skrill / Payoneer\n• USDT (BEP20 & TRC20)\n• TON / SBP\n• Mobile recharge\n• PUBG UC / Free Fire\n\n` +
        `📊 *Requirements:*\n• Minimum $${APP_CONFIG.minWithdraw}\n• ${APP_CONFIG.requiredReferrals} referrals\n\n` +
        `❓ *Need help?* Contact @AdNovaSupport`,
        { parse_mode: 'Markdown' }
    );
});

// أمر المشرف
bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!* You are not authorized to use admin commands.', { parse_mode: 'Markdown' });
    ctx.reply('🔐 *Admin Access*\n━━━━━━━━━━━━━━━━━━━━━━\nPlease enter your admin password to continue:', { parse_mode: 'Markdown' });
    botAdminSessions.set(userId, { step: 'awaiting_password' });
});

// معالجة الرسائل النصية للمشرف
bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const session = botAdminSessions.get(userId);
    if (!session) return;
    
    const text = ctx.message.text;
    
    if (session.step === 'awaiting_password') {
        if (text === ADMIN_PASSWORD) {
            botAdminSessions.set(userId, { step: 'authenticated' });
            ctx.reply(
                `✅ *Authenticated!*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 *Admin Commands:*\n` +
                `• /broadcast - Send message to all users\n` +
                `• /stats - Bot statistics\n` +
                `• /users - Total users count`,
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply('❌ *Wrong password!* Access denied.', { parse_mode: 'Markdown' });
            botAdminSessions.delete(userId);
        }
        return;
    }
    
    if (session.step === 'authenticated') {
        if (text === '/broadcast') {
            ctx.reply('📝 *Send me the message to broadcast to all users:*', { parse_mode: 'Markdown' });
            botAdminSessions.set(userId, { step: 'awaiting_broadcast' });
        } else if (text === '/stats') {
            const stats = await getBotStats();
            ctx.reply(stats, { parse_mode: 'Markdown' });
        } else if (text === '/users') {
            const usersCount = await getTotalUsersCount();
            ctx.reply(`👥 *Total Registered Users:* ${usersCount}`, { parse_mode: 'Markdown' });
        }
        return;
    }
    
    if (session.step === 'awaiting_broadcast') {
        ctx.reply('📢 *Broadcasting message to all users...*', { parse_mode: 'Markdown' });
        const result = await broadcastToAllUsers(text);
        if (result.success) {
            ctx.reply(`✅ *Broadcast sent to ${result.notifiedCount} users!*`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('❌ *Error sending broadcast:* ' + result.error, { parse_mode: 'Markdown' });
        }
        botAdminSessions.delete(userId);
    }
});

// دوال مساعدة للبوت
async function getBotStats() {
    if (!db) return '📊 *Database not connected*';
    const usersSnapshot = await db.collection('users').get();
    const pendingWithdrawals = await db.collection('withdrawals').where('status', '==', 'pending').get();
    const tasksSnapshot = await db.collection('tasks').get();
    return `📊 *BOT STATISTICS*\n━━━━━━━━━━━━━━━━━━━━━━\n👥 *Total Users:* ${usersSnapshot.size}\n💸 *Pending Withdrawals:* ${pendingWithdrawals.size}\n📋 *Active Tasks:* ${tasksSnapshot.size}\n🕐 *Uptime:* ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
}

async function getTotalUsersCount() {
    if (!db) return 0;
    const snapshot = await db.collection('users').get();
    return snapshot.size;
}

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
        completedTasks: [],
        taskLastCompletions: {},
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
                
                bot.telegram.sendMessage(referrerId, 
                    `🎉 *NEW REFERRAL!* 🎉\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *${newUserName}* joined using your link!\n💰 *+$${APP_CONFIG.referralBonus.toFixed(2)}* added to your balance!\n👥 *Total referrals:* ${(referrerData.inviteCount || 0) + 1}`, 
                    { parse_mode: 'Markdown' }
                ).catch(() => {});
            }
        }
    } catch (error) {
        console.error('Referral processing error:', error);
    }
}

async function verifyChannelMembership(userId, channelUsername) {
    try {
        const chatMember = await bot.telegram.getChatMember(`@${channelUsername.replace('@', '')}`, parseInt(userId));
        const status = chatMember.status;
        return ['member', 'administrator', 'creator'].includes(status);
    } catch (error) {
        console.error(`Verify channel error for ${channelUsername}:`, error.message);
        return false;
    }
}

// تشغيل البوت
bot.launch({ dropPendingUpdates: true })
    .then(() => console.log('🤖 Telegram Bot started successfully'))
    .catch(err => console.error('❌ Bot error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ═══════════════════════════════════════════════════════════════════════════
// 6. 🌐 Middleware والإعدادات العامة
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
        adminId: ADMIN_ID,
        welcomeBonus: APP_CONFIG.welcomeBonus,
        referralBonus: APP_CONFIG.referralBonus,
        adReward: APP_CONFIG.adReward,
        dailyAdLimit: APP_CONFIG.dailyAdLimit,
        minWithdraw: APP_CONFIG.minWithdraw,
        requiredReferrals: APP_CONFIG.requiredReferrals,
        botUsername: APP_CONFIG.botUsername,
        withdrawalMethods: WITHDRAWAL_METHODS
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
        
        if (userData.lastAdDate !== today) {
            userData.adsToday = 0;
        }
        
        if (userData.adsToday >= APP_CONFIG.dailyAdLimit) {
            return res.json({ success: false, error: 'Daily limit reached', limitReached: true });
        }
        
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
        
        res.json({ success: true, balance: newBalance, totalEarned: newTotalEarned, adsWatched: newAdsWatched, adsToday: newAdsToday });
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
        
        const isMember = await verifyChannelMembership(userId, channelUsername);
        
        if (!isMember) {
            return res.json({ success: false, error: 'User is not a member of the channel' });
        }
        
        if (db && reward) {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                // التحقق من أن المهمة لم تكتمل من قبل (أو تحتاج تجديد)
                const userData = userDoc.data();
                const completedTasks = userData.completedTasks || [];
                
                if (!completedTasks.includes(taskId)) {
                    const newCompletedTasks = [...completedTasks, taskId];
                    
                    await userRef.update({
                        balance: admin.firestore.FieldValue.increment(reward),
                        totalEarned: admin.firestore.FieldValue.increment(reward),
                        completedTasks: newCompletedTasks,
                        [`taskLastCompletions.${taskId}`]: new Date().toISOString()
                    });
                    
                    await addNotification(userId, {
                        type: 'success',
                        title: '✅ Task Completed!',
                        message: `+$${reward.toFixed(2)} added from ${channelUsername}`
                    });
                }
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
        
        if (userData.withdrawBlocked) {
            return res.json({ success: false, error: 'Account blocked from withdrawals' });
        }
        
        if (amount < APP_CONFIG.minWithdraw) {
            return res.json({ success: false, error: `Minimum withdrawal is $${APP_CONFIG.minWithdraw}` });
        }
        
        if (amount > (userData.balance || 0)) {
            return res.json({ success: false, error: 'Insufficient balance' });
        }
        
        if ((userData.inviteCount || 0) < APP_CONFIG.requiredReferrals) {
            return res.json({ success: false, error: `Need ${APP_CONFIG.requiredReferrals} referrals to withdraw` });
        }
        
        const newBalance = (userData.balance || 0) - amount;
        
        const withdrawRequest = {
            userId, userName, amount, method, destination,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userInvites: userData.inviteCount || 0,
            userAds: userData.adsWatched || 0
        };
        
        const docRef = await db.collection('withdrawals').add(withdrawRequest);
        
        await userRef.update({ balance: newBalance });
        
        await addNotification(userId, {
            type: 'withdraw',
            title: '💸 Withdrawal Requested',
            message: `Your withdrawal of $${amount.toFixed(2)} via ${method} is being processed.`
        });
        
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, 
                `💸 *NEW WITHDRAWAL REQUEST*\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *User:* ${userName} (${userId})\n💰 *Amount:* $${amount.toFixed(2)}\n💳 *Method:* ${method}\n📮 *Destination:* ${destination}\n👥 *Referrals:* ${userData.inviteCount || 0}\n📺 *Ads:* ${userData.adsWatched || 0}`,
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

app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (!password) return res.json({ success: false, error: 'Password required' });
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Authenticated' });
    } else {
        res.json({ success: false, error: 'Invalid password' });
    }
});

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
        res.json({ success: true, stats: { totalUsers: usersSnapshot.size, pendingWithdrawals: pendingWithdrawals.size, totalBalance, totalEarned } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, users: [] });
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: data.userId, userName: data.userName, balance: data.balance,
                inviteCount: data.inviteCount, adsWatched: data.adsWatched,
                totalEarned: data.totalEarned, withdrawBlocked: data.withdrawBlocked || false
            });
        });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/admin/approve-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { withdrawalId } = req.body;
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) return res.json({ success: false, error: 'Not found' });
        const data = withdrawalDoc.data();
        await withdrawalRef.update({ status: 'approved', approvedAt: admin.firestore.FieldValue.serverTimestamp() });
        await addNotification(data.userId, {
            type: 'withdraw', title: '✅ Withdrawal Approved!',
            message: `Your withdrawal of $${data.amount.toFixed(2)} has been approved.`
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/reject-withdrawal', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { withdrawalId, reason } = req.body;
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) return res.json({ success: false, error: 'Not found' });
        const data = withdrawalDoc.data();
        const userRef = db.collection('users').doc(data.userId);
        await userRef.update({ balance: admin.firestore.FieldValue.increment(data.amount) });
        await withdrawalRef.update({ status: 'rejected', rejectedAt: admin.firestore.FieldValue.serverTimestamp(), rejectReason: reason });
        await addNotification(data.userId, {
            type: 'withdraw', title: '❌ Withdrawal Rejected',
            message: `Your withdrawal of $${data.amount.toFixed(2)} was rejected. Reason: ${reason || 'Not specified'}\nThe amount has been returned.`
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/add-balance', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId, amount } = req.body;
        await db.collection('users').doc(userId).update({ balance: admin.firestore.FieldValue.increment(amount), totalEarned: admin.firestore.FieldValue.increment(amount) });
        await addNotification(userId, { type: 'admin', title: '💰 Balance Added', message: `Admin added $${amount.toFixed(2)} to your account.` });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/remove-balance', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId, amount } = req.body;
        await db.collection('users').doc(userId).update({ balance: admin.firestore.FieldValue.increment(-amount) });
        await addNotification(userId, { type: 'admin', title: '💰 Balance Adjusted', message: `Admin removed $${amount.toFixed(2)} from your account.` });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/block-user', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { userId } = req.body;
        await db.collection('users').doc(userId).update({ withdrawBlocked: true, withdrawBlockedAt: admin.firestore.FieldValue.serverTimestamp() });
        await addNotification(userId, { type: 'blocked', title: '🚫 Account Restricted', message: 'Your withdrawal access has been permanently blocked.' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.get('/api/tasks', async (req, res) => {
    if (!db) return res.json({ success: true, tasks: [] });
    try {
        const tasksSnapshot = await db.collection('tasks').where('active', '==', true).get();
        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/tasks', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false });
    try {
        const { type, name, identifier, username, link, reward, resetPeriod, active } = req.body;
        if (!type || !name || !reward) {
            return res.json({ success: false, error: 'Missing required fields' });
        }
        const newTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type,
            name,
            identifier: identifier || username || link || '',
            username: username || identifier || link || '',
            link: link || identifier || username || '',
            reward: parseFloat(reward),
            resetPeriod: resetPeriod || 'once',
            active: active !== false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: ADMIN_ID
        };
        await db.collection('tasks').doc(newTask.id).set(newTask);
        res.json({ success: true, task: newTask });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

// ═══════════════════════════════════════════════════════════════════════════
// 15. 🕐 مهمة مجدولة لإعادة تعيين المهام اليومية (Cron Job)
// ═══════════════════════════════════════════════════════════════════════════

cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running daily task reset...');
    if (!db) return;
    
    try {
        const tasksSnapshot = await db.collection('tasks').where('resetPeriod', 'in', ['daily', 'weekly']).get();
        const usersSnapshot = await db.collection('users').get();
        
        let resetCount = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (const taskDoc of tasksSnapshot.docs) {
            const task = taskDoc.data();
            
            for (const userDoc of usersSnapshot.docs) {
                const user = userDoc.data();
                const lastCompletion = user.taskLastCompletions?.[task.id];
                
                if (lastCompletion) {
                    const lastDate = lastCompletion.split('T')[0];
                    let shouldReset = false;
                    
                    if (task.resetPeriod === 'daily') {
                        shouldReset = lastDate !== today;
                    } else if (task.resetPeriod === 'weekly') {
                        const lastWeek = new Date(lastCompletion);
                        const now = new Date();
                        const daysDiff = (now - lastWeek) / (1000 * 60 * 60 * 24);
                        shouldReset = daysDiff >= 7;
                    }
                    
                    if (shouldReset && user.completedTasks?.includes(task.id)) {
                        await db.collection('users').doc(userDoc.id).update({
                            completedTasks: admin.firestore.FieldValue.arrayRemove(task.id)
                        });
                        resetCount++;
                    }
                }
            }
        }
        
        console.log(`✅ Reset ${resetCount} task completions`);
    } catch (error) {
        console.error('Cron job error:', error);
    }
}, { timezone: "UTC" });

// ═══════════════════════════════════════════════════════════════════════════
// 16. 🚀 تقديم الواجهة الأمامية وتشغيل الخادم
// ═══════════════════════════════════════════════════════════════════════════

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

app.listen(PORT, () => {
    console.log(`\n🌟 ADNOVA NETWORK SERVER v5.0`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔥 Firebase: ${db ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`👑 Admin ID: ${ADMIN_ID || '❌ Not configured'}`);
    console.log(`🤖 Bot: ${BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🌐 App URL: ${APP_URL}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💰 Ad Reward: $${APP_CONFIG.adReward}`);
    console.log(`📊 Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
    console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw}`);
    console.log(`👥 Required Referrals: ${APP_CONFIG.requiredReferrals}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Server ready for production!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
