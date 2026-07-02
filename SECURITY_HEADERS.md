# Security Headers & CORS Configuration (SEC-21)

## Overview

This document describes the security enhancements made to fix the CORS wildcard vulnerability (SEC-21) and implement comprehensive security headers.

## Vulnerability Details

### Original Issues
- **CORS Wildcard**: `origin: "*"` allowed any domain to access the API
- **Missing Security Headers**: No helmet protection for common attacks (clickjacking, MIME sniffing, XSS, etc.)
- **Credential Handling**: Authenticated endpoints exposed to cross-origin reads despite JWT in Authorization header

### Severity
- **Medium**: Malicious websites could read public API responses (health endpoints, merchant listings) and potentially exploit authenticated endpoints if credentials are mishandled

---

## Changes Made

### 1. CORS Configuration (Secure)

**File**: `apps/api/src/index.ts`

#### New CORS Setup
```typescript
function getCorsOptions() {
  const origins = config.corsAllowedOrigins;

  if (origins.length === 0) {
    if (NODE_ENV === "production") {
      console.warn("[SECURITY] No CORS origins configured in production. CORS requests will be rejected.");
      return {
        origin: false,
        credentials: false,
      };
    }
    // Development defaults to localhost
    return {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    };
  }

  return {
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  };
}
```

#### Key Features
- **Whitelist-based**: Only explicitly configured origins are allowed
- **Fail-safe production**: If no origins configured in production, all CORS requests rejected
- **Development defaults**: Localhost ports 3000 and 5173 allowed in dev mode
- **Credential support**: `credentials: true` allows Authorization headers for authenticated requests

### 2. Security Headers via @fastify/helmet

**File**: `apps/api/src/index.ts`

#### Configuration
```typescript
await app.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://soroban-testnet.stellar.org", "https://soroban.stellar.org"],
    },
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  noSniff: true,
  xssFilter: true,
});
```

#### Security Headers Implemented

| Header | Value | Purpose |
|--------|-------|---------|
| **Strict-Transport-Security (HSTS)** | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year, prevents downgrade attacks |
| **X-Content-Type-Options** | `nosniff` | Prevents MIME sniffing attacks |
| **X-Frame-Options** | `DENY` | Prevents clickjacking by disallowing framing |
| **Content-Security-Policy (CSP)** | Restrictive | Prevents inline scripts, limits resource loading |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Controls referrer information leakage |
| **X-XSS-Protection** | `1; mode=block` | Legacy XSS filter (browser support) |

### 3. Environment Configuration

**File**: `apps/api/src/config.ts`

```typescript
// Parse CORS_ALLOWED_ORIGINS from environment variable
function parseAllowedOrigins(originsEnv: string | undefined, nodeEnv: string | undefined): string[] {
  if (!originsEnv) {
    if (nodeEnv !== "production") {
      return ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];
    }
    return []; // Production: reject all CORS by default
  }
  return originsEnv.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0);
}

export const config = {
  // ... other config
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, process.env.NODE_ENV),
  nodeEnv: process.env.NODE_ENV || "development",
};
```

### 4. Environment Variables

**File**: `apps/api/.env.example`

Added documentation for new CORS setting:

```bash
# CORS Configuration
# Comma-separated list of allowed origins for cross-origin requests
# Development: defaults to http://localhost:3000, http://localhost:5173, http://127.0.0.1:3000, http://127.0.0.1:5173
# Production: MUST be explicitly configured. Example: https://example.com,https://app.example.com
# If not set in production, all CORS requests are rejected (fail-safe behavior)
# CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

### 5. Package Dependencies

**File**: `apps/api/package.json`

Added `@fastify/helmet` dependency:
```json
"@fastify/helmet": "^11.1.1"
```

---

## Usage Examples

### Development (Default Behavior)
```bash
npm run dev
# Automatically allows: http://localhost:3000, http://localhost:5173, http://127.0.0.1:3000, http://127.0.0.1:5173
```

### Production with Single Domain
```bash
CORS_ALLOWED_ORIGINS=https://example.com npm start
```

### Production with Multiple Domains
```bash
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com,https://admin.example.com npm start
```

### Production with No CORS (Fail-Safe)
```bash
npm start
# No CORS_ALLOWED_ORIGINS set → All cross-origin requests rejected
```

---

## Endpoint Analysis

### Public Endpoints (No Auth Required)

| Endpoint | Sensitivity | CORS Risk |
|----------|-----------|-----------|
| `GET /health` | Low | Reduced - response is generic |
| `GET /health/live` | Low | Reduced - response is generic |
| `GET /health/ready` | Low | Reduced - response is generic |
| `GET /merchants` | Medium | **Mitigated** - CORS whitelist applied |
| `GET /merchants/:id` | Medium | **Mitigated** - CORS whitelist applied |

### Authenticated Endpoints (JWT Required)

| Endpoint | Sensitivity | CORS Risk |
|----------|-----------|-----------|
| `POST /auth/challenge` | Medium | **Mitigated** - Can generate challenges, but signature verification prevents token theft |
| `POST /auth/token` | High | **Mitigated** - Requires valid signature + CORS whitelist |
| `POST /merchants/register` | High | **Mitigated** - JWT + CORS whitelist |
| All `/cash/*` endpoints | High | **Mitigated** - JWT + CORS whitelist + rate limit |
| All `/kyc/*` endpoints | High | **Mitigated** - JWT + CORS whitelist (if enabled) |

### Risk Mitigation Summary
1. **JWT Protection**: Authorization header prevents token forgery across domains
2. **CORS Whitelist**: Pre-flight requests fail for unauthorized origins
3. **Credential Control**: `credentials: true` only with approved origins
4. **Rate Limiting**: Further protects against abuse
5. **Security Headers**: Prevents browser-based attacks on the client side

---

## Testing

### Test 1: Verify CORS Rejection for Unauthorized Origins

**Test Setup**: Development environment, CORS_ALLOWED_ORIGINS not set

```bash
# From another domain (should be blocked in production)
curl -H "Origin: http://evil.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/merchants

# Expected: No Access-Control-Allow-Origin header in response (rejected)
```

**Expected Response Headers** (when rejected):
```
(No Access-Control-Allow-Origin header)
```

### Test 2: Verify CORS Allowed for Whitelisted Origins

**Setup**: Production environment, `CORS_ALLOWED_ORIGINS=https://example.com`

```bash
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://api.example.com/merchants

# Expected: Access-Control-Allow-Origin header present
```

**Expected Response Headers** (when allowed):
```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### Test 3: Verify Security Headers Present

```bash
curl -i http://localhost:3000/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'; ...
# Referrer-Policy: strict-origin-when-cross-origin
# X-XSS-Protection: 1; mode=block
```

### Test 4: Verify Authenticated Requests with Valid JWT

```bash
# 1. Get challenge
CHALLENGE=$(curl -s -X POST http://localhost:3000/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"GCBD..."}' | jq -r '.challenge')

# 2. Sign challenge (mock mode for testing)
SIGNATURE=$(echo -n "$CHALLENGE" | base64)

# 3. Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"stellar_address\":\"GCBD...\",\"challenge\":\"$CHALLENGE\",\"signature\":\"$SIGNATURE\"}" | jq -r '.token')

# 4. Use token with whitelisted origin
curl -H "Origin: https://example.com" \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/merchants/register \
     -X POST -H "Content-Type: application/json" \
     -d '{"display_name":"My Store",...}'

# Expected: 201 or appropriate response
```

### Test 5: Verify Credentials Rejected for Non-Whitelisted Origins

```bash
# From non-whitelisted origin with credential request
curl -H "Origin: http://evil.com" \
     -H "Authorization: Bearer <token>" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3000/merchants/register

# Expected: No Access-Control-Allow-Credentials header
```

---

## Deployment Checklist

### Before Going to Production

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ALLOWED_ORIGINS` with your domain(s)
  - [ ] List all frontend domains that need API access
  - [ ] Use HTTPS URLs only
  - [ ] Avoid wildcards (e.g., `*.example.com` not supported; use specific subdomains)
- [ ] Verify all security headers present: `curl -i https://api.example.com/health`
- [ ] Test authentication flow with whitelisted origin
- [ ] Test that non-whitelisted origins are rejected
- [ ] Enable HSTS preload (optional): Register domain at https://hstspreload.org
- [ ] Configure Content-Security-Policy exceptions if needed (embedded resources, external APIs)
- [ ] Review rate limiting settings for your expected traffic
- [ ] Set up monitoring for failed CORS requests (log analysis)
- [ ] Document approved origins for your team

### Monitoring & Maintenance

- Monitor logs for `[SECURITY]` tagged messages
- Track cross-origin request patterns
- Review CSP violations in browser console errors (if applicable)
- Update allowed origins when adding new frontend deployments
- Periodically review security header configuration for new best practices

---

## Security Best Practices

1. **Never use wildcards**: `origin: "*"` is never acceptable for production APIs
2. **HTTPS only**: Use `https://` URLs for production origins
3. **Explicit whitelisting**: Only allow origins you explicitly control
4. **Regular audits**: Review CORS configuration monthly
5. **Separate staging**: Use different `CORS_ALLOWED_ORIGINS` for staging vs. production
6. **Credential handling**: Always transmit tokens via secure methods (Authorization header, not cookies)
7. **CSP violations**: Monitor and lock down CSP further if violations occur
8. **Rate limiting**: Combine with CORS to prevent abuse
9. **Logging**: Enable request logging to track CORS rejections

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Disable CORS restrictions (development fallback)
   ```bash
   unset CORS_ALLOWED_ORIGINS
   npm start  # Will allow localhost only
   ```

2. **Temporary**: Add additional origins if legitimate requests blocked
   ```bash
   CORS_ALLOWED_ORIGINS=https://example.com,https://staging.example.com npm start
   ```

3. **Debug**: Check browser console for CSP violations or CORS errors
   ```javascript
   // Browser console
   fetch('http://api.example.com/merchants')  // See CORS error details
   ```

---

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS](https://owasp.org/www-community/Vulnerability_CORS)
- [Fastify Helmet](https://github.com/fastify/fastify-helmet)
- [Fastify CORS](https://github.com/fastify/fastify-cors)
- [HSTS Spec](https://tools.ietf.org/html/rfc6797)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## Acceptance Criteria Met

✅ CORS wildcard removed  
✅ Specific allowed origins configured  
✅ All security headers implemented  
✅ No regression in legitimate API access (JWT still works)  
✅ Security headers verified in responses  
✅ Documentation updated  
✅ Environment configuration documented  
✅ Testing procedures provided  
✅ Deployment checklist provided  
