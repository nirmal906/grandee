import React, { useState, useMemo } from "react"
import { ArrowLeft, DollarSign, CheckCircle } from "lucide-react"
import Modal from "../components/modal"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"

const WhatsAppIcon = ({ size = 16, color = "white" }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
		<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
	</svg>
)

const COMPANY_NAME = "Grandee Constructions"

export default function CustomerWhatsAppModal({ site, onClose }) {
	const { theme }                           = useTheme()
	const [step, setStep]                     = useState("pick")
	const [activeTemplate, setActiveTemplate] = useState(null)
	const [enteredAmount, setEnteredAmount]   = useState("")
	const [customNote, setCustomNote]         = useState("")

	const totalBudget = parseFloat(site?.total_budget || 0)
	const clientName  = site?.client_name || "Sir/Madam"
	const siteName    = site?.name || "your site"

	const TEMPLATES = [
		{
			id:    "request",
			icon:  <DollarSign size={20} />,
			label: "Request Payment",
			desc:  "Send a payment request to the client with amount details",
		},
		{
			id:    "received",
			icon:  <CheckCircle size={20} />,
			label: "Received Payment",
			desc:  "Confirm to the client that their payment has been received",
		},
	]

	const enteredAmountNum = parseFloat(enteredAmount) || 0
	const remaining        = totalBudget - enteredAmountNum

	const previewMessage = useMemo(() => {
		if (!activeTemplate) return ""

		const fmt = (val) => `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`

		if (activeTemplate === "request") {
			return `Hi ${clientName},

This is a payment request for *${siteName}*.

*Total Budget:* ${fmt(totalBudget)}
*Requested Payment:* ${fmt(enteredAmountNum || "__")}
*Remaining Balance:* ${fmt(remaining)}

Kindly process the requested payment at your convenience.
Please let us know if you need any clarification.

Thanks,
${COMPANY_NAME}`
		}

		if (activeTemplate === "received") {
			return `Hi ${clientName},

We have received your payment for *${siteName}*.

*Total Budget:* ${fmt(totalBudget)}
*Received Payment:* ${fmt(enteredAmountNum || "__")}
*Remaining Balance:* ${fmt(remaining)}

Thank you for your prompt payment.

Regards,
${COMPANY_NAME}`
		}

		return ""
	}, [activeTemplate, enteredAmountNum, remaining, totalBudget, clientName, siteName])

	const finalMessage = previewMessage + (customNote.trim() ? `\n\n${customNote.trim()}` : "")
	const canSend      = enteredAmount !== "" && enteredAmountNum > 0

	const handleSend = () => {
		const phone   = site?.client_mobile?.replace(/\D/g, "")
		const encoded = encodeURIComponent(finalMessage)
		window.open(`https://wa.me/91${phone}?text=${encoded}`, "_blank")
	}

	const handleTemplateSelect = (id) => {
		setActiveTemplate(id)
		setEnteredAmount("")
		setCustomNote("")
		setStep("compose")
	}

	const handleBack = () => {
		setStep("pick")
		setActiveTemplate(null)
		setEnteredAmount("")
		setCustomNote("")
	}

	const tpl = TEMPLATES.find(t => t.id === activeTemplate)

	const modalTitle = (
		<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
			<div style={{
				width: 34, height: 34, borderRadius: 9,
				background: "linear-gradient(135deg, #25d366, #128c7e)",
				display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
			}}>
				<WhatsAppIcon size={18} />
			</div>
			<div>
				<div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
					{step === "pick" ? "WhatsApp Message" : tpl?.label}
				</div>
				<div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
					{clientName} · {site?.client_mobile}
				</div>
			</div>
		</div>
	)

	return (
		<Modal isOpen={true} onClose={onClose} title={modalTitle} size="xl">

			{/* ── Step 1: Pick Template ── */}
			{step === "pick" && (
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280" }}>
						Choose a message template to send to this client:
					</p>
					{TEMPLATES.map(t => (
						<button
							key={t.id}
							type="button"
							onClick={() => handleTemplateSelect(t.id)}
							style={{
								display: "flex", alignItems: "center", gap: 14,
								padding: "16px 18px", borderRadius: 14,
								border: "1.5px solid #e5e7eb",
								background: "#fff", cursor: "pointer",
								textAlign: "left", fontFamily: "inherit",
								transition: "all 0.15s",
								boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
							}}
							onMouseEnter={e => {
								e.currentTarget.style.borderColor = theme.primaryGradientStart
								e.currentTarget.style.boxShadow   = `0 4px 14px ${theme.primaryGradientStart}22`
								e.currentTarget.style.background   = "#fafafa"
							}}
							onMouseLeave={e => {
								e.currentTarget.style.borderColor = "#e5e7eb"
								e.currentTarget.style.boxShadow   = "0 1px 4px rgba(0,0,0,0.04)"
								e.currentTarget.style.background   = "#fff"
							}}
						>
							<div style={{
								width: 46, height: 46, borderRadius: 12, flexShrink: 0,
								background: `linear-gradient(135deg, ${theme.primaryGradientStart}1a, ${theme.primaryGradientEnd}1a)`,
								display: "flex", alignItems: "center", justifyContent: "center",
								color: theme.primaryGradientStart
							}}>
								{t.icon}
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{t.label}</div>
								<div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{t.desc}</div>
							</div>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</button>
					))}
				</div>
			)}

			{/* ── Step 2: Compose ── */}
			{step === "compose" && tpl && (
				<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
					<button
						type="button"
						onClick={handleBack}
						style={{
							display: "inline-flex", alignItems: "center", gap: 5,
							background: "none", border: "none", cursor: "pointer",
							fontSize: 12, color: "#6b7280", fontFamily: "inherit",
							padding: 0, width: "fit-content"
						}}
					>
						<ArrowLeft size={13} /> Back to templates
					</button>

					{/* Budget summary strip */}
					<div style={{
						background: `linear-gradient(135deg, ${theme.primaryGradientStart}0d, ${theme.primaryGradientEnd}0d)`,
						border: `1.5px solid ${theme.primaryGradientStart}33`,
						borderRadius: 12, padding: "12px 16px",
						display: "flex", gap: 24, flexWrap: "wrap"
					}}>
						<div>
							<div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>Total Budget</div>
							<div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
								₹{totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
							</div>
						</div>
						<div>
							<div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
								{activeTemplate === "request" ? "Requested" : "Received"}
							</div>
							<div style={{ fontSize: 15, fontWeight: 700, color: theme.primaryGradientStart }}>
								₹{enteredAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
							</div>
						</div>
						<div>
							<div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>Remaining Balance</div>
							<div style={{
								fontSize: 15, fontWeight: 700,
								color: remaining < 0 ? "#ef4444" : remaining === 0 ? "#10b981" : "#f59e0b"
							}}>
								₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
							</div>
						</div>
					</div>

					{/* Amount input */}
					<ThemeUI.FormField
						label={activeTemplate === "request" ? "Requested Amount (₹)" : "Received Amount (₹)"}
						name="entered_amount"
						required
					>
						<ThemeUI.Input
							type="number"
							min="0"
							step="0.01"
							name="entered_amount"
							value={enteredAmount}
							onChange={e => setEnteredAmount(e.target.value)}
							placeholder="0.00"
						/>
						{remaining < 0 && enteredAmount !== "" && (
							<div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
								⚠ Amount exceeds total budget
							</div>
						)}
					</ThemeUI.FormField>

					{/* Message preview */}
					<div>
						<label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
							Message Preview
						</label>
						<div style={{
							background: "#f0fdf4", border: "1.5px solid #bbf7d0",
							borderRadius: 12, padding: "14px 16px",
							fontSize: 13, color: "#166534", lineHeight: 1.75,
							whiteSpace: "pre-wrap", minHeight: 100,
							maxHeight: 220, overflowY: "auto", fontFamily: "inherit"
						}}>
							{finalMessage}
						</div>
					</div>

					{/* Optional note */}
					<div>
						<label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
							Additional Note{" "}
							<span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
						</label>
						<textarea
							value={customNote}
							onChange={e => setCustomNote(e.target.value)}
							placeholder="Add any extra details..."
							rows={2}
							style={{
								width: "100%", padding: "10px 12px", borderRadius: 10,
								border: "1.5px solid #e5e7eb", fontFamily: "inherit",
								fontSize: 13, color: "#374151", resize: "vertical",
								outline: "none", boxSizing: "border-box", lineHeight: 1.6,
								transition: "border-color 0.15s"
							}}
							onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
							onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
						/>
					</div>

					{/* Footer buttons */}
					<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 2 }}>
						<ThemeUI.Button
							onClick={onClose}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
						>
							Cancel
						</ThemeUI.Button>
						<ThemeUI.Button
							onClick={handleSend}
							disabled={!canSend}
							gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
							direction={theme.gradientDirection}
						>
							Send via WhatsApp
						</ThemeUI.Button>
					</div>
				</div>
			)}
		</Modal>
	)
}