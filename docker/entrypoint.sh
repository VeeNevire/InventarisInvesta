#!/bin/sh
set -e

php artisan storage:link --force >/dev/null 2>&1 || true
php artisan optimize

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force
fi

exec "$@"
