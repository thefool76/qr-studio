interface VerifyRequestBody {
    key?: string
    licenseKey?: string
}

interface ResponseLike {
    status: (code: number) => {
        json: (payload: VerifyResponse) => void
    }
}

interface VerifyResponse {
    valid: boolean
    status: "active" | "expired" | "invalid" | "error"
    expiresAt?: string | null
    reason?: "missing_server_config" | "polar_auth_failed" | "polar_timeout" | "polar_request_failed"
}

interface PolarVerifyResponse {
    valid?: boolean
    status?: string
    reason?: "missing_server_config" | "polar_auth_failed" | "polar_timeout" | "polar_request_failed"
    expires_at?: string | null
    expiresAt?: string | null
    license?: {
        status?: string
        expires_at?: string | null
        expiresAt?: string | null
    }
}

const REQUEST_TIMEOUT_MS = Number(process.env.POLAR_VERIFY_TIMEOUT_MS || 1200)
const POLAR_VALIDATE_ENDPOINT = "https://api.polar.sh/v1/license-keys/validate"

export default async function handler(req: { method?: string; body?: VerifyRequestBody }, res: ResponseLike): Promise<void> {
    if (req.method !== "POST") {
        res.status(405).json({ valid: false, status: "error" } satisfies VerifyResponse)
        return
    }

    const key = String(req.body?.key || req.body?.licenseKey || "").trim()
    if (!key) {
        res.status(400).json({ valid: false, status: "invalid" } satisfies VerifyResponse)
        return
    }

    const apiKey = process.env.POLAR_API_KEY || process.env.POLAR_ACCESS_TOKEN
    const organizationId = process.env.POLAR_ORGANIZATION_ID

    if (!apiKey || !organizationId) {
        // Surface configuration problems as a handled response so plugin UI stays stable.
        res.status(200).json({ valid: false, status: "error", reason: "missing_server_config" } satisfies VerifyResponse)
        return
    }

    try {
        const payload = await verifyWithRetry(apiKey, key, organizationId)
        const result = mapPolarResponse(payload)
        res.status(200).json(result)
    } catch (error) {
        if (isTimeoutError(error)) {
            res.status(200).json({ valid: false, status: "error", reason: "polar_timeout" } satisfies VerifyResponse)
            return
        }

        res.status(200).json({ valid: false, status: "error", reason: "polar_request_failed" } satisfies VerifyResponse)
    }
}

async function verifyWithRetry(apiKey: string, key: string, organizationId: string): Promise<PolarVerifyResponse> {
    try {
        return await verifyRequest(apiKey, key, organizationId)
    } catch (error) {
        if (!isTimeoutError(error)) {
            throw error
        }

        // Retry once on timeout before reporting a server error to the plugin UI.
        return verifyRequest(apiKey, key, organizationId)
    }
}

async function verifyRequest(apiKey: string, key: string, organizationId: string): Promise<PolarVerifyResponse> {
    const response = await fetchWithTimeout(POLAR_VALIDATE_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ key, organization_id: organizationId }),
    })

    if (response.status === 404 || response.status === 422) {
        return { valid: false, status: "invalid" }
    }

    if (response.status === 401 || response.status === 403) {
        return { valid: false, status: "error", reason: "polar_auth_failed" }
    }

    if (!response.ok) {
        throw new Error(`polar_http_${response.status}`)
    }

    return (await response.json()) as PolarVerifyResponse
}

function mapPolarResponse(payload: PolarVerifyResponse): VerifyResponse {
    const raw = [payload.status, payload.license?.status].find((value) => typeof value === "string")?.toLowerCase() || ""
    if (raw === "error") {
        return {
            valid: false,
            status: "error",
            expiresAt: null,
            reason: payload.reason,
        }
    }

    const status = normalizeStatus(payload)
    const expiresAt = payload.expiresAt ?? payload.expires_at ?? payload.license?.expiresAt ?? payload.license?.expires_at ?? null

    if (status === "active") {
        return {
            valid: true,
            status: "active",
            expiresAt,
        }
    }

    if (status === "expired") {
        return {
            valid: false,
            status: "expired",
            expiresAt,
        }
    }

    return {
        valid: false,
        status: "invalid",
        expiresAt,
    }
}

function normalizeStatus(payload: PolarVerifyResponse): "active" | "expired" | "invalid" {
    const raw = [payload.status, payload.license?.status].find((value) => typeof value === "string")?.toLowerCase() || ""

    if (payload.valid === true) return "active"
    if (raw === "active" || raw === "granted" || raw === "valid") {
        const expiresAt = payload.expiresAt ?? payload.expires_at ?? payload.license?.expiresAt ?? payload.license?.expires_at
        if (expiresAt && Date.parse(expiresAt) < Date.now()) return "expired"
        return "active"
    }
    if (raw === "expired" || raw === "revoked" || raw === "disabled") return "expired"

    return "invalid"
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
        })
    } catch (error) {
        if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
            throw new Error("timeout")
        }

        throw error
    } finally {
        clearTimeout(timeout)
    }
}

function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.message === "timeout"
}
