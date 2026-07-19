import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Eye, History, Clock, X } from "lucide-react"
import Modal from "./modal"
import Offcanvas from "./offcanvas"
import NoRowsOverlay from "./noRowsOverlay"

// ─── helpers ───────────────────────────────────────────
const isAdminRole = (role) => ['admin', 'superadmin'].includes(role?.toLowerCase());

const APPROVAL_STATUS_STYLES = {
    pending:  'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

function LabourInvoice() {
    const { theme } = useTheme()
    const location = useLocation()

    // ── current user ──
    const currentUser = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('GrandeeAdminUser') || 'null'); }
        catch { return null; }
    }, []);
    const userRole = currentUser?.role_name || '';
    const isAdmin  = isAdminRole(userRole);

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [perPage, setPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [invoices, setInvoices] = useState([])
    const [labours, setLabours] = useState([])
    const [vendors, setVendors] = useState([])
    const [sites, setSites] = useState([])
    const [editingEntry, setEditingEntry] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [approvalFilter, setApprovalFilter] = useState("")
    const [vendorFilter, setVendorFilter] = useState("")
    const [siteFilter, setSiteFilter] = useState("")
    const [dateFromFilter, setDateFromFilter] = useState("")
    const [dateToFilter, setDateToFilter] = useState("")
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
    const [backendErrors, setBackendErrors] = useState({})
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
    const [selectedEntryHistory, setSelectedEntryHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState(null)

    // Typing animation
    const [placeholder, setPlaceholder] = useState("Search by site or vendor...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const words = ["site name", "vendor name", "labour type"]

    // Ref to prevent circular updates
    const isUpdatingRef = useRef(false)

    const emptyItem = { labour_id: "", no_of_workers: "", rate_per_worker: "" }

    const [formData, setFormData] = useState({
        site_id: "",
        vendor_id: "",
        date: "",
        debit_entry: "",
        credit_entry: "",
        notes: "",
        status: 1,
    })

    const [items, setItems] = useState([{ ...emptyItem }])

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
                if (perms.labourinvoice) {
                    return {
                        can_add: perms.labourinvoice.can_add || false,
                        can_edit: perms.labourinvoice.can_edit || false,
                        can_delete: perms.labourinvoice.can_delete || false,
                        can_view: perms.labourinvoice.can_view || false
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

    // Fetch dropdown data
    const fetchActiveSites = async () => {
        try {
            const response = await axios.get(`/api/labour-invoice/active-sites`)
            if (response.data.success) setSites(response.data.data)
        } catch (err) {
            console.error("Error fetching sites:", err)
            toast.error("Failed to load sites")
        }
    }

    const fetchActiveLabours = async () => {
        try {
            const response = await axios.get(`/api/labour-invoice/active-labours`)
            if (response.data.success) setLabours(response.data.data)
        } catch (err) {
            console.error("Error fetching labours:", err)
            toast.error("Failed to load labours")
        }
    }

    const fetchActiveVendors = async () => {
        try {
            const response = await axios.get(`/api/labour-invoice/active-vendors`)
            if (response.data.success) setVendors(response.data.data)
        } catch (err) {
            console.error("Error fetching vendors:", err)
            toast.error("Failed to load vendors")
        }
    }

    // Fetch invoices
    const fetchInvoices = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = {
                page: currentPage,
                limit: perPage,
                search: searchQuery,
                status: statusFilter === "all" ? "" : statusFilter,
                vendor_id: vendorFilter || "",
                site_id: siteFilter || "",
                date_from: dateFromFilter || "",
                date_to: dateToFilter || "",
            }
            if (isAdmin && approvalFilter) params.approval_status = approvalFilter
            const response = await axios.get(`/api/labour-invoice`, { params })
            if (response.data.success) {
                setInvoices(response.data.data)
                setTotalRows(response.data.total || 0)
            }
        } catch (err) {
            console.error("Error fetching invoices:", err)
            toast.error(err.response?.data?.message || "Failed to fetch invoices")
            setInvoices([])
            setTotalRows(0)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, perPage, searchQuery, statusFilter, approvalFilter, vendorFilter, siteFilter, dateFromFilter, dateToFilter, isAdmin])

    useEffect(() => {
        fetchActiveSites()
        fetchActiveLabours()
        fetchActiveVendors()
    }, [])

    useEffect(() => {
        fetchInvoices()
    }, [fetchInvoices])

    // Typing animation
    useEffect(() => {
        if (isPaused) {
            const timeout = setTimeout(() => setIsPaused(false), 2000)
            return () => clearTimeout(timeout)
        }

        const typingSpeed = isDeleting ? 50 : 100
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex]

            if (!isDeleting && currentCharIndex < currentWord.length) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
                setCurrentCharIndex(prev => prev + 1)
            } else if (isDeleting && currentCharIndex > 0) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
                setCurrentCharIndex(prev => prev - 1)
            } else if (!isDeleting && currentCharIndex === currentWord.length) {
                setIsPaused(true)
                setIsDeleting(true)
            } else if (isDeleting && currentCharIndex === 0) {
                setIsDeleting(false)
                setCurrentWordIndex(prev => (prev + 1) % words.length)
            }
        }, typingSpeed)

        return () => clearTimeout(timeout)
    }, [currentCharIndex, currentWordIndex, isDeleting, isPaused, words])

    // Calculate items total
    const itemsTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const workers = Number(item.no_of_workers) || 0
            const rate = Number(item.rate_per_worker) || 0
            return sum + (workers * rate)
        }, 0)
    }, [items])

    // Total amount (no additional charges for labour invoices)
    const totalAmount = useMemo(() => {
        return itemsTotal
    }, [itemsTotal])

    // Auto-calculate debit/credit (admin only)
    useEffect(() => {
        if (!isAdmin) return
        if (isUpdatingRef.current) return

        if (totalAmount === 0) {
            setFormData(prev => ({
                ...prev,
                debit_entry: "",
                credit_entry: "",
            }))
            return
        }

        const debit = Number(formData.debit_entry) || 0
        const credit = Number(formData.credit_entry) || 0

        isUpdatingRef.current = true

        if (formData.credit_entry !== "" && credit >= 0 && credit <= totalAmount) {
            const calculatedDebit = totalAmount - credit
            if (Math.abs(calculatedDebit - debit) > 0.01) {
                setFormData(prev => ({
                    ...prev,
                    debit_entry: calculatedDebit.toFixed(2),
                }))
            }
        }
        else if (formData.debit_entry !== "" && debit >= 0 && debit <= totalAmount) {
            const calculatedCredit = totalAmount - debit
            if (Math.abs(calculatedCredit - credit) > 0.01) {
                setFormData(prev => ({
                    ...prev,
                    credit_entry: calculatedCredit.toFixed(2),
                }))
            }
        }

        setTimeout(() => {
            isUpdatingRef.current = false
        }, 100)
    }, [formData.debit_entry, formData.credit_entry, totalAmount, isAdmin])

    // Item handlers
    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
        if (isAdmin) {
            setFormData(prev => ({ ...prev, debit_entry: "", credit_entry: "" }))
        }
    }

    const handleItemLabourChange = (index, selectedOption) => {
        const labourId = selectedOption?.value || ""
        setItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], labour_id: labourId }
            if (!labourId) {
                updated[index].rate_per_worker = ""
            }
            return updated
        })
        if (isAdmin) {
            setFormData(prev => ({ ...prev, debit_entry: "", credit_entry: "" }))
        }
    }

    const addItem = () => {
        setItems(prev => [...prev, { ...emptyItem }])
    }

    const removeItem = (index) => {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== index))
        if (isAdmin) {
            setFormData(prev => ({ ...prev, debit_entry: "", credit_entry: "" }))
        }
    }

    // History
    const handleViewHistory = async (entry) => {
        setSelectedEntry(entry)
        setIsHistoryModalOpen(true)
        setHistoryLoading(true)
        try {
            const response = await axios.get(`/api/labour-invoice/${entry.id}/history`)
            if (response.data.success) {
                setSelectedEntryHistory(response.data.data)
            }
        } catch (err) {
            console.error("Error fetching history:", err)
            toast.error("Failed to load history")
            setSelectedEntryHistory([])
        } finally {
            setHistoryLoading(false)
        }
    }

    const renderHistoryModal = () => {
        const getActionColor = (action) => {
            switch (action) {
                case 'created': return 'bg-green-100 text-green-800'
                case 'updated': return 'bg-blue-100 text-blue-800'
                case 'deleted': return 'bg-red-100 text-red-800'
                case 'item_added': return 'bg-teal-100 text-teal-800'
                case 'item_updated': return 'bg-indigo-100 text-indigo-800'
                case 'item_removed': return 'bg-orange-100 text-orange-800'
                default: return 'bg-gray-100 text-gray-800'
            }
        }

        const formatChangedFields = (changedFieldsJson) => {
            if (!changedFieldsJson) return null
            try {
                const changes = JSON.parse(changedFieldsJson)
                return Object.entries(changes).map(([field, change]) => (
                    <div key={field} className="text-xs bg-gray-50 p-2 rounded mb-1">
                        <span className="font-semibold">{field}:</span>{' '}
                        <span className="text-red-600">{String(change.from)}</span>
                        {' → '}
                        <span className="text-green-600">{String(change.to)}</span>
                    </div>
                ))
            } catch (e) {
                return null
            }
        }

        const renderSnapshotItems = (snapshotJson) => {
            if (!snapshotJson) return null
            try {
                const snapshot = JSON.parse(snapshotJson)
                if (!snapshot.items || snapshot.items.length === 0) return null
                return (
                    <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">Items:</div>
                        <div className="space-y-1">
                            {snapshot.items.map((item, i) => (
                                <div key={i} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                                    <span>{item.labour_name || `Labour #${item.labour_id}`}</span>
                                    <span>Workers: {Number(item.no_of_workers)} x ₹{Number(item.rate_per_worker).toFixed(2)} = ₹{(Number(item.no_of_workers) * Number(item.rate_per_worker)).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            } catch (e) {
                return null
            }
        }

        return (
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => {
                    setIsHistoryModalOpen(false)
                    setSelectedEntry(null)
                    setSelectedEntryHistory([])
                }}
                title={`Invoice History - #${selectedEntry?.id || ''}`}
                size="lg"
            >
                {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader className="animate-spin" size={32} />
                    </div>
                ) : selectedEntryHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No history available
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedEntryHistory.map((record) => (
                            <div
                                key={record.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {new Date(record.performed_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(record.action_type)}`}>
                                        {record.action_type.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                                    <div>
                                        <span className="text-gray-500">Performed By:</span>{' '}
                                        <span className="font-medium">
                                            {record.performer?.name || 'System'}
                                        </span>
                                    </div>
                                </div>

                                {renderSnapshotItems(record.snapshot)}

                                {record.changed_fields && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="text-sm font-medium text-gray-700 mb-2">Changes:</div>
                                        {formatChangedFields(record.changed_fields)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        )
    }

    const handleAddClick = () => {
        if (!permissions.can_add) {
            toast.error("You don't have permission to create invoice")
            return
        }
        setEditingEntry({ isNew: true })
        setFormData({
            site_id: "",
            vendor_id: "",
            date: "",
            debit_entry: "",
            credit_entry: "",
            notes: "",
            status: 1,
        })
        setItems([{ ...emptyItem }])
        setBackendErrors({})
        setIsModalOpen(true)
    }

    const handleEditClick = (entry) => {
        if (!permissions.can_edit) {
            toast.error("You don't have permission to edit invoice")
            return
        }
        // Non-admin: only pending entries
        if (!isAdmin && entry.approval_status !== 'pending') {
            toast.error('Only pending entries can be edited')
            return
        }
        setEditingEntry(entry)
        setFormData({
            site_id: entry.site_id || "",
            vendor_id: entry.vendor_id || "",
            date: entry.date ? entry.date.split('T')[0] : "",
            debit_entry: entry.debit_entry || "",
            credit_entry: entry.credit_entry || "",
            notes: entry.notes || "",
            status: entry.status === 1 ? 1 : 0,
        })
        // Populate items from entry
        if (entry.items && entry.items.length > 0) {
            setItems(entry.items.map(item => ({
                labour_id: item.labour_id || "",
                no_of_workers: item.no_of_workers || "",
                rate_per_worker: item.rate_per_worker || "",
            })))
        } else {
            setItems([{ ...emptyItem }])
        }
        setBackendErrors({})
        setIsModalOpen(true)
    }

    const handleSaveEntry = async () => {
        setIsLoading(true)
        try {
            let payload

            if (isAdmin) {
                payload = {
                    ...formData,
                    items,
                }
            } else {
                // Non-admin: limited payload (no rate, no debit/credit, no status)
                payload = {
                    site_id: formData.site_id,
                    vendor_id: formData.vendor_id,
                    date: formData.date,
                    notes: formData.notes,
                    items: items.map(item => ({
                        labour_id: item.labour_id,
                        no_of_workers: item.no_of_workers,
                    })),
                }
            }

            const url = editingEntry?.isNew
                ? `/api/labour-invoice`
                : `/api/labour-invoice/${editingEntry.id}`

            const response = await axios({
                method: editingEntry?.isNew ? "post" : "put",
                url,
                data: payload,
            })

            if (response.data.success) {
                toast.success(
                    editingEntry?.isNew
                        ? (isAdmin ? "Invoice created successfully" : "Invoice submitted for approval")
                        : "Invoice updated successfully"
                )
                fetchInvoices()
                handleCancelEdit()
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response.data.errors) {
                setBackendErrors(err.response.data.errors)
                toast.error("Please fix the errors in the form.")
            } else {
                toast.error(err.response?.data?.message || "Failed to save invoice")
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteClick = async (entry) => {
        // Non-admin: only pending entries
        if (!isAdmin && entry.approval_status !== 'pending') {
            toast.error('Only pending entries can be deleted')
            return
        }
        if (!window.confirm(`Are you sure you want to delete this invoice?`)) return

        setIsLoading(true)
        try {
            const response = await axios.delete(`/api/labour-invoice/${entry.id}`)
            if (response.data.success) {
                toast.success("Invoice deleted successfully")
                fetchInvoices()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete invoice")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancelEdit = () => {
        setEditingEntry(null)
        setFormData({
            site_id: "",
            vendor_id: "",
            date: "",
            debit_entry: "",
            credit_entry: "",
            notes: "",
            status: 1,
        })
        setItems([{ ...emptyItem }])
        setBackendErrors({})
        setIsModalOpen(false)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setBackendErrors(prev => ({ ...prev, [name]: "" }))
    }

    const handleSiteChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, site_id: selectedOption?.value || "" }))
        setBackendErrors(prev => ({ ...prev, site_id: "" }))
    }

    const handleVendorChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, vendor_id: selectedOption?.value || "" }))
        setBackendErrors(prev => ({ ...prev, vendor_id: "" }))
    }

    const handleCreditChange = (e) => {
        const value = e.target.value
        if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
            setFormData(prev => ({ ...prev, credit_entry: value, debit_entry: "" }))
            setBackendErrors(prev => ({ ...prev, credit_entry: "" }))
        }
    }

    const handleDebitChange = (e) => {
        const value = e.target.value
        if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
            setFormData(prev => ({ ...prev, debit_entry: value, credit_entry: "" }))
            setBackendErrors(prev => ({ ...prev, debit_entry: "" }))
        }
    }

    const handleStatusChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, status: selectedOption.value }))
        setBackendErrors(prev => ({ ...prev, status: "" }))
    }

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // AG Grid Columns
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                width: 80,
                valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
                sortable: false,
                pinned: 'left'
            },
            {
                headerName: "Date",
                field: "date",
                width: 120,
                valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "—")
            },
            {
                headerName: "Site",
                field: "site.name",
                valueGetter: (params) => params.data.site?.name || "-",
                sortable: true,
                flex: 1,
                minWidth: 160,
            },
            {
                headerName: "Vendor",
                field: "vendor.name",
                valueGetter: (params) => params.data.vendor?.name || "-",
                flex: 1,
                minWidth: 120,
            },
            {
                headerName: "Labour Types",
                width: 100,
                valueGetter: (params) => params.data.items?.length || 0,
            },
            {
                headerName: "Workers",
                width: 100,
                valueGetter: (params) => {
                    const items = params.data.items || []
                    return items.reduce((sum, item) => sum + (Number(item.no_of_workers) || 0), 0)
                },
            },
            {
                headerName: "Total",
                width: 120,
                valueGetter: (params) => {
                    const items = params.data.items || []
                    return items.reduce((sum, item) => {
                        return sum + (parseFloat(item.no_of_workers) || 0) * (parseFloat(item.rate_per_worker) || 0)
                    }, 0).toFixed(2)
                },
                valueFormatter: (params) => `₹${Number(params.value).toFixed(2)}`,
            },
            {
                headerName: "Paid",
                field: "credit_entry",
                width: 110,
                valueFormatter: (p) => (p.value > 0 ? `₹${Number(p.value).toFixed(2)}` : "—")
            },
            {
                headerName: "Due",
                field: "debit_entry",
                width: 110,
                valueFormatter: (p) => (p.value > 0 ? `₹${Number(p.value).toFixed(2)}` : "—")
            },
            {
                headerName: "Approval",
                field: "approval_status",
                width: 110,
                cellRenderer: (p) => (
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${APPROVAL_STATUS_STYLES[p.value] || ''}`}>
                        {p.value || '—'}
                    </span>
                ),
            },
            {
                headerName: "Rejection Reason",
                field: "rejection_reason",
                width: 140,
                valueGetter: (params) => params.data.rejection_reason || "—",
            },
            {
                headerName: "Created By",
                width: 120,
                valueGetter: (params) => params.data.creator?.name || "—",
            },
            {
                headerName: "Updated By",
                width: 120,
                valueGetter: (params) => params.data.updater?.name || "—",
            },
            {
                headerName: "Status",
                field: "status",
                width: 100,
                cellRenderer: (p) => (
                    <span className={`px-2 py-1 rounded-full text-xs ${p.value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {p.value === 1 ? "Active" : "Inactive"}
                    </span>
                ),
            }
        ]

        if (permissions.can_edit || permissions.can_delete) {
            baseColumns.push({
                headerName: "Actions",
                cellRenderer: (params) => {
                    const canEdit   = isAdmin || params.data.approval_status === 'pending';
                    const canDelete = isAdmin || params.data.approval_status === 'pending';
                    return (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleViewHistory(params.data)}
                                className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                                title="View History"
                            >
                                <History size={16} />
                            </button>
                            {permissions.can_edit && canEdit && (
                                <button
                                    onClick={() => handleEditClick(params.data)}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit"
                                >
                                    <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                                </button>
                            )}
                            {permissions.can_delete && canDelete && (
                                <button
                                    onClick={() => handleDeleteClick(params.data)}
                                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )
                },
                minWidth: 110,
                flex: 0.5,
                sortable: false,
                pinned: 'right'
            })
        }

        return baseColumns
    }, [theme.primaryGradientStart, currentPage, perPage, permissions, isAdmin])

    // Form Render
    const renderEntryForm = () => {
        return (
            <div className="space-y-6">
                {/* Non-admin info box */}
                {!isAdmin && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Your invoice will be submitted for Admin approval. Rate and payment details will be set by the Admin.
                    </div>
                )}

                {/* Header Fields */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ThemeUI.FormField label="Site" name="site_id" error={backendErrors.site_id} required>
                        <ThemeUI.Select
                            value={formData.site_id}
                            onChange={handleSiteChange}
                            options={sites.map(site => ({
                                value: site.id,
                                label: site.name
                            }))}
                            placeholder="Select site"
                            error={backendErrors.site_id}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Vendor" name="vendor_id" error={backendErrors.vendor_id}>
                        <ThemeUI.Select
                            value={formData.vendor_id}
                            onChange={handleVendorChange}
                            options={vendors.map(vendor => ({ value: vendor.id, label: vendor.name }))}
                            placeholder="Select vendor"
                            error={backendErrors.vendor_id}
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date" name="date" error={backendErrors.date} required>
                        <ThemeUI.Input
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            error={backendErrors.date}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>
                </div>

                {/* Items Table */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Invoice Items <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                            style={{ color: theme.primaryGradientStart, backgroundColor: `${theme.primaryGradientStart}15` }}
                        >
                            <Plus size={14} /> Add Item
                        </button>
                    </div>

                    {backendErrors.items && (
                        <div className="text-red-500 text-xs mb-2">{backendErrors.items}</div>
                    )}

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">Labour *</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">No. of Workers *</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                                        Rate/Worker (₹) {isAdmin ? '*' : ''}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600">Line Total</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-600 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const lineTotal = (Number(item.no_of_workers) || 0) * (Number(item.rate_per_worker) || 0)
                                    return (
                                        <tr key={index} className="border-b border-gray-100 last:border-b-0">
                                            <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                                            <td className="px-3 py-2" style={{ minWidth: 200 }}>
                                                <ThemeUI.Select
                                                    value={item.labour_id}
                                                    onChange={(selected) => handleItemLabourChange(index, selected)}
                                                    options={labours.map(l => ({
                                                        value: l.id,
                                                        label: l.name
                                                    }))}
                                                    placeholder="Select labour"
                                                    menuPortalTarget={document.body}
                                                />
                                            </td>
                                            <td className="px-3 py-2" style={{ minWidth: 120 }}>
                                                <ThemeUI.Input
                                                    type="number"
                                                    min="0"
                                                    value={item.no_of_workers}
                                                    onChange={(e) => handleItemChange(index, 'no_of_workers', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-2" style={{ minWidth: 120 }}>
                                                <ThemeUI.Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.rate_per_worker}
                                                    onChange={(e) => handleItemChange(index, 'rate_per_worker', e.target.value)}
                                                    placeholder={isAdmin ? "0.00" : "Set by admin"}
                                                    disabled={!isAdmin}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                ₹{lineTotal.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                                        title="Remove item"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-700">
                                        Items Total:
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold">
                                        ₹{itemsTotal.toFixed(2)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Admin-only: Payment & Status */}
                {isAdmin && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <ThemeUI.FormField label="Total Amount (₹)">
                            <ThemeUI.Input
                                value={`₹${totalAmount.toFixed(2)}`}
                                readOnly
                                disabled
                                className="bg-gray-100 cursor-not-allowed font-semibold"
                            />
                        </ThemeUI.FormField>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700">
                                    Paid ₹ <span className="text-red-500">*</span>
                                </label>
                                <ThemeUI.Checkbox
                                    id="paid_checkbox"
                                    name="paid_checkbox"
                                    checked={formData.credit_entry === totalAmount.toFixed(2) && totalAmount > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData(prev => ({
                                                ...prev,
                                                credit_entry: totalAmount.toFixed(2),
                                                debit_entry: "0.00"
                                            }))
                                        } else {
                                            setFormData(prev => ({
                                                ...prev,
                                                credit_entry: "",
                                                debit_entry: ""
                                            }))
                                        }
                                    }}
                                    disabled={totalAmount === 0}
                                />
                            </div>
                            <ThemeUI.Input
                                name="credit_entry"
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalAmount}
                                value={formData.credit_entry}
                                onChange={handleCreditChange}
                                placeholder="0.00"
                                error={backendErrors.credit_entry}
                                disabled={totalAmount === 0}
                            />
                            {backendErrors.credit_entry && (
                                <div className="flex items-center mt-1 text-red-500 text-xs">
                                    <span>{backendErrors.credit_entry}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700">
                                    Due ₹ <span className="text-red-500">*</span>
                                </label>
                                <ThemeUI.Checkbox
                                    id="due_checkbox"
                                    name="due_checkbox"
                                    checked={formData.debit_entry === totalAmount.toFixed(2) && totalAmount > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData(prev => ({
                                                ...prev,
                                                debit_entry: totalAmount.toFixed(2),
                                                credit_entry: "0.00"
                                            }))
                                        } else {
                                            setFormData(prev => ({
                                                ...prev,
                                                debit_entry: ""
                                            }))
                                        }
                                    }}
                                    disabled={totalAmount === 0}
                                />
                            </div>
                            <ThemeUI.Input
                                name="debit_entry"
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalAmount}
                                value={formData.debit_entry}
                                onChange={handleDebitChange}
                                placeholder="0.00"
                                error={backendErrors.debit_entry}
                                disabled={totalAmount === 0}
                            />
                            {backendErrors.debit_entry && (
                                <div className="flex items-center mt-1 text-red-500 text-xs">
                                    <span>{backendErrors.debit_entry}</span>
                                </div>
                            )}
                        </div>

                        <ThemeUI.FormField label="Status" name="status" error={backendErrors.status} required>
                            <ThemeUI.Select
                                value={formData.status}
                                onChange={handleStatusChange}
                                options={[
                                    { value: 1, label: "Active" },
                                    { value: 0, label: "Inactive" },
                                ]}
                                placeholder="Select status"
                            />
                        </ThemeUI.FormField>
                    </div>
                )}

                {/* Notes */}
                <div className="grid md:grid-cols-1 gap-4">
                    <ThemeUI.FormField label="Notes" name="notes" error={backendErrors.notes}>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Add any notes..."
                        />
                    </ThemeUI.FormField>
                </div>

                {/* Summary Bar (admin only, when total > 0) */}
                {isAdmin && totalAmount > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Items Total:</span>
                                    <span className="font-semibold text-slate-900">
                                        ₹{itemsTotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="font-semibold text-blue-700">
                                        ₹{totalAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Paid:</span>
                                    <span className="font-semibold text-green-700">
                                        ₹{Number(formData.credit_entry || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Due:</span>
                                    <span className="font-semibold text-red-700">
                                        ₹{Number(formData.debit_entry || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            {Math.abs(
                                (Number(formData.debit_entry || 0) + Number(formData.credit_entry || 0)) -
                                totalAmount
                            ) > 0.01 && (
                                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-100 px-3 py-1.5 rounded-full">
                                    Amount mismatch
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <ThemeUI.Button
                        onClick={handleCancelEdit}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                    >
                        Cancel
                    </ThemeUI.Button>
                    <ThemeUI.Button
                        onClick={handleSaveEntry}
                        disabled={isLoading}
                        gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                        direction={theme.gradientDirection}
                    >
                        {isLoading ? (
                            <>
                                <Loader size={16} className="mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : editingEntry?.isNew ? (
                            isAdmin ? "Create Invoice" : "Submit for Approval"
                        ) : (
                            "Update Entry"
                        )}
                    </ThemeUI.Button>
                </div>
            </div>
        )
    }

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Labour Invoice Management</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Labour Invoices
                        </li>
                    </ol>
                </nav>
            </div>

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
                    <div className="flex flex-row max-sm:justify-between gap-2 w-full sm:w-auto">
                        <ThemeUI.Button
                            onClick={() => setIsFilterOffcanvasOpen(true)}
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        >
                            <Filter size={16} className="mr-2" /> Filters
                        </ThemeUI.Button>
                        {permissions.can_add && (
                            <ThemeUI.Button
                                onClick={handleAddClick}
                                gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                                direction={theme.gradientDirection}
                            >
                                <Plus size={16} className="mr-2" /> Add Invoice
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                <AgGridReact
                    className="custom-ag-grid"
                    domLayout="autoHeight"
                    theme={themeQuartz.withParams({
                        spacing: 7,
                        headerHeight: 45,
                        headerFontSize: 16,
                        fontSize: 13,
                        headerTextColor: "white",
                        paginationPanelHeight: 50,
                    })}
                    defaultColDef={{ resizable: false }}
                    rowData={invoices}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    pagination
                    paginationPageSize={10}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    suppressPaginationPanel={false}
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Labour Invoices Found" }}
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

            <Modal
                isOpen={isModalOpen}
                onClose={handleCancelEdit}
                title={editingEntry?.isNew ? "Add Labour Invoice" : "Edit Labour Invoice"}
                size="full"
            >
                {renderEntryForm()}
            </Modal>

            <Offcanvas
                isOpen={isFilterOffcanvasOpen}
                onClose={() => setIsFilterOffcanvasOpen(false)}
                title="Filter Options"
                position="right"
                size="md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Site Filter">
                        <ThemeUI.Select
                            value={siteFilter}
                            onChange={(selected) => {
                                setSiteFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options={sites.map(site => ({
                                value: site.id,
                                label: site.name
                            }))}
                            placeholder="All sites"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Vendor Filter">
                        <ThemeUI.Select
                            value={vendorFilter}
                            onChange={(selected) => {
                                setVendorFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options={vendors.map(vendor => ({
                                value: vendor.id,
                                label: vendor.name
                            }))}
                            placeholder="All vendors"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Status Filter">
                        <ThemeUI.Select
                            value={statusFilter ? { value: statusFilter, label: statusFilter === "1" ? "Active" : "Inactive" } : null}
                            onChange={(selected) => {
                                setStatusFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options={[
                                { value: "1", label: "Active" },
                                { value: "0", label: "Inactive" },
                            ]}
                            placeholder="All statuses"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    {isAdmin && (
                        <ThemeUI.FormField label="Approval Status">
                            <ThemeUI.Select
                                value={approvalFilter ? { value: approvalFilter, label: approvalFilter.charAt(0).toUpperCase() + approvalFilter.slice(1) } : null}
                                onChange={(selected) => {
                                    setApprovalFilter(selected?.value || "")
                                    setCurrentPage(1)
                                }}
                                options={[
                                    { value: "pending", label: "Pending" },
                                    { value: "approved", label: "Approved" },
                                    { value: "rejected", label: "Rejected" },
                                ]}
                                placeholder="All statuses"
                                isClearable
                            />
                        </ThemeUI.FormField>
                    )}

                    <ThemeUI.FormField label="Date From">
                        <ThemeUI.Input
                            type="date"
                            value={dateFromFilter}
                            onChange={(e) => {
                                setDateFromFilter(e.target.value)
                                setCurrentPage(1)
                            }}
                            max={dateToFilter || new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date To">
                        <ThemeUI.Input
                            type="date"
                            value={dateToFilter}
                            onChange={(e) => {
                                setDateToFilter(e.target.value)
                                setCurrentPage(1)
                            }}
                            min={dateFromFilter}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <div className="flex gap-2 pt-4">
                        <ThemeUI.Button
                            onClick={() => {
                                setStatusFilter("")
                                setApprovalFilter("")
                                setVendorFilter("")
                                setSiteFilter("")
                                setDateFromFilter("")
                                setDateToFilter("")
                                setCurrentPage(1)
                                setIsFilterOffcanvasOpen(false)
                            }}
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                            className="flex-1"
                        >
                            Reset Filters
                        </ThemeUI.Button>
                        <ThemeUI.Button
                            onClick={() => setIsFilterOffcanvasOpen(false)}
                            gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                            className="flex-1"
                        >
                            Apply Filters
                        </ThemeUI.Button>
                    </div>
                </div>
            </Offcanvas>
            {renderHistoryModal()}
        </Layout>
    )
}

export default LabourInvoice
