import qrcode from "qrcode-generator"
import { ContentState, LogoState, QrContentType, ScanWarning, StyleState } from "./types"

const PRO_TYPES: ReadonlySet<QrContentType> = new Set(["email", "phone", "wifi", "vcard"])

interface InternalRenderOptions {
    payload: string
    style: StyleState
    logo: LogoState
    size: number
}

interface QrInstance {
    options: InternalRenderOptions
    update: (next: InternalRenderOptions) => void
    getRawData: (format: "png" | "svg") => Promise<Blob>
}

export function isProType(type: QrContentType): boolean {
    return PRO_TYPES.has(type)
}

export function buildQrPayload(content: ContentState): string {
    switch (content.type) {
        case "url":
            return content.url.trim() || "https://example.com"
        case "text":
            return content.text || "Hello from QR Code Studio"
        case "email": {
            const email = content.email.trim()
            if (!email) return "mailto:"
            const params = new URLSearchParams()
            if (content.subject.trim()) params.set("subject", content.subject.trim())
            if (content.body.trim()) params.set("body", content.body.trim())
            const query = params.toString()
            return `mailto:${email}${query ? `?${query}` : ""}`
        }
        case "phone":
            return `tel:${content.phone.trim()}`
        case "wifi": {
            const escapedSsid = escapeWifi(content.wifi.ssid)
            const escapedPassword = escapeWifi(content.wifi.password)
            return `WIFI:S:${escapedSsid};T:${content.wifi.security};P:${escapedPassword};H:${content.wifi.hidden ? "true" : "false"};;`
        }
        case "vcard":
            return [
                "BEGIN:VCARD",
                "VERSION:3.0",
                `N:${content.vcard.lastName};${content.vcard.firstName}`,
                `FN:${[content.vcard.firstName, content.vcard.lastName].filter(Boolean).join(" ")}`,
                content.vcard.organization ? `ORG:${content.vcard.organization}` : "",
                content.vcard.title ? `TITLE:${content.vcard.title}` : "",
                content.vcard.phone ? `TEL:${content.vcard.phone}` : "",
                content.vcard.email ? `EMAIL:${content.vcard.email}` : "",
                content.vcard.website ? `URL:${content.vcard.website}` : "",
                "END:VCARD",
            ]
                .filter(Boolean)
                .join("\n")
        default:
            return content.text || "QR Code Studio"
    }
}

function escapeWifi(value: string): string {
    return value.replace(/[\\;,:\"]/g, "\\$&")
}

export interface QrRenderInput {
    payload: string
    style: StyleState
    logo: LogoState
    previewSize: number
}

export function createQrInstance(input: QrRenderInput): QrInstance {
    return {
        options: toInternalOptions(input, input.previewSize),
        update(next: InternalRenderOptions) {
            this.options = next
        },
        async getRawData(format: "png" | "svg") {
            const svg = renderSvg(this.options)
            if (format === "svg") {
                return new Blob([svg], { type: "image/svg+xml" })
            }
            return svgToPngBlob(svg, this.options.size)
        },
    }
}

export function updateQrInstance(instance: QrInstance, input: QrRenderInput): void {
    instance.update(toInternalOptions(input, input.previewSize))
}

function toInternalOptions(input: QrRenderInput, size: number): InternalRenderOptions {
    return {
        payload: input.payload,
        style: input.style,
        logo: input.logo,
        size,
    }
}

export async function exportQrBlob(
    instance: QrInstance,
    input: QrRenderInput,
    format: "png" | "svg",
    exportSize: number
): Promise<Blob> {
    const previous = instance.options
    instance.update(toInternalOptions(input, exportSize))
    const raw = await instance.getRawData(format)
    instance.update(previous)
    return raw
}

export function getPreviewSize(targetSize: number): number {
    return Math.max(160, Math.min(360, targetSize))
}

function renderSvg(options: InternalRenderOptions): string {
    const { payload, style, logo, size } = options
    const qr = qrcode(0, style.errorCorrectionLevel)
    qr.addData(payload)
    qr.make()

    const count = qr.getModuleCount()
    const quiet = Math.max(0, style.quietZone)
    const drawable = Math.max(1, size - quiet * 2)
    const moduleSize = drawable / count
    const bg = style.transparentBackground ? "transparent" : style.background

    const gradientId = "qrGradient"
    const fill = style.gradient.enabled ? `url(#${gradientId})` : style.foreground

    const parts: string[] = []
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`)

    if (style.gradient.enabled) {
        parts.push(
            `<defs><linearGradient id="${gradientId}" gradientTransform="rotate(${style.gradient.rotation})">` +
                `<stop offset="0%" stop-color="${style.gradient.from}" />` +
                `<stop offset="100%" stop-color="${style.gradient.to}" />` +
                `</linearGradient></defs>`
        )
    }

    if (bg !== "transparent") {
        parts.push(`<rect x="0" y="0" width="${size}" height="${size}" fill="${bg}" />`)
    }

    for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
            if (!qr.isDark(row, col)) continue

            const x = quiet + col * moduleSize
            const y = quiet + row * moduleSize
            const inFinder = isInFinder(col, row, count)
            const shape = inFinder ? style.corner : style.pattern
            parts.push(renderModule(shape, x, y, moduleSize, fill))
        }
    }

    if (logo.dataUrl) {
        const logoSize = size * (logo.sizePercent / 100)
        const logoX = (size - logoSize) / 2
        const logoY = (size - logoSize) / 2
        const platePad = logo.padding + (logo.whitePlate ? 8 : 0)

        if (logo.whitePlate) {
            parts.push(
                `<rect x="${logoX - platePad}" y="${logoY - platePad}" width="${logoSize + platePad * 2}" height="${logoSize + platePad * 2}" rx="${Math.max(4, platePad)}" fill="#ffffff" />`
            )
        }

        parts.push(
            `<image href="${escapeXml(logo.dataUrl)}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />`
        )
    }

    parts.push("</svg>")
    return parts.join("")
}

function renderModule(shape: "dots" | "squares" | "rounded" | "square", x: number, y: number, size: number, fill: string): string {
    if (shape === "dots") {
        const r = size * 0.42
        return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${r}" fill="${fill}" />`
    }

    if (shape === "rounded") {
        const rx = size * 0.35
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="${fill}" />`
    }

    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}" />`
}

function isInFinder(col: number, row: number, count: number): boolean {
    const topLeft = col < 7 && row < 7
    const topRight = col >= count - 7 && row < 7
    const bottomLeft = col < 7 && row >= count - 7
    return topLeft || topRight || bottomLeft
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
    const svgBlob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(svgBlob)

    try {
        const image = await loadImage(url)
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext("2d")
        if (!ctx) {
            throw new Error("Canvas context unavailable")
        }

        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(image, 0, 0, size, size)

        const blob = await canvasToBlob(canvas)
        return blob
    } finally {
        URL.revokeObjectURL(url)
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("Failed to load QR image"))
        image.src = url
    })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Failed to render PNG"))
                return
            }
            resolve(blob)
        }, "image/png")
    })
}

export function analyzeScanSafety(style: StyleState, logo: LogoState): ScanWarning[] {
    const warnings: ScanWarning[] = []

    const bgColor = style.transparentBackground ? "#ffffff" : style.background
    const fgColor = style.gradient.enabled ? style.gradient.from : style.foreground

    const contrast = getContrastRatio(fgColor, bgColor)
    if (contrast < 3.5) {
        warnings.push({
            id: "contrast",
            level: "warning",
            message: `Low contrast (${contrast.toFixed(2)}:1). Increase foreground/background contrast for better scan reliability.`,
        })
    }

    if (style.quietZone < Math.max(8, Math.round(style.size * 0.03))) {
        warnings.push({
            id: "quiet-zone",
            level: "warning",
            message: "Quiet zone appears too small for this size. Use at least 3-4% padding around the code.",
        })
    }

    if (logo.dataUrl && logo.sizePercent > 30) {
        warnings.push({
            id: "logo-size",
            level: "info",
            message: "Large logo overlays may reduce scan success. Keep logo around 18-28% for safer scanning.",
        })
    }

    return warnings
}

function getContrastRatio(foreground: string, background: string): number {
    const fg = parseHex(foreground)
    const bg = parseHex(background)
    if (!fg || !bg) return 21

    const l1 = getLuminance(fg)
    const l2 = getLuminance(bg)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
}

function parseHex(value: string): [number, number, number] | null {
    const normalized = value.trim().replace("#", "")
    if (!/^[\da-fA-F]{3,8}$/.test(normalized)) return null

    const compact = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized
    const rgb = compact.slice(0, 6)

    const r = Number.parseInt(rgb.slice(0, 2), 16)
    const g = Number.parseInt(rgb.slice(2, 4), 16)
    const b = Number.parseInt(rgb.slice(4, 6), 16)

    if ([r, g, b].some((num) => Number.isNaN(num))) return null
    return [r, g, b]
}

function getLuminance([r, g, b]: [number, number, number]): number {
    const channels = [r, g, b].map((channel) => {
        const value = channel / 255
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
