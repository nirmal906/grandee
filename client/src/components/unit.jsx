import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import NoRowsOverlay from "./NoRowsOverlay"

function Unit() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [units, setUnits] = useState([])
	const [editingUnit, setEditingUnit] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})

	// Typing animation placeholder
	const [placeholder, setPlaceholder] = useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["name"]

	const [formData, setFormData] = useState({
		name: "",
		status: 1,
	})

	// Permissions
	const [unitPermissions, setUnitPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.unit) {
					return {
						can_add: permissions.unit.can_add || false,
						can_edit: permissions.unit.can_edit || false,
						can_delete: permissions.unit.can_delete || false,
						can_view: permissions.unit.can_view || false
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
		setUnitPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setUnitPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Fetch units
	const fetchUnits = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/unit`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter === "all" ? "" : statusFilter,
				},
			})
			if (response.data.success) {
				setUnits(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			console.error("Error fetching units:", err)
			toast.error(err.response?.data?.message || "Failed to fetch units")
			setUnits([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter])

	useEffect(() => {
		fetchUnits()
	}, [fetchUnits])

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

	// Handlers
	const handleAddClick = () => {
		if (!unitPermissions.can_add) {
			toast.error("You don't have permission to create unit")
			return
		}
		setEditingUnit({ isNew: true })
		setFormData({ name: "", status: 1 })
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (unit) => {
		if (!unitPermissions.can_edit) {
			toast.error("You don't have permission to edit unit")
			return
		}
		setEditingUnit(unit)
		setFormData({
			name: unit.name || "",
			status: unit.status === 1 ? 1 : 0,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveUnit = async () => {
		setIsLoading(true)
		try {
			const url = editingUnit?.isNew
				? `${import.meta.env.VITE_API_URL}/api/unit`
				: `${import.meta.env.VITE_API_URL}/api/unit/${editingUnit.id}`
			const method = editingUnit?.isNew ? "post" : "put"

			const response = await axios[method](url, formData)
			if (response.data.success) {
				toast.success(editingUnit?.isNew ? "Unit created successfully" : "Unit updated successfully")
				fetchUnits()
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save unit")
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (unit) => {
		if (!window.confirm(`Are you sure you want to delete unit "${unit.name}"?`)) return

		setIsLoading(true)
		try {
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/unit/${unit.id}`)
			if (response.data.success) {
				toast.success("Unit deleted successfully")
				fetchUnits()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete unit")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancelEdit = () => {
		setEditingUnit(null)
		setFormData({ name: "", status: 1 })
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleStatusChange = (selectedOption) => {
		setFormData(prev => ({ ...prev, status: selectedOption.value }))
		setBackendErrors(prev => ({ ...prev, status: "" }))
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const handlePageChange = (page) => setCurrentPage(page)
	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// AG Grid Columns
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				width: 80,
				valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
				sortable: false,
			},
			{
				headerName: "Name",
				field: "name",
				sortable: true,
				flex: 1,
				minWidth: 200,
			},
			{
				headerName: "Status",
				field: "status",
				sortable: true,
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
				minWidth: 150,
				flex: 1,
				valueGetter: (params) => params.data.creator?.name || "-",
			},
			{
				headerName: "Updated By",
				field: "updater.name",
				minWidth: 150,
				flex: 1,
				valueGetter: (params) => params.data.updater?.name || "-",
			},
		]

		if (unitPermissions.can_edit || unitPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{unitPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{unitPermissions.can_delete && (
							<button
								onClick={() => handleDeleteClick(params.data)}
								className="p-1 text-red-600 hover:text-red-800 transition-colors"
								title="Delete"
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
	}, [theme.primaryGradientStart, currentPage, perPage, unitPermissions])

	// Form Render
	const renderUnitForm = () => {
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-2 gap-4">
					<ThemeUI.FormField label="Name" name="name" error={backendErrors.name} required>
						<ThemeUI.Input
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							placeholder="Enter unit name"
							error={backendErrors.name}
						/>
					</ThemeUI.FormField>

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

				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button
						onClick={handleCancelEdit}
						gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
					>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						onClick={handleSaveUnit}
						disabled={isLoading}
						gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingUnit?.isNew ? (
							"Create Unit"
						) : (
							"Update Unit"
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
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Unit Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">
							Units
						</li>
					</ol>
				</nav>
			</div>

			{/* Search & Actions */}
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
						{unitPermissions.can_add && (
							<ThemeUI.Button
								onClick={handleAddClick}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
							>
								<Plus size={16} className="mr-2" /> Add Unit
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>

			{/* AG Grid */}
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
					rowData={units}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Units Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
							const newPage = params.api.paginationGetCurrentPage() + 1
							const newSize = params.api.paginationGetPageSize()
							if (newPage !== currentPage) handlePageChange(newPage)
							if (newSize !== perPage) handlePerRowsChange(newSize, newPage)
						}
					}}
				/>
			</div>

			{/* Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingUnit?.isNew ? "Add Unit" : "Edit Unit"}
				size="md"
			>
				{renderUnitForm()}
			</Modal>

			{/* Filter Offcanvas */}
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
							value={statusFilter}
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

					<div className="flex gap-2">
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
				</div>
			</Offcanvas>
		</Layout>
	)
}

export default Unit