import React, { useState, useMemo } from "react"
import { Check, X, Search, ChevronDown, ArrowLeft, Package, ClipboardCheck, IndianRupee } from "lucide-react"
import Modal from "../components/modal"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"

const WhatsAppIcon = ({ size = 16, color = "white" }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
		<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
	</svg>
)

// ── Payment Mode Options ──
const PAYMENT_MODES = [
	{ value: "cash",         label: "Cash" },
	{ value: "cheque",       label: "Cheque" },
	{ value: "bank_transfer",label: "Bank Transfer" },
	{ value: "upi",          label: "UPI" },
	{ value: "card",         label: "Card" },
	{ value: "other",        label: "Other" },
]

// ── Material Selector (unchanged) ──
function MaterialSelector({ materials = [], selected, onChange }) {
	const [search, setSearch] = useState("")
	const [open, setOpen]     = useState(false)

	const getUnitName = (unit) => {
		if(!unit) return ""
		if(typeof unit === "object") return unit.name ?? ""
		return unit
	}

	const filtered = materials.filter(m =>
		m.name.toLowerCase().includes(search.toLowerCase())
	)

	const toggle = (mat) => {
		const exists = selected.find(s => s.id === mat.id)
		if(exists){
			onChange(selected.filter(s => s.id !== mat.id))
		}else{
			onChange([...selected, { ...mat, unit: getUnitName(mat.unit), quantity: "" }])
		}
	}

	const updateQty = (id, qty) => {
		onChange(selected.map(s => s.id === id ? { ...s, quantity: qty } : s))
	}

	const removeItem = (id) => {
		onChange(selected.filter(s => s.id !== id))
	}

	return(
		<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
			{/* Dropdown trigger */}
			<button
				type="button"
				onClick={() => setOpen(!open)}
				style={{
					width: "100%", display: "flex", alignItems: "center",
					justifyContent: "space-between", padding: "10px 14px",
					borderRadius: 10, border: "1.5px solid #e5e7eb",
					background: "#f9fafb", cursor: "pointer",
					fontFamily: "inherit", fontSize: 14, color: "#374151",
				}}
			>
				<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<Package size={15} style={{ color: "#9ca3af" }} />
					{selected.length === 0
						? "Select materials..."
						: `${selected.length} material${selected.length > 1 ? "s" : ""} selected`}
				</span>
				<ChevronDown
					size={15}
					style={{ color: "#9ca3af", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
				/>
			</button>

			{/* Dropdown list */}
			{open && (
				<div style={{
					border: "1.5px solid #e5e7eb", borderRadius: 12,
					overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,0.09)"
				}}>
					<div style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6", background: "#fff" }}>
						<div style={{
							display: "flex", alignItems: "center", gap: 8,
							background: "#f3f4f6", borderRadius: 8, padding: "6px 10px"
						}}>
							<Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
							<input
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="Search materials..."
								style={{
									border: "none", background: "transparent", outline: "none",
									fontSize: 13, width: "100%", fontFamily: "inherit", color: "#374151"
								}}
							/>
						</div>
					</div>
					<div style={{ maxHeight: 180, overflowY: "auto", background: "#fff" }}>
						{filtered.length === 0 ? (
							<div style={{ padding: "14px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
								No materials found
							</div>
						) : filtered.map(mat => {
							const isSelected = !!selected.find(s => s.id === mat.id)
							const unitName   = getUnitName(mat.unit)
							return (
								<div
									key={mat.id}
									onClick={() => toggle(mat)}
									style={{
										display: "flex", alignItems: "center", justifyContent: "space-between",
										padding: "10px 14px", cursor: "pointer",
										background: isSelected ? "#f0fdf4" : "#fff",
										borderBottom: "1px solid #f9fafb",
									}}
								>
									<div>
										<div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{mat.name}</div>
										<div style={{ fontSize: 11, color: "#6b7280" }}>
											Unit: {unitName} · ₹{Number(mat.standard_rate).toLocaleString()}/{unitName}
										</div>
									</div>
									<div style={{
										width: 19, height: 19, borderRadius: 5, flexShrink: 0,
										border: isSelected ? "none" : "1.5px solid #d1d5db",
										background: isSelected ? "#16a34a" : "transparent",
										display: "flex", alignItems: "center", justifyContent: "center"
									}}>
										{isSelected && <Check size={11} color="#fff" />}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* Selected materials — 3 per row grid */}
			{selected.length > 0 && (
				<div style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: 8
				}}>
					{selected.map(mat => (
						<div key={mat.id} style={{
							position: "relative",
							display: "flex", flexDirection: "column", gap: 6,
							padding: "9px 10px 9px 10px",
							background: "#f9fafb", borderRadius: 10,
							border: "1.5px solid #e5e7eb", minWidth: 0
						}}>
							<button
								type="button"
								onClick={() => removeItem(mat.id)}
								style={{
									position: "absolute", top: 5, right: 5,
									background: "none", border: "none", cursor: "pointer",
									color: "#9ca3af", padding: 0, display: "flex", lineHeight: 1
								}}
							>
								<X size={12} />
							</button>
							<div
								title={mat.name}
								style={{
									fontWeight: 700, fontSize: 12, color: "#111827",
									whiteSpace: "nowrap", overflow: "hidden",
									textOverflow: "ellipsis", paddingRight: 14
								}}
							>
								{mat.name}
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<input
									type="number"
									min="0"
									value={mat.quantity}
									onChange={e => updateQty(mat.id, e.target.value)}
									placeholder="0"
									style={{
										flex: 1, minWidth: 0,
										padding: "4px 6px", borderRadius: 6,
										border: "1.5px solid #e5e7eb", background: "#fff",
										fontFamily: "inherit", fontSize: 12, color: "#111827",
										outline: "none", textAlign: "center"
									}}
								/>
								<span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>
									{mat.unit}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// ── Payment Received Form ──
function PaymentReceivedForm({ paymentData, onChange, theme }) {
	const { amount, paymentMode, paymentDate, transactionRef, invoiceNumber } = paymentData

	const inputStyle = {
		width: "100%", padding: "10px 12px", borderRadius: 10,
		border: "1.5px solid #e5e7eb", fontFamily: "inherit",
		fontSize: 13, color: "#374151", outline: "none",
		boxSizing: "border-box", background: "#fff",
		transition: "border-color 0.15s"
	}

	const labelStyle = {
		display: "block", fontSize: 13, fontWeight: 600,
		color: "#374151", marginBottom: 6
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
			{/* Amount — prominent */}
			<div>
				<label style={labelStyle}>
					Payment Amount <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
				</label>
				<div style={{ position: "relative" }}>
					<span style={{
						position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
						fontSize: 15, fontWeight: 700, color: "#16a34a", pointerEvents: "none"
					}}>₹</span>
					<input
						type="number"
						min="0"
						step="0.01"
						placeholder="0.00"
						value={amount}
						onChange={e => onChange({ ...paymentData, amount: e.target.value })}
						style={{
							...inputStyle,
							paddingLeft: 28,
							fontSize: 15, fontWeight: 600,
							border: "1.5px solid #bbf7d0",
							background: "#f0fdf4",
						}}
						onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
						onBlur={e  => e.target.style.borderColor = "#bbf7d0"}
					/>
				</div>
			</div>

			{/* Payment Date + Mode — side by side */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
				<div>
					<label style={labelStyle}>Payment Date <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
					<input
						type="date"
						value={paymentDate}
						onChange={e => onChange({ ...paymentData, paymentDate: e.target.value })}
						style={inputStyle}
						onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
						onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
					/>
				</div>
				<div>
					<label style={labelStyle}>Payment Mode <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
					<select
						value={paymentMode}
						onChange={e => onChange({ ...paymentData, paymentMode: e.target.value })}
						style={{ ...inputStyle, cursor: "pointer" }}
						onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
						onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
					>
						{PAYMENT_MODES.map(m => (
							<option key={m.value} value={m.value}>{m.label}</option>
						))}
					</select>
				</div>
			</div>

			{/* Transaction Ref + Invoice No — side by side */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
				<div>
					<label style={labelStyle}>
						Transaction Ref
						<span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>(optional)</span>
					</label>
					<input
						type="text"
						placeholder="UPI ID / Cheque No / TXN ID"
						value={transactionRef}
						onChange={e => onChange({ ...paymentData, transactionRef: e.target.value })}
						style={inputStyle}
						onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
						onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
					/>
				</div>
				<div>
					<label style={labelStyle}>
						Invoice Number
						<span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>(optional)</span>
					</label>
					<input
						type="text"
						placeholder="INV-001"
						value={invoiceNumber}
						onChange={e => onChange({ ...paymentData, invoiceNumber: e.target.value })}
						style={inputStyle}
						onFocus={e => e.target.style.borderColor = theme.primaryGradientStart}
						onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
					/>
				</div>
			</div>
		</div>
	)
}

// ── Default payment state ──
const INITIAL_PAYMENT = {
	amount:         "",
	paymentMode:    "cash",
	paymentDate:    new Date().toISOString().split("T")[0],
	transactionRef: "",
	invoiceNumber:  "",
}

export default function VendorWhatsAppModal({
	vendor,
	materials   = [],
	siteName    = "Construction Site Management",
	onClose
}) {
	const { theme }                                 = useTheme()
	const [step, setStep]                           = useState("pick")
	const [activeTemplate, setActiveTemplate]       = useState(null)
	const [selectedMaterials, setSelectedMaterials] = useState([])
	const [customNote, setCustomNote]               = useState("")
	const [receivedDate, setReceivedDate]           = useState(new Date().toISOString().split("T")[0])
	const [paymentData, setPaymentData]             = useState(INITIAL_PAYMENT)

	const TEMPLATES = [
		{
			id:    "enquiry",
			icon:  <Package size={20} />,
			label: "Material Enquiry",
			desc:  "Ask vendor for rates & availability of materials",
		},
		{
			id:    "received",
			icon:  <ClipboardCheck size={20} />,
			label: "Materials Received",
			desc:  "Confirm to vendor that materials have been received",
		},
		{
			id:    "payment",
			icon:  <IndianRupee size={20} />,
			label: "Payment Received",
			desc:  "Notify vendor of payment made against their invoice",
		},
	]

	const paymentModeLabel = PAYMENT_MODES.find(m => m.value === paymentData.paymentMode)?.label || "Cash"

	const previewMessage = useMemo(() => {
		if(!activeTemplate) return ""

		if(activeTemplate === "enquiry"){
			const lines = selectedMaterials.length > 0
				? selectedMaterials.map(m => `• ${m.name}\n  Quantity: ${m.quantity || "__"} ${m.unit}`).join("\n")
				: "• [No materials selected]"
			return `Dear ${vendor.name},\n\nWe would like to enquire about the following materials:\n\n*Materials Required:*\n${lines}\n\nPlease provide your best rates and availability.\n\nThank you,\n${siteName}`
		}

		if(activeTemplate === "received"){
			const lines = selectedMaterials.length > 0
				? selectedMaterials.map(m => `• ${m.name} — ${m.quantity || "__"} ${m.unit}`).join("\n")
				: "• [No materials selected]"
			return `Dear ${vendor.name},\n\nWe are pleased to confirm that the following materials have been received at our site on *${receivedDate}*:\n\n*Materials Received:*\n${lines}\n\nThank you for the timely delivery. Please share the invoice at your earliest convenience.\n\nRegards,\n${siteName}`
		}

		if(activeTemplate === "payment"){
			const amt     = paymentData.amount ? `₹${Number(paymentData.amount).toLocaleString("en-IN")}` : "₹__"
			const refLine = paymentData.transactionRef ? `\nTransaction Ref: *${paymentData.transactionRef}*` : ""
			const invLine = paymentData.invoiceNumber  ? `\nInvoice No: *${paymentData.invoiceNumber}*`      : ""
			return `Dear ${vendor.name},\n\nWe would like to inform you that a payment of *${amt}* has been made to your account.\n\n*Payment Details:*\n• Date: *${paymentData.paymentDate}*\n• Mode: *${paymentModeLabel}*${refLine}${invLine}\n\nKindly acknowledge receipt of this payment.\n\nThank you,\n${siteName}`
		}

		return ""
	}, [activeTemplate, selectedMaterials, vendor, siteName, receivedDate, paymentData, paymentModeLabel])

	const finalMessage = previewMessage + (customNote.trim() ? `\n\n${customNote.trim()}` : "")

	// Validation per template
	const hasPhone = !!vendor?.phone
	const canSend = useMemo(() => {
		if(!hasPhone) return false
		if(activeTemplate === "enquiry" || activeTemplate === "received") return selectedMaterials.length > 0
		if(activeTemplate === "payment") return !!paymentData.amount && Number(paymentData.amount) > 0
		return false
	}, [hasPhone, activeTemplate, selectedMaterials, paymentData.amount])

	const handleSend = () => {
		if(!hasPhone) return
		const phone   = vendor.phone?.replace(/\D/g, "")
		const encoded = encodeURIComponent(finalMessage)
		window.open(`https://wa.me/91${phone}?text=${encoded}`, "_blank")
	}

	const handleTemplateSelect = (id) => {
		setActiveTemplate(id)
		setSelectedMaterials([])
		setCustomNote("")
		setPaymentData(INITIAL_PAYMENT)
		setStep("compose")
	}

	const handleBack = () => {
		setStep("pick")
		setActiveTemplate(null)
		setSelectedMaterials([])
		setCustomNote("")
		setPaymentData(INITIAL_PAYMENT)
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
					{vendor.name} · {vendor.phone || "No phone on file"}
				</div>
			</div>
		</div>
	)

	return (
		<Modal
			isOpen={true}
			onClose={onClose}
			title={modalTitle}
			size="xl"
		>
			{/* ── Step 1: Pick Template ── */}
			{step === "pick" && (
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280" }}>
						Choose a message template to send to this vendor:
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

					{/* ── Material Enquiry & Received: date + material selector ── */}
					{(activeTemplate === "enquiry" || activeTemplate === "received") && (
						<>
							{activeTemplate === "received" && (
								<ThemeUI.FormField label="Date Received" name="received_date">
									<ThemeUI.Input
										type="date"
										name="received_date"
										value={receivedDate}
										onChange={e => setReceivedDate(e.target.value)}
									/>
								</ThemeUI.FormField>
							)}
							<div>
								<label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
									{activeTemplate === "enquiry" ? "Materials to Enquire" : "Materials Received"}
									<span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
								</label>
								<MaterialSelector
									materials={materials}
									selected={selectedMaterials}
									onChange={setSelectedMaterials}
								/>
							</div>
						</>
					)}

					{/* ── Payment Received form ── */}
					{activeTemplate === "payment" && (
						<PaymentReceivedForm
							paymentData={paymentData}
							onChange={setPaymentData}
							theme={theme}
						/>
					)}

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
							{finalMessage || <span style={{ color: "#9ca3af" }}>Fill in the details above to preview the message…</span>}
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
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 2 }}>
						{!hasPhone && (
							<span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
								This vendor has no phone number on file.
							</span>
						)}
						<div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
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
				</div>
			)}
		</Modal>
	)
}