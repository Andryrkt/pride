#!/bin/sh
set -e
# Applique les migrations de la base de données, puis démarre le serveur.
node migrator/migrate.mjs
if [ "${SEED_ON_START:-0}" = "1" ]; then
  node migrator/seed.mjs
fi
exec node apps/web/server.js
