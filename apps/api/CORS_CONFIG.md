# CORS & Security Headers Configuration Guide

Quick reference for configuring CORS and security headers in the MicoPay API.

## TL;DR

### Development
```bash
npm run dev
# Automatically allows: localhost:3000, localhost:5173, 127.0.0.1:3000, 127.0.0.1:5173
```

### Production - Single Domain
```bash
CORS_ALLOWED_ORIGINS=https://example.com npm start
```

### Production - Multiple Domains
```bash
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com npm start
```

---

## Environment Configuration

### Setting CORS_ALLOWED_ORIGINS

In `.env` or as environment variable:

```bash
# Single origin
CORS_ALLOWED_ORIGINS=https://app.example.com

# Multiple origins
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com

# With trailing slash removal (spaces are trimmed)
CORS_ALLOWED_ORIGINS=https://app.example.com, https://admin.example.com

# Empty = reject all CORS requests (production default)
# CORS_ALLOWED_ORIGINS=
```

### Environment Variables Reference

| Variable | Development Default | Production Default | Example |
|----------|------------------|-------------------|---------|
| `CORS_ALLOWED_ORIGINS` | localhost (auto) | Empty (reject all) | `https://example.com` |
| `NODE_ENV` | `development` | `production` | `production` |
| `PORT` | `3000` | `3000` | `8080` |

---

## CORS Behavior by Environment

### Development (NODE_ENV=development)

**Default CORS Configuration:**
- Allowed Origins: `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `http://127.0.0.1:5173`
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Content-Type, Authorization
- Credentials: Allowed

**Use Case:** Local development with frontend on different port

```bash
npm run dev
# Frontend at http://localhost:5173 can access http://localhost:3000/merchants
```

### Production (NODE_ENV=production)

**Default CORS Configuration (No CORS_ALLOWED_ORIGINS):**
- Allowed Origins: None (all CORS requests rejected)
- Fail-safe: Prevents accidental exposure

**Custom CORS Configuration (With CORS_ALLOWED_ORIGINS):**
- Allowed Origins: Only specified domains
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Content-Type, Authorization
- Credentials: Allowed
- Max-Age: 86400 seconds (24 hours)

**Use Case:** Production deployment with specific frontend domain

```bash
CORS_ALLOWED_ORIGINS=https://app.example.com npm start
# Only https://app.example.com can access API
# https://other-domain.com CORS requests rejected
```

---

## Security Headers Included

All responses include these security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | HTTPS enforcement |
| X-Content-Type-Options | nosniff | MIME sniffing prevention |
| X-Frame-Options | DENY | Clickjacking prevention |
| Content-Security-Policy | restrictive | Script injection prevention |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leakage prevention |
| X-XSS-Protection | 1; mode=block | XSS filter (legacy) |

---

## Common Scenarios

### Scenario 1: Local Development

**Goal:** Frontend on localhost:5173, API on localhost:3000

```bash
# No configuration needed
npm run dev

# Frontend can access:
# GET http://localhost:3000/merchants
# POST http://localhost:3000/auth/token
```

### Scenario 2: Production with Single Domain

**Goal:** Deploy API at `api.example.com`, frontend at `app.example.com`

```bash
# .env or deployment environment
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com

npm start
```

**Result:**
- ✅ `https://app.example.com` can access API
- ❌ `https://malicious.com` gets CORS error
- ✅ Security headers present in all responses

### Scenario 3: Production with Multiple Domains

**Goal:** Multiple frontend deployments + CDN

```bash
# .env or deployment environment
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://cdn.example.com

npm start
```

### Scenario 4: Staging vs Production

**Staging:**
```bash
NODE_ENV=staging  # or development
CORS_ALLOWED_ORIGINS=https://staging.example.com

npm start
```

**Production:**
```bash
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com

npm start
```

---

## Testing CORS Configuration

### Test 1: Verify CORS Headers

```bash
# Check that security headers are present
curl -i http://localhost:3000/health | grep -E "(Strict-Transport|X-Content|X-Frame|CSP|Referrer)"

# Expected output:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
# content-security-policy: ...
# referrer-policy: strict-origin-when-cross-origin
```

### Test 2: Verify CORS Origin Acceptance

```bash
# Test allowed origin (localhost in dev)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/merchants -v 2>&1 | grep access-control

# Test unauthorized origin (production)
curl -H "Origin: http://attacker.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/merchants -v 2>&1 | grep access-control
```

### Test 3: Verify Authenticated Requests

```bash
# With valid JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Origin: http://localhost:3000" \
     http://localhost:3000/merchants

# Without token (public endpoint)
curl -H "Origin: http://localhost:3000" \
     http://localhost:3000/merchants
```

---

## Troubleshooting

### Issue: CORS Error in Browser Console

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
1. Check that frontend origin is in `CORS_ALLOWED_ORIGINS`
   ```bash
   echo $CORS_ALLOWED_ORIGINS
   ```
2. Verify protocol matches exactly (http vs https)
3. Verify port matches exactly (localhost:3000 vs localhost:5173)
4. Check that security headers don't block the request

### Issue: Security Headers Missing

**Solution:**
1. Verify `@fastify/helmet` is installed
   ```bash
   npm ls @fastify/helmet
   ```
2. Rebuild the application
   ```bash
   npm run build
   ```
3. Restart the server
   ```bash
   npm start
   ```

### Issue: Legitimate Requests Rejected

**Solution:**
1. Check the exact origin from browser network tab
2. Add to `CORS_ALLOWED_ORIGINS` with correct protocol/port
3. Example:
   ```bash
   # Was: CORS_ALLOWED_ORIGINS=https://app.example.com:3000
   # Fixed: CORS_ALLOWED_ORIGINS=https://app.example.com
   ```

---

## Best Practices

1. **Always use HTTPS in production**
   - HSTS header enforces this
   - Use `https://` URLs in `CORS_ALLOWED_ORIGINS`

2. **Never use wildcards**
   - ❌ `CORS_ALLOWED_ORIGINS=*` (not supported)
   - ❌ `CORS_ALLOWED_ORIGINS=*.example.com` (not supported)
   - ✅ `CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`

3. **List only domains you control**
   - Each origin should be a domain/subdomain you own
   - Remove old origins when shutting down services

4. **Keep CSP strict by default**
   - Only add exceptions if necessary
   - Monitor CSP violations in production

5. **Document your origins**
   - Add comments to .env.example
   - Keep list of approved origins in docs

---

## Configuration Checklist

### Before Development
- [ ] Read this guide
- [ ] Know your frontend domain
- [ ] Know your frontend port

### Before Production Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ALLOWED_ORIGINS` to production domain(s)
- [ ] Verify security headers are present
- [ ] Test CORS with authorized origin
- [ ] Test CORS rejection with unauthorized origin
- [ ] Enable HSTS preload (optional): https://hstspreload.org

### During Production Deployment
- [ ] Log security configuration on startup
- [ ] Monitor for failed CORS requests
- [ ] Monitor for CSP violations (if applicable)

### After Production Deployment
- [ ] Verify security headers in response
- [ ] Test authentication still works
- [ ] Test public endpoints still accessible
- [ ] Monitor error logs for issues

---

## Related Documentation

- Full guide: `../../SECURITY_HEADERS.md`
- Verification: `../../SECURITY_VERIFICATION.md`
- Implementation: `src/index.ts`, `src/config.ts`
- Tests: `src/__tests__/security.test.ts`

---

## Quick Reference: Important Files

```
apps/api/
├── src/
│   ├── index.ts              ← CORS & Helmet setup
│   ├── config.ts             ← CORS origins parsing
│   ├── __tests__/
│   │   └── security.test.ts  ← Security header tests
│   └── routes/
│       ├── health.ts         ← Public endpoint
│       ├── auth.ts           ← Authentication
│       └── merchants.ts      ← Public + authenticated
├── .env.example              ← CORS_ALLOWED_ORIGINS docs
├── CORS_CONFIG.md            ← This file
└── package.json              ← @fastify/helmet dependency
```

---

## Support

For issues or questions:
1. Check SECURITY_HEADERS.md for detailed explanation
2. Run SECURITY_VERIFICATION.md checklist
3. Review security test file: `src/__tests__/security.test.ts`
4. Check application logs for `[SECURITY]` tagged messages
