#!/bin/bash
# bump.sh — PuddingLogin 全仓库版本号同步 & 构建发布
# 用法: bash scripts/bump.sh 2.1.9 [--skip-build] [--skip-push]
#
# 同步范围:
#   1. app/core.php:31          const PL_VERSION = 'x.y.z'
#   2. frontend/package.json:4  "version": "x.y.z"

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  echo "用法: bash scripts/bump.sh <新版本号> [--skip-build] [--skip-push]"
  echo "示例: bash scripts/bump.sh 2.1.9"
  exit 1
}

# ---- 参数解析 ----
[ $# -lt 1 ] && usage
NEW_VER="$1"
shift
SKIP_BUILD=false; SKIP_PUSH=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-push)  SKIP_PUSH=true ;;
    *) usage ;;
  esac
done

# 校验版本号格式
if ! echo "$NEW_VER" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo -e "${RED}错误: 版本号格式无效，需为 x.y.z（如 2.1.9）${NC}"
  exit 1
fi

cd "$ROOT"

# 获取当前版本
OLD_VER=$(grep -oP "(?<=const PL_VERSION = ')[0-9.]+(?=')" app/core.php || echo '?')
echo -e "${YELLOW}当前版本: ${OLD_VER}  →  目标版本: ${NEW_VER}${NC}"
echo ''

# ---- 步骤 1: 同步 PHP 常量 ----
echo -e "[1/2] app/core.php  PL_VERSION 常量 …"
sed -i "s/const PL_VERSION = '[0-9.]*';/const PL_VERSION = '${NEW_VER}';/" app/core.php
grep -q "const PL_VERSION = '${NEW_VER}'" app/core.php && echo -e "  ${GREEN}✓ 已更新${NC}" || { echo -e "  ${RED}✗ 替换失败${NC}"; exit 1; }

# ---- 步骤 2: 同步 package.json ----
echo -e "[2/2] frontend/package.json  …"
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"${NEW_VER}\"/" frontend/package.json
grep -q "\"version\": \"${NEW_VER}\"" frontend/package.json && echo -e "  ${GREEN}✓ 已更新${NC}" || { echo -e "  ${RED}✗ 替换失败${NC}"; exit 1; }

echo ''

# ---- 步骤 5: 构建前端 ----
if $SKIP_BUILD; then
  echo -e "${YELLOW}跳过前端构建 (--skip-build)${NC}"
else
  echo -e "[build] 构建前端产物 …"
  cd frontend && npm run build 2>&1 && cd ..
  echo -e "${GREEN}✓ 构建完成${NC}"
fi

# ---- 步骤 6: Git 提交 & 推送 ----
echo ''
echo -e "[git] 提交改动 …"
git add -A
git commit -m "chore: bump to v${NEW_VER}" || echo -e "${YELLOW}⚠ 无新改动或提交失败${NC}"

if $SKIP_PUSH; then
  echo -e "${YELLOW}跳过推送 (--skip-push)，请手动 git push${NC}"
else
  echo -e "[git] 推送至 Gitee …"
  GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/true git push origin master 2>&1
  echo -e "  ${GREEN}✓ Gitee 已推送${NC}"
  echo -e "[git] 推送至 GitHub …"
  GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/true git push github master 2>&1 || echo -e "  ${YELLOW}⚠ GitHub 推送失败，请检查 Token 或网络${NC}"
  echo -e "  ${GREEN}✓ GitHub 已推送${NC}"
fi

echo ''
echo -e "${GREEN}════════════════════════════════${NC}"
echo -e "${GREEN}  bump 完成: v${OLD_VER} → v${NEW_VER}${NC}"
echo -e "${GREEN}════════════════════════════════${NC}"
