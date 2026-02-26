import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios";
import { toast } from "react-toastify"
import { useNavigate, useLocation } from 'react-router-dom';  
import Layout from "./layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Download, DollarSign, Eye } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'

const INITIAL_FORM_STATE = {
	name: "", client_name: "", client_mobile: "", pincode: "", district: "", state: "", region: "", 
	country: "India", full_address: "", start_date: "", total_budget: "", status: "planning", 
	notes: "", post_office_name: "",
	checkout_photo: null
}

const INITIAL_PAYMENT_STATE = {
	payment_date: "", amount: "", payment_mode: "cash", transaction_reference: "", notes: ""
}

function Site() {
	const { theme } = useTheme()
	const location = useLocation();
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [sites, setSites] = useState([])
	const [editingSite, setEditingSite] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [backendErrors, setBackendErrors] = useState({})
	const [selectedPincode, setSelectedPincode] = useState(null)
	const [placeholder, setPlaceholder] = useState("Search by site name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["site name", "location", "status"]
	const [formData, setFormData] = useState(INITIAL_FORM_STATE)
	const [checkoutPreview, setCheckoutPreview] = useState(null)
	const [checkoutRemoved, setCheckoutRemoved] = useState(false)
	const [selectedSite, setSelectedSite] = useState(null)
	const [paymentSummary, setPaymentSummary] = useState(null)
	const [payments, setPayments] = useState([])
	const [paymentFormData, setPaymentFormData] = useState(INITIAL_PAYMENT_STATE)
	const [editingPayment, setEditingPayment] = useState(null)
	const [paymentBackendErrors, setPaymentBackendErrors] = useState({})
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
	const [isPaymentFormModalOpen, setIsPaymentFormModalOpen] = useState(false)
	const [sitePermissions, setSitePermissions] = useState({
		can_add: false, can_edit: false, can_delete: false, can_view: false
	})

	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.site){
					return{
						can_add: permissions.site.can_add || false,
						can_edit: permissions.site.can_edit || false,
						can_delete: permissions.site.can_delete || false,
						can_view: permissions.site.can_view || false,
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
		setSitePermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setSitePermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Auto-open payment modal when navigated from Dashboard "Pay In"
	useEffect(() => {
		const state = location.state;
		if (state?.openPayment && state?.siteId && sites.length > 0) {
			const targetSite = sites.find(s => String(s.id) === String(state.siteId));
			if (targetSite) {
				// Load payment data silently in background
				fetchPaymentSummary(targetSite.id);
				fetchPayments(targetSite.id);
				setSelectedSite(targetSite);

				// Open Add Payment form directly — no history modal
				setEditingPayment(null);
				setPaymentFormData(INITIAL_PAYMENT_STATE);
				setPaymentBackendErrors({});
				setIsPaymentFormModalOpen(true);

				// Clear state so refresh doesn't reopen
				window.history.replaceState({}, document.title);
			}
		}
	}, [location.state, sites]);

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

	const fetchSites = useCallback(async () => {
		setIsLoading(true)
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/site`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter || undefined,
				},
			})
			if(response.data.success){
				setSites(response.data.data || [])
				setTotalRows(response.data.meta?.total || response.data.total || 0)
			}
		}catch(err){
			console.error("Error fetching sites:", err)
			toast.error(err.response?.data?.message || "Failed to fetch sites")
			setSites([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter])

	const fetchPaymentSummary = useCallback(async (siteId) => {
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/site-payment/${siteId}/summary`)
			if(response.data.success){
				setPaymentSummary(response.data.data)
			}
		}catch(err){
			console.error("Error fetching payment summary:", err)
			toast.error("Failed to fetch payment summary")
		}
	}, [])

	const fetchPayments = useCallback(async (siteId) => {
		setIsLoading(true)
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/site-payment/${siteId}/payments`, {
				params: { page: 1, limit: 100 }
			})
			if(response.data.success){
				setPayments(response.data.data || [])
			}
		}catch(err){
			console.error("Error fetching payments:", err)
			toast.error("Failed to fetch payment history")
			setPayments([])
		}finally{
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchSites()
	}, [fetchSites])

	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex(prev => prev + 1)
			}else if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex(prev => prev - 1)
			}else if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex(prev => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting])

	const handleExcelExport = useCallback(() => {
		try{
			const exportData = sites.map((site, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Site Name': site.name,
				'Location': site.full_address || `${site.pincode || ''}, ${site.district || ''}, ${site.state || ''}`,
				'Status': site.status?.charAt(0).toUpperCase() + site.status?.slice(1),
				'Budget (₹)': site.total_budget ? parseFloat(site.total_budget).toLocaleString("en-IN") : '-',
				'Start Date': site.start_date ? new Date(site.start_date).toLocaleDateString() : '-',
				'Created At': new Date(site.created_at).toLocaleString(),
			}))
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }]
			XLSX.utils.book_append_sheet(wb, ws, 'Sites')
			const timestamp = new Date().toISOString().split('T')[0]
			XLSX.writeFile(wb, `sites_${timestamp}.xlsx`)
			toast.success('Excel file exported successfully')
		}catch(error){
			console.error('Error exporting Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [sites, currentPage, perPage])

	const handleAddClick = () => {
		if(!sitePermissions.can_add){
			toast.error("You don't have permission to add sites")
			return
		}
		setEditingSite({ isNew: true })
		setFormData(INITIAL_FORM_STATE)
		setCheckoutPreview(null)
		setCheckoutRemoved(false)
		setSelectedPincode(null)
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (site) => {
		if(!sitePermissions.can_edit){
			toast.error("You don't have permission to edit sites")
			return
		}
		setEditingSite(site)
		setFormData({
			name: site.name || "", client_name: site.client_name || "", client_mobile: site.client_mobile || "",
			pincode: site.pincode || "", district: site.district || "", state: site.state || "",
			region: site.region || "", country: site.country || "India", post_office_name: site.post_office_name || "",
			full_address: site.full_address || "", start_date: site.start_date ? site.start_date.split("T")[0] : "",
			total_budget: site.total_budget || "", status: site.status || "planning", notes: site.notes || "",
			checkout_photo: null
		})
		setCheckoutPreview(site.checkout_photo || null)
		setCheckoutRemoved(false)
		if(site.pincode){
			setSelectedPincode({
				value: site.pincode,
				label: `${site.pincode} - ${site.district || ''}, ${site.state || ''}`,
				data: {
					pincode: site.pincode, district: site.district, state: site.state,
					region: site.region, country: site.country
				}
			})
		}
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleCancelEdit = () => {
		setEditingSite(null)
		setFormData(INITIAL_FORM_STATE)
		setCheckoutPreview(null)
		setCheckoutRemoved(false)
		setSelectedPincode(null)
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleCheckoutPhotoChange = (e) => {
		const file = e.target.files[0]
		if(file){
			if (!file.type.startsWith('image/')) {
				toast.error("Please select an image file (JPG/PNG)")
				return
			}
			setFormData((prev) => ({ ...prev, checkout_photo: file }))
			setCheckoutPreview(URL.createObjectURL(file))
			setCheckoutRemoved(false)
			if(backendErrors.checkout_photo){
				setBackendErrors((prev) => ({ ...prev, checkout_photo: "" }))
			}
		}
	}

	const handleCheckoutPhotoDelete = () => {
		setFormData((prev) => ({ ...prev, checkout_photo: null }))
		setCheckoutPreview(null)
		setCheckoutRemoved(true)
		const fileInput = document.getElementById("checkoutPhoto")
		if(fileInput) fileInput.value = ""
		if(backendErrors.checkout_photo){
			setBackendErrors((prev) => ({ ...prev, checkout_photo: "" }))
		}
	}

	const handleSaveSite = async () => {
		setIsLoading(true)
		try{
			const formPayload = new FormData()
			
			// Append all regular fields
			Object.entries(formData).forEach(([key, value]) => {
				if (key !== "checkout_photo" && value !== null && value !== undefined) {
					formPayload.append(key, value)
				}
			})

			// Handle checkout photo
			if (formData.checkout_photo) {
				formPayload.append("checkout_photo", formData.checkout_photo)
			}
			if (!editingSite?.isNew) {
				formPayload.append("checkoutRemoved", checkoutRemoved.toString())
			}

			const url = editingSite?.isNew 
				? `${import.meta.env.VITE_API_URL}/api/site` 
				: `${import.meta.env.VITE_API_URL}/api/site/${editingSite.id}`
			
			const response = await axios({
				method: editingSite?.isNew ? "post" : "put",
				url,
				data: formPayload,
				headers: { "Content-Type": "multipart/form-data" },
			})

			if(response.data.success){
				toast.success(editingSite?.isNew ? "Site created successfully" : "Site updated successfully")
				handleCancelEdit()
				fetchSites()
			}
		}catch(err){
			if(err.response?.status === 400 && err.response.data.errors){
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			}else{
				toast.error(err.response?.data?.message || "Failed to save site")
			}
		}finally{
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (site) => {
		if(!window.confirm("Are you sure you want to delete this site?")) return
		setIsLoading(true)
		try{
			await axios.delete(`${import.meta.env.VITE_API_URL}/api/site/${site.id}`)
			toast.success("Site deleted successfully")
			fetchSites()
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to delete site")
		}finally{
			setIsLoading(false)
		}
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleSelectChange = (name, selectedOption) => {
		const value = selectedOption?.value ?? ""
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}
	
	const handleViewPayments = async (site) => {
		setSelectedSite(site)
		await fetchPaymentSummary(site.id)
		await fetchPayments(site.id)
		setIsPaymentModalOpen(true)
	}

	const handleAddPayment = () => {
		setEditingPayment(null)
		setPaymentFormData(INITIAL_PAYMENT_STATE)
		setPaymentBackendErrors({})
		setIsPaymentFormModalOpen(true)
	}

	const handleEditPayment = (payment) => {
		setEditingPayment(payment)
		setPaymentFormData({
			payment_date: payment.payment_date,
			amount: payment.amount,
			payment_mode: payment.payment_mode,
			transaction_reference: payment.transaction_reference || "",
			notes: payment.notes || ""
		})
		setPaymentBackendErrors({})
		setIsPaymentFormModalOpen(true)
	}

	const handleSavePayment = async () => {
		setIsLoading(true)
		try{
			const url = editingPayment 
				? `${import.meta.env.VITE_API_URL}/api/site-payment/${selectedSite.id}/payments/${editingPayment.id}`
				: `${import.meta.env.VITE_API_URL}/api/site-payment/${selectedSite.id}/payments`
			const method = editingPayment ? "put" : "post"
			const response = await axios[method](url, paymentFormData)
			
			if(response.data.success){
				toast.success(editingPayment ? "Payment updated successfully" : "Payment recorded successfully")
				setIsPaymentFormModalOpen(false)
				await fetchPaymentSummary(selectedSite.id)
				await fetchPayments(selectedSite.id)
				fetchSites()
			}
		}catch(err){
			if(err.response?.status === 400 && err.response.data.errors){
				setPaymentBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			}else{
				toast.error(err.response?.data?.message || "Failed to save payment")
			}
		}finally{
			setIsLoading(false)
		}
	}

	const handleDeletePayment = async (payment) => {
		if(!window.confirm("Are you sure you want to cancel this payment?")) return
		setIsLoading(true)
		try{
			await axios.delete(`${import.meta.env.VITE_API_URL}/api/site-payment/${selectedSite.id}/payments/${payment.id}`)
			toast.success("Payment cancelled successfully")
			await fetchPaymentSummary(selectedSite.id)
			await fetchPayments(selectedSite.id)
			fetchSites()
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to cancel payment")
		}finally{
			setIsLoading(false)
		}
	}

	const handlePaymentInputChange = (e) => {
		const { name, value } = e.target
		setPaymentFormData(prev => ({ ...prev, [name]: value }))
		setPaymentBackendErrors(prev => ({ ...prev, [name]: "" }))
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
				headerName: "Site Name",
				field: "name",
				sortable: true,
				flex: 1,
				minWidth: 200,
			},
			{
				headerName: "Status",
				field: "status",
				sortable: true,
				width: 130,
				cellRenderer: (params) => {
					const status = params.value
					const colors = {
						planning: "bg-yellow-100 text-yellow-800",
						active: "bg-green-100 text-green-800",
						completed: "bg-blue-100 text-blue-800",
					}
					return (
						<span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
							{status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
						</span>
					)
				},
			},
			{
				headerName: "Budget (₹)",
				field: "total_budget",
				sortable: true,
				width: 140,
				valueFormatter: (params) =>
					params.value ? `₹${parseFloat(params.value).toLocaleString("en-IN")}` : "-",
			},
			{
				headerName: "Start Date",
				field: "start_date",
				sortable: true,
				width: 150,
				valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : "-",
			},
		]
		
		baseColumns.push({
			headerName: "Actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					<button
						onClick={() => handleViewPayments(params.data)}
						className="p-1 text-green-600 hover:text-green-800 transition-colors"
						title="View Payments"
					>
						<Eye size={16} />
					</button>
					{sitePermissions.can_edit && (
						<button
							onClick={() => handleEditClick(params.data)}
							className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
							title="Edit"
						>
							<Edit size={16} style={{ color: theme.primaryGradientStart }} />
						</button>
					)}
					{sitePermissions.can_delete && (
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
			minWidth: 120,
			sortable: false,
		})
		
		return baseColumns
	}, [currentPage, perPage, sitePermissions, theme.primaryGradientStart])

	const paymentColumnDefs = useMemo(() => [
		{
			headerName: "S.No",
			width: 70,
			valueGetter: (params) => (params.node.rowIndex ?? 0) + 1,
		},
		{
			headerName: "Date",
			field: "payment_date",
			flex: 1,
			valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
		},
		{
			headerName: "Amount (₹)",
			field: "amount",
			flex: 1,
			valueFormatter: (params) => `₹${parseFloat(params.value).toLocaleString("en-IN")}`,
		},
		{
			headerName: "Mode",
			field: "payment_mode",
			flex: 1,
			valueFormatter: (params) => {
				const modes = {
					cash: "Cash", cheque: "Cheque", bank_transfer: "Bank Transfer",
					upi: "UPI", card: "Card", other: "Other"
				}
				return modes[params.value] || params.value
			}
		},
		{
			headerName: "Cumulative Paid",
			field: "cumulative_paid",
			flex: 1,
			valueFormatter: (params) => `₹${parseFloat(params.value).toLocaleString("en-IN")}`,
		},
		{
			headerName: "Balance",
			field: "balance_after",
			flex: 1,
			valueFormatter: (params) => `₹${parseFloat(params.value).toLocaleString("en-IN")}`,
			cellStyle: (params) => ({
				color: params.value > 0 ? '#f59e0b' : '#10b981',
				fontWeight: '500'
			})
		},
		{
			headerName: "Actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					<button
						onClick={() => handleEditPayment(params.data)}
						className="p-1 text-blue-600 hover:text-blue-800"
						title="Edit"
					>
						<Edit size={14} />
					</button>
					<button
						onClick={() => handleDeletePayment(params.data)}
						className="p-1 text-red-600 hover:text-red-800"
						title="Cancel"
					>
						<Trash2 size={14} />
					</button>
				</div>
			),
			width: 100,
		}
	], [])

	const renderSiteForm = () => (
		<div className="space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
				<ThemeUI.FormField label="Site Name" name="name" error={backendErrors.name} required>
					<ThemeUI.Input name="name" value={formData.name} onChange={handleInputChange}
						placeholder="Enter site name" error={backendErrors.name} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Client Name" name="client_name" error={backendErrors.client_name}>
					<ThemeUI.Input name="client_name" value={formData.client_name} onChange={handleInputChange}
						placeholder="Enter client name (optional)" error={backendErrors.client_name} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Client Mobile" name="client_mobile" error={backendErrors.client_mobile} required>
					<ThemeUI.Input type="tel" name="client_mobile" value={formData.client_mobile} onChange={handleInputChange}
						placeholder="10-digit mobile number" maxLength={10} error={backendErrors.client_mobile} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Total Budget (₹)" name="total_budget" error={backendErrors.total_budget} required>
					<ThemeUI.Input type="number" name="total_budget" value={formData.total_budget} onChange={handleInputChange}
						placeholder="0.00" error={backendErrors.total_budget} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Start Date" name="start_date" error={backendErrors.start_date} required>
					<ThemeUI.Input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange}
						error={backendErrors.start_date} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Status" name="status" error={backendErrors.status} required>
					<ThemeUI.Select value={formData.status} onChange={(opt) => handleSelectChange("status", opt)}
						options={[
							{ value: "planning", label: "Planning" },
							{ value: "active", label: "Active" },
							{ value: "completed", label: "Completed" },
						]}
						placeholder="Select status" error={backendErrors.status} />
				</ThemeUI.FormField>
			</div>
			<ThemeUI.FormField label="Search by Pincode" name="pincode" error={backendErrors.pincode}>
				<ThemeUI.AutoComplete id="pincode_autocomplete" name="pincode"
					value={selectedPincode ? [selectedPincode] : []} loadOptions={loadPincodeOptions}
					onChange={(selected) => {
						const selectedOption = selected?.[0] || null
						setSelectedPincode(selectedOption)
						if(selectedOption?.data){
							const po = selectedOption.data
							setFormData(prev => ({
								...prev, post_office_name: po.name, pincode: po.pincode,
								district: po.district, state: po.state, region: po.region || "",
								country: po.country || "India",
							}))
						}else{
							setFormData(prev => ({
								...prev, pincode: "", district: "", state: "", region: "",
							}))
						}
						setBackendErrors(prev => ({ ...prev, pincode: undefined }))
					}}
					placeholder="Type 6-digit pincode..." isMulti={false} minInputLength={0} cacheOptions />
			</ThemeUI.FormField>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ThemeUI.FormField label="Full Address" name="full_address" error={backendErrors.full_address}>
					<ThemeUI.Textarea name="full_address" value={formData.full_address} onChange={handleInputChange}
						rows={5} placeholder="Enter complete address" error={backendErrors.full_address} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Notes" name="notes" error={backendErrors.notes}>
					<ThemeUI.Textarea name="notes" value={formData.notes} onChange={handleInputChange}
						rows={5} placeholder="Additional notes" error={backendErrors.notes} />
				</ThemeUI.FormField>
			</div>

			<ThemeUI.FormField 
				label="Site Checkout Photo" 
				name="checkout_photo" 
				error={backendErrors.checkout_photo}
			>
				<ThemeUI.FileInput
					id="checkoutPhoto"
					name="checkout_photo"
					onChange={handleCheckoutPhotoChange}
					accept="image/*"
					preview={checkoutPreview}
					onDelete={handleCheckoutPhotoDelete}
					error={backendErrors.checkout_photo}
					showDeleteIcon={true}
				/>
				<p className="text-xs text-gray-500 mt-1">
					Upload a clear photo of the completed site (JPG/PNG recommended)
				</p>
			</ThemeUI.FormField>

			<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
				<ThemeUI.Button onClick={handleCancelEdit}
					gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button onClick={handleSaveSite} disabled={isLoading}
					gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
					direction={theme.gradientDirection}>
					{isLoading ? (<><Loader size={16} className="mr-2 animate-spin" />Saving...</>) : 
						editingSite?.isNew ? "Create Site" : "Update Site"}
				</ThemeUI.Button>
			</div>
		</div>
	)

	const renderPaymentForm = () => (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<ThemeUI.FormField label="Payment Date" name="payment_date" error={paymentBackendErrors.payment_date} required>
					<ThemeUI.Input type="date" name="payment_date" value={paymentFormData.payment_date}
						onChange={handlePaymentInputChange} error={paymentBackendErrors.payment_date} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Amount (₹)" name="amount" error={paymentBackendErrors.amount} required>
					<ThemeUI.Input type="number" name="amount" value={paymentFormData.amount}
						onChange={handlePaymentInputChange} placeholder="0.00" error={paymentBackendErrors.amount} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Payment Mode" name="payment_mode" error={paymentBackendErrors.payment_mode} required>
					<ThemeUI.Select value={paymentFormData.payment_mode}
						onChange={(opt) => {
							setPaymentFormData(prev => ({ ...prev, payment_mode: opt?.value || "cash" }))
							setPaymentBackendErrors(prev => ({ ...prev, payment_mode: "" }))
						}}
						options={[
							{ value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" },
							{ value: "bank_transfer", label: "Bank Transfer" }, { value: "upi", label: "UPI" },
							{ value: "card", label: "Card" }, { value: "other", label: "Other" },
						]}
						error={paymentBackendErrors.payment_mode} />
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Transaction Reference" name="transaction_reference" 
					error={paymentBackendErrors.transaction_reference}>
					<ThemeUI.Input name="transaction_reference" value={paymentFormData.transaction_reference}
						onChange={handlePaymentInputChange} placeholder="Cheque no., Transaction ID, etc."
						error={paymentBackendErrors.transaction_reference} />
				</ThemeUI.FormField>
			</div>
			<ThemeUI.FormField label="Notes" name="notes" error={paymentBackendErrors.notes}>
				<ThemeUI.Textarea name="notes" value={paymentFormData.notes} onChange={handlePaymentInputChange}
					rows={3} placeholder="Additional notes" error={paymentBackendErrors.notes} />
			</ThemeUI.FormField>
			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<ThemeUI.Button onClick={() => setIsPaymentFormModalOpen(false)}
					gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button onClick={handleSavePayment} disabled={isLoading}
					gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
					{isLoading ? (<><Loader size={16} className="mr-2 animate-spin" />Saving...</>) : 
						editingPayment ? "Update Payment" : "Record Payment"}
				</ThemeUI.Button>
			</div>
		</div>
	)

	const renderPaymentHistory = () => (
		<div className="space-y-6">
			{paymentSummary && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-blue-50 p-4 rounded-lg">
						<p className="text-sm text-gray-600 mb-1">Total Budget</p>
						<p className="text-2xl font-bold text-blue-600">
							₹{parseFloat(paymentSummary.total_budget).toLocaleString("en-IN")}
						</p>
					</div>
					<div className="bg-green-50 p-4 rounded-lg">
						<p className="text-sm text-gray-600 mb-1">Total Paid</p>
						<p className="text-2xl font-bold text-green-600">
							₹{parseFloat(paymentSummary.total_paid).toLocaleString("en-IN")}
						</p>
					</div>
					<div className="bg-orange-50 p-4 rounded-lg">
						<p className="text-sm text-gray-600 mb-1">Balance</p>
						<p className="text-2xl font-bold text-orange-600">
							₹{parseFloat(paymentSummary.balance).toLocaleString("en-IN")}
						</p>
					</div>
					<div className="bg-purple-50 p-4 rounded-lg">
						<p className="text-sm text-gray-600 mb-1">Payment Progress</p>
						<p className="text-2xl font-bold text-purple-600">
							{paymentSummary.payment_percentage}%
						</p>
						<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
							<div className="bg-purple-600 h-2 rounded-full transition-all duration-300"
								style={{ width: `${paymentSummary.payment_percentage}%` }}></div>
						</div>
					</div>
				</div>
			)}
			
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Payment History</h3>
				<ThemeUI.Button onClick={handleAddPayment}
					gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
					<Plus size={16} className="mr-2" /> Add Payment
				</ThemeUI.Button>
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
					})}
					defaultColDef={{ resizable: true, sortable: true, filter: false }}
					columnDefs={paymentColumnDefs}
					rowData={payments}
					rowHeight={55}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Payment History Found" }}
					loading={isLoading}
				/>
			</div>
		</div>
	)

	return (
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Sites Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
						<li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Sites</li>
					</ol>
				</nav>
			</div>
			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
							placeholder={placeholder} leftElement={<Search size={16} className="text-gray-400" />} />
					</div>
					<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto max-sm:text-sm">
						<ThemeUI.Button onClick={handleExcelExport}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
							direction={theme.gradientDirection}>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
						<ThemeUI.Button onClick={() => setIsOffcanvasOpen(true)}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
							direction={theme.gradientDirection}>
							<Filter size={16} className="mr-2" /> Filters
						</ThemeUI.Button>
						{sitePermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}>
								<Plus size={16} className="mr-2" /> Add Site
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
					rowData={sites}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={(params) => {
						if(!params.api) return
						const newPage = params.api.paginationGetCurrentPage() + 1
						const newPageSize = params.api.paginationGetPageSize()
						let shouldRefetch = false
						if(newPage !== currentPage){ setCurrentPage(newPage); shouldRefetch = true }
						if(newPageSize !== perPage){ setPerPage(newPageSize); setCurrentPage(1); shouldRefetch = true }
						if(shouldRefetch){ setTimeout(() => gridRef.current?.api?.ensureIndexVisible(0), 100) }
					}}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Sites Found" }}
					loading={isLoading}
				/>
			</div>
			
			<Modal isOpen={isModalOpen} onClose={handleCancelEdit}
				title={editingSite?.isNew ? "Add New Site" : "Edit Site"} size="full">
				{renderSiteForm()}
			</Modal>
			
			<Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)}
				title={`Payment History - ${selectedSite?.name || ''}`} size="full">
				{renderPaymentHistory()}
			</Modal>
			
			<Modal isOpen={isPaymentFormModalOpen} onClose={() => setIsPaymentFormModalOpen(false)}
				title={editingPayment ? "Edit Payment" : "Add Payment"} size="full">
				{renderPaymentForm()}
			</Modal>
			
			<Offcanvas isOpen={isOffcanvasOpen} onClose={() => setIsOffcanvasOpen(false)}
				title="Filter Options" position="right" size="md">
				<div className="space-y-4">
					<ThemeUI.FormField label="Status Filter">
						<ThemeUI.Select value={statusFilter}
							onChange={(opt) => { setStatusFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "planning", label: "Planning" },
								{ value: "active", label: "Active" },
								{ value: "completed", label: "Completed" },
							]}
							placeholder="All Statuses" isClearable={true} />
					</ThemeUI.FormField>
					<div className="flex gap-2">
						<ThemeUI.Button onClick={() => { setStatusFilter(""); setCurrentPage(1) }}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
							Reset Filters
						</ThemeUI.Button>
					</div>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default Site