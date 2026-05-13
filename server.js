// ============================================================================
// ADNOVA NETWORK - SERVER v14.0 (نسخة نظيفة ومحسنة)
// ============================================================================
// خادم متكامل مع Firebase، بوت تليجرام، APIs آمنة، إدارة مهام كاملة عبر البوت
// جميع إدارة المشرف تتم عبر البوت فقط (بدون لوحة مشرف في التطبيق)
// الميزات: إحالات، مهام، سحوبات، تحقق، TON Connect، بث جماعي
// ============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. 🔐 قراءة Secret Files من Render
// ============================================================================

let serviceAccount = null;
let firebaseWebConfig = {};
let ADMIN_ID = null;
let ADMIN_PASSWORD = null;
let TON_API_KEY = null;
let PLATFORM_TON_WALLET = null;
let BOT_TOKEN = null;
let APP_URL = null;

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
    console.log('✅ Admin config loaded | ID:', ADMIN_ID);
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

PLATFORM_TON_WALLET = process.env.OWNER_WALLET || null;
if (PLATFORM_TON_WALLET) {
    console.log('✅ TON Platform Wallet loaded from OWNER_WALLET:', PLATFORM_TON_WALLET);
} else {
    console.log('⚠️ OWNER_WALLET not set in environment variables');
}

BOT_TOKEN = process.env.BOT_TOKEN;
APP_URL = process.env.APP_URL;

// ============================================================================
// 2. ⚙️ إعدادات التطبيق
// ============================================================================

const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.1,
    dailyAdLimit: 50,
    minWithdraw: 50.00,
    requiredReferrals: 0,
    requiredReferralsForVerify: 30,
    botUsername: "AdNovaNetworkBot"
};

// ============================================================================
// 3. 🔥 Firebase Admin SDK
// ============================================================================

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
// ============================================================================
// 4. 🤖 Telegram Bot - جلسات المشرف والمهام
// ============================================================================

const bot = new Telegraf(BOT_TOKEN);
const botAdminSessions = new Map();
const taskCreationSessions = new Map();
const taskEditSessions = new Map();

let withdrawalsCurrentPage = 1;
let withdrawalsTotalPages = 1;
let withdrawalsCache = [];

// ============================================================================
// 4.1 دوال مساعدة عامة
// ============================================================================
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
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            await userRef.update({
                notifications: admin.firestore.FieldValue.arrayUnion(notifData)
            });
        }
        console.log(`✅ Notification sent to ${targetUserId}: ${notification.title}`);
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
        let botSentCount = 0;
        for (const doc of usersSnapshot.docs) {
            try {
                await bot.telegram.sendMessage(doc.id, `📢 *Announcement*\n\n${message}`, { parse_mode: 'Markdown' });
                botSentCount++;
                if (botSentCount % 30 === 0) await new Promise(r => setTimeout(r, 2000));
                else await new Promise(r => setTimeout(r, 50));
            } catch(e) {}
        }
        console.log(`📢 Broadcast sent to ${notifiedCount} users (${botSentCount} bot messages)`);
        return { success: true, notifiedCount, botSentCount };
    } catch (error) {
        console.error('Broadcast error:', error);
        return { success: false, error: error.message };
    }
}

// ====== تحديث عداد المستخدمين الجدد ======
async function updateNewUserCounter(userId, userName) {
    console.log("🔥 updateNewUserCounter START for:", userId);
    
    if (!db) {
        console.log("❌ db not connected");
        return;
    }
    
    try {
        const counterRef = db.collection('system').doc('newUserCounter');
        console.log("📁 Counter reference created");
        
        const doc = await counterRef.get();
        console.log("📖 Counter read, exists:", doc.exists);
        
        const currentCount = doc.data()?.count || 0;
        console.log("🔢 Current count:", currentCount);
        
        const newCount = currentCount + 1;
        console.log("🔢 New count:", newCount);
        
        await counterRef.set({ count: newCount });
        console.log(`✅ User counter updated: #${newCount} (${userName} - ${userId})`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
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
        isVerified: false,
        verificationMethod: null,
        verificationDate: null,
        tonWalletVerified: false,
        tonVerificationTxId: null,
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
                    `🎉 *NEW REFERRAL!*\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *${newUserName}* joined!\n💰 *+$${APP_CONFIG.referralBonus.toFixed(2)}* added!`, 
                    { parse_mode: 'Markdown' }
                ).catch(() => {});
                console.log(`✅ Referral processed: ${referrerId} referred ${newUserId}`);
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
        const isMember = ['member', 'administrator', 'creator'].includes(status);
        console.log(`🔍 Verify ${userId} in ${channelUsername}: ${isMember} (status: ${status})`);
        return isMember;
    } catch (error) {
        console.error(`Verify channel error for ${channelUsername}:`, error.message);
        return false;
    }
}

async function sendWelcomeMessage(ctx, userId, userName, isNewUser = false) {
    const welcomeText = 
`🌟 *WELCOME TO ADNOVA NETWORK* 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Hello ${userName}!* 👋

We're excited to have you join the *#1 Earning Platform* on Telegram!

${isNewUser ? `🎁 *WELCOME BONUS CLAIMED!* 🎁
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *+$${APP_CONFIG.welcomeBonus}* added to your balance!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ''}📺 *WATCH ADS & EARN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💰 *$${APP_CONFIG.adReward}* per ad watched
• 📊 *${APP_CONFIG.dailyAdLimit} ads* per day
• ⚡ *Instant credit* to your balance

👥 *INVITE FRIENDS & EARN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🎁 *$${APP_CONFIG.referralBonus}* for each friend
• 👑 No limit on referrals

✅ *COMPLETE TASKS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 📢 Join Telegram channels
• 🤖 Start Telegram bots
• 🎥 Subscribe to YouTube
• 🎵 Follow on TikTok
• 🐦 Follow on Twitter
• 📘 Like/Follow Facebook Pages
• 💰 Earn *$0.05 - $50* per task

💳 *WITHDRAWAL METHODS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💳 PayPal / Skrill / Payoneer / Binance Pay
• ₿ USDT (BEP20 & TRC20)
• 📱 TON / SBP (Russia)
• 🎮 PUBG UC / Free Fire

📢 *PUBLISH YOUR TASKS ON ADNOVA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Starting at just *$0.05* per task
✅ Get real user engagement
✅ Simple & fast setup
✅ Target active audience

💬 *Contact admin through the app*

🚀 *READY TO START?*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👇 *Click the button below*`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🚀 OPEN ADNOVA APP", web_app: { url: APP_URL } }],
            [{ text: "📊 MY STATS", callback_data: "my_stats" }, { text: "💸 WITHDRAW", callback_data: "quick_withdraw" }],
            [{ text: "👥 SUPPORT", url: "https://t.me/AdNovaSupport" }]
        ]
    };
    await ctx.reply(welcomeText, { parse_mode: 'Markdown', reply_markup: keyboard });
}

// ✅ دالة مساعدة جديدة لإنشاء المهام (عادية أو محدودة)
async function createNewTask(taskData, ctx) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newTask = {
        id: taskId,
        type: taskData.type,
        name: taskData.name,
        identifier: taskData.identifier,
        username: taskData.identifier,
        link: taskData.identifier,
        reward: taskData.reward,
        resetPeriod: taskData.resetPeriod,
        active: true,
        isLimited: taskData.isLimited || false,
        maxCompletions: taskData.maxCompletions || 0,
        completedCount: 0,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID
    };
    
    await db.collection('tasks').doc(taskId).set(newTask);
    return taskId;
}

// ============================================================================
// 4.2 دوال إدارة طلبات السحب عبر البوت
// ============================================================================

async function getUserStatsForWithdrawal(userId) {
    if (!db) return { inviteCount: 0, adsWatched: 0, userName: 'Unknown' };
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            return {
                inviteCount: data.inviteCount || 0,
                adsWatched: data.adsWatched || 0,
                userName: data.userName || 'User'
            };
        }
        return { inviteCount: 0, adsWatched: 0, userName: 'Unknown' };
    } catch (error) {
        console.error('Error getting user stats:', error);
        return { inviteCount: 0, adsWatched: 0, userName: 'Unknown' };
    }
}

async function showPendingWithdrawals(ctx, page = 1) {
    if (!db) {
        await ctx.reply('⚠️ Database not connected. Please try again later.');
        return;
    }
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        const allWithdrawals = [];
        for (const doc of withdrawalsSnapshot.docs) {
            allWithdrawals.push({ id: doc.id, ...doc.data() });
        }
        withdrawalsCache = allWithdrawals;
        withdrawalsTotalPages = Math.ceil(allWithdrawals.length / 10);
        if (allWithdrawals.length === 0) {
            await ctx.reply(
                '✅ *No Pending Withdrawals*\n━━━━━━━━━━━━━━━━━━━━━━\n\nAll withdrawal requests have been processed.',
                { parse_mode: 'Markdown' }
            );
            return;
        }
        const start = (page - 1) * 10;
        const end = start + 10;
        const pageWithdrawals = allWithdrawals.slice(start, end);
        let message = `💸 *PENDING WITHDRAWALS* (Page ${page}/${withdrawalsTotalPages})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < pageWithdrawals.length; i++) {
            const wd = pageWithdrawals[i];
            const userStats = await getUserStatsForWithdrawal(wd.userId);
            const date = wd.createdAt?.toDate ? wd.createdAt.toDate() : new Date(wd.createdAt);
            message += `*${start + i + 1}.* 👤 *${userStats.userName}*\n`;
            message += `┣ 🆔 ID: \`${wd.userId}\`\n`;
            message += `┣ 💰 Amount: *$${wd.amount?.toFixed(2)}*\n`;
            message += `┣ 💳 Method: *${wd.method}*\n`;
            message += `┣ 📧 Destination: \`${wd.destination}\`\n`;
            message += `┣ 👥 Referrals: *${userStats.inviteCount}*\n`;
            message += `┣ 📺 Ads Watched: *${userStats.adsWatched}*\n`;
            message += `┗ 📅 Date: ${date.toLocaleString()}\n`;
            message += `\n`;
        }
        const keyboard = { inline_keyboard: [] };
        for (let i = 0; i < pageWithdrawals.length; i++) {
            const wd = pageWithdrawals[i];
            keyboard.inline_keyboard.push([
                { text: `✅ Approve #${start + i + 1}`, callback_data: `approve_wd_${wd.id}` },
                { text: `❌ Reject #${start + i + 1}`, callback_data: `reject_wd_${wd.id}` }
            ]);
        }
        const navButtons = [];
        if (page > 1) navButtons.push({ text: "◀ Previous", callback_data: `wd_prev` });
        navButtons.push({ text: `📄 ${page}/${withdrawalsTotalPages}`, callback_data: `wd_page_info` });
        if (page < withdrawalsTotalPages) navButtons.push({ text: "Next ▶", callback_data: `wd_next` });
        keyboard.inline_keyboard.push(navButtons);
        keyboard.inline_keyboard.push([
            { text: "🔄 Refresh", callback_data: `wd_refresh` },
            { text: "❌ Close", callback_data: `wd_close` }
        ]);
        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        withdrawalsCurrentPage = page;
    } catch (error) {
        console.error('Error showing pending withdrawals:', error);
        await ctx.reply('❌ Error loading pending withdrawals. Please try again.');
    }
}

async function approveWithdrawalFromBot(withdrawalId, adminUserId) {
    if (!db) return { success: false, error: 'Database not connected' };
    try {
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) {
            return { success: false, error: 'Withdrawal request not found' };
        }
        const withdrawal = withdrawalDoc.data();
        if (withdrawal.status !== 'pending') {
            return { success: false, error: `This request has already been ${withdrawal.status}` };
        }
        await withdrawalRef.update({
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: adminUserId
        });
        await addNotification(withdrawal.userId, {
            type: 'withdraw',
            title: '✅ Withdrawal Approved',
            message: `Your withdrawal request of $${withdrawal.amount?.toFixed(2)} has been approved and will be processed within 24 hours.`
        });
        try {
            await bot.telegram.sendMessage(withdrawal.userId,
                `✅ *WITHDRAWAL APPROVED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 *Amount:* $${withdrawal.amount?.toFixed(2)}\n` +
                `💳 *Method:* ${withdrawal.method}\n` +
                `🕐 *Date:* ${new Date().toLocaleString()}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Your funds will be transferred within 24 hours.`,
                { parse_mode: 'Markdown' }
            );
        } catch(e) { console.error('Failed to send bot message:', e.message); }
        console.log(`✅ Withdrawal ${withdrawalId} approved by admin ${adminUserId}`);
        return { success: true };
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        return { success: false, error: error.message };
    }
}

async function rejectWithdrawalFromBot(withdrawalId, adminUserId, reason) {
    if (!db) return { success: false, error: 'Database not connected' };
    try {
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) {
            return { success: false, error: 'Withdrawal request not found' };
        }
        const withdrawal = withdrawalDoc.data();
        if (withdrawal.status !== 'pending') {
            return { success: false, error: `This request has already been ${withdrawal.status}` };
        }
        const userRef = db.collection('users').doc(withdrawal.userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            await userRef.update({
                balance: admin.firestore.FieldValue.increment(withdrawal.amount || 0)
            });
        }
        await withdrawalRef.update({
            status: 'rejected',
            rejectReason: reason,
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: adminUserId
        });
        await addNotification(withdrawal.userId, {
            type: 'withdraw',
            title: '❌ Withdrawal Rejected',
            message: `Your withdrawal request of $${withdrawal.amount?.toFixed(2)} was rejected. Reason: ${reason}. The amount has been returned to your balance.`
        });
        try {
            await bot.telegram.sendMessage(withdrawal.userId,
                `❌ *WITHDRAWAL REJECTED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 *Amount:* $${withdrawal.amount?.toFixed(2)}\n` +
                `💳 *Method:* ${withdrawal.method}\n` +
                `📝 *Reason:* ${reason}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `The amount has been returned to your balance.`,
                { parse_mode: 'Markdown' }
            );
        } catch(e) { console.error('Failed to send bot message:', e.message); }
        console.log(`❌ Withdrawal ${withdrawalId} rejected by admin ${adminUserId}. Reason: ${reason}`);
        return { success: true };
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// 4.3 دوال التحقق من المستخدمين (30 إحالة أو TON)
// ============================================================================

async function verifyUserByReferrals(userId) {
    if (!db) return { success: false, error: 'Database not connected' };
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return { success: false, error: 'User not found' };
        }
        const userData = userDoc.data();
        if (userData.isVerified) {
            return { success: false, error: 'User already verified', alreadyVerified: true };
        }
        const currentInvites = userData.inviteCount || 0;
        if (currentInvites >= APP_CONFIG.requiredReferralsForVerify) {
            await userRef.update({
                isVerified: true,
                verificationMethod: 'referrals',
                verificationDate: new Date().toISOString()
            });
            await addNotification(userId, {
                type: 'success',
                title: '✅ Account Verified!',
                message: `Your account has been verified through referrals. You can now withdraw funds.`
            });
            try {
                await bot.telegram.sendMessage(userId,
                    `✅ *ACCOUNT VERIFIED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Your account has been verified through *${currentInvites} referrals*.\n` +
                    `You can now withdraw funds from the app.\n\n` +
                    `💰 *Minimum withdrawal:* $${APP_CONFIG.minWithdraw}`,
                    { parse_mode: 'Markdown' }
                );
            } catch(e) { console.error('Failed to send bot message:', e.message); }
            console.log(`✅ User ${userId} verified via referrals (${currentInvites} invites)`);
            return { success: true, method: 'referrals' };
        } else {
            return { 
                success: false, 
                error: `You need ${APP_CONFIG.requiredReferralsForVerify - currentInvites} more referrals`,
                current: currentInvites,
                required: APP_CONFIG.requiredReferralsForVerify
            };
        }
    } catch (error) {
        console.error('Error verifying user by referrals:', error);
        return { success: false, error: error.message };
    }
}

async function verifyUserByTon(userId, txHash, amount) {
    if (!db) return { success: false, error: 'Database not connected' };
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return { success: false, error: 'User not found' };
        }
        const userData = userDoc.data();
        if (userData.isVerified) {
            return { success: false, error: 'User already verified', alreadyVerified: true };
        }
        await userRef.update({
            isVerified: true,
            verificationMethod: 'ton',
            verificationDate: new Date().toISOString(),
            tonWalletVerified: true,
            tonVerificationTxId: txHash
        });
        await addNotification(userId, {
            type: 'success',
            title: '✅ Account Verified!',
            message: `Your account has been verified through TON payment. You can now withdraw funds.`
        });
        try {
            await bot.telegram.sendMessage(userId,
                `✅ *ACCOUNT VERIFIED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Your account has been verified through *TON payment*.\n` +
                `You can now withdraw funds from the app.\n\n` +
                `💰 *Minimum withdrawal:* $${APP_CONFIG.minWithdraw}`,
                { parse_mode: 'Markdown' }
            );
        } catch(e) { console.error('Failed to send bot message:', e.message); }
        console.log(`✅ User ${userId} verified via TON payment (tx: ${txHash})`);
        return { success: true, method: 'ton' };
    } catch (error) {
        console.error('Error verifying user by TON:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// 4.4 أوامر البوت العامة
// ============================================================================

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
            console.log(`✅ New user created: ${userId}`);
            await updateNewUserCounter(userId, userName);
            if (refCode && refCode !== userId) {
                await processReferralFromBot(refCode, userId, userName);
            }
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
        await ctx.reply(
            `📊 *YOUR STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `👥 *Invites:* ${data.inviteCount || 0}\n` +
            `📺 *Ads watched:* ${data.adsWatched || 0}\n` +
            `📅 *Today:* ${data.adsToday || 0} / ${APP_CONFIG.dailyAdLimit}\n` +
            `🔐 *Verified:* ${data.isVerified ? '✅ Yes' : '❌ No'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 *Your link:*\n\`t.me/${APP_CONFIG.botUsername}?start=${userId}\``,
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply('❌ User not found. Please start the bot first with /start');
    }
});

bot.command('help', async (ctx) => {
    await ctx.reply(
        `📚 *HELP CENTER*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📺 *How to earn?*\n• Watch ads (${APP_CONFIG.dailyAdLimit}/day)\n• Complete tasks\n• Invite friends\n\n` +
        `💳 *Withdrawal methods:*\n• PayPal / Skrill / Payoneer\n• USDT (BEP20 & TRC20)\n• TON / SBP\n• Mobile recharge\n\n` +
        `🔐 *Verification:*\n• To withdraw, you need to verify your account\n• Option 1: Invite ${APP_CONFIG.requiredReferralsForVerify} friends (Free)\n• Option 2: Pay 0.01 TON (~$0.02 USD) (Fast)\n\n` +
        `❓ *Need help?* Contact @AdNovaSupport`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('tasks', async (ctx) => {
    if (!db) return ctx.reply('⚠️ Maintenance mode...');
    const tasksSnapshot = await db.collection('tasks').where('active', '==', true).get();
    if (tasksSnapshot.empty) {
        return ctx.reply('📋 *No tasks available at the moment.*\nCheck back later for new earning opportunities!', { parse_mode: 'Markdown' });
    }
    let taskList = '📋 *AVAILABLE TASKS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
    let index = 1;
    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        let typeIcon = '📢';
        if (task.type === 'channel') typeIcon = '📢';
        else if (task.type === 'bot') typeIcon = '🤖';
        else if (task.type === 'youtube') typeIcon = '🎥';
        else if (task.type === 'tiktok') typeIcon = '🎵';
        else if (task.type === 'twitter') typeIcon = '🐦';
        taskList += `${index}. ${typeIcon} *${task.name}*\n`;
        taskList += `   💰 Reward: *$${task.reward.toFixed(2)}*\n`;
        taskList += `   🔗 ${task.username || task.link || task.identifier}\n\n`;
        index++;
    }
    taskList += `━━━━━━━━━━━━━━━━━━━━━━\n💡 *Open the app to complete tasks and earn instantly!*`;
    await ctx.reply(taskList, { parse_mode: 'Markdown' });
});

// ============================================================================
// 4.5 أوامر المشرف المتقدمة (البحث، إضافة/خصم رصيد، تحقق يدوي)
// ============================================================================

bot.command('alimenfi', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) {
        console.log(`⛔ Unauthorized admin attempt from ${userId}`);
        return ctx.reply('⛔ *Access denied!* You are not authorized to use admin commands.', { parse_mode: 'Markdown' });
    }
    ctx.reply('🔐 *Admin Access*\n━━━━━━━━━━━━━━━━━━━━━━\nPlease enter your admin password:', { parse_mode: 'Markdown' });
    botAdminSessions.set(userId, { step: 'awaiting_password' });
});

bot.command('searchuser', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    const args = ctx.message.text.split(' ');
    args.shift();
    const targetUserId = args.join(' ').trim();
    if (!targetUserId) {
        return ctx.reply('📝 *Usage:* `/searchuser [user_id]`\nExample: `/searchuser 123456789`', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            return ctx.reply(`❌ User *${targetUserId}* not found.`, { parse_mode: 'Markdown' });
        }
        const data = userDoc.data();
        await ctx.reply(
            `👤 *USER INFO*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *ID:* ${data.userId}\n` +
            `👤 *Name:* ${data.userName}\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `👥 *Invites:* ${data.inviteCount || 0}\n` +
            `📺 *Ads Watched:* ${data.adsWatched || 0}\n` +
            `🔐 *Verified:* ${data.isVerified ? '✅ Yes' : '❌ No'}\n` +
            `📝 *Verification Method:* ${data.verificationMethod || 'None'}\n` +
            `🚫 *Blocked:* ${data.withdrawBlocked ? 'Yes' : 'No'}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error searching user:', error);
        ctx.reply('❌ Error fetching user data.');
    }
});

bot.command('addbalance', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply('📝 *Usage:* `/addbalance [user_id] [amount]`\nExample: `/addbalance 123456789 5.00`', { parse_mode: 'Markdown' });
    }
    const targetUserId = args[1];
    const amount = parseFloat(args[2]);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Invalid amount. Please enter a positive number.', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return ctx.reply(`❌ User *${targetUserId}* not found.`, { parse_mode: 'Markdown' });
        }
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(amount),
            totalEarned: admin.firestore.FieldValue.increment(amount)
        });
        await addNotification(targetUserId, {
            type: 'admin',
            title: '💰 Balance Added',
            message: `Admin added $${amount.toFixed(2)} to your account.`
        });
        ctx.reply(`✅ Added $${amount.toFixed(2)} to user *${targetUserId}*`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error adding balance:', error);
        ctx.reply('❌ Error adding balance.');
    }
});

bot.command('removebalance', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply('📝 *Usage:* `/removebalance [user_id] [amount]`\nExample: `/removebalance 123456789 5.00`', { parse_mode: 'Markdown' });
    }
    const targetUserId = args[1];
    const amount = parseFloat(args[2]);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Invalid amount. Please enter a positive number.', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return ctx.reply(`❌ User *${targetUserId}* not found.`, { parse_mode: 'Markdown' });
        }
        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;
        if (amount > currentBalance) {
            return ctx.reply(`❌ Cannot remove $${amount.toFixed(2)}. User balance is only $${currentBalance.toFixed(2)}.`, { parse_mode: 'Markdown' });
        }
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(-amount)
        });
        await addNotification(targetUserId, {
            type: 'admin',
            title: '💰 Balance Adjusted',
            message: `Admin removed $${amount.toFixed(2)} from your account.`
        });
        ctx.reply(`✅ Removed $${amount.toFixed(2)} from user *${targetUserId}*`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error removing balance:', error);
        ctx.reply('❌ Error removing balance.');
    }
});

bot.command('userstats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    const args = ctx.message.text.split(' ');
    args.shift();
    const targetUserId = args.join(' ').trim();
    if (!targetUserId) {
        return ctx.reply('📝 *Usage:* `/userstats [user_id]`\nExample: `/userstats 123456789`', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            return ctx.reply(`❌ User *${targetUserId}* not found.`, { parse_mode: 'Markdown' });
        }
        const data = userDoc.data();
        const withdrawals = data.withdrawals || [];
        const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
        const rejectedWithdrawals = withdrawals.filter(w => w.status === 'rejected');
        const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
        await ctx.reply(
            `📊 *DETAILED USER STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *ID:* ${data.userId}\n` +
            `👤 *Name:* ${data.userName}\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `📈 *Total Earned:* $${data.totalEarned?.toFixed(2) || '0.00'}\n` +
            `👥 *Invites:* ${data.inviteCount || 0}\n` +
            `📺 *Ads Watched:* ${data.adsWatched || 0}\n` +
            `🔐 *Verified:* ${data.isVerified ? '✅ Yes' : '❌ No'}\n` +
            `📝 *Verification Method:* ${data.verificationMethod || 'None'}\n` +
            `🚫 *Blocked:* ${data.withdrawBlocked ? 'Yes' : 'No'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💸 *Withdrawals:*\n` +
            `   ✅ Approved: ${approvedWithdrawals.length}\n` +
            `   ⏳ Pending: ${pendingWithdrawals.length}\n` +
            `   ❌ Rejected: ${rejectedWithdrawals.length}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error getting user stats:', error);
        ctx.reply('❌ Error fetching user data.');
    }
});

bot.command('pending', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    await showPendingWithdrawals(ctx, 1);
});

bot.command('withdrawals', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    await showPendingWithdrawals(ctx, 1);
});

bot.command('verifyuser', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    const args = ctx.message.text.split(' ');
    args.shift();
    const targetUserId = args.join(' ').trim();
    if (!targetUserId) {
        return ctx.reply('📝 *Usage:* `/verifyuser [user_id]`\nExample: `/verifyuser 123456789`', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return ctx.reply(`❌ User *${targetUserId}* not found.`, { parse_mode: 'Markdown' });
        }
        const userData = userDoc.data();
        if (userData.isVerified) {
            return ctx.reply(`✅ User *${targetUserId}* is already verified.`, { parse_mode: 'Markdown' });
        }
        await userRef.update({
            isVerified: true,
            verificationMethod: 'admin',
            verificationDate: new Date().toISOString()
        });
        await addNotification(targetUserId, {
            type: 'success',
            title: '✅ Account Verified by Admin',
            message: `Your account has been manually verified by admin. You can now withdraw funds.`
        });
        ctx.reply(`✅ User *${targetUserId}* has been verified successfully!`, { parse_mode: 'Markdown' });
        try {
            await bot.telegram.sendMessage(targetUserId,
                `✅ *ACCOUNT VERIFIED BY ADMIN*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Your account has been manually verified.\n` +
                `You can now withdraw funds from the app.\n\n` +
                `💰 *Minimum withdrawal:* $${APP_CONFIG.minWithdraw}`,
                { parse_mode: 'Markdown' }
            );
        } catch(e) { console.error('Failed to send bot message:', e.message); }
    } catch (error) {
        console.error('Error verifying user:', error);
        ctx.reply('❌ Error verifying user.');
    }
});

bot.command('addtask', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    taskCreationSessions.set(userId, { step: 'name' });
    ctx.reply('📝 *Add New Task*\n━━━━━━━━━━━━━━━━━━━━━━\n\n📌 *Step 1:* Enter task name:\n(e.g., "Join AdNova Channel")', { parse_mode: 'Markdown' });
});

bot.command('edittask', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    const tasksSnapshot = await db.collection('tasks').get();
    if (tasksSnapshot.empty) {
        return ctx.reply('📋 *No tasks available to edit.*\nUse /addtask to create one.', { parse_mode: 'Markdown' });
    }
    let taskList = '✏️ *Select task to edit:*\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
    let index = 1;
    const tasks = [];
    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        tasks.push({ id: doc.id, ...task });
        taskList += `${index}. *${task.name}* (💰 $${task.reward})\n`;
        index++;
    }
    taskList += `\n📝 *Reply with the task number (1-${tasks.length})*`;
    ctx.reply(taskList, { parse_mode: 'Markdown' });
    taskEditSessions.set(userId, { step: 'select', tasks: tasks });
});

bot.command('deletetask', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    const tasksSnapshot = await db.collection('tasks').get();
    if (tasksSnapshot.empty) {
        return ctx.reply('📋 *No tasks available to delete.*', { parse_mode: 'Markdown' });
    }
    let taskList = '🗑️ *Select task to delete:*\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
    let index = 1;
    const tasks = [];
    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        tasks.push({ id: doc.id, ...task });
        taskList += `${index}. *${task.name}* (💰 $${task.reward})\n`;
        index++;
    }
    taskList += `\n⚠️ *Reply with the task number to DELETE (This cannot be undone!)*`;
    ctx.reply(taskList, { parse_mode: 'Markdown' });
    taskEditSessions.set(userId, { step: 'delete_select', tasks: tasks });
});

bot.command('listtasks', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    if (!db) return ctx.reply('⚠️ Database not connected');
    const tasksSnapshot = await db.collection('tasks').get();
    if (tasksSnapshot.empty) {
        return ctx.reply('📋 *No tasks available.*\nUse /addtask to create one.', { parse_mode: 'Markdown' });
    }
    let taskList = '📋 *ALL TASKS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
    let index = 1;
    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        const statusIcon = task.active ? '✅' : '⏸️';
        let typeIcon = '📢';
        if (task.type === 'channel') typeIcon = '📢';
        else if (task.type === 'bot') typeIcon = '🤖';
        else if (task.type === 'youtube') typeIcon = '🎥';
        else if (task.type === 'tiktok') typeIcon = '🎵';
        else if (task.type === 'twitter') typeIcon = '🐦';
        taskList += `${index}. ${statusIcon} ${typeIcon} *${task.name}*\n`;
        taskList += `   💰 Reward: *$${task.reward.toFixed(2)}*\n`;
        taskList += `   🔗 ${task.username || task.link || task.identifier}\n`;
        taskList += `   🔄 ${task.resetPeriod || 'once'}\n`;
        taskList += `   🆔 \`${task.id}\`\n\n`;
        index++;
    }
    taskList += `━━━━━━━━━━━━━━━━━━━━━━\n📌 *Commands:*\n/addtask - Add new task\n/edittask - Edit task\n/deletetask - Delete task`;
    await ctx.reply(taskList, { parse_mode: 'Markdown' });
});

bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    ctx.reply('📢 *Send me the message to broadcast:*\n\n💡 Tip: You can use emojis and Markdown formatting.', { parse_mode: 'Markdown' });
    botAdminSessions.set(userId, { step: 'awaiting_broadcast' });
});

bot.command('botstats', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    if (!db) return ctx.reply('⚠️ Database not connected');
    const usersSnapshot = await db.collection('users').get();
    const pendingWithdrawals = await db.collection('withdrawals').where('status', '==', 'pending').get();
    const tasksSnapshot = await db.collection('tasks').get();
    const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().isVerified === true).length;
    await ctx.reply(
        `📊 *BOT STATISTICS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *Total Users:* ${usersSnapshot.size}\n` +
        `🔐 *Verified Users:* ${verifiedUsers}\n` +
        `💸 *Pending Withdrawals:* ${pendingWithdrawals.size}\n` +
        `📋 *Total Tasks:* ${tasksSnapshot.size}\n` +
        `🕐 *Uptime:* ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 *Bot Status:* ✅ Online`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('users', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    if (!db) return ctx.reply('⚠️ Database not connected');
    const usersSnapshot = await db.collection('users').get();
    await ctx.reply(`👥 *Total Registered Users:* ${usersSnapshot.size}`, { parse_mode: 'Markdown' });
});

// ============================================================================
// 4.6 معالجة الرسائل النصية للمشرف (المصادقة، البث، رفض السحب، إضافة/تعديل المهام)
// ============================================================================

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const message = ctx.message.text;
    const authSession = botAdminSessions.get(userId);
    
    // ========== المصادقة ==========
    if (authSession && authSession.step === 'awaiting_password') {
        if (message === ADMIN_PASSWORD) {
            botAdminSessions.set(userId, { step: 'authenticated' });
            ctx.reply(
                `✅ Authentication Successful!\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 Admin Commands:\n` +
                `• /searchuser [user_id] - Search user details\n` +
                `• /addbalance [user_id] [amount] - Add balance\n` +
                `• /removebalance [user_id] [amount] - Remove balance\n` +
                `• /userstats [user_id] - Detailed user statistics\n` +
                `• /verifyuser [user_id] - Manually verify a user\n` +
                `• /pending or /withdrawals - Manage withdrawal requests\n` +
                `• /addtask - Add new task\n` +
                `• /edittask - Edit task\n` +
                `• /deletetask - Delete task\n` +
                `• /listtasks - List all tasks\n` +
                `• /broadcast - Send message to all users\n` +
                `• /botstats - View bot statistics\n` +
                `• /users - View total users count\n\n` +
                `💡 You can now use these commands anytime.`
            );
        } else {
            ctx.reply(`❌ Wrong password! Access denied.`);
            botAdminSessions.delete(userId);
        }
        return;
    }
    
    // ========== البث الجماعي ==========
    if (authSession && authSession.step === 'awaiting_broadcast') {
        ctx.reply(`📢 Broadcasting to all users...`);
        const result = await broadcastToAllUsers(message);
        if (result.success) {
            ctx.reply(
                `✅ Broadcast Complete!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 Notification added for: ${result.notifiedCount} users\n` +
                `📨 Bot messages sent: ${result.botSentCount || 0}`
            );
        } else {
            ctx.reply(`❌ Error sending broadcast: ${result.error}`);
        }
        botAdminSessions.delete(userId);
        return;
    }
    
    // ========== رفض السحب (سبب الرفض) ==========
    if (authSession && authSession.step === 'awaiting_reject_reason') {
        const withdrawalId = authSession.withdrawalId;
        const reason = message;
        ctx.reply(`⏳ Processing rejection for withdrawal #${withdrawalId}...`);
        const result = await rejectWithdrawalFromBot(withdrawalId, userId, reason);
        if (result.success) {
            ctx.reply(
                `✅ Withdrawal Rejected Successfully\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📋 Request ID: ${withdrawalId}\n` +
                `📝 Reason: ${reason}\n\n` +
                `The user has been notified and the amount has been returned to their balance.`
            );
            await showPendingWithdrawals(ctx, withdrawalsCurrentPage);
        } else {
            ctx.reply(`❌ Error rejecting withdrawal: ${result.error}`);
        }
        botAdminSessions.delete(userId);
        return;
    }
    
    // ========== إضافة مهمة جديدة ==========
const taskSession = taskCreationSessions.get(userId);
if (taskSession) {
    // الخطوة 1: اسم المهمة
    if (taskSession.step === 'name') {
        taskSession.name = message;
        taskSession.step = 'type';
        ctx.reply(
            `📝 Task Name: ${message}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🏷️ Step 2: Choose task type:\n` +
            `• channel - Telegram Channel / Group\n` +
            `• bot - Telegram Bot\n` +
            `• youtube - YouTube Channel\n` +
            `• tiktok - TikTok Account\n` +
            `• twitter - Twitter / X Account\n` +
            `• facebook - Facebook Page/Group/Profile\n` +
            `• code - Verification Code Task (NEW!)\n\n` +
            `📝 Type the type:`
        );
    }
    // الخطوة 2: نوع المهمة
    else if (taskSession.step === 'type') {
        const validTypes = ['channel', 'bot', 'youtube', 'tiktok', 'twitter', 'facebook', 'code'];
        if (!validTypes.includes(message.toLowerCase())) {
            return ctx.reply(`❌ Invalid type! Please choose: channel, bot, youtube, tiktok, twitter, facebook, or code`);
        }
        taskSession.type = message.toLowerCase();
        taskSession.step = 'identifier';
        
        // رسالة مختلفة قليلاً لـ code
        if (taskSession.type === 'code') {
            ctx.reply(
                `📝 Task Name: ${taskSession.name}\n` +
                `🏷️ Type: ${taskSession.type}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔗 Step 3: Enter the link or URL where users can find the secret code:\n` +
                `• Example: https://mywebsite.com/secret-page\n\n` +
                `📝 Type the link:`
            );
        } else {
            ctx.reply(
                `📝 Task Name: ${taskSession.name}\n` +
                `🏷️ Type: ${taskSession.type}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔗 Step 3: Enter username or link:\n` +
                `• For Telegram: @username\n` +
                `• For YouTube: @channel or full URL\n` +
                `• For TikTok: @username\n` +
                `• For Twitter: @username\n` +
                `• For Facebook: full URL (https://facebook.com/...)\n\n` +
                `📝 Type the identifier:`
            );
        }
    }
    // الخطوة 3: identifier (الرابط أو المعرف) - باقي الكود كما هو
        else if (taskSession.step === 'identifier') {
            taskSession.identifier = message;
            taskSession.step = 'reward';
            ctx.reply(
                `📝 Task Name: ${taskSession.name}\n` +
                `🏷️ Type: ${taskSession.type}\n` +
                `🔗 Identifier: ${taskSession.identifier}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 Step 4: Enter reward amount (USD):\n` +
                `• Example: 0.05, 0.10, 0.25\n\n` +
                `📝 Type the reward:`
            );
        }
        // الخطوة 4: المكافأة
        else if (taskSession.step === 'reward') {
            const reward = parseFloat(message);
            if (isNaN(reward) || reward <= 0) {
                return ctx.reply(`❌ Invalid reward! Please enter a valid number (e.g., 0.05)`);
            }
            taskSession.reward = reward;
            taskSession.step = 'resetPeriod';
            ctx.reply(
                `📝 Task Name: ${taskSession.name}\n` +
                `🏷️ Type: ${taskSession.type}\n` +
                `🔗 Identifier: ${taskSession.identifier}\n` +
                `💰 Reward: $${reward}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔄 Step 5: Choose reset period:\n` +
                `• daily - Resets every day\n` +
                `• weekly - Resets every week\n` +
                `• once - One time only\n\n` +
                `📝 Type the reset period:`
            );
        }
        // الخطوة 5: فترة إعادة التعيين
        else if (taskSession.step === 'resetPeriod') {
            const validPeriods = ['daily', 'weekly', 'once'];
            if (!validPeriods.includes(message.toLowerCase())) {
                return ctx.reply(`❌ Invalid period! Please choose: daily, weekly, or once`);
            }
            taskSession.resetPeriod = message.toLowerCase();
            taskSession.step = 'isLimited';
            ctx.reply(
                `🔢 Step 6: Is this a limited task?\n` +
                `• Reply with yes to set a limit (e.g., 100 users)\n` +
                `• Reply with no for unlimited task`
            );
        }
        // الخطوة 6: هل المهمة محدودة؟
        else if (taskSession.step === 'isLimited') {
            if (message.toLowerCase() === 'yes') {
                taskSession.isLimited = true;
                taskSession.step = 'maxCompletions';
                ctx.reply(
                    `🔢 Step 7: Enter the maximum number of completions:\n` +
                    `• Example: 100, 500, 1000\n\n` +
                    `📝 Type the number:`
                );
            } else {
                taskSession.isLimited = false;
                taskSession.maxCompletions = 0;
                
                // ✅ إذا كان النوع code، انتقل إلى خطوة الكود
                if (taskSession.type === 'code') {
                    taskSession.step = 'needsCode';
                    ctx.reply(
                        `🔐 Step 8: Does this task require a verification code?\n\n` +
                        `• Reply with yes to set a verification code\n` +
                        `• Reply with no for normal task (users just visit the link)`
                    );
                } else {
                    // إنشاء المهمة العادية (غير محدودة، بدون كود)
                    await createNormalTask(ctx, taskSession);
                    taskCreationSessions.delete(userId);
                }
            }
        }
        // الخطوة 7: عدد المستخدمين الأقصى (للمهمة المحدودة)
        else if (taskSession.step === 'maxCompletions') {
            const max = parseInt(message);
            if (isNaN(max) || max <= 0) {
                return ctx.reply(`❌ Invalid number! Please enter a valid number (e.g., 100)`);
            }
            taskSession.maxCompletions = max;
            
            // ✅ إذا كان النوع code، انتقل إلى خطوة الكود
            if (taskSession.type === 'code') {
                taskSession.step = 'needsCode';
                ctx.reply(
                    `🔐 Step 8: Does this task require a verification code?\n\n` +
                    `• Reply with yes to set a verification code\n` +
                    `• Reply with no for normal task (users just visit the link)`
                );
            } else {
                // إنشاء المهمة المحدودة (بدون كود)
                await createLimitedTask(ctx, taskSession);
                taskCreationSessions.delete(userId);
            }
        }
        // الخطوة 8: هل تحتاج كود تحقق؟
        else if (taskSession.step === 'needsCode') {
            if (message.toLowerCase() === 'yes') {
                taskSession.needsCode = true;
                taskSession.step = 'verificationCode';
                ctx.reply(
                    `🔑 Step 9: Enter the verification code:\n\n` +
                    `• Example: SECRET2025, WINNER, ADNOVA100\n` +
                    `• Users will need to enter this code to claim reward\n\n` +
                    `📝 Type the code:`
                );
            } else {
                taskSession.needsCode = false;
                taskSession.verificationCode = null;
                taskSession.hint = null;
                
                // إنشاء المهمة (عادية أو محدودة) بدون كود
                if (taskSession.isLimited) {
                    await createLimitedTask(ctx, taskSession);
                } else {
                    await createNormalTask(ctx, taskSession);
                }
                taskCreationSessions.delete(userId);
            }
        }
        // الخطوة 9: إدخال الكود
        else if (taskSession.step === 'verificationCode') {
            if (!message || message.trim() === '') {
                return ctx.reply(`❌ Please enter a valid verification code!`);
            }
            taskSession.verificationCode = message.trim().toUpperCase();
            taskSession.step = 'hint';
            ctx.reply(
                `💡 Step 10: Enter a hint for users:\n\n` +
                `• This hint will help users find the code\n` +
                `• Example: "Check the footer of our website"\n\n` +
                `📝 Type the hint:`
            );
        }
        // الخطوة 10: إدخال التلميح
        else if (taskSession.step === 'hint') {
            taskSession.hint = message || 'No hint provided';
            
            // إنشاء المهمة مع الكود
            if (taskSession.isLimited) {
                await createLimitedCodeTask(ctx, taskSession);
            } else {
                await createCodeTask(ctx, taskSession);
            }
            taskCreationSessions.delete(userId);
        }
        return;
    }
    
    // ========== تعديل/حذف المهام ==========
    const editSession = taskEditSessions.get(userId);
    if (editSession) {
        if (editSession.step === 'select') {
            const num = parseInt(message);
            if (isNaN(num) || num < 1 || num > editSession.tasks.length) {
                return ctx.reply(`❌ Invalid number! Please enter a number between 1 and ${editSession.tasks.length}`);
            }
            editSession.selectedTask = editSession.tasks[num - 1];
            editSession.step = 'new_reward';
            ctx.reply(
                `✏️ Editing Task: ${editSession.selectedTask.name}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 Current reward: $${editSession.selectedTask.reward}\n\n` +
                `📝 Enter new reward amount (USD):`
            );
        } else if (editSession.step === 'new_reward') {
            const reward = parseFloat(message);
            if (isNaN(reward) || reward <= 0) {
                return ctx.reply(`❌ Invalid reward! Please enter a valid number (e.g., 0.10)`);
            }
            try {
                await db.collection('tasks').doc(editSession.selectedTask.id).update({
                    reward: reward,
                    updatedAt: new Date().toISOString()
                });
                ctx.reply(
                    `✅ Task Updated Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📌 Name: ${editSession.selectedTask.name}\n` +
                    `💰 New Reward: $${reward}\n` +
                    `💰 Old Reward: $${editSession.selectedTask.reward}`
                );
                console.log(`✅ Task updated via bot: ${editSession.selectedTask.id}`);
            } catch (error) {
                console.error('Error updating task:', error);
                ctx.reply(`❌ Error updating task! Please try again.`);
            }
            taskEditSessions.delete(userId);
        } else if (editSession.step === 'delete_select') {
            const num = parseInt(message);
            if (isNaN(num) || num < 1 || num > editSession.tasks.length) {
                return ctx.reply(`❌ Invalid number! Please enter a number between 1 and ${editSession.tasks.length}`);
            }
            const taskToDelete = editSession.tasks[num - 1];
            editSession.selectedTask = taskToDelete;
            editSession.step = 'confirm_delete';
            ctx.reply(
                `⚠️ CONFIRM DELETION ⚠️\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 Task: ${taskToDelete.name}\n` +
                `💰 Reward: $${taskToDelete.reward}\n\n` +
                `❌ Are you sure? Type CONFIRM to delete permanently.\n` +
                `🔄 Type anything else to cancel.`
            );
        } else if (editSession.step === 'confirm_delete') {
            if (message === 'CONFIRM') {
                try {
                    await db.collection('tasks').doc(editSession.selectedTask.id).delete();
                    ctx.reply(
                        `✅ Task Deleted Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `📌 Name: ${editSession.selectedTask.name}\n` +
                        `💰 Reward: $${editSession.selectedTask.reward}`
                    );
                    console.log(`✅ Task deleted via bot: ${editSession.selectedTask.id}`);
                } catch (error) {
                    console.error('Error deleting task:', error);
                    ctx.reply(`❌ Error deleting task! Please try again.`);
                }
            } else {
                ctx.reply(`✅ Deletion cancelled.`);
            }
            taskEditSessions.delete(userId);
        }
        return;
    }
});

// ============================================================================
// دوال مساعدة لإنشاء المهام (قسم 4.6)
// ============================================================================

async function createNormalTask(ctx, taskSession) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newTask = {
        id: taskId,
        type: taskSession.type,
        name: taskSession.name,
        identifier: taskSession.identifier,
        username: taskSession.identifier,
        link: taskSession.identifier,
        reward: taskSession.reward,
        resetPeriod: taskSession.resetPeriod,
        active: true,
        isLimited: false,
        maxCompletions: 0,
        completedCount: 0,
        needsCode: false,
        verificationCode: null,
        hint: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID
    };
    await db.collection('tasks').doc(taskId).set(newTask);
    ctx.reply(
        `✅ Task Created Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Name: ${taskSession.name}\n` +
        `🏷️ Type: ${taskSession.type}\n` +
        `🔗 Identifier: ${taskSession.identifier}\n` +
        `💰 Reward: $${taskSession.reward}\n` +
        `🔄 Reset: ${taskSession.resetPeriod}\n` +
        `🆔 ID: ${taskId}\n\n` +
        `📋 Use /listtasks to see all tasks.`
    );
    console.log(`✅ Task created: ${taskId} - ${taskSession.name}`);
}

async function createLimitedTask(ctx, taskSession) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newTask = {
        id: taskId,
        type: taskSession.type,
        name: taskSession.name,
        identifier: taskSession.identifier,
        username: taskSession.identifier,
        link: taskSession.identifier,
        reward: taskSession.reward,
        resetPeriod: taskSession.resetPeriod,
        active: true,
        isLimited: true,
        maxCompletions: taskSession.maxCompletions,
        completedCount: 0,
        needsCode: false,
        verificationCode: null,
        hint: null,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID
    };
    await db.collection('tasks').doc(taskId).set(newTask);
    ctx.reply(
        `✅ Limited Task Created Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Name: ${taskSession.name}\n` +
        `🏷️ Type: ${taskSession.type}\n` +
        `🔗 Identifier: ${taskSession.identifier}\n` +
        `💰 Reward: $${taskSession.reward}\n` +
        `🔄 Reset: ${taskSession.resetPeriod}\n` +
        `🏆 Limited: ${taskSession.maxCompletions} users max\n` +
        `🆔 ID: ${taskId}\n\n` +
        `📋 Use /listtasks to see all tasks.`
    );
    console.log(`✅ Limited task created: ${taskId} - ${taskSession.name} (max: ${taskSession.maxCompletions})`);
}

async function createCodeTask(ctx, taskSession) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newTask = {
        id: taskId,
        type: 'code',
        name: taskSession.name,
        identifier: taskSession.identifier,
        username: taskSession.identifier,
        link: taskSession.identifier,
        reward: taskSession.reward,
        resetPeriod: taskSession.resetPeriod,
        active: true,
        isLimited: false,
        maxCompletions: 0,
        completedCount: 0,
        needsCode: true,
        verificationCode: taskSession.verificationCode,
        hint: taskSession.hint,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID
    };
    await db.collection('tasks').doc(taskId).set(newTask);
    ctx.reply(
        `✅ Code Task Created Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Name: ${taskSession.name}\n` +
        `🏷️ Type: Code Verification\n` +
        `🔗 Link: ${taskSession.identifier}\n` +
        `💰 Reward: $${taskSession.reward}\n` +
        `🔄 Reset: ${taskSession.resetPeriod}\n` +
        `🔑 Code: ${taskSession.verificationCode}\n` +
        `💡 Hint: ${taskSession.hint}\n` +
        `🆔 ID: ${taskId}\n\n` +
        `📋 Use /listtasks to see all tasks.`
    );
    console.log(`✅ Code task created: ${taskId} - ${taskSession.name} (code: ${taskSession.verificationCode})`);
}

async function createLimitedCodeTask(ctx, taskSession) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newTask = {
        id: taskId,
        type: 'code',
        name: taskSession.name,
        identifier: taskSession.identifier,
        username: taskSession.identifier,
        link: taskSession.identifier,
        reward: taskSession.reward,
        resetPeriod: taskSession.resetPeriod,
        active: true,
        isLimited: true,
        maxCompletions: taskSession.maxCompletions,
        completedCount: 0,
        needsCode: true,
        verificationCode: taskSession.verificationCode,
        hint: taskSession.hint,
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID
    };
    await db.collection('tasks').doc(taskId).set(newTask);
    ctx.reply(
        `✅ Limited Code Task Created Successfully!\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Name: ${taskSession.name}\n` +
        `🏷️ Type: Code Verification (Limited)\n` +
        `🔗 Link: ${taskSession.identifier}\n` +
        `💰 Reward: $${taskSession.reward}\n` +
        `🔄 Reset: ${taskSession.resetPeriod}\n` +
        `🏆 Limited: ${taskSession.maxCompletions} users max\n` +
        `🔑 Code: ${taskSession.verificationCode}\n` +
        `💡 Hint: ${taskSession.hint}\n` +
        `🆔 ID: ${taskId}\n\n` +
        `📋 Use /listtasks to see all tasks.`
    );
    console.log(`✅ Limited code task created: ${taskId} - ${taskSession.name} (max: ${taskSession.maxCompletions}, code: ${taskSession.verificationCode})`);
}

// ============================================================================
// 4.7 معالجة أزرار الـ Callback Query
// ============================================================================

bot.action('my_stats', async (ctx) => {
    const userId = ctx.from.id.toString();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        await ctx.reply(
            `📊 *YOUR STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Balance:* $${data.balance?.toFixed(2) || '0.00'}\n` +
            `👥 *Referrals:* ${data.inviteCount || 0}\n` +
            `📺 *Ads Watched:* ${data.adsWatched || 0}\n` +
            `📅 *Today:* ${data.adsToday || 0} / ${APP_CONFIG.dailyAdLimit}\n` +
            `🔐 *Verified:* ${data.isVerified ? '✅ Yes' : '❌ No'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 *Your link:* t.me/${APP_CONFIG.botUsername}?start=${userId}`,
            { parse_mode: 'Markdown' }
        );
    }
    await ctx.answerCbQuery();
});

bot.action('quick_withdraw', async (ctx) => {
    const userId = ctx.from.id.toString();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        const minWithdraw = APP_CONFIG.minWithdraw;
        if (data.balance >= minWithdraw) {
            if (data.isVerified) {
                await ctx.reply(`✅ *You can withdraw!*\nBalance: $${data.balance?.toFixed(2)}\n\nOpen the app to request withdrawal.`, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(`⚠️ *Verification Required*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Your balance is $${data.balance?.toFixed(2)}.\n\n` +
                    `To withdraw, you need to verify your account first.\n` +
                    `• Invite ${APP_CONFIG.requiredReferralsForVerify} friends (Free)\n` +
                    `• Pay 0.01 TON (Fast)\n\n` +
                    `Open the app to verify.`, { parse_mode: 'Markdown' });
            }
        } else {
            await ctx.reply(`❌ *Minimum withdrawal is $${minWithdraw}*\nYour balance: $${data.balance?.toFixed(2)}\n\nKeep watching ads and inviting friends!`, { parse_mode: 'Markdown' });
        }
    }
    await ctx.answerCbQuery();
});

bot.action(/approve_wd_(.+)/, async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    const withdrawalId = ctx.match[1];
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('⛔ Access denied!', { show_alert: true });
        return;
    }
    const session = botAdminSessions.get(adminUserId);
    if (!session || session.step !== 'authenticated') {
        await ctx.answerCbQuery('⚠️ Please authenticate first using /alimenfi', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery('Processing approval...');
    const result = await approveWithdrawalFromBot(withdrawalId, adminUserId);
    if (result.success) {
        await ctx.editMessageText(
            `✅ *WITHDRAWAL APPROVED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Request #${withdrawalId} has been approved successfully.\n\n` +
            `🔄 Refreshing the list...`,
            { parse_mode: 'Markdown' }
        );
        await showPendingWithdrawals(ctx, withdrawalsCurrentPage);
    } else {
        await ctx.reply(`❌ *Error:* ${result.error}`, { parse_mode: 'Markdown' });
        await showPendingWithdrawals(ctx, withdrawalsCurrentPage);
    }
});

bot.action(/reject_wd_(.+)/, async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    const withdrawalId = ctx.match[1];
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('⛔ Access denied!', { show_alert: true });
        return;
    }
    const session = botAdminSessions.get(adminUserId);
    if (!session || session.step !== 'authenticated') {
        await ctx.answerCbQuery('⚠️ Please authenticate first using /alimenfi', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    botAdminSessions.set(adminUserId, { step: 'awaiting_reject_reason', withdrawalId: withdrawalId });
    await ctx.reply(
        `✏️ *REJECTION REASON REQUIRED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Please send the reason for rejecting withdrawal #${withdrawalId}.\n\n` +
        `The user will see this reason in their notification.`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('wd_prev', async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('Access denied', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    await showPendingWithdrawals(ctx, withdrawalsCurrentPage - 1);
});

bot.action('wd_next', async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('Access denied', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    await showPendingWithdrawals(ctx, withdrawalsCurrentPage + 1);
});

bot.action('wd_refresh', async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('Access denied', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery('🔄 Refreshing...');
    await showPendingWithdrawals(ctx, withdrawalsCurrentPage);
});

bot.action('wd_close', async (ctx) => {
    const adminUserId = ctx.from.id.toString();
    if (adminUserId !== ADMIN_ID) {
        await ctx.answerCbQuery('Access denied', { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await ctx.reply('✅ Withdrawal management closed.', { parse_mode: 'Markdown' });
});

bot.action('wd_page_info', async (ctx) => {
    await ctx.answerCbQuery(`Page ${withdrawalsCurrentPage} of ${withdrawalsTotalPages}`, { show_alert: false });
});

bot.launch({ dropPendingUpdates: true })
    .then(() => console.log('🤖 Telegram Bot started successfully'))
    .catch(err => console.error('❌ Bot error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ============================================================================
// 5. 🌐 Middleware
// ============================================================================

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function isAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    return authHeader === `Bearer ${ADMIN_PASSWORD}`;
}

// ============================================================================
// 6. 🌍 APIs العامة
// ============================================================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', firebase: db ? 'connected' : 'disconnected', timestamp: Date.now() });
});

app.get('/api/config', (req, res) => {
    res.json({
        firebaseConfig: firebaseWebConfig,
        appUrl: APP_URL,
        adminId: ADMIN_ID,
        platformTonWallet: PLATFORM_TON_WALLET,
        welcomeBonus: APP_CONFIG.welcomeBonus,
        referralBonus: APP_CONFIG.referralBonus,
        adReward: APP_CONFIG.adReward,
        dailyAdLimit: APP_CONFIG.dailyAdLimit,
        minWithdraw: APP_CONFIG.minWithdraw,
        requiredReferrals: APP_CONFIG.requiredReferrals,
        requiredReferralsForVerify: APP_CONFIG.requiredReferralsForVerify,
        botUsername: APP_CONFIG.botUsername
    });
});

app.get('/api/ping', (req, res) => {
    res.json({ alive: true, timestamp: Date.now() });
});

// ============================================================================
// 6.1. 🎬 مزامنة بيانات الإعلانات من الكاش (كل 6 ساعات)
// ============================================================================

app.post('/api/sync-ads', async (req, res) => {
    try {
        const { userId, adData } = req.body;
        
        if (!userId || !adData) {
            return res.json({ success: false, error: 'Missing userId or adData' });
        }
        
        if (!db) {
            return res.json({ success: false, error: 'Database not connected' });
        }
        
        const { balance, totalEarned, adsWatched, adsToday, lastAdDate } = adData;
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const currentData = userDoc.data();
        
        // نأخذ القيمة الأكبر لحماية المستخدم من فقدان البيانات
        const updates = {};
        
        if (balance > (currentData.balance || 0)) {
            updates.balance = balance;
        }
        if (totalEarned > (currentData.totalEarned || 0)) {
            updates.totalEarned = totalEarned;
        }
        if (adsWatched > (currentData.adsWatched || 0)) {
            updates.adsWatched = adsWatched;
        }
        if (adsToday !== undefined && adsToday !== (currentData.adsToday || 0)) {
            updates.adsToday = adsToday;
            updates.lastAdDate = lastAdDate || new Date().toISOString().split('T')[0];
        }
        
        if (Object.keys(updates).length > 0) {
            await userRef.update(updates);
            console.log(`✅ Synced ads data for ${userId}: balance:$${updates.balance || currentData.balance}`);
        }
        
        res.json({ success: true, message: 'Ad data synced successfully' });
        
    } catch (error) {
        console.error('Sync ads error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// تسجيل مشاهدة إعلان (اختياري، للتتبع فقط)
app.post('/api/ad-watched', async (req, res) => {
    // نرجح نجاح فوري دون انتظار
    res.json({ success: true });
    
    // تسجيل في الخلفية (اختياري للإحصائيات)
    (async () => {
        try {
            const { initData } = req.body;
            if (!initData) return;
            
            const params = new URLSearchParams(initData);
            const userJson = params.get('user');
            if (!userJson) return;
            
            const user = JSON.parse(decodeURIComponent(userJson));
            console.log(`📺 Ad watched by ${user.id}`);
        } catch(e) {}
    })();
});

// ============================================================================
// 7. 👤 APIs المستخدمين
// ============================================================================
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
            await updateNewUserCounter(userId, userName);
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

// ============================================================================
// 8. 🔗 API الإحالة
// ============================================================================

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

// ============================================================================
// 9. 🎬 API مكافأة الإعلان
// ============================================================================

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
            await userRef.update({ adsToday: 0 });
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

// ============================================================================
// 10. ✅ API التحقق من انضمام القنوات
// ============================================================================

app.post('/api/verify-channel', async (req, res) => {
    try {
        const { userId, channelUsername, taskId, reward, taskType } = req.body;
        if (!userId || !channelUsername || !taskId) {
            return res.json({ success: false, error: 'Missing required fields' });
        }
        console.log(`🔍 Verifying ${userId} for task ${taskId} (type: ${taskType})`);
        
        let isVerified = false;
        if (taskType === 'channel') {
            const isMember = await verifyChannelMembership(userId, channelUsername);
            isVerified = isMember;
            console.log(`📢 Channel verification: ${isVerified}`);
        } else {
            isVerified = true;
            console.log(`✅ Auto-verified for type: ${taskType}`);
        }
        
        if (!isVerified) {
            return res.json({ success: false, error: '❌ You are not a member of this channel/group. Please join first and try again.' });
        }
        
        if (db && reward) {
            // ✅ التحقق من المهمة المحدودة أولاً
            const taskRef = db.collection('tasks').doc(taskId);
            const taskDoc = await taskRef.get();
            
            if (!taskDoc.exists) {
                return res.json({ success: false, error: 'Task not found' });
            }
            
            const taskData = taskDoc.data();
            
            // ✅ التحقق من المهمة المحدودة (Limited Task)
            if (taskData && taskData.isLimited) {
                if (taskData.completedCount >= taskData.maxCompletions) {
                    return res.json({ success: false, error: 'This task has reached its limit! No more rewards available.' });
                }
            }
            
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const completedTasks = userData.completedTasks || [];
                
                if (!completedTasks.includes(taskId)) {
                    // ✅ زيادة عداد المهمة المحدودة إذا كانت محدودة
                    if (taskData && taskData.isLimited) {
                        await taskRef.update({
                            completedCount: admin.firestore.FieldValue.increment(1)
                        });
                    }
                    
                    // ✅ تحديث رصيد المستخدم
                    await userRef.update({
                        balance: admin.firestore.FieldValue.increment(reward),
                        totalEarned: admin.firestore.FieldValue.increment(reward),
                        completedTasks: admin.firestore.FieldValue.arrayUnion(taskId),
                        [`taskLastCompletions.${taskId}`]: new Date().toISOString()
                    });
                    
                    await addNotification(userId, {
                        type: 'success',
                        title: '✅ Task Completed!',
                        message: `+$${reward.toFixed(2)} added from ${channelUsername}`
                    });
                    
                    console.log(`✅ Task ${taskId} completed by ${userId}, +$${reward}`);
                    if (taskData && taskData.isLimited) {
                        const remaining = taskData.maxCompletions - (taskData.completedCount + 1);
                        console.log(`🏆 Limited task: ${remaining} remaining out of ${taskData.maxCompletions}`);
                    }
                    
                    return res.json({ success: true, message: 'Task completed successfully!' });
                } else {
                    return res.json({ success: false, error: 'Task already completed!' });
                }
            } else {
                return res.json({ success: false, error: 'User not found' });
            }
        }
        res.json({ success: true, message: 'Verification successful' });
    } catch (error) {
        console.error('Verify channel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 11. 💸 API طلبات السحب (مع التحقق من isVerified)
// ============================================================================

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
            return res.json({ success: false, error: `You need ${APP_CONFIG.requiredReferrals} referral to withdraw (security measure)` });
        }
        if (!userData.isVerified) {
            return res.json({ 
                success: false, 
                needVerification: true,
                currentInvites: userData.inviteCount || 0,
                requiredInvites: APP_CONFIG.requiredReferralsForVerify,
                message: `Verification required. Invite ${APP_CONFIG.requiredReferralsForVerify} friends or pay 0.01 TON.`
            });
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
                `💸 *NEW WITHDRAWAL REQUEST*\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *User:* ${userName} (${userId})\n💰 *Amount:* $${amount.toFixed(2)}\n💳 *Method:* ${method}\n📮 *Destination:* ${destination}\n👥 *Referrals:* ${userData.inviteCount || 0}\n📺 *Ads:* ${userData.adsWatched || 0}\n🔐 *Verified:* ${userData.isVerified ? 'Yes' : 'No'}`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
        res.json({ success: true, requestId: docRef.id, newBalance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 11.5. 🔐 API التحقق من المستخدمين
// ============================================================================

app.post('/api/verify-by-referrals', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.json({ success: false, error: 'User ID required' });
    }
    const result = await verifyUserByReferrals(userId);
    res.json(result);
});

app.post('/api/ton/verify', async (req, res) => {
    const { userId, txHash, amount } = req.body;
    if (!userId || !txHash) {
        return res.json({ success: false, error: 'Missing required fields' });
    }
    const result = await verifyUserByTon(userId, txHash, amount || "0.01");
    res.json(result);
});

app.get('/api/user/verification-status/:userId', async (req, res) => {
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const userDoc = await db.collection('users').doc(req.params.userId).get();
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        const userData = userDoc.data();
        res.json({
            success: true,
            isVerified: userData.isVerified || false,
            verificationMethod: userData.verificationMethod || null,
            verificationDate: userData.verificationDate || null,
            currentInvites: userData.inviteCount || 0,
            requiredInvites: APP_CONFIG.requiredReferralsForVerify
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ----------------------

// ============================================================================
// 11.6. 🔐 API التحقق من كود المهمة (Code Verification)
// ============================================================================

app.post('/api/verify-code', async (req, res) => {
    const { userId, taskId, code } = req.body;
    
    if (!userId || !taskId || !code) {
        return res.json({ success: false, error: 'Missing required fields' });
    }
    
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    
    try {
        const taskRef = db.collection('tasks').doc(taskId);
        const taskDoc = await taskRef.get();
        
        if (!taskDoc.exists) {
            return res.json({ success: false, error: 'Task not found' });
        }
        
        const task = taskDoc.data();
        
        // التحقق من نوع المهمة
        if (task.type !== 'code') {
            return res.json({ success: false, error: 'Invalid task type' });
        }
        
        // التحقق من الكود
        if (task.verificationCode !== code.toUpperCase()) {
            return res.json({ success: false, error: 'Invalid code!' });
        }
        
        // التحقق من العدد إذا كانت محدودة
        if (task.isLimited && task.completedCount >= task.maxCompletions) {
            return res.json({ success: false, error: 'This task has reached its limit!' });
        }
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        const userData = userDoc.data();
        const completedTasks = userData.completedTasks || [];
        
        if (completedTasks.includes(taskId)) {
            return res.json({ success: false, error: 'Task already completed!' });
        }
        
        // زيادة عداد المهمة المحدودة
        if (task.isLimited) {
            await taskRef.update({
                completedCount: admin.firestore.FieldValue.increment(1)
            });
        }
        
        // منح المكافأة
        await userRef.update({
            balance: admin.firestore.FieldValue.increment(task.reward),
            totalEarned: admin.firestore.FieldValue.increment(task.reward),
            completedTasks: admin.firestore.FieldValue.arrayUnion(taskId),
            [`taskLastCompletions.${taskId}`]: new Date().toISOString()
        });
        
        await addNotification(userId, {
            type: 'success',
            title: '✅ Code Task Completed!',
            message: `+$${task.reward.toFixed(2)} added from ${task.name}`
        });
        
        res.json({ success: true, reward: task.reward });
        
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 12. 📋 API جلب المهام
// ============================================================================

app.get('/api/tasks', async (req, res) => {
    if (!db) return res.json({ success: true, tasks: [] });
    try {
        const tasksSnapshot = await db.collection('tasks').where('active', '==', true).get();
        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📋 Loaded ${tasks.length} active tasks for users`);
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Error loading tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 13. 🕐 مهمة مجدولة لإعادة تعيين المهام اليومية (Cron Job)
// ============================================================================

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
                        const daysDiff = (new Date() - new Date(lastCompletion)) / (1000 * 60 * 60 * 24);
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

// ============================================================================
// 14. 🚀 تشغيل الخادم
// ============================================================================

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
    console.log(`\n🌟 ADNOVA NETWORK SERVER v14.0`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔥 Firebase: ${db ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`👑 Admin ID: ${ADMIN_ID || '❌ Not configured'}`);
    console.log(`🤖 Bot: ${BOT_TOKEN ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🌐 App URL: ${APP_URL}`);
    console.log(`💰 TON Platform Wallet: ${PLATFORM_TON_WALLET ? '✅ Loaded' : '❌ Missing'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💰 Ad Reward: $${APP_CONFIG.adReward}`);
    console.log(`📊 Daily Limit: ${APP_CONFIG.dailyAdLimit}`);
    console.log(`💸 Min Withdraw: $${APP_CONFIG.minWithdraw}`);
    console.log(`👥 Required Referrals (basic): ${APP_CONFIG.requiredReferrals}`);
    console.log(`🔐 Required Referrals (verification): ${APP_CONFIG.requiredReferralsForVerify}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Task Types: channel, bot, youtube, tiktok, twitter`);
    console.log(`📋 Task Management via Bot: ✅ Ready`);
    console.log(`📋 Withdrawal Management via Bot: ✅ Ready`);
    console.log(`   • /pending - View pending withdrawals`);
    console.log(`   • /withdrawals - Same as /pending`);
    console.log(`   • Approve/Reject with buttons`);
    console.log(`   • Requires reason for rejection`);
    console.log(`   • Automatic balance return on rejection`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔐 User Management via Bot: ✅ NEW!`);
    console.log(`   • /searchuser [id] - Search user details`);
    console.log(`   • /addbalance [id] [amount] - Add balance`);
    console.log(`   • /removebalance [id] [amount] - Remove balance`);
    console.log(`   • /userstats [id] - Detailed user statistics`);
    console.log(`   • /verifyuser [id] - Manually verify a user`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Server ready for production!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
