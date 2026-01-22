import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/themeContext';
import ProtectedRoute from './components/protectedRoute';
import SignIn from './components/signIn';
import Dashboard from './components/dashboard';
import Permission from './components/permission';
import Role from './components/role';
import Site from './components/site';
import Team from './components/team';
import Unit from './components/unit';
import Material from './components/material';
import MaterialEntry from './components/materialEntry';
import Labour from './components/labour';
import LabourEntry from './components/labourEntry';
import Vendor from './components/vendor';
function App(){
	return(
		<>
    		<ThemeProvider>
				<ToastContainer
					position="top-right"
					autoClose={3000}
					hideProgressBar={false}
					newestOnTop
					closeOnClick
					rtl={false}
					pauseOnFocusLoss
					draggable
					pauseOnHover
					theme="light"
				/>
				<Routes>
					{/* Public Route */}
					<Route path="/" element={<SignIn />} />
					{/* Protected Routes */}
					<Route 
						path="/dashboard" 
						element={
							<ProtectedRoute moduleName="dashboard">
								<Dashboard />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/permission" 
						element={
							<ProtectedRoute moduleName="permission">
								<Permission />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/role" 
						element={
							<ProtectedRoute moduleName="role">
								<Role />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/site" 
						element={
							<ProtectedRoute moduleName="site">
								<Site />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/team" 
						element={
							<ProtectedRoute moduleName="team">
								<Team />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/unit" 
						element={
							<ProtectedRoute moduleName="unit">
								<Unit />
							</ProtectedRoute>
						} 
					/> 
					<Route 
						path="/material" 
						element={
							<ProtectedRoute moduleName="material">
								<Material />
							</ProtectedRoute>
						} 
					/> 
					<Route 
						path="/materialentry" 
						element={
							<ProtectedRoute moduleName="materialentry">
								<MaterialEntry />
							</ProtectedRoute>
						} 
					/> 
					<Route 
						path="/labour" 
						element={
							<ProtectedRoute moduleName="labour">
								<Labour />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/labourentry" 
						element={
							<ProtectedRoute moduleName="labourentry">
								<LabourEntry />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/vendor" 
						element={
							<ProtectedRoute moduleName="vendor">
								<Vendor />
							</ProtectedRoute>
						} 
					/>
				</Routes>
			</ThemeProvider>
		</>
	);
}
export default App;