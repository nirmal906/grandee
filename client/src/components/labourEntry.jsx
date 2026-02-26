import { useLocation } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "../utils/axios";
import { toast } from "react-toastify";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import Layout from "./layout";
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Offcanvas from "./Offcanvas";
import NoRowsOverlay from "./NoRowsOverlay";

function LabourEntry() {
    const { theme } = useTheme();
    const location = useLocation()
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [labourEntries, setLabourEntries] = useState([]);
    const [editingEntry, setEditingEntry] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [labourFilter, setLabourFilter] = useState("");
    const [siteFilter, setSiteFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false);
    const [backendErrors, setBackendErrors] = useState({});
    const [activeLabours, setActiveLabours] = useState([]);
    const [activeSites, setActiveSites] = useState([]);
    const [placeholder, setPlaceholder] = useState("Search by site name...");
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const words = ["site name", "labour name", "date"];
    
    // Ref to prevent circular updates
    const isUpdatingRef = useRef(false);

    const [formData, setFormData] = useState({
        site_id: "",
        labour_id: "",
        date: "",
        no_of_workers: "",
        rate_per_worker: "",
        debit_entry: "",
        credit_entry: "",
        status: 1,
    });

    const [permissions, setPermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false,
    });

    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem("userPermissions");
            if (permissionsStr) {
                const perms = JSON.parse(permissionsStr);
                if (perms.labourentry) {
                    return {
                        can_add: perms.labourentry.can_add || false,
                        can_edit: perms.labourentry.can_edit || false,
                        can_delete: perms.labourentry.can_delete || false,
                        can_view: perms.labourentry.can_view || false,
                    };
                }
            }
            return { can_add: false, can_edit: false, can_delete: false, can_view: false };
        } catch (error) {
            console.error("Error parsing permissions:", error);
            return { can_add: false, can_edit: false, can_delete: false, can_view: false };
        }
    }, []);

    useEffect(() => {
        const perms = getUserPermissions();
        setPermissions(perms);
    }, [getUserPermissions]);

    useEffect(() => {
        const handleUpdate = () => setPermissions(getUserPermissions());
        window.addEventListener("permissionsUpdated", handleUpdate);
        return () => window.removeEventListener("permissionsUpdated", handleUpdate);
    }, [getUserPermissions]);

    useEffect(() => {
        if (location.state?.openModal && location.state?.siteId) {
            setEditingEntry({ isNew: true });
            setFormData({
                site_id: location.state.siteId,
                labour_id: "",
                date: "",
                no_of_workers: "",
                rate_per_worker: "",
                debit_entry: "",
                credit_entry: "",
                status: 1,
            });
            setBackendErrors({});
            setIsModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const fetchActiveLabours = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/labour-entry/active-labours`);
            if (res.data.success) {
                setActiveLabours(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch active labours:", err);
        }
    }, []);

    const fetchActiveSites = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/sites`);
            if (res.data.success) {
                setActiveSites(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch active sites:", err);
        }
    }, []);

    const fetchLabourEntries = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/labour-entry`, {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: searchQuery,
                    status: statusFilter === "all" || statusFilter === "" ? "" : statusFilter,
                    labour_id: labourFilter,
                    site_id: siteFilter,
                    date_from: dateFrom,
                    date_to: dateTo,
                },
            });
            if (response.data.success) {
                setLabourEntries(response.data.data);
                setTotalRows(response.data.total || 0);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch labour entries");
            setLabourEntries([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, perPage, searchQuery, statusFilter, labourFilter, siteFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchLabourEntries();
    }, [fetchLabourEntries]);

    useEffect(() => {
        fetchActiveLabours();
        fetchActiveSites();
    }, []);

    // Fixed placeholder typing animation
    useEffect(() => {
        if (isPaused) {
            const timeout = setTimeout(() => setIsPaused(false), 2000);
            return () => clearTimeout(timeout);
        }

        const typingSpeed = isDeleting ? 50 : 100;
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex];
            
            if (!isDeleting && currentCharIndex < currentWord.length) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`);
                setCurrentCharIndex((prev) => prev + 1);
            } else if (isDeleting && currentCharIndex > 0) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`);
                setCurrentCharIndex((prev) => prev - 1);
            } else if (!isDeleting && currentCharIndex === currentWord.length) {
                setIsPaused(true);
                setIsDeleting(true);
            } else if (isDeleting && currentCharIndex === 0) {
                setIsDeleting(false);
                setCurrentWordIndex((prev) => (prev + 1) % words.length);
            }
        }, typingSpeed);
        
        return () => clearTimeout(timeout);
    }, [currentCharIndex, currentWordIndex, isDeleting, isPaused, words]);

    // Calculate total amount
    const calculateTotal = useCallback(() => {
        const workers = Number(formData.no_of_workers) || 0;
        const rate = Number(formData.rate_per_worker) || 0;
        return workers * rate;
    }, [formData.no_of_workers, formData.rate_per_worker]);

    const totalAmount = useMemo(() => calculateTotal(), [calculateTotal]);

    // Fixed: Auto-calculate debit/credit with proper checks
    useEffect(() => {
        // Prevent circular updates
        if (isUpdatingRef.current) return;
        
        if (totalAmount === 0) {
            setFormData((prev) => ({
                ...prev,
                debit_entry: "",
                credit_entry: "",
            }));
            return;
        }

        const debit = Number(formData.debit_entry) || 0;
        const credit = Number(formData.credit_entry) || 0;

        isUpdatingRef.current = true;

        // If credit was just entered/changed, calculate debit
        if (formData.credit_entry !== "" && credit >= 0 && credit <= totalAmount) {
            const calculatedDebit = totalAmount - credit;
            if (Math.abs(calculatedDebit - debit) > 0.01) {
                setFormData((prev) => ({
                    ...prev,
                    debit_entry: calculatedDebit.toFixed(2),
                }));
            }
        }
        // If debit was just entered/changed, calculate credit
        else if (formData.debit_entry !== "" && debit >= 0 && debit <= totalAmount) {
            const calculatedCredit = totalAmount - debit;
            if (Math.abs(calculatedCredit - credit) > 0.01) {
                setFormData((prev) => ({
                    ...prev,
                    credit_entry: calculatedCredit.toFixed(2),
                }));
            }
        }

        // Reset the ref after a short delay
        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 100);
    }, [formData.debit_entry, formData.credit_entry, totalAmount]);

    const handleAddClick = () => {
        if (!permissions.can_add) {
            toast.error("You don't have permission to add labour entry");
            return;
        }
        setEditingEntry({ isNew: true });
        setFormData({
            site_id: "",
            labour_id: "",
            date: "",
            no_of_workers: "",
            rate_per_worker: "",
            debit_entry: "",
            credit_entry: "",
            status: 1,
        });
        setBackendErrors({});
        setIsModalOpen(true);
    };

    const handleEditClick = (entry) => {
        if (!permissions.can_edit) {
            toast.error("You don't have permission to edit labour entry");
            return;
        }
        setEditingEntry(entry);
        setFormData({
            site_id: entry.site_id || "",
            labour_id: entry.labour_id || "",
            date: entry.date ? entry.date.split("T")[0] : "",
            no_of_workers: entry.no_of_workers || "",
            rate_per_worker: entry.rate_per_worker || "",
            debit_entry: entry.debit_entry || "",
            credit_entry: entry.credit_entry || "",
            status: entry.status,
        });
        setBackendErrors({});
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const url = editingEntry?.isNew
                ? `${import.meta.env.VITE_API_URL}/api/labour-entry`
                : `${import.meta.env.VITE_API_URL}/api/labour-entry/${editingEntry.id}`;
            const method = editingEntry?.isNew ? "post" : "put";

            const response = await axios[method](url, formData);
            if (response.data.success) {
                toast.success(editingEntry?.isNew ? "Labour entry created successfully" : "Labour entry updated successfully");
                fetchLabourEntries();
                handleCancel();
            }
        } catch (err) {
            if (err.response?.status === 400 && err.response.data.errors) {
                setBackendErrors(err.response.data.errors);
                toast.error("Please fix the errors in the form.");
            } else {
                toast.error(err.response?.data?.message || "Failed to save labour entry");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this labour entry?")) return;
        setIsLoading(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/labour-entry/${id}`);
            toast.success("Labour entry deleted successfully");
            fetchLabourEntries();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete labour entry");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingEntry(null);
        setFormData({
            site_id: "",
            labour_id: "",
            date: "",
            no_of_workers: "",
            rate_per_worker: "",
            debit_entry: "",
            credit_entry: "",
            status: 1,
        });
        setBackendErrors({});
        setIsModalOpen(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setBackendErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // Fixed: Labour selection with proper select value handling
    const handleLabourChange = (selectedOption) => {
        const labourId = selectedOption?.value || "";
        
        // Clear backend errors
        setBackendErrors((prev) => ({ ...prev, labour_id: "" }));

        if (labourId) {
            const selectedLabour = activeLabours.find((l) => l.id === labourId);
            if (selectedLabour && selectedLabour.standard_rate !== undefined) {
                setFormData((prev) => ({
                    ...prev,
                    labour_id: labourId,
                    rate_per_worker: selectedLabour.standard_rate,
                    debit_entry: "",
                    credit_entry: "",
                }));
            } else {
                setFormData((prev) => ({
                    ...prev,
                    labour_id: labourId,
                    debit_entry: "",
                    credit_entry: "",
                }));
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                labour_id: "",
                rate_per_worker: "",
                debit_entry: "",
                credit_entry: "",
            }));
        }
    };

    const handleRateChange = (e) => {
        const value = e.target.value;
        setFormData((prev) => ({
            ...prev,
            rate_per_worker: value,
            debit_entry: "",
            credit_entry: "",
        }));
        setBackendErrors((prev) => ({ ...prev, rate_per_worker: "" }));
    };

    // Fixed: Safe handlers for debit/credit
    const handleCreditChange = (e) => {
        const value = e.target.value;
        if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
            setFormData((prev) => ({ ...prev, credit_entry: value, debit_entry: "" }));
            setBackendErrors((prev) => ({ ...prev, credit_entry: "" }));
        }
    };

    const handleDebitChange = (e) => {
        const value = e.target.value;
        if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
            setFormData((prev) => ({ ...prev, debit_entry: value, credit_entry: "" }));
            setBackendErrors((prev) => ({ ...prev, debit_entry: "" }));
        }
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => setCurrentPage(page);
    const handlePerRowsChange = (newPerPage) => {
        setPerPage(newPerPage);
        setCurrentPage(1);
    };

    const columnDefs = useMemo(() => {
        const base = [
            { 
                headerName: "S.No", 
                width: 80, 
                valueGetter: (p) => (currentPage - 1) * perPage + (p.node.rowIndex ?? 0) + 1,
                pinned: 'left'
            },
            { headerName: "Site", field: "site.name", flex: 1, minWidth: 200 },
            { 
                headerName: "Date", 
                field: "date", 
                width: 120, 
                valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "—") 
            },
            { headerName: "Labour", field: "labour.name", flex: 1, minWidth: 150 },
            { headerName: "Workers", field: "no_of_workers", width: 100, valueFormatter: (p) => p.value ?? "—" },
            { 
                headerName: "Rate/Worker", 
                field: "rate_per_worker", 
                width: 120, 
                valueFormatter: (p) => (p.value != null ? `₹${Number(p.value).toFixed(2)}` : "—") 
            },
            {
                headerName: "Total",
                width: 120,
                valueGetter: (p) => {
                    const workers = p.data?.no_of_workers || 0;
                    const rate = p.data?.rate_per_worker || 0;
                    return workers * rate;
                },
                valueFormatter: (p) => `₹${Number(p.value).toFixed(2)}`,
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
            },
            { headerName: "Created By", field: "creator.name", width: 140, valueGetter: (p) => p.data?.creator?.name || "—" },
            { headerName: "Updated By", field: "updater.name", width: 140, valueGetter: (p) => p.data?.updater?.name || "—" },
        ];

        if (permissions.can_edit || permissions.can_delete) {
            base.push({
                headerName: "Actions",
                cellRenderer: (p) => (
                    <div className="flex items-center gap-2">
                        {permissions.can_edit && (
                            <button 
                                onClick={() => handleEditClick(p.data)} 
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors" 
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                        {permissions.can_delete && (
                            <button 
                                onClick={() => handleDelete(p.data.id)} 
                                className="p-1 text-red-600 hover:text-red-800 transition-colors" 
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ),
                width: 120,
                sortable: false,
                pinned: 'right'
            });
        }

        return base;
    }, [currentPage, perPage, permissions]);

    const renderForm = () => (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <ThemeUI.FormField label="Site" name="site_id" error={backendErrors.site_id} required>
                    <ThemeUI.Select
                        value={formData.site_id}
                        onChange={(opt) => {
                            setFormData((prev) => ({ ...prev, site_id: opt?.value || "" }));
                            setBackendErrors((prev) => ({ ...prev, site_id: "" }));
                        }}
                        options={activeSites.map((s) => ({ value: s.id, label: s.name }))}
                        placeholder="Select site"
                        isClearable
                    />
                </ThemeUI.FormField>

                <ThemeUI.FormField label="Labour" name="labour_id" error={backendErrors.labour_id} required>
                    <ThemeUI.Select
                        value={formData.labour_id}
                        onChange={handleLabourChange}
                        options={activeLabours.map((l) => ({ 
                            value: l.id, 
                            label: `${l.name} (₹${Number(l.standard_rate).toFixed(2)})` 
                        }))}
                        placeholder="Select labour"
                        isClearable
                    />
                </ThemeUI.FormField>

                <ThemeUI.FormField label="Date" name="date" error={backendErrors.date} required>
                    <ThemeUI.Input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleInputChange} 
                        max={new Date().toISOString().split('T')[0]}
                    />
                </ThemeUI.FormField>

                <ThemeUI.FormField label="No. of Workers" name="no_of_workers" error={backendErrors.no_of_workers} required>
                    <ThemeUI.Input
                        type="number"
                        min="0"
                        step="1"
                        name="no_of_workers"
                        value={formData.no_of_workers}
                        onChange={handleInputChange}
                        placeholder="0"
                    />
                </ThemeUI.FormField>

                <ThemeUI.FormField label="Rate per Worker (₹)" name="rate_per_worker" error={backendErrors.rate_per_worker} required>
                    <ThemeUI.Input
                        type="number"
                        step="0.01"
                        min="0"
                        name="rate_per_worker"
                        value={formData.rate_per_worker}
                        onChange={handleRateChange}
                        placeholder="0.00"
                    />
                </ThemeUI.FormField>

                <ThemeUI.FormField label="Total Amount (₹)" name="total_amount">
                    <ThemeUI.Input
                        type="text"
                        value={`₹${totalAmount.toFixed(2)}`}
                        disabled
                        className="bg-gray-100 cursor-not-allowed font-semibold"
                    />
                </ThemeUI.FormField>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                            Paid ₹
                        </label>
                        <ThemeUI.Checkbox
                            id="paid_checkbox"
                            name="paid_checkbox"
                            checked={formData.credit_entry === totalAmount.toFixed(2) && totalAmount > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setFormData(prev => ({
                                        ...prev,
                                        credit_entry: totalAmount.toFixed(2),
                                        debit_entry: "0.00"
                                    }))
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        credit_entry: "",
                                        debit_entry: ""
                                    }))
                                }
                            }}
                            disabled={totalAmount === 0}
                        />
                    </div>
                    <ThemeUI.Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalAmount}
                        name="credit_entry"
                        value={formData.credit_entry}
                        onChange={handleCreditChange}
                        placeholder="0.00"
                        error={backendErrors.credit_entry}
                        disabled={totalAmount === 0}
                    />
                    {backendErrors.credit_entry && (
                        <div className="flex items-center mt-1 text-red-500 text-xs">
                            <span>{backendErrors.credit_entry}</span>
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                            Due ₹
                        </label>
                        <ThemeUI.Checkbox
                            id="due_checkbox"
                            name="due_checkbox"
                            checked={formData.debit_entry === totalAmount.toFixed(2) && totalAmount > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setFormData(prev => ({
                                        ...prev,
                                        debit_entry: totalAmount.toFixed(2),
                                        credit_entry: "0.00"
                                    }))
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        debit_entry: "",
                                        credit_entry: ""
                                    }))
                                }
                            }}
                            disabled={totalAmount === 0}
                        />
                    </div>
                    <ThemeUI.Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalAmount}
                        name="debit_entry"
                        value={formData.debit_entry}
                        onChange={handleDebitChange}
                        placeholder="0.00"
                        error={backendErrors.debit_entry}
                        disabled={totalAmount === 0}
                    />
                    {backendErrors.debit_entry && (
                        <div className="flex items-center mt-1 text-red-500 text-xs">
                            <span>{backendErrors.debit_entry}</span>
                        </div>
                    )}
                </div>

                <ThemeUI.FormField label="Status" name="status">
                    <ThemeUI.Select
                        value={formData.status}
                        onChange={(opt) => setFormData((prev) => ({ ...prev, status: opt?.value ?? 1 }))}
                        options={[
                            { value: 1, label: "Active" },
                            { value: 0, label: "Inactive" },
                        ]}
                    />
                </ThemeUI.FormField>
            </div>
            {totalAmount > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        {/* Values */}
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
                        {/* Status */}
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
                    onClick={handleCancel} 
                    gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                    disabled={isLoading}
                >
                    Cancel
                </ThemeUI.Button>
                <ThemeUI.Button
                    onClick={handleSave}
                    disabled={isLoading}
                    gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
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
    );

    return (
        <Layout>
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Labour Entry Management</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">
                                Home
                            </a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Labour Entry
                        </li>
                    </ol>
                </nav>
            </div>

            <div className="mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-1/3">
                        <ThemeUI.Input
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={placeholder}
                            leftElement={<Search size={16} className="text-gray-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <ThemeUI.Button 
                            onClick={() => setIsFilterOffcanvasOpen(true)} 
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                        >
                            <Filter size={16} className="mr-2" /> Filters
                        </ThemeUI.Button>
                        {permissions.can_add && (
                            <ThemeUI.Button 
                                onClick={handleAddClick} 
                                gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
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
                        headerTextColor: "white" 
                    })}
                    defaultColDef={{ resizable: true, sortable: true }}
                    rowData={labourEntries}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    pagination
                    paginationPageSize={perPage}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Labour Entries Found" }}
                    onPaginationChanged={(params) => {
                        if (params.api) {
                            const newPage = params.api.paginationGetCurrentPage() + 1;
                            const newSize = params.api.paginationGetPageSize();
                            if (newPage !== currentPage) handlePageChange(newPage);
                            if (newSize !== perPage) handlePerRowsChange(newSize);
                        }
                    }}
                />
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCancel} 
                title={editingEntry?.isNew ? "Add Labour Entry" : "Edit Labour Entry"} 
                size="full"
            >
                {renderForm()}
            </Modal>

            <Offcanvas 
                isOpen={isFilterOffcanvasOpen} 
                onClose={() => setIsFilterOffcanvasOpen(false)} 
                title="Filter Options" 
                position="right" 
                size="md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Site">
                        <ThemeUI.Select
                            value={siteFilter}
                            onChange={(opt) => {
                                setSiteFilter(opt?.value || "");
                                setCurrentPage(1);
                            }}
                            options={activeSites.map((s) => ({ value: s.id, label: s.name }))}
                            placeholder="All sites"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Labour">
                        <ThemeUI.Select
                            value={labourFilter}
                            onChange={(opt) => {
                                setLabourFilter(opt?.value || "");
                                setCurrentPage(1);
                            }}
                            options={activeLabours.map((l) => ({ value: l.id, label: l.name }))}
                            placeholder="All labours"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date From">
                        <ThemeUI.Input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => { 
                                setDateFrom(e.target.value); 
                                setCurrentPage(1); 
                            }} 
                            max={dateTo || new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Date To">
                        <ThemeUI.Input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => { 
                                setDateTo(e.target.value); 
                                setCurrentPage(1); 
                            }} 
                            min={dateFrom}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </ThemeUI.FormField>

                    <ThemeUI.FormField label="Status">
                        <ThemeUI.Select
                            value={statusFilter }
                            onChange={(opt) => { 
                                setStatusFilter(opt?.value || ""); 
                                setCurrentPage(1); 
                            }}
                            options={[
                                { value: "1", label: "Active" },
                                { value: "0", label: "Inactive" },
                            ]}
                            placeholder="All statuses"
                            isClearable
                        />
                    </ThemeUI.FormField>

                    <div className="flex gap-2 pt-4">
                        <ThemeUI.Button
                            onClick={() => {
                                setSiteFilter("");
                                setLabourFilter("");
                                setDateFrom("");
                                setDateTo("");
                                setStatusFilter("");
                                setCurrentPage(1);
                                setIsFilterOffcanvasOpen(false);
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
    );
}

export default LabourEntry;