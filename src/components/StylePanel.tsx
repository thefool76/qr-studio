import { QR_PRESETS } from "../lib/presets"
import { QrPreset, StyleState } from "../lib/types"
import { Badge, Field, LockPill, SectionTitle } from "./ui"

interface StylePanelProps {
    style: StyleState
    isPro: boolean
    onChange: (next: StyleState) => void
    onApplyPreset: (preset: QrPreset) => void
    onPromptUpgrade: () => void
}

export function StylePanel({ style, isPro, onChange, onApplyPreset, onPromptUpgrade }: StylePanelProps) {
    return (
        <section className="panel-stack">
            <SectionTitle title="Style" subtitle="Tune visuals for brand fit and scan reliability." />
            <div className="preset-grid">
                {QR_PRESETS.map((preset) => {
                    const locked = Boolean(preset.proOnly && !isPro)
                    return (
                        <button
                            key={preset.id}
                            className={`preset-button ${locked ? "locked" : ""}`}
                            onClick={() => {
                                if (locked) {
                                    onPromptUpgrade()
                                    return
                                }
                                onApplyPreset(preset)
                            }}
                            type="button"
                        >
                            <span>{preset.label}</span>
                            {preset.proOnly ? <Badge label="Pro" variant="muted" /> : null}
                        </button>
                    )
                })}
            </div>
            <Field label="Pattern style">
                <select
                    value={style.pattern}
                    onChange={(event) => onChange({ ...style, pattern: event.target.value as StyleState["pattern"] })}
                >
                    <option value="dots">Dots</option>
                    <option value="squares">Squares</option>
                    <option value="rounded">Rounded</option>
                </select>
            </Field>
            <Field label="Corner style">
                <select
                    value={style.corner}
                    onChange={(event) => onChange({ ...style, corner: event.target.value as StyleState["corner"] })}
                >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                </select>
            </Field>
            <Field label="Foreground">
                <input
                    type="color"
                    value={style.foreground}
                    onChange={(event) => onChange({ ...style, foreground: event.target.value })}
                    disabled={style.gradient.enabled}
                />
            </Field>
            <Field label="Background">
                <input
                    type="color"
                    value={style.background}
                    disabled={style.transparentBackground}
                    onChange={(event) => onChange({ ...style, background: event.target.value })}
                />
            </Field>
            <label className="inline-switch">
                <input
                    type="checkbox"
                    checked={style.transparentBackground}
                    onChange={(event) => onChange({ ...style, transparentBackground: event.target.checked })}
                />
                <span>Transparent background</span>
            </label>
            <Field label="Gradient" pro>
                <label className="inline-switch">
                    <input
                        type="checkbox"
                        checked={style.gradient.enabled}
                        onChange={(event) => {
                            if (event.target.checked && !isPro) {
                                onPromptUpgrade()
                                return
                            }
                            onChange({
                                ...style,
                                gradient: {
                                    ...style.gradient,
                                    enabled: event.target.checked,
                                },
                            })
                        }}
                    />
                    <span>Enable gradient</span>
                </label>
            </Field>
            {!isPro ? <LockPill text="Gradient controls are available on Pro." /> : null}
            <div className={`grid-two ${!style.gradient.enabled ? "is-disabled" : ""}`}>
                <Field label="Gradient from" disabled={!style.gradient.enabled}>
                    <input
                        type="color"
                        value={style.gradient.from}
                        disabled={!style.gradient.enabled || !isPro}
                        onChange={(event) =>
                            onChange({
                                ...style,
                                gradient: { ...style.gradient, from: event.target.value },
                            })
                        }
                    />
                </Field>
                <Field label="Gradient to" disabled={!style.gradient.enabled}>
                    <input
                        type="color"
                        value={style.gradient.to}
                        disabled={!style.gradient.enabled || !isPro}
                        onChange={(event) =>
                            onChange({
                                ...style,
                                gradient: { ...style.gradient, to: event.target.value },
                            })
                        }
                    />
                </Field>
            </div>
            <Field label={`Gradient angle ${style.gradient.rotation}deg`} disabled={!style.gradient.enabled}>
                <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={style.gradient.rotation}
                    disabled={!style.gradient.enabled || !isPro}
                    onChange={(event) =>
                        onChange({
                            ...style,
                            gradient: { ...style.gradient, rotation: Number(event.target.value) },
                        })
                    }
                />
            </Field>
            <Field label={`Size ${style.size}px`}>
                <input
                    type="range"
                    min={128}
                    max={1024}
                    step={8}
                    value={style.size}
                    onChange={(event) => onChange({ ...style, size: Number(event.target.value) })}
                />
            </Field>
            <Field label={`Quiet zone ${style.quietZone}px`}>
                <input
                    type="range"
                    min={0}
                    max={64}
                    step={1}
                    value={style.quietZone}
                    onChange={(event) => onChange({ ...style, quietZone: Number(event.target.value) })}
                />
            </Field>
            <Field label="Error correction">
                <select
                    value={style.errorCorrectionLevel}
                    onChange={(event) =>
                        onChange({
                            ...style,
                            errorCorrectionLevel: event.target.value as StyleState["errorCorrectionLevel"],
                        })
                    }
                >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                </select>
            </Field>
        </section>
    )
}
