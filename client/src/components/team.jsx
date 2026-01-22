import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import DataTable from "react-data-table-component"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
function Team() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [users, setUsers] = useState([])
	const [roles, setRoles] = useState([])
	const [editingUser, setEditingUser] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [roleFilter, setRoleFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["name", "email", "mobile", "role", "status"]
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		mobile: "",
		gender: "Male",
		password: "",
		status: 1,
		role: "",
	})

	// Initialize permissions with safe defaults
	const [teamPermissions, setTeamPermissions]         = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the team module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.team){
					return {
						can_add     : permissions.team.can_add || false,
						can_edit    : permissions.team.can_edit || false,
						can_delete  : permissions.team.can_delete || false,
						can_view    : permissions.team.can_view || false
					}
				}
			}
			return{
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return {
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}
	}, [])

	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setTeamPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setTeamPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch roles on mount
	useEffect(() => {
		fetchRoles()
	}, [])

	// Fetch users on mount and when pagination/search/filter changes
	useEffect(() => {
		fetchUsers(currentPage, perPage, searchQuery, statusFilter, roleFilter)
	}, [currentPage, perPage, searchQuery, statusFilter, roleFilter])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
		const currentWord = words[currentWordIndex]
		if (!isDeleting && currentCharIndex < currentWord.length) {
			setPlaceholder(
			`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`
			)
			setCurrentCharIndex((prev) => prev + 1)
		} else if (isDeleting && currentCharIndex > 0) {
			setPlaceholder(
			`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`
			)
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

	// Fetch available roles
	const fetchRoles = async () => {
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/api/team/roles`
		)
		if (response.data.success) {
			setRoles(response.data.data)
		}
		} catch (err) {
		console.error("Error fetching roles:", err)
		toast.error("Failed to fetch roles")
		}
	}

	// Memoized fetch function to prevent unnecessary re-renders
	const fetchUsers = useCallback(async () => {
		setIsLoading(true)
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/api/team`,
			{
			params: {
				page: currentPage,
				limit: perPage,
				search: searchQuery,
				status: statusFilter === "all" ? "" : statusFilter,
				role: roleFilter === "all" ? "" : roleFilter,
			},
			}
		)
		if (response.data.success) {
			setUsers(response.data.data)
			setTotalRows(response.data.total || 0)
		}
		} catch (err) {
		console.error("Error fetching users:", err)
		toast.error(err.response?.data?.message || "Failed to fetch users")
		setUsers([])
		setTotalRows(0)
		} finally {
		setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, roleFilter])

	// Handle add user button
	const handleAddClick = () => {
		if(!teamPermissions.can_add){
			toast.error("You don't have permission to create team")
			return
		}
		setEditingUser({ isNew: true })
		setFormData({
		name: "",
		email: "",
		mobile: "",
		gender: "Male",
		password: "",
		status: 1,
		role: "",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle edit user button
	const handleEditClick = (user) => {
		if (!teamPermissions.can_edit) {
			toast.error("You don't have permission to edit team")
			return
		}
		setEditingUser(user)
		setFormData({
		name: user.name || "",
		email: user.email || "",
		mobile: user.mobile || "",
		gender: user.gender || "Male",
		password: "",
		status: user.status === 1 || user.status === "1" ? 1 : 0,
		role:
			user.UserRoles && user.UserRoles.length > 0
			? user.UserRoles[0].role_id
			: "",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle save user
	const handleSaveUser = async () => {
		setIsLoading(true)
		try {
		const url = editingUser?.isNew
			? `${import.meta.env.VITE_API_URL}/api/team`
			: `${import.meta.env.VITE_API_URL}/api/team/${editingUser.id}`
		const method = editingUser?.isNew ? "post" : "put"
		const submitData = {
			name: formData.name,
			email: formData.email,
			mobile: formData.mobile,
			gender: formData.gender,
			password: formData.password || undefined,
			status: formData.status,
			role: formData.role,
		}
		const response = await axios[method](url, submitData)
		if (response.data.success) {
			toast.success(
			editingUser?.isNew
				? "Team member created successfully"
				: "Team member updated successfully"
			)
			fetchUsers(currentPage, perPage, searchQuery, statusFilter, roleFilter)
			handleCancelEdit()
		}
		} catch (err) {
		if (err.response?.status === 400 && err.response.data.errors) {
			setBackendErrors(err.response.data.errors)
			toast.error("Please fix the errors in the form.")
		} else {
			toast.error(
			err.response?.data?.message || err.message || "Failed to save user"
			)
		}
		} finally {
		setIsLoading(false)
		}
	}

	// Handle delete user
	const handleDeleteClick = async (user) => {
		if (
		!window.confirm(
			`Are you sure you want to delete team member ${user.name}?`
		)
		)
		return
		setIsLoading(true)
		try {
		const response = await axios.delete(
			`${import.meta.env.VITE_API_URL}/api/team/${user.id}`
		)
		if (response.data.success) {
			toast.success("Team member deleted successfully")
			fetchUsers(currentPage, perPage, searchQuery, statusFilter, roleFilter)
		}
		} catch (err) {
		toast.error(err.response?.data?.message || "Failed to delete user")
		console.error("handleDeleteClick error:", err)
		} finally {
		setIsLoading(false)
		}
	}

	// Handle cancel edit
	const handleCancelEdit = () => {
		setEditingUser(null)
		setFormData({
		name: "",
		email: "",
		mobile: "",
		gender: "Male",
		password: "",
		status: 1,
		role: "",
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	// Handle input change
	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
		...prev,
		[name]: value,
		}))
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
	}

	// Handle status change
	const handleStatusChange = (selectedOption) => {
		setFormData((prev) => ({
		...prev,
		status: selectedOption.value,
		}))
		setBackendErrors((prev) => ({ ...prev, status: "" }))
	}

	// Handle gender change
	const handleGenderChange = (selectedOption) => {
		setFormData((prev) => ({
		...prev,
		gender: selectedOption.value,
		}))
		setBackendErrors((prev) => ({ ...prev, gender: "" }))
	}

	// Handle search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Handle pagination
	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// Get role names for display
	const getRoleNames = (userRoles) => {
		if (!userRoles || userRoles.length === 0) return "No Role"
		return userRoles
		.map((ur) => ur.Role?.name)
		.filter(Boolean)
		.join(", ")
	}

   	// DataTable columns - with conditional Actions column
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                width: 80,
                valueGetter: (params) =>
                    (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
                sortable: false,
            },
            {
                headerName: "Name",
                field: "name",
                sortable: true,
                minWidth: 100,
                flex: 1,
            },
            {
                headerName: "Email",
                field: "email",
                sortable: true,
                minWidth: 200,
                flex: 1,
            },
            {
                headerName: "Mobile",
                field: "mobile",
                sortable: true,
                minWidth: 100,
                flex: 1, 
            },
            {
                headerName: "Gender",
                field: "gender",
                sortable: true,
                minWidth: 90,
                flex: 1,
            },
            {
                headerName: "Roles",
                field: "UserRoles",
                minWidth: 100,
                flex: 1,
                cellRenderer: (params) => (
                    <div className="flex flex-wrap gap-1">
                    {params.value && params.value.length > 0 ? (
                        params.value.map((ur, index) => (
                        <span key={index}>{ur.Role?.name}</span>
                        ))
                    ) : (
                        <span className="text-gray-500 text-xs">No Role</span>
                    )}
                    </div>
                ),
            },
            {
                headerName: "Status",
                field: "status",
                sortable: true,
                minWidth: 100,
                flex: 1,
                cellRenderer: (params) => (
                    <span
                    className={`px-2 py-1 rounded-full text-xs ${
                        params.value === 1
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                    >
                    {params.value === 1 ? "Active" : "Inactive"}
                    </span>
                ),
		    },
        ]
        // Only add Actions column if user has edit or delete permission
        if(teamPermissions.can_edit || teamPermissions.can_delete){
            baseColumns.push({
                headerName  : "Actions",
                field       : "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {teamPermissions.can_edit && (
                            <button
                                onClick   = {() => handleEditClick(params.data)}
                                className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title     = "Edit"
                            >
                                <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                            </button>
                        )}
                        {teamPermissions.can_delete && (
                            <button
                                onClick   = {() => handleDeleteClick(params.data.id)}
                                className = "p-1 text-red-600 hover:text-red-800 transition-colors"
                                title     = "Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ),
                minWidth    : 100,
                flex        : 0.5,
                sortable    : false,
            })
        }
        return baseColumns
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, teamPermissions, handleEditClick, handleDeleteClick])

	// Render user form
	const renderUserForm = () => {
		return (
		<div className="space-y-6 p-4">
			<div className="grid md:grid-cols-4 gap-4">
			<ThemeUI.FormField
				label="Name"
				name="name"
				error={backendErrors.name}
				required={true}
			>
				<ThemeUI.Input
				id="name"
				name="name"
				value={formData.name}
				onChange={handleInputChange}
				placeholder="Enter name"
				error={backendErrors.name}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Email"
				name="email"
				error={backendErrors.email}
				required={true}
			>
				<ThemeUI.Input
				id="email"
				name="email"
				type="email"
				value={formData.email}
				onChange={handleInputChange}
				placeholder="Enter email"
				error={backendErrors.email}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Mobile"
				name="mobile"
				error={backendErrors.mobile}
				required={true}
			>
				<ThemeUI.Input
				id="mobile"
				name="mobile"
				value={formData.mobile}
				onChange={handleInputChange}
				placeholder="Enter mobile number"
				error={backendErrors.mobile}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Gender"
				name="gender"
				error={backendErrors.gender}
				required={true}
			>
				<ThemeUI.Select
				id="gender"
				name="gender"
				value={formData.gender}
				onChange={handleGenderChange}
				options={[
					{ value: "Male", label: "Male" },
					{ value: "Female", label: "Female" },
					{ value: "Others", label: "Others" },
				]}
				placeholder="Select gender"
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Role"
				name="role"
				error={backendErrors.role}
				required={true}
			>
				<ThemeUI.Select
				id="role"
				name="role"
				value={formData.role}
				onChange={(selectedOption) => {
					setFormData((prev) => ({
					...prev,
					role: selectedOption?.value || "",
					}))
					setBackendErrors((prev) => ({ ...prev, role: "" }))
				}}
				options={roles.map((role) => ({
					value: role.id,
					label: role.name,
				}))}
				placeholder="Select role"
				error={backendErrors.role}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Password"
				name="password"
				error={backendErrors.password}
				required={editingUser?.isNew}
			>
				<ThemeUI.Input
				id="password"
				name="password"
				type="password"
				value={formData.password}
				onChange={handleInputChange}
				placeholder={
					editingUser?.isNew
					? "Enter password"
					: "Enter new password (optional)"
				}
				error={backendErrors.password}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Status"
				name="status"
				error={backendErrors.status}
				required={true}
			>
				<ThemeUI.Select
				id="status"
				name="status"
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
			<div className="flex justify-end gap-3 pt-4">
			<ThemeUI.Button
				type="button"
				onClick={handleCancelEdit}
				gradientColors={{
				start: theme.secondaryGradientStart,
				end: theme.secondaryGradientEnd,
				}}
			>
				Cancel
			</ThemeUI.Button>
			<ThemeUI.Button
				type="button"
				onClick={handleSaveUser}
				disabled={isLoading}
				gradientColors={{
				start: theme.primaryGradientStart,
				end: theme.primaryGradientEnd,
				}}
				direction={theme.gradientDirection}
			>
				{isLoading ? (
				<>
					<Loader size={16} className="mr-2 animate-spin" />
					Saving...
				</>
				) : editingUser?.isNew ? (
				"Create Team Member"
				) : (
				"Update Team Member"
				)}
			</ThemeUI.Button>
			</div>
		</div>
		)
	}

	return (
		<Layout>
		{/* Header and breadcrumb */}
		<div className="flex items-center mb-4">
			<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
			Team Management
			</h1>
			<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
			<ol className="flex items-center">
				<li>
				<a
					href="/dashboard"
					className="hover:text-blue-600 transition-colors"
				>
					Home
				</a>
				</li>
				<li className="flex items-center">
				<ChevronRight className="h-4 w-4 mx-1" />
				</li>
				<li
				style={{ color: theme.primaryGradientStart }}
				className="font-medium"
				>
				Team
				</li>
			</ol>
			</nav>
		</div>
		{/* Search and filter controls */}
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
			<div className="flex flex-row max-sm:justify-between max-sm:text-sm gap-2 w-full sm:w-auto max-sm:h-10">
				<ThemeUI.Button
				type="button"
				onClick={() => setIsFilterOffcanvasOpen(true)}
				gradientColors={{
					start: theme.secondaryGradientStart,
					end: theme.secondaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				aria-label="Open filter options"
				>
				<Filter size={16} className="mr-2" /> Filters
				</ThemeUI.Button>
				{teamPermissions.can_add && (
					<ThemeUI.Button
					type="button"
					onClick={handleAddClick}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					aria-label="Add new team member"
					>
						<Plus size={16} className="mr-2" /> Add Team Member
					</ThemeUI.Button>
				)}
			</div>
			</div>
		</div>
		{/* Datatable controls */}
		<div
			style={{
			"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
			}}
		>
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
			defaultColDef={{
				resizable: false,
				suppressSizeToFit: false,
			}}
			rowData={users}
			rowHeight={55}
			columnDefs={columnDefs}
			pagination
			paginationPageSize={10}
			paginationPageSizeSelector={[10, 20, 50, 100]}
			paginationNumberFormatter={(params) => `${params.value}`}
			suppressCellFocus
			suppressPaginationPanel={false}
			noRowsOverlayComponent={NoRowsOverlay}
			noRowsOverlayComponentParams={{ text: "No Passengers Found" }}
			onPaginationChanged={(params) => {
				if (params.api) {
				const newPage = params.api.paginationGetCurrentPage() + 1
				handlePageChange(newPage)
				}
			}}
			/>
		</div>
		{/* Modal */}
		<Modal
			isOpen={isModalOpen}
			onClose={handleCancelEdit}
			title={editingUser?.isNew ? "Add Team Member" : "Edit Team Member"}
			size="full"
		>
			{renderUserForm()}
		</Modal>
		{/* Offcanvas */}
		<Offcanvas
			isOpen={isFilterOffcanvasOpen}
			onClose={() => setIsFilterOffcanvasOpen(false)}
			title="Filter Options"
			position="right"
			size="md"
		>
			<div className="space-y-4">
			<ThemeUI.FormField label="Status Filter">
				<ThemeUI.Select
				value={
					statusFilter
					? {
						value: statusFilter,
						label: statusFilter === "1" ? "Active" : "Inactive",
						}
					: null
				}
				onChange={(selected) => {
					setStatusFilter(selected?.value || "")
					setCurrentPage(1) // Reset to first page when filter changes
				}}
				options={[
					{ value: "1", label: "Active" },
					{ value: "0", label: "Inactive" },
				]}
				placeholder="Filter by status"
				isClearable={true}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Role Filter">
				<ThemeUI.Select
				value={
					roleFilter
					? roles.find((role) => role.name === roleFilter)
						? { value: roleFilter, label: roleFilter }
						: null
					: null
				}
				onChange={(selectedOption) => {
					setRoleFilter(selectedOption?.value || "")
					setCurrentPage(1) // Reset to first page when filter changes
				}}
				options={roles.map((role) => ({
					value: role.name,
					label: role.name,
				}))}
				placeholder="Filter by role"
				isClearable={true}
				/>
			</ThemeUI.FormField>
			<div className="flex gap-2">
				<ThemeUI.Button
				type="button"
				onClick={() => {
					setStatusFilter("")
					setRoleFilter("")
					setCurrentPage(1)
				}}
				gradientColors={{
					start: theme.secondaryGradientStart,
					end: theme.secondaryGradientEnd,
				}}
				>
				Reset Filters
				</ThemeUI.Button>
			</div>
			</div>
		</Offcanvas>
		</Layout>
	)
}
export default Team
