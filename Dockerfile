# Use official Deno image
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy the application
COPY main.ts /app/

# Create data directory and set permissions
RUN mkdir -p /app/data

# Cache dependencies
RUN deno cache main.ts

# Health check
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "main.ts" >/dev/null || exit 1

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts"]
