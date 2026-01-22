import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import NoRowsOverlay from "./NoRowsOverlay"

function MaterialEntry() {
	const { theme } = useTheme()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [materialEntries, setMaterialEntries] = useState([])
	const [materials, setMaterials] = useState([])
	const [vendors, setVendors] = useState([])
	const [sites, setSites] = useState([])
	const [editingEntry, setEditingEntry] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [materialFilter, setMaterialFilter] = useState("")
	const [vendorFilter, setVendorFilter] = useState("")
	const [siteFilter, setSiteFilter] = useState("")
	const [dateFromFilter, setDateFromFilter] = useState("")
	const [dateToFilter, setDateToFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})

	// Typing animation
	const [placeholder, setPlaceholder] = useState("Search by site or material...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isPaused, setIsPaused] = useState(false)
	const words = ["site name", "material name", "vendor name"]

	// Ref to prevent circular updates
	const isUpdatingRef = useRef(false)

	const [formData, setFormData] = useState({
		site_id: "",
		material_id: "",
		vendor_id: "",
		date: "",
		quantity: "",
		rate: "",
		additional_charges: "0",
		debit_entry: "",
		credit_entry: "",
		status: 1,
	})

	// Permissions
	const [materialEntryPermissions, setMaterialEntryPermissions] = useState({
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
				if (permissions.materialentry) {
					return {
						can_add: permissions.materialentry.can_add || false,
						can_edit: permissions.materialentry.can_edit || false,
						can_delete: permissions.materialentry.can_delete || false,
						can_view: permissions.materialentry.can_view || false
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
		setMaterialEntryPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setMaterialEntryPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Fetch active sites for dropdown
	const fetchActiveSites = async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/sites`)
			if (response.data.success) {
				setSites(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching sites:", err)
			toast.error("Failed to load sites")
		}
	}

	// Fetch active materials for dropdown
	const fetchActiveMaterials = async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/material-entry/active-materials`)
			if (response.data.success) {
				setMaterials(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching materials:", err)
			toast.error("Failed to load materials")
		}
	}

	// Fetch active vendors for dropdown
	const fetchActiveVendors = async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/material-entry/active-vendors`)
			if (response.data.success) {
				setVendors(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching vendors:", err)
			toast.error("Failed to load vendors")
		}
	}

	// Fetch material entries
	const fetchMaterialEntries = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/material-entry`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter === "all" ? "" : statusFilter,
					material_id: materialFilter || "",
					vendor_id: vendorFilter || "",
					site_id: siteFilter || "",
					date_from: dateFromFilter || "",
					date_to: dateToFilter || "",
				},
			})
			if (response.data.success) {
				setMaterialEntries(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			console.error("Error fetching material entries:", err)
			toast.error(err.response?.data?.message || "Failed to fetch material entries")
			setMaterialEntries([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, materialFilter, vendorFilter, siteFilter, dateFromFilter, dateToFilter])

	useEffect(() => {
		fetchActiveSites()
		fetchActiveMaterials()
		fetchActiveVendors()
	}, [])

	useEffect(() => {
		fetchMaterialEntries()
	}, [fetchMaterialEntries])

	// Typing animation effect
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

	// Calculate total amount
	const calculateTotal = useCallback(() => {
		const qty = Number(formData.quantity) || 0
		const rate = Number(formData.rate) || 0
		const additionalCharges = Number(formData.additional_charges) || 0
		return (qty * rate) + additionalCharges
	}, [formData.quantity, formData.rate, formData.additional_charges])

	const totalAmount = useMemo(() => calculateTotal(), [calculateTotal])

	// Auto-calculate debit/credit with proper checks
	useEffect(() => {
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

		// If credit was just entered/changed, calculate debit
		if (formData.credit_entry !== "" && credit >= 0 && credit <= totalAmount) {
			const calculatedDebit = totalAmount - credit
			if (Math.abs(calculatedDebit - debit) > 0.01) {
				setFormData(prev => ({
					...prev,
					debit_entry: calculatedDebit.toFixed(2),
				}))
			}
		}
		// If debit was just entered/changed, calculate credit
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
	}, [formData.debit_entry, formData.credit_entry, totalAmount])

	// Handlers
	const handleAddClick = () => {
		if (!materialEntryPermissions.can_add) {
			toast.error("You don't have permission to create material entry")
			return
		}
		setEditingEntry({ isNew: true })
		setFormData({
			site_id: "",
			material_id: "",
			vendor_id: "",
			date: "",
			quantity: "",
			rate: "",
			additional_charges: "0",
			debit_entry: "",
			credit_entry: "",
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (entry) => {
		if (!materialEntryPermissions.can_edit) {
			toast.error("You don't have permission to edit material entry")
			return
		}
		setEditingEntry(entry)
		setFormData({
			site_id: entry.site_id || "",
			material_id: entry.material_id || "",
			vendor_id: entry.vendor_id || "",
			date: entry.date ? entry.date.split('T')[0] : "",
			quantity: entry.quantity || "",
			rate: entry.rate || "",
			additional_charges: entry.additional_charges || "0",
			debit_entry: entry.debit_entry || "",
			credit_entry: entry.credit_entry || "",
			status: entry.status === 1 ? 1 : 0,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveEntry = async () => {
		setIsLoading(true)
		try {
			const url = editingEntry?.isNew
				? `${import.meta.env.VITE_API_URL}/api/material-entry`
				: `${import.meta.env.VITE_API_URL}/api/material-entry/${editingEntry.id}`
			const method = editingEntry?.isNew ? "post" : "put"

			const response = await axios[method](url, formData)
			if (response.data.success) {
				toast.success(editingEntry?.isNew ? "Material entry created successfully" : "Material entry updated successfully")
				fetchMaterialEntries()
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save material entry")
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (entry) => {
		if (!window.confirm(`Are you sure you want to delete this material entry?`)) return

		setIsLoading(true)
		try {
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/material-entry/${entry.id}`)
			if (response.data.success) {
				toast.success("Material entry deleted successfully")
				fetchMaterialEntries()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete material entry")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancelEdit = () => {
		setEditingEntry(null)
		setFormData({
			site_id: "",
			material_id: "",
			vendor_id: "",
			date: "",
			quantity: "",
			rate: "",
			additional_charges: "0",
			debit_entry: "",
			credit_entry: "",
			status: 1,
		})
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

	const handleMaterialChange = (selectedOption) => {
		const materialId = selectedOption?.value || ""
		setBackendErrors(prev => ({ ...prev, material_id: "" }))

		if (materialId) {
			const selectedMaterial = materials.find(m => m.id === materialId)
			if (selectedMaterial && selectedMaterial.standard_rate !== undefined) {
				setFormData(prev => ({
					...prev,
					material_id: materialId,
					rate: selectedMaterial.standard_rate,
					debit_entry: "",
					credit_entry: "",
				}))
			} else {
				setFormData(prev => ({
					...prev,
					material_id: materialId,
					debit_entry: "",
					credit_entry: "",
				}))
			}
		} else {
			setFormData(prev => ({
				...prev,
				material_id: "",
				rate: "",
				debit_entry: "",
				credit_entry: "",
			}))
		}
	}

	const handleVendorChange = (selectedOption) => {
		setFormData(prev => ({ ...prev, vendor_id: selectedOption?.value || "" }))
		setBackendErrors(prev => ({ ...prev, vendor_id: "" }))
	}

	const handleRateChange = (e) => {
		const value = e.target.value
		setFormData(prev => ({
			...prev,
			rate: value,
			debit_entry: "",
			credit_entry: "",
		}))
		setBackendErrors(prev => ({ ...prev, rate: "" }))
	}

	const handleAdditionalChargesChange = (e) => {
		const value = e.target.value
		setFormData(prev => ({
			...prev,
			additional_charges: value,
			debit_entry: "",
			credit_entry: "",
		}))
		setBackendErrors(prev => ({ ...prev, additional_charges: "" }))
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
                pinned: 'left'
			},
			{
				headerName: "Site",
				field: "site.name",
				valueGetter: (params) => params.data.site?.name || "-",
				sortable: true,
				flex: 1,
				minWidth: 200,
			},
           { 
                headerName: "Date", 
                field: "date", 
                width: 120, 
                valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "—") 
            },
			{
				headerName: "Material",
				field: "material.name",
				valueGetter: (params) => params.data.material?.name || "-",
				sortable: true,
				flex: 1,
				minWidth: 100,
			},
			{
				headerName: "Vendor",
				field: "vendor.name",
				valueGetter: (params) => params.data.vendor?.name || "-",
				minWidth: 120,
				flex: 1,
			},
			{ 
                headerName: "Quantity", 
                field: "quantity", 
                width: 140, 
                valueFormatter: (params) => Number(params.value || 0).toFixed(3),
            },
			{ 
                headerName: "Rate", 
                field: "rate", 
                width: 140, 
                valueFormatter: (params) => `₹${Number(params.value || 0).toFixed(2)}`,
            },
			{ 
                headerName: "Add. Charges", 
                field: "additional_charges", 
                width: 140, 
                valueFormatter: (p) => (p.value > 0 ? `₹${Number(p.value).toFixed(2)}` : "—") 
            },
			{
                headerName: "Total",
                width: 120,
                valueGetter: (params) => {
					const qty = parseFloat(params.data.quantity) || 0
					const rate = parseFloat(params.data.rate) || 0
					const additionalCharges = parseFloat(params.data.additional_charges) || 0
					return (qty * rate + additionalCharges).toFixed(2)
                },
                valueFormatter: (params) => `₹${Number(params.value).toFixed(2)}`,
            },
            { 
                headerName: "Debit", 
                field: "debit_entry", 
                width: 110, 
                valueFormatter: (p) => (p.value > 0 ? `₹${Number(p.value).toFixed(2)}` : "—") 
            },
            { 
                headerName: "Credit", 
                field: "credit_entry", 
                width: 110, 
                valueFormatter: (p) => (p.value > 0 ? `₹${Number(p.value).toFixed(2)}` : "—") 
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

		if (materialEntryPermissions.can_edit || materialEntryPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{materialEntryPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{materialEntryPermissions.can_delete && (
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
                pinned: 'right'
			})
		}

		return baseColumns
	}, [theme.primaryGradientStart, currentPage, perPage, materialEntryPermissions])

	// Form Render
	const renderEntryForm = () => {
		return (
			<div className="space-y-6">
				<div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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

					<ThemeUI.FormField label="Material" name="material_id" error={backendErrors.material_id} required>
						<ThemeUI.Select
							value={formData.material_id}
							onChange={handleMaterialChange}
							options={materials.map(material => ({
								value: material.id,
								label: `${material.name} (${material.unit?.name})`
							}))}
							placeholder="Select material"
							error={backendErrors.material_id}
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

					<ThemeUI.FormField label="Quantity" name="quantity" error={backendErrors.quantity} required>
						<ThemeUI.Input
							name="quantity"
							type="number"
							step="0.001"
							min="0"
							value={formData.quantity}
							onChange={handleInputChange}
							placeholder="0.000"
							error={backendErrors.quantity}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Rate (₹)" name="rate" error={backendErrors.rate} required>
						<ThemeUI.Input
							name="rate"
							type="number"
							step="0.01"
							min="0"
							value={formData.rate}
							onChange={handleRateChange}
							placeholder="0.00"
							error={backendErrors.rate}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Additional Charges (₹)" name="additional_charges" error={backendErrors.additional_charges}>
						<ThemeUI.Input
							name="additional_charges"
							type="number"
							step="0.01"
							min="0"
							value={formData.additional_charges}
							onChange={handleAdditionalChargesChange}
							placeholder="0.00"
							error={backendErrors.additional_charges}
						/>
					</ThemeUI.FormField>
					
					<ThemeUI.FormField label="Total Amount (₹)">
						<ThemeUI.Input
							value={`₹${totalAmount.toFixed(2)}`}
							readOnly
							disabled
							className="bg-gray-100 cursor-not-allowed font-semibold"
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Credit Entry (Paid ₹)" name="credit_entry" error={backendErrors.credit_entry}>
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
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Debit Entry (Due ₹)" name="debit_entry" error={backendErrors.debit_entry}>
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

				{totalAmount > 0 && (
					<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
							<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
								<div className="flex items-center gap-2">
									<span className="text-slate-500">Total:</span>
									<span className="font-semibold text-slate-900">
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
									⚠ Amount mismatch
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
							"Create Entry"
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
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Material Entry Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">
							Material Entries
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
						{materialEntryPermissions.can_add && (
							<ThemeUI.Button
								onClick={handleAddClick}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
							>
								<Plus size={16} className="mr-2" /> Add Entry
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
					rowData={materialEntries}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Material Entries Found" }}
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

			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingEntry?.isNew ? "Add Material Entry" : "Edit Material Entry"}
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

					<ThemeUI.FormField label="Material Filter">
						<ThemeUI.Select
							value={materialFilter}
							onChange={(selected) => {
								setMaterialFilter(selected?.value || "")
								setCurrentPage(1)
							}}
							options={materials.map(material => ({
								value: material.id,
								label: material.name
							}))}
							placeholder="All materials"
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
								setMaterialFilter("")
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
		</Layout>
	)
}

export default MaterialEntry