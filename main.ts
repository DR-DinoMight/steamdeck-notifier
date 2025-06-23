#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// Steam Deck Telegram Notifier - Checks availability and sends Telegram notifications
// Copyright (C) 2025 Oliver Blass
// Based on https://github.com/oblassgit/refurbished-steam-deck-notifier
// Modifications: Rewritten in Deno, uses Telegram instead of Discord
// Licensed under the GNU Affero General Public License v3.0

import { existsSync } from "https://deno.land/std@0.208.0/fs/mod.ts";

interface TelegramConfig {
    botToken: string;
    chatId: string;
}

// Configuration from environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const COUNTRY_CODE = Deno.env.get("COUNTRY_CODE") || "DE";
const CHECK_INTERVAL = parseInt(Deno.env.get("CHECK_INTERVAL") || "180"); // 3 minutes in seconds
const ENABLE_LOGS = (Deno.env.get("ENABLE_LOGS") ?? "false").toLowerCase() === "true";

const STATUS_FILE = Deno.env.get("STATUS_FILE") || "/app/data/status.json";
const LOG_FILE = Deno.env.get("LOG_FILE") || "/app/data/log.json";

// Load or initialize
let statusStore: Record<string, string> = {};
let logStore: any[] = [];

// Ensure files exist or create them if missing
if (!existsSync(STATUS_FILE)) {
    try {
        await Deno.writeTextFile(STATUS_FILE, JSON.stringify({}));
    } catch (err) {
        console.error(`Failed to create status file (${STATUS_FILE}):`, err);
    }
}
if (!existsSync(LOG_FILE)) {
    try {
        await Deno.writeTextFile(LOG_FILE, JSON.stringify([]));
    } catch (err) {
        console.error(`Failed to create log file (${LOG_FILE}):`, err);
    }
}

try {
    if (existsSync(STATUS_FILE)) {
        statusStore = JSON.parse(await Deno.readTextFile(STATUS_FILE));
    }
} catch (err) {
    console.error(`Failed to load status file (${STATUS_FILE}):`, err);
    statusStore = {};
}
try {
    if (existsSync(LOG_FILE)) {
        logStore = JSON.parse(await Deno.readTextFile(LOG_FILE));
    }
} catch (err) {
    console.error(`Failed to load log file (${LOG_FILE}):`, err);
    logStore = [];
}

async function saveStatus() {
    try {
        await Deno.writeTextFile(STATUS_FILE, JSON.stringify(statusStore));
    } catch (err) {
        console.error(`Failed to save status file (${STATUS_FILE}):`, err);
    }
}
async function saveLog() {
    try {
        await Deno.writeTextFile(LOG_FILE, JSON.stringify(logStore));
    } catch (err) {
        console.error(`Failed to save log file (${LOG_FILE}):`, err);
    }
}

async function logAvailabilityData(version: string, packageId: string, available: boolean, isOled: boolean, countryCode: string): Promise<void> {
    if (!ENABLE_LOGS) return;
    const unix_timestamp = Math.floor(Date.now() / 1000);
    const display_type = isOled ? "OLED" : "LCD";
    logStore.push({
        unix_timestamp,
        storage_gb: version,
        display_type,
        package_id: packageId,
        available,
        country_code: countryCode,
    });
    await saveLog();
}

async function getStatus(packageId: string, countryCode: string): Promise<string> {
    return statusStore[`${packageId}_${countryCode}`] ?? "";
}

async function setStatus(packageId: string, countryCode: string, availability: string): Promise<void> {
    statusStore[`${packageId}_${countryCode}`] = availability;
    await saveStatus();
}

async function sendTelegramMessage(config: TelegramConfig, message: string): Promise<void> {
    try {
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Telegram message failed: ${response.status}`, errorData);
        } else {
            console.log(`✅ Telegram notification sent: ${message.substring(0, 50)}...`);
        }
    } catch (error) {
        console.error(`Telegram error: ${error}`);
    }
}

async function checkSteamDeckAvailability(
    version: string,
    packageId: string,
    isOLED: boolean,
    countryCode: string,
    telegramConfig: TelegramConfig
): Promise<void> {
    const url = `https://api.steampowered.com/IPhysicalGoodsService/CheckInventoryAvailableByPackage/v1?origin=https:%2F%2Fstore.steampowered.com&country_code=${countryCode}&packageid=${packageId}`;

    let oldValue = await getStatus(packageId, countryCode);

    try {
        // Make request to Steam API
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const availability = String(data.response.inventory_available);
        const currentTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

        console.log(`${currentTime} >> ${version}GB ${isOLED ? 'OLED' : 'LCD'} Result: ${availability} (was: ${oldValue})`);

        // Save new availability to DB
        await setStatus(packageId, countryCode, availability);

        // Check if status changed
        const statusChanged = oldValue !== availability && oldValue !== "";

        // Log data
        await logAvailabilityData(version, packageId, availability === "true", isOLED, countryCode);

        // Send Telegram notification only on status change
        if (statusChanged) {
            const displayType = isOLED ? "OLED" : "LCD";
            let message: string;

            if (availability === "true") {
                message = `🎮 <b>STEAM DECK AVAILABLE!</b>\n\n` +
                         `📱 Model: ${version}GB ${displayType}\n` +
                         `🌍 Region: ${countryCode}\n` +
                         `⏰ Time: ${currentTime}\n\n` +
                         `🚀 <a href="https://store.steampowered.com/steamdeck">Get it now!</a>`;
            } else {
                message = `❌ <b>Steam Deck Out of Stock</b>\n\n` +
                         `📱 Model: ${version}GB ${displayType}\n` +
                         `🌍 Region: ${countryCode}\n` +
                         `⏰ Time: ${currentTime}`;
            }

            await sendTelegramMessage(telegramConfig, message);
        }

    } catch (error) {
        console.error(`Error fetching data for ${version}GB ${isOLED ? 'OLED' : 'LCD'}: ${error}`);
        await logAvailabilityData(version, packageId, false, isOLED, countryCode);
    }
}

async function runCheck(): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("❌ TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables are required");
        Deno.exit(1);
    }

    const telegramConfig: TelegramConfig = {
        botToken: TELEGRAM_BOT_TOKEN,
        chatId: TELEGRAM_CHAT_ID,
    };

    // Send notification on startup
    const startMessage = `✅ <b>Steam Deck Notifier started and connected</b>\n\n` +
        `Monitoring has begun for region: <b>${COUNTRY_CODE}</b>.`;
    await sendTelegramMessage(telegramConfig, startMessage);

    console.log(`🚀 Starting Steam Deck availability check...`);
    console.log(`📍 Country: ${COUNTRY_CODE}`);

    // Steam Deck models
    const models: [string, string, boolean][] = [
        ["64", "903905", false],    // 64GB LCD
        ["256", "903906", false],   // 256GB LCD
        ["512", "903907", false],   // 512GB LCD
        ["512", "1202542", true],   // 512GB OLED
        ["1024", "1202547", true],  // 1TB OLED
    ];

    console.log(`🎮 Monitoring ${models.length} Steam Deck models:`);
    for (const [version, packageId, isOled] of models) {
        console.log(`   - ${version}GB ${isOled ? 'OLED' : 'LCD'} (${packageId})`);
    }
    console.log("");

    // Main monitoring loop
    while (true) {
        const checkStart = Date.now();
        console.log(`🔍 Starting check cycle at ${new Date().toISOString()}`);

        for (const [version, packageId, isOled] of models) {
            await checkSteamDeckAvailability(version, packageId, isOled, COUNTRY_CODE, telegramConfig);
            // Small delay between each model check
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const checkDuration = Date.now() - checkStart;
        console.log(`✅ Check cycle completed in ${checkDuration}ms`);
        console.log(`😴 Sleeping for ${CHECK_INTERVAL} seconds...\n`);

        // Wait for the specified interval
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL * 1000));
    }
}

function setupSignalHandlers() {
    const shutdown = () => {
        console.log("\n🛑 Received shutdown signal, exiting gracefully...");
        Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);
}

if (import.meta.main) {
    setupSignalHandlers();
    runCheck().catch((error) => {
        console.error("💥 Fatal error:", error);
        Deno.exit(1);
    });
}
