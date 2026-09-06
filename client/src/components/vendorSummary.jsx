import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Search, Eye, ArrowLeft, Filter, IndianRupee, Loader, CheckCircle2, AlertTriangle, Wallet, Layers, Package, Wrench } from "lucide-react"
import Modal from "./modal"
import Offcanvas from "./offcanvas"
import NoRowsOverlay from "./noRowsOverlay"

function VendorSummary() {
    const { theme } = useTheme()

    // View management
    const [view, setView] = useState('list') // 'list', 'detail', 'invoices'
    const [vendors, setVendors] = useState([])
    const [selectedVendor, setSelectedVendor] = useState(null)
    const [vendorDetail, setVendorDetail] = useState(null)
    const [selectedSite, setSelectedSite] = useState(null)
    const [siteInvoices, setSiteInvoices] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Pagination
    const [totalRows, setTotalRows] = useState(0)
    const [perPage, setPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)

    // Typing animation
    const [placeholder, setPlaceholder] = useState("Search by vendor name...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const words = ["vendor name"]

    const [paymentModalOpen, setPaymentModalOpen]   = useState(false)
    const [paymentVendor,    setPaymentVendor]       = useState(null)
    const [paymentAmount,    setPaymentAmount]        = useState('')
    const [paymentLoading,   setPaymentLoading]       = useState(false)

    // Payment modal — tab (standard payoff vs. advance/additional split payment)
    const [paymentTab, setPaymentTab] = useState('standard') // 'standard' | 'split'

    // Split payment (Advance / Additional Payment)
    const [activeSites,        setActiveSites]        = useState([])
    const [activeSitesLoading, setActiveSitesLoading]  = useState(false)
    const [splitPaymentTypes,  setSplitPaymentTypes]   = useState([]) // ['advance', 'additional']
    const [splitInvoiceTypes,  setSplitInvoiceTypes]   = useState([]) // ['material', 'labour']
    const [splitAmount,        setSplitAmount]         = useState('')
    const [splitDate,          setSplitDate]           = useState(() => new Date().toISOString().slice(0, 10))
    const [splitMethod,        setSplitMethod]         = useState('bank_transfer')
    const [splitReference,     setSplitReference]      = useState('')
    const [splitAllocations,   setSplitAllocations]    = useState({}) // { [site_id]: amountString }
    const [splitIncludedSites, setSplitIncludedSites]  = useState({}) // { [site_id]: boolean }
    const [splitLoading,       setSplitLoading]        = useState(false)

    const PAYMENT_METHOD_OPTIONS = [
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cash',          label: 'Cash' },
        { value: 'upi',           label: 'UPI' },
        { value: 'cheque',        label: 'Cheque' },
        { value: 'other',         label: 'Other' },
    ]

    // Permissions
    const [permissions, setPermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false
    })

    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem('userPermissions')
            if (permissionsStr) {
                const perms = JSON.parse(permissionsStr)
                if (perms.vendor) {
                    return {
                        can_add: perms.vendor.can_add || false,
                        can_edit: perms.vendor.can_edit || false,
                        can_delete: perms.vendor.can_delete || false,
                        can_view: perms.vendor.can_view || false
                    }
                }
            }
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        } catch (error) {
            console.error('Error parsing user permissions:', error)
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        }
    }, [])

    useEffect(() => {
        const p = getUserPermissions()
        setPermissions(p)
    }, [getUserPermissions])

    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const p = getUserPermissions()
            setPermissions(p)
        }
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
        return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
    }, [getUserPermissions])

    // Fetch all vendors summary
    const fetchVendors = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await axios.get(`/api/vendor-summary`, {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: searchQuery,
                },
            })
            if (response.data.success) {
                setVendors(response.data.data || [])
                setTotalRows(response.data.total || 0)
            }
        } catch (err) {
            console.error("Error fetching vendor summary:", err)
            toast.error(err.response?.data?.message || "Failed to fetch vendor summary")
            setVendors([])
            setTotalRows(0)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, perPage, searchQuery])

    useEffect(() => {
        fetchVendors()
    }, [fetchVendors])

    // Typing animation
    useEffect(() => {
        const typingSpeed = isDeleting ? 50 : 100
        const pauseTime = 1500
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex]
            if (!isDeleting && currentCharIndex < currentWord.length) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
                setCurrentCharIndex(prev => prev + 1)
            } else if (isDeleting && currentCharIndex > 0) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
                setCurrentCharIndex(prev => prev - 1)
            } else if (!isDeleting && currentCharIndex === currentWord.length) {
                setTimeout(() => setIsDeleting(true), pauseTime)
            } else if (isDeleting && currentCharIndex === 0) {
                setIsDeleting(false)
                setCurrentWordIndex(prev => (prev + 1) % words.length)
            }
        }, typingSpeed)
        return () => clearTimeout(timeout)
    }, [currentCharIndex, currentWordIndex, isDeleting])

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // Currency formatter
    const formatCurrency = (value) => {
        const num = Number(value) || 0
        return `₹${num.toFixed(2)}`
    }

    const fetchActiveSitesForPayment = useCallback(async () => {
        setActiveSitesLoading(true)
        try {
            const res = await axios.get(`/api/material-invoice/active-sites`)
            if (res.data.success) {
                setActiveSites(res.data.data || [])
            }
        } catch (err) {
            console.error("Error fetching active sites:", err)
            toast.error(err.response?.data?.message || "Failed to fetch active sites")
            setActiveSites([])
        } finally {
            setActiveSitesLoading(false)
        }
    }, [])

    const openPaymentModal = (vendor) => {
        const hasOutstanding = Number(vendor.total_balance) > 0

        setPaymentVendor(vendor)
        setPaymentAmount('')
        setPaymentTab(hasOutstanding ? 'standard' : 'split')

        // Reset split-payment state for a clean modal every time it opens
        setSplitPaymentTypes([])
        setSplitInvoiceTypes([])
        setSplitAmount('')
        setSplitDate(new Date().toISOString().slice(0, 10))
        setSplitMethod('bank_transfer')
        setSplitReference('')
        setSplitAllocations({})
        setSplitIncludedSites({})

        setPaymentModalOpen(true)
        fetchActiveSitesForPayment()
    }

    const handlePaymentSubmit = async () => {
        const amount = Number(paymentAmount)
        if (!paymentAmount || isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid payment amount')
            return
        }
        setPaymentLoading(true)
        try {
            const res = await axios.post(`/api/vendor-summary/${paymentVendor.vendor_id}/payment`, {
                payment_amount: paymentAmount,
            })
            if (res.data.success) {
                toast.success(res.data.message)
                setPaymentModalOpen(false)
                fetchVendors()   // refresh the main table
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed')
        } finally {
            setPaymentLoading(false)
        }
    }

    // ===== Split payment (Advance / Additional Payment) helpers =====

    const togglePaymentType = (type) => {
        setSplitPaymentTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const toggleInvoiceType = (type) => {
        setSplitInvoiceTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const toggleSiteIncluded = (siteId) => {
        setSplitIncludedSites(prev => ({ ...prev, [siteId]: !prev[siteId] }))
    }

    const updateSiteAllocation = (siteId, value) => {
        setSplitAllocations(prev => ({ ...prev, [siteId]: value }))
    }

    const splitTotalAllocated = useMemo(() => {
        return activeSites.reduce((sum, site) => {
            if (!splitIncludedSites[site.id]) return sum
            const val = Number(splitAllocations[site.id])
            return sum + (isNaN(val) ? 0 : val)
        }, 0)
    }, [activeSites, splitIncludedSites, splitAllocations])

    const splitRemaining = useMemo(() => {
        const amt = Number(splitAmount) || 0
        return parseFloat((amt - splitTotalAllocated).toFixed(2))
    }, [splitAmount, splitTotalAllocated])

    const splitNotesPreview = useMemo(() => {
        const labels = splitPaymentTypes.map(t => t === 'advance' ? 'Advance Payment' : 'Additional Payment')
        if (labels.length === 0) return null
        const methodLabel = PAYMENT_METHOD_OPTIONS.find(m => m.value === splitMethod)?.label || splitMethod
        const invoiceTypeLabels = splitInvoiceTypes.map(t => t === 'material' ? 'Material' : 'Labour')
        const lines = [
            `Payment Mode: ${labels.join(', ')}`,
            `Payment Date: ${splitDate ? new Date(splitDate).toLocaleDateString() : '—'}`,
            `Mode: ${methodLabel}`,
        ]
        if (invoiceTypeLabels.length > 0) lines.push(`Invoice Type: ${invoiceTypeLabels.join(', ')}`)
        if (splitReference) lines.push(`Reference: ${splitReference}`)
        return lines
    }, [splitPaymentTypes, splitInvoiceTypes, splitDate, splitMethod, splitReference])

    const handleSplitPaymentSubmit = async () => {
        const amount = Number(splitAmount)
        if (!splitAmount || isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid payment amount')
            return
        }
        if (splitPaymentTypes.length === 0) {
            toast.error('Select at least one payment mode (Advance or Additional Payment)')
            return
        }
        if (splitInvoiceTypes.length === 0) {
            toast.error('Select at least one invoice type (Material or Labour)')
            return
        }
        if (!splitDate) {
            toast.error('Please select a payment date')
            return
        }

        const allocations = activeSites
            .filter(site => splitIncludedSites[site.id])
            .map(site => ({ site_id: site.id, amount: Number(splitAllocations[site.id]) }))
            .filter(a => !isNaN(a.amount) && a.amount > 0)

        if (allocations.length === 0) {
            toast.error('Allocate the payment amount to at least one active site')
            return
        }

        if (Math.abs(splitRemaining) > 0.01) {
            toast.error('Total allocated must equal the payment amount before proceeding')
            return
        }

        setSplitLoading(true)
        try {
            const res = await axios.post(`/api/vendor-summary/${paymentVendor.vendor_id}/split-payment`, {
                payment_types: splitPaymentTypes,
                invoice_types: splitInvoiceTypes,
                payment_amount: amount,
                payment_date: splitDate,
                payment_method: PAYMENT_METHOD_OPTIONS.find(m => m.value === splitMethod)?.label || splitMethod,
                reference_notes: splitReference,
                allocations,
            })
            if (res.data.success) {
                toast.success(res.data.message)
                setPaymentModalOpen(false)
                fetchVendors()   // refresh the main table
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Split payment failed')
        } finally {
            setSplitLoading(false)
        }
    }

    // View navigation
    const viewVendorDetail = async (vendor) => {
        setSelectedVendor(vendor)
        setIsLoading(true)
        try {
            const res = await axios.get(`/api/vendor-summary/${vendor.vendor_id}`)
            if (res.data.success) {
                setVendorDetail(res.data.data)
                setView('detail')
            }
        } catch (err) {
            console.error("Error fetching vendor detail:", err)
            toast.error(err.response?.data?.message || "Failed to fetch vendor details")
        } finally {
            setIsLoading(false)
        }
    }

    const viewSiteInvoices = async (site) => {
        setSelectedSite(site)
        setIsLoading(true)
        try {
            const res = await axios.get(`/api/vendor-summary/${selectedVendor.vendor_id}/site/${site.site_id}`)
            if (res.data.success) {
                // In viewSiteInvoices, after receiving res.data.data:
                const raw = res.data.data
                const combined = [
                    ...(raw.material_invoices || []).map(inv => ({
                        ...inv,
                        type: 'Material',
                        total: parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0),
                        paid:  parseFloat(inv.credit_entry || 0),
                        due:   parseFloat(inv.debit_entry  || 0),
                    })),
                    ...(raw.labour_invoices || []).map(inv => ({
                        ...inv,
                        type: 'Labour',
                        total: parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0),
                        paid:  parseFloat(inv.credit_entry || 0),
                        due:   parseFloat(inv.debit_entry  || 0),
                    })),
                ].sort((a, b) => new Date(b.date) - new Date(a.date))

                setSiteInvoices({ ...raw, invoices: combined })
                setView('invoices')
            }
        } catch (err) {
            console.error("Error fetching site invoices:", err)
            toast.error(err.response?.data?.message || "Failed to fetch invoices")
        } finally {
            setIsLoading(false)
        }
    }

    const goBack = () => {
        if (view === 'invoices') {
            setView('detail')
            setSiteInvoices(null)
            setSelectedSite(null)
        } else if (view === 'detail') {
            setView('list')
            setVendorDetail(null)
            setSelectedVendor(null)
        }
    }

    // ===== VIEW 1: All Vendors Summary =====
    const vendorListColumnDefs = useMemo(() => [
        {
            headerName: "S.No",
            width: 80,
            valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
            sortable: false,
            pinned: 'left'
        },
        {
            headerName: "Vendor Name",
            field: "vendor_name",
            flex: 1,
            minWidth: 200,
        },
        {
            headerName: "Material Billed (₹)",
            field: "material_billed",       // ← was: "total_material_billed"
            width: 150,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Material Paid (₹)",
            field: "material_paid",         // ← was: "total_material_paid"
            width: 140,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Labour Billed (₹)",
            field: "labour_billed",         // ← was: "total_labour_billed"
            width: 140,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Labour Paid (₹)",
            field: "labour_paid",           // ← was: "total_labour_paid"
            width: 140,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Total Billed (₹)",
            field: "total_billed",          // ← was: "grand_total_billed"
            width: 140,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Total Paid (₹)",
            field: "total_paid",            // ← was: "grand_total_paid"
            width: 140,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Balance (₹)",
            field: "total_balance",         // already correct
            width: 140,
            cellRenderer: (params) => {
                const val = Number(params.value) || 0
                const color = val > 0 ? "text-red-600" : "text-green-600"
                return <span className={`font-medium ${color}`}>{formatCurrency(val)}</span>
            },
        },
        {
            headerName: "Actions",
            width: 230,       // wider to fit both buttons
            sortable: false,
            cellRenderer: (params) => (
                <div className="flex items-center gap-2 h-full">
                    <button
                        onClick={() => viewVendorDetail(params.data)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={{ color: theme.primaryGradientStart, backgroundColor: `${theme.primaryGradientStart}15` }}
                    >
                        <Eye size={13} /> View
                    </button>
                    <button
                        onClick={() => openPaymentModal(params.data)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                    >
                        <IndianRupee size={13} /> Pay
                    </button>
                </div>
            ),
        },
    ], [currentPage, perPage, theme.primaryGradientStart])

    // ===== VIEW 2: Vendor Detail (per-site) =====
    const vendorDetailColumnDefs = useMemo(() => [
        {
            headerName: "S.No",
            width: 80,
            valueGetter: (params) => (params.node.rowIndex ?? 0) + 1,
            sortable: false,
        },
        {
            headerName: "Site Name",
            field: "site_name",
            flex: 1,
            minWidth: 200,
        },
        {
            headerName: "Material Billed",
            field: "material_billed",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Material Paid",
            field: "material_paid",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Labour Billed",
            field: "labour_billed",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Labour Paid",
            field: "labour_paid",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Total Billed",
            field: "total_billed",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Total Paid",
            field: "total_paid",
            width: 130,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Balance",
            field: "total_balance",
            width: 130,
            cellRenderer: (params) => {
                const val = Number(params.value) || 0
                const color = val > 0 ? "text-red-600" : "text-green-600"
                return <span className={`font-medium ${color}`}>{formatCurrency(val)}</span>
            },
        },
        {
            headerName: "Actions",
            width: 130,
            sortable: false,
            cellRenderer: (params) => (
                <button
                    onClick={() => viewSiteInvoices(params.data)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: theme.primaryGradientStart, backgroundColor: `${theme.primaryGradientStart}15` }}
                >
                    <Eye size={14} /> View Invoices
                </button>
            ),
        },
    ], [theme.primaryGradientStart, selectedVendor])

    // ===== VIEW 3: Vendor-Site Invoices =====
    const invoiceColumnDefs = useMemo(() => [
        {
            headerName: "S.No",
            width: 80,
            valueGetter: (params) => (params.node.rowIndex ?? 0) + 1,
            sortable: false,
        },
        {
            headerName: "Type",
            field: "type",
            width: 100,
            cellRenderer: (params) => {
                const isMaterial = params.value === "Material"
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isMaterial ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                        {params.value}
                    </span>
                )
            },
        },
        {
            headerName: "Date",
            field: "date",
            width: 120,
            valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "—"),
        },
        {
            headerName: "Invoice #",
            field: "invoice_number",
            width: 130,
            valueGetter: (params) => params.data.invoice_number || "—",
        },
        {
            headerName: "Total (₹)",
            field: "total",
            width: 120,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Paid (₹)",
            field: "paid",
            width: 120,
            valueFormatter: (p) => formatCurrency(p.value),
        },
        {
            headerName: "Due (₹)",
            field: "due",
            width: 120,
            cellRenderer: (params) => {
                const val = Number(params.value) || 0
                const color = val > 0 ? "text-red-600" : "text-green-600"
                return <span className={`font-medium ${color}`}>{formatCurrency(val)}</span>
            },
        },
        {
            headerName: "Status",
            field: "status",
            width: 100,
            cellRenderer: (p) => (
                <span className={`px-2 py-1 rounded-full text-xs ${p.value === 1 || p.value === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {p.value === 1 || p.value === "Active" ? "Active" : "Inactive"}
                </span>
            ),
        },
    ], [])

    // Summary cards for View 2
    const renderSummaryCards = () => {
        if (!vendorDetail?.sites?.length) return null
        const sites = vendorDetail.sites

        const totals = sites.reduce((acc, s) => ({
            total_material_billed: acc.total_material_billed + (s.material_billed || 0),
            total_material_paid:   acc.total_material_paid   + (s.material_paid   || 0),
            total_labour_billed:   acc.total_labour_billed   + (s.labour_billed   || 0),
            total_labour_paid:     acc.total_labour_paid     + (s.labour_paid     || 0),
            grand_total_billed:    acc.grand_total_billed    + (s.total_billed    || 0),
            total_balance:         acc.total_balance         + (s.total_balance   || 0),
        }), {
            total_material_billed: 0, total_material_paid: 0,
            total_labour_billed: 0,   total_labour_paid: 0,
            grand_total_billed: 0,    total_balance: 0,
        })

        const cards = [
            { label: "Total Material Billed", value: totals.total_material_billed, color: "blue" },
            { label: "Total Material Paid",   value: totals.total_material_paid,   color: "blue" },
            { label: "Total Labour Billed",   value: totals.total_labour_billed,   color: "purple" },
            { label: "Total Labour Paid",     value: totals.total_labour_paid,     color: "purple" },
            { label: "Grand Total",           value: totals.grand_total_billed,    color: "green" },
            { label: "Balance",               value: totals.total_balance,         color: "red" },
        ]

        const colorMap = {
            blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
            purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
            green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
            red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {cards.map((card, index) => {
                    const colors = colorMap[card.color]
                    return (
                        <div
                            key={index}
                            className={`${colors.bg} ${colors.border} border rounded-xl p-4`}
                        >
                            <div className="text-xs font-medium text-gray-500 mb-1">{card.label}</div>
                            <div className={`text-lg font-bold ${colors.text}`}>
                                {formatCurrency(card.value)}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // Breadcrumb
    const renderBreadcrumb = () => {
        const crumbs = [
            { label: "Home", href: "/dashboard" },
            { label: "Vendor Summary", onClick: view !== 'list' ? () => { setView('list'); setVendorDetail(null); setSelectedVendor(null); setSiteInvoices(null); setSelectedSite(null); } : null },
        ]

        if (view === 'detail' && selectedVendor) {
            crumbs.push({ label: selectedVendor.vendor_name, active: true })
        }

        if (view === 'invoices' && selectedVendor && selectedSite) {
            crumbs.push({
                label: selectedVendor.vendor_name,
                onClick: () => { setView('detail'); setSiteInvoices(null); setSelectedSite(null); }
            })
            crumbs.push({ label: selectedSite.site_name, active: true })
        }

        return (
            <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                <ol className="flex items-center">
                    {crumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <li className="flex items-center">
                                    <ChevronRight className="h-4 w-4 mx-1" />
                                </li>
                            )}
                            <li>
                                {crumb.active ? (
                                    <span style={{ color: theme.primaryGradientStart }} className="font-medium">
                                        {crumb.label}
                                    </span>
                                ) : crumb.onClick ? (
                                    <button onClick={crumb.onClick} className="hover:text-blue-600 transition-colors">
                                        {crumb.label}
                                    </button>
                                ) : crumb.href ? (
                                    <a href={crumb.href} className="hover:text-blue-600 transition-colors">
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span style={{ color: theme.primaryGradientStart }} className="font-medium">
                                        {crumb.label}
                                    </span>
                                )}
                            </li>
                        </React.Fragment>
                    ))}
                </ol>
            </nav>
        )
    }

    // Page title
    const getTitle = () => {
        if (view === 'invoices' && selectedVendor && selectedSite) {
            return `Invoices - ${selectedVendor.vendor_name} @ ${selectedSite.site_name}`
        }
        if (view === 'detail' && selectedVendor) {
            return `Vendor Detail - ${selectedVendor.vendor_name}`
        }
        return "Vendor Summary"
    }

    // AG Grid theme config
    const gridTheme = useMemo(() => themeQuartz.withParams({
        spacing: 7,
        headerHeight: 45,
        headerFontSize: 16,
        fontSize: 13,
        headerTextColor: "white",
        paginationPanelHeight: 50,
    }), [])

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <div className="flex items-center gap-3 flex-1">
                    {view !== 'list' && (
                        <button
                            onClick={goBack}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold max-sm:text-xl">{getTitle()}</h1>
                </div>
                {renderBreadcrumb()}
            </div>

            {/* VIEW 1: All Vendors Summary */}
            {view === 'list' && (
                <>
                    <div className="mb-4 rounded-lg w-full">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                            <div className="w-full sm:w-1/3">
                                <ThemeUI.Input
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder={placeholder}
                                    leftElement={<Search size={16} className="text-gray-400" />}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                        <AgGridReact
                            className="custom-ag-grid"
                            domLayout="autoHeight"
                            theme={gridTheme}
                            defaultColDef={{ resizable: false }}
                            rowData={vendors}
                            rowHeight={55}
                            columnDefs={vendorListColumnDefs}
                            pagination
                            paginationPageSize={10}
                            paginationPageSizeSelector={[10, 20, 50, 100]}
                            suppressPaginationPanel={false}
                            noRowsOverlayComponent={NoRowsOverlay}
                            noRowsOverlayComponentParams={{ text: "No Vendor Summary Data Found" }}
                            onPaginationChanged={(params) => {
                                if (params.api) {
                                    const newPage = params.api.paginationGetCurrentPage() + 1
                                    const newSize = params.api.paginationGetPageSize()
                                    if (newPage !== currentPage) setCurrentPage(newPage)
                                    if (newSize !== perPage) {
                                        setPerPage(newSize)
                                        setCurrentPage(1)
                                    }
                                }
                            }}
                        />
                    </div>
                </>
            )}

            {/* VIEW 2: Vendor Detail (per-site breakdown) */}
            {view === 'detail' && vendorDetail && (
                <>
                    {renderSummaryCards()}

                    <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                        <AgGridReact
                            className="custom-ag-grid"
                            domLayout="autoHeight"
                            theme={gridTheme}
                            defaultColDef={{ resizable: false }}
                            rowData={vendorDetail.sites || []}
                            rowHeight={55}
                            columnDefs={vendorDetailColumnDefs}
                            pagination
                            paginationPageSize={10}
                            paginationPageSizeSelector={[10, 20, 50, 100]}
                            suppressPaginationPanel={false}
                            noRowsOverlayComponent={NoRowsOverlay}
                            noRowsOverlayComponentParams={{ text: "No Site Data Found for This Vendor" }}
                        />
                    </div>
                </>
            )}

            {/* VIEW 3: Vendor-Site Invoices */}
            {view === 'invoices' && siteInvoices && (
                <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                    <AgGridReact
                        className="custom-ag-grid"
                        domLayout="autoHeight"
                        theme={gridTheme}
                        defaultColDef={{ resizable: false }}
                        rowData={siteInvoices.invoices || []}
                        rowHeight={55}
                        columnDefs={invoiceColumnDefs}
                        pagination
                        paginationPageSize={10}
                        paginationPageSizeSelector={[10, 20, 50, 100]}
                        suppressPaginationPanel={false}
                        noRowsOverlayComponent={NoRowsOverlay}
                        noRowsOverlayComponentParams={{ text: "No Invoices Found for This Vendor-Site Combination" }}
                    />
                </div>
            )}

            {paymentModalOpen && paymentVendor && (() => {
                const hasOutstanding = Number(paymentVendor.total_balance) > 0
                const modeLabels = { advance: 'Advance Payment', additional: 'Additional Payment' }

                return (
                    <Modal
                        isOpen={paymentModalOpen}
                        onClose={() => setPaymentModalOpen(false)}
                        title={`Make Payment — ${paymentVendor.vendor_name}`}
                        size={paymentTab === 'split' ? 'xl' : 'md'}
                    >
                        <div className="space-y-4">
                            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex justify-between items-center">
                                <span className="text-sm text-gray-600">Outstanding Balance</span>
                                <span className={`text-sm font-semibold ${hasOutstanding ? "text-red-600" : "text-green-600"}`}>
                                    {formatCurrency(paymentVendor.total_balance)}
                                </span>
                            </div>

                            {/* Tab switcher — only meaningful when there's an existing balance to pay off */}
                            {hasOutstanding && (
                                <div className="flex gap-2 border-b border-gray-200">
                                    <button
                                        onClick={() => setPaymentTab('standard')}
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                            paymentTab === 'standard'
                                                ? "border-current"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                        style={paymentTab === 'standard' ? { color: theme.primaryGradientStart, borderColor: theme.primaryGradientStart } : undefined}
                                    >
                                        Standard Payment
                                    </button>
                                    <button
                                        onClick={() => setPaymentTab('split')}
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                                            paymentTab === 'split'
                                                ? "border-current"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                        style={paymentTab === 'split' ? { color: theme.primaryGradientStart, borderColor: theme.primaryGradientStart } : undefined}
                                    >
                                        <Layers size={14} /> Advance / Additional Payment
                                    </button>
                                </div>
                            )}

                            {/* ===== STANDARD TAB — pay down existing outstanding invoices ===== */}
                            {paymentTab === 'standard' && (
                                <div className="space-y-4">
                                    <ThemeUI.FormField label="Payment Amount (₹)" required>
                                        <ThemeUI.Input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </ThemeUI.FormField>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <ThemeUI.Button
                                            onClick={() => setPaymentModalOpen(false)}
                                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                                        >
                                            Cancel
                                        </ThemeUI.Button>
                                        <ThemeUI.Button
                                            onClick={handlePaymentSubmit}
                                            loading={paymentLoading}
                                            gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                                            direction={theme.gradientDirection}
                                        >
                                            {paymentLoading
                                                ? <><Loader size={14} className="mr-2 animate-spin" /> Processing...</>
                                                : 'Confirm Payment'
                                            }
                                        </ThemeUI.Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== SPLIT TAB — Advance / Additional Payment, split across sites ===== */}
                            {paymentTab === 'split' && (
                                <div className="space-y-5">
                                    {/* 1. Payment Mode */}
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                            1. Payment Mode <span className="text-gray-400 font-normal">(select one or more)</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                { key: 'advance', label: 'Advance Payment', desc: 'Payment made in advance before a regular invoice.' },
                                                { key: 'additional', label: 'Additional Payment', desc: 'Payment greater than the total billed amount.' },
                                            ].map(mode => {
                                                const active = splitPaymentTypes.includes(mode.key)
                                                return (
                                                    <button
                                                        key={mode.key}
                                                        type="button"
                                                        onClick={() => togglePaymentType(mode.key)}
                                                        className={`text-left p-3 rounded-lg border-2 transition-colors ${
                                                            active ? "bg-opacity-5" : "border-gray-200 hover:border-gray-300"
                                                        }`}
                                                        style={active ? { borderColor: theme.primaryGradientStart, backgroundColor: `${theme.primaryGradientStart}0d` } : undefined}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-semibold text-gray-800">{mode.label}</span>
                                                            {active
                                                                ? <CheckCircle2 size={18} style={{ color: theme.primaryGradientStart }} />
                                                                : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
                                                            }
                                                        </div>
                                                        <p className="text-xs text-gray-500">{mode.desc}</p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {splitPaymentTypes.length > 0 && (
                                            <div className="mt-2 text-xs rounded-md px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100">
                                                Selected payment modes will be mentioned in the invoice notes.
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Payment Details */}
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">2. Payment Details</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <ThemeUI.FormField label="Payment Amount (₹)" required>
                                                <ThemeUI.Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={splitAmount}
                                                    onChange={(e) => setSplitAmount(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </ThemeUI.FormField>
                                            <ThemeUI.FormField label="Payment Date" required>
                                                <ThemeUI.Input
                                                    type="date"
                                                    value={splitDate}
                                                    onChange={(e) => setSplitDate(e.target.value)}
                                                />
                                            </ThemeUI.FormField>
                                            <ThemeUI.FormField label="Payment Method" required>
                                                <ThemeUI.Select
                                                    value={splitMethod}
                                                    onChange={(val) => setSplitMethod(val)}
                                                    options={PAYMENT_METHOD_OPTIONS}
                                                    isSearchable={false}
                                                />
                                            </ThemeUI.FormField>
                                        </div>
                                        <div className="mt-3">
                                            <ThemeUI.FormField label="Reference / Notes (Optional)">
                                                <ThemeUI.Input
                                                    value={splitReference}
                                                    onChange={(e) => setSplitReference(e.target.value)}
                                                    placeholder="Enter notes or reference"
                                                />
                                            </ThemeUI.FormField>
                                        </div>
                                    </div>

                                    {/* Notes preview */}
                                    {splitNotesPreview && (
                                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                                            <div className="text-xs font-medium text-gray-500 mb-1.5">Notes that will appear in invoices (Preview)</div>
                                            {splitNotesPreview.map((line, i) => (
                                                <div key={i} className="text-xs text-gray-700">{line}</div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 3. Split across active sites */}
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                            3. Split Payment Amount ({formatCurrency(splitAmount || 0)}) to Active Sites
                                        </div>

                                        {activeSitesLoading ? (
                                            <div className="flex items-center justify-center py-6 text-sm text-gray-500 gap-2">
                                                <Loader size={16} className="animate-spin" /> Loading active sites...
                                            </div>
                                        ) : activeSites.length === 0 ? (
                                            <div className="text-sm text-gray-500 py-4 text-center">No active sites found</div>
                                        ) : (
                                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                                    {activeSites.map(site => {
                                                        const included = !!splitIncludedSites[site.id]
                                                        return (
                                                            <div key={site.id} className="flex items-center gap-3 px-3 py-2.5">
                                                                <ThemeUI.Checkbox
                                                                    id={`split-site-${site.id}`}
                                                                    name={`split-site-${site.id}`}
                                                                    checked={included}
                                                                    onChange={() => toggleSiteIncluded(site.id)}
                                                                />
                                                                <span className="flex-1 text-sm text-gray-800 truncate">{site.name}</span>
                                                                <div className="w-36">
                                                                    <ThemeUI.Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        placeholder="0.00"
                                                                        value={splitAllocations[site.id] || ''}
                                                                        onChange={(e) => updateSiteAllocation(site.id, e.target.value)}
                                                                        disabled={!included}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Invoice Type — required. Determines which invoice ledger
                                            (Material / Labour) this payment is recorded against, so
                                            Vendor Summary totals stay accurate per category. */}
                                        <div className="mt-3 border border-gray-200 rounded-lg p-3">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                Invoice Type <span className="text-red-500">*</span>
                                                <span className="text-gray-400 font-normal ml-1">(select one or more)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-5">
                                                {[
                                                    { key: 'material', label: 'Material', icon: Package },
                                                    { key: 'labour', label: 'Labour', icon: Wrench },
                                                ].map(type => {
                                                    const active = splitInvoiceTypes.includes(type.key)
                                                    const Icon = type.icon
                                                    return (
                                                        <label key={type.key} className="flex items-center gap-2 cursor-pointer">
                                                            <ThemeUI.Checkbox
                                                                id={`invoice-type-${type.key}`}
                                                                name={`invoice-type-${type.key}`}
                                                                checked={active}
                                                                onChange={() => toggleInvoiceType(type.key)}
                                                            />
                                                            <Icon size={16} className="text-gray-500" />
                                                            <span className="text-sm text-gray-800">{type.label}</span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                            {splitInvoiceTypes.length > 0 && (
                                                <div className="mt-2 text-xs rounded-md px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100">
                                                    Each selected site's amount will be recorded as a fully-paid invoice under each selected type.
                                                </div>
                                            )}
                                        </div>

                                        {/* Allocation summary */}
                                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                            <div className="rounded-lg bg-gray-50 border border-gray-200 py-2">
                                                <div className="text-[11px] text-gray-500">Total Payment Amount</div>
                                                <div className="text-sm font-semibold text-gray-800">{formatCurrency(splitAmount || 0)}</div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 border border-gray-200 py-2">
                                                <div className="text-[11px] text-gray-500">Total Allocated</div>
                                                <div className="text-sm font-semibold text-gray-800">{formatCurrency(splitTotalAllocated)}</div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 border border-gray-200 py-2">
                                                <div className="text-[11px] text-gray-500">Remaining Amount</div>
                                                <div className={`text-sm font-semibold ${Math.abs(splitRemaining) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                                                    {formatCurrency(splitRemaining)}
                                                </div>
                                            </div>
                                        </div>

                                        {splitAmount && (
                                            <div className={`mt-3 flex items-center gap-2 text-xs rounded-md px-3 py-2 ${
                                                Math.abs(splitRemaining) > 0.01
                                                    ? "bg-red-50 text-red-700 border border-red-100"
                                                    : "bg-green-50 text-green-700 border border-green-100"
                                            }`}>
                                                {Math.abs(splitRemaining) > 0.01
                                                    ? <><AlertTriangle size={14} /> Total allocated does not match the payment amount.</>
                                                    : <><CheckCircle2 size={14} /> Total allocation is equal to the payment amount.</>
                                                }
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <ThemeUI.Button
                                            onClick={() => setPaymentModalOpen(false)}
                                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                                        >
                                            Cancel
                                        </ThemeUI.Button>
                                        <ThemeUI.Button
                                            onClick={handleSplitPaymentSubmit}
                                            loading={splitLoading}
                                            gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                                            direction={theme.gradientDirection}
                                        >
                                            {splitLoading
                                                ? <><Loader size={14} className="mr-2 animate-spin" /> Processing...</>
                                                : 'Proceed'
                                            }
                                        </ThemeUI.Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )
            })()}
        </Layout>

    )
}

export default VendorSummary
