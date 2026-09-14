#!/usr/bin/env bash
# tools/check-all.sh — 一键全量检查：内容验证 → http 冒烟 → 自动化通关 → file:// 冒烟
# 用法：bash tools/check-all.sh
set -u
cd "$(dirname "$0")/.." || exit 2

echo "================ 1/4 内容一致性验证 ================"
node tools/validate.js
V=$?

echo
echo "================ 2/4 启动本地服务器 ================"
node tools/serve.js 8765 &
SRV=$!
sleep 1.2

echo "================ 3/4 自动化通关（http） ================"
node tools/playthrough.js --base http://127.0.0.1:8765/index.html
P=$?

echo
echo "================ 4/4 file:// 冒烟 ================"
node tools/smoke.js --file
S=$?

kill $SRV 2>/dev/null
echo
echo "===================================================="
echo "validate=$V playthrough=$P smoke=$S"
[ $V -eq 0 ] && [ $P -eq 0 ] && [ $S -eq 0 ] && echo "全部通过 ✔" || echo "存在失败 ✘"
exit $(( V + P + S ))
