import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Plus, Trash2, Lock } from "lucide-react"
import Modal from "./modal"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./noRowsOverlay"
function Role() {
    const { theme } = useTheme()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [roles, setRoles] = useState([])
    const [editingRole, setEditingRole] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [backendErrors, setBackendErrors] = useState({})
    const [placeholder, setPlaceholder] = useState("Search by name...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const words = ["name", "role"]
    const [formData, setFormData] = useState({ name: "" })

    // Initialize permissions with safe defaults
    const [rolePermissions, setRolePermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false
    })

    // Get user permissions for the role module
    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem('userPermissions')
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr)
                if (permissions.role) {
                    return {
                        can_add: permissions.role.can_add || false,
                        can_edit: permissions.role.can_edit || false,
                        can_delete: permissions.role.can_delete || false,
                        can_view: permissions.role.can_view || false
                    }
                }
            }
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        } catch (error) {
            console.error('Error parsing user permissions:', error)
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        }
    }, [])

    // Load permissions on mount
    useEffect(() => {
        const permissions = getUserPermissions()
        setRolePermissions(permissions)
    }, [getUserPermissions])

    // Listen for permission updates
    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const permissions = getUserPermissions()
            setRolePermissions(permissions)
        }
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
        return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
    }, [getUserPermissions])

    // Fetch roles on mount and when search changes
    useEffect(() => {
        fetchRoles()
    }, [searchQuery])

    // Typing animation for placeholder
    useEffect(() => {
        const typingSpeed = isDeleting ? 50 : 100
        const pauseTime = 1500
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex]
            if (!isDeleting && currentCharIndex < currentWord.length) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
                setCurrentCharIndex((prev) => prev + 1)
            } else if (isDeleting && currentCharIndex > 0) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
                setCurrentCharIndex((prev) => prev - 1)
            } else if (!isDeleting && currentCharIndex === currentWord.length) {
                setTimeout(() => setIsDeleting(true), pauseTime)
            } else if (isDeleting && currentCharIndex === 0) {
                setIsDeleting(false)
                setCurrentWordIndex((prev) => (prev + 1) % words.length)
            }
        }, typingSpeed)
        return () => clearTimeout(timeout)
    }, [currentCharIndex, currentWordIndex, isDeleting, words])

    // Fetch roles
    const fetchRoles = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/role`, {
                params: { search: searchQuery, page: 1, limit: 1000, sortBy: 'name', sortOrder: 'ASC' }
            })
            if (response.data.success) {
                setRoles(response.data.data.roles || [])
            }
        } catch (err) {
            console.error("Error fetching roles:", err)
            toast.error(err.response?.data?.message || "Failed to fetch roles")
            setRoles([])
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery])

    // Handle add role button
    const handleAddClick = () => {
        if (!rolePermissions.can_add) {
            toast.error("You don't have permission to create roles")
            return
        }
        setEditingRole({ isNew: true })
        setFormData({ name: "" })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle edit role button
    const handleEditClick = (role) => {
        if (!rolePermissions.can_edit) {
            toast.error("You don't have permission to edit roles")
            return
        }
        if (role.is_protected) {
            toast.error(`Cannot edit '${role.name}' role. This is a system-protected role.`)
            return
        }
        setEditingRole(role)
        setFormData({ name: role.name || "" })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle save role
    const handleSaveRole = async () => {
        setIsLoading(true)
        try {
            const url = editingRole?.isNew
                ? `${import.meta.env.VITE_API_URL}/api/role`
                : `${import.meta.env.VITE_API_URL}/api/role/${editingRole.id}`
            const method = editingRole?.isNew ? "post" : "put"
            const response = await axios[method](url, { name: formData.name.trim() })
            
            if (response.data.success) {
                toast.success(editingRole?.isNew ? "Role created successfully" : "Role updated successfully")
                fetchRoles()
                handleCancelEdit()
            }
        } catch (err) {
            if (err.response?.status === 400) {
                toast.error(err.response.data.message || "Please fix the errors in the form.")
            } else if (err.response?.status === 403) {
                toast.error(err.response.data.message || "You don't have permission to perform this action")
            } else {
                toast.error(err.response?.data?.message || err.message || "Failed to save role")
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Handle delete role
    const handleDeleteClick = async (role) => {
        if (!rolePermissions.can_delete) {
            toast.error("You don't have permission to delete roles")
            return
        }
        if (role.is_protected) {
            toast.error(`Cannot delete '${role.name}' role. This is a system-protected role.`)
            return
        }
        if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return

        setIsLoading(true)
        try {
            const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/role/${role.id}`)
            if (response.data.success) {
                toast.success("Role deleted successfully")
                fetchRoles()
            }
        } catch (err) {
            if (err.response?.status === 400) {
                toast.error(err.response.data.message || "Cannot delete this role")
            } else if (err.response?.status === 403) {
                toast.error(err.response.data.message || "You don't have permission to delete this role")
            } else {
                toast.error(err.response?.data?.message || "Failed to delete role")
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingRole(null)
        setFormData({ name: "" })
        setBackendErrors({})
        setIsModalOpen(false)
    }

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Handle search
    const handleSearchChange = (e) => setSearchQuery(e.target.value)

    // AG Grid column definitions
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                width: 80,
                valueGetter: (params) => (params.node.rowIndex ?? 0) + 1,
                sortable: false,
            },
            {
                headerName: "Role Name",
                field: "name",
                sortable: true,
                minWidth: 200,
                flex: 1,
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        <span>{params.value}</span>
                        {params.data.is_protected && (
                            <Lock size={14} className="text-gray-400" title="Protected Role" />
                        )}
                    </div>
                ),
            },
            {
                headerName: "Status",
                field: "is_protected",
                sortable: true,
                minWidth: 120,
                flex: 0.8,
                cellRenderer: (params) => (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                        params.value ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                    }`}>
                        {params.value ? "Protected" : "Editable"}
                    </span>
                ),
            },
            {
                headerName: "Created At",
                field: "created_at",
                sortable: true,
                minWidth: 150,
                flex: 1,
                cellRenderer: (params) => {
                    if (!params.value) return "-"
                    return new Date(params.value).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    })
                },
            },
        ]

        if (rolePermissions.can_edit || rolePermissions.can_delete) {
            baseColumns.push({
                headerName: "Actions",
                field: "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {rolePermissions.can_edit && (
                            <button
                                onClick={() => handleEditClick(params.data)}
                                className={`p-1 transition-colors ${
                                    params.data.is_protected
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-blue-600 hover:text-blue-800"
                                }`}
                                title={params.data.is_protected ? "Protected role cannot be edited" : "Edit"}
                                disabled={params.data.is_protected}
                            >
                                <Edit size={16} style={{ 
                                    color: params.data.is_protected ? undefined : theme.primaryGradientStart 
                                }} />
                            </button>
                        )}
                        {rolePermissions.can_delete && (
                            <button
                                onClick={() => handleDeleteClick(params.data)}
                                className={`p-1 transition-colors ${
                                    params.data.is_protected
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-red-600 hover:text-red-800"
                                }`}
                                title={params.data.is_protected ? "Protected role cannot be deleted" : "Delete"}
                                disabled={params.data.is_protected}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ),
                minWidth: 100,
                flex: 0.5,
                sortable: false,
            })
        }
        return baseColumns
    }, [theme.primaryGradientStart, rolePermissions])

    // Render role form
    const renderRoleForm = () => (
        <div className="space-y-6 p-4">
            <div className="grid gap-4">
                <ThemeUI.FormField label="Role Name" name="name" error={backendErrors.name} required={true}>
                    <ThemeUI.Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter role name"
                        error={backendErrors.name}
                    />
                </ThemeUI.FormField>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <ThemeUI.Button
                    type="button"
                    onClick={handleCancelEdit}
                    gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                >
                    Cancel
                </ThemeUI.Button>
                <ThemeUI.Button
                    type="button"
                    onClick={handleSaveRole}
                    disabled={isLoading}
                    gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                    direction={theme.gradientDirection}
                >
                    {isLoading ? (
                        <>
                            <Loader size={16} className="mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : editingRole?.isNew ? "Create Role" : "Update Role"}
                </ThemeUI.Button>
            </div>
        </div>
    )

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Role Management</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">Role</li>
                    </ol>
                </nav>
            </div>

            <div className="mb-4 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="w-full sm:w-1/3">
                        <ThemeUI.Input
                            id="search"
                            name="search"
                            value={searchQuery}
                            className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
                            onChange={handleSearchChange}
                            placeholder={placeholder}
                            leftElement={<Search size={16} className="text-gray-400" />}
                        />
                    </div>
                    <div className="flex flex-row max-sm:justify-end max-sm:text-sm gap-2 w-full sm:w-auto max-sm:h-10">
                        {rolePermissions.can_add && (
                            <ThemeUI.Button
                                type="button"
                                onClick={handleAddClick}
                                gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                                direction={theme.gradientDirection}
                                aria-label="Add new role"
                            >
                                <Plus size={16} className="mr-2" /> Add Role
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{
                "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
            }}>
                <AgGridReact
                    className="custom-ag-grid"
                    domLayout="autoHeight"
                    theme={themeQuartz.withParams({
                        spacing: 7,
                        headerHeight: 45,
                        headerFontSize: 16,
                        fontSize: 13,
                        headerTextColor: "white",
                    })}
                    defaultColDef={{ resizable: false, suppressSizeToFit: false }}
                    rowData={roles}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    suppressCellFocus
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Roles Found" }}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCancelEdit}
                title={editingRole?.isNew ? "Add Role" : "Edit Role"}
                size="md"
            >
                {renderRoleForm()}
            </Modal>
        </Layout>
    )
}

export default Role