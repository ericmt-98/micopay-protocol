# Security Verification Checklist (SEC-21)

This guide provides step-by-step instructions to verify that the CORS and security headers vulnerability has been properly fixed.

## Quick Start Verification (5 minutes)

### 1. Verify Security Headers Are Present

```bash
# Start the API in development
cd apps/api
npm run dev &
sleep 2

# Check for security headers
curl -i http://localhost:3000/health | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|Content-Security-Policy|Referrer-Policy)"
```

**Expected Output:**
```
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
content-security-policy: default-src 'self'; ...
referrer-policy: strict-origin-when-cross-origin
```

**✅ If all headers present**: Security headers are correctly configured

### 2. Verify CORS is No Longer Wildcard

```bash
# Check that wildcard CORS is removed from code
grep -r 'origin: "\*"' apps/api/src/

# Expected: No results (grep returns exit code 1 with no matches)
echo $?  # Should output: 1
```

**✅ If no matches found**: Wildcard CORS successfully removed

### 3. Verify CORS_ALLOWED_ORIGINS Configuration

```bash
# Check config file has CORS parsing
grep -A5 "corsAllowedOrigins" apps/api/src/config.ts

# Should see the parseAllowedOrigins function
```

**Expected Output:**
```typescript
corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, process.env.NODE_ENV),
```

**✅ If found**: CORS origins are properly configured

---

## Detailed Testing (15 minutes)

### Test 1: Verify Helmet Integration

```bash
# Check that helmet is imported and registered
grep -E "(import.*helmet|@fastify/helmet)" apps/api/src/index.ts
grep "app.register(fastifyHelmet" apps/api/src/index.ts

# Should find both
```

**✅ If both found**: Helmet is properly integrated

### Test 2: Test Security Headers with Real Request

```bash
# Start API if not already running
cd apps/api && npm run dev &
sleep 2

# Full headers inspection
curl -s -i http://localhost:3000/health

# Should see in response:
# - Strict-Transport-Security
# - X-Content-Type-Options
# - X-Frame-Options
# - Content-Security-Policy
# - Referrer-Policy
```

**✅ Acceptance Criteria**:
- [ ] Response includes all 5 security headers
- [ ] No error 500 responses
- [ ] Response body is valid JSON

### Test 3: Verify CORS Development Defaults

```bash
# Test preflight request (development should allow localhost)
curl -s -X OPTIONS http://localhost:3000/merchants \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -E "(access-control|< HTTP)"

# Expected: Should see CORS-related headers in response
```

**Expected Headers** (if CORS working):
```
< access-control-allow-origin: ...
< access-control-allow-methods: ...
< access-control-allow-credentials: ...
```

**✅ If headers present**: CORS configuration is active

### Test 4: Test Production Failsafe

```bash
# Simulate production with no CORS_ALLOWED_ORIGINS
NODE_ENV=production CORS_ALLOWED_ORIGINS="" npm start &
sleep 2

# Try CORS request from unauthorized origin
curl -i -X OPTIONS http://localhost:3000/merchants \
  -H "Origin: http://attacker.com" \
  -H "Access-Control-Request-Method: GET"

# Expected: Should NOT see access-control-allow-origin header or see "false"
```

**✅ Acceptance**: No CORS headers for unauthorized origins in production

---

## Code Review Checklist

### Configuration Files

- [ ] `apps/api/src/config.ts`: Check `parseAllowedOrigins()` function exists
- [ ] `apps/api/src/config.ts`: Check `corsAllowedOrigins` is exported in config object
- [ ] `apps/api/.env.example`: Check `CORS_ALLOWED_ORIGINS` documentation added
- [ ] `apps/api/package.json`: Check `@fastify/helmet` dependency added

### Main Application File

- [ ] `apps/api/src/index.ts`: Check `fastifyHelmet` import present
- [ ] `apps/api/src/index.ts`: Check `getCorsOptions()` function exists
- [ ] `apps/api/src/index.ts`: Check `app.register(fastifyHelmet, {...})` call
- [ ] `apps/api/src/index.ts`: Check `app.register(fastifyCors, getCorsOptions())` call
- [ ] `apps/api/src/index.ts`: Check startup logging for security configuration

### Security Headers Configuration

- [ ] Content-Security-Policy includes `default-src 'self'`
- [ ] CSP includes Stellar RPC domains in `connect-src`
- [ ] HSTS includes `max-age=31536000; includeSubDomains; preload`
- [ ] X-Frame-Options set to `DENY`
- [ ] X-Content-Type-Options set to `nosniff`
- [ ] Referrer-Policy set to `strict-origin-when-cross-origin`

### CORS Configuration

- [ ] Development: Localhost (3000, 5173, 127.0.0.1) allowed by default
- [ ] Production: Empty array when `CORS_ALLOWED_ORIGINS` not set
- [ ] Production: Specific origins when `CORS_ALLOWED_ORIGINS` set
- [ ] Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- [ ] Allowed Headers: Content-Type, Authorization
- [ ] Credentials: true

---

## Endpoint Security Verification

### Public Endpoints - No Changes Expected

Test that public endpoints still work:

```bash
# Health check
curl -s http://localhost:3000/health | jq .

# Should see:
# {
#   "status": "ok",
#   "service": "micopay-protocol-api",
#   ...
# }
```

**✅ If response valid**: Public endpoints unaffected

### Authenticated Endpoints - Verify JWT Still Works

```bash
# 1. Get a challenge (no auth required)
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"GBAQ..."}')

CHALLENGE=$(echo $RESPONSE | jq -r '.challenge')
echo "Challenge: $CHALLENGE"

# Should receive a challenge string

# 2. Sign and get token (in real app, must be properly signed)
# For demo with MOCK_STELLAR=true:
SIGNATURE=$(echo -n "$CHALLENGE" | base64)

TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"stellar_address\":\"GBAQ...\",\"challenge\":\"$CHALLENGE\",\"signature\":\"$SIGNATURE\"}" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
else
  echo "✅ Successfully obtained JWT token"
fi

# 3. Use token with authorized request
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/merchants | jq . | head -20
```

**✅ Acceptance Criteria**:
- [ ] Challenge endpoint returns challenge
- [ ] Token endpoint returns JWT
- [ ] Authenticated endpoint accessible with token
- [ ] No CORS errors in browser console (if testing from frontend)

---

## Browser Testing (20 minutes)

### Setup Test HTML

Create a test file at `apps/api/test-cors.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>CORS Security Test</title>
</head>
<body>
  <h1>MicoPay CORS Security Test</h1>
  <div id="results"></div>
  <script>
    const apiUrl = "http://localhost:3000";
    const resultsDiv = document.getElementById("results");

    async function testCors() {
      const tests = [
        { name: "GET /health", method: "GET", url: "/health" },
        { name: "GET /merchants", method: "GET", url: "/merchants" },
        { name: "OPTIONS /merchants", method: "OPTIONS", url: "/merchants" },
      ];

      for (const test of tests) {
        try {
          const response = await fetch(apiUrl + test.url, {
            method: test.method,
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const headers = {};
          ["content-type", "access-control-allow-origin", "x-frame-options"].forEach(h => {
            headers[h] = response.headers.get(h);
          });

          resultsDiv.innerHTML += `<p>✅ ${test.name}: ${response.status}</p>`;
          resultsDiv.innerHTML += `<pre>${JSON.stringify(headers, null, 2)}</pre>`;
        } catch (error) {
          resultsDiv.innerHTML += `<p>❌ ${test.name}: ${error.message}</p>`;
        }
      }
    }

    testCors();
  </script>
</body>
</html>
```

### Run Browser Test

```bash
# Open in browser
open apps/api/test-cors.html

# Or use curl to simulate:
curl -s http://localhost:3000/health | jq .
```

**✅ Expected**: All endpoints accessible, headers present

---

## Production Deployment Verification

### Pre-Deployment Checklist

```bash
# 1. Verify code changes
git diff HEAD apps/api/src/index.ts | grep -E "(helmet|getCorsOptions)"

# 2. Build the project
npm run build

# 3. Check for TypeScript errors related to security
npm run build 2>&1 | grep -i "helmet\|cors" || echo "No helmet/cors build errors"

# 4. Verify environment configuration
cat apps/api/.env.example | grep CORS_ALLOWED_ORIGINS

# 5. Check dependencies
npm ls @fastify/helmet
```

**✅ All checks should pass**

### Deployment Steps

```bash
# 1. Set environment for production
export NODE_ENV=production
export CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# 2. Install dependencies with production flag
npm ci --production

# 3. Build
npm run build

# 4. Start application
npm start

# 5. Verify security headers (from production URL)
curl -i https://your-api-domain.com/health

# 6. Check logs for security configuration messages
# Should see: "[SECURITY] NODE_ENV: production"
# Should see: "[SECURITY] CORS Allowed Origins: ..."
# Should see: "[SECURITY] Security Headers: Helmet enabled..."
```

**✅ Acceptance Criteria**:
- [ ] All security headers present in response
- [ ] API responds without errors
- [ ] CORS only allows configured origins
- [ ] Logs show security configuration

### Post-Deployment Testing

```bash
# 1. Test from authorized origin
curl -H "Origin: https://yourdomain.com" \
  https://your-api-domain.com/health

# 2. Test from unauthorized origin (should fail CORS)
curl -H "Origin: https://attacker.com" \
  https://your-api-domain.com/health

# 3. Verify security headers in production
curl -s -i https://your-api-domain.com/health | grep -E "(Strict-Transport|X-Content|X-Frame|CSP|Referrer)"

# 4. Check HTTPS is enforced
curl -i http://your-api-domain.com/health
# Should redirect to HTTPS or refuse connection
```

---

## Troubleshooting

### Issue: CORS headers not appearing in response

**Solution**:
```bash
# 1. Check that @fastify/helmet is installed
npm ls @fastify/helmet

# 2. Verify index.ts has helmet import and registration
grep "@fastify/helmet" apps/api/src/index.ts

# 3. Rebuild and restart
npm run build && npm start
```

### Issue: Legitimate requests being blocked

**Solution**:
```bash
# 1. Check CORS_ALLOWED_ORIGINS is set correctly
echo $CORS_ALLOWED_ORIGINS

# 2. Verify origin matches exactly (protocol, domain, port)
# ❌ Wrong: http://localhost:3000 vs https://localhost:3000
# ✅ Correct: exact match

# 3. Add origin to CORS_ALLOWED_ORIGINS
export CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS,https://new-domain.com"
```

### Issue: CSP blocking legitimate resources

**Solution**:
```typescript
// Edit apps/api/src/index.ts
// Add domain to appropriate CSP directive:
connectSrc: ["'self'", "https://your-api.example.com", "https://new-service.example.com"],
```

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Security Headers Present | 6/6 | ⬜ |
| CORS Wildcard Removed | 100% | ⬜ |
| Development CORS Working | Public endpoints | ⬜ |
| Production CORS Restricted | Configured origins only | ⬜ |
| JWT Authentication | Still functional | ⬜ |
| Public Endpoints | Still accessible | ⬜ |
| Tests Passing | All security tests | ⬜ |
| Documentation | Complete | ⬜ |

---

## Sign-Off

### Development Team

- [ ] Code review completed
- [ ] Security headers verified
- [ ] CORS configuration tested
- [ ] All tests passing
- [ ] Documentation reviewed

### Security Team

- [ ] Headers meet security standards
- [ ] CORS configuration appropriate for threat model
- [ ] Production configuration documented
- [ ] Approval for deployment

### Operations Team

- [ ] Environment variables documented
- [ ] Deployment procedure understood
- [ ] Monitoring configured
- [ ] Rollback plan in place

---

## References

- SECURITY_HEADERS.md - Comprehensive security implementation guide
- apps/api/src/index.ts - Main implementation
- apps/api/src/config.ts - Configuration parsing
- apps/api/src/__tests__/security.test.ts - Security header tests
