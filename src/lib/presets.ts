import { QrPreset } from "./types"

export const QR_PRESETS: QrPreset[] = [
    {
        id: "minimal",
        label: "Minimal",
        style: {
            pattern: "squares",
            corner: "square",
            foreground: "#111111",
            background: "#ffffff",
            gradient: { enabled: false, from: "#111111", to: "#111111", rotation: 0 },
            quietZone: 16,
            errorCorrectionLevel: "M",
        },
    },
    {
        id: "bold",
        label: "Bold",
        style: {
            pattern: "squares",
            corner: "square",
            foreground: "#000000",
            background: "#f4f4f4",
            gradient: { enabled: false, from: "#000000", to: "#000000", rotation: 0 },
            quietZone: 20,
            errorCorrectionLevel: "Q",
        },
    },
    {
        id: "soft-dots",
        label: "Soft Dots",
        style: {
            pattern: "dots",
            corner: "rounded",
            foreground: "#214c57",
            background: "#f7fcff",
            gradient: { enabled: false, from: "#214c57", to: "#214c57", rotation: 0 },
            quietZone: 22,
            errorCorrectionLevel: "Q",
        },
    },
    {
        id: "neon",
        label: "Neon",
        style: {
            pattern: "rounded",
            corner: "rounded",
            foreground: "#00ff8c",
            background: "#0b1420",
            gradient: { enabled: false, from: "#00ff8c", to: "#00ff8c", rotation: 0 },
            quietZone: 24,
            errorCorrectionLevel: "H",
        },
    },
    {
        id: "contrast-safe",
        label: "Contrast Safe",
        style: {
            pattern: "squares",
            corner: "square",
            foreground: "#111111",
            background: "#ffffff",
            gradient: { enabled: false, from: "#111111", to: "#111111", rotation: 0 },
            quietZone: 24,
            errorCorrectionLevel: "Q",
        },
    },
    {
        id: "brand-gradient",
        label: "Brand Gradient",
        proOnly: true,
        style: {
            pattern: "rounded",
            corner: "rounded",
            foreground: "#0a2d70",
            background: "#ffffff",
            gradient: { enabled: true, from: "#1c5df8", to: "#12a67b", rotation: 45 },
            quietZone: 24,
            errorCorrectionLevel: "H",
        },
        logo: {
            sizePercent: 22,
            padding: 8,
            whitePlate: true,
        },
    },
]
