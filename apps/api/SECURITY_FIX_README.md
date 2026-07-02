# SEC-21: CORS & Security Headers Fix - Implementation Guide

> **Status:** ✅ Complete and Ready for Deployment
> **Severity:** Medium (Critical in production)
> **Last Updated:** June 29, 2026

## Quick Overview

This implementation fixes a critical CORS vulnerability (`origin: "*"`) and adds comprehensive security headers to protect the MicoPay API from cross-origin attacks and browser-based exploits.

### What Was Fixed

| Issue | Before | After |
|-------|--------|-------|
| CORS Policy | Wildcard (`*`) | Whitelist-based with environment config |
| Security Headers | None | 6 headers via @fastify/helmet |
| Production Default | Accepts all origins | Rejects all CORS (fail-safe) |
| Configuration | Hardcoded | Environment variable `CORS_ALLOWED_ORIGINS` |

### Impact Summary

- ✅ **No API breaking changes** - all existing endpoints work exactly the same
- ✅ **Backward compatible** - JWT authentication unchanged
- ✅ **Development-friendly** - localhost automatically allowed
- ✅ **Production-safe** - requires explicit origin configuration

---

## Files Changed

### Core Implementation

```
apps/api/src/
├── index.ts              ← Added Helmet & secure CORS (Lines 1-120)
└── config.ts             ← Added CORS origin parsing (Lines 41-58)

apps/api/
├── package.json          ← Added @fastify/helmet dependency
├── .env.example          ← Added CORS_ALLOWED_ORIGINS documentation
└── src/__tests__/
    └── security.test.ts  ← New security header tests
```

### Documentation (Comprehensive)

```
├── SECURITY_HEADERS.md           ← 2,500 line detailed guide
├── SECURITY_VERIFICATION.md      ← 900 line verification checklist
├── SEC-21-IMPLEMENTATION-SUMMARY.md ← Executive summary
├── CORS_CONFIG.md                ← Developer quick reference
├── SECURITY_FIX_README.md        ← This file
└── apps/api/
    ├── CORS_CONFIG.md            ← Developer reference
    └── deploy-secure.sh          ← Deployment helper script
```

---

## Quick Start (5 minutes)

### For Developers

```bash
# 1. Install dependencies
npm install

# 2. Start development (automatic localhost CORS)
cd apps/api
npm run dev

# 3. Verify security headers
curl -i http://localhost:3000/health | grep -i "strict-transport"

# Expected: strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### For Production Deployment

```bash
# 1. Set environment variables
export NODE_ENV=production
export CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# 2. Build and start
npm run build
npm start

# 3. Verify security headers
curl -i https://api.example.com/health | grep -i "strict-transport"
```

---

## Configuration Guide

### Environment Variable: CORS_ALLOWED_ORIGINS

Controls which domains can access the API.

#### Syntax
```bash
# Comma-separated list of HTTPS URLs
CORS_ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

#### Examples

**Development** (No configuration needed)
```bash
npm run dev
# Auto-allows: localhost:3000, localhost:5173, 127.0.0.1:3000, 127.0.0.1:5173
```

**Production - Single Domain**
```bash
CORS_ALLOWED_ORIGINS=https://app.example.com npm start
```

**Production - Multiple Domains**
```bash
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com npm start
```

**Production - Strict (No CORS)**
```bash
# No CORS_ALLOWED_ORIGINS set = all CORS requests rejected
npm start
```

#### ✅ Do's
- ✅ Use HTTPS URLs in production
- ✅ Include port if needed: `https://app.example.com:8443`
- ✅ List all necessary domains separated by commas
- ✅ One domain per frontend deployment

#### ❌ Don'ts
- ❌ Don't use wildcards: `*.example.com` (not supported)
- ❌ Don't use `http://` in production
- ❌ Don't use `*` (that was the vulnerability!)
- ❌ Don't include domains you don't control

---

## Security Headers Implemented

### What Got Added

```
✅ Strict-Transport-Security (HSTS)
   → Forces HTTPS, prevents downgrade attacks
   → max-age: 1 year, includes subdomains

✅ X-Content-Type-Options (MIME Sniffing)
   → Prevents browser MIME sniffing
   → Value: nosniff

✅ X-Frame-Options (Clickjacking)
   → Prevents framing/embedding of site
   → Value: DENY

✅ Content-Security-Policy (CSP)
   → Restricts inline scripts
   → Allows resources from trusted sources (Stellar RPC)
   → Prevents XSS attacks

✅ Referrer-Policy
   → Controls referrer information leakage
   → Value: strict-origin-when-cross-origin

✅ X-XSS-Protection
   → Legacy browser XSS filter
   → Value: 1; mode=block
```

### Verification

```bash
# Check all headers are present
curl -i http://localhost:3000/health

# Should see these headers:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
# content-security-policy: ...
# referrer-policy: strict-origin-when-cross-origin
# x-xss-protection: 1; mode=block
```

---

## Testing

### Automated Tests

```bash
# Run security header tests
npm run test -- security.test.ts

# Expected: All tests pass ✅
```

### Manual Testing

#### Test 1: Security Headers Present
```bash
curl -i http://localhost:3000/health | grep "strict-transport"
# Expected: Header present
```

#### Test 2: CORS with Development Origin
```bash
curl -H "Origin: http://localhost:3000" \
     http://localhost:3000/merchants

# Expected: 200 OK (in development)
```

#### Test 3: CORS with Unauthorized Origin (Production)
```bash
# Set to production with specific origin only
NODE_ENV=production CORS_ALLOWED_ORIGINS=https://allowed.com npm start &

# Try unauthorized origin
curl -H "Origin: https://attacker.com" \
     http://localhost:3000/merchants

# Expected: No CORS headers in response (request rejected)
```

#### Test 4: Authentication Still Works
```bash
# Get challenge
CHALLENGE=$(curl -s -X POST http://localhost:3000/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"GCBD..."}' | jq -r '.challenge')

# Get token (mock mode for testing)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d "{...}" | jq -r '.token')

# Use authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/merchants

# Expected: 200 OK with merchant data
```

---

## Deployment Checklist

### Before Deployment

- [ ] Read SECURITY_HEADERS.md
- [ ] Review code changes in `index.ts` and `config.ts`
- [ ] Run security tests: `npm run test -- security.test.ts`
- [ ] Verify locally with: `curl -i http://localhost:3000/health`
- [ ] Identify all production frontend domains
- [ ] Prepare `CORS_ALLOWED_ORIGINS` value
- [ ] Test on staging environment

### Deployment

- [ ] Install dependencies: `npm ci`
- [ ] Build: `npm run build`
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ALLOWED_ORIGINS=<your-domains>`
- [ ] Start: `npm start`
- [ ] Verify startup logs show security configuration

### Post-Deployment

- [ ] Verify security headers: `curl -i https://api.example.com/health`
- [ ] Test authorized origin works
- [ ] Test unauthorized origin rejected
- [ ] Verify authentication flow works
- [ ] Monitor logs for errors
- [ ] Enable HSTS preload (optional): https://hstspreload.org

---

## Troubleshooting

### Problem: CORS error in browser console

**Cause:** Frontend origin not in `CORS_ALLOWED_ORIGINS`

**Solution:**
```bash
# Check current configuration
echo $CORS_ALLOWED_ORIGINS

# Add the frontend origin (use exact protocol and port)
export CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS,https://frontend.example.com"
npm start
```

### Problem: "Security headers missing"

**Cause:** Helmet not installed or app not rebuilt

**Solution:**
```bash
npm install  # Install dependencies
npm run build  # Rebuild
npm start
```

### Problem: "All CORS requests blocked in production"

**Expected behavior** when `CORS_ALLOWED_ORIGINS` is not set.

**Solution:**
```bash
# Check if variable is set
echo "CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-<not set>}"

# Set it
export CORS_ALLOWED_ORIGINS=https://your-domain.com
npm start
```

### Problem: API works locally but not in production

**Possible causes:**
1. `NODE_ENV=production` not set
2. HTTPS not enabled
3. Origin doesn't match exactly (protocol, domain, port)

**Solution:**
```bash
# Verify environment
echo "NODE_ENV: ${NODE_ENV:-<not set>}"
echo "CORS_ALLOWED_ORIGINS: $CORS_ALLOWED_ORIGINS"

# Check exact frontend origin in browser Network tab
# Then add exact match to CORS_ALLOWED_ORIGINS
```

---

## Documentation Index

### For Developers
- **Quick Start:** This file (you're reading it)
- **Reference:** `CORS_CONFIG.md` - TL;DR guide
- **Detailed:** `SECURITY_HEADERS.md` - Full implementation

### For DevOps/Operations
- **Deployment:** `deploy-secure.sh` - Helper script
- **Verification:** `SECURITY_VERIFICATION.md` - Complete checklist
- **Summary:** `SEC-21-IMPLEMENTATION-SUMMARY.md` - Executive summary

### Code Reference
- **Main Implementation:** `src/index.ts` (lines 1-120)
- **Configuration:** `src/config.ts` (lines 41-58)
- **Tests:** `src/__tests__/security.test.ts`

---

## Key Points to Remember

1. **Development:** No CORS configuration needed (localhost auto-allowed)
2. **Production:** Must set `CORS_ALLOWED_ORIGINS` explicitly
3. **Security Headers:** All requests include 6 protective headers
4. **No Breaking Changes:** All existing functionality preserved
5. **JWT Still Works:** Authentication completely unaffected
6. **Fail-Safe:** Production defaults to rejecting all CORS

---

## Support & Questions

### Common Questions

**Q: Will this break my existing API calls?**
A: No. JWT authentication is unchanged, and public endpoints remain accessible.

**Q: What if I forget to set CORS_ALLOWED_ORIGINS?**
A: In development, localhost is auto-allowed. In production, CORS requests are rejected (fail-safe).

**Q: Can I use wildcards in CORS_ALLOWED_ORIGINS?**
A: No. You must list specific domains (e.g., `https://app.example.com,https://admin.example.com`).

**Q: What if my frontend domain changes?**
A: Update `CORS_ALLOWED_ORIGINS` and restart the application.

**Q: Does this affect internal API calls?**
A: No. CORS only applies to browser-based cross-origin requests.

**Q: Can I use HTTP in production?**
A: Not recommended. HSTS header enforces HTTPS.

---

## Version History

- **v1.0.0** (June 29, 2026) - Initial implementation
  - Added @fastify/helmet for security headers
  - Replaced CORS wildcard with whitelist configuration
  - Added comprehensive documentation
  - Created security test suite

---

## License & Attribution

Implementation follows OWASP security best practices and uses:
- **@fastify/helmet** - Security headers middleware
- **@fastify/cors** - CORS handling
- Standard HTTP security headers (RFC 6797, CSP, etc.)

---

## Next Steps

1. **Read:** Review `SECURITY_HEADERS.md` for detailed explanation
2. **Test:** Run security tests with `npm run test -- security.test.ts`
3. **Deploy:** Use `deploy-secure.sh` to prepare deployment
4. **Verify:** Check `SECURITY_VERIFICATION.md` after deployment

---

**Questions?** See `SECURITY_HEADERS.md` for comprehensive FAQ and troubleshooting.

**Ready to deploy?** Run `./deploy-secure.sh production "<your-domains>"` for guided deployment.

---

**Security Status:** ✅ FIXED - CORS wildcard removed, security headers implemented, production-safe ✅
