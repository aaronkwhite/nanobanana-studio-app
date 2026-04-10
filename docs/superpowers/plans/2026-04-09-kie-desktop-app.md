# KIE Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Tauri/SvelteKit desktop app to authenticate users via PocketBase, display and manage a credit balance, and route all generation requests through the Hono backend instead of calling Gemini directly.

**Architecture:** The Rust Tauri backend gains new commands for auth (token storage/retrieval via OS keychain) and HTTP calls to the Hono API. The SvelteKit frontend gains a login screen, credit balance display, model picker, processing mode toggle, and cost preview. Existing Gemini-specific commands are removed.

**Tech Stack:** Tauri (Rust), SvelteKit (TypeScript), `tauri-plugin-store` for secure token storage, existing SQLite DB kept for local job history cache.

**Prerequisite:** The backend from `docs/superpowers/plans/2026-04-09-kie-backend.md` must be running and accessible. Set `BACKEND_URL` (e.g., `http://localhost:3000`) in a `.env` file at the repo root for local dev.

---

## File Structure

### New files
```
src-tauri/src/commands/auth.rs       ← login, logout, get_token, refresh_token
src-tauri/src/commands/api.rs        ← HTTP calls to Hono API (generate, jobs, credits)
src/lib/stores/auth.ts               ← auth state (token, user id, logged-in boolean)
src/lib/stores/credits.ts            ← credit balance store
src/routes/login/+page.svelte        ← login/signup screen
src/lib/components/CreditBalance.svelte   ← header credit display + buy button
src/lib/components/ModelPicker.svelte     ← model + resolution selector
src/lib/components/ModePicker.svelte      ← real-time vs batch toggle
src/lib/components/CostPreview.svelte     ← "this will use X credits" display
```

### Modified files
```
src-tauri/src/commands/mod.rs        ← register new commands, remove Gemini commands
src-tauri/src/lib.rs                 ← update invoke_handler registration
src-tauri/src/models.rs              ← add new request/response types
src/lib/types/index.ts               ← add new types, remove Gemini types
src/lib/utils/commands.ts            ← replace Gemini invoke calls with API calls
src/lib/stores/jobs.ts               ← update polling to use new job schema
src/lib/stores/config.ts             ← replace API key state with auth state
src/routes/+layout.svelte            ← add auth guard, credit balance in header
src/routes/+page.svelte              ← add model picker, mode toggle, cost preview
```

### Deleted files (after replacement is working)
```
src-tauri/src/commands/batch.rs      ← replaced by api.rs
src-tauri/src/commands/config.rs     ← replaced by auth.rs
```

---

## Task 1: New Rust Types for API Communication

**Files:**
- Modify: `src-tauri/src/models.rs`

- [ ] **Step 1: Add new types to models.rs**

Open `src-tauri/src/models.rs`. Add these at the end of the file:

```rust
// Auth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub token: String,
    pub user_id: String,
}

// API generation request (sent to Hono backend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiGenerateRequest {
    pub model: String,
    pub resolution: String,
    pub prompts: Vec<String>,
    pub aspect_ratio: Option<String>,
    pub mode: String,  // "realtime" | "batch"
}

// API job response (from Hono backend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJob {
    pub id: String,
    pub status: String,
    pub mode: String,
    pub model: String,
    pub credits_cost: i32,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJobItem {
    pub id: String,
    pub job_id: String,
    pub status: String,
    pub prompt: String,
    pub resolution: String,
    pub output_url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiJobWithItems {
    pub job: ApiJob,
    pub items: Vec<ApiJobItem>,
}

// Credit balance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditBalance {
    pub balance: i32,
}

// Stripe checkout session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseRequest {
    pub pack: String,  // "starter" | "standard" | "pro"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSession {
    pub url: String,
}
```

- [ ] **Step 2: Build to check for errors**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/models.rs
git commit -m "feat(tauri): add API and auth model types"
```

---

## Task 2: Auth Commands (Login, Logout, Token Storage)

**Files:**
- Create: `src-tauri/src/commands/auth.rs`

Tauri's `tauri-plugin-store` provides a key-value store backed by the OS. Use it to persist the auth token between app launches.

- [ ] **Step 1: Add tauri-plugin-store to Cargo.toml**

Open `src-tauri/Cargo.toml`. Add to `[dependencies]`:

```toml
tauri-plugin-store = "2"
reqwest = { version = "0.12", features = ["json"] }
```

- [ ] **Step 2: Install**

```bash
cd src-tauri && cargo fetch
```

- [ ] **Step 3: Create src-tauri/src/commands/auth.rs**

```rust
// src-tauri/src/commands/auth.rs
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use crate::models::{AuthState, LoginRequest};

const STORE_PATH: &str = "auth.json";
const TOKEN_KEY: &str = "token";
const USER_ID_KEY: &str = "user_id";

fn get_pocketbase_url() -> String {
    std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string())
}

#[tauri::command]
pub async fn login(app: AppHandle, request: LoginRequest) -> Result<AuthState, String> {
    let url = format!(
        "{}/api/collections/users/auth-with-password",
        get_pocketbase_url()
    );

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&serde_json::json!({
            "identity": request.email,
            "password": request.password,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Login failed: {}", body));
    }

    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    let token = body["token"].as_str().ok_or("No token in response")?.to_string();
    let user_id = body["record"]["id"].as_str().ok_or("No user id in response")?.to_string();

    // Persist token
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(TOKEN_KEY, Value::String(token.clone()));
    store.set(USER_ID_KEY, Value::String(user_id.clone()));
    store.save().map_err(|e| e.to_string())?;

    Ok(AuthState { token, user_id })
}

#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.delete(TOKEN_KEY);
    store.delete(USER_ID_KEY);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_auth_state(app: AppHandle) -> Result<Option<AuthState>, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let token = store.get(TOKEN_KEY).and_then(|v| v.as_str().map(|s| s.to_string()));
    let user_id = store.get(USER_ID_KEY).and_then(|v| v.as_str().map(|s| s.to_string()));

    match (token, user_id) {
        (Some(token), Some(user_id)) => Ok(Some(AuthState { token, user_id })),
        _ => Ok(None),
    }
}
```

- [ ] **Step 4: Register the plugin in src-tauri/src/lib.rs**

In `lib.rs`, add `.plugin(tauri_plugin_store::Builder::default().build())` to the plugin chain:

```rust
// In the .plugin() chain, add:
.plugin(tauri_plugin_store::Builder::default().build())
```

Also add `mod commands;` if not already `pub use`d, and add `auth` to the commands module.

- [ ] **Step 5: Add auth commands to mod.rs**

Open `src-tauri/src/commands/mod.rs`. Add:

```rust
pub mod auth;
pub use auth::{login, logout, get_auth_state};
```

- [ ] **Step 6: Register commands in lib.rs invoke_handler**

In `src-tauri/src/lib.rs`, add to `tauri::generate_handler![]`:

```rust
commands::login,
commands::logout,
commands::get_auth_state,
```

- [ ] **Step 7: Build to check for errors**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/commands/auth.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat(tauri): add auth commands with secure token storage"
```

---

## Task 3: API Commands (Generate, Jobs, Credits)

**Files:**
- Create: `src-tauri/src/commands/api.rs`

These commands make HTTP requests to the Hono backend using the stored auth token.

- [ ] **Step 1: Create src-tauri/src/commands/api.rs**

```rust
// src-tauri/src/commands/api.rs
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::models::{
    ApiGenerateRequest, ApiJobWithItems, CreditBalance, PurchaseRequest, CheckoutSession,
};

const STORE_PATH: &str = "auth.json";

fn get_backend_url() -> String {
    std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

async fn get_token(app: &AppHandle) -> Result<String, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store
        .get("token")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "Not authenticated".to_string())
}

fn client() -> reqwest::Client {
    reqwest::Client::new()
}

#[tauri::command]
pub async fn api_generate(app: AppHandle, request: ApiGenerateRequest) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/generate", get_backend_url());

    let res = client()
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Generate failed: {}", body));
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_generate_batch(app: AppHandle, request: ApiGenerateRequest) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/generate/batch", get_backend_url());

    let res = client()
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Batch generate failed: {}", body));
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_get_job(app: AppHandle, id: String) -> Result<ApiJobWithItems, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/jobs/{}", get_backend_url(), id);

    let res = client()
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Job not found: {}", id));
    }

    res.json::<ApiJobWithItems>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_get_balance(app: AppHandle) -> Result<CreditBalance, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/credits/balance", get_backend_url());

    let res = client()
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.json::<CreditBalance>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_purchase_credits(app: AppHandle, request: PurchaseRequest) -> Result<CheckoutSession, String> {
    let token = get_token(&app).await?;
    let url = format!("{}/api/credits/purchase", get_backend_url());

    let res = client()
        .post(&url)
        .bearer_auth(&token)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Purchase failed: {}", body));
    }

    res.json::<CheckoutSession>().await.map_err(|e| e.to_string())
}
```

- [ ] **Step 2: Register in commands/mod.rs**

Append to `src-tauri/src/commands/mod.rs`:

```rust
pub mod api;
pub use api::{api_generate, api_generate_batch, api_get_job, api_get_balance, api_purchase_credits};
```

- [ ] **Step 3: Add to invoke_handler in lib.rs**

Add to `tauri::generate_handler![]` in `src-tauri/src/lib.rs`:

```rust
commands::api_generate,
commands::api_generate_batch,
commands::api_get_job,
commands::api_get_balance,
commands::api_purchase_credits,
```

- [ ] **Step 4: Build to check**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/api.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat(tauri): add API commands for generate, jobs, credits"
```

---

## Task 4: TypeScript Types + Commands Wrappers

**Files:**
- Modify: `src/lib/types/index.ts`
- Modify: `src/lib/utils/commands.ts`

- [ ] **Step 1: Add new types to src/lib/types/index.ts**

Append to the end of `src/lib/types/index.ts`:

```typescript
// Auth
export interface AuthState {
  token: string;
  user_id: string;
}

// API types (from Hono backend)
export type ApiJobStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type ProcessingMode = 'realtime' | 'batch';
export type KieModel = 'nano-banana-pro' | '4o-image' | 'flux-kontext';

export interface ApiJob {
  id: string;
  status: ApiJobStatus;
  mode: ProcessingMode;
  model: KieModel;
  credits_cost: number;
  created: string;
  updated: string;
}

export interface ApiJobItem {
  id: string;
  job_id: string;
  status: ApiJobStatus;
  prompt: string;
  resolution: OutputSize;
  output_url: string | null;
  error: string | null;
}

export interface ApiJobWithItems {
  job: ApiJob;
  items: ApiJobItem[];
}

export interface ApiGenerateRequest {
  model: KieModel;
  resolution: OutputSize;
  prompts: string[];
  aspect_ratio?: AspectRatio;
  mode: ProcessingMode;
}

export interface CreditBalance {
  balance: number;
}

export interface CheckoutSession {
  url: string;
}

// Credit pack options shown in UI
export const KIE_MODELS: Record<KieModel, { label: string; description: string }> = {
  'nano-banana-pro': { label: 'Nano Banana Pro', description: 'Gemini 3.0 Pro — default' },
  '4o-image':        { label: '4o Image', description: 'GPT-4o image generation' },
  'flux-kontext':    { label: 'Flux.1 Kontext', description: 'Flux image generation' },
};

export const CREDIT_COSTS_UI: Record<KieModel, Record<OutputSize, number>> = {
  'nano-banana-pro': { '1K': 1, '2K': 2, '4K': 3 },
  '4o-image':        { '1K': 2, '2K': 3, '4K': 4 },
  'flux-kontext':    { '1K': 2, '2K': 3, '4K': 4 },
};

export const BATCH_DISCOUNT_UI = 0.8;

export function estimateCreditCost(
  model: KieModel,
  resolution: OutputSize,
  mode: ProcessingMode,
  count: number
): number {
  const unit = CREDIT_COSTS_UI[model][resolution];
  const discount = mode === 'batch' ? BATCH_DISCOUNT_UI : 1;
  return Math.ceil(unit * discount * count);
}

export const CREDIT_PACKS_UI = {
  starter:  { credits: 100,   price: '$4.99',  label: 'Starter' },
  standard: { credits: 500,   price: '$19.99', label: 'Standard' },
  pro:      { credits: 1200,  price: '$39.99', label: 'Pro' },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS_UI;
```

- [ ] **Step 2: Add new commands to src/lib/utils/commands.ts**

Append to `src/lib/utils/commands.ts`:

```typescript
import type {
  AuthState,
  ApiGenerateRequest,
  ApiJobWithItems,
  CreditBalance,
  CheckoutSession,
} from '$lib/types';

// --- Auth ---

export async function login(email: string, password: string): Promise<AuthState> {
  return invoke<AuthState>('login', { request: { email, password } });
}

export async function logout(): Promise<void> {
  return invoke<void>('logout');
}

export async function getAuthState(): Promise<AuthState | null> {
  return invoke<AuthState | null>('get_auth_state');
}

// --- API (Hono backend) ---

export async function apiGenerate(request: ApiGenerateRequest): Promise<ApiJobWithItems> {
  if (request.mode === 'batch') {
    return invoke<ApiJobWithItems>('api_generate_batch', { request });
  }
  return invoke<ApiJobWithItems>('api_generate', { request });
}

export async function apiGetJob(id: string): Promise<ApiJobWithItems> {
  return invoke<ApiJobWithItems>('api_get_job', { id });
}

export async function apiGetBalance(): Promise<CreditBalance> {
  return invoke<CreditBalance>('api_get_balance');
}

export async function apiPurchaseCredits(pack: string): Promise<CheckoutSession> {
  return invoke<CheckoutSession>('api_purchase_credits', { request: { pack } });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/index.ts src/lib/utils/commands.ts
git commit -m "feat(frontend): add new types and command wrappers for auth and API"
```

---

## Task 5: Auth Store + Credits Store

**Files:**
- Create: `src/lib/stores/auth.ts`
- Create: `src/lib/stores/credits.ts`

- [ ] **Step 1: Create src/lib/stores/auth.ts**

```typescript
// src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';
import type { AuthState } from '$lib/types';
import * as cmd from '$lib/utils/commands';

function createAuthStore() {
  const { subscribe, set } = writable<AuthState | null>(null);

  return {
    subscribe,
    async load(): Promise<AuthState | null> {
      const state = await cmd.getAuthState();
      set(state);
      return state;
    },
    async login(email: string, password: string): Promise<void> {
      const state = await cmd.login(email, password);
      set(state);
    },
    async logout(): Promise<void> {
      await cmd.logout();
      set(null);
    },
  };
}

export const auth = createAuthStore();
export const isLoggedIn = derived(auth, ($auth) => $auth !== null);
export const userId = derived(auth, ($auth) => $auth?.user_id ?? null);
```

- [ ] **Step 2: Create src/lib/stores/credits.ts**

```typescript
// src/lib/stores/credits.ts
import { writable } from 'svelte/store';
import * as cmd from '$lib/utils/commands';

function createCreditsStore() {
  const { subscribe, set } = writable<number>(0);

  return {
    subscribe,
    async refresh(): Promise<void> {
      const result = await cmd.apiGetBalance();
      set(result.balance);
    },
    set,
  };
}

export const credits = createCreditsStore();
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/auth.ts src/lib/stores/credits.ts
git commit -m "feat(frontend): add auth and credits stores"
```

---

## Task 6: Login Screen

**Files:**
- Create: `src/routes/login/+page.svelte`

- [ ] **Step 1: Create the login screen**

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { credits } from '$lib/stores/credits';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;
    try {
      await auth.login(email, password);
      await credits.refresh();
      goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-container">
  <h1>Nana Studio</h1>
  <form on:submit|preventDefault={handleLogin}>
    <label>
      Email
      <input type="email" bind:value={email} required autocomplete="email" />
    </label>
    <label>
      Password
      <input type="password" bind:value={password} required autocomplete="current-password" />
    </label>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? 'Logging in…' : 'Log In'}
    </button>
  </form>
</div>

<style>
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1.5rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 320px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }
  input {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text);
  }
  button {
    padding: 0.625rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: default; }
  .error { color: var(--error, red); font-size: 0.875rem; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/login/
git commit -m "feat(frontend): add login screen"
```

---

## Task 7: Auth Guard in Layout + Credit Balance in Header

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/lib/components/CreditBalance.svelte`

- [ ] **Step 1: Create CreditBalance component**

```svelte
<!-- src/lib/components/CreditBalance.svelte -->
<script lang="ts">
  import { credits } from '$lib/stores/credits';
  import { open } from '@tauri-apps/plugin-shell';
  import * as cmd from '$lib/utils/commands';

  let purchasing = false;

  async function buyCredits(pack: 'starter' | 'standard' | 'pro') {
    purchasing = true;
    try {
      const session = await cmd.apiPurchaseCredits(pack);
      await open(session.url);
    } finally {
      purchasing = false;
    }
  }
</script>

<div class="credit-balance">
  <span class="balance" class:low={$credits < 10}>
    {$credits} credits
  </span>
  <button class="buy-btn" on:click={() => buyCredits('standard')} disabled={purchasing}>
    {purchasing ? '…' : '+ Buy'}
  </button>
</div>

<style>
  .credit-balance {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .balance { font-size: 0.875rem; font-weight: 500; }
  .balance.low { color: var(--warning, orange); }
  .buy-btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 2: Add auth guard and credit balance to layout**

Open `src/routes/+layout.svelte`. Read its current content first, then add the auth guard and CreditBalance component. The auth guard redirects to `/login` if no auth state is found on load. Add to the `<script>` block:

```typescript
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { auth, isLoggedIn } from '$lib/stores/auth';
import { credits } from '$lib/stores/credits';
import CreditBalance from '$lib/components/CreditBalance.svelte';

onMount(async () => {
  const state = await auth.load();
  if (!state && $page.url.pathname !== '/login') {
    goto('/login');
    return;
  }
  if (state) {
    await credits.refresh();
  }
});
```

Add `<CreditBalance />` to the header area of the layout template (wherever stats/header info currently appears).

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/CreditBalance.svelte src/routes/+layout.svelte
git commit -m "feat(frontend): add auth guard and credit balance to layout"
```

---

## Task 8: Model Picker + Mode Picker + Cost Preview Components

**Files:**
- Create: `src/lib/components/ModelPicker.svelte`
- Create: `src/lib/components/ModePicker.svelte`
- Create: `src/lib/components/CostPreview.svelte`

- [ ] **Step 1: Create ModelPicker.svelte**

```svelte
<!-- src/lib/components/ModelPicker.svelte -->
<script lang="ts">
  import { KIE_MODELS } from '$lib/types';
  import type { KieModel } from '$lib/types';

  export let value: KieModel = 'nano-banana-pro';
</script>

<div class="model-picker">
  <label>Model</label>
  <div class="options">
    {#each Object.entries(KIE_MODELS) as [id, info]}
      <button
        class="option"
        class:selected={value === id}
        on:click={() => value = id as KieModel}
      >
        <span class="name">{info.label}</span>
        <span class="desc">{info.description}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .model-picker { display: flex; flex-direction: column; gap: 0.5rem; }
  label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .options { display: flex; flex-direction: column; gap: 0.25rem; }
  .option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-secondary);
    cursor: pointer;
    text-align: left;
  }
  .option.selected { border-color: var(--accent); background: var(--accent-subtle, #f0f0ff); }
  .name { font-size: 0.875rem; font-weight: 500; }
  .desc { font-size: 0.75rem; opacity: 0.6; }
</style>
```

- [ ] **Step 2: Create ModePicker.svelte**

```svelte
<!-- src/lib/components/ModePicker.svelte -->
<script lang="ts">
  import type { ProcessingMode } from '$lib/types';

  export let value: ProcessingMode = 'realtime';
</script>

<div class="mode-picker">
  <label>Processing Mode</label>
  <div class="toggle">
    <button class:active={value === 'realtime'} on:click={() => value = 'realtime'}>
      Real-time
    </button>
    <button class:active={value === 'batch'} on:click={() => value = 'batch'}>
      Batch <span class="badge">20% off</span>
    </button>
  </div>
  {#if value === 'batch'}
    <p class="hint">Results may take minutes to hours. Credits are discounted.</p>
  {/if}
</div>

<style>
  .mode-picker { display: flex; flex-direction: column; gap: 0.5rem; }
  label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .toggle { display: flex; gap: 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .toggle button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    background: var(--bg-secondary);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .toggle button.active { background: var(--accent); color: white; }
  .badge {
    font-size: 0.65rem;
    background: var(--success, green);
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-left: 0.25rem;
  }
  .hint { font-size: 0.75rem; opacity: 0.6; margin: 0; }
</style>
```

- [ ] **Step 3: Create CostPreview.svelte**

```svelte
<!-- src/lib/components/CostPreview.svelte -->
<script lang="ts">
  import { estimateCreditCost } from '$lib/types';
  import { credits } from '$lib/stores/credits';
  import type { KieModel, OutputSize, ProcessingMode } from '$lib/types';

  export let model: KieModel;
  export let resolution: OutputSize;
  export let mode: ProcessingMode;
  export let count: number;

  $: cost = estimateCreditCost(model, resolution, mode, count);
  $: canAfford = $credits >= cost;
</script>

<div class="cost-preview" class:cant-afford={!canAfford}>
  <span class="cost">
    This will use <strong>{cost} credit{cost !== 1 ? 's' : ''}</strong>
  </span>
  {#if !canAfford}
    <span class="warning">You have {$credits} credits — not enough.</span>
  {/if}
</div>

<style>
  .cost-preview { font-size: 0.875rem; }
  .cost-preview.cant-afford .cost { color: var(--error, red); }
  .warning { display: block; font-size: 0.8rem; opacity: 0.8; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ModelPicker.svelte src/lib/components/ModePicker.svelte src/lib/components/CostPreview.svelte
git commit -m "feat(frontend): add ModelPicker, ModePicker, and CostPreview components"
```

---

## Task 9: Update Main Page to Use New Components + Backend API

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/stores/jobs.ts`

Read `src/routes/+page.svelte` before editing — it has existing generation form logic.

- [ ] **Step 1: Update the jobs store to use API job schema**

Replace the polling logic in `src/lib/stores/jobs.ts` to use `apiGetJob` instead of the Gemini commands. The new polling loop:

```typescript
// In pollActiveJobs(), replace the per-job update block:
for (const job of activeJobs) {
  try {
    const updated = await cmd.apiGetJob(job.id);
    update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
  } catch (err) {
    console.error(`Failed to poll job ${job.id}:`, err);
  }
}
```

Remove all references to `cmd.pollBatch`, `cmd.downloadResults`, `mapBatchState`, and `GeminiBatchState`. The backend now owns batch polling — the frontend just polls `apiGetJob`.

Also update `addJob` and `loadJobs` to accept `ApiJob` instead of `Job`. Update the store's writable type from `writable<Job[]>` to `writable<ApiJob[]>` and update the `isActiveJob` utility if needed (check `src/lib/utils/jobs.ts`).

- [ ] **Step 2: Add model, mode, and cost preview to the generation form**

In `src/routes/+page.svelte`, add to the `<script>` block:

```typescript
import ModelPicker from '$lib/components/ModelPicker.svelte';
import ModePicker from '$lib/components/ModePicker.svelte';
import CostPreview from '$lib/components/CostPreview.svelte';
import { credits } from '$lib/stores/credits';
import { apiGenerate } from '$lib/utils/commands';
import type { KieModel, ProcessingMode, OutputSize } from '$lib/types';

let selectedModel: KieModel = 'nano-banana-pro';
let selectedMode: ProcessingMode = 'realtime';
```

In the generation form template, add before the submit button:

```svelte
<ModelPicker bind:value={selectedModel} />
<ModePicker bind:value={selectedMode} />
<CostPreview
  model={selectedModel}
  resolution={outputSize}
  mode={selectedMode}
  count={prompts.length}
/>
```

- [ ] **Step 3: Replace the generate submit handler**

Find the existing `handleSubmit` (or equivalent) function that calls `cmd.createT2IJob` or `cmd.createI2IJob`. Replace the API call with:

```typescript
const result = await apiGenerate({
  model: selectedModel,
  resolution: outputSize,
  prompts: prompts,
  aspect_ratio: aspectRatio,
  mode: selectedMode,
});
jobs.addJob(result.job);
await credits.refresh();  // update balance after deduction
```

- [ ] **Step 4: Build and test the app**

```bash
npm run tauri dev
```

Expected: app launches → shows login screen → after login, shows main UI with model picker, mode picker, credit balance in header, cost preview before submitting.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte src/lib/stores/jobs.ts
git commit -m "feat(frontend): wire up new generation form with model/mode/cost and backend API"
```

---

## Task 10: Cleanup — Remove Gemini Commands

Only do this after Task 9 is working end-to-end.

**Files:**
- Delete: `src-tauri/src/commands/batch.rs`
- Delete: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/commands/mod.rs` (remove old exports)
- Modify: `src-tauri/src/lib.rs` (remove old commands from invoke_handler)
- Modify: `src/lib/utils/commands.ts` (remove old Gemini command wrappers)

- [ ] **Step 1: Remove old Rust commands**

From `src-tauri/src/commands/mod.rs`, remove:
- `pub mod batch;` and its `pub use` lines
- `pub mod config;` and its `pub use` lines

From `src-tauri/src/lib.rs` `generate_handler![]`, remove:
- `commands::get_config`
- `commands::save_config`
- `commands::delete_config`
- `commands::submit_batch`
- `commands::poll_batch`
- `commands::download_results`
- `commands::cancel_batch`
- `commands::validate_api_key`

- [ ] **Step 2: Delete the old command files**

```bash
rm src-tauri/src/commands/batch.rs
rm src-tauri/src/commands/config.rs
```

- [ ] **Step 3: Remove old TypeScript command wrappers**

From `src/lib/utils/commands.ts`, remove the `getConfig`, `saveConfig`, `deleteConfig`, `validateApiKey`, `pollBatch`, `downloadResults`, `retryJob` functions (they now live in the backend).

- [ ] **Step 4: Build to confirm clean removal**

```bash
cd src-tauri && cargo check
npm run build
```

Expected: no errors referencing removed commands.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/ src-tauri/src/lib.rs src/lib/utils/commands.ts
git commit -m "chore: remove Gemini-specific commands (replaced by backend API)"
```

---

## Plan 2 Complete

Both plans together implement the full Phases 1–4 spec from `docs/superpowers/specs/2026-04-09-kie-api-commercialization-design.md`.

**What's left after this (Phase 5+):**
- Rebrand (new app name, bundle ID, logo, marketing site)
- VPS deployment of PocketBase + Hono API
- Code signing for distribution builds
- Beta testing with real users
