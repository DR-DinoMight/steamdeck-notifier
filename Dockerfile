# Use official Deno image
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy the application
COPY main.ts /app/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory and set permissions
RUN mkdir -p /app/data

# Create non-root user for security
RUN groupadd -r steamdeck && useradd -r -g steamdeck steamdeck && chown -R steamdeck:steamdeck /app

# Cache dependencies
RUN deno cache main.ts

ENTRYPOINT ["/entrypoint.sh"]

USER steamdeck

# Health check
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "main.ts" >/dev/null || exit 1

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts"]
