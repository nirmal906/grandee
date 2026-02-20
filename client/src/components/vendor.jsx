import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Download } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'

const INITIAL_FORM_STATE = {
	name			: "",
	phone			: "",
	email			: "",
	pincode			: "",
	district		: "",
	state			: "",
	region			: "",
	country			: "India",
	full_address	: "",
	notes			: "",
	post_office_name: ""
}

function Vendor() {
	const { theme } 								= useTheme()
	const gridRef 									= useRef(null)
	const [isModalOpen, setIsModalOpen] 			= useState(false)
	const [isOffcanvasOpen, setIsOffcanvasOpen] 	= useState(false)
	const [isLoading, setIsLoading] 				= useState(false)
	const [totalRows, setTotalRows] 				= useState(0)
	const [perPage, setPerPage] 					= useState(10)
	const [currentPage, setCurrentPage] 			= useState(1)
	const [vendors, setVendors] 					= useState([])
	const [editingVendor, setEditingVendor] 		= useState(null)
	const [searchQuery, setSearchQuery] 			= useState("")
	const [backendErrors, setBackendErrors] 		= useState({})
	const [selectedPincode, setSelectedPincode] 	= useState(null)
	const [placeholder, setPlaceholder] 			= useState("Search by vendor name...")
	const [currentWordIndex, setCurrentWordIndex] 	= useState(0)
	const [currentCharIndex, setCurrentCharIndex] 	= useState(0)
	const [isDeleting, setIsDeleting] 				= useState(false)
	const words 									= ["vendor name", "location", "phone", "email"]
	const [formData, setFormData] 					= useState(INITIAL_FORM_STATE)
	const [vendorPermissions, setVendorPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false,
	})

	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.vendor){
					return{
						can_add: permissions.vendor.can_add || false,
						can_edit: permissions.vendor.can_edit || false,
						can_delete: permissions.vendor.can_delete || false,
						can_view: permissions.vendor.can_view || false,
					}
				}
			}
			return { can_add: false, can_edit: false, can_delete: false, can_view: false }
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return { can_add: false, can_edit: false, can_delete: false, can_view: false }
		}
	}, [])

	useEffect(() => {
		const permissions = getUserPermissions()
		setVendorPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setVendorPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	const loadPincodeOptions = useCallback((inputValue, callback) => {
		if(!inputValue || inputValue.length < 6){
			callback([])
			return
		}
		if(/^\d{6}$/.test(inputValue)){
			axios.get(`${import.meta.env.VITE_API_URL}/api/search/pincode/${inputValue}`)
			.then(response => {
				if(response.data.success && response.data.data.length > 0){
					const options = response.data.data.map(po => ({
						value: po.pincode,
						label: `${po.pincode} - ${po.name}, ${po.district}, ${po.state}`,
						data: po
					}))
					callback(options)
				}else{
					callback([])
				}
			})
			.catch(error => {
				console.error('Error loading pincode:', error)
				callback([])
			})
		}else{
			callback([])
		}
	}, [])

	const fetchVendors = useCallback(async () => {
		setIsLoading(true)
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/vendor`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
				},
			})
			if(response.data.success){
				setVendors(response.data.data || [])
				setTotalRows(response.data.meta?.total || response.data.total || 0)
			}
		}catch(err){
			console.error("Error fetching vendors:", err)
			toast.error(err.response?.data?.message || "Failed to fetch vendors")
			setVendors([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery])

	useEffect(() => {
		fetchVendors()
	}, [fetchVendors])

	useEffect(() => {
		const typingSpeed 	  = isDeleting ? 50 : 100
		const pauseTime 	  = 1500
		const timeout 		  = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex(prev => prev + 1)
			}else 
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex(prev => prev - 1)
			}else 
			if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else 
			if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex(prev => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting])

	const handleExcelExport = useCallback(() => {
		try{
			const exportData = vendors.map((vendor, index) => ({
				'S.No'			: (currentPage - 1) * perPage + index + 1,
				'Vendor Name'	: vendor.name,
				'Phone'			: vendor.phone,
				'Email'			: vendor.email,
				'Location'		: vendor.full_address || `${vendor.pincode || ''}, ${vendor.district || ''}, ${vendor.state || ''}`,
				'Created At'	: new Date(vendor.created_at).toLocaleString(),
			}))
			const wb 	= XLSX.utils.book_new()
			const ws 	= XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 20 }]
			XLSX.utils.book_append_sheet(wb, ws, 'Vendors')
			const timestamp = new Date().toISOString().split('T')[0]
			XLSX.writeFile(wb, `vendors_${timestamp}.xlsx`)
			toast.success('Excel file exported successfully')
		}catch(error){
			console.error('Error exporting Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [vendors, currentPage, perPage])

	const handleAddClick = () => {
		if(!vendorPermissions.can_add){
			toast.error("You don't have permission to add vendors")
			return
		}
		setEditingVendor({ isNew: true })
		setFormData(INITIAL_FORM_STATE)
		setSelectedPincode(null)
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (vendor) => {
		if(!vendorPermissions.can_edit){
			toast.error("You don't have permission to edit vendors")
			return
		}
		setEditingVendor(vendor)
		setFormData({
			name			: vendor.name || "",
			phone			: vendor.phone || "",
			email			: vendor.email || "",
			pincode			: vendor.pincode || "",
			district		: vendor.district || "",
			state			: vendor.state || "",
			region			: vendor.region || "",
			country			: vendor.country || "India",
			full_address	: vendor.full_address || "",
			notes			: vendor.notes || "",
			post_office_name: vendor.post_office_name || "", 
		})
		if(vendor.pincode){
			setSelectedPincode({
				value: vendor.pincode,
				label: `${vendor.pincode} - ${vendor.district || ''}, ${vendor.state || ''}`,
				data: {
					pincode: vendor.pincode,
					district: vendor.district,
					state: vendor.state,
					region: vendor.region,
					country: vendor.country
				}
			})
		}
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleCancelEdit = () => {
		setEditingVendor(null)
		setFormData(INITIAL_FORM_STATE)
		setSelectedPincode(null)
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleSaveVendor = async () => {
		setIsLoading(true)
		try{
			const url 	  = editingVendor?.isNew ? `${import.meta.env.VITE_API_URL}/api/vendor` : `${import.meta.env.VITE_API_URL}/api/vendor/${editingVendor.id}`
			const method  = editingVendor?.isNew ? "post" : "put"
			const response = await axios[method](url, formData)
			if(response.data.success){
				toast.success(editingVendor?.isNew ? "Vendor created successfully" : "Vendor updated successfully")
				handleCancelEdit()
				fetchVendors()
			}
		}catch(err){
			if(err.response?.status === 400 && err.response.data.errors){
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			}else{
				toast.error(err.response?.data?.message || "Failed to save vendor")
			}
		}finally{
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (vendor) => {
		if(!window.confirm("Are you sure you want to delete this vendor?")) return
		setIsLoading(true)
		try{
			await axios.delete(`${import.meta.env.VITE_API_URL}/api/vendor/${vendor.id}`)
			toast.success("Vendor deleted successfully")
			fetchVendors()
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to delete vendor")
		}finally{
			setIsLoading(false)
		}
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				width: 80,
				sortable: false,
				valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
			},
			{
				headerName: "Vendor Name",
				field: "name",
				sortable: true,
				flex: 1,
				minWidth: 200,
			},
			{
				headerName: "Phone",
				field: "phone",
				sortable: true,
				width: 140,
			},
			{
				headerName: "Email",
				field: "email",
				sortable: true,
				flex: 1,
				minWidth: 200,
			}
		]
		if(vendorPermissions.can_edit || vendorPermissions.can_delete){
			baseColumns.push({
				headerName: "Actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{vendorPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{vendorPermissions.can_delete && (
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
				sortable: false,
			})
		}
		return baseColumns
	}, [currentPage, perPage, vendorPermissions, theme.primaryGradientStart])

	const renderVendorForm = () => {
		return (
			<div className="space-y-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
					<ThemeUI.FormField label="Vendor Name" name="name" error={backendErrors.name} required>
						<ThemeUI.Input
							name			= "name"
							value			= {formData.name}
							onChange		= {handleInputChange}
							placeholder		= "Enter vendor name"
							error			= {backendErrors.name}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Phone Number" name="phone" error={backendErrors.phone} required>
						<ThemeUI.Input
							type			= "tel"
							name			= "phone"
							value			= {formData.phone}
							onChange		= {handleInputChange}
							placeholder		= "10-digit phone number"
							maxLength		= {10}
							error			= {backendErrors.phone}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Email Address" name="email" error={backendErrors.email}>
						<ThemeUI.Input
							type			= "email"
							name			= "email"
							value			= {formData.email}
							onChange		= {handleInputChange}
							placeholder		= "vendor@example.com"
							error			= {backendErrors.email}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Search by Pincode" name="pincode" error={backendErrors.pincode}>
						<ThemeUI.AutoComplete
							id				= "pincode_autocomplete"
							name			= "pincode"
							value			= {selectedPincode ? [selectedPincode] : []}
							loadOptions		= {loadPincodeOptions}
							onChange		= {(selected) => {
								const selectedOption = selected?.[0] || null
								setSelectedPincode(selectedOption)
								if(selectedOption?.data){
									const po = selectedOption.data
									setFormData(prev => ({
										...prev,
										post_office_name: po.name,
										pincode: po.pincode,
										district: po.district,
										state: po.state,
										region: po.region || "",
										country: po.country || "India",
									}))
								}else{
									setFormData(prev => ({
										...prev,
										pincode: "",
										district: "",
										state: "",
										region: "",
									}))
								}
								setBackendErrors(prev => ({ ...prev, pincode: undefined }))
							}}
							placeholder="Type 6-digit pincode..."
							isMulti={false}
							minInputLength={0}
							cacheOptions
						/>
					</ThemeUI.FormField>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<ThemeUI.FormField label="Full Address" name="full_address" error={backendErrors.full_address}>
						<ThemeUI.Textarea
							name		= "full_address"
							value		= {formData.full_address}
							onChange	= {handleInputChange}
							rows		= {5}
							placeholder	= "Enter complete address (street, landmark, city, state, pincode, etc.)"
							error		= {backendErrors.full_address}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Notes" name="notes" error={backendErrors.notes}>
						<ThemeUI.Textarea
							name			= "notes"
							value			= {formData.notes}
							onChange		= {handleInputChange}
							rows			= {5}
							placeholder		= "Additional notes about the vendor, payment terms, contact details, etc."
							error			= {backendErrors.notes}
						/>
					</ThemeUI.FormField>
				</div>
				<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
					<ThemeUI.Button
						onClick={handleCancelEdit}
						gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
					>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						onClick={handleSaveVendor}
						disabled={isLoading}
						gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingVendor?.isNew ? (
							"Create Vendor"
						) : (
							"Update Vendor"
						)}
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Vendors Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
						<li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Vendors</li>
					</ol>
				</nav>
			</div>
			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value)
								setCurrentPage(1)
							}}
							placeholder={placeholder}
							leftElement={<Search size={16} className="text-gray-400" />}
						/>
					</div>
					<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto max-sm:text-sm">
						<ThemeUI.Button 
							onClick			= {handleExcelExport} 
							gradientColors	= {{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }} 
							direction		= {theme.gradientDirection}
						>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
						{vendorPermissions.can_add && (
							<ThemeUI.Button 
								onClick		   = {handleAddClick} 
								gradientColors = {{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }} 
								direction      = {theme.gradientDirection}
							>
								<Plus size={16} className="mr-2" /> Add Vendor
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>
			<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
				<AgGridReact
					ref={gridRef}
					className="custom-ag-grid"
					domLayout="autoHeight"
					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
					})}
					defaultColDef={{ resizable: true, sortable: true, filter: false }}
					columnDefs={columnDefs}
					rowData={vendors}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={(params) => {
						if(!params.api) return
						const newPage = params.api.paginationGetCurrentPage() + 1
						const newPageSize = params.api.paginationGetPageSize()
						let shouldRefetch = false
						if(newPage !== currentPage){
							setCurrentPage(newPage)
							shouldRefetch = true
						}
						if(newPageSize !== perPage){
							setPerPage(newPageSize)
							setCurrentPage(1)
							shouldRefetch = true
						}
						if(shouldRefetch){
							setTimeout(() => gridRef.current?.api?.ensureIndexVisible(0), 100)
						}
					}}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Vendors Found" }}
					loading={isLoading}
				/>
			</div>
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingVendor?.isNew ? "Add New Vendor" : "Edit Vendor"}
				size="full"
			>
				{renderVendorForm()}
			</Modal>
		</Layout>
	)
}
export default Vendor