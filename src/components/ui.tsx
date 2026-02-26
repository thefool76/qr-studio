import { PropsWithChildren } from "react"

interface FieldProps extends PropsWithChildren {
    label: string
    pro?: boolean
    disabled?: boolean
}

export function Field({ label, pro, disabled, children }: FieldProps) {
    return (
        <label className={`field ${disabled ? "field-disabled" : ""}`}>
            <span className="field-label">
                {label}
                {pro ? <Badge label="Pro" /> : null}
            </span>
            {children}
        </label>
    )
}

export function Badge({ label, variant = "default" }: { label: string; variant?: "default" | "muted" | "warning" }) {
    return <span className={`badge badge-${variant}`}>{label}</span>
}

export function LockPill({ text = "Pro feature" }: { text?: string }) {
    return (
        <div className="lock-pill" role="note">
            <LockIcon />
            <span>{text}</span>
        </div>
    )
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <header className="section-title">
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
        </header>
    )
}

export function LockIcon() {
    return (
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
            <path
                fill="currentColor"
                d="M14 8h-1V6a3 3 0 0 0-6 0v2H6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Zm-5-2a1 1 0 1 1 2 0v2H9V6Z"
            />
        </svg>
    )
}
