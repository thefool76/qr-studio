import { useEffect, useState } from "react"
import { POLAR_CHECKOUT_URL, PRO_PLAN_LABEL, PRO_PRICE_LABEL } from "../lib/license"
import { LicenseState } from "../lib/types"
import { Badge } from "./ui"

interface PaywallDialogProps {
    open: boolean
    license: LicenseState
    onClose: () => void
    onVerify: (key: string) => Promise<void>
    onDeactivate: () => void
}

export function PaywallDialog({ open, license, onClose, onVerify, onDeactivate }: PaywallDialogProps) {
    const [licenseKey, setLicenseKey] = useState(license.key)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (open) {
            setLicenseKey(license.key)
        }
    }, [open, license.key])

    if (!open) return null

    return (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
            <div className="dialog-card">
                <div className="dialog-header">
                    <h3>{license.valid ? "Manage License" : "Unlock QR Code Studio Pro"}</h3>
                    <button type="button" className="ghost-button" onClick={onClose}>
                        Close
                    </button>
                </div>
                {!license.valid ? (
                    <div className="plan-card">
                        <div>
                            <p className="plan-title">{PRO_PLAN_LABEL}</p>
                            <p className="plan-subtitle">Lifetime access. Pay once.</p>
                        </div>
                        <div className="plan-price">{PRO_PRICE_LABEL}</div>
                    </div>
                ) : null}
                <ul className="benefits-list">
                    <li>Pro content types: Email, Phone, Wi-Fi, vCard</li>
                    <li>Gradient styling, logo overlays, and Brand Gradient preset</li>
                    <li>High-resolution PNG up to 4096px, SVG export, and Add to Canvas</li>
                </ul>
                <div className="paywall-actions">
                    <a href={POLAR_CHECKOUT_URL} target="_blank" rel="noreferrer" className="primary-button inline-button">
                        Buy Pro - {PRO_PRICE_LABEL}
                    </a>
                    <span className="hint-text">After checkout, paste your Polar license key below.</span>
                </div>
                <label className="field">
                    <span className="field-label">License key</span>
                    <input
                        type="text"
                        placeholder="POLAR-XXXX"
                        value={licenseKey}
                        onChange={(event) => setLicenseKey(event.target.value)}
                    />
                </label>
                <div className="button-row">
                    <button
                        type="button"
                        className="primary-button verify-button"
                        disabled={verifying || !licenseKey.trim()}
                        onClick={async () => {
                            setVerifying(true)
                            try {
                                await onVerify(licenseKey.trim())
                            } finally {
                                setVerifying(false)
                            }
                        }}
                    >
                        {verifying ? "Verifying..." : "Verify"}
                    </button>
                    <button type="button" className="secondary-button" onClick={onDeactivate}>
                        Deactivate
                    </button>
                </div>
                <div className="status-line">
                    <Badge label={license.valid ? "Pro Active" : "Free"} variant={license.valid ? "default" : "muted"} />
                    {license.lastChecked ? <span>Last checked: {formatDate(license.lastChecked)}</span> : null}
                    {license.expiresAt ? <span>Expires: {formatDate(license.expiresAt)}</span> : null}
                </div>
            </div>
        </div>
    )
}

function formatDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown"
    return date.toLocaleString()
}
