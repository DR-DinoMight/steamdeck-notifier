# Steam Deck Telegram Notifier

A Docker container that monitors Steam Deck refurbished inventory and sends Telegram notifications when availability changes.

## Features

- 🎮 Monitors all Steam Deck models (64GB–1TB, LCD/OLED)
- 📱 Telegram notifications with rich formatting
- 🌍 Multi-region support (US, DE, UK, etc.)
- 📊 File-based JSON logging for availability tracking
- ⏰ Configurable check intervals (default: 3 minutes)
- 🐋 Docker containerised for easy deployment

## Quick Start

### 1. Set up Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot: `/newbot`
3. Follow instructions and get your **Bot Token**
4. Add the bot to your chat/channel
5. Get your **Chat ID**:
   - For personal chat: Message [@userinfobot](https://t.me/userinfobot)
   - For groups: Add [@RawDataBot](https://t.me/rawdatabot) to get chat ID

### 2. Clone and Configure

```bash
git clone <repository>
cd steamdeck-notifier

# Create a .env file (see configuration below)
```

### 3. Run with Docker Compose

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 4. Alternative: Run with Docker

```bash
# Build the image
docker build -t steamdeck-notifier .

# Run the container
docker run -d \
  --name steamdeck-notifier \
  --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN="your_bot_token" \
  -e TELEGRAM_CHAT_ID="your_chat_id" \
  -e COUNTRY_CODE="US" \
  -e CHECK_INTERVAL="180" \
  -e ENABLE_LOGS="true" \
  -e STATUS_FILE="/app/data/status.json" \
  -e LOG_FILE="/app/data/log.json" \
  -v $(pwd)/data:/app/data \
  steamdeck-notifier
```

## Configuration

| Environment Variable    | Required | Default                  | Description                                 |
|------------------------|----------|--------------------------|---------------------------------------------|
| `TELEGRAM_BOT_TOKEN`   | ✅       | -                        | Your Telegram bot token                     |
| `TELEGRAM_CHAT_ID`     | ✅       | -                        | Telegram chat/channel ID                    |
| `COUNTRY_CODE`         | ❌       | `DE`                     | Steam region (US, DE, UK, etc.)             |
| `CHECK_INTERVAL`       | ❌       | `180`                    | Check interval in seconds                   |
| `ENABLE_LOGS`          | ❌       | `false`                  | Set to `true` to enable logging             |
| `STATUS_FILE`          | ❌       | `/app/data/status.json`  | Path to the JSON file for status data       |
| `LOG_FILE`             | ❌       | `/app/data/log.json`     | Path to the JSON file for log data          |

## Monitored Models

- 64GB LCD (Refurbished)
- 256GB LCD (Refurbished)
- 512GB LCD (Refurbished)
- 512GB OLED (Refurbished)
- 1TB OLED (Refurbished)

## Supported Regions

- `US` – United States
- `DE` – Germany
- `UK` – United Kingdom
- `CA` – Canada
- `AU` – Australia
- And many more Steam regions

## Sample Notification

```
🎮 STEAM DECK AVAILABLE!

📱 Model: 512GB OLED
🌍 Region: US
⏰ Time: 2025-01-15 14:30:22

🚀 Get it now!
```

## Logs and Data

- **File-based JSON**: All availability logs and status are stored in local JSON files (see `STATUS_FILE` and `LOG_FILE`).
- **Log Data**: Each check is appended as an object to the log file (if `ENABLE_LOGS` is set to `true`).
- **Status Data**: The latest status for each model/region is stored as a key-value pair in the status file.
- **No database required**: The project does not use GoatDB, SQLite, or CSV files. All data is managed by simple file-based storage.

### Error Handling
If a file is missing or corrupted, the app will log an error and continue running with a fresh store. File write errors are also logged but do not crash the app.

## Troubleshooting

### Check Container Status
```bash
docker-compose ps
docker-compose logs steamdeck-notifier
```

### Test Telegram Bot
```bash
# Send test message
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"
```

### Common Issues

1. **Bot not sending messages**: Check bot token and chat ID
2. **Permission denied**: Ensure bot is added to the chat/channel
3. **No notifications**: Check if availability actually changed
4. **Container stops**: Check logs for errors

## Development

### Local Development
```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Run locally (with environment variables set)
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy deno run --allow-net --allow-read --allow-write --allow-env main.ts
```

### Build Custom Image
```bash
docker build -t my-steamdeck-notifier .
```

## Attribution

This project is based on [oblassgit/refurbished-steam-deck-notifier](https://github.com/oblassgit/refurbished-steam-deck-notifier) by Oliver Blass, licensed under the AGPL-3.0.

**Modifications:**
- Rewritten in Deno
- Uses Telegram for notifications instead of Discord
- Uses file-based JSON for all data storage
- Added ability to run in Docker instead of building executables

See [LICENSE](./LICENSE) for details.

## Licence

GNU Affero General Public Licence v3.0
