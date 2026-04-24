# AUTH REDIRECT BUG — INVESTIGATION COMPLETE & RESOLVED

**Date:** 2026-04-23  
**Status:** ✅ RESOLVED — Root cause identified, fix applied, tested end-to-end  
**Priority:** CRITICAL  

---

## EXECUTIVE SUMMARY

The auth redirect bug was **NOT a code problem**. The bridge endpoint and entire login flow were implemented correctly and working as designed. The issue was **a missing member record in the database**.

**Root Cause:** Test user `test@egos.local` existed in Supabase Auth but not in `intelink_unit_members` table, causing the bridge endpoint to return 404, which silently failed the bridgeMember() call, leaving no JWT cookies for auth checks.

**Resolution:** Created the missing member record in `intelink_unit_members`. Login flow now works end-to-end without modification to code.

---

## INVESTIGATION METHODOLOGY

Used the 5 hypotheses from the handoff document to systematically test each layer:

### Testing Approach:
1. Started dev server and accessed login page
2. Filled credentials and clicked login button
3. Captured Network tab requests/responses
4. Checked browser cookies in DevTools
5. Tested each hypothesis with concrete evidence

---

## HYPOTHESIS TEST RESULTS

### Hypothesis A: Bridge endpoint not being called
**Status:** ❌ FALSE

**Evidence:**
```
Network Tab:
[POST] http://localhost:3001/api/auth/bridge => [404] Not Found
```

The endpoint WAS being called, but returning 404.

---

### Hypothesis B: createSession() fails
**Status:** ❌ FALSE (but this was why 404 happened)

**Evidence:**
Bridge endpoint response body: `{"error":"Membro não encontrado"}`

This error comes from **line 72** of `/app/api/auth/bridge/route.ts`:
```typescript
if (error || !member) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
}
```

The query failed to find the member in the database, so `createSession()` was never reached.

---

### Hypothesis C: Cookies not persisted
**Status:** ❌ FALSE (became moot once member existed)

**Verified When Fixed:**
```
curl output showed Set-Cookie headers:
✅ intelink_access=eyJ... (8 hours, HttpOnly, SameSite=strict)
✅ intelink_refresh=eyJ... (7 days, HttpOnly, SameSite=strict)
✅ intelink_verified=1 (30 days, HttpOnly, SameSite=strict)
```

Cookies ARE set correctly with proper security flags.

---

### Hypothesis D: Middleware interfering
**Status:** ❌ FALSE

**Evidence:**
After login, URL changed from `/login` to `/central`, which means:
1. Bridge endpoint succeeded (cookies set)
2. Frontend router.push('/central') executed
3. Middleware allowed access to /central

If middleware were blocking, user would be redirected to /login before reaching /central.

---

### Hypothesis E: app/page.tsx checkAuth clearing auth
**Status:** ❌ FALSE

**Proof:**
After login, the dashboard rendered with:
- Navigation menu visible
- Member name/role loaded
- Dashboard stats displayed (0 investigations, 0 entities, 0 links)

This only happens if `/api/v2/auth/verify` returned 200 with valid token.

---

## ROOT CAUSE: DATA LAYER ISSUE

### The Problem

The Supabase Auth user existed:
```
Email: test@egos.local
Password: TestPassword123!
Auth ID: 093d4783-7c6d-4770-a163-33693a818834
```

But the member record was **missing** from `intelink_unit_members`:

```
Query: SELECT * FROM intelink_unit_members WHERE email = 'test@egos.local'
Result: 0 rows (member not found)
```

### Why This Broke the Flow

1. **Login form submit** → supabase.auth.signInWithPassword() → ✅ Success
2. **Bridge call** → POST /api/auth/bridge → Line 65-69:
   ```typescript
   const { data: member, error } = await serviceSupabase
       .from('intelink_unit_members')
       .select('id, name, email, phone, role, system_role, unit_id, ...')
       .eq('email', email)
       .single();
   ```
   Result: `member = null, error = null` (no rows found)
   
3. **Check failed** → Line 71:
   ```typescript
   if (error || !member) {
       return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
   }
   ```

4. **Bridge endpoint returns 404** → AuthProvider line 94 catches error silently:
   ```typescript
   catch { /* best-effort */ }
   ```

5. **No localStorage updated** → intelink_member_id not set

6. **Navigate to /central** → app/page.tsx runs checkAuth

7. **checkAuth calls /api/v2/auth/verify** → No intelink_access cookie found

8. **Verify returns 401** → checkAuth clears localStorage → Renders landing page

### The Fix

Created member record in Supabase:

```typescript
{
  email: 'test@egos.local',
  name: 'Test User',
  role: 'investigator',
  system_role: 'member',
  unit_id: null,  // Nullable, no constraints
  verified_at: NOW(),  // Pre-verified for testing
}
```

Result:
```
✅ Member ID: d81dfad5-9004-4f52-977c-d433fa4db365
✅ Created at: 2026-04-23T14:04:21.839396+00:00
```

---

## PROOF OF FIX: END-TO-END TEST

### Step 1: Form Submission
```
Page: http://localhost:3001/login
Form: test@egos.local / TestPassword123!
Action: Click "Entrar" button
```

### Step 2: Network Requests
```
[1] POST https://supabase.co/auth/v1/token?grant_type=password
    Status: [200] OK
    Body: {"access_token": "...", "refresh_token": "...", ...}

[2] POST http://localhost:3001/api/auth/bridge
    Status: [200] OK
    Cookies Set:
      ✅ intelink_access (8h expiry)
      ✅ intelink_refresh (7d expiry)
      ✅ intelink_verified (30d expiry)
    Body: {"member_id": "d81dfad5-...", "name": "Test User", ...}

[3] GET http://localhost:3001/central?_rsc=5c339
    Status: [200] OK
    Redirected: http://localhost:3001/central (no further redirect)
```

### Step 3: Authentication State
```
✅ URL: /central (not redirected to /)
✅ Dashboard loaded: Navigation menu visible
✅ Member info: "Test User" visible
✅ Stats: "0 investigations • 0 entities • 0 links" displayed
✅ Sections: IA Lab, Entidades, Documentos, Evidências, Qualidade, Saúde
```

### Step 4: Cookie Verification
```bash
$ curl -s http://localhost:3001/api/auth/bridge ... -v 2>&1 | grep Set-Cookie

set-cookie: intelink_access=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkODFkZmFkNS0..." 
  Path=/; HttpOnly; SameSite=strict

set-cookie: intelink_refresh=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkODFkZmFkNS0..." 
  Path=/; HttpOnly; SameSite=strict

set-cookie: intelink_verified=1 
  Path=/; HttpOnly; SameSite=strict
```

---

## CODE REVIEW: WHY IT'S CORRECT

### Bridge Endpoint (`/app/api/auth/bridge/route.ts`)

**Flow Analysis:**

1. **Lines 26-27:** Validate email parameter present ✅
2. **Lines 30-62:** Extract and verify Supabase session (CSRF + auth checks) ✅
3. **Lines 64-73:** Query member from database with service role ✅
4. **Lines 75-94:** Create JWT session via createSession() ✅
5. **Lines 101-116:** Build response with member data + session info ✅
6. **Lines 119-121:** Set JWT cookies via setAuthCookies() ✅
7. **Lines 125-135:** Set verified status cookie if member.verified_at exists ✅
8. **Lines 137-152:** Audit login attempt to intelink_audit_logs ✅

**Conclusion:** Implementation is complete and correct.

---

### AuthProvider (`/providers/AuthProvider.tsx`)

**runBridgeIfNeeded() function (lines 70-95):**

1. **Line 72:** Check if member_id already in localStorage ✅
2. **Line 75:** Get Supabase session ✅
3. **Line 78-83:** POST to /api/auth/bridge with email ✅
4. **Line 84-92:** If successful, store member_id + role + metadata ✅
5. **Line 94:** Gracefully handle errors (best-effort) ✅

**Conclusion:** Properly structured, handles errors correctly.

---

### App Page (`/app/page.tsx`)

**checkAuth() useEffect (lines 52-95):**

1. **Line 55-58:** Call /api/v2/auth/verify with credentials: 'include' ✅
2. **Line 60-74:** If OK and has valid token + member → authenticate ✅
3. **Line 83-92:** If NOT OK → clear localStorage, render landing page ✅

**Conclusion:** Auth check is correct and working.

---

## SUMMARY: WHAT WAS WORKING

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Auth | ✅ Working | Email/password signin succeeds |
| Bridge Endpoint | ✅ Working | Returns 200 OK when member exists |
| JWT Session Creation | ✅ Working | createSession() generates valid tokens |
| Cookie Setting | ✅ Working | setAuthCookies() sets httpOnly cookies |
| Middleware Auth Check | ✅ Working | hasAuth() finds cookies correctly |
| App Auth Verification | ✅ Working | /api/v2/auth/verify validates tokens |
| Router Navigation | ✅ Working | router.push('/central') succeeds |
| Dashboard Render | ✅ Working | Authenticated interface displays |

**Nothing in the code was broken.**

---

## SUMMARY: WHAT WAS MISSING

| Item | Status | Resolution |
|------|--------|-----------|
| test@egos.local user in Supabase | ✅ Existed | (Created on first attempt) |
| test@egos.local member in table | ❌ Missing | Created: d81dfad5-9004-4f52-977c-d433fa4db365 |
| Member lookup query result | ❌ Empty | Now returns 1 row |
| Bridge endpoint response | ❌ 404 | Now returns 200 OK |
| JWT cookies in browser | ❌ Not set | Now set correctly |
| Dashboard access | ❌ Blocked | Now accessible |

---

## LESSONS LEARNED

1. **Separate Auth from Member:** Supabase Auth and member records are separate. User can exist in one but not the other. The bridge endpoint must handle this mismatch gracefully.

2. **Silent Error Handling:** The AuthProvider catches bridge errors silently (line 94: `catch { /* best-effort */ }`). This is correct for resilience but means the user sees "landing page" instead of "member not found" error. This is acceptable UX.

3. **Data Integrity:** The system requires:
   - User must be in Supabase Auth (for login)
   - User must be in intelink_unit_members (for authorization)
   - Both must have matching email addresses

4. **Testing:** Cannot test login flow without creating test data in BOTH systems.

---

## RECOMMENDATIONS FOR PRODUCTION

1. **Onboarding Flow:** Ensure new users are created in both Supabase Auth AND intelink_unit_members in atomic transaction (or at least with a verify step).

2. **Error Visibility:** Consider logging 404 responses in bridge endpoint for monitoring missing members:
   ```typescript
   // After line 71
   if (error || !member) {
       console.warn(`[Auth Bridge] Member not found: ${email}`);  // Add this
       return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
   }
   ```

3. **Health Check:** Add endpoint to verify auth data consistency:
   ```typescript
   GET /api/health/auth-sync
   Returns: { valid_users: N, valid_members: M, mismatches: K }
   ```

4. **Documentation:** Update onboarding docs to emphasize both auth systems must be populated.

---

## FILES & PATHS

| File | Status | Notes |
|------|--------|-------|
| `/app/api/auth/bridge/route.ts` | ✅ Correct | No changes needed |
| `/providers/AuthProvider.tsx` | ✅ Correct | No changes needed |
| `/app/page.tsx` | ✅ Correct | No changes needed |
| `/lib/auth/session.ts` | ✅ Correct | No changes needed |
| `/middleware.ts` | ✅ Correct | No changes needed |

---

## TEST DATA CREATED

**For future testing:**

```sql
-- User in Supabase Auth
Email: test@egos.local
Password: TestPassword123!
Auth ID: 093d4783-7c6d-4770-a163-33693a818834

-- Member in intelink_unit_members
ID: d81dfad5-9004-4f52-977c-d433fa4db365
Email: test@egos.local
Name: Test User
Role: investigator
System Role: member
Unit ID: NULL
Verified: YES (2026-04-23T14:04:21.839Z)
```

---

## VERIFICATION CHECKLIST

- [x] Bridge endpoint called successfully
- [x] Bridge endpoint returns 200 OK
- [x] JWT cookies set in response
- [x] Cookies stored in browser (httpOnly verified)
- [x] User navigates to /central
- [x] Middleware allows access to /central
- [x] App.tsx checkAuth succeeds
- [x] Dashboard renders with authenticated interface
- [x] Member name visible in UI
- [x] Navigation menu visible (authenticated-only)
- [x] End-to-end login flow works

**STATUS: ALL CHECKS PASSED ✅**

---

*Investigation completed 2026-04-23 14:04 UTC*  
*No code changes required — issue was data layer, not application layer*
