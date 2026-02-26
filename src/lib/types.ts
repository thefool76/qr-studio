export type LicensePlan = "free" | "pro"

export type QrContentType = "url" | "text" | "email" | "phone" | "wifi" | "vcard"

export type PatternStyle = "dots" | "squares" | "rounded"

export type CornerStyle = "square" | "rounded"

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export type WifiSecurity = "WPA" | "WEP" | "nopass"

export interface WifiFields {
    ssid: string
    password: string
    security: WifiSecurity
    hidden: boolean
}

export interface VCardFields {
    firstName: string
    lastName: string
    organization: string
    title: string
    phone: string
    email: string
    website: string
}

export interface ContentState {
    type: QrContentType
    url: string
    text: string
    email: string
    subject: string
    body: string
    phone: string
    wifi: WifiFields
    vcard: VCardFields
}

export interface GradientState {
    enabled: boolean
    from: string
    to: string
    rotation: number
}

export interface StyleState {
    pattern: PatternStyle
    corner: CornerStyle
    foreground: string
    background: string
    transparentBackground: boolean
    gradient: GradientState
    size: number
    quietZone: number
    errorCorrectionLevel: ErrorCorrectionLevel
}

export interface LogoState {
    dataUrl: string
    sizePercent: number
    padding: number
    whitePlate: boolean
}

export interface LicenseState {
    valid: boolean
    plan: LicensePlan
    key: string
    lastChecked: string | null
    expiresAt: string | null
}

export interface ScanWarning {
    id: string
    message: string
    level: "warning" | "info"
}

export interface QrPreset {
    id: string
    label: string
    proOnly?: boolean
    style: Partial<StyleState>
    logo?: Partial<LogoState>
}
