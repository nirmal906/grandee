import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import Layout from './layout';
import { Building2, Wallet, TrendingUp, TrendingDown, RefreshCw, AlertCircle, IndianRupee, Search, Download, AlertTriangle, CreditCard, Activity } from 'lucide-react';
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import axios from "../utils/axios"

function Dashboard(){
	const navigate  = useNavigate(); 
	const { theme } = useTheme();

	// Get date 7 days ago in YYYY-MM-DD format
	const getSevenDaysAgo = () => {
		const date = new Date();
		date.setDate(date.getDate() - 7);
		return date.toISOString().split('T')[0];
	};

	// Get today's date in YYYY-MM-DD format
	const getToday = () => {
		return new Date().toISOString().split('T')[0];
	};
	
	const [fromDate, setFromDate] = useState(getSevenDaysAgo());
	const [toDate, setToDate] = useState(getToday());
	const [selectedSite, setSelectedSite] = useState('');
	const [sites, setSites] = useState([]);
	const [dashboardData, setDashboardData] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [materialPending, setMaterialPending] = useState([]);
	const [labourPending, setLabourPending] = useState([]);
	const [materialPendingTotal, setMaterialPendingTotal] = useState(0);
	const [labourPendingTotal, setLabourPendingTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [searchText, setSearchText] = useState('');
	const [materialSearchText, setMaterialSearchText] = useState('');
	const [labourSearchText, setLabourSearchText] = useState('');
	const [gridApi, setGridApi] = useState(null);
	const [materialGridApi, setMaterialGridApi] = useState(null);
	const [labourGridApi, setLabourGridApi] = useState(null);

	// Counter configuration - Updated with new metrics
	const counterConfig = [
		{
			id: 'active-sites',
			title: 'Active Sites',
			dataKey: 'activeSites',
			icon: Building2,
			color: 'bg-blue-500',
			route: '/site',
			format: 'number'
		},
		{
			id: 'total-budget',
			title: 'Total Budget',
			dataKey: 'totalBudget',
			icon: Wallet,
			color: 'bg-green-500',
			route: '/site',
			format: 'currency'
		},
		{
			id: 'client-paid',
			title: 'Client Paid',
			dataKey: 'clientPayments',
			icon: CreditCard,
			color: 'bg-teal-500',
			route: '/site',
			format: 'currency',
			showOutstanding: true
		},
		{
			id: 'material-expense',
			title: 'Material Expense',
			dataKey: 'materialExpense',
			icon: IndianRupee,
			color: 'bg-orange-500',
			route: '/materialentry',
			format: 'currency'
		},
		{
			id: 'labour-expense',
			title: 'Labour Expense',
			dataKey: 'labourExpense',
			icon: IndianRupee,
			color: 'bg-purple-500',
			route: '/labourentry',
			format: 'currency'
		},
		{
			id: 'total-expense',
			title: 'Total Expense',
			dataKey: 'totalExpense',
			icon: TrendingUp,
			color: 'bg-red-500',
			route: null,
			format: 'currency'
		}
	];

	// Loading Component
	const LoadingComponent = ({ message = "Loading dashboard data..." }) => (
		<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
			<div className="relative">
				<div className="w-16 h-16 border-4 border-opacity-20 rounded-full animate-spin"
					style={{ borderColor: theme.primaryGradientStart || '#3b82f6', borderTopColor: 'transparent' }}>
				</div>
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse"
					style={{ backgroundColor: theme.primaryGradientEnd || '#1d4ed8' }}>
				</div>
			</div>
			<p className="mt-4 text-sm font-medium animate-pulse">
				{message}
			</p>
		</div>
	);

	// Error Component
	const ErrorComponent = ({ title, message, onRetry }) => (
		<div className="flex flex-col items-center justify-center h-64 transition-all duration-300">
			<div className="mb-4 p-3 rounded-full bg-red-50 border border-red-200">
				<AlertCircle className="h-8 w-8 text-red-500" />
			</div>
			<div className="text-center mb-6">
				<h3 className="text-lg font-semibold mb-2">{title}</h3>
				<p className="text-sm max-w-md">{message}</p>
			</div>
			<ThemeUI.Button
				type="button"
				onClick={onRetry}
				gradientColors={{
					start: theme.primaryGradientStart,
					end: theme.primaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				className="px-6 py-2 transition-all duration-200 hover:scale-105"
			>
				<RefreshCw className="h-4 w-4 mr-2" />
				Try Again
			</ThemeUI.Button>
		</div>
	);

	// Fetch sites for dropdown
	const fetchSites = async () => {
		try {
			const token = localStorage.getItem('accessToken');
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/sites`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			
			if (response.data.success) {
				setSites(response.data.data || []);
			}
		} catch (err) {
			console.error('Sites fetch error:', err);
		}
	};

	// Fetch dashboard data
	const fetchDashboardData = async () => {
		setLoading(true);
		setError(null);
		try {
			const token = localStorage.getItem('accessToken');
			const params = {
				from_date: fromDate,
				to_date: toDate
			};
			
			if (selectedSite) {
				params.site_id = selectedSite;
			}

			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`, {
				headers: {
					'Authorization': `Bearer ${token}`
				},
				params
			});

			if (response.data.success) {
				setDashboardData(response.data.data);
			}
		} catch (err) {
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching data';
			setError(errorMessage);
			console.error('Dashboard fetch error:', err);
		} finally {
			setLoading(false);
		}
	};

	// Fetch transactions
	const fetchTransactions = async () => {
		try {
			const token = localStorage.getItem('accessToken');
			const params = {
				from_date: fromDate,
				to_date: toDate
			};
			
			if (selectedSite) {
				params.site_id = selectedSite;
			}

			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/transactions`, {
				headers: {
					'Authorization': `Bearer ${token}`
				},
				params
			});

			if (response.data.success) {
				setTransactions(response.data.data || []);
			}
		} catch (err) {
			console.error('Transactions fetch error:', err);
		}
	};

	// Fetch material pending
	const fetchMaterialPending = async () => {
		try {
			const token = localStorage.getItem('accessToken');
			const params = {
				from_date: fromDate,
				to_date: toDate
			};
			
			if (selectedSite) {
				params.site_id = selectedSite;
			}

			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/material-pending`, {
				headers: {
					'Authorization': `Bearer ${token}`
				},
				params
			});

			if (response.data.success) {
				setMaterialPending(response.data.data || []);
				setMaterialPendingTotal(response.data.total_pending || 0);
			}
		} catch (err) {
			console.error('Material pending fetch error:', err);
		}
	};

	// Fetch labour pending
	const fetchLabourPending = async () => {
		try {
			const token = localStorage.getItem('accessToken');
			const params = {
				from_date: fromDate,
				to_date: toDate
			};
			
			if (selectedSite) {
				params.site_id = selectedSite;
			}

			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/labour-pending`, {
				headers: {
					'Authorization': `Bearer ${token}`
				},
				params
			});

			if (response.data.success) {
				setLabourPending(response.data.data || []);
				setLabourPendingTotal(response.data.total_pending || 0);
			}
		} catch (err) {
			console.error('Labour pending fetch error:', err);
		}
	};

	// Fetch all data
	const fetchAllData = async () => {
		await Promise.all([
			fetchSites(),
			fetchDashboardData(),
			fetchTransactions(),
			fetchMaterialPending(),
			fetchLabourPending()
		]);
		if (isInitialLoad) {
			setIsInitialLoad(false);
		}
	};

	// Initial load
	useEffect(() => {
		fetchAllData();
	}, []);

	// Format number with commas
	const formatNumber = (num) => {
		if (num === null || num === undefined) return '0';
		return new Intl.NumberFormat('en-IN').format(num);
	};

	// Format currency
	const formatCurrency = (num) => {
		if (num === null || num === undefined) return '₹0';
		return '₹' + new Intl.NumberFormat('en-IN', {
			maximumFractionDigits: 2,
			minimumFractionDigits: 2
		}).format(num);
	};

	// Format change percentage
	const formatChange = (change) => {
		if (change === null || change === undefined || change === 0) return '0%';
		return `${change > 0 ? '+' : ''}${change}%`;
	};

	// Get display value based on format
	const getDisplayValue = (counter, data) => {
		const counterData = data?.[counter.dataKey];
		const value = counterData?.count !== undefined ? counterData.count : counterData?.amount;
		
		if (counter.format === 'currency') {
			return formatCurrency(value);
		}
		return formatNumber(value);
	};

	// Get selected site name
	const getSelectedSiteName = () => {
		if (!selectedSite) return '';
		const site = sites.find(s => s.id === selectedSite);
		return site ? site.name : '';
	};

	// AG Grid - Format currency for grid
	const formatCurrencyGrid = (params) => {
		if (params.value === null || params.value === undefined) return '₹0.00';
		return '₹' + new Intl.NumberFormat('en-IN', {
			maximumFractionDigits: 2,
			minimumFractionDigits: 2
		}).format(params.value);
	};

	// AG Grid - Format date
	const formatDateGrid = (params) => {
		if (!params.value) return '';
		return new Date(params.value).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	};

	// AG Grid - Type badge renderer
	const TypeBadge = (params) => {
		const type = params.value;
		const colorMap = {
			'Material': 'bg-blue-100 text-blue-800',
			'Labour': 'bg-purple-100 text-purple-800'
		};
		const colorClass = colorMap[type] || 'bg-gray-100 text-gray-800';
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
				{type}
			</span>
		);
	};

	// AG Grid - Transactions Column definitions
	const columnDefs = useMemo(() => [
		{
			headerName: 'Date',
			field: 'date',
			filter: 'agDateColumnFilter',
			sortable: true,
			width: 120,
			valueFormatter: formatDateGrid,
			sort: 'desc'
		},
		{
			headerName: 'Type',
			field: 'transaction_type',
			filter: 'agSetColumnFilter',
			sortable: true,
			width: 110,
			cellRenderer: TypeBadge
		},
		{
			headerName: 'Site',
			field: 'site_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 160
		},
		{
			headerName: 'Item/Labour',
			field: 'item_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 150
		},
		{
			headerName: 'Qty/Workers',
			field: 'quantity',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 140,
			valueFormatter: (params) => {
				if (params.value === null || params.value === undefined) return '-';
				return new Intl.NumberFormat('en-IN', {
					maximumFractionDigits: 2
				}).format(params.value);
			}
		},
		{
			headerName: 'Rate',
			field: 'rate',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 110,
			valueFormatter: formatCurrencyGrid
		},
		{
			headerName: 'Total',
			field: 'total_amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: '600', color: '#1f2937' }
		},
		{
			headerName: 'Paid',
			field: 'amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: 'bold', color: '#059669' }
		},
		{
			headerName: 'Pending',
			field: 'debit_entry',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 140,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: 'bold', color: '#dc2626' }
		},
		{
			headerName: 'Vendor',
			field: 'vendor_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 140,
			valueFormatter: (params) => params.value || '-'
		}
	], []);

	// AG Grid - Material Pending Column definitions
	const materialPendingColumnDefs = useMemo(() => [
		{
			headerName: 'Date',
			field: 'date',
			filter: 'agDateColumnFilter',
			sortable: true,
			width: 120,
			valueFormatter: formatDateGrid,
			sort: 'desc'
		},
		{
			headerName: 'Site',
			field: 'site_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 150
		},
		{
			headerName: 'Material',
			field: 'material_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 150
		},
		{
			headerName: 'Total',
			field: 'total_amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: '600', color: '#1f2937' }
		},
		{
			headerName: 'Pending',
			field: 'pending_amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 140,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: 'bold', color: '#dc2626' }
		}
	], []);

	// AG Grid - Labour Pending Column definitions
	const labourPendingColumnDefs = useMemo(() => [
		{
			headerName: 'Date',
			field: 'date',
			filter: 'agDateColumnFilter',
			sortable: true,
			width: 120,
			valueFormatter: formatDateGrid,
			sort: 'desc'
		},
		{
			headerName: 'Site',
			field: 'site_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 150
		},
		{
			headerName: 'Labour Type',
			field: 'labour_name',
			filter: 'agTextColumnFilter',
			sortable: true,
			width: 150
		},
		{
			headerName: 'Total',
			field: 'total_amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: '600', color: '#1f2937' }
		},
		{
			headerName: 'Pending',
			field: 'pending_amount',
			filter: 'agNumberColumnFilter',
			sortable: true,
			width: 140,
			valueFormatter: formatCurrencyGrid,
			cellStyle: { fontWeight: 'bold', color: '#dc2626' }
		}
	], []);

	// AG Grid - Default column definition
	const defaultColDef = useMemo(() => ({
		resizable: true,
		sortable: true,
		filter: true,
	}), []);

	// AG Grid - Grid ready events
	const onGridReady = useCallback((params) => {
		setGridApi(params.api);
	}, []);

	const onMaterialGridReady = useCallback((params) => {
		setMaterialGridApi(params.api);
	}, []);

	const onLabourGridReady = useCallback((params) => {
		setLabourGridApi(params.api);
	}, []);

	// AG Grid - Quick filter (search)
	const onSearchChange = useCallback((e) => {
		const value = e.target.value;
		setSearchText(value);
		if (gridApi) {
			gridApi.setGridOption('quickFilterText', value);
		}
	}, [gridApi]);

	const onMaterialSearchChange = useCallback((e) => {
		const value = e.target.value;
		setMaterialSearchText(value);
		if (materialGridApi) {
			materialGridApi.setGridOption('quickFilterText', value);
		}
	}, [materialGridApi]);

	const onLabourSearchChange = useCallback((e) => {
		const value = e.target.value;
		setLabourSearchText(value);
		if (labourGridApi) {
			labourGridApi.setGridOption('quickFilterText', value);
		}
	}, [labourGridApi]);

	// Export to CSV
	const exportToCSV = () => {
		if (gridApi) {
			gridApi.exportDataAsCsv({
				fileName: `transactions_${fromDate}_to_${toDate}.csv`
			});
		}
	};

	const exportMaterialPendingToCSV = () => {
		if (materialGridApi) {
			materialGridApi.exportDataAsCsv({
				fileName: `material_pending_${fromDate}_to_${toDate}.csv`
			});
		}
	};

	const exportLabourPendingToCSV = () => {
		if (labourGridApi) {
			labourGridApi.exportDataAsCsv({
				fileName: `labour_pending_${fromDate}_to_${toDate}.csv`
			});
		}
	};

	if (isInitialLoad || loading) {
		return (
			<Layout selectedSite={selectedSite} siteName={getSelectedSiteName()}>
				<LoadingComponent message="Loading dashboard data..." />
			</Layout>
		);
	}

	if (!isInitialLoad && (error || !dashboardData)) {
		return (
			<Layout selectedSite={selectedSite} siteName={getSelectedSiteName()}>
				<ErrorComponent 
					title="Dashboard Unavailable"
					message={error || 'No data available'}
					onRetry={fetchAllData}
				/>
			</Layout>
		);
	}

	return (
		<Layout selectedSite={selectedSite} siteName={getSelectedSiteName()}>
			<div className="opacity-0 animate-fadeIn" style={{animation: 'fadeIn 0.5s ease-in-out forwards'}}>
				{/* Header and Filters in Single Row */}
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
					{/* Left side - Header */}
					<div>
						<h1 className="text-2xl font-bold">Dashboard</h1>
						<p className="mt-1 text-gray-600">Track your construction site expenses and budget</p>
					</div>
					
					{/* Right side - Filters */}
					<div className="flex flex-wrap items-end gap-3">
						{/* Site Dropdown */}
						<div className="min-w-[180px]">
							<ThemeUI.FormField label="Select Site" name="site">
								<ThemeUI.Select
									value={selectedSite}
									onChange={(opt) => setSelectedSite(opt?.value ?? '')}
									options={[
										{ value: '', label: "All Sites" },
										...sites.map(site => ({ value: site.id, label: site.name }))
									]}
									placeholder="All Sites"
								/>
							</ThemeUI.FormField>
						</div>
						
						{/* From Date */}
						<div className="min-w-[150px]">
							<ThemeUI.FormField label="From Date" name="fromDate">
								<ThemeUI.Input
									type="date"
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
								/>
							</ThemeUI.FormField>
						</div>
						
						{/* To Date */}
						<div className="min-w-[150px]">
							<ThemeUI.FormField label="To Date" name="toDate">
								<ThemeUI.Input
									type="date"
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									className="bg-white"
								/>
							</ThemeUI.FormField>
						</div>
						
						{/* Refresh Button */}
						<div>
							<ThemeUI.Button
								type="button"
								onClick={fetchAllData}
								disabled={loading}
								gradientColors={{
									start: theme.primaryGradientStart,
									end: theme.primaryGradientEnd,
								}}
								direction={theme.gradientDirection}
								className="px-6 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
								Refresh
							</ThemeUI.Button>
						</div>
					</div>
				</div>

				{/* Counter Boxes Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
					{counterConfig.map((counter, index) => {
						const IconComponent = counter.icon;
						const counterData = dashboardData?.[counter.dataKey];
						const change = counterData?.change || 0;
						const changeType = counterData?.changeType || 'neutral';
						const percentage = counterData?.percentage;
						
						return (
							<div 
								key={counter.id}
								className="rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 cursor-pointer group transform hover:scale-105"
								style={{ 
									backgroundColor: '#ffffff',
									borderColor: '#e5e7eb',
									animationDelay: `${index * 0.1}s`,
									animation: 'slideUp 0.6s ease-out forwards'
								}}
								onClick={() => counter.route && navigate(counter.route)}
							>
								<div className="p-4">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium group-hover:text-gray-800 transition-colors truncate">
												{counter.title}
											</p>
											<p className="text-lg font-bold mt-1 transition-all duration-200">
												{getDisplayValue(counter, dashboardData)}
											</p>
											
											{/* Show percentage for budget-related cards */}
											{percentage !== undefined && (
												<div className="mt-1">
													<div className="flex items-center justify-between text-xs mb-1">
														<span className="font-medium text-gray-600">
															{percentage.toFixed(2)}%
														</span>
													</div>
													<div className="w-full bg-gray-200 rounded-full h-1.5">
														<div 
															className={`h-1.5 rounded-full transition-all duration-500 ${counter.color}`}
															style={{ width: `${Math.min(percentage, 100)}%` }}
														></div>
													</div>
												</div>
											)}
											
											{/* Show change indicator for non-activeSites cards without percentage */}
											{counter.dataKey !== 'activeSites' && percentage === undefined && !counter.showOutstanding && (
												<div className="flex items-center mt-1">
													<span className={`text-xs font-medium flex items-center transition-all duration-200 ${
														changeType === 'positive' ? 'text-green-600' : 
														changeType === 'negative' ? 'text-red-600' : 
														'text-gray-500'
													}`}>
														{changeType === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
														{changeType === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
														{formatChange(change)}
													</span>
													<span className="text-xs ml-1 text-gray-500">
														vs last period
													</span>
												</div>
											)}
										</div>
										<div className={`${counter.color} p-2 rounded-lg ml-2 flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
											<IconComponent className="h-4 w-4 text-white" />
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Cash Flow and Budget Cards - Side by Side */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					{/* Cash Flow Card */}
					{dashboardData?.cashFlow && (
						<div className={`p-4 rounded-lg shadow-sm border transition-all duration-300 ${
							dashboardData.cashFlow.status === 'surplus' 
								? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
								: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
						}`}>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<div className={`p-2 rounded-lg ${
										dashboardData.cashFlow.status === 'surplus' ? 'bg-green-500' : 'bg-red-500'
									}`}>
										<Activity className="h-5 w-5 text-white" />
									</div>
									<div>
										<h3 className="text-sm font-semibold text-gray-700">Cash Flow</h3>
										<p className="text-xs text-gray-600">
											{dashboardData.cashFlow.status === 'surplus' ? 'Surplus' : 'Deficit'}
										</p>
									</div>
								</div>
								<span className={`text-2xl font-bold ${
									dashboardData.cashFlow.status === 'surplus' ? 'text-green-700' : 'text-red-700'
								}`}>
									{formatCurrency(Math.abs(dashboardData.cashFlow.amount))}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-gray-600">
									{Math.abs(dashboardData.cashFlow.percentage).toFixed(2)}% of budget
								</span>
								<span className={`font-semibold ${
									dashboardData.cashFlow.status === 'surplus' ? 'text-green-700' : 'text-red-700'
								}`}>
									{dashboardData.cashFlow.status === 'surplus' 
										? 'Client paid more than expenses' 
										: 'Expenses exceed client payments'}
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
								<div 
									className={`h-2 rounded-full transition-all duration-500 ${
										dashboardData.cashFlow.status === 'surplus' ? 'bg-green-600' : 'bg-red-600'
									}`}
									style={{ width: `${Math.min(Math.abs(dashboardData.cashFlow.percentage), 100)}%` }}
								></div>
							</div>
						</div>
					)}

					{/* Budget Remaining Card */}
					{dashboardData?.budgetUtilization && (
						<div className="p-4 rounded-lg shadow-sm bg-white border border-gray-200 transition-all duration-300">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<div className="bg-blue-500 p-2 rounded-lg">
										<Wallet className="h-5 w-5 text-white" />
									</div>
									<div>
										<h3 className="text-sm font-semibold text-gray-700">Budget Remaining</h3>
										<p className="text-xs text-gray-600">Available for expenses</p>
									</div>
								</div>
								<span className="text-2xl font-bold text-black">
									{formatCurrency(dashboardData.budgetUtilization.remaining)}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs mb-2">
								<span className="font-medium text-gray-600">
									{dashboardData.budgetUtilization.remainingPercentage.toFixed(2)}% of total budget
								</span>
								<span className="font-semibold text-gray-600">
									{dashboardData.budgetUtilization.percentage.toFixed(2)}% utilized
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div 
									className="bg-blue-600 h-2 rounded-full transition-all duration-500"
									style={{ width: `${Math.min(dashboardData.budgetUtilization.remainingPercentage, 100)}%` }}
								></div>
							</div>
						</div>
					)}
				</div>

				{/* Transaction Table Section */}
				<div className="mt-8">
					<div className="mb-4">
						<h2 className="text-xl font-bold">Recent Transactions</h2>
						<p className="text-sm text-gray-600 mt-1">Material and labour entries for the selected period</p>
					</div>
					
					{/* Search and Export Bar */}
					<div className="mb-4">
						<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
							<div className="w-full sm:w-1/3">
								<ThemeUI.Input
									value={searchText}
									onChange={onSearchChange}
									placeholder="Search transactions..."
									leftElement={<Search size={16} className="text-gray-400" />}
									className="bg-white"
								/>
							</div>
							<div className="flex gap-2">
								<ThemeUI.Button 
									onClick={exportToCSV} 
									gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
									direction={theme.gradientDirection}
								>
									<Download className="h-4 w-4 me-2" /> Export
								</ThemeUI.Button>
							</div>
						</div>
					</div>
					
					{/* AG Grid Table */}
					<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
						<AgGridReact
							className="custom-ag-grid"
							domLayout="autoHeight"
							theme={themeQuartz.withParams({ 
								spacing: 7, 
								headerHeight: 45, 
								headerFontSize: 16, 
								fontSize: 13, 
								headerTextColor: "white" 
							})}
							defaultColDef={defaultColDef}
							rowData={transactions}
							rowHeight={55}
							columnDefs={columnDefs}
							pagination={true}
							paginationPageSize={10}
							paginationPageSizeSelector={[10, 20, 50, 100]}
							onGridReady={onGridReady}
						/>
					</div>
				</div>

				{/* Pending Expenses Tables - Side by Side */}
				<div className='mt-8 '>
					<div className="mb-4">
						<h2 className="text-xl font-bold">Pending Payments</h2>
						<p className="text-sm text-gray-600 mt-1">Track unpaid material and labour expenses</p>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Material Pending Table */}
						<div>
							{/* Search and Export */}
							<div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
								<div className="w-full sm:w-2/3">
									<ThemeUI.Input
										value={materialSearchText}
										onChange={onMaterialSearchChange}
										placeholder="Search materials..."
										leftElement={<Search size={16} className="text-gray-400" />}
										className="bg-white"
									/>
								</div>
								<ThemeUI.Button 
									onClick={exportMaterialPendingToCSV} 
									gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
									direction={theme.gradientDirection}
									className="w-full sm:w-auto"
								>
									<Download className="h-4 w-4 me-2" /> Export
								</ThemeUI.Button>
							</div>
							{/* AG Grid Table */}
							<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<AgGridReact
									className="custom-ag-grid"
									domLayout="autoHeight"
									theme={themeQuartz.withParams({ 
										spacing: 7, 
										headerHeight: 45, 
										headerFontSize: 14, 
										fontSize: 12, 
										headerTextColor: "white" 
									})}
									defaultColDef={defaultColDef}
									rowData={materialPending}
									rowHeight={50}
									columnDefs={materialPendingColumnDefs}
									pagination={true}
									paginationPageSize={6}
									paginationPageSizeSelector={[6, 12, 20]}
									onGridReady={onMaterialGridReady}
								/>
							</div>
						</div>
						{/* Labour Pending Table */}
						<div>
							{/* Search and Export */}
							<div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
								<div className="w-full sm:w-2/3">
									<ThemeUI.Input
										value={labourSearchText}
										onChange={onLabourSearchChange}
										placeholder="Search labour..."
										leftElement={<Search size={16} className="text-gray-400" />}
										className="bg-white"
									/>
								</div>
								<ThemeUI.Button 
									onClick={exportLabourPendingToCSV} 
									gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
									direction={theme.gradientDirection}
									className="w-full sm:w-auto"
								>
									<Download className="h-4 w-4 me-2" /> Export
								</ThemeUI.Button>
							</div>
							{/* AG Grid Table */}
							<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<AgGridReact
									className="custom-ag-grid"
									domLayout="autoHeight"
									theme={themeQuartz.withParams({ 
										spacing: 7, 
										headerHeight: 45, 
										headerFontSize: 14, 
										fontSize: 12, 
										headerTextColor: "white" 
									})}
									defaultColDef={defaultColDef}
									rowData={labourPending}
									rowHeight={50}
									columnDefs={labourPendingColumnDefs}
									pagination={true}
									paginationPageSize={6}
									paginationPageSizeSelector={[6, 12, 20]}
									onGridReady={onLabourGridReady}
								/>
							</div>
						</div>
					</div>
				</div>
				{/* Data freshness indicator */}
				<div className="mt-6 text-right">
					<p className="text-xs text-gray-500">
						Data last updated: {new Date().toLocaleString('en-IN', {
							timeZone: 'Asia/Kolkata',
							day: '2-digit',
							month: '2-digit', 
							year: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</p>
				</div>
			</div>
			
			<style>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</Layout>
	);
}
export default Dashboard