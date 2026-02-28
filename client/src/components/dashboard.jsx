import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import Layout from './layout';
import {
	Building2, Wallet, Package, Users, TrendingUp, TrendingDown,
	RefreshCw, AlertCircle, IndianRupee, Search, Download,
	CreditCard, Activity, ArrowDownCircle, ArrowUpCircle,
	CheckCircle2, Loader, X
} from 'lucide-react';
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import axios from "../utils/axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
	'₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d) =>
	d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatCurrencyGrid = (params) => {
	if (params.value == null) return '₹0.00';
	return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(params.value);
};

const formatDateGrid = (params) => {
	if (!params.value) return '';
	return new Date(params.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Pay-Out Modal ────────────────────────────────────────────────────────────
function PayOutModal({ site, onClose, onSuccess, theme }) {
	const [data, setData]       = useState(null);
	const [loading, setLoading] = useState(true);
	const [marking, setMarking] = useState(null);
	const [search, setSearch]   = useState('');
	const [tab, setTab]         = useState('all');

	const fetchPending = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem('accessToken');
			const res = await axios.get(
				`/api/dashboard/payout-pending/${site.id}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			if (res.data.success) setData(res.data);
		} catch (err) {
			console.error('Payout fetch error:', err);
		} finally {
			setLoading(false);
		}
	}, [site.id]);

	useEffect(() => { fetchPending(); }, [fetchPending]);

	const handleMarkPaid = async (entry) => {
		const key = `${entry.type}-${entry.id}`;
		setMarking(key);
		try {
			const token = localStorage.getItem('accessToken');
			const url = entry.type === 'material'
				? `/api/material-entry/${entry.id}/mark-paid`
				: `/api/labour-entry/${entry.id}/mark-paid`;
			const res = await axios.patch(url, {}, { headers: { Authorization: `Bearer ${token}` } });
			if (res.data.success) { await fetchPending(); onSuccess(); }
		} catch (err) {
			console.error('Mark paid error:', err);
		} finally {
			setMarking(null);
		}
	};

	const allEntries = useMemo(() => {
		if (!data) return [];
		const pool =
			tab === 'material' ? (data.data.materials || []) :
			tab === 'labour'   ? (data.data.labours   || []) :
			[...(data.data.materials || []), ...(data.data.labours || [])];
		return pool.filter(e =>
			!search ||
			e.name.toLowerCase().includes(search.toLowerCase()) ||
			(e.vendor || '').toLowerCase().includes(search.toLowerCase())
		);
	}, [data, tab, search]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Header */}
				<div
					className="px-6 py-4 flex items-center justify-between flex-shrink-0"
					style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
				>
					<div className="flex items-center gap-3">
						<div className="bg-white/20 rounded-lg p-2">
							<ArrowUpCircle className="h-5 w-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">Pending Payouts</h2>
							<p className="text-xs text-white/80">{site.name}</p>
						</div>
					</div>
					<button onClick={onClose} className="text-white/80 hover:text-white">
						<X className="h-5 w-5" />
					</button>
				</div>
				{/* Summary strip */}
				{data && (
					<div className="grid grid-cols-3 border-b border-gray-100 flex-shrink-0">
						{[
							{ label: 'Total Pending', val: data.total_pending?.total,    color: 'text-red-600'    },
							{ label: 'Material',      val: data.total_pending?.material, color: 'text-orange-600' },
							{ label: 'Labour',        val: data.total_pending?.labour,   color: 'text-purple-600' },
						].map(({ label, val, color }) => (
							<div key={label} className="p-3 text-center">
								<p className="text-xs text-gray-500 mb-0.5">{label}</p>
								<p className={`text-sm font-bold ${color}`}>{fmt(val)}</p>
							</div>
						))}
					</div>
				)}
				{/* Filters */}
				<div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
					<div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
						<Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
						<input
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder="Search entries..."
							className="bg-transparent text-sm flex-1 focus:outline-none"
						/>
					</div>
					<div className="flex bg-gray-100 rounded-lg p-1 gap-1">
						{[['all', 'All'], ['material', 'Material'], ['labour', 'Labour']].map(([v, l]) => (
							<button
								key={v}
								onClick={() => setTab(v)}
								className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
									tab === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
								}`}
							>
								{l}
							</button>
						))}
					</div>
				</div>
				{/* Entry list */}
				<div className="flex-1 overflow-y-auto p-4 space-y-2">
					{loading ? (
						<div className="flex flex-col items-center justify-center py-12 gap-3">
							<Loader className="h-8 w-8 animate-spin text-gray-400" />
							<p className="text-sm text-gray-500">Loading pending entries…</p>
						</div>
					) : allEntries.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 gap-3">
							<CheckCircle2 className="h-10 w-10 text-emerald-400" />
							<p className="text-base font-semibold text-gray-600">No Pending Payments</p>
							<p className="text-sm text-gray-400">All entries for this site are cleared!</p>
						</div>
					) : (
						allEntries.map(entry => {
							const key      = `${entry.type}-${entry.id}`;
							const isPaying = marking === key;
							return (
								<div
									key={key}
									className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
										isPaying ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
									}`}
								>
									<div className={`flex-shrink-0 rounded-lg p-2 ${entry.type === 'material' ? 'bg-orange-100' : 'bg-purple-100'}`}>
										{entry.type === 'material'
											? <Package className="h-4 w-4 text-orange-600" />
											: <Users   className="h-4 w-4 text-purple-600" />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="text-sm font-semibold text-gray-800 truncate">{entry.name}</p>
											{entry.vendor && entry.vendor !== '-' && (
												<span className="text-xs text-gray-500 truncate">· {entry.vendor}</span>
											)}
										</div>
										<p className="text-xs text-gray-500 mt-0.5">
											{fmtDate(entry.date)} · {entry.quantity} × {fmt(entry.rate)}
											{entry.additional_charges > 0 && ` + ${fmt(entry.additional_charges)}`}
										</p>
									</div>
									<div className="flex-shrink-0 text-right mr-2">
										<p className="text-xs text-gray-500">Pending</p>
										<p className="text-sm font-bold text-red-600">{fmt(entry.pending_amount)}</p>
									</div>
									<button
										onClick={() => handleMarkPaid(entry)}
										disabled={isPaying}
										className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
											isPaying
												? 'bg-emerald-500 text-white cursor-not-allowed'
												: 'bg-gray-100 text-gray-700 hover:bg-emerald-500 hover:text-white border border-gray-300 hover:border-emerald-500'
										}`}
									>
										{isPaying ? <Loader className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
										{isPaying ? 'Paying…' : 'Mark Paid'}
									</button>
								</div>
							);
						})
					)}
				</div>
				{/* Footer */}
				<div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
					<p className="text-xs text-gray-500">
						{allEntries.length} pending {allEntries.length === 1 ? 'entry' : 'entries'}
					</p>
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
	const navigate  = useNavigate();
	const { theme } = useTheme();

	// ── Date state ──
	const [fromDate, setFromDate] = useState('');
	const [toDate,   setToDate]   = useState('');

	// ── Site state ──
	const [selectedSite, setSelectedSite] = useState('');
	const [sites,        setSites]        = useState([]);
	const autoSetSiteRef = useRef(null);

	// ── Dashboard data ──
	const [dashboardData,        setDashboardData]        = useState(null);
	const [transactions,         setTransactions]         = useState([]);
	const [materialPending,      setMaterialPending]      = useState([]);
	const [labourPending,        setLabourPending]        = useState([]);
	const [materialPendingTotal, setMaterialPendingTotal] = useState(0);
	const [labourPendingTotal,   setLabourPendingTotal]   = useState(0);
	const [siteSummary,          setSiteSummary]          = useState([]);

	// ── UI state ──
	const [loading,       setLoading]       = useState(true);
	const [error,         setError]         = useState(null);
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [payOutSite,    setPayOutSite]    = useState(null);

	// Search / filter state
	const [searchText,            setSearchText]            = useState('');
	const [materialSearchText,    setMaterialSearchText]    = useState('');
	const [labourSearchText,      setLabourSearchText]      = useState('');
	const [siteSummarySearch,     setSiteSummarySearch]     = useState('');
	const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
	const [transactionItemFilter, setTransactionItemFilter] = useState('');

	// Grid API refs
	const [gridApi,            setGridApi]            = useState(null);
	const [materialGridApi,    setMaterialGridApi]    = useState(null);
	const [labourGridApi,      setLabourGridApi]      = useState(null);
	const [siteSummaryGridApi, setSiteSummaryGridApi] = useState(null);

	// ── Counter config ──
	const counterConfig = [
		{ id: 'active-sites',     title: 'Active Sites',     dataKey: 'activeSites',    icon: Building2,   color: 'bg-blue-500',   route: '/site',          format: 'number'   },
		{ id: 'total-budget',     title: 'Total Budget',     dataKey: 'totalBudget',    icon: Wallet,      color: 'bg-green-500',  route: '/site',          format: 'currency' },
		{ id: 'client-paid',      title: 'Client Paid',      dataKey: 'clientPayments', icon: CreditCard,  color: 'bg-teal-500',   route: '/site',          format: 'currency', showOutstanding: true },
		{ id: 'material-expense', title: 'Material Expense', dataKey: 'materialExpense',icon: IndianRupee, color: 'bg-orange-500', route: '/materialentry', format: 'currency' },
		{ id: 'labour-expense',   title: 'Labour Expense',   dataKey: 'labourExpense',  icon: IndianRupee, color: 'bg-purple-500', route: '/labourentry',   format: 'currency' },
		{ id: 'total-expense',    title: 'Total Expense',    dataKey: 'totalExpense',   icon: TrendingUp,  color: 'bg-red-500',    route: null,             format: 'currency' },
	];

	// ─── API calls ───────────────────────────────────────────────────────────

	const fetchSites = useCallback(async () => {
		try {
			const token = localStorage.getItem('accessToken');
			const res   = await axios.get(`/api/dashboard/sites`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.data.success) setSites(res.data.data || []);
		} catch (err) { console.error('Sites fetch error:', err); }
	}, []);

	const fetchDashboardData = useCallback(async (from, to, site) => {
		setLoading(true);
		setError(null);
		try {
			const token  = localStorage.getItem('accessToken');
			const params = { from_date: from, to_date: to };
			if (site) params.site_id = site;
			const res = await axios.get(`/api/dashboard/stats`, {
				headers: { Authorization: `Bearer ${token}` }, params
			});
			if (res.data.success) setDashboardData(res.data.data);
		} catch (err) {
			setError(err.response?.data?.message || 'Network error occurred while fetching data');
		} finally { setLoading(false); }
	}, []);

	const fetchTransactions = useCallback(async (from, to, site) => {
		try {
			const token  = localStorage.getItem('accessToken');
			const params = { from_date: from, to_date: to };
			if (site) params.site_id = site;
			const res = await axios.get(`/api/dashboard/transactions`, {
				headers: { Authorization: `Bearer ${token}` }, params
			});
			if (res.data.success) setTransactions(res.data.data || []);
		} catch (err) { console.error('Transactions fetch error:', err); }
	}, []);

	const fetchMaterialPending = useCallback(async (from, to, site) => {
		try {
			const token  = localStorage.getItem('accessToken');
			const params = { from_date: from, to_date: to };
			if (site) params.site_id = site;
			const res = await axios.get(`/api/dashboard/material-pending`, {
				headers: { Authorization: `Bearer ${token}` }, params
			});
			if (res.data.success) {
				setMaterialPending(res.data.data || []);
				setMaterialPendingTotal(res.data.total_pending || 0);
			}
		} catch (err) { console.error('Material pending fetch error:', err); }
	}, []);

	const fetchLabourPending = useCallback(async (from, to, site) => {
		try {
			const token  = localStorage.getItem('accessToken');
			const params = { from_date: from, to_date: to };
			if (site) params.site_id = site;
			const res = await axios.get(`/api/dashboard/labour-pending`, {
				headers: { Authorization: `Bearer ${token}` }, params
			});
			if (res.data.success) {
				setLabourPending(res.data.data || []);
				setLabourPendingTotal(res.data.total_pending || 0);
			}
		} catch (err) { console.error('Labour pending fetch error:', err); }
	}, []);

	// ─── FIXED: fetchSiteSummary now passes site_id when a site is selected ──
	const fetchSiteSummary = useCallback(async (site) => {
		try {
			const token  = localStorage.getItem('accessToken');
			const params = {};
			// Pass the site_id argument if provided, otherwise fall back to selectedSite
			const activeSite = site !== undefined ? site : selectedSite;
			if (activeSite) params.site_id = activeSite;
			const res = await axios.get(`/api/dashboard/site-summary`, {
				headers: { Authorization: `Bearer ${token}` }, params
			});
			if (res.data.success) setSiteSummary(res.data.data || []);
		} catch (err) { console.error('Site summary fetch error:', err); }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSite]);

	const fetchAllData = useCallback(async (from, to, site) => {
		const f = from ?? fromDate;
		const t = to   ?? toDate;
		const s = site !== undefined ? site : selectedSite;
		await Promise.all([
			fetchDashboardData(f, t, s),
			fetchTransactions(f, t, s),
			fetchMaterialPending(f, t, s),
			fetchLabourPending(f, t, s),
			fetchSiteSummary(s),        // ← pass site explicitly so it's not stale
		]);
		setIsInitialLoad(false);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fromDate, toDate, selectedSite]);

	// ─── Effects ─────────────────────────────────────────────────────────────

	useEffect(() => {
		fetchSites();
		fetchAllData('', '', '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Auto-populate fromDate from site start_date when site changes
	useEffect(() => {
		if (!selectedSite) {
			autoSetSiteRef.current = null;
			return;
		}
		if (autoSetSiteRef.current === selectedSite) return;
		const site = sites.find(s => s.id === selectedSite);
		if (site?.start_date) {
			setFromDate(new Date(site.start_date).toISOString().split('T')[0]);
		}
		autoSetSiteRef.current = selectedSite;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSite]);

	// ─── Manual refresh ──────────────────────────────────────────────────────
	const handleRefresh = useCallback(() => {
		fetchAllData(fromDate, toDate, selectedSite);
	}, [fromDate, toDate, selectedSite, fetchAllData]);

	// ─── Format helpers ───────────────────────────────────────────────────────
	const formatNumber   = (num) => num == null ? '0' : new Intl.NumberFormat('en-IN').format(num);
	const formatCurrency = (num) => num == null ? '₹0' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(num);
	const formatChange   = (change) => !change ? '0%' : `${change > 0 ? '+' : ''}${change}%`;

	const getDisplayValue = (counter, data) => {
		const counterData = data?.[counter.dataKey];
		const value       = counterData?.count !== undefined ? counterData.count : counterData?.amount;
		return counter.format === 'currency' ? formatCurrency(value) : formatNumber(value);
	};

	const getValueFontSize = (value) => {
		const l = value?.toString().length || 0;
		if (l > 15) return 'text-xs';
		if (l > 12) return 'text-sm';
		if (l > 9)  return 'text-base';
		return 'text-lg';
	};

	const getSelectedSiteName = () =>
		selectedSite ? (sites.find(s => s.id === selectedSite)?.name || '') : '';

	// ─── Sub-components ───────────────────────────────────────────────────────
	const LoadingComponent = ({ message = "Loading dashboard data..." }) => (
		<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
			<div className="relative">
				<div
					className="w-16 h-16 border-4 border-opacity-20 rounded-full animate-spin"
					style={{ borderColor: theme.primaryGradientStart || '#3b82f6', borderTopColor: 'transparent' }}
				/>
				<div
					className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse"
					style={{ backgroundColor: theme.primaryGradientEnd || '#1d4ed8' }}
				/>
			</div>
			<p className="mt-4 text-sm font-medium animate-pulse">{message}</p>
		</div>
	);

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
				gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
				direction={theme.gradientDirection}
				className="px-6 py-2 transition-all duration-200 hover:scale-105"
			>
				<RefreshCw className="h-4 w-4 mr-2" /> Try Again
			</ThemeUI.Button>
		</div>
	);

	// ─── Column definitions ───────────────────────────────────────────────────
	const TypeBadge = (params) => {
		const colorMap = { Material: 'bg-blue-100 text-blue-800', Labour: 'bg-purple-100 text-purple-800' };
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[params.value] || 'bg-gray-100 text-gray-800'}`}>
				{params.value}
			</span>
		);
	};

	const pinnedCellStyle = (base = {}) => (p) =>
		p.node.rowPinned ? { fontWeight: 'bold', backgroundColor: '#f3f4f6', ...base } : (base.default || null);

	const columnDefs = useMemo(() => [
		{ headerName: 'Date',        field: 'date',             filter: 'agDateColumnFilter',   sortable: true, width: 120, pinned:"left", valueFormatter: formatDateGrid, sort: 'desc', cellStyle: pinnedCellStyle() },
		{ headerName: 'Type',        field: 'transaction_type', filter: 'agSetColumnFilter',    sortable: true, width: 110, cellRenderer: TypeBadge, cellStyle: pinnedCellStyle() },
		{ headerName: 'Site',        field: 'site_name',        filter: 'agTextColumnFilter',   sortable: true, width: 160, cellStyle: pinnedCellStyle() },
		{ headerName: 'Item/Labour', field: 'item_name',        filter: 'agTextColumnFilter',   sortable: true, width: 150, cellStyle: pinnedCellStyle() },
		{
			headerName: 'Qty/Workers', field: 'quantity', filter: 'agNumberColumnFilter', sortable: true, width: 140,
			valueFormatter: (p) => (p.value == null || p.value === '') ? '-' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(p.value),
			cellStyle: pinnedCellStyle(),
		},
		{ headerName: 'Rate',    field: 'rate',         filter: 'agNumberColumnFilter', sortable: true, width: 110, valueFormatter: formatCurrencyGrid, cellStyle: pinnedCellStyle() },
		{
			headerName: 'Total', field: 'total_amount', filter: 'agNumberColumnFilter', sortable: true, width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: (p) => p.node.rowPinned
				? { fontWeight: 'bold', color: '#1f2937', backgroundColor: '#e5e7eb', fontSize: '14px' }
				: { fontWeight: '600', color: '#1f2937' },
		},
		{
			headerName: 'Paid', field: 'amount', filter: 'agNumberColumnFilter', sortable: true, width: 130,
			valueFormatter: formatCurrencyGrid,
			cellStyle: (p) => p.node.rowPinned
				? { fontWeight: 'bold', color: '#059669', backgroundColor: '#d1fae5', fontSize: '14px' }
				: { fontWeight: 'bold', color: '#059669' },
		},
		{
			headerName: 'Pending', field: 'debit_entry', filter: 'agNumberColumnFilter', sortable: true, width: 140,
			valueFormatter: formatCurrencyGrid,
			cellStyle: (p) => p.node.rowPinned
				? { fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', fontSize: '14px' }
				: { fontWeight: 'bold', color: '#dc2626' },
		},
		{
			headerName: 'Vendor', field: 'vendor_name', filter: 'agTextColumnFilter', sortable: true, width: 140,pinned:"right",
			valueFormatter: (p) => p.node.rowPinned ? p.value : (p.value || '-'),
			cellStyle: (p) => p.node.rowPinned ? { fontWeight: 'bold', backgroundColor: '#f3f4f6', fontSize: '14px' } : null,
		},
	], []);

	const materialPendingColumnDefs = useMemo(() => [
		{ headerName: 'Date',     field: 'date',          filter: 'agDateColumnFilter',   sortable: true, width: 120,  pinned: 'left', valueFormatter: formatDateGrid, sort: 'desc', pinned:'left' },
		{ headerName: 'Site',     field: 'site_name',     filter: 'agTextColumnFilter',   sortable: true, width: 150 },
		{ headerName: 'Material', field: 'material_name', filter: 'agTextColumnFilter',   sortable: true, width: 150 },
		{ headerName: 'Total',    field: 'total_amount',  filter: 'agNumberColumnFilter', sortable: true, width: 130, valueFormatter: formatCurrencyGrid, cellStyle: { fontWeight: '600', color: '#1f2937' } },
		{ headerName: 'Pending',  field: 'pending_amount',filter: 'agNumberColumnFilter', sortable: true, pinned: 'right',width: 140, valueFormatter: formatCurrencyGrid, cellStyle: { fontWeight: 'bold', color: '#dc2626' } },
	], []);

	const labourPendingColumnDefs = useMemo(() => [
		{ headerName: 'Date',        field: 'date',          filter: 'agDateColumnFilter',   sortable: true, width: 120, pinned: 'left', valueFormatter: formatDateGrid, sort: 'desc' },
		{ headerName: 'Site',        field: 'site_name',     filter: 'agTextColumnFilter',   sortable: true, width: 150 },
		{ headerName: 'Labour Type', field: 'labour_name',   filter: 'agTextColumnFilter',   sortable: true, width: 150 },
		{ headerName: 'Total',       field: 'total_amount',  filter: 'agNumberColumnFilter', sortable: true, width: 130, valueFormatter: formatCurrencyGrid, cellStyle: { fontWeight: '600', color: '#1f2937' } },
		{ headerName: 'Pending',     field: 'pending_amount',filter: 'agNumberColumnFilter', sortable: true,  pinned: 'right', width: 140, valueFormatter: formatCurrencyGrid, cellStyle: { fontWeight: 'bold', color: '#dc2626' } },
	], []);

	const siteSummaryColumnDefs = useMemo(() => [
		{ headerName: '#', width: 60, sortable: false, pinned: 'left', valueGetter: (p) => (p.node.rowIndex ?? 0) + 1 },
		{ headerName: 'Site',   field: 'name',   sortable: true, flex: 1, minWidth: 150 },
		{ headerName: 'Start Date',    field: 'start_date',    sortable: true, width: 130, valueFormatter: formatDateGrid },
		// { headerName: 'End Date',      field: 'end_date',      sortable: true, width: 130, valueFormatter: formatDateGrid },
		{ headerName: 'Budget',        field: 'total_budget',  sortable: true, width: 140, valueFormatter: formatCurrencyGrid, cellStyle: { fontWeight: '600' } },
		{ headerName: 'Total Expense', field: 'total_expense', sortable: true, width: 150, valueFormatter: formatCurrencyGrid, cellStyle: { color: '#b45309', fontWeight: '600' } },
		{ headerName: 'Client Paid',   field: 'client_paid',   sortable: true, width: 140, valueFormatter: formatCurrencyGrid, cellStyle: { color: '#059669', fontWeight: '600' } },
		{
			headerName: 'Pending', field: 'total_pending', sortable: true, width: 140,
			valueFormatter: formatCurrencyGrid,
			cellStyle: (p) => ({ color: p.value > 0 ? '#dc2626' : '#6b7280', fontWeight: '600' }),
		},
		// {
		// 	headerName: 'Budget Used', field: 'budget_used_pct', sortable: true, width: 150,
		// 	cellRenderer: (p) => (
		// 		<div className="flex items-center gap-2 h-full">
		// 			<div className="flex-1 bg-gray-200 rounded-full h-2">
		// 				<div
		// 					className={`h-2 rounded-full ${p.value >= 90 ? 'bg-red-500' : p.value >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
		// 					style={{ width: `${Math.min(p.value || 0, 100)}%` }}
		// 				/>
		// 			</div>
		// 			<span className="text-xs font-semibold text-gray-700 w-9 text-right">{p.value || 0}%</span>
		// 		</div>
		// 	),
		// },
		// {
		// 	headerName: 'Status', field: 'status', sortable: true, width: 120,
		// 	cellRenderer: (p) => {
		// 		const map = {
		// 			planning:  'bg-amber-100 text-amber-800',
		// 			active:    'bg-emerald-100 text-emerald-800',
		// 			completed: 'bg-blue-100 text-blue-800',
		// 		};
		// 		return (
		// 			<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[p.value] || 'bg-gray-100 text-gray-800'}`}>
		// 				{p.value?.charAt(0).toUpperCase() + p.value?.slice(1)}
		// 			</span>
		// 		);
		// 	},
		// },
		{
			headerName: 'Actions', width: 200, sortable: false, pinned: 'right',           
			cellRenderer: (p) => (
				<div className="flex items-center gap-2 h-full">
					<button
						onClick={() => navigate('/site', { state: { openPayment: true, siteId: p.data.id } })}
						className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
					>
						<ArrowDownCircle className="h-3 w-3" /> Pay In
					</button>
					<button
						onClick={() => setPayOutSite(p.data)}
						className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
							p.data.total_pending > 0
								? 'bg-red-100 text-red-700 hover:bg-red-200'
								: 'bg-gray-100 text-gray-500 hover:bg-gray-200'
						}`}
					>
						<ArrowUpCircle className="h-3 w-3" /> Pay Out
						{p.data.total_pending > 0 && (
							<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						)}
					</button>
				</div>
			),
		},
	], [navigate]);

	const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

	// ─── Derived data ─────────────────────────────────────────────────────────
	const filteredTransactions = useMemo(() => {
		if (!transactions) return [];
		return transactions.filter(t => {
			if (transactionTypeFilter && t.transaction_type !== transactionTypeFilter) return false;
			if (transactionItemFilter && t.item_name       !== transactionItemFilter) return false;
			return true;
		});
	}, [transactions, transactionTypeFilter, transactionItemFilter]);

	const filteredTransactionTotals = useMemo(() =>
		filteredTransactions.reduce(
			(acc, t) => ({
				total_amount: acc.total_amount + (parseFloat(t.total_amount) || 0),
				amount:       acc.amount       + (parseFloat(t.amount)       || 0),
				debit_entry:  acc.debit_entry  + (parseFloat(t.debit_entry)  || 0),
			}),
			{ total_amount: 0, amount: 0, debit_entry: 0 }
		),
	[filteredTransactions]);

	const uniqueItems = useMemo(() => {
		const items = [...new Set(transactions.map(t => t.item_name))];
		return items.filter(i => i && i !== 'N/A').sort();
	}, [transactions]);

	// ─── Site summary: client-side search (for name/client search within returned data) ──
	// NOTE: server already filters by site_id; this handles free-text search on top
	const filteredSiteSummary = useMemo(() => {
		if (!siteSummarySearch) return siteSummary;
		const q = siteSummarySearch.toLowerCase();
		return siteSummary.filter(s =>
			s.name.toLowerCase().includes(q) ||
			(s.client_name || '').toLowerCase().includes(q)
		);
	}, [siteSummary, siteSummarySearch]);

	// ─── Grid / export handlers ───────────────────────────────────────────────
	const onGridReady            = useCallback((p) => setGridApi(p.api),            []);
	const onMaterialGridReady    = useCallback((p) => setMaterialGridApi(p.api),    []);
	const onLabourGridReady      = useCallback((p) => setLabourGridApi(p.api),      []);
	const onSiteSummaryGridReady = useCallback((p) => setSiteSummaryGridApi(p.api), []);

	const onSearchChange = useCallback((e) => {
		setSearchText(e.target.value);
		gridApi?.setGridOption('quickFilterText', e.target.value);
	}, [gridApi]);

	const onMaterialSearchChange = useCallback((e) => {
		setMaterialSearchText(e.target.value);
		materialGridApi?.setGridOption('quickFilterText', e.target.value);
	}, [materialGridApi]);

	const onLabourSearchChange = useCallback((e) => {
		setLabourSearchText(e.target.value);
		labourGridApi?.setGridOption('quickFilterText', e.target.value);
	}, [labourGridApi]);

	const exportToCSV                = () => gridApi?.exportDataAsCsv({ fileName: `transactions_${fromDate}_to_${toDate}.csv` });
	const exportMaterialPendingToCSV = () => materialGridApi?.exportDataAsCsv({ fileName: `material_pending_${fromDate}_to_${toDate}.csv` });
	const exportLabourPendingToCSV   = () => labourGridApi?.exportDataAsCsv({ fileName: `labour_pending_${fromDate}_to_${toDate}.csv` });
	const exportSiteSummaryToCSV     = () => siteSummaryGridApi?.exportDataAsCsv({ fileName: 'site_summary.csv' });

	// ─── Shared AG-Grid theme params ──────────────────────────────────────────
	const gridThemeBase  = { spacing: 7, headerHeight: 45, headerFontSize: 14, fontSize: 13, headerTextColor: 'white' };
	const gridThemeLarge = { ...gridThemeBase, headerFontSize: 16 };
	const gridThemeSmall = { ...gridThemeBase, fontSize: 12 };
	const headerGradientStyle = {
		'--header-gradient': `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`
	};

	// ─── Early returns ────────────────────────────────────────────────────────
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
					onRetry={() => fetchAllData(fromDate, toDate, selectedSite)}
				/>
			</Layout>
		);
	}

	// ─── Render ───────────────────────────────────────────────────────────────
	return (
		<Layout selectedSite={selectedSite} siteName={getSelectedSiteName()}>
			<div className="opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.5s ease-in-out forwards' }}>
				{/* ── Header & Filters ── */}
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-bold">Dashboard</h1>
						<p className="mt-1 text-gray-600">Track your construction site expenses and budget</p>
					</div>
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-[180px]">
							<ThemeUI.FormField label="Select Site" name="site">
								<ThemeUI.Select
									value={selectedSite}
									onChange={(opt) => setSelectedSite(opt?.value ?? '')}
									options={[{ value: '', label: 'Choose Sites' }, ...sites.map(s => ({ value: s.id, label: s.name }))]}
									placeholder="All Sites"
								/>
							</ThemeUI.FormField>
						</div>
						<div className="min-w-[150px]">
							<ThemeUI.FormField label="From Date" name="fromDate">
								<ThemeUI.Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
							</ThemeUI.FormField>
						</div>
						<div className="min-w-[150px]">
							<ThemeUI.FormField label="To Date" name="toDate">
								<ThemeUI.Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
							</ThemeUI.FormField>
						</div>
						<div className="flex items-end pb-0.5">
							<ThemeUI.Button
								type="button"
								onClick={handleRefresh}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
								className="flex items-center gap-2 px-4 py-2"
							>
								<RefreshCw className="h-4 w-4 mr-2" /> Refresh
							</ThemeUI.Button>
						</div>
					</div>
				</div>

				{/* ── Counter Boxes ── */}
				<div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${
					selectedSite ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-2 xl:grid-cols-4'
				}`}>
					{counterConfig
						.filter(c => selectedSite || (c.id !== 'total-budget' && c.id !== 'client-paid'))
						.map((counter, index) => {
							const IconComponent = counter.icon;
							const counterData   = dashboardData?.[counter.dataKey];
							const change        = counterData?.change     || 0;
							const changeType    = counterData?.changeType || 'neutral';
							const percentage    = counterData?.percentage;
							const displayValue  = getDisplayValue(counter, dashboardData);
							return (
								<div
									key={counter.id}
									className="rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 cursor-pointer group transform hover:scale-105 min-h-[120px]"
									style={{
										backgroundColor: '#ffffff',
										borderColor: '#e5e7eb',
										animationDelay: `${index * 0.1}s`,
										animation: 'slideUp 0.6s ease-out forwards',
									}}
									onClick={() => counter.route && navigate(counter.route)}
								>
									<div className="p-4">
										<div className="flex items-center justify-between">
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium group-hover:text-gray-800 transition-colors truncate">{counter.title}</p>
												<p className={`${getValueFontSize(displayValue)} font-bold mt-1 transition-all duration-200 break-words leading-tight`}>
													{displayValue}
												</p>
												{percentage !== undefined && (
													<div className="mt-1">
														<div className="flex items-center justify-between text-xs mb-1">
															<span className="font-medium text-gray-600">{percentage.toFixed(2)}%</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-1.5">
															<div
																className={`h-1.5 rounded-full transition-all duration-500 ${counter.color}`}
																style={{ width: `${Math.min(percentage, 100)}%` }}
															/>
														</div>
													</div>
												)}
												{counter.dataKey !== 'activeSites' && percentage === undefined && !counter.showOutstanding && (
													<div className="flex items-center mt-1">
														<span className={`text-xs font-medium flex items-center ${
															changeType === 'positive' ? 'text-green-600' :
															changeType === 'negative' ? 'text-red-600'   : 'text-gray-500'
														}`}>
															{changeType === 'positive' && <TrendingUp  className="h-3 w-3 mr-1" />}
															{changeType === 'negative' && <TrendingDown className="h-3 w-3 mr-1" />}
															{formatChange(change)}
														</span>
														<span className="text-xs ml-1 text-gray-500">vs last period</span>
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

				{/* ── Cash Flow + Budget ── */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					{dashboardData?.cashFlow && (
						<div className={`p-4 rounded-lg shadow-sm border transition-all duration-300 ${
							dashboardData.cashFlow.status === 'surplus'
								? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
								: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
						}`}>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<div className={`p-2 rounded-lg ${dashboardData.cashFlow.status === 'surplus' ? 'bg-green-500' : 'bg-red-500'}`}>
										<Activity className="h-5 w-5 text-white" />
									</div>
									<div>
										<h3 className="text-sm font-semibold text-gray-700">Cash Flow</h3>
										<p className="text-xs text-gray-600">{dashboardData.cashFlow.status === 'surplus' ? 'Surplus' : 'Deficit'}</p>
									</div>
								</div>
								<span className={`${getValueFontSize(formatCurrency(Math.abs(dashboardData.cashFlow.amount)))} font-bold ${
									dashboardData.cashFlow.status === 'surplus' ? 'text-green-700' : 'text-red-700'
								} break-words leading-tight text-right`}>
									{formatCurrency(Math.abs(dashboardData.cashFlow.amount))}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-gray-600">
									{Math.abs(dashboardData.cashFlow.percentage).toFixed(2)}% of budget
								</span>
								<span className={`font-semibold ${dashboardData.cashFlow.status === 'surplus' ? 'text-green-700' : 'text-red-700'}`}>
									{dashboardData.cashFlow.status === 'surplus'
										? 'Client paid more than expenses'
										: 'Expenses exceed client payments'}
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
								<div
									className={`h-2 rounded-full transition-all duration-500 ${dashboardData.cashFlow.status === 'surplus' ? 'bg-green-600' : 'bg-red-600'}`}
									style={{ width: `${Math.min(Math.abs(dashboardData.cashFlow.percentage), 100)}%` }}
								/>
							</div>
						</div>
					)}

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
								<span className={`${getValueFontSize(formatCurrency(dashboardData.budgetUtilization.remaining))} font-bold text-black break-words leading-tight text-right`}>
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
								/>
							</div>
						</div>
					)}
				</div>

				{/* ── Site Summary Table ── */}				
				<div className="mt-8">
					<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div>
							<h2 className="text-xl font-bold">
								Site Summary
								{/* Show which site is being viewed when filtered */}
								{selectedSite && (
									<span className="ml-2 text-base font-normal text-gray-500">
										— {getSelectedSiteName()}
									</span>
								)}
							</h2>
							<p className="text-sm text-gray-600 mt-1">
								{selectedSite
									? 'Budget, expenses and payment actions for the selected site'
									: 'Budget, expenses and payment actions across all active & completed sites'}
							</p>
						</div>
						<div className="flex gap-2">
							<ThemeUI.Button
								type="button"
								onClick={() => navigate('/materialentry', { state: { openModal: true, siteId: selectedSite } })}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
								className="px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 flex items-center gap-1.5"
							>
								<Package className="h-3.5 w-3.5 me-2" /> Material Entry
							</ThemeUI.Button>
							<ThemeUI.Button
								type="button"
								onClick={() => navigate('/labourentry', { state: { openModal: true, siteId: selectedSite } })}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
								className="px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 flex items-center gap-1.5"
							>
								<Users className="h-3.5 w-3.5 me-2" /> Labour Entry
							</ThemeUI.Button>
							<ThemeUI.Button
								onClick={exportSiteSummaryToCSV}
								gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
								direction={theme.gradientDirection}
							>
								<Download className="h-4 w-4 me-2" /> Export
							</ThemeUI.Button>
						</div>
					</div>
					<div style={headerGradientStyle}>
						<AgGridReact
							className="custom-ag-grid"
							domLayout="autoHeight"
							theme={themeQuartz.withParams(gridThemeBase)}
							defaultColDef={{ resizable: true, sortable: true, filter: false }}
							rowData={filteredSiteSummary}
							columnDefs={siteSummaryColumnDefs}
							rowHeight={56}
							pagination={true}
							paginationPageSize={10}
							paginationPageSizeSelector={[10, 20, 50]}
							onGridReady={onSiteSummaryGridReady}
						/>
					</div>
				</div>

				{/* ── Transaction Table (site-specific) ── */}
				{selectedSite && (
					<div className="mt-8">
						<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div>
								<h2 className="text-xl font-bold">Recent Transactions</h2>
								<p className="text-sm text-gray-600 mt-1">Material and labour entries for the selected period</p>
							</div>
						</div>
						<div className="mb-4">
							<div className="flex flex-wrap items-end gap-3">
								<div className="flex-1 min-w-[200px]">
									<ThemeUI.FormField label="Search" name="search">
										<ThemeUI.Input
											value={searchText}
											onChange={onSearchChange}
											placeholder="Search transactions..."
											leftElement={<Search size={16} className="text-gray-400" />}
											className="bg-white"
										/>
									</ThemeUI.FormField>
								</div>
								<div className="min-w-[150px]">
									<ThemeUI.FormField label="Type" name="transactionType">
										<ThemeUI.Select
											value={transactionTypeFilter}
											onChange={(opt) => setTransactionTypeFilter(opt?.value ?? '')}
											options={[{ value: '', label: 'All Types' }, { value: 'Material', label: 'Material' }, { value: 'Labour', label: 'Labour' }]}
											placeholder="All Types"
										/>
									</ThemeUI.FormField>
								</div>
								<div className="min-w-[200px]">
									<ThemeUI.FormField label="Item/Labour" name="transactionItem">
										<ThemeUI.Select
											value={transactionItemFilter}
											onChange={(opt) => setTransactionItemFilter(opt?.value ?? '')}
											options={[{ value: '', label: 'All Items' }, ...uniqueItems.map(i => ({ value: i, label: i }))]}
											placeholder="All Items"
										/>
									</ThemeUI.FormField>
								</div>
								<div>
									<ThemeUI.Button
										onClick={exportToCSV}
										gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
										direction={theme.gradientDirection}
										className="mt-[22px]"
									>
										<Download className="h-4 w-4 me-2" /> Export
									</ThemeUI.Button>
								</div>
							</div>
						</div>
						<div style={headerGradientStyle}>
							<AgGridReact
								className="custom-ag-grid"
								domLayout="autoHeight"
								theme={themeQuartz.withParams(gridThemeLarge)}
								defaultColDef={defaultColDef}
								rowData={filteredTransactions}
								rowHeight={55}
								columnDefs={columnDefs}
								pagination={true}
								paginationPageSize={10}
								paginationPageSizeSelector={[10, 20, 50, 100]}
								onGridReady={onGridReady}
								pinnedBottomRowData={[{
									date: '', transaction_type: '', site_name: '', item_name: '',
									quantity: '', rate: '',
									total_amount: filteredTransactionTotals.total_amount,
									amount:       filteredTransactionTotals.amount,
									debit_entry:  filteredTransactionTotals.debit_entry,
									vendor_name:  '',
								}]}
							/>
						</div>
					</div>
				)}

				{/* ── Pending Tables (site-specific) ── */}
				{selectedSite && (
					<div className="mt-8">
						<div className="mb-4">
							<h2 className="text-xl font-bold">Pending Payments</h2>
							<p className="text-sm text-gray-600 mt-1">Track unpaid material and labour expenses</p>
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Material Pending */}
							<div>
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
								<div style={headerGradientStyle}>
									<AgGridReact
										className="custom-ag-grid"
										domLayout="autoHeight"
										theme={themeQuartz.withParams(gridThemeSmall)}
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

							{/* Labour Pending */}
							<div>
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
								<div style={headerGradientStyle}>
									<AgGridReact
										className="custom-ag-grid"
										domLayout="autoHeight"
										theme={themeQuartz.withParams(gridThemeSmall)}
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
				)}

				{/* ── Data freshness ── */}
				<div className="mt-6 text-right">
					<p className="text-xs text-gray-500">
						Data last updated:{' '}
						{new Date().toLocaleString('en-IN', {
							timeZone: 'Asia/Kolkata',
							day: '2-digit', month: '2-digit', year: 'numeric',
							hour: '2-digit', minute: '2-digit',
						})}
					</p>
				</div>
			</div>

			{/* ── Modals ── */}
			{payOutSite && (
				<PayOutModal
					site={payOutSite}
					theme={theme}
					onClose={() => setPayOutSite(null)}
					onSuccess={() => fetchSiteSummary(selectedSite)}
				/>
			)}

			<style>{`
				@keyframes fadeIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
				@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
			`}</style>
		</Layout>
	);
}

export default Dashboard;