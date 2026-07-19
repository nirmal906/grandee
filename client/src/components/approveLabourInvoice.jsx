import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Check, X } from "lucide-react"
import Modal from "./modal"
import Offcanvas from "./offcanvas"
import NoRowsOverlay from "./noRowsOverlay"

// ─── Approve Invoice Modal ───────────────────────────────────────────────────
function ApproveInvoiceModal({ isOpen, onClose, invoice, onApproved, theme }) {
    const [itemRates, setItemRates] = useState([])
    const [credit, setCredit] = useState("")
    const [debit, setDebit] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const isUpdatingRef = useRef(false)

    const items = invoice?.items || []

    // Initialize item rates when modal opens
    useEffect(() => {
        if (isOpen && invoice) {
            const rates = (invoice.items || []).map(item => ({
                item_id: item.id,
                rate_per_worker: item.labour?.standard_rate ? String(item.labour.standard_rate) : "",
            }))
            setItemRates(rates)
            setCredit("")
            setDebit("")
            setErrors({})
        }
    }, [isOpen, invoice])

    // Calculate line totals and grand total
    const lineTotals = useMemo(() => {
        return items.map((item, idx) => {
            const workers = Number(item.no_of_workers) || 0
            const rate = Number(itemRates[idx]?.rate_per_worker) || 0
            return parseFloat((workers * rate).toFixed(2))
        })
    }, [items, itemRates])

    const totalAmount = useMemo(() => {
        return parseFloat(lineTotals.reduce((sum, lt) => sum + lt, 0).toFixed(2))
    }, [lineTotals])

    // Auto-calculate debit/credit using isUpdatingRef pattern
    useEffect(() => {
        if (isUpdatingRef.current) return

        if (totalAmount === 0) {
            setCredit("")
            setDebit("")
            return
        }

        const creditVal = Number(credit) || 0
        const debitVal = Number(debit) || 0

        isUpdatingRef.current = true

        if (credit !== "" && creditVal >= 0 && creditVal <= totalAmount) {
            const calculatedDebit = totalAmount - creditVal
            if (Math.abs(calculatedDebit - debitVal) > 0.01) {
                setDebit(calculatedDebit >= 0 ? calculatedDebit.toFixed(2) : "0.00")
            }
        } else if (debit !== "" && debitVal >= 0 && debitVal <= totalAmount) {
            const calculatedCredit = totalAmount - debitVal
            if (Math.abs(calculatedCredit - creditVal) > 0.01) {
                setCredit(calculatedCredit >= 0 ? calculatedCredit.toFixed(2) : "0.00")
            }
        }

        setTimeout(() => {
            isUpdatingRef.current = false
        }, 100)
    }, [credit, debit, totalAmount])

    const handleRateChange = (idx, value) => {
        setItemRates(prev => {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], rate_per_worker: value }
            return updated
        })
        setErrors(prev => ({ ...prev, [`item_rate_${idx}`]: "" }))
    }

    const handleCreditChange = (e) => {
        const v = e.target.value
        isUpdatingRef.current = true
        setCredit(v)
        setErrors(prev => ({ ...prev, credit_entry: "" }))
        if (v !== "" && !isNaN(v) && totalAmount > 0) {
            const calc = totalAmount - Number(v)
            setDebit(calc >= 0 ? calc.toFixed(2) : "0.00")
        } else {
            setDebit("")
        }
        setTimeout(() => { isUpdatingRef.current = false }, 100)
    }

    const handleDebitChange = (e) => {
        const v = e.target.value
        isUpdatingRef.current = true
        setDebit(v)
        setErrors(prev => ({ ...prev, debit_entry: "" }))
        if (v !== "" && !isNaN(v) && totalAmount > 0) {
            const calc = totalAmount - Number(v)
            setCredit(calc >= 0 ? calc.toFixed(2) : "0.00")
        } else {
            setCredit("")
        }
        setTimeout(() => { isUpdatingRef.current = false }, 100)
    }

    const handleApprove = async () => {
        const newErrors = {}

        // Validate each item rate
        itemRates.forEach((ir, idx) => {
            if (!ir.rate_per_worker || isNaN(ir.rate_per_worker) || Number(ir.rate_per_worker) <= 0) {
                newErrors[`item_rate_${idx}`] = "Rate is required"
            }
        })

        // Validate paid + due = total
        const sum = Number(credit || 0) + Number(debit || 0)
        if (totalAmount > 0 && Math.abs(sum - totalAmount) > 0.01) {
            newErrors.debit_entry = `Paid + Due must equal \u20B9${totalAmount.toFixed(2)}`
        }

        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

        setIsLoading(true)
        try {
            const response = await axios.post(`/api/labour-invoice/${invoice.id}/approve`, {
                item_rates: itemRates.map(ir => ({
                    item_id: ir.item_id,
                    rate_per_worker: Number(ir.rate_per_worker),
                })),
                credit_entry: Number(credit || 0),
                debit_entry: Number(debit || 0),
            })
            if (response.data.success) {
                toast.success("Labour invoice approved successfully")
                onApproved()
                onClose()
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response.data.errors) {
                setErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || "Failed to approve invoice")
            }
        } finally { setIsLoading(false) }
    }

    if (!invoice) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Approve Labour Invoice" size="lg">
            <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div><span className="text-gray-500">Site:</span> <span className="font-medium">{invoice.site?.name || "\u2014"}</span></div>
                    <div><span className="text-gray-500">Vendor:</span> <span className="font-medium">{invoice.vendor?.name || "\u2014"}</span></div>
                    <div><span className="text-gray-500">Date:</span> <span className="font-medium">{invoice.date ? new Date(invoice.date).toLocaleDateString() : "\u2014"}</span></div>
                    <div><span className="text-gray-500">Items:</span> <span className="font-medium">{items.length}</span></div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Labour</th>
                                <th className="text-center px-3 py-2 font-medium text-gray-600">Workers</th>
                                <th className="text-center px-3 py-2 font-medium text-gray-600 w-36">Rate/Worker (\u20B9)</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-3 py-2">{item.labour?.name || "\u2014"}</td>
                                    <td className="px-3 py-2 text-center">{item.no_of_workers}</td>
                                    <td className="px-3 py-2">
                                        <ThemeUI.Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={itemRates[idx]?.rate_per_worker || ""}
                                            onChange={e => handleRateChange(idx, e.target.value)}
                                            placeholder="0.00"
                                            error={errors[`item_rate_${idx}`]}
                                        />
                                        {errors[`item_rate_${idx}`] && (
                                            <p className="mt-0.5 text-xs text-red-500">{errors[`item_rate_${idx}`]}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium">
                                        {lineTotals[idx] > 0 ? `\u20B9${lineTotals[idx].toFixed(2)}` : "\u2014"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Total display */}
                {totalAmount > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                        <span>Total Amount:</span>
                        <span className="text-blue-700">{"\u20B9"}{totalAmount.toFixed(2)}</span>
                    </div>
                )}

                {/* Paid & Due with full-payment checkboxes */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Paid */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">Paid {"\u20B9"}</label>
                            <ThemeUI.Checkbox
                                id="approve_paid_checkbox"
                                checked={credit === totalAmount.toFixed(2) && totalAmount > 0}
                                onChange={e => {
                                    isUpdatingRef.current = true
                                    if (e.target.checked) {
                                        setCredit(totalAmount.toFixed(2))
                                        setDebit("0.00")
                                    } else {
                                        setCredit("")
                                        setDebit("")
                                    }
                                    setErrors(prev => ({ ...prev, credit_entry: "", debit_entry: "" }))
                                    setTimeout(() => { isUpdatingRef.current = false }, 100)
                                }}
                                disabled={totalAmount === 0}
                            />
                        </div>
                        <ThemeUI.Input
                            type="number" step="0.01" min="0" max={totalAmount}
                            value={credit}
                            onChange={handleCreditChange}
                            placeholder="0.00"
                            disabled={totalAmount === 0}
                            error={errors.credit_entry}
                        />
                        {errors.credit_entry && (
                            <p className="mt-1 text-xs text-red-500">{errors.credit_entry}</p>
                        )}
                    </div>

                    {/* Due */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">Due {"\u20B9"}</label>
                            <ThemeUI.Checkbox
                                id="approve_due_checkbox"
                                checked={debit === totalAmount.toFixed(2) && totalAmount > 0}
                                onChange={e => {
                                    isUpdatingRef.current = true
                                    if (e.target.checked) {
                                        setDebit(totalAmount.toFixed(2))
                                        setCredit("0.00")
                                    } else {
                                        setDebit("")
                                        setCredit("")
                                    }
                                    setErrors(prev => ({ ...prev, debit_entry: "", credit_entry: "" }))
                                    setTimeout(() => { isUpdatingRef.current = false }, 100)
                                }}
                                disabled={totalAmount === 0}
                            />
                        </div>
                        <ThemeUI.Input
                            type="number" step="0.01" min="0" max={totalAmount}
                            value={debit}
                            onChange={handleDebitChange}
                            placeholder="0.00"
                            disabled={totalAmount === 0}
                            error={errors.debit_entry}
                        />
                        {errors.debit_entry && (
                            <p className="mt-1 text-xs text-red-500">{errors.debit_entry}</p>
                        )}
                    </div>
                </div>

                {/* Mismatch warning */}
                {totalAmount > 0 && credit !== "" && debit !== "" &&
                 Math.abs((Number(credit) + Number(debit)) - totalAmount) > 0.01 && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {"\u26A0"} Paid + Due ({"\u20B9"}{(Number(credit) + Number(debit)).toFixed(2)}) must equal Total ({"\u20B9"}{totalAmount.toFixed(2)})
                    </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <ThemeUI.Button
                        onClick={onClose}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        disabled={isLoading}
                    >
                        Cancel
                    </ThemeUI.Button>
                    <ThemeUI.Button
                        onClick={handleApprove}
                        disabled={isLoading}
                        gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                    >
                        {isLoading ? <><Loader size={16} className="mr-2 animate-spin" /> Approving...</> : <><Check size={16} className="mr-2" /> Approve</>}
                    </ThemeUI.Button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Reject Invoice Modal ────────────────────────────────────────────────────
function RejectInvoiceModal({ isOpen, onClose, invoice, onRejected, theme }) {
    const [reason, setReason] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => { if (isOpen) setReason("") }, [isOpen])

    const handleReject = async () => {
        setIsLoading(true)
        try {
            const response = await axios.post(`/api/labour-invoice/${invoice.id}/reject`, {
                rejection_reason: reason.trim() || null,
            })
            if (response.data.success) {
                toast.success("Labour invoice rejected")
                onRejected()
                onClose()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reject invoice")
        } finally { setIsLoading(false) }
    }

    if (!invoice) return null

    const totalWorkers = (invoice.items || []).reduce((sum, item) => sum + (Number(item.no_of_workers) || 0), 0)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reject Labour Invoice" size="sm">
            <div className="space-y-5">
                {/* Summary */}
                <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
                    <p><span className="text-gray-500">Site:</span> <span className="font-medium">{invoice.site?.name || "\u2014"}</span></p>
                    <p><span className="text-gray-500">Vendor:</span> <span className="font-medium">{invoice.vendor?.name || "\u2014"}</span></p>
                    <p><span className="text-gray-500">Workers:</span> <span className="font-medium">{totalWorkers}</span></p>
                    <p><span className="text-gray-500">Date:</span> <span className="font-medium">{invoice.date ? new Date(invoice.date).toLocaleDateString() : "\u2014"}</span></p>
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <ThemeUI.Button
                        onClick={onClose}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        disabled={isLoading}
                    >
                        Cancel
                    </ThemeUI.Button>
                    <button
                        onClick={handleReject}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? <><Loader size={16} className="animate-spin" /> Rejecting...</> : <><X size={16} /> Reject Invoice</>}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function ApproveLabourInvoice() {
    const { theme } = useTheme()

    const [invoices, setInvoices] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [perPage, setPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [siteFilter, setSiteFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [activeSites, setActiveSites] = useState([])

    const [approveInvoice, setApproveInvoice] = useState(null)
    const [rejectInvoice, setRejectInvoice] = useState(null)
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

    const fetchInvoices = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await axios.get("/api/labour-invoice/pending-approvals", {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: searchQuery,
                    site_id: siteFilter,
                    date_from: dateFrom,
                    date_to: dateTo,
                },
            })
            if (response.data.success) {
                setInvoices(response.data.data)
                setTotalRows(response.data.total || 0)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch pending invoices")
            setInvoices([])
            setTotalRows(0)
        } finally { setIsLoading(false) }
    }, [currentPage, perPage, searchQuery, siteFilter, dateFrom, dateTo])

    useEffect(() => { fetchInvoices() }, [fetchInvoices])

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const siteRes = await axios.get("/api/labour-invoice/active-sites")
                if (siteRes.data.success) setActiveSites(siteRes.data.data)
            } catch (err) { console.error("Dropdown fetch error:", err) }
        }
        fetchDropdowns()
    }, [])

    const openApprove = (invoice) => { setApproveInvoice(invoice); setIsApproveModalOpen(true) }
    const openReject = (invoice) => { setRejectInvoice(invoice); setIsRejectModalOpen(true) }

    const columnDefs = useMemo(() => [
        {
            headerName: "S.No", width: 80, pinned: "left",
            valueGetter: p => (currentPage - 1) * perPage + (p.node.rowIndex ?? 0) + 1,
        },
        {
            headerName: "Date", field: "date", width: 120,
            valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : "\u2014",
        },
        { headerName: "Site", field: "site.name", flex: 1, minWidth: 150 },
        { headerName: "Vendor", field: "vendor.name", flex: 1, minWidth: 120 },
        {
            headerName: "Labour Items", width: 100,
            valueGetter: p => (p.data?.items || []).length,
        },
        {
            headerName: "Total Workers", width: 110,
            valueGetter: p => (p.data?.items || []).reduce((sum, item) => sum + (Number(item.no_of_workers) || 0), 0),
        },
        {
            headerName: "Created By", width: 140,
            valueGetter: p => p.data?.creator?.name || "\u2014",
        },
        {
            headerName: "Actions", width: 160, sortable: false, pinned: "right",
            cellRenderer: p => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openApprove(p.data)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                        title="Approve"
                    >
                        <Check size={13} /> Approve
                    </button>
                    <button
                        onClick={() => openReject(p.data)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                        title="Reject"
                    >
                        <X size={13} /> Reject
                    </button>
                </div>
            ),
        },
    ], [currentPage, perPage])

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Approve Labour Invoices</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li><a href="/labourinvoice" className="hover:text-blue-600 transition-colors">Labour Invoice</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">Approve Invoices</li>
                    </ol>
                </nav>
            </div>

            {/* Stats bar */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                    <span className="text-yellow-800 font-medium">{totalRows} Pending Approval</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-full sm:w-1/3">
                    <ThemeUI.Input
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                        placeholder="Search by site name..."
                        leftElement={<Search size={16} className="text-gray-400" />}
                    />
                </div>
                <ThemeUI.Button
                    onClick={() => setIsFilterOpen(true)}
                    gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                >
                    <Filter size={16} className="mr-2" /> Filters
                </ThemeUI.Button>
            </div>

            {/* Grid */}
            <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                <AgGridReact
                    className="custom-ag-grid"
                    domLayout="autoHeight"
                    theme={themeQuartz.withParams({ spacing: 7, headerHeight: 45, headerFontSize: 16, fontSize: 13, headerTextColor: "white" })}
                    defaultColDef={{ resizable: true, sortable: true }}
                    rowData={invoices}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    pagination
                    paginationPageSize={perPage}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Pending Labour Invoices" }}
                    onPaginationChanged={params => {
                        if (params.api) {
                            const newPage = params.api.paginationGetCurrentPage() + 1
                            const newSize = params.api.paginationGetPageSize()
                            if (newPage !== currentPage) setCurrentPage(newPage)
                            if (newSize !== perPage) setPerPage(newSize)
                        }
                    }}
                />
            </div>

            {/* Approve Modal */}
            <ApproveInvoiceModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                invoice={approveInvoice}
                onApproved={fetchInvoices}
                theme={theme}
            />

            {/* Reject Modal */}
            <RejectInvoiceModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                invoice={rejectInvoice}
                onRejected={fetchInvoices}
                theme={theme}
            />

            {/* Filter Offcanvas */}
            <Offcanvas
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                title="Filter Options"
                position="right"
                size="md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Site">
                        <ThemeUI.Select
                            value={siteFilter}
                            onChange={opt => { setSiteFilter(opt?.value || ""); setCurrentPage(1) }}
                            options={activeSites.map(s => ({ value: s.id, label: s.name }))}
                            placeholder="All sites"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date From">
                        <ThemeUI.Input
                            type="date" value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }}
                            max={dateTo || new Date().toISOString().split("T")[0]}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date To">
                        <ThemeUI.Input
                            type="date" value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }}
                            min={dateFrom}
                            max={new Date().toISOString().split("T")[0]}
                        />
                    </ThemeUI.FormField>

                    <div className="flex gap-2 pt-4">
                        <ThemeUI.Button
                            onClick={() => {
                                setSiteFilter("")
                                setDateFrom(""); setDateTo("")
                                setCurrentPage(1); setIsFilterOpen(false)
                            }}
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                            className="flex-1"
                        >
                            Reset
                        </ThemeUI.Button>
                        <ThemeUI.Button
                            onClick={() => setIsFilterOpen(false)}
                            gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                            className="flex-1"
                        >
                            Apply
                        </ThemeUI.Button>
                    </div>
                </div>
            </Offcanvas>
        </Layout>
    )
}

export default ApproveLabourInvoice
