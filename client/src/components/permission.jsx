import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "../utils/axios";
import { toast } from "react-toastify"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Eye } from "lucide-react"
import Modal from "./modal"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./noRowsOverlay"
import { AgGridReact } from "ag-grid-react"

function Permission() {
	const { theme }                       = useTheme()
	const [isModalOpen, setIsModalOpen]   = useState(false)
	const [isLoading, setIsLoading]       = useState(false)
	const [totalRows, setTotalRows] 	  = useState(0)
	const [perPage, setPerPage] 		  = useState(10)
	const [currentPage, setCurrentPage]   = useState(1)
	const [roles, setRoles] 			  = useState([])
	const [selectedRole, setSelectedRole] = useState(null)
	const [permissions, setPermissions]   = useState([])
	const [isSaving, setIsSaving] 		  = useState(false)


	// Initialize permissions with safe defaults
	const [rolePermissions, setRolePermissions]         = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the permission module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.permission){
					return {
						can_add     : permissions.permission.can_add || false,
						can_edit    : permissions.permission.can_edit || false,
						can_delete  : permissions.permission.can_delete || false,
						can_view    : permissions.permission.can_view || false
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
		setRolePermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setRolePermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch roles on mount and when pagination changes
	useEffect(() => {
		fetchRoles()
	}, [currentPage, perPage])

	// Memoized fetch function to prevent unnecessary re-renders
	const fetchRoles = useCallback(async () => {
		setIsLoading(true)
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/api/permission`,
			{
			params: {
				page: currentPage,
				limit: perPage,
			},
			}
		)
		if (response.data.success) {
			setRoles(response.data.data)
			setTotalRows(response.data.meta?.total || 0)
		}
		} catch (err) {
		console.error("Error fetching roles:", err)
		toast.error(err.response?.data?.message || "Failed to fetch roles")
		setRoles([])
		setTotalRows(0)
		} finally {
		setIsLoading(false)
		}
	}, [currentPage, perPage])

	// Fetch role permissions
	const fetchRolePermissions = async (roleId) => {
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/api/permission/role/${roleId}`
		)
		if (response.data.success) {
			setPermissions(response.data.data)
		}
		} catch (err) {
		console.error("Error fetching role permissions:", err)
		toast.error("Failed to fetch role permissions")
		}
	}

	// Handle permission checkbox changes
	const handlePermissionChange = (moduleName, action, value) => {
		setPermissions((prev) =>
		prev.map((perm) => {
			if (perm.module_name === moduleName) {
			return {
				...perm,
				permissions: {
				...perm.permissions,
				[action]: value,
				},
			}
			}
			return perm
		})
		)
	}

	// Handle select all for a module
	const handleSelectAll = (moduleName, value) => {
		setPermissions((prev) =>
		prev.map((perm) => {
			if (perm.module_name === moduleName) {
			return {
				...perm,
				permissions: {
				can_add: value,
				can_edit: value,
				can_delete: value,
				can_view: value,
				},
			}
			}
			return perm
		})
		)
	}

	// Save permissions
	const handleSavePermissions = async () => {
		if (!selectedRole) return

		setIsSaving(true)
		try {
		const permissionData = permissions.map((perm) => ({
			module_name: perm.module_name,
			...perm.permissions,
		}))

		await axios.put(
			`${import.meta.env.VITE_API_URL}/api/permission/role/${
			selectedRole.id
			}`,
			{ permissions: permissionData }
		)

		toast.success("Permissions updated successfully")
		setIsModalOpen(false)
		} catch (err) {
		console.error("Error saving permissions:", err)
		toast.error(err.response?.data?.message || "Failed to save permissions")
		} finally {
		setIsSaving(false)
		}
	}

	// Open permissions modal
	const openPermissionsModal = async (role) => {
		setSelectedRole(role)
		await fetchRolePermissions(role.id)
		setIsModalOpen(true)
	}

	// Handle pagination
	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

    // DataTable columns - with conditional Actions column
    const columnDefs = useMemo(() => {
        const baseColumns = [
			{
				headerName: "S.No",
				width: 80,
				sortable: false,
				valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
			},
			{
				headerName: "Role Name",
				field: "name",
				sortable: true,
				flex: 1,
    		},
        ]
        // Only add Actions column if user has edit or delete permission
		baseColumns.push({
			headerName  : "Actions",
			field       : "actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					<button
						className="p-1 text-blue-600 hover:text-blue-800"
						title="Manage Permissions"
						aria-label={`Manage permissions for ${params.data.name}`}
						onClick={() => openPermissionsModal(params.data)}
					>
						<Eye size={16} style={{ color: theme.primaryGradientStart }} />
					</button>
				</div>
			),
			minWidth    : 100,
			flex        : 0.5,
			sortable    : false,
		})
        return baseColumns
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, rolePermissions])


	// Render permissions form
	const renderPermissionsForm = () => {
		if (!permissions.length) {
		return <div className="p-4 text-center">Loading permissions...</div>
		}

		return (
		<div className="flex flex-col h-full">
			{/* Scrollable content */}
			<div className="flex-1 overflow-hidden">
			<div className="h-full overflow-auto p-4">
				<div className="overflow-x-auto">
				<table className="w-full border-collapse min-w-[850px]">
					<thead className="sticky top-0 z-10">
					<tr
						style={{
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
						}}
					>
						<th className="border border-white/20 p-3 text-left font-medium text-white w-16">
						S.No
						</th>
						<th className="border border-white/20 p-3 text-left font-medium text-white">
						Module
						</th>
						<th className="border border-white/20 p-3 text-center font-medium text-white">
						Add
						</th>
						<th className="border border-white/20 p-3 text-center font-medium text-white">
						Edit
						</th>
						<th className="border border-white/20 p-3 text-center font-medium text-white">
						Delete
						</th>
						<th className="border border-white/20 p-3 text-center font-medium text-white">
						View
						</th>
						<th className="border border-white/20 p-3 text-center font-medium text-white">
						Select All
						</th>
					</tr>
					</thead>
					<tbody>
					{permissions.map((permission, index) => {
						const allSelected = Object.values(
						permission.permissions
						).every((val) => val)
						const isEven = index % 2 === 0

						return (
						<tr
							key={permission.module_name}
							className={`transition-colors duration-200 hover:shadow-md ${
							isEven ? "bg-white" : "bg-gray-50"
							}`}
							style={{
							":hover": {
								background: `linear-gradient(90deg, ${theme.primaryGradientStart}10, ${theme.primaryGradientEnd}10)`,
							},
							}}
						>
							<td className="border border-gray-200 p-3 text-center font-medium text-gray-600">
							{index + 1}
							</td>
							<td className="border border-gray-200 p-3 font-medium capitalize">
							<span className="px-2 py-1 rounded-md text-sm">
								{permission.module_label}
							</span>
							</td>
							<td className="border border-gray-200 p-3 text-center">
							<input
								type="checkbox"
								checked={permission.permissions.can_add}
								onChange={(e) =>
								handlePermissionChange(
									permission.module_name,
									"can_add",
									e.target.checked
								)
								}
								className="w-4 h-4 rounded focus:ring-2 transform hover:scale-110 transition-transform"
								style={{
								accentColor: theme.primaryGradientStart,
								"--tw-ring-color":
									theme.primaryGradientStart + "50",
								}}
							/>
							</td>
							<td className="border border-gray-200 p-3 text-center">
							<input
								type="checkbox"
								checked={permission.permissions.can_edit}
								onChange={(e) =>
								handlePermissionChange(
									permission.module_name,
									"can_edit",
									e.target.checked
								)
								}
								className="w-4 h-4 rounded focus:ring-2 transform hover:scale-110 transition-transform"
								style={{
								accentColor: theme.primaryGradientStart,
								"--tw-ring-color":
									theme.primaryGradientStart + "50",
								}}
							/>
							</td>
							<td className="border border-gray-200 p-3 text-center">
							<input
								type="checkbox"
								checked={permission.permissions.can_delete}
								onChange={(e) =>
								handlePermissionChange(
									permission.module_name,
									"can_delete",
									e.target.checked
								)
								}
								className="w-4 h-4 rounded focus:ring-2 transform hover:scale-110 transition-transform"
								style={{
								accentColor: theme.primaryGradientStart,
								"--tw-ring-color":
									theme.primaryGradientStart + "50",
								}}
							/>
							</td>
							<td className="border border-gray-200 p-3 text-center">
							<input
								type="checkbox"
								checked={permission.permissions.can_view}
								onChange={(e) =>
								handlePermissionChange(
									permission.module_name,
									"can_view",
									e.target.checked
								)
								}
								className="w-4 h-4 rounded focus:ring-2 transform hover:scale-110 transition-transform"
								style={{
								accentColor: theme.primaryGradientStart,
								"--tw-ring-color":
									theme.primaryGradientStart + "50",
								}}
							/>
							</td>
							<td className="border border-gray-200 p-3 text-center">
							<input
								type="checkbox"
								checked={allSelected}
								onChange={(e) =>
								handleSelectAll(
									permission.module_name,
									e.target.checked
								)
								}
								className="w-4 h-4 rounded focus:ring-2 transform hover:scale-110 transition-transform"
								style={{
								accentColor: theme.secondaryGradientStart,
								"--tw-ring-color":
									theme.secondaryGradientStart + "50",
								}}
							/>
							</td>
						</tr>
						)
					})}
					</tbody>
				</table>
				</div>
			</div>
			</div>

			{/* footer with buttons */}
			<div className="border-t border-gray-200 p-4 flex justify-end gap-3 ">
			<ThemeUI.Button
				type="button"
				onClick={() => setIsModalOpen(false)}
				gradientColors={{
				start: theme.secondaryGradientStart,
				end: theme.secondaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				className="flex items-center gap-2 px-6 py-2 font-medium transition-all duration-200 hover:shadow-md transform hover:scale-105"
			>
				Cancel
			</ThemeUI.Button>
			<ThemeUI.Button
				type="button"
				onClick={handleSavePermissions}
				disabled={isSaving}
				gradientColors={{
				start: theme.primaryGradientStart,
				end: theme.primaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				className="flex items-center gap-2 px-6 py-2 font-medium transition-all duration-200 hover:shadow-md transform hover:scale-105 disabled:opacity-70 disabled:transform-none"
			>
				{isSaving ? <Loader size={16} className="animate-spin" /> : ""}
				{isSaving ? "Saving..." : "Save Permissions"}
			</ThemeUI.Button>
			</div>
		</div>
		)
	}

	return (
		<Layout>
		{/* Header and breadcrumb */}
		<div className="flex items-center mb-4 gap-2">
			<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
			Role Based Permission
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
				Role Permissions
				</li>
			</ol>
			</nav>
		</div>

		{/* Datatable */}
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
				rowData={roles}
				rowHeight={55}
				columnDefs={columnDefs}
				pagination
				paginationPageSize={10}
				paginationPageSizeSelector={[10, 20, 50, 100]}
				paginationNumberFormatter={(params) => `${params.value}`}
				suppressCellFocus
				suppressPaginationPanel={false}
				overlayLoadingTemplate={'<span class="p-4">Loading...</span>'}
				noRowsOverlayComponent={NoRowsOverlay}
				noRowsOverlayComponentParams={{ text: "No Ride Requests Found" }}
				onPaginationChanged={(params) => {
					if (params.api) {
					const newPage = params.api.paginationGetCurrentPage() + 1
					handlePageChange(newPage)
					}
				}}
			/>
		</div>

		{/* Permissions Modal */}
		<Modal
			isOpen={isModalOpen}
			title="Manage Permissions"
			size="5xl"
			onClose={() => setIsModalOpen(false)}
			className="h-[80vh]"
		>
			{renderPermissionsForm()}
		</Modal>
		</Layout>
	)
}

export default Permission
