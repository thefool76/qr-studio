import { LicenseState, LicensePlan } from "./types"

const STORAGE_KEY = "qrStudioLicense"
const RECHECK_DAYS = 7

const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT || "/api/verify"
export const POLAR_CHECKOUT_URL =
    import.meta.env.VITE_POLAR_CHECKOUT_URL || "https://polar.sh/checkout?product=replace-with-your-product"
export const PRO_PRICE_LABEL = "$29.99 one-time"
export const PRO_PLAN_LABEL = "QR Code Studio Pro"

const DEFAULT_LICENSE: LicenseState = {
    valid: false,
    plan: "free",
    key: "",
    lastChecked: null,
    expiresAt: null,
}

interface VerifyResponse {
    valid: boolean
    plan: LicensePlan
    expiresAt?: string
}

export function getStoredLicense(): LicenseState {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LICENSE

    try {
        const parsed = JSON.parse(raw) as Partial<LicenseState>
        return {
            valid: Boolean(parsed.valid),
            plan: parsed.plan === "pro" ? "pro" : "free",
            key: typeof parsed.key === "string" ? parsed.key : "",
            lastChecked: typeof parsed.lastChecked === "string" ? parsed.lastChecked : null,
            expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : null,
        }
    } catch {
        return DEFAULT_LICENSE
    }
}

export function setStoredLicense(state: LicenseState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearStoredLicense(): void {
    localStorage.removeItem(STORAGE_KEY)
}

export function shouldRecheckLicense(license: LicenseState): boolean {
    if (!license.key || !license.lastChecked) return false
    const then = Date.parse(license.lastChecked)
    if (Number.isNaN(then)) return true
    const elapsedMs = Date.now() - then
    return elapsedMs > RECHECK_DAYS * 24 * 60 * 60 * 1000
}

export async function verifyLicenseKey(licenseKey: string): Promise<LicenseState> {
    const trimmed = licenseKey.trim()

    if (!trimmed) {
        return {
            ...DEFAULT_LICENSE,
            key: "",
            lastChecked: new Date().toISOString(),
        }
    }

    if (import.meta.env.DEV && trimmed.startsWith("TEST-")) {
        return {
            valid: true,
            plan: "pro",
            key: trimmed,
            lastChecked: new Date().toISOString(),
            expiresAt: null,
        }
    }

    const response = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: trimmed }),
    })

    if (!response.ok) {
        throw new Error(`Verification failed (${response.status})`)
    }

    const payload = (await response.json()) as VerifyResponse
    const plan = payload.valid && payload.plan === "pro" ? "pro" : "free"

    return {
        valid: payload.valid,
        plan,
        key: trimmed,
        lastChecked: new Date().toISOString(),
        expiresAt: payload.expiresAt || null,
    }
}
