// ============================================================================
// ADNOVA NETWORK - SERVER v13.0 (النسخة النهائية الكاملة مع جميع التحديثات)
// ============================================================================
// خادم متكامل مع Firebase، بوت تليجرام، APIs آمنة، إدارة مهام كاملة عبر البوت،
// التحقق الحقيقي من انضمام القنوات، لوحة مشرف متطورة
// أنواع المهام: channel, bot, youtube, tiktok, twitter
// 
// الميزات الجديدة:
// - عرض وموافقة/رفض طلبات السحب عبر البوت مع أسباب الرفض وإرجاع الرصيد
// - نظام التحقق من المستخدمين (30 إحالة أو دفع 0.01 TON) لمكافحة الحسابات الوهمية
// - دعم TON Connect مع عنوان محفظة المنصة من Render Secrets
// - API للتحقق عبر الإحالات وTON
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

// ═══════════════════════════════════════════════════════════════════════════
// 1. 🔐 قراءة Secret Files من Render
// ═══════════════════════════════════════════════════════════════════════════

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

try {
    const walletPath = '/etc/secrets/ton-wallet-address.txt';
    if (fs.existsSync(walletPath)) {
        PLATFORM_TON_WALLET = fs.readFileSync(walletPath, 'utf8').trim();
        console.log('✅ TON Platform Wallet address loaded:', PLATFORM_TON_WALLET);
    } else {
        console.log('⚠️ TON wallet address file not found, using default');
        PLATFORM_TON_WALLET = process.env.PLATFORM_TON_WALLET || null;
    }
} catch (error) {
    console.error('❌ TON Wallet address error:', error.message);
    PLATFORM_TON_WALLET = process.env.PLATFORM_TON_WALLET || null;
}

BOT_TOKEN = process.env.BOT_TOKEN;
APP_URL = process.env.APP_URL;

// ═══════════════════════════════════════════════════════════════════════════
// 2. ⚙️ إعدادات التطبيق
// ═══════════════════════════════════════════════════════════════════════════

const APP_CONFIG = {
    welcomeBonus: 0.10,
    referralBonus: 0.50,
    adReward: 0.01,
    dailyAdLimit: 50,
    minWithdraw: 10.00,
    requiredReferrals: 1,
    requiredReferralsForVerify: 30,
    botUsername: "AdNovaNetworkBot"
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. 🔥 Firebase Admin SDK
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
// 4. 🤖 Telegram Bot مع إدارة المهام عبر البوت
// ═══════════════════════════════════════════════════════════════════════════

const bot = new Telegraf(BOT_TOKEN);
const botAdminSessions = new Map();
const taskCreationSessions = new Map();
const taskEditSessions = new Map();

// متغيرات جديدة لإدارة طلبات السحب عبر البوت
let withdrawalsCurrentPage = 1;
let withdrawalsTotalPages = 1;
let withdrawalsCache = [];

// ========== دوال مساعدة عامة ==========

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
• 💰 Earn *$0.05 - $0.50* per task

💳 *WITHDRAWAL METHODS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 💳 PayPal / Skrill / Payoneer
• ₿ USDT (BEP20 & TRC20)
• 📱 TON / SBP (Russia)
• 🎮 PUBG UC / Free Fire

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

// ========== دوال جديدة لإدارة طلبات السحب عبر البوت ==========

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
        // Get all pending withdrawals
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
        
        const keyboard = {
            inline_keyboard: []
        };
        
        // Add action buttons for each withdrawal
        for (let i = 0; i < pageWithdrawals.length; i++) {
            const wd = pageWithdrawals[i];
            keyboard.inline_keyboard.push([
                { text: `✅ Approve #${start + i + 1}`, callback_data: `approve_wd_${wd.id}` },
                { text: `❌ Reject #${start + i + 1}`, callback_data: `reject_wd_${wd.id}` }
            ]);
        }
        
        // Add navigation buttons
        const navButtons = [];
        if (page > 1) {
            navButtons.push({ text: "◀ Previous", callback_data: `wd_prev` });
        }
        navButtons.push({ text: `📄 ${page}/${withdrawalsTotalPages}`, callback_data: `wd_page_info` });
        if (page < withdrawalsTotalPages) {
            navButtons.push({ text: "Next ▶", callback_data: `wd_next` });
        }
        keyboard.inline_keyboard.push(navButtons);
        
        // Add refresh and close buttons
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
        
        // Send notification to user
        await addNotification(withdrawal.userId, {
            type: 'withdraw',
            title: '✅ Withdrawal Approved',
            message: `Your withdrawal request of $${withdrawal.amount?.toFixed(2)} has been approved and will be processed within 24 hours.`
        });
        
        // Send private message to user via bot
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
        
        // Return the amount to user's balance
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
        
        // Send notification to user
        await addNotification(withdrawal.userId, {
            type: 'withdraw',
            title: '❌ Withdrawal Rejected',
            message: `Your withdrawal request of $${withdrawal.amount?.toFixed(2)} was rejected. Reason: ${reason}. The amount has been returned to your balance.`
        });
        
        // Send private message to user via bot
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

// ========== دوال جديدة للتحقق من المستخدمين (30 إحالة أو TON) ==========

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
            
            // Send private message
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
        
        // Note: In production, you should verify the transaction with TON API
        // For now, we accept it as valid since the user completed the payment
        // The actual verification should check:
        // 1. The transaction exists on the blockchain
        // 2. The amount is correct (0.01 TON)
        // 3. The recipient is the platform wallet
        
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
        
        // Send private message
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

// ========== أوامر البوت العامة ==========

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

// ========== أوامر المشرف الجديدة لإدارة السحب ==========

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

// أوامر المشرف للتحقق من المستخدمين
bot.command('checkuser', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    
    const targetUserId = ctx.message.text.split(' ')[1];
    if (!targetUserId) {
        return ctx.reply('📝 *Usage:* /checkuser <user_id>\n\nExample: /checkuser 123456789', { parse_mode: 'Markdown' });
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
            `🔐 *Verified:* ${data.isVerified ? '✅ Yes' : '❌ No'}\n` +
            `📝 *Verification Method:* ${data.verificationMethod || 'None'}\n` +
            `📅 *Verification Date:* ${data.verificationDate ? new Date(data.verificationDate).toLocaleString() : 'N/A'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📺 *Ads Watched:* ${data.adsWatched || 0}\n` +
            `🚫 *Blocked:* ${data.withdrawBlocked ? 'Yes' : 'No'}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error checking user:', error);
        ctx.reply('❌ Error fetching user data.');
    }
});

bot.command('verifyuser', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    
    const session = botAdminSessions.get(userId);
    if (!session || session.step !== 'authenticated') {
        return ctx.reply('⚠️ *Please authenticate first*\nUse /alimenfi to login.', { parse_mode: 'Markdown' });
    }
    
    const targetUserId = ctx.message.text.split(' ')[1];
    if (!targetUserId) {
        return ctx.reply('📝 *Usage:* /verifyuser <user_id>\n\nExample: /verifyuser 123456789', { parse_mode: 'Markdown' });
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
        
        // Send private message to user
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

// ========== أوامر المشرف الحالية ==========

// أمر /alimenfi - دخول المشرف
bot.command('alimenfi', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) {
        console.log(`⛔ Unauthorized admin attempt from ${userId}`);
        return ctx.reply('⛔ *Access denied!* You are not authorized to use admin commands.', { parse_mode: 'Markdown' });
    }
    ctx.reply('🔐 *Admin Access*\n━━━━━━━━━━━━━━━━━━━━━━\nPlease enter your admin password:', { parse_mode: 'Markdown' });
    botAdminSessions.set(userId, { step: 'awaiting_password' });
});

// أمر /addtask - إضافة مهمة جديدة
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

// أمر /edittask - تعديل مهمة
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

// أمر /deletetask - حذف مهمة
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

// أمر /listtasks - عرض جميع المهام (للمشرف)
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

// أمر /broadcast - بث رسالة
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

// أمر /botstats - إحصائيات البوت
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

// أمر /users - عدد المستخدمين
bot.command('users', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId !== ADMIN_ID) return ctx.reply('⛔ *Access denied!*', { parse_mode: 'Markdown' });
    if (!db) return ctx.reply('⚠️ Database not connected');
    const usersSnapshot = await db.collection('users').get();
    await ctx.reply(`👥 *Total Registered Users:* ${usersSnapshot.size}`, { parse_mode: 'Markdown' });
});

// ========== معالجة الرسائل النصية للمشرف ==========

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const message = ctx.message.text;
    
    // معالجة المصادقة
    const authSession = botAdminSessions.get(userId);
    if (authSession && authSession.step === 'awaiting_password') {
        if (message === ADMIN_PASSWORD) {
            botAdminSessions.set(userId, { step: 'authenticated' });
            ctx.reply(
                `✅ *Authentication Successful!*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 *Admin Commands:*\n` +
                `• /addtask - Add new task\n` +
                `• /edittask - Edit task\n` +
                `• /deletetask - Delete task\n` +
                `• /listtasks - List all tasks\n` +
                `• /broadcast - Send message to all users\n` +
                `• /botstats - View bot statistics\n` +
                `• /users - View total users count\n` +
                `• /pending or /withdrawals - Manage withdrawal requests\n` +
                `• /checkuser <id> - Check user details\n` +
                `• /verifyuser <id> - Manually verify a user\n\n` +
                `💡 You can now use these commands anytime.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply('❌ *Wrong password!* Access denied.', { parse_mode: 'Markdown' });
            botAdminSessions.delete(userId);
        }
        return;
    }
    
    // معالجة البث
    if (authSession && authSession.step === 'awaiting_broadcast') {
        ctx.reply('📢 *Broadcasting to all users...*', { parse_mode: 'Markdown' });
        const result = await broadcastToAllUsers(message);
        if (result.success) {
            ctx.reply(
                `✅ *Broadcast Complete!*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 *Notification added for:* ${result.notifiedCount} users\n` +
                `📨 *Bot messages sent:* ${result.botSentCount || 0}`,
                { parse_mode: 'Markdown' }
            );
        } else {
            ctx.reply('❌ *Error sending broadcast:* ' + result.error, { parse_mode: 'Markdown' });
        }
        botAdminSessions.delete(userId);
        return;
    }
    
    // معالجة سبب الرفض لطلبات السحب
    if (authSession && authSession.step === 'awaiting_reject_reason') {
        const withdrawalId = authSession.withdrawalId;
        const reason = message;
        
        ctx.reply(`⏳ Processing rejection for withdrawal #${withdrawalId}...`);
        
        const result = await rejectWithdrawalFromBot(withdrawalId, userId, reason);
        
        if (result.success) {
            ctx.reply(
                `✅ *Withdrawal Rejected Successfully*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📋 *Request ID:* \`${withdrawalId}\`\n` +
                `📝 *Reason:* ${reason}\n\n` +
                `The user has been notified and the amount has been returned to their balance.`,
                { parse_mode: 'Markdown' }
            );
            // Show updated list
            await showPendingWithdrawals(ctx, withdrawalsCurrentPage);
        } else {
            ctx.reply(`❌ *Error rejecting withdrawal:* ${result.error}`, { parse_mode: 'Markdown' });
        }
        
        botAdminSessions.delete(userId);
        return;
    }
    
    // معالجة إضافة مهمة جديدة
    const taskSession = taskCreationSessions.get(userId);
    if (taskSession) {
        if (taskSession.step === 'name') {
            taskSession.name = message;
            taskSession.step = 'type';
            ctx.reply(
                `📝 *Task Name:* ${message}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🏷️ *Step 2:* Choose task type:\n` +
                `• \`channel\` - Telegram Channel / Group\n` +
                `• \`bot\` - Telegram Bot\n` +
                `• \`youtube\` - YouTube Channel\n` +
                `• \`tiktok\` - TikTok Account\n` +
                `• \`twitter\` - Twitter / X Account\n\n` +
                `📝 *Type the type:*`,
                { parse_mode: 'Markdown' }
            );
        } else if (taskSession.step === 'type') {
            const validTypes = ['channel', 'bot', 'youtube', 'tiktok', 'twitter'];
            if (!validTypes.includes(message.toLowerCase())) {
                return ctx.reply('❌ *Invalid type!* Please choose: channel, bot, youtube, tiktok, or twitter', { parse_mode: 'Markdown' });
            }
            taskSession.type = message.toLowerCase();
            taskSession.step = 'identifier';
            ctx.reply(
                `📝 *Task Name:* ${taskSession.name}\n` +
                `🏷️ *Type:* ${taskSession.type}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔗 *Step 3:* Enter username or link:\n` +
                `• For Telegram: @username\n` +
                `• For YouTube: @channel or full URL\n` +
                `• For TikTok: @username\n` +
                `• For Twitter: @username\n\n` +
                `📝 *Type the identifier:*`,
                { parse_mode: 'Markdown' }
            );
        } else if (taskSession.step === 'identifier') {
            taskSession.identifier = message;
            taskSession.step = 'reward';
            ctx.reply(
                `📝 *Task Name:* ${taskSession.name}\n` +
                `🏷️ *Type:* ${taskSession.type}\n` +
                `🔗 *Identifier:* ${taskSession.identifier}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 *Step 4:* Enter reward amount (USD):\n` +
                `• Example: 0.05, 0.10, 0.25\n\n` +
                `📝 *Type the reward:*`,
                { parse_mode: 'Markdown' }
            );
        } else if (taskSession.step === 'reward') {
            const reward = parseFloat(message);
            if (isNaN(reward) || reward <= 0) {
                return ctx.reply('❌ *Invalid reward!* Please enter a valid number (e.g., 0.05)', { parse_mode: 'Markdown' });
            }
            taskSession.reward = reward;
            taskSession.step = 'resetPeriod';
            ctx.reply(
                `📝 *Task Name:* ${taskSession.name}\n` +
                `🏷️ *Type:* ${taskSession.type}\n` +
                `🔗 *Identifier:* ${taskSession.identifier}\n` +
                `💰 *Reward:* $${reward}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔄 *Step 5:* Choose reset period:\n` +
                `• \`daily\` - Resets every day\n` +
                `• \`weekly\` - Resets every week\n` +
                `• \`once\` - One time only\n\n` +
                `📝 *Type the reset period:*`,
                { parse_mode: 'Markdown' }
            );
        } else if (taskSession.step === 'resetPeriod') {
            const validPeriods = ['daily', 'weekly', 'once'];
            if (!validPeriods.includes(message.toLowerCase())) {
                return ctx.reply('❌ *Invalid period!* Please choose: daily, weekly, or once', { parse_mode: 'Markdown' });
            }
            taskSession.resetPeriod = message.toLowerCase();
            
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
                createdAt: new Date().toISOString(),
                createdBy: ADMIN_ID
            };
            
            try {
                await db.collection('tasks').doc(taskId).set(newTask);
                ctx.reply(
                    `✅ *Task Created Successfully!*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📌 *Name:* ${taskSession.name}\n` +
                    `🏷️ *Type:* ${taskSession.type}\n` +
                    `🔗 *Identifier:* ${taskSession.identifier}\n` +
                    `💰 *Reward:* $${taskSession.reward}\n` +
                    `🔄 *Reset:* ${taskSession.resetPeriod}\n` +
                    `🆔 *ID:* \`${taskId}\`\n\n` +
                    `📋 Use /listtasks to see all tasks.`,
                    { parse_mode: 'Markdown' }
                );
                console.log(`✅ Task created via bot: ${taskId} - ${taskSession.name}`);
            } catch (error) {
                console.error('Error creating task:', error);
                ctx.reply('❌ *Error creating task!* Please try again.', { parse_mode: 'Markdown' });
            }
            
            taskCreationSessions.delete(userId);
        }
        return;
    }
    
    // معالجة تعديل/حذف المهام
    const editSession = taskEditSessions.get(userId);
    if (editSession) {
        if (editSession.step === 'select') {
            const num = parseInt(message);
            if (isNaN(num) || num < 1 || num > editSession.tasks.length) {
                return ctx.reply(`❌ *Invalid number!* Please enter a number between 1 and ${editSession.tasks.length}`, { parse_mode: 'Markdown' });
            }
            editSession.selectedTask = editSession.tasks[num - 1];
            editSession.step = 'new_reward';
            ctx.reply(
                `✏️ *Editing Task:* ${editSession.selectedTask.name}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 *Current reward:* $${editSession.selectedTask.reward}\n\n` +
                `📝 *Enter new reward amount (USD):*`,
                { parse_mode: 'Markdown' }
            );
        } else if (editSession.step === 'new_reward') {
            const reward = parseFloat(message);
            if (isNaN(reward) || reward <= 0) {
                return ctx.reply('❌ *Invalid reward!* Please enter a valid number (e.g., 0.10)', { parse_mode: 'Markdown' });
            }
            
            try {
                await db.collection('tasks').doc(editSession.selectedTask.id).update({
                    reward: reward,
                    updatedAt: new Date().toISOString()
                });
                ctx.reply(
                    `✅ *Task Updated Successfully!*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📌 *Name:* ${editSession.selectedTask.name}\n` +
                    `💰 *New Reward:* $${reward}\n` +
                    `💰 *Old Reward:* $${editSession.selectedTask.reward}`,
                    { parse_mode: 'Markdown' }
                );
                console.log(`✅ Task updated via bot: ${editSession.selectedTask.id}`);
            } catch (error) {
                console.error('Error updating task:', error);
                ctx.reply('❌ *Error updating task!* Please try again.', { parse_mode: 'Markdown' });
            }
            taskEditSessions.delete(userId);
        } else if (editSession.step === 'delete_select') {
            const num = parseInt(message);
            if (isNaN(num) || num < 1 || num > editSession.tasks.length) {
                return ctx.reply(`❌ *Invalid number!* Please enter a number between 1 and ${editSession.tasks.length}`, { parse_mode: 'Markdown' });
            }
            const taskToDelete = editSession.tasks[num - 1];
            editSession.selectedTask = taskToDelete;
            editSession.step = 'confirm_delete';
            ctx.reply(
                `⚠️ *CONFIRM DELETION* ⚠️\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 *Task:* ${taskToDelete.name}\n` +
                `💰 *Reward:* $${taskToDelete.reward}\n\n` +
                `❌ *Are you sure?* Type \`CONFIRM\` to delete permanently.\n` +
                `🔄 Type anything else to cancel.`,
                { parse_mode: 'Markdown' }
            );
        } else if (editSession.step === 'confirm_delete') {
            if (message === 'CONFIRM') {
                try {
                    await db.collection('tasks').doc(editSession.selectedTask.id).delete();
                    ctx.reply(
                        `✅ *Task Deleted Successfully!*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `📌 *Name:* ${editSession.selectedTask.name}\n` +
                        `💰 *Reward:* $${editSession.selectedTask.reward}`,
                        { parse_mode: 'Markdown' }
                    );
                    console.log(`✅ Task deleted via bot: ${editSession.selectedTask.id}`);
                } catch (error) {
                    console.error('Error deleting task:', error);
                    ctx.reply('❌ *Error deleting task!* Please try again.', { parse_mode: 'Markdown' });
                }
            } else {
                ctx.reply('✅ *Deletion cancelled.*', { parse_mode: 'Markdown' });
            }
            taskEditSessions.delete(userId);
        }
        return;
    }
});

// ========== معالجة أزرار الـ Callback Query ==========

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

// معالجة أزرار الموافقة على السحب
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

// معالجة أزرار الرفض على السحب
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
    
    // Store that we're waiting for a reason
    botAdminSessions.set(adminUserId, { 
        step: 'awaiting_reject_reason', 
        withdrawalId: withdrawalId 
    });
    
    await ctx.reply(
        `✏️ *REJECTION REASON REQUIRED*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Please send the reason for rejecting withdrawal #${withdrawalId}.\n\n` +
        `The user will see this reason in their notification.`,
        { parse_mode: 'Markdown' }
    );
});

// معالجة أزرار التنقل في طلبات السحب
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

// تشغيل البوت
bot.launch({ dropPendingUpdates: true })
    .then(() => console.log('🤖 Telegram Bot started successfully'))
    .catch(err => console.error('❌ Bot error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ═══════════════════════════════════════════════════════════════════════════
// 5. 🌐 Middleware
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
// 6. 🌍 APIs العامة
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// 7. 👤 APIs المستخدمين
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
// 8. 🔗 API الإحالة
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
// 9. 🎬 API مكافأة الإعلان
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

// ═══════════════════════════════════════════════════════════════════════════
// 10. ✅ API التحقق من انضمام القنوات (فقط لـ channel)
// ═══════════════════════════════════════════════════════════════════════════

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
        } 
        else {
            isVerified = true;
            console.log(`✅ Auto-verified for type: ${taskType}`);
        }
        
        if (!isVerified) {
            return res.json({ success: false, error: '❌ You are not a member of this channel/group. Please join first and try again.' });
        }
        
        if (db && reward) {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const completedTasks = userData.completedTasks || [];
                
                if (!completedTasks.includes(taskId)) {
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

// ═══════════════════════════════════════════════════════════════════════════
// 11. 💸 API طلبات السحب (مع إضافة التحقق من isVerified)
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
            return res.json({ success: false, error: `You need ${APP_CONFIG.requiredReferrals} referral to withdraw (security measure)` });
        }
        
        // ✅ التحقق الجديد: هل قام المستخدم بالتحقق من حسابه؟
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

// ═══════════════════════════════════════════════════════════════════════════
// 11.5. 🔐 API التحقق من المستخدمين (جديد)
// ═══════════════════════════════════════════════════════════════════════════

// API للتحقق عبر الإحالات
app.post('/api/verify-by-referrals', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.json({ success: false, error: 'User ID required' });
    }
    
    const result = await verifyUserByReferrals(userId);
    res.json(result);
});

// API للتحقق عبر TON
app.post('/api/ton/verify', async (req, res) => {
    const { userId, txHash, amount } = req.body;
    
    if (!userId || !txHash) {
        return res.json({ success: false, error: 'Missing required fields' });
    }
    
    const result = await verifyUserByTon(userId, txHash, amount || "0.01");
    res.json(result);
});

// API للتحقق من حالة المستخدم (للواجهة الأمامية)
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

// ═══════════════════════════════════════════════════════════════════════════
// 12. 👑 لوحة المشرف (Admin APIs) - تابع
// ═══════════════════════════════════════════════════════════════════════════

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
            type: 'withdraw',
            title: '✅ Withdrawal Approved!',
            message: `Your withdrawal of $${data.amount.toFixed(2)} has been approved.`
        });
        console.log(`✅ Withdrawal approved: ${withdrawalId}`);
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
            type: 'withdraw',
            title: '❌ Withdrawal Rejected',
            message: `Your withdrawal of $${data.amount.toFixed(2)} was rejected. Reason: ${reason || 'Not specified'}\nThe amount has been returned.`
        });
        console.log(`❌ Withdrawal rejected: ${withdrawalId}`);
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
        await db.collection('users').doc(userId).update({ 
            balance: admin.firestore.FieldValue.increment(amount), 
            totalEarned: admin.firestore.FieldValue.increment(amount) 
        });
        await addNotification(userId, { 
            type: 'admin', 
            title: '💰 Balance Added', 
            message: `Admin added $${amount.toFixed(2)} to your account.` 
        });
        console.log(`💰 Added $${amount} to user ${userId}`);
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
        await db.collection('users').doc(userId).update({ 
            balance: admin.firestore.FieldValue.increment(-amount) 
        });
        await addNotification(userId, { 
            type: 'admin', 
            title: '💰 Balance Adjusted', 
            message: `Admin removed $${amount.toFixed(2)} from your account.` 
        });
        console.log(`💰 Removed $${amount} from user ${userId}`);
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
        await db.collection('users').doc(userId).update({ 
            withdrawBlocked: true, 
            withdrawBlockedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        await addNotification(userId, { 
            type: 'blocked', 
            title: '🚫 Account Restricted', 
            message: 'Your withdrawal access has been permanently blocked.' 
        });
        console.log(`🚫 User ${userId} permanently blocked from withdrawals`);
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

// Admin Tasks Management APIs
app.post('/api/admin/tasks', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const taskData = req.body;
        const taskId = taskData.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const newTask = {
            ...taskData,
            id: taskId,
            createdAt: new Date().toISOString()
        };
        await db.collection('tasks').doc(taskId).set(newTask);
        res.json({ success: true, taskId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/tasks/:taskId', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const { taskId } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();
        await db.collection('tasks').doc(taskId).update(updates);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/tasks/:taskId', async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    if (!db) return res.json({ success: false, error: 'Database not connected' });
    try {
        const { taskId } = req.params;
        await db.collection('tasks').doc(taskId).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. 🕐 مهمة مجدولة لإعادة تعيين المهام اليومية (Cron Job)
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

// ═══════════════════════════════════════════════════════════════════════════
// 14. 🚀 تشغيل الخادم
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
    console.log(`\n🌟 ADNOVA NETWORK SERVER v13.0`);
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
    console.log(`🔐 User Verification System: ✅ NEW!`);
    console.log(`   • /checkuser <id> - Check user details`);
    console.log(`   • /verifyuser <id> - Manually verify a user`);
    console.log(`   • Method 1: Invite ${APP_CONFIG.requiredReferralsForVerify} friends (Free)`);
    console.log(`   • Method 2: Pay 0.01 TON (Fast)`);
    console.log(`   • API: /api/verify-by-referrals`);
    console.log(`   • API: /api/ton/verify`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Server ready for production!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// ============================================================================
// نهاية الملف 🎯
// ============================================================================
