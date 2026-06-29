#!/bin/bash
# Secure deployment script for MicoPay API (SEC-21 compliant)
# Usage: ./deploy-secure.sh <environment> <domains>
# Example: ./deploy-secure.sh production "https://app.example.com,https://admin.example.com"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MicoPay API - Secure Deployment Script (SEC-21)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Validate arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <environment> [domains]"
    echo "Example: $0 production 'https://app.example.com,https://admin.example.com'"
    exit 1
fi

ENVIRONMENT=$1
DOMAINS=${2:-""}

# Validate environment
case "$ENVIRONMENT" in
    development|staging|production)
        echo -e "${GREEN}✓${NC} Environment: $ENVIRONMENT"
        ;;
    *)
        echo -e "${RED}✗ Invalid environment: $ENVIRONMENT (must be development, staging, or production)${NC}"
        exit 1
        ;;
esac

# Validate domains for production
if [ "$ENVIRONMENT" = "production" ] && [ -z "$DOMAINS" ]; then
    echo -e "${RED}✗ Production deployment requires domains argument${NC}"
    echo "Example: $0 production 'https://app.example.com,https://admin.example.com'"
    exit 1
fi

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}✓${NC} Domains: $DOMAINS"
fi

# Check if running in API directory
if [ ! -f "package.json" ] || ! grep -q "@micopay/api" package.json 2>/dev/null; then
    echo -e "${RED}✗ Must run from apps/api directory${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Pre-Deployment Checklist${NC}"

# Check Node.js version
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js version: $NODE_VERSION"

# Check npm
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓${NC} npm version: $NPM_VERSION"

# Verify dependencies
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}!${NC} node_modules missing, will install"
fi

# Check if @fastify/helmet is available
if npm ls @fastify/helmet > /dev/null 2>&1; then
    HELMET_VERSION=$(npm ls @fastify/helmet 2>/dev/null | grep "@fastify/helmet" | head -1)
    echo -e "${GREEN}✓${NC} Helmet installed: $HELMET_VERSION"
else
    echo -e "${YELLOW}!${NC} Helmet not installed, will install"
fi

echo ""
echo -e "${BLUE}🔨 Building Application${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci --production || npm install --production
fi

# Build
echo "Building TypeScript..."
npm run build

echo -e "${GREEN}✓${NC} Build successful"

echo ""
echo -e "${BLUE}🔐 Security Configuration${NC}"

# Create environment configuration
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Production environment variables:"
    echo -e "  NODE_ENV=production"
    echo -e "  CORS_ALLOWED_ORIGINS=$DOMAINS"
    echo ""
    
    # Warn about HTTPS
    echo -e "${YELLOW}⚠${NC}  IMPORTANT: Ensure you're deploying to HTTPS"
    echo -e "${YELLOW}⚠${NC}  HSTS header enforces HTTPS connections"
    echo ""
    
    # Suggest HSTS preload registration
    echo -e "${YELLOW}ℹ${NC}  Optional: Register domain for HSTS preload:"
    echo -e "${YELLOW}ℹ${NC}  https://hstspreload.org"
    echo ""
fi

if [ "$ENVIRONMENT" = "staging" ]; then
    if [ -z "$DOMAINS" ]; then
        echo "Staging environment variables:"
        echo -e "  NODE_ENV=staging"
        echo -e "  CORS_ALLOWED_ORIGINS=https://staging.example.com"
    else
        echo "Staging environment variables:"
        echo -e "  NODE_ENV=staging"
        echo -e "  CORS_ALLOWED_ORIGINS=$DOMAINS"
    fi
    echo ""
fi

if [ "$ENVIRONMENT" = "development" ]; then
    echo "Development environment variables:"
    echo -e "  NODE_ENV=development"
    echo -e "  CORS_ALLOWED_ORIGINS=<auto-configured for localhost>"
    echo ""
fi

echo -e "${BLUE}📝 Deployment Environment File${NC}"
echo "Add the following to your deployment environment (.env or deployment config):"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    cat <<EOF
# Production Deployment - SEC-21 Compliant
NODE_ENV=production
CORS_ALLOWED_ORIGINS=$DOMAINS

# Other required variables:
DATABASE_URL=<your-production-db>
JWT_SECRET=<your-secure-jwt-secret>
STELLAR_NETWORK=PUBLIC
PLATFORM_SECRET_KEY=<your-production-key>
# ... (other environment variables)
EOF
elif [ "$ENVIRONMENT" = "staging" ]; then
    cat <<EOF
# Staging Deployment - SEC-21 Compliant
NODE_ENV=staging
CORS_ALLOWED_ORIGINS=${DOMAINS:-https://staging.example.com}

# Other required variables:
DATABASE_URL=<your-staging-db>
JWT_SECRET=<your-staging-jwt-secret>
STELLAR_NETWORK=TESTNET
# ... (other environment variables)
EOF
else
    cat <<EOF
# Development Deployment - SEC-21 Compliant
NODE_ENV=development
# CORS_ALLOWED_ORIGINS is auto-configured for localhost

# Other variables (optional for local development):
DATABASE_URL=postgresql://localhost:5432/micopay_dev
# ... (other environment variables)
EOF
fi

echo ""
echo -e "${BLUE}✅ Deployment Instructions${NC}"
echo "1. Copy the environment variables above to your deployment system"
echo "2. Export or set these variables in your deployment environment"
echo "3. Run: npm start"
echo ""
echo "To test security headers after deployment:"
echo "  curl -i https://your-api-domain.com/health"
echo ""
echo "To test CORS configuration after deployment:"
echo "  curl -H \"Origin: $DOMAINS\" https://your-api-domain.com/health"

echo ""
echo -e "${BLUE}📊 Security Verification${NC}"
echo "After deployment, verify security is properly configured:"
echo ""
echo "1. Check security headers:"
echo "   curl -i https://your-api-domain.com/health | grep -E '(Strict-Transport|X-Content|X-Frame|CSP|Referrer)'"
echo ""
echo "2. Verify startup logs contain:"
echo "   [SECURITY] NODE_ENV: $ENVIRONMENT"
echo "   [SECURITY] CORS Allowed Origins: ..."
echo "   [SECURITY] Security Headers: Helmet enabled..."
echo ""
echo "3. Test authenticated endpoint:"
echo "   curl -H \"Authorization: Bearer <token>\" https://your-api-domain.com/merchants"
echo ""

echo -e "${BLUE}📚 Documentation${NC}"
echo "For more information, see:"
echo "  - SECURITY_HEADERS.md - Detailed implementation guide"
echo "  - SECURITY_VERIFICATION.md - Verification procedures"
echo "  - CORS_CONFIG.md - Quick reference guide"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ Deployment preparation complete                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY REMINDERS:${NC}"
echo "1. Never commit .env files to version control"
echo "2. Use environment variables for sensitive data"
echo "3. Regularly review CORS_ALLOWED_ORIGINS"
echo "4. Monitor logs for failed CORS requests"
echo "5. Keep dependencies updated (npm audit fix)"
echo "6. Test security headers in production immediately after deployment"
echo ""
