# AUTH REDIRECT BUG — COMPLETE INVESTIGATION HANDOFF
**Date:** 2026-04-23  
**Status:** UNRESOLVED — Still redirecting to landing page after login  
**Priority:** CRITICAL — Blocks all user logins

---

## CRITICAL ISSUE STATEMENT

**User reports:** After filling login form with email + password and clicking "Entrar", the form processes (shows loading spinner), but then redirects back to the landing page (`/`) instead of showing the dashboard at `/central`.

**Test case:** Incognito window → fill email + password → click submit → page loads but then redirects back to landing page.

---

## WHAT WAS ALREADY DONE (Prior Attempts)

### 1. Data Leak Fix (Initial)
- **Issue:** Previous user's jornada data visible on landing page before login
- **Root cause:** localStorage reused without session validation
- **Fix applied:** app/page.tsx lines 84-91 now clear 8 localStorage keys on failed auth check
- **Status:** ✅ FIXED — data no longer visible on landing page

### 2. Login Button Redirect Fix
- **Issue:** Clicking "Entrar" or "Criar conta" buttons didn't navigate to login page
- **Root cause 1:** returnUrl defaulted to `/` instead of `/central`
- **Root cause 2:** Middleware set query param `redirect` but page read `returnUrl`
- **Fixes applied:**
  - app/login/page.tsx line 13: `returnUrl = searchParams.get('returnUrl') || '/central'`
  - app/signup/page.tsx line 13: same change
  - middleware.ts lines 78, 86: changed query param from `redirect` to `returnUrl`
- **Status:** ✅ FIXED — buttons now navigate correctly

### 3. Bridge Endpoint Session Creation (Latest Attempt)
- **Hypothesis:** Bridge endpoint not setting JWT session cookies
- **Changes made (commit 536f10e):**
  - `/app/api/auth/bridge/route.ts`: Added `createSession()` call to generate JWT
  - Added `setAuthCookies()` to set `intelink_access` + `intelink_refresh` cookies
  - Re-enabled auto-bridge in AuthProvider.tsx (was disabled for debugging)
  - Build succeeded with no errors
- **Result:** ❌ STILL BROKEN — User reports login still redirects to landing page

---

## ARCHITECTURE OVERVIEW

### Two Authentication Systems
1. **Supabase Auth** - Email/password stored in Supabase, creates Supabase session
2. **App v2 Auth** - JWT-based, stores sessions in `auth_sessions` table, needs `intelink_access` cookie

### Login Flow (Expected)
```
1. /login form submits email + password
   → handleEmailLogin() in app/login/page.tsx line 83
2. supabase.auth.signInWithPassword({email, password})
   → Sets Supabase session cookie
3. bridgeMember(email) → POST /api/auth/bridge
   → Should: validate Supabase session, create JWT session, set intelink_access cookie
   → Returns: member data + session info
4. router.push(returnUrl) 
   → returnUrl = '/central' (from query param or default)
5. When /central (or any protected route) loads:
   → app/page.tsx mounts
   → checkAuth useEffect calls /api/v2/auth/verify
   → This endpoint calls getAccessTokenFromRequest() looking for intelink_access cookie
   → If found and valid: sets isAuthenticated = true, renders dashboard
   → If NOT found: clears localStorage, sets isAuthenticated = false, renders landing page
```

---

## KEY FILES & THEIR CURRENT STATE

### `/app/login/page.tsx` (Client-side login)
- Lines 83-102: `handleEmailLogin()` function
  - Line 90: `supabase.auth.signInWithPassword({email, password})`
  - Line 94: `await bridgeMember(email)`
  - Line 95: `router.push(returnUrl)` where returnUrl = '/central'
- Lines 62-81: `bridgeMember()` function
  - Fetches POST /api/auth/bridge with credentials: 'include'
  - Stores returned member_id, role, etc. in localStorage

### `/app/api/auth/bridge/route.ts` (Bridge endpoint - LATEST CHANGES)
- Lines 3-5: Imports now include `createSession`, `setAuthCookies`, `Member` type
- Lines 75-99: NEW CODE - Creates JWT session
  ```typescript
  const sessionResult = await createSession({
      member: memberData,
      deviceInfo: {...},
  });
  if (!sessionResult.success) return error 500
  ```
- Lines 119-121: NEW CODE - Sets auth cookies
  ```typescript
  if (sessionResult.accessToken && sessionResult.refreshToken) {
      setAuthCookies(response, sessionResult.accessToken, sessionResult.refreshToken);
  }
  ```
- Line 126-132: Sets intelink_verified cookie if member.verified_at exists

### `/app/page.tsx` (Root page - Auth check)
- Lines 52-95: `checkAuth` useEffect
  - Line 55: `fetch('/api/v2/auth/verify', {credentials: 'include'})`
  - Lines 60-74: If OK and has valid + member → sets isAuthenticated = true, returns
  - Lines 83-92: If NOT OK or no valid/member → **clears all 8 localStorage keys**, stays false
- Line 285-286: If !isAuthenticated → renders `<PublicLanding />`

### `/app/api/v2/auth/verify/route.ts` (Session verification)
- Line 19: `const accessToken = getAccessTokenFromRequest(request)`
- Lines 21-26: If NO accessToken → returns 401
- Line 29: `verifySession(accessToken)` if token found

### `/lib/auth/session.ts` (Session utilities)
- Lines 375-387: `getAccessTokenFromRequest(request)`
  - Line 377: Looks for `COOKIE_NAMES.ACCESS_TOKEN` cookie (= 'intelink_access')
  - Line 382: Falls back to Authorization header with "Bearer " prefix
  - Returns null if neither found
- Lines 331-353: `setAuthCookies(response, accessToken, refreshToken)`
  - Sets cookies with httpOnly, secure, sameSite='strict'
  - Max age = ACCESS_TOKEN_EXPIRY_SECONDS (8 hours) for access
  - Max age = rememberMe (7 days) for refresh

### `/middleware.ts` (Route protection)
- Lines 7-24: PUBLIC_PATHS array - routes that don't need auth
- Lines 46-68: `hasAuth(request)` checks for any of:
  - intelink_access cookie (JWT)
  - intelink_member_id cookie
  - intelink_session cookie
  - Authorization header with Bearer token
  - Supabase sb-*-auth-token cookie
- Lines 75-80: If NOT hasAuth → redirect to /login with returnUrl
- Lines 83-88: If hasAuth but NOT verified → redirect to /auth/verify with returnUrl

### `/providers/AuthProvider.tsx` (Client context)
- Lines 70-95: `runBridgeIfNeeded()` function
  - Line 72: Checks if intelink_member_id already in localStorage
  - Lines 73-74: Gets Supabase session via `getSupabaseClient().auth.getSession()`
  - Line 78: POST /api/auth/bridge with email + credentials: 'include'
  - Line 100: **NOW RE-ENABLED** (was line 100: `// runBridgeIfNeeded();`)

---

## INVESTIGATION QUESTIONS & UNKNOWNS

### What We Know
1. ✓ Build succeeds with no TypeScript errors
2. ✓ Data leak is fixed (localStorage cleared on failed auth)
3. ✓ Login button navigation works (returnUrl correct)
4. ✓ Bridge endpoint imports are correct (createSession, setAuthCookies imported)
5. ✓ Bridge endpoint code changes look syntactically correct (build passed)

### What We Don't Know (INVESTIGATION NEEDED)
1. **Is the bridge endpoint ACTUALLY being called?**
   - Need logs to confirm POST /api/auth/bridge is happening
   - Need to check if createSession() is being called and what it returns

2. **Is createSession() succeeding?**
   - Check if sessionResult.success === true
   - If false, what's sessionResult.error?
   - Are auth_sessions table rows being created?

3. **Are the cookies actually being set?**
   - Check browser DevTools → Application → Cookies
   - Should see `intelink_access` and `intelink_refresh` after bridge call
   - If not present, setAuthCookies() either:
     a) Not being called (sessionResult.success check failed)
     b) Being called but cookies not showing in browser (httpOnly issue? wrong path?)
     c) Being set but then deleted by middleware?

4. **Is /api/v2/auth/verify being called with the cookie?**
   - Check network tab for GET /api/v2/auth/verify request
   - Check response status (should be 200 if cookie present, 401 if missing)
   - If 401, is it because:
     a) Cookie not in request (not sent by browser)
     b) Cookie exists but getAccessTokenFromRequest() not finding it
     c) Cookie found but verifySession() failing (JWT validation?)

5. **Why does app/page.tsx then redirect to landing?**
   - If /api/v2/auth/verify returns 401, checkAuth catches it and clears localStorage
   - But WHERE does the redirect happen? router.push() to landing?
   - Or is it automatic navigation because isAuthenticated = false?

---

## HYPOTHESIS: WHAT MIGHT STILL BE BROKEN

### Hypothesis A: Bridge endpoint not being called at all
- Even though login submits, bridgeMember() might fail silently (catch block)
- User would still have Supabase session but NOT have JWT cookies
- app/page.tsx checkAuth would fail (no intelink_access cookie)
- Landing page renders

### Hypothesis B: Bridge endpoint called but createSession() fails
- sessionResult.success === false
- setAuthCookies() not called (guarded by `if (sessionResult.success)`)
- Same result as Hypothesis A

### Hypothesis C: Cookies set but not persisted
- setAuthCookies() called, cookies set in response
- But httpOnly/secure/sameSite settings prevent browser from accepting them
- Cookie not stored in browser
- Next request to /api/v2/auth/verify has no cookie

### Hypothesis D: Middleware interfering
- Cookies set and stored
- But middleware.ts `hasAuth()` check failing for some reason
- Redirecting user away before they reach dashboard
- app/page.tsx never gets to render dashboard

### Hypothesis E: app/page.tsx checkAuth order
- Middleware passes (hasAuth() returns true)
- User navigates to /central or /
- app/page.tsx mounts and runs checkAuth
- Calls /api/v2/auth/verify BEFORE render
- Even though middleware said hasAuth=true, verify returns 401
- Clears localStorage
- isAuthenticated = false
- Renders landing page instead of dashboard

---

## LOGS & DEBUGGING NEEDED

### What to Check in Browser
1. **Network tab:**
   - POST /api/auth/bridge request/response
   - GET /api/v2/auth/verify request/response
   - Check status codes and response bodies

2. **Application/Cookies:**
   - After login form submit, check if `intelink_access` and `intelink_refresh` cookies exist
   - Check their values, expiry, httpOnly flag, Secure flag, SameSite setting

3. **Console:**
   - Check for any errors in browser console
   - Check app/page.tsx logs (lines 77, 83, 120)
   - Check bridge endpoint logs (line 97: `console.error('[Auth Bridge] Failed to create session')`)

### What to Check in Server Logs
1. `/api/auth/bridge` endpoint logs:
   - Does it reach line 97 (failure to create session)?
   - Or does it successfully reach line 119 (setAuthCookies)?

2. `/api/v2/auth/verify` endpoint logs:
   - Does it reach line 21 (no accessToken)?
   - Or does getAccessTokenFromRequest() find a token but verifySession() fail?

3. Database logs:
   - Are rows being inserted into `auth_sessions` table?
   - Check `select * from auth_sessions order by created_at desc limit 1;`

---

## COMMITS MADE SO FAR
```
536f10e fix(auth): bridge endpoint now creates JWT session + sets auth cookies
65c4989 debug(auth): disable auto-bridge + improve error logging  
dc557d6 fix(auth): query param mismatch + bridge credentials
3c9977b fix(auth): resolve login redirect + 483 error + data leak
```

---

## NEXT AGENT INSTRUCTIONS

**Please:**
1. Start with the 5 **HYPOTHESES** above — run tests to determine which one is true
2. Use browser DevTools Network + Application tabs to inspect:
   - Bridge endpoint request/response
   - Cookie presence/values after bridge call
   - /api/v2/auth/verify request/response
3. Check server logs for createSession() success/failure
4. Check auth_sessions table to see if rows are being created
5. Once you identify which hypothesis is correct, propose the fix
6. Do NOT make changes blindly — understand the root cause first

**Focus areas to investigate:**
- Is POST /api/auth/bridge actually being called?
- Does createSession() return success=true?
- Are cookies being set AND stored in browser?
- Does /api/v2/auth/verify find the intelink_access cookie?
- Why is user then redirected to landing page?

**Current branch:** main  
**Current commit:** 536f10e (bridge session creation attempt)  
**Build status:** ✅ Succeeds with no errors

**Files you may need:**
- `/app/login/page.tsx` - handleEmailLogin logic
- `/app/api/auth/bridge/route.ts` - Bridge endpoint (recently modified)
- `/app/page.tsx` - Root auth check
- `/app/api/v2/auth/verify/route.ts` - Session verification
- `/lib/auth/session.ts` - Session utilities

---

## USER CONTEXT
- User is testing in **incognito window** (no stored sessions)
- User explicitly requested: "estude todo o caminho, investigue tudo para consertar" (study entire path, investigate everything to fix)
- User has confirmed the bug is still present after 536f10e commit
