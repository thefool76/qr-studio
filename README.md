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

`TEST-...` keys are accepted only during development builds.

### One-time purchase setup (`$29`)

1. In Polar, create a Product for `QR Code Studio Pro` priced at `USD 29.99` as a one-time purchase.
2. Enable license key issuance for the product.
3. Copy the Polar checkout URL for this product and set it as `VITE_POLAR_CHECKOUT_URL`.
4. Keep plugin feature gating in frontend (`isPro`) and validate license keys via your backend endpoint.
5. In your verify backend, map valid license keys for this product to `{ valid: true, plan: "pro" }`.

## Verify endpoint deployment

- Use [`api/verify.ts`](/Users/kami/Documents/qr-code-generator/api/verify.ts) as the serverless stub.
- For production, set:
  - `POLAR_ORGANIZATION_ID` (required)
  - `POLAR_ACCESS_TOKEN` (optional but recommended for private validation path)
- Endpoint behavior:
  - With both vars: uses Polar private validate API.
  - With only `POLAR_ORGANIZATION_ID`: uses Polar public validation API.
  - With neither: falls back to local demo validation (`POLAR-...` keys).
- Never ship Polar secret keys in plugin frontend code.

## Test checklist

1. Canvas mode plugin launch works in Framer via Open Development Plugin.
2. Free vs Pro gating works for content types, gradient, logo, and SVG export.
3. Presets apply correctly, and Pro presets prompt unlock in Free mode.
4. PNG exports work (Free max 512px, Pro up to 4096px).
5. SVG export works only for Pro.
6. Scan-safety warnings update with low contrast and low quiet zone settings.
7. License verify/deactivate state persists across plugin reloads.
8. UI is readable in both `light` and `dark` Framer themes.

## Browser/platform checks

- Framer web app in latest Chrome and Safari.
- Clipboard PNG copy fallback behavior where `ClipboardItem` is unavailable.
