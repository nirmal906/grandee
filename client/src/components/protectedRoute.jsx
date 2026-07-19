import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
function ProtectedRoute({ children, moduleName }){
    const [isChecking, setIsChecking] = useState(true);
    const navigate = useNavigate();

    // Get permissions from localStorage
    const getPermissions = () => {
        try{
            const permStr     = localStorage.getItem('userPermissions');
            const permissions = permStr ? JSON.parse(permStr) : {};
            return permissions;
        }catch(error){
            console.error('❌ Error parsing permissions:', error);
            return {};
        }
    };

    // Enhanced authentication check with validation
    const isAuthenticated = () => {
        try{
            const adminUserStr     = localStorage.getItem('GrandeeAdminUser');
            const adminAccessToken = localStorage.getItem('adminAccessToken');
            // Must have both user data and access token
            if(!adminUserStr || !adminAccessToken){
                console.log('❌ Missing adminUser or adminAccessToken');
                return false;
            }
            const user = JSON.parse(adminUserStr);
            // Validate user object has required fields
            if(!user.id || !user.role_id){
                console.log('❌ Invalid user data');
                localStorage.removeItem('GrandeeAdminUser');
                localStorage.removeItem('adminAccessToken');
                localStorage.removeItem('adminRefreshToken');
                return false;
            }
            // Check user status if it exists
            if(user.status !== undefined && user.status !== 1){
                console.log('❌ User status is not active');
                localStorage.removeItem('GrandeeAdminUser');
                localStorage.removeItem('adminAccessToken');
                localStorage.removeItem('adminRefreshToken');
                return false;
            }
            console.log('✅ User is authenticated:', user.name);
            return true;
        }catch(error){
            console.error('❌ Error checking authentication:', error);
            localStorage.removeItem('GrandeeAdminUser');
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
            return false;
        }
    };

    // Check if user has access to the module
    const hasAccess = (module) => {
        // Dashboard is always accessible to authenticated users
        if(module === 'dashboard'){
            console.log('✅ Dashboard access granted');
            return true;
        }
        const permissions      = getPermissions();
        const modulePermission = permissions[module];
        const access           = modulePermission?.can_view === true;
        console.log(`🔐 Module "${module}" access:`, access);
        return access;
    };

    // Validate authentication on mount and when module changes
    useEffect(() => {
        const validateAccess = () => {
            console.log('🔍 Validating access for module:', moduleName);
            const authenticated = isAuthenticated();
            if(!authenticated){
                console.log('❌ Not authenticated, redirecting to login');
                navigate('/', { replace: true });
                return;
            }
            const access = hasAccess(moduleName);
            if(!access){
                console.log('❌ No access to module, redirecting to unauthorized');
                navigate('/unauthorized', { replace: true });
                return;
            }
            console.log('✅ Access granted, rendering protected content');
            setIsChecking(false);
        };
        
        validateAccess();
    }, [moduleName, navigate]);

    // Show loading state while checking
    if(isChecking){
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if(!isAuthenticated()){
        return <Navigate to="/" replace />;
    }

    // If no access to module, redirect to unauthorized
    if(!hasAccess(moduleName)){
        return <Navigate to="/unauthorized" replace />;
    }
    
    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    moduleName: PropTypes.string.isRequired,
};

export default ProtectedRoute;