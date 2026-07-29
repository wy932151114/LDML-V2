# ========================================
# DZS-OS — 数据库初始化
# 用法: docker compose run --rm init-db
# ========================================

echo "Initializing MongoDB for dzs_os..."

cd "$(dirname "$0")/.."

if command -v mongosh &> /dev/null; then
  mongosh mongodb://admin:dzs_dev_pass@localhost:27017/dzs_os scripts/init-mongo.js
  echo "✅ Database initialized via mongosh"
elif command -v mongo &> /dev/null; then
  mongo mongodb://admin:dzs_dev_pass@localhost:27017/dzs_os scripts/init-mongo.js
  echo "✅ Database initialized via mongo (legacy)"
else
  echo "⚠  mongosh not found. Start Docker services first, then run inside container:"
  echo "   docker compose exec mongodb mongosh /docker-entrypoint-initdb.d/init-mongo.js"
fi
