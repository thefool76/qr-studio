import { validatePolarLicenseDetailed } from "./license"

interface DiagnosticsOptions {
    validKey?: string
    expiredKey?: string
}

export async function runLicenseActivationDiagnostics(options: DiagnosticsOptions = {}): Promise<void> {
    const validKey = options.validKey || import.meta.env.VITE_TEST_VALID_LICENSE_KEY
    const expiredKey = options.expiredKey || import.meta.env.VITE_TEST_EXPIRED_LICENSE_KEY

    console.group("[license] activation diagnostics")

    if (validKey) {
        const validResult = await validatePolarLicenseDetailed(validKey)
        console.log("License valid response:", validResult)
    } else {
        console.log("License valid response: skipped (set VITE_TEST_VALID_LICENSE_KEY)")
    }

    const invalidResult = await validatePolarLicenseDetailed("INVALID-LICENSE-KEY")
    console.log("Invalid response:", invalidResult)

    if (expiredKey) {
        const expiredResult = await validatePolarLicenseDetailed(expiredKey)
        console.log("Expired response:", expiredResult)
    } else {
        console.log("Expired response: skipped (set VITE_TEST_EXPIRED_LICENSE_KEY)")
    }

    const networkResult = await validatePolarLicenseDetailed("NETWORK-TEST", {
        endpoint: "https://127.0.0.1:9/unreachable",
    })
    console.log("Network error:", networkResult)

    console.groupEnd()
}
