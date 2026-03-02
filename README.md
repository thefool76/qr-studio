# QR Code Studio (Framer Plugin)

Production-ready Framer plugin for styled QR generation with presets, scan-safety checks, export controls, and Polar-powered Pro licensing.

## Run in development

1. Install dependencies:

```bash
npm install
```

2. Start the plugin dev server:

```bash
npm run dev
```

3. In Framer desktop/web app, open your project and use **Plugins -> Open Development Plugin**.

## Build and pack for publishing

```bash
npm run pack
```

This creates `plugin.zip` for upload in Framer's plugin publishing flow.

## Polar configuration

Set environment variables before running/building:

- `VITE_POLAR_CHECKOUT_URL`: Polar checkout URL opened by the Unlock dialog (set this to your `$29 one-time` product checkout link).
- `VITE_VERIFY_ENDPOINT`: Server endpoint used to validate license keys (`/api/verify` by default).
- `VITE_LICENSE_VERIFY_TIMEOUT_MS` (optional): client-side verify timeout in milliseconds. Default: `900`.
- `VITE_TEST_VALID_LICENSE_KEY` (optional): used by diagnostics utility.
- `VITE_TEST_EXPIRED_LICENSE_KEY` (optional): used by diagnostics utility.

### One-time purchase setup (`$29`)

1. In Polar, create a Product for `QR Code Studio Pro` priced at `USD 29.99` as a one-time purchase.
2. Enable license key issuance for the product.
3. Copy the Polar checkout URL for this product and set it as `VITE_POLAR_CHECKOUT_URL`.
4. Keep plugin feature gating in frontend (`isPro`) and validate license keys via your backend endpoint.
5. In your verify backend, map valid license keys for this product to `{ valid: true, plan: "pro" }`.

## Verify endpoint deployment

- Use [`api/verify.ts`](/Users/kami/Documents/qr-code-generator/api/verify.ts) as the serverless stub.
- For production, set:
  - `POLAR_API_KEY` or `POLAR_ACCESS_TOKEN` (required; server-side only)
  - `POLAR_ORGANIZATION_ID` (required for `license-keys/validate`)
  - `POLAR_VERIFY_TIMEOUT_MS` (optional): timeout for Polar API request in milliseconds. Default: `1200`.
- Endpoint behavior:
  - Calls `POST https://api.polar.sh/v1/license-keys/validate` with `Authorization: Bearer $POLAR_API_KEY`.
  - Sends `{ key, organization_id }` in JSON body.
  - Returns normalized statuses (`active`, `expired`, `invalid`) for plugin UI handling.
- Never ship Polar secret keys in plugin frontend code. Only your serverless function should read `POLAR_API_KEY`.

## Reviewer key

- Hardcoded fallback key: `FRAMER-REVIEW-PRO-2026`.
- If this key is entered, Pro unlocks immediately without an API call.

## Test checklist

1. Canvas mode plugin launch works in Framer via Open Development Plugin.
2. Free vs Pro gating works for content types, gradient, logo, and SVG export.
3. Presets apply correctly, and Pro presets prompt unlock in Free mode.
4. PNG exports work (Free max 512px, Pro up to 4096px).
5. SVG export works only for Pro.
6. Scan-safety warnings update with low contrast and low quiet zone settings.
7. License verify/deactivate state persists across plugin reloads.
8. UI is readable in both `light` and `dark` Framer themes.
9. Open browser devtools and run `window.runLicenseActivationDiagnostics()` to log:
   - license valid response (when `VITE_TEST_VALID_LICENSE_KEY` is set),
   - invalid response,
   - expired response (when `VITE_TEST_EXPIRED_LICENSE_KEY` is set),
   - network error response.

## Browser/platform checks

- Framer web app in latest Chrome and Safari.
- Clipboard PNG copy fallback behavior where `ClipboardItem` is unavailable.
