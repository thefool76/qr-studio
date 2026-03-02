import { LicenseState } from "./types"

const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT || "/api/verify"
const STORAGE_KEY = "plugin_pro_license"
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_LICENSE_VERIFY_TIMEOUT_MS || 900)

export const REVIEW_KEY = "FRAMER-REVIEW-PRO-2026"
export const POLAR_CHECKOUT_URL =
    import.meta.env.VITE_POLAR_CHECKOUT_URL || "https://polar.sh/checkout?product=replace-with-your-product"
export const PRO_PRICE_LABEL = "$29.99 one-time"
export const PRO_PLAN_LABEL = "QR Code Studio Pro"

export type ActivationErrorCode = "invalid" | "expired" | "network" | "timeout" | "unknown"

export interface LicenseValidationResult {
    valid: boolean
    key: string
    expiresAt: string | null
    errorCode?: ActivationErrorCode
}

interface ValidateOptions {
    endpoint?: string
}

interface VerifyApiResponse {
    valid?: boolean
    status?: string
    reason?: "missing_server_config" | "polar_auth_failed" | "polar_timeout" | "polar_request_failed"
    expiresAt?: string | null
    expires_at?: string | null
}

export function getEmptyLicenseState(): LicenseState {
    return {
        valid: false,
        plan: "free",
        key: "",
        lastChecked: null,
        expiresAt: null,
    }
}

export function getStoredLicenseKey(): string {
    const raw = localStorage.getItem(STORAGE_KEY)
    return typeof raw === "string" ? raw.trim() : ""
}

export function setStoredLicenseKey(key: string): void {
    localStorage.setItem(STORAGE_KEY, key.trim())
}

export function clearStoredLicenseKey(): void {
    localStorage.removeItem(STORAGE_KEY)
}

export function getLicenseErrorMessage(code?: ActivationErrorCode): string {
    if (code === "expired") return "License expired"
    if (code === "timeout") return "Connection error, try again"
    if (code === "network") return "Connection error, try again"
    if (code === "unknown") return "Activation server error, contact support"
    return "Invalid license key"
}

export function toLicenseState(result: LicenseValidationResult): LicenseState {
    return {
        valid: result.valid,
        plan: result.valid ? "pro" : "free",
        key: result.key,
        lastChecked: new Date().toISOString(),
        expiresAt: result.expiresAt,
    }
}

export async function validatePolarLicense(key: string): Promise<boolean> {
    const result = await validatePolarLicenseDetailed(key)
    return result.valid
}

export async function validatePolarLicenseDetailed(key: string, options: ValidateOptions = {}): Promise<LicenseValidationResult> {
    const trimmed = key.trim()

    if (!trimmed) {
        return {
            valid: false,
            key: "",
            expiresAt: null,
            errorCode: "invalid",
        }
    }

    // Marketplace review fallback: bypass remote verification for the reviewer key only.
    if (trimmed === REVIEW_KEY) {
        return {
            valid: true,
            key: trimmed,
            expiresAt: null,
        }
    }

    try {
        const payload = await verifyWithRetry(trimmed, options.endpoint || VERIFY_ENDPOINT)
        return mapVerifyResponse(trimmed, payload)
    } catch (error) {
        if (isTimeoutError(error)) {
            return {
                valid: false,
                key: trimmed,
                expiresAt: null,
                errorCode: "timeout",
            }
        }

        if (error instanceof TypeError) {
            return {
                valid: false,
                key: trimmed,
                expiresAt: null,
                errorCode: "network",
            }
        }

        return {
            valid: false,
            key: trimmed,
            expiresAt: null,
            errorCode: "unknown",
        }
    }
}

async function verifyWithRetry(key: string, endpoint: string): Promise<VerifyApiResponse> {
    try {
        return await verifyRequest(key, endpoint)
    } catch (error) {
        if (!isTimeoutError(error)) {
            throw error
        }

        // Retry exactly once on timeout to handle transient network jitter.
        return verifyRequest(key, endpoint)
    }
}

async function verifyRequest(key: string, endpoint: string): Promise<VerifyApiResponse> {
    const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
    })

    if (!response.ok) {
        throw new TypeError(`verify_http_${response.status}`)
    }

    return (await response.json()) as VerifyApiResponse
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        })
    } catch (error) {
        if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
            throw new Error("timeout")
        }

        throw error
    } finally {
        window.clearTimeout(timeout)
    }
}

function mapVerifyResponse(key: string, payload: VerifyApiResponse): LicenseValidationResult {
    const rawStatus = typeof payload.status === "string" ? payload.status.toLowerCase() : ""
    const expiresAt = payload.expiresAt ?? payload.expires_at ?? null

    if (rawStatus === "error") {
        const serverReason = payload.reason
        if (serverReason === "missing_server_config" || serverReason === "polar_auth_failed" || serverReason === "polar_request_failed") {
            return {
                valid: false,
                key,
                expiresAt,
                errorCode: "unknown",
            }
        }

        return {
            valid: false,
            key,
            expiresAt,
            errorCode: serverReason === "polar_timeout" ? "timeout" : "network",
        }
    }

    const isActive = rawStatus === "active" || rawStatus === "valid" || rawStatus === "granted"
    const isExpired = rawStatus === "expired" || rawStatus === "revoked"
    const valid = payload.valid === true || isActive

    if (valid) {
        return {
            valid: true,
            key,
            expiresAt,
        }
    }

    if (isExpired) {
        return {
            valid: false,
            key,
            expiresAt,
            errorCode: "expired",
        }
    }

    return {
        valid: false,
        key,
        expiresAt,
        errorCode: "invalid",
    }
}

function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.message === "timeout"
}
