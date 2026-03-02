import { framer, useIsAllowedTo } from "framer-plugin"
import { useEffect, useMemo, useRef, useState } from "react"
import { ContentPanel } from "./components/ContentPanel"
import { ExportPanel } from "./components/ExportPanel"
import { LogoPanel } from "./components/LogoPanel"
import { PaywallDialog } from "./components/PaywallDialog"
import { StylePanel } from "./components/StylePanel"
import { Badge } from "./components/ui"
import {
    clearStoredLicenseKey,
    getEmptyLicenseState,
    getLicenseErrorMessage,
    getStoredLicenseKey,
    setStoredLicenseKey,
    toLicenseState,
    validatePolarLicenseDetailed,
} from "./lib/license"
import { runLicenseActivationDiagnostics } from "./lib/licenseDiagnostics"
import {
    analyzeScanSafety,
    buildQrPayload,
    createQrInstance,
    exportQrBlob,
    getPreviewSize,
    isProType,
    QrRenderInput,
    updateQrInstance,
} from "./lib/qr"
import { ContentState, LicenseState, LogoState, QrPreset, StyleState } from "./lib/types"
import "./styles.css"

framer.showUI({
    position: "top right",
    width: 860,
    height: 640,
    resizable: true,
    minWidth: 760,
    minHeight: 560,
})

type TabKey = "content" | "style" | "logo" | "export"

const INITIAL_CONTENT: ContentState = {
    type: "url",
    url: "https://framer.com",
    text: "",
    email: "",
    subject: "",
    body: "",
    phone: "",
    wifi: {
        ssid: "",
        password: "",
        security: "WPA",
        hidden: false,
    },
    vcard: {
        firstName: "",
        lastName: "",
        organization: "",
        title: "",
        phone: "",
        email: "",
        website: "",
    },
}

const INITIAL_STYLE: StyleState = {
    pattern: "dots",
    corner: "rounded",
    foreground: "#111111",
    background: "#ffffff",
    transparentBackground: false,
    gradient: {
        enabled: false,
        from: "#1c5df8",
        to: "#12a67b",
        rotation: 45,
    },
    size: 512,
    quietZone: 20,
    errorCorrectionLevel: "M",
}

const INITIAL_LOGO: LogoState = {
    dataUrl: "",
    sizePercent: 22,
    padding: 8,
    whitePlate: true,
}

export function App() {
    const qrRef = useRef<ReturnType<typeof createQrInstance> | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const panelWrapRef = useRef<HTMLDivElement | null>(null)

    const [activeTab, setActiveTab] = useState<TabKey>("content")
    const [content, setContent] = useState<ContentState>(INITIAL_CONTENT)
    const [style, setStyle] = useState<StyleState>(INITIAL_STYLE)
    const [logo, setLogo] = useState<LogoState>(INITIAL_LOGO)
    const [exportSize, setExportSize] = useState(512)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [license, setLicense] = useState<LicenseState>(() => {
        const storedKey = getStoredLicenseKey()
        const state = getEmptyLicenseState()
        return storedKey ? { ...state, key: storedKey } : state
    })
    const [activationStatus, setActivationStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [activationMessage, setActivationMessage] = useState("")
    const [theme, setTheme] = useState(getFramerTheme())
    const [previewSrc, setPreviewSrc] = useState("")
    const [previewError, setPreviewError] = useState("")
    const canAddSvgToCanvas = useIsAllowedTo("addSVG")
    const canAddImageToCanvas = useIsAllowedTo("addImage")
    const canAddToCanvas = canAddSvgToCanvas || canAddImageToCanvas

    const isPro = license.valid && license.plan === "pro"
    const payload = useMemo(() => buildQrPayload(content), [content])

    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(getFramerTheme()))
        observer.observe(document.body, { attributes: true, attributeFilter: ["data-framer-theme"] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!import.meta.env.DEV) return

        ;(window as Window & { runLicenseActivationDiagnostics?: () => Promise<void> }).runLicenseActivationDiagnostics =
            runLicenseActivationDiagnostics
    }, [])

    useEffect(() => {
        document.body.dataset.theme = theme
    }, [theme])

    useEffect(() => {
        if (panelWrapRef.current) {
            panelWrapRef.current.scrollTop = 0
        }
    }, [activeTab])

    useEffect(() => {
        if (!isPro && isProType(content.type)) {
            setContent((prev) => ({ ...prev, type: "url" }))
        }
    }, [content.type, isPro])

    useEffect(() => {
        if (!isPro && style.gradient.enabled) {
            setStyle((prev) => ({ ...prev, gradient: { ...prev.gradient, enabled: false } }))
        }
    }, [isPro, style.gradient.enabled])

    useEffect(() => {
        if (!isPro && exportSize > 512) {
            setExportSize(512)
        }
    }, [exportSize, isPro])

    useEffect(() => {
        if (!isPro && logo.dataUrl) {
            setLogo(INITIAL_LOGO)
        }
    }, [isPro, logo.dataUrl])

    useEffect(() => {
        const storedKey = getStoredLicenseKey()
        if (!storedKey) return

        let cancelled = false

        void (async () => {
            // Silent revalidation on plugin load keeps local persistence secure.
            const result = await validatePolarLicenseDetailed(storedKey)
            if (cancelled) return

            if (result.valid) {
                setLicense(toLicenseState(result))
                return
            }

            clearStoredLicenseKey()
            setLicense({
                ...getEmptyLicenseState(),
                key: "",
                lastChecked: new Date().toISOString(),
                expiresAt: result.expiresAt,
            })
        })()

        return () => {
            cancelled = true
        }
    }, [])

    const renderInput: QrRenderInput = useMemo(
        () => ({
            payload,
            style,
            logo,
            previewSize: getPreviewSize(style.size),
        }),
        [logo, payload, style]
    )

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
            }
        }
    }, [])

    useEffect(() => {
        const handle = window.setTimeout(() => {
            void (async () => {
                if (!qrRef.current) {
                    qrRef.current = createQrInstance(renderInput)
                } else {
                    updateQrInstance(qrRef.current, renderInput)
                }

                try {
                    const raw = await qrRef.current.getRawData("svg")
                    if (!raw) return
                    const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "image/svg+xml" })
                    const url = URL.createObjectURL(blob)
                    if (previewUrlRef.current) {
                        URL.revokeObjectURL(previewUrlRef.current)
                    }
                    previewUrlRef.current = url
                    setPreviewSrc(url)
                    setPreviewError("")
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Unable to render preview"
                    setPreviewError(message)
                    notify(message, "error")
                }
            })()
        }, 220)

        return () => window.clearTimeout(handle)
    }, [renderInput])

    const warnings = useMemo(() => analyzeScanSafety(style, logo), [style, logo])

    const notify = (message: string, variant: "info" | "error" = "info") => {
        framer.notify(message, { variant })
    }

    const applyPreset = (preset: QrPreset) => {
        if (preset.proOnly && !isPro) {
            setDialogOpen(true)
            return
        }

        setStyle((prev) => ({ ...prev, ...preset.style }))
        if (preset.logo) {
            setLogo((prev) => ({ ...prev, ...preset.logo }))
        }
        notify(`Applied ${preset.label} preset`)
    }

    const download = async (format: "png" | "svg") => {
        if (!qrRef.current) {
            notify("QR preview is still loading.", "error")
            return
        }

        if (format === "svg" && !isPro) {
            setDialogOpen(true)
            return
        }

        const size = Math.min(exportSize, isPro ? 4096 : 512)
        try {
            const blob = await exportQrBlob(qrRef.current, renderInput, format, size)
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = `qr-studio-${Date.now()}.${format}`
            anchor.click()
            URL.revokeObjectURL(url)
            notify(`Downloaded ${format.toUpperCase()} (${size}px)`)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to export file"
            notify(message, "error")
        }
    }

    const copyPngToClipboard = async () => {
        if (!qrRef.current) {
            notify("QR preview is still loading.", "error")
            return
        }

        if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
            notify("Clipboard export is not supported in this browser.", "error")
            return
        }

        try {
            const size = Math.min(exportSize, isPro ? 4096 : 512)
            const blob = await exportQrBlob(qrRef.current, renderInput, "png", size)
            await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })])
            notify("PNG copied to clipboard")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to copy PNG"
            notify(message, "error")
        }
    }

    const addToCanvas = async () => {
        if (!isPro) {
            setDialogOpen(true)
            return
        }

        if (!canAddToCanvas) {
            notify("Permission required to add QR to canvas.", "error")
            return
        }

        if (!qrRef.current) {
            notify("QR preview is still loading.", "error")
            return
        }

        try {
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
            const size = Math.min(exportSize, isPro ? 4096 : 512)

            if (canAddSvgToCanvas) {
                try {
                    const blob = await exportQrBlob(qrRef.current, renderInput, "svg", size)
                    const svg = await blob.text()
                    await framer.addSVG({
                        name: `QR Code Studio ${stamp}.svg`,
                        svg,
                    })
                    notify("QR added to canvas (SVG)")
                    return
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Unable to add SVG to canvas"
                    const isSvgTooLarge = /too large|max size|10 kb/i.test(message)
                    if (!isSvgTooLarge || !canAddImageToCanvas) {
                        throw error
                    }
                }
            }

            if (canAddImageToCanvas) {
                const pngSize = Math.min(size, 2048)
                const pngBlob = await exportQrBlob(qrRef.current, renderInput, "png", pngSize)
                const pngFile = new File([pngBlob], `QR Code Studio ${stamp}.png`, { type: "image/png" })
                await framer.addImage(pngFile)
                notify("SVG exceeded Framer size limit. Added PNG to canvas instead.")
                return
            }

            notify("Unable to add QR to canvas with current permissions.", "error")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to add QR to canvas"
            notify(message, "error")
        }
    }

    const resetActivationFeedback = () => {
        if (activationStatus === "loading") return
        setActivationStatus("idle")
        setActivationMessage("")
    }

    const activateLicense = async (key: string) => {
        setActivationStatus("loading")
        setActivationMessage("")

        const result = await validatePolarLicenseDetailed(key)
        const checkedAt = new Date().toISOString()

        if (result.valid) {
            setStoredLicenseKey(result.key)
            setLicense(toLicenseState(result))
            setActivationStatus("success")
            setActivationMessage("Pro activated successfully")
            notify("License verified. Pro unlocked.")
            return
        }

        setActivationStatus("error")
        setActivationMessage(getLicenseErrorMessage(result.errorCode))
        setLicense((prev) => ({
            ...prev,
            key: key.trim(),
            lastChecked: checkedAt,
            expiresAt: result.expiresAt,
        }))
    }

    const deactivateLicense = () => {
        clearStoredLicenseKey()
        setLicense({
            ...getEmptyLicenseState(),
            lastChecked: new Date().toISOString(),
        })
        setActivationStatus("idle")
        setActivationMessage("")
        notify("License deactivated")
    }

    const tabs: Array<{ id: TabKey; label: string; pro?: boolean }> = [
        { id: "content", label: "Content" },
        { id: "style", label: "Style" },
        { id: "logo", label: "Logo", pro: true },
        { id: "export", label: "Export" },
    ]

    return (
        <main className="app-shell">
            <header className="topbar">
                <div className="brand-group">
                    <h1>QR Code Studio</h1>
                    <Badge label={isPro ? "Pro" : "Free"} variant={isPro ? "default" : "muted"} />
                </div>
                <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                        resetActivationFeedback()
                        setDialogOpen(true)
                    }}
                >
                    {isPro ? "Manage License" : "Unlock Pro"}
                </button>
            </header>

            <section className="workspace">
                <div className="left-column">
                    <nav className="tabs" aria-label="Editor tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span>{tab.label}</span>
                                {tab.pro ? <Badge label="Pro" variant="muted" /> : null}
                            </button>
                        ))}
                    </nav>

                    <div className="panel-wrap" ref={panelWrapRef}>
                        {activeTab === "content" ? (
                            <ContentPanel
                                content={content}
                                isPro={isPro}
                                onChange={setContent}
                                onPromptUpgrade={() => setDialogOpen(true)}
                            />
                        ) : null}
                        {activeTab === "style" ? (
                            <StylePanel
                                style={style}
                                isPro={isPro}
                                onChange={setStyle}
                                onApplyPreset={applyPreset}
                                onPromptUpgrade={() => setDialogOpen(true)}
                            />
                        ) : null}
                        {activeTab === "logo" ? (
                            <LogoPanel
                                logo={logo}
                                isPro={isPro}
                                onChange={setLogo}
                                onPromptUpgrade={() => setDialogOpen(true)}
                            />
                        ) : null}
                        {activeTab === "export" ? (
                            <ExportPanel
                                isPro={isPro}
                                canAddToCanvas={canAddToCanvas}
                                exportSize={Math.min(exportSize, isPro ? 4096 : 512)}
                                onExportSizeChange={setExportSize}
                                onDownloadPng={async () => download("png")}
                                onDownloadSvg={async () => download("svg")}
                                onCopyPng={copyPngToClipboard}
                                onAddToCanvas={addToCanvas}
                            />
                        ) : null}
                    </div>
                </div>

                <aside className="right-column">
                    <div className="preview-card">
                        <h2>Live Preview</h2>
                        <div className="preview-area">
                            {previewSrc ? <img src={previewSrc} alt="QR preview" className="preview-image" /> : <p>Rendering preview...</p>}
                            {previewError ? <p className="preview-error">{previewError}</p> : null}
                        </div>
                        <div className="quick-actions">
                            <button type="button" className="primary-button" onClick={() => void download("png")}>Download PNG</button>
                            <button
                                type="button"
                                className="secondary-button"
                                disabled={!canAddToCanvas || !isPro}
                                title={
                                    !isPro
                                        ? "Pro feature"
                                        : canAddToCanvas
                                          ? "Insert QR into Framer canvas"
                                          : "Missing permission: addSVG/addImage"
                                }
                                onClick={() => void addToCanvas()}
                            >
                                Add to Canvas {!isPro ? "(Pro)" : ""}
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                disabled={!isPro}
                                onClick={() => void download("svg")}
                            >
                                Download SVG {!isPro ? "(Pro)" : ""}
                            </button>
                        </div>
                    </div>

                    <div className="warning-card">
                        <h2>Scan Safety</h2>
                        {warnings.length === 0 ? <p>No warnings. This QR looks scan-friendly.</p> : null}
                        {warnings.map((warning) => (
                            <div key={warning.id} className={`warning-row ${warning.level}`} title={warning.message}>
                                <Badge label={warning.level === "warning" ? "Warning" : "Heads-up"} variant="warning" />
                                <p>{warning.message}</p>
                            </div>
                        ))}
                    </div>
                </aside>
            </section>

            <PaywallDialog
                open={dialogOpen}
                license={license}
                activationStatus={activationStatus}
                activationMessage={activationMessage}
                onClose={() => setDialogOpen(false)}
                onActivate={activateLicense}
                onDeactivate={deactivateLicense}
                onResetFeedback={resetActivationFeedback}
            />

            <footer className="app-footer">
                <span>Payload preview:</span>
                <code>{payload.slice(0, 120)}{payload.length > 120 ? "..." : ""}</code>
            </footer>
        </main>
    )
}

function getFramerTheme(): "light" | "dark" {
    return document.body.dataset.framerTheme === "dark" ? "dark" : "light"
}
