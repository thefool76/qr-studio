import { ChangeEvent } from "react"
import { ContentState, QrContentType } from "../lib/types"
import { Field, SectionTitle } from "./ui"

interface ContentPanelProps {
    content: ContentState
    isPro: boolean
    onChange: (next: ContentState) => void
    onPromptUpgrade: () => void
}

const TYPES: Array<{ value: QrContentType; label: string; pro?: boolean }> = [
    { value: "url", label: "URL" },
    { value: "text", label: "Text" },
    { value: "email", label: "Email", pro: true },
    { value: "phone", label: "Phone", pro: true },
    { value: "wifi", label: "Wi-Fi", pro: true },
    { value: "vcard", label: "vCard", pro: true },
]

export function ContentPanel({ content, isPro, onChange, onPromptUpgrade }: ContentPanelProps) {
    const onTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const requested = event.target.value as QrContentType
        const target = !isPro && TYPES.find((item) => item.value === requested)?.pro ? content.type : requested
        if (!isPro && requested !== target) {
            onPromptUpgrade()
            return
        }
        onChange({ ...content, type: target })
    }

    return (
        <section className="panel-stack">
            <SectionTitle title="Content" subtitle="Create payloads for links, text, and contact formats." />
            <Field label="Type">
                <select value={content.type} onChange={onTypeChange}>
                    {TYPES.map((type) => (
                        <option key={type.value} value={type.value} disabled={Boolean(type.pro && !isPro)}>
                            {type.label}{type.pro ? " (Pro)" : ""}
                        </option>
                    ))}
                </select>
            </Field>
            {content.type === "url" ? (
                <Field label="URL">
                    <input
                        type="url"
                        placeholder="https://example.com"
                        value={content.url}
                        onChange={(event) => onChange({ ...content, url: event.target.value })}
                    />
                </Field>
            ) : null}
            {content.type === "text" ? (
                <Field label="Text">
                    <textarea
                        placeholder="Write any text"
                        value={content.text}
                        onChange={(event) => onChange({ ...content, text: event.target.value })}
                    />
                </Field>
            ) : null}
            {content.type === "email" ? (
                <>
                    <Field label="Email" pro>
                        <input
                            type="email"
                            placeholder="hello@brand.com"
                            value={content.email}
                            onChange={(event) => onChange({ ...content, email: event.target.value })}
                        />
                    </Field>
                    <Field label="Subject" pro>
                        <input
                            type="text"
                            placeholder="Optional"
                            value={content.subject}
                            onChange={(event) => onChange({ ...content, subject: event.target.value })}
                        />
                    </Field>
                    <Field label="Body" pro>
                        <textarea
                            placeholder="Optional message"
                            value={content.body}
                            onChange={(event) => onChange({ ...content, body: event.target.value })}
                        />
                    </Field>
                </>
            ) : null}
            {content.type === "phone" ? (
                <Field label="Phone" pro>
                    <input
                        type="tel"
                        placeholder="+1 555 123 4567"
                        value={content.phone}
                        onChange={(event) => onChange({ ...content, phone: event.target.value })}
                    />
                </Field>
            ) : null}
            {content.type === "wifi" ? (
                <>
                    <Field label="SSID" pro>
                        <input
                            type="text"
                            value={content.wifi.ssid}
                            onChange={(event) =>
                                onChange({ ...content, wifi: { ...content.wifi, ssid: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Security" pro>
                        <select
                            value={content.wifi.security}
                            onChange={(event) =>
                                onChange({
                                    ...content,
                                    wifi: {
                                        ...content.wifi,
                                        security: event.target.value as ContentState["wifi"]["security"],
                                    },
                                })
                            }
                        >
                            <option value="WPA">WPA</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">No password</option>
                        </select>
                    </Field>
                    <Field label="Password" pro disabled={content.wifi.security === "nopass"}>
                        <input
                            type="text"
                            value={content.wifi.password}
                            disabled={content.wifi.security === "nopass"}
                            onChange={(event) =>
                                onChange({ ...content, wifi: { ...content.wifi, password: event.target.value } })
                            }
                        />
                    </Field>
                    <label className="inline-switch">
                        <input
                            type="checkbox"
                            checked={content.wifi.hidden}
                            onChange={(event) =>
                                onChange({ ...content, wifi: { ...content.wifi, hidden: event.target.checked } })
                            }
                        />
                        <span>Hidden network</span>
                    </label>
                </>
            ) : null}
            {content.type === "vcard" ? (
                <>
                    <Field label="First name" pro>
                        <input
                            type="text"
                            value={content.vcard.firstName}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, firstName: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Last name" pro>
                        <input
                            type="text"
                            value={content.vcard.lastName}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, lastName: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Organization" pro>
                        <input
                            type="text"
                            value={content.vcard.organization}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, organization: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Title" pro>
                        <input
                            type="text"
                            value={content.vcard.title}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, title: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Phone" pro>
                        <input
                            type="tel"
                            value={content.vcard.phone}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, phone: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Email" pro>
                        <input
                            type="email"
                            value={content.vcard.email}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, email: event.target.value } })
                            }
                        />
                    </Field>
                    <Field label="Website" pro>
                        <input
                            type="url"
                            value={content.vcard.website}
                            onChange={(event) =>
                                onChange({ ...content, vcard: { ...content.vcard, website: event.target.value } })
                            }
                        />
                    </Field>
                </>
            ) : null}
        </section>
    )
}
