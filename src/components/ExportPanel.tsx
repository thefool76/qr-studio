import { Field, LockPill, SectionTitle } from "./ui"

interface ExportPanelProps {
    isPro: boolean
    canAddToCanvas: boolean
    exportSize: number
    onExportSizeChange: (size: number) => void
    onDownloadPng: () => Promise<void>
    onDownloadSvg: () => Promise<void>
    onCopyPng: () => Promise<void>
    onAddToCanvas: () => Promise<void>
}

export function ExportPanel({
    isPro,
    canAddToCanvas,
    exportSize,
    onExportSizeChange,
    onDownloadPng,
    onDownloadSvg,
    onCopyPng,
    onAddToCanvas,
}: ExportPanelProps) {
    return (
        <section className="panel-stack">
            <SectionTitle title="Export" subtitle="Export raster or vector assets with quality controls." />
            <Field label={`Output size ${exportSize}px`} pro>
                <input
                    type="range"
                    min={128}
                    max={isPro ? 4096 : 512}
                    step={32}
                    value={exportSize}
                    onChange={(event) => onExportSizeChange(Number(event.target.value))}
                />
            </Field>
            {!isPro ? <LockPill text="Free exports are capped at 512px PNG." /> : null}
            <div className="button-row">
                <button type="button" className="primary-button" onClick={() => void onDownloadPng()}>
                    Download PNG
                </button>
                <button type="button" className="secondary-button" onClick={() => void onCopyPng()}>
                    Copy PNG
                </button>
            </div>
            <button
                type="button"
                className="secondary-button"
                disabled={!canAddToCanvas || !isPro}
                title={!isPro ? "Pro feature" : canAddToCanvas ? "Insert QR into Framer canvas" : "Missing permission: addSVG/addImage"}
                onClick={() => void onAddToCanvas()}
            >
                Add to Canvas {!isPro ? "(Pro)" : ""}
            </button>
            <button
                type="button"
                className="secondary-button"
                disabled={!isPro}
                onClick={() => {
                    if (!isPro) return
                    void onDownloadSvg()
                }}
            >
                Download SVG {!isPro ? "(Pro)" : ""}
            </button>
        </section>
    )
}
