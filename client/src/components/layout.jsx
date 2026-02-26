import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, ChevronDown, ChevronRight, Target, Menu, Settings, MapPin, Users, Package, Truck, UserCog, KeyRound, UsersRound, Ruler  } from "lucide-react"
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
import { useTheme } from '../context/themeContext';
import { ThemeUI } from '../context/themeUI';
import { toast } from 'react-toastify';
import axios from "../utils/axios";
import PropTypes from 'prop-types';

function Layout({ children, selectedSite, siteName }){
	const { theme }                                               = useTheme();
	const [sidebarOpen, setSidebarOpen]                           = useState(false);
	const [isMobile, setIsMobile]                                 = useState(window.innerWidth < 768);
	const [isHovered, setIsHovered]                               = useState(false);
	const [dropdownOpen, setDropdownOpen]                         = useState(false);
	const [companyName, setCompanyName]                           = useState(localStorage.getItem('companyName') || 'Porter');
	const [companyLogo, setCompanyLogo]                           = useState(localStorage.getItem('companyLogo') || null);
	const location                                                = useLocation();
	const navigate                                                = useNavigate();
	const dropdownRef                                             = useRef(null);
	const [loading, setLoading]                                   = useState(false);
	const [expandedGroups, setExpandedGroups]                     = useState({});
	const toggleMobileSidebar 									  = () => setSidebarOpen((prev) => !prev);
	const toggleDropdown 										  = () => setDropdownOpen((prev) => !prev);
	const [permissions, setPermissions]                           = useState({});

	useEffect(() => {
		const handleClickOutside = (event) => {
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		const checkIfMobile = () => {
		const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if(!mobile) setSidebarOpen(false);
		};
		window.addEventListener('resize', checkIfMobile);
		return () => window.removeEventListener('resize', checkIfMobile);
	}, []);

	useEffect(() => {
		const handleStorageChange = () => {
			setCompanyName(localStorage.getItem('companyName') || 'Porter');
			setCompanyLogo(localStorage.getItem('companyLogo') || null);
			const cached = localStorage.getItem('userPermissions');
			if (cached) {
				setPermissions(JSON.parse(cached));
			}
		};
		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if(dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const getCurrentUser = () => {
		try{
			const userStr = localStorage.getItem('GrandeeAdminUser');
			return userStr ? JSON.parse(userStr) : null;
		}catch(error){
			console.error('Error parsing user from localStorage:', error);
			return null;
		}
	};

	const fetchPermissions = async () => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/permission/user/${user.id}`);
			console.log(response.data);
			if(response.data.success){
				const permMap = {};
				response.data.data.permissions.forEach(p => {
					permMap[p.module] = p;
				});
				localStorage.setItem('userPermissions', JSON.stringify(permMap));
            	window.dispatchEvent(new Event('permissionsUpdated'));
				setPermissions(permMap);
			}
		}catch(error){
			console.error('Error fetching permissions:', error);
			const cached = localStorage.getItem('userPermissions');
			if(cached){
				setPermissions(JSON.parse(cached));
			}
		}
	};

	useEffect(() => {
		fetchPermissions();
	}, []);

	const sidebarClasses = useMemo(() => {
		const base = 'fixed inset-y-0 left-0 text-white transition-all duration-300 ease-in-out flex flex-col';
		if(isMobile){
			return `${base} z-60 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-50`;
		}
		return `${base} z-60 ${isHovered ? 'w-50' : 'w-18'}`;
	}, [isMobile, sidebarOpen, isHovered]);

	const contentClasses = useMemo(() => {
		const base = 'flex-1 flex flex-col transition-all duration-300';
		return isMobile ? `${base} ml-0` : `${base} ml-18`;
	}, [isMobile]);

	const styles = useMemo(
		() => ({
			sidebar: {
				background: `linear-gradient(${theme.gradientDirection}, ${theme.sidebarGradientStart}, ${theme.sidebarGradientEnd})`,
				color: 'white',
			},
			activeItem: {
				color: theme.primaryGradientStart,
			},
			mainBackground: {
				backgroundColor: theme.backgroundColor || '#f3f4f6',
			},
			navbarBackground: {
				backgroundColor: theme.navbarColor || '#ffffff',
			},
		}),
		[theme]
	);

	const handleLogout = async () => {
		try{
			toast.success('Logged out successfully');
			navigate('/');
		}catch(error){
			console.error('Logout error:', error);
			localStorage.clear();
			setPermissions({});
			toast.info('Session cleared');
			navigate('/');
		}
	};

	const toggleGroup = (groupName) => {
		setExpandedGroups(prev => {
			const isCurrentlyExpanded = prev[groupName];
			return {
				[groupName]: !isCurrentlyExpanded
			};
		});
	};

	const menuStructure = useMemo(() => {
		return [
			{ name: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', type: 'single' },
			{ name: 'site', icon: MapPin, label: 'Sites', type: 'single' },
			{ name: 'vendor', icon: Truck, label: 'Vendor', type: 'single' },
			{
				name: 'labour',
				icon: Users,
				label: 'Labour',
				type: 'group',
				children: [
					{ name: 'labour', icon: Users, label: 'Master', type: 'single' },
					{ name: 'labourentry', icon: Users, label: 'Transactions', type: 'single' }
				]
			},
			{
				name: 'material',
				icon: Package,
				label: 'Material',
				type: 'group',
				children: [
					{ name: 'material', icon: Package, label: 'Master', type: 'single' },
					{ name: 'materialentry', icon: Package, label: 'Transactions', type: 'single' }
				]
			},
			{
				name: 'settings',
				icon: Settings,
				label: 'Settings',
				type: 'group',
				children: [
					{ name: 'role', icon: UserCog, label: 'Roles', type: 'single' },
					{ name: 'permission', icon: KeyRound, label: 'Permission', type: 'single' },
					{ name: 'team', icon: UsersRound, label: 'Team' },
					{ name: 'unit', icon: Ruler, label: 'Unit' },
				]
			},
		];
	}, []);

	const filteredMenu = useMemo(() => {
		return menuStructure.map(item => {
			if (item.type === 'single') {
				// if (item.name === 'dashboard') return item;
				const perm = permissions[item.name];
				return perm?.can_view ? item : null;
			} else if (item.type === 'group') {
				const visibleChildren = item.children.filter(child => {
					const perm = permissions[child.name];
					return perm?.can_view;
				});
				return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
			}
			return null;
		}).filter(Boolean);
	}, [menuStructure, permissions]);

	const isPathActive = (path) => {
		const currentPath = location.pathname.substring(1) || 'dashboard';
		return currentPath === path;
	};

	const isGroupActive = (children) => {
		const currentPath = location.pathname.substring(1) || 'dashboard';
		return children.some(child => currentPath === child.name);
	};

	const isExpanded = isHovered || (isMobile && sidebarOpen);

	useEffect(() => {
		filteredMenu.forEach(item => {
			if (item.type === 'group' && isGroupActive(item.children)) {
				setExpandedGroups({ [item.name]: true });
			}
		});
	}, [location.pathname, filteredMenu]);

	useEffect(() => {
		if (!isHovered && !isMobile) {
			setExpandedGroups({});
		}
	}, [isHovered, isMobile]);

	useEffect(() => {
		if (isMobile && !sidebarOpen) {
			setExpandedGroups({});
		}
	}, [isMobile, sidebarOpen]);

	return(
		<>
			<style>{`
				.sidebar-icon {
					stroke: white;
					transition: stroke 0.2s ease;
				}
				.group:hover .sidebar-icon {
					stroke: ${theme.primaryGradientStart};
				}
				.group.active .sidebar-icon {
					stroke: ${theme.primaryGradientStart};
				}
				.group:hover .group-hover-theme-color {
					color: ${theme.primaryGradientStart} !important;
				}
			`}</style>
			<div className="flex" style={styles.mainBackground}>
			<div
				className={sidebarClasses}
				style={styles.sidebar}
				onMouseEnter={() => !isMobile && setIsHovered(true)}
				onMouseLeave={() => !isMobile && setIsHovered(false)}
			>
				<div className="sticky top-0 z-10">
					<div className="px-4 py-5">
						<div className="flex items-center gap-3">
							<div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
								<Target size={34}/>
							</div>
							<div
								className={`overflow-hidden transition-all duration-300 ${
									isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
								}`}
							>
								<span className="font-bold text-xl whitespace-nowrap">Grandee</span>
							</div>
						</div>
					</div>
				</div>
				<nav className="flex-1 px-2 overflow-y-auto sidebar-scroll">
					<ul className="text-sm pb-4">
						{filteredMenu.map((item) => {
							if (item.type === 'single') {
								const isActive = isPathActive(item.name);
								return (
									<li 
										key={item.name}
										className={`mx-2 my-3 cursor-pointer rounded-md transition-colors group ${
											isActive ? 'bg-white active' : 'hover:bg-white'
										}`}
									>
										<Link
											to={`/${item.name}`}
											className="flex items-center w-full p-2"
										>
											<item.icon 
												size={20} 
												className={`min-w-5 sidebar-icon`}
												style={isActive ? { stroke: theme.primaryGradientStart } : undefined}
											/>
											<span
												className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover-theme-color ${
													isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
												}`}
												style={isActive ? styles.activeItem : undefined}
											>
												{item.label}
											</span>
										</Link>
									</li>
								);
							} else if (item.type === 'group') {
								const isGroupExpanded = expandedGroups[item.name];
								const hasActiveChild = isGroupActive(item.children);
								const showSubmenu = (isHovered || (isMobile && sidebarOpen));
								
								return (
									<li key={item.name} className="mx-2 my-2">
										<div
											className={`p-2 cursor-pointer rounded-md flex items-center transition-colors group ${
												hasActiveChild && !showSubmenu ? 'bg-white active' : 'hover:bg-white'
											}`}
											onClick={() => showSubmenu && toggleGroup(item.name)}
										>
											<item.icon 
												size={20} 
												className={`min-w-5 sidebar-icon`}
												style={hasActiveChild && !showSubmenu ? { stroke: theme.primaryGradientStart } : undefined}
											/>
											<span
												className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover-theme-color ${
													isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
												}`}
												style={hasActiveChild && !showSubmenu ? styles.activeItem : undefined}
											>
												{item.label}
											</span>
											{showSubmenu && (
												<div className={`ml-auto transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
													{isGroupExpanded ? (
														<ChevronDown 
															size={16} 
															className="sidebar-icon"
														/>
													) : (
														<ChevronRight 
															size={16} 
															className="sidebar-icon"
														/>
													)}
												</div>
											)}
										</div>
										
										{showSubmenu && isGroupExpanded && (
											<ul className="ml-4 mt-1">
												{item.children.map((child) => {
													const isChildActive = isPathActive(child.name);
													return (
														<li
															key={child.name}
															className={`p-2 my-1 cursor-pointer rounded-md transition-colors group ${
																isChildActive ? 'bg-white' : 'hover:bg-white'
															}`}
														>
															<Link
																to={`/${child.name}`}
																className="flex items-center w-full"
															>
																<span 
																	className="text-xs font-medium whitespace-nowrap transition-colors group-hover-theme-color"
																	style={isChildActive ? styles.activeItem : undefined}
																>
																	{child.label}
																</span>
															</Link>
														</li>
													);
												})}
											</ul>
										)}
									</li>
								);
							}
							return null;
						})}
					</ul>
				</nav>
			</div>

			{isMobile && sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity duration-300"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<div className={contentClasses}>
				<header className="sticky top-0 shadow-sm py-2 z-50" style={styles.navbarBackground}>
					<div className="flex items-center justify-between px-6 py-3">
						<div className="flex items-center gap-3">
							{isMobile && (
								<button
									onClick={toggleMobileSidebar}
									className="inline-flex items-center p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
								>
									<span className="sr-only">Open sidebar</span>
									<Menu size={24} className="text-gray-500" />
								</button>
							)}
						</div>
						<div className="flex items-center gap-4">
							{/* User Profile Section */}
							<div className="flex items-center">
								<div className="hidden sm:flex items-center gap-3">
									<div className="relative">
										{getCurrentUser()?.profile ? (
											<img
												src={getCurrentUser().profile}
												alt="Profile"
												className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
												onError={(e) => {
													e.target.style.display = 'none';
													e.target.nextSibling.style.display = 'flex';
												}}
											/>
										) : null}
										<div 
											className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getCurrentUser()?.profile ? 'hidden' : 'flex'}`}
											style={{ backgroundColor: theme.primaryGradientStart }}
										>
											{getCurrentUser()?.name ? getCurrentUser().name.charAt(0).toUpperCase() : 'U'}
										</div>
									</div>
								</div>
								{/* User Dropdown */}
								<div className="relative" ref={dropdownRef}>
									<button 
										className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer" 
										onClick={toggleDropdown}
									>
										<div className="sm:hidden">
											{getCurrentUser()?.profile ? (
												<img
													src={getCurrentUser().profile}
													alt="Profile"
													className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
													onError={(e) => {
														e.target.style.display = 'none';
														e.target.nextSibling.style.display = 'flex';
													}}
												/>
											) : null}
											<div 
												className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getCurrentUser()?.profile ? 'hidden' : 'flex'}`}
												style={{ backgroundColor: theme.primaryGradientStart }}
											>
												{getCurrentUser()?.name ? getCurrentUser().name.charAt(0).toUpperCase() : 'U'}
											</div>
										</div>
										<ChevronDown size={16} className="text-gray-500" />
									</button>
									{dropdownOpen && (
										<div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
											<div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
												<div className="flex items-center gap-3">
													<div className="flex-1 min-w-0">
														<div className="text-sm font-semibold text-gray-800 truncate">
															{getCurrentUser()?.name || 'User'}
														</div>
														<div 
															className="inline-block text-xs font-medium capitalize px-2 py-0.5 rounded-full mt-1"
															style={{ 
																backgroundColor: `${theme.primaryGradientStart}15`,
																color: theme.primaryGradientStart 
															}}
														>
															{getCurrentUser()?.role_name || 'Admin'}
														</div>
													</div>
												</div>
											</div>
											<div className="py-1">
												<button
													onClick={handleLogout}
													className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
													</svg>
													Logout
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</header>
				{/* Main content area */}
				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
		</>
	);
}
Layout.propTypes = {
  children: PropTypes.node.isRequired,
  selectedSite: PropTypes.string,
  siteName: PropTypes.string,
};
export default Layout;