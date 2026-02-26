import { ChangeEvent, useRef, useState } from "react"
import { LogoState } from "../lib/types"
import { Field, LockPill, SectionTitle } from "./ui"

interface LogoPanelProps {
    logo: LogoState
    isPro: boolean
    onChange: (next: LogoState) => void
    onPromptUpgrade: () => void
}

export function LogoPanel({ logo, isPro, onChange, onPromptUpgrade }: LogoPanelProps) {
    const locked = !isPro
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [fileName, setFileName] = useState("")

    const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        if (!isPro) {
            onPromptUpgrade()
            return
        }

        try {
            const dataUrl = await readAsDataUrl(file)
            setFileName(file.name)
            onChange({ ...logo, dataUrl })
        } catch {
            setFileName("")
        }
    }

    return (
        <section className="panel-stack">
            <SectionTitle title="Logo" subtitle="Place a centered logo with reliability-safe defaults." />
            {locked ? <LockPill text="Logo overlays are available in Pro." /> : null}
            <Field label="Upload logo" pro disabled={locked}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    disabled={locked}
                    onChange={onUpload}
                    className="visually-hidden-file"
                />
                <div className="file-row">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={locked}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose image
                    </button>
                    <span className="file-name">{fileName || "No file selected"}</span>
                </div>
            </Field>
            {logo.dataUrl ? (
                <>
                    <div className="logo-preview">
                        <img src={logo.dataUrl} alt="Logo preview" />
                    </div>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                            setFileName("")
                            onChange({ ...logo, dataUrl: "" })
                        }}
                    >
                        Remove logo
                    </button>
                </>
            ) : null}
            <Field label={`Logo size ${logo.sizePercent}%`} pro disabled={locked}>
                <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={logo.sizePercent}
                    disabled={locked}
                    onChange={(event) => onChange({ ...logo, sizePercent: Number(event.target.value) })}
                />
            </Field>
            <Field label={`Logo padding ${logo.padding}px`} pro disabled={locked}>
                <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={logo.padding}
                    disabled={locked}
                    onChange={(event) => onChange({ ...logo, padding: Number(event.target.value) })}
                />
            </Field>
            <label className={`inline-switch ${locked ? "is-disabled" : ""}`}>
                <input
                    type="checkbox"
                    checked={logo.whitePlate}
                    disabled={locked}
                    onChange={(event) => onChange({ ...logo, whitePlate: event.target.checked })}
                />
                <span>White plate behind logo</span>
            </label>
        </section>
    )
}

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Unable to read logo file"))
        reader.readAsDataURL(file)
    })
}
