#!/bin/sh
chown -R steamdeck:steamdeck /app/data
exec "$@"
