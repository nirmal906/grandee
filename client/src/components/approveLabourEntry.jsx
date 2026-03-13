import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';
import Layout from './layout';
import { useTheme } from '../context/themeContext';
import { ThemeUI } from '../context/themeUI';
import { ChevronRight, Loader, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import Offcanvas from './offcanvas';
import Modal from './modal';
import NoRowsOverlay from './noRowsOverlay';

// ─── Inline Approve Row Editor ────────────────────────────────────────────────
function ApproveRowModal({ isOpen, onClose, entry, onApproved, theme }) {
    const [rate,       setRate]       = useState('');
    const [credit,     setCredit]     = useState('');
    const [debit,      setDebit]      = useState('');
    const [isLoading,  setIsLoading]  = useState(false);
    const [errors,     setErrors]     = useState({});

    const totalAmount = useMemo(() => {
        const w = Number(entry?.no_of_workers)  || 0;
        const r = Number(rate) || 0;
        return parseFloat((w * r).toFixed(2));
    }, [entry?.no_of_workers, rate]);

    // Pre-fill rate from labour standard_rate
    useEffect(() => {
        if (isOpen && entry) {
            const stdRate = entry.labour?.standard_rate;
            setRate(stdRate ? String(stdRate) : '');
            setCredit('');
            setDebit('');
            setErrors({});
        }
    }, [isOpen, entry]);

    // Auto-calculate debit when credit changes
    const handleCreditChange = (e) => {
        const v = e.target.value;
        setCredit(v);
        setErrors(prev => ({ ...prev, credit_entry: '' }));
        if (v !== '' && !isNaN(v) && totalAmount > 0) {
            const calc = totalAmount - Number(v);
            setDebit(calc >= 0 ? calc.toFixed(2) : '0.00');
        } else {
            setDebit('');
        }
    };

    const handleDebitChange = (e) => {
        const v = e.target.value;
        setDebit(v);
        setErrors(prev => ({ ...prev, debit_entry: '' }));
        if (v !== '' && !isNaN(v) && totalAmount > 0) {
            const calc = totalAmount - Number(v);
            setCredit(calc >= 0 ? calc.toFixed(2) : '0.00');
        } else {
            setCredit('');
        }
    };

    const handleApprove = async () => {
        const newErrors = {};
        if (!rate || isNaN(rate) || Number(rate) <= 0) newErrors.rate_per_worker = 'Rate is required';
        const sum = Number(credit || 0) + Number(debit || 0);
        if (totalAmount > 0 && Math.abs(sum - totalAmount) > 0.01) {
            newErrors.debit_entry = `Paid + Due must equal ₹${totalAmount.toFixed(2)}`;
        }
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setIsLoading(true);
        try {
            const response = await axios.post(`/api/labour-entry/${entry.id}/approve`, {
                rate_per_worker: Number(rate),
                credit_entry:    Number(credit || 0),
                debit_entry:     Number(debit  || 0),
            });
            if (response.data.success) {
                toast.success('Labour entry approved successfully');
                onApproved();
                onClose();
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response.data.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to approve entry');
            }
        } finally { setIsLoading(false); }
    };

    if (!entry) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Approve Labour Entry" size="md">
            <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div><span className="text-gray-500">Site:</span> <span className="font-medium">{entry.site?.name || '—'}</span></div>
                    <div><span className="text-gray-500">Labour:</span> <span className="font-medium">{entry.labour?.name || '—'}</span></div>
                    <div><span className="text-gray-500">Date:</span> <span className="font-medium">{entry.date ? new Date(entry.date).toLocaleDateString() : '—'}</span></div>
                    <div><span className="text-gray-500">Workers:</span> <span className="font-medium">{entry.no_of_workers}</span></div>
                </div>

                {/* Rate */}
                <ThemeUI.FormField label="Rate per Worker (₹)" error={errors.rate_per_worker} required>
                    <ThemeUI.Input
                        type="number" step="0.01" min="0"
                        value={rate}
                        onChange={e => { setRate(e.target.value); setErrors(prev => ({ ...prev, rate_per_worker: '' })); setCredit(''); setDebit(''); }}
                        placeholder="0.00"
                    />
                </ThemeUI.FormField>

                {/* Total display */}
                {totalAmount > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                        <span>Total Amount:</span>
                        <span className="text-blue-700">₹{totalAmount.toFixed(2)}</span>
                    </div>
                )}

                {/* Paid & Due — with full-payment checkboxes */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Paid */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">Paid ₹</label>
                            <ThemeUI.Checkbox
                                id="approve_paid_checkbox"
                                checked={credit === totalAmount.toFixed(2) && totalAmount > 0}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setCredit(totalAmount.toFixed(2));
                                        setDebit('0.00');
                                    } else {
                                        setCredit('');
                                        setDebit('');
                                    }
                                    setErrors(prev => ({ ...prev, credit_entry: '', debit_entry: '' }));
                                }}
                                disabled={totalAmount === 0}
                            />
                        </div>
                        <ThemeUI.Input
                            type="number" step="0.01" min="0" max={totalAmount}
                            value={credit}
                            onChange={handleCreditChange}
                            placeholder="0.00"
                            disabled={totalAmount === 0}
                            error={errors.credit_entry}
                        />
                        {errors.credit_entry && (
                            <p className="mt-1 text-xs text-red-500">{errors.credit_entry}</p>
                        )}
                    </div>

                    {/* Due */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">Due ₹</label>
                            <ThemeUI.Checkbox
                                id="approve_due_checkbox"
                                checked={debit === totalAmount.toFixed(2) && totalAmount > 0}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setDebit(totalAmount.toFixed(2));
                                        setCredit('0.00');
                                    } else {
                                        setDebit('');
                                        setCredit('');
                                    }
                                    setErrors(prev => ({ ...prev, debit_entry: '', credit_entry: '' }));
                                }}
                                disabled={totalAmount === 0}
                            />
                        </div>
                        <ThemeUI.Input
                            type="number" step="0.01" min="0" max={totalAmount}
                            value={debit}
                            onChange={handleDebitChange}
                            placeholder="0.00"
                            disabled={totalAmount === 0}
                            error={errors.debit_entry}
                        />
                        {errors.debit_entry && (
                            <p className="mt-1 text-xs text-red-500">{errors.debit_entry}</p>
                        )}
                    </div>
                </div>

                {/* Mismatch warning */}
                {totalAmount > 0 && credit !== '' && debit !== '' &&
                 Math.abs((Number(credit) + Number(debit)) - totalAmount) > 0.01 && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        ⚠ Paid + Due (₹{(Number(credit) + Number(debit)).toFixed(2)}) must equal Total (₹{totalAmount.toFixed(2)})
                    </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <ThemeUI.Button
                        onClick={onClose}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        disabled={isLoading}
                    >
                        Cancel
                    </ThemeUI.Button>
                    <ThemeUI.Button
                        onClick={handleApprove}
                        disabled={isLoading}
                        gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                    >
                        {isLoading ? <><Loader size={16} className="mr-2 animate-spin" /> Approving...</> : <><CheckCircle size={16} className="mr-2" /> Approve</>}
                    </ThemeUI.Button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ isOpen, onClose, entry, onRejected, theme }) {
    const [reason,    setReason]    = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

    const handleReject = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`/api/labour-entry/${entry.id}/reject`, {
                rejection_reason: reason.trim() || null,
            });
            if (response.data.success) {
                toast.success('Labour entry rejected');
                onRejected();
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject entry');
        } finally { setIsLoading(false); }
    };

    if (!entry) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reject Labour Entry" size="sm">
            <div className="space-y-5">
                {/* Summary */}
                <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
                    <p><span className="text-gray-500">Site:</span> <span className="font-medium">{entry.site?.name || '—'}</span></p>
                    <p><span className="text-gray-500">Labour:</span> <span className="font-medium">{entry.labour?.name || '—'}</span></p>
                    <p><span className="text-gray-500">Workers:</span> <span className="font-medium">{entry.no_of_workers}</span></p>
                    <p><span className="text-gray-500">Date:</span> <span className="font-medium">{entry.date ? new Date(entry.date).toLocaleDateString() : '—'}</span></p>
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <ThemeUI.Button
                        onClick={onClose}
                        gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        disabled={isLoading}
                    >
                        Cancel
                    </ThemeUI.Button>
                    <button
                        onClick={handleReject}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? <><Loader size={16} className="animate-spin" /> Rejecting...</> : <><XCircle size={16} /> Reject Entry</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ApproveLabourEntry() {
    const { theme } = useTheme();

    const [entries,               setEntries]               = useState([]);
    const [isLoading,             setIsLoading]             = useState(false);
    const [totalRows,             setTotalRows]             = useState(0);
    const [perPage,               setPerPage]               = useState(10);
    const [currentPage,           setCurrentPage]           = useState(1);
    const [searchQuery,           setSearchQuery]           = useState('');
    const [siteFilter,            setSiteFilter]            = useState('');
    const [labourFilter,          setLabourFilter]          = useState('');
    const [dateFrom,              setDateFrom]              = useState('');
    const [dateTo,                setDateTo]                = useState('');
    const [isFilterOpen,          setIsFilterOpen]          = useState(false);
    const [activeLabours,         setActiveLabours]         = useState([]);
    const [activeSites,           setActiveSites]           = useState([]);

    const [approveEntry,          setApproveEntry]          = useState(null);
    const [rejectEntry,           setRejectEntry]           = useState(null);
    const [isApproveModalOpen,    setIsApproveModalOpen]    = useState(false);
    const [isRejectModalOpen,     setIsRejectModalOpen]     = useState(false);

    const fetchEntries = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/labour-entry/pending-approvals', {
                params: {
                    page:      currentPage,
                    limit:     perPage,
                    search:    searchQuery,
                    site_id:   siteFilter,
                    labour_id: labourFilter,
                    date_from: dateFrom,
                    date_to:   dateTo,
                },
            });
            if (response.data.success) {
                setEntries(response.data.data);
                setTotalRows(response.data.total || 0);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch pending entries');
            setEntries([]);
            setTotalRows(0);
        } finally { setIsLoading(false); }
    }, [currentPage, perPage, searchQuery, siteFilter, labourFilter, dateFrom, dateTo]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [labRes, siteRes] = await Promise.all([
                    axios.get('/api/labour-entry/active-labours'),
                    axios.get('/api/dashboard/sites'),
                ]);
                if (labRes.data.success)  setActiveLabours(labRes.data.data);
                if (siteRes.data.success) setActiveSites(siteRes.data.data);
            } catch (err) { console.error('Dropdown fetch error:', err); }
        };
        fetchDropdowns();
    }, []);

    const openApprove = (entry) => { setApproveEntry(entry); setIsApproveModalOpen(true); };
    const openReject  = (entry) => { setRejectEntry(entry);  setIsRejectModalOpen(true);  };

    const columnDefs = useMemo(() => [
        {
            headerName: 'S.No', width: 70, pinned: 'left',
            valueGetter: p => (currentPage - 1) * perPage + (p.node.rowIndex ?? 0) + 1,
        },
        { headerName: 'Date',    field: 'date',        width: 120, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '—' },
        { headerName: 'Site',    field: 'site.name',   flex: 1,   minWidth: 150 },
        { headerName: 'Labour',  field: 'labour.name', flex: 1,   minWidth: 140 },
        { headerName: 'Workers', field: 'no_of_workers', width: 100 },
        {
            headerName: 'Std. Rate', width: 120,
            valueGetter: p => p.data?.labour?.standard_rate,
            valueFormatter: p => p.value != null ? `₹${Number(p.value).toFixed(2)}` : '—',
        },
        { headerName: 'Created By', width: 140, valueGetter: p => p.data?.creator?.name || '—' },
        {
            headerName: 'Actions', width: 160, sortable: false, pinned: 'right',
            cellRenderer: p => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openApprove(p.data)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                        title="Approve"
                    >
                        <CheckCircle size={13} /> Approve
                    </button>
                    <button
                        onClick={() => openReject(p.data)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                        title="Reject"
                    >
                        <XCircle size={13} /> Reject
                    </button>
                </div>
            ),
        },
    ], [currentPage, perPage]);

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Approve Labour Transactions</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li><a href="/labourentry" className="hover:text-blue-600 transition-colors">Labour Entry</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">Approve Transactions</li>
                    </ol>
                </nav>
            </div>

            {/* Stats bar */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                    <span className="text-yellow-800 font-medium">{totalRows} Pending Approval</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-full sm:w-1/3">
                    <ThemeUI.Input
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by site name..."
                        leftElement={<Search size={16} className="text-gray-400" />}
                    />
                </div>
                <ThemeUI.Button
                    onClick={() => setIsFilterOpen(true)}
                    gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                >
                    <Filter size={16} className="mr-2" /> Filters
                </ThemeUI.Button>
            </div>

            {/* Grid */}
            <div style={{ '--header-gradient': `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                <AgGridReact
                    className="custom-ag-grid"
                    domLayout="autoHeight"
                    theme={themeQuartz.withParams({ spacing: 7, headerHeight: 45, headerFontSize: 16, fontSize: 13, headerTextColor: 'white' })}
                    defaultColDef={{ resizable: true, sortable: true }}
                    rowData={entries}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    pagination
                    paginationPageSize={perPage}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: 'No Pending Labour Entries' }}
                    onPaginationChanged={params => {
                        if (params.api) {
                            const newPage = params.api.paginationGetCurrentPage() + 1;
                            const newSize = params.api.paginationGetPageSize();
                            if (newPage !== currentPage) setCurrentPage(newPage);
                            if (newSize !== perPage)     setPerPage(newSize);
                        }
                    }}
                />
            </div>

            {/* Approve Modal */}
            <ApproveRowModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                entry={approveEntry}
                onApproved={fetchEntries}
                theme={theme}
            />

            {/* Reject Modal */}
            <RejectModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                entry={rejectEntry}
                onRejected={fetchEntries}
                theme={theme}
            />

            {/* Filter Offcanvas */}
            <Offcanvas
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                title="Filter Options"
                position="right"
                size="md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Site">
                        <ThemeUI.Select
                            value={siteFilter}
                            onChange={opt => { setSiteFilter(opt?.value || ''); setCurrentPage(1); }}
                            options={activeSites.map(s => ({ value: s.id, label: s.name }))}
                            placeholder="All sites"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Labour">
                        <ThemeUI.Select
                            value={labourFilter}
                            onChange={opt => { setLabourFilter(opt?.value || ''); setCurrentPage(1); }}
                            options={activeLabours.map(l => ({ value: l.id, label: l.name }))}
                            placeholder="All labours"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date From">
                        <ThemeUI.Input
                            type="date" value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                            max={dateTo || new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date To">
                        <ThemeUI.Input
                            type="date" value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                            min={dateFrom}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <div className="flex gap-2 pt-4">
                        <ThemeUI.Button
                            onClick={() => {
                                setSiteFilter(''); setLabourFilter('');
                                setDateFrom(''); setDateTo('');
                                setCurrentPage(1); setIsFilterOpen(false);
                            }}
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                            className="flex-1"
                        >
                            Reset
                        </ThemeUI.Button>
                        <ThemeUI.Button
                            onClick={() => setIsFilterOpen(false)}
                            gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                            className="flex-1"
                        >
                            Apply
                        </ThemeUI.Button>
                    </div>
                </div>
            </Offcanvas>
        </Layout>
    );
}

export default ApproveLabourEntry;