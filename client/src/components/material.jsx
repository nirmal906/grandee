import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./modal"
import Offcanvas from "./Offcanvas"
import NoRowsOverlay from "./NoRowsOverlay"

function Material() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [materials, setMaterials] = useState([])
	const [units, setUnits] = useState([]) // For dropdown and filter
	const [editingMaterial, setEditingMaterial] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [unitFilter, setUnitFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})

	// Typing animation
	const [placeholder, setPlaceholder] = useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["name"]

	const [formData, setFormData] = useState({
		name: "",
		unit_id: "",
		standard_rate: "",
		status: 1,
	})

	// Permissions
	const [materialPermissions, setMaterialPermissions] = useState({
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
				if (permissions.material) {
					return {
						can_add: permissions.material.can_add || false,
						can_edit: permissions.material.can_edit || false,
						can_delete: permissions.material.can_delete || false,
						can_view: permissions.material.can_view || false
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
		setMaterialPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setMaterialPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Fetch active units for dropdown & filter
	const fetchUnits = async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/unit/list`)
			if (response.data.success) {
				setUnits(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching units:", err)
			toast.error("Failed to load units")
		}
	}

	// Fetch materials
	const fetchMaterials = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/material`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter === "all" ? "" : statusFilter,
					unit: unitFilter || "",
				},
			})
			if (response.data.success) {
				setMaterials(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			console.error("Error fetching materials:", err)
			toast.error(err.response?.data?.message || "Failed to fetch materials")
			setMaterials([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, unitFilter])

	useEffect(() => {
		fetchUnits()
	}, [])

	useEffect(() => {
		fetchMaterials()
	}, [fetchMaterials])

	// Typing animation effect
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
		if (!materialPermissions.can_add) {
			toast.error("You don't have permission to create material")
			return
		}
		setEditingMaterial({ isNew: true })
		setFormData({ name: "", unit_id: "", standard_rate: "", status: 1 })
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (material) => {
		if (!materialPermissions.can_edit) {
			toast.error("You don't have permission to edit material")
			return
		}
		setEditingMaterial(material)
		setFormData({
			name: material.name || "",
			unit_id: material.unit_id || "",
			standard_rate: material.standard_rate || "",
			status: material.status === 1 ? 1 : 0,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveMaterial = async () => {
		setIsLoading(true)
		try {
			const url = editingMaterial?.isNew
				? `${import.meta.env.VITE_API_URL}/api/material`
				: `${import.meta.env.VITE_API_URL}/api/material/${editingMaterial.id}`
			const method = editingMaterial?.isNew ? "post" : "put"

			const response = await axios[method](url, formData)
			if (response.data.success) {
				toast.success(editingMaterial?.isNew ? "Material created successfully" : "Material updated successfully")
				fetchMaterials()
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save material")
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (material) => {
		if (!window.confirm(`Are you sure you want to delete material "${material.name}"?`)) return

		setIsLoading(true)
		try {
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/material/${material.id}`)
			if (response.data.success) {
				toast.success("Material deleted successfully")
				fetchMaterials()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete material")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancelEdit = () => {
		setEditingMaterial(null)
		setFormData({ name: "", unit_id: "", standard_rate: "", status: 1 })
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleUnitChange = (selectedOption) => {
		setFormData(prev => ({ ...prev, unit_id: selectedOption?.value || "" }))
		setBackendErrors(prev => ({ ...prev, unit_id: "" }))
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
				headerName: "Unit",
				field: "unit.name",
				valueGetter: (params) => params.data.unit?.name || "-",
				minWidth: 120,
				flex: 1,
			},
			{
				headerName: "Standard Rate",
				field: "standard_rate",
				sortable: true,
				minWidth: 140,
				flex: 1,
				cellRenderer: (params) => `₹${Number(params.value || 0).toFixed(2)}`,
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

		if (materialPermissions.can_edit || materialPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{materialPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{materialPermissions.can_delete && (
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
	}, [theme.primaryGradientStart, currentPage, perPage, materialPermissions])

	// Form Render
	const renderMaterialForm = () => {
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-4 gap-4">
					<ThemeUI.FormField label="Name" name="name" error={backendErrors.name} required>
						<ThemeUI.Input
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							placeholder="Enter material name"
							error={backendErrors.name}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Unit" name="unit_id" error={backendErrors.unit_id} required>
						<ThemeUI.Select
							value={formData.unit_id }
							onChange={handleUnitChange}
							options={units.map(unit => ({ value: unit.id, label: unit.name }))}
							placeholder="Select unit"
							error={backendErrors.unit_id}
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
						onClick={handleSaveMaterial}
						disabled={isLoading}
						gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingMaterial?.isNew ? (
							"Create Material"
						) : (
							"Update Material"
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
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Material Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">
							Materials
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
						{materialPermissions.can_add && (
							<ThemeUI.Button
								onClick={handleAddClick}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
							>
								<Plus size={16} className="mr-2" /> Add Material
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
					rowData={materials}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Materials Found" }}
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
				title={editingMaterial?.isNew ? "Add Material" : "Edit Material"}
				size="full"
			>
				{renderMaterialForm()}
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

					<ThemeUI.FormField label="Unit Filter">
						<ThemeUI.Select
							value={unitFilter}
							onChange={(selected) => {
								setUnitFilter(selected?.value || "")
								setCurrentPage(1)
							}}
							options={units.map(unit => ({ value: unit.id, label: unit.name }))}
							placeholder="All units"
							isClearable
						/>
					</ThemeUI.FormField>

					<div className="flex gap-2">
						<ThemeUI.Button
							onClick={() => {
								setStatusFilter("")
								setUnitFilter("")
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

export default Material