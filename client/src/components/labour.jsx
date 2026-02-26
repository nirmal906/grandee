import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios";
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./modal"
import Offcanvas from "./offcanvas"
import NoRowsOverlay from "./noRowsOverlay"

function Labour() {
    const { theme } = useTheme()
    const gridRef = useRef()
    const isFetching = useRef(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [pageSize, setPageSize] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [labours, setLabours] = useState([])
    const [editingLabour, setEditingLabour] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
    const [backendErrors, setBackendErrors] = useState({})
    const [placeholder, setPlaceholder] = useState("Search by name...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const words = ["name", "rate", "status"]

    const [formData, setFormData] = useState({
        name: "",
        standard_rate: "",
        status: 1,
    })

    // Permissions for Labour module
    const [labourPermissions, setLabourPermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false,
    })

    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem('userPermissions')
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr)
                if (permissions.labour) {
                    return {
                        can_add: permissions.labour.can_add || false,
                        can_edit: permissions.labour.can_edit || false,
                        can_delete: permissions.labour.can_delete || false,
                        can_view: permissions.labour.can_view || false,
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
        const permissions = getUserPermissions()
        setLabourPermissions(permissions)
    }, [getUserPermissions])

    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const permissions = getUserPermissions()
            setLabourPermissions(permissions)
        }
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
        return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
    }, [getUserPermissions])

    // Fetch labours with the same pattern as Language component
    const fetchLabours = useCallback(async () => {
        if (isFetching.current) return // Prevent double fetching
        
        isFetching.current = true
        setIsLoading(true)
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/labour`, {
                params: {
                    page: currentPage,
                    limit: pageSize,
                    search: searchQuery,
                    status: statusFilter === "all" ? "" : statusFilter,
                    _t: Date.now() 
                },
            })
            if (response.data.success) {
                setLabours(response.data.data || [])
            } else {
                setLabours([])
            }
        } catch (err) {
            console.error("Error fetching labours:", err)
            toast.error(err.response?.data?.message || "Failed to fetch labours")
            setLabours([])
        } finally {
            setIsLoading(false)
            isFetching.current = false
        }
    }, [currentPage, pageSize, searchQuery, statusFilter])

    useEffect(() => {
        fetchLabours()
    }, [fetchLabours])

    // Pagination change handler - same as Language component
    const onPaginationChanged = useCallback((params) => {
        if (params.api) {
            const newPageSize = params.api.paginationGetPageSize()
            const newPage = params.api.paginationGetCurrentPage() + 1
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize)
                setCurrentPage(1)
            } else if (newPage !== currentPage) {
                setCurrentPage(newPage)
            }
        }
    }, [pageSize, currentPage])

    // Typing animation for placeholder
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

    const handleAddClick = () => {
        if (!labourPermissions.can_add) {
            toast.error("You don't have permission to add labour")
            return
        }
        setEditingLabour({ isNew: true })
        setFormData({ name: "", standard_rate: "", status: 1 })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    const handleEditClick = (labour) => {
        if (!labourPermissions.can_edit) {
            toast.error("You don't have permission to edit labour")
            return
        }
        setEditingLabour(labour)
        setFormData({
            name: labour.name || "",
            standard_rate: labour.standard_rate || "",
            status: labour.status,
        })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    const handleSaveLabour = async () => {
        setIsLoading(true)
        try {
            const url = editingLabour?.isNew
                ? `${import.meta.env.VITE_API_URL}/api/labour`
                : `${import.meta.env.VITE_API_URL}/api/labour/${editingLabour.id}`
            const method = editingLabour?.isNew ? "post" : "put"
            const submitData = {
                name: formData.name,
                standard_rate: formData.standard_rate,
                status: formData.status,
            }

            const response = await axios[method](url, submitData)
            if (response.data.success) {
                toast.success(editingLabour?.isNew ? "Labour created successfully" : "Labour updated successfully")
                fetchLabours()
                handleCancelEdit()
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response.data.errors) {
                setBackendErrors(err.response.data.errors)
                toast.error("Please fix the errors in the form.")
            } else {
                toast.error(err.response?.data?.message || "Failed to save labour")
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this labour?")) return
        setIsLoading(true)
        try {
            const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/labour/${id}`)
            if (response.data.success) {
                toast.success("Labour deleted successfully")
                fetchLabours()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete labour")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancelEdit = () => {
        setEditingLabour(null)
        setFormData({ name: "", standard_rate: "", status: 1 })
        setBackendErrors({})
        setIsModalOpen(false)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setBackendErrors(prev => ({ ...prev, [name]: "" }))
    }

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // AG Grid Columns with updated S.No calculation
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                width: 80,
                valueGetter: (params) => ((currentPage - 1) * pageSize) + (params.node.rowIndex ?? 0) + 1,
                sortable: false,
            },
            { headerName: "Name", field: "name", flex: 1, minWidth: 200 },
            {
                headerName: "Standard Rate",
                field: "standard_rate",
                flex: 1,
                minWidth: 150,
                valueFormatter: (params) => {
                    const value = params.value
                    return value != null ? `₹${Number(value).toFixed(2)}` : "—"
                },
            },
            {
                headerName: "Status",
                field: "status",
                minWidth: 100,
                cellRenderer: (params) => (
                    <span className={`px-2 py-1 rounded-full text-xs ${params.value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {params.value === 1 ? "Active" : "Inactive"}
                    </span>
                ),
            },
            {
                headerName: "Created By",
                field: "creator.name",
                flex: 1,
                minWidth: 150,
                valueGetter: (params) => params.data?.creator?.name || "—",
            },
            {
                headerName: "Updated By",
                field: "updater.name",
                flex: 1,
                minWidth: 150,
                valueGetter: (params) => params.data?.updater?.name || "—",
            },
        ]

        if (labourPermissions.can_edit || labourPermissions.can_delete) {
            baseColumns.push({
                headerName: "Actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {labourPermissions.can_edit && (
                            <button
                                onClick={() => handleEditClick(params.data)}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                        {labourPermissions.can_delete && (
                            <button
                                onClick={() => handleDeleteClick(params.data.id)}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ),
                minWidth: 100,
                sortable: false,
                flex: 0.5,
            })
        }

        return baseColumns
    }, [currentPage, pageSize, labourPermissions, theme])

    const renderLabourForm = () => {
        return (
            <div className="space-y-6 p-4">
                <div className="grid md:grid-cols-3 gap-4">
                    <ThemeUI.FormField label="Name" name="name" error={backendErrors.name} required>
                        <ThemeUI.Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter labour name"
                            error={backendErrors.name}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Standard Rate (₹)" name="standard_rate" error={backendErrors.standard_rate} required>
                        <ThemeUI.Input
                            name="standard_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.standard_rate}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            error={backendErrors.standard_rate}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Status" name="status">
                        <ThemeUI.Select
                            value={formData.status}
                            onChange={(opt) => setFormData(prev => ({ ...prev, status: opt?.value ?? 1 }))}
                            options={[
                                { value: 1, label: "Active" },
                                { value: 0, label: "Inactive" },
                            ]}
                            placeholder="Select status"
                        />
                    </ThemeUI.FormField>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <ThemeUI.Button onClick={handleCancelEdit} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
                        Cancel
                    </ThemeUI.Button>
                    <ThemeUI.Button
                        onClick={handleSaveLabour}
                        disabled={isLoading}
                        gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                        direction={theme.gradientDirection}
                    >
                        {isLoading ? (
                            <>
                                <Loader size={16} className="mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : editingLabour?.isNew ? (
                            "Create Labour"
                        ) : (
                            "Update Labour"
                        )}
                    </ThemeUI.Button>
                </div>
            </div>
        )
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Labour Management</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">Labour</li>
                    </ol>
                </nav>
            </div>

            {/* Search & Actions */}
            <div className="mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-1/3">
                        <ThemeUI.Input
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={placeholder}
                            leftElement={<Search size={16} className="text-gray-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <ThemeUI.Button onClick={() => setIsFilterOffcanvasOpen(true)} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
                            <Filter size={16} className="mr-2" /> Filters
                        </ThemeUI.Button>
                        {labourPermissions.can_add && (
                            <ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
                                <Plus size={16} className="mr-2" /> Add Labour
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>

            {/* AG Grid Table */}
            <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}
            >
                <AgGridReact
                    ref={gridRef}
                    className="custom-ag-grid"
                    rowData={labours}
                    columnDefs={columnDefs}
                    domLayout="autoHeight"
                    theme={themeQuartz.withParams({
                        spacing: 8,
                        headerHeight: 48,
                        headerTextColor: "white",
                        rowHeight: 50,
                        fontFamily: 'inherit'
                    })}
                    pagination={true}
                    paginationPageSize={pageSize}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    onPaginationChanged={onPaginationChanged}
                    loading={isLoading}
                    overlayLoadingTemplate={'<span class="p-4 text-gray-500">Loading...</span>'}
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Labours Found" }}
                />
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={handleCancelEdit} title={editingLabour?.isNew ? "Add Labour" : "Edit Labour"} size="full">
                {renderLabourForm()}
            </Modal>

            {/* Filter Offcanvas */}
            <Offcanvas isOpen={isFilterOffcanvasOpen} onClose={() => setIsFilterOffcanvasOpen(false)} title="Filter Options" position="right" size="md">
                <div className="space-y-4">
                    <ThemeUI.FormField label="Status Filter">
                        <ThemeUI.Select
                            value={statusFilter}
                            onChange={(opt) => {
                                setStatusFilter(opt?.value || "")
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

                    <ThemeUI.Button
                        onClick={() => {
                            setStatusFilter("")
                            setCurrentPage(1)
                        }}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                    >
                        Reset Filters
                    </ThemeUI.Button>
                </div>
            </Offcanvas>
        </Layout>
    )
}

export default Labour