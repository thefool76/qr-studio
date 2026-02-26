/*
Serverless verification endpoint for Polar-powered licensing.

Supports two modes:
1) Production mode (recommended): uses POLAR_ACCESS_TOKEN + POLAR_ORGANIZATION_ID
2) Local stub mode: accepts POLAR-* keys when env vars are not configured

Request:
POST /api/verify
Body: { "licenseKey": "POLAR-..." }

Response:
{ "valid": true|false, "plan": "pro"|"free", "expiresAt"?: string }
*/

interface VerifyRequestBody {
    licenseKey?: string
}

interface VerifyResponse {
    valid: boolean
    plan: "pro" | "free"
    expiresAt?: string
}

interface PolarValidateResponse {
    valid?: boolean
    status?: "granted" | "denied"
    id?: string
    expires_at?: string | null
}

export default async function handler(req: { method?: string; body?: VerifyRequestBody }, res: any): Promise<void> {
    if (req.method !== "POST") {
        res.status(405).json({ valid: false, plan: "free" } satisfies VerifyResponse)
        return
    }

    const licenseKey = String(req.body?.licenseKey || "").trim()
    if (!licenseKey) {
        res.status(400).json({ valid: false, plan: "free" } satisfies VerifyResponse)
        return
    }

    const organizationId = process.env.POLAR_ORGANIZATION_ID
    const accessToken = process.env.POLAR_ACCESS_TOKEN

    try {
        if (!organizationId) {
            const isDemoValid = licenseKey.startsWith("POLAR-")
            res.status(200).json(
                isDemoValid
                    ? {
                          valid: true,
                          plan: "pro",
                          expiresAt: null,
                      }
                    : {
                          valid: false,
                          plan: "free",
                      }
            )
            return
        }

        const endpoint = accessToken
            ? "https://api.polar.sh/v1/license-keys/validate"
            : "https://api.polar.sh/v1/customer-portal/license-keys/validate"

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({ key: licenseKey, organization_id: organizationId }),
        })

        if (!response.ok) {
            res.status(200).json({ valid: false, plan: "free" } satisfies VerifyResponse)
            return
        }

        const payload = (await response.json()) as PolarValidateResponse
        const granted = payload.valid === true || payload.status === "granted" || typeof payload.id === "string"

        const result: VerifyResponse = granted
            ? {
                  valid: true,
                  plan: "pro",
                  expiresAt: payload.expires_at ?? undefined,
              }
            : {
                  valid: false,
                  plan: "free",
              }

        res.status(200).json(result)
    } catch {
        res.status(500).json({ valid: false, plan: "free" } satisfies VerifyResponse)
    }
}
