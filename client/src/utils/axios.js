import axios from 'axios';
import { toast } from 'react-toastify';

const apiAdmin = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Track if a refresh is in progress
let isRefreshing   = false;
let failedQueue    = [];
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        error ? prom.reject(error) : prom.resolve(token);
    });
    failedQueue = [];
};

// 1. Add ADMIN access token to every request
apiAdmin.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminAccessToken');
        if(token){
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. Handle 401 → Auto refresh using ADMIN tokens
apiAdmin.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only handle TOKEN_EXPIRED code, not all 401s (e.g. wrong credentials)
        const isTokenExpired =
            error.response?.status === 401 &&
            error.response?.data?.code === 'TOKEN_EXPIRED';

        if(isTokenExpired && !originalRequest._retry){

            // Prevent the refresh call itself from triggering another refresh loop
            if(originalRequest.url?.includes('/api/refresh/token')){
                isRefreshing = false;
                logoutAdmin();
                return Promise.reject(error);
            }

            // If already refreshing, queue this request until refresh completes
            if(isRefreshing){
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiAdmin(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing           = true;

            const refreshToken = localStorage.getItem('adminRefreshToken');

            // No refresh token available → logout immediately
            if(!refreshToken){
                isRefreshing = false;
                logoutAdmin();
                return Promise.reject(error);
            }

            try{
                // Call refresh token endpoint
                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/refresh/token`,
                    { refreshToken }
                );

                // Directly destructure from response.data (matches backend response shape)
                const { accessToken, refreshToken: newRefreshToken } = response.data;

                if(!accessToken){
                    throw new Error('No access token returned from refresh endpoint');
                }

                // Store new tokens
                localStorage.setItem('adminAccessToken', accessToken);
                if(newRefreshToken){
                    localStorage.setItem('adminRefreshToken', newRefreshToken);
                }

                // Update default header and retry original request
                apiAdmin.defaults.headers.Authorization = `Bearer ${accessToken}`;
                originalRequest.headers.Authorization   = `Bearer ${accessToken}`;

                // Process queued requests
                processQueue(null, accessToken);

                // Retry the original failed request
                return apiAdmin(originalRequest);

            }catch(refreshError){
                processQueue(refreshError, null);
                logoutAdmin();
                return Promise.reject(refreshError);
            }finally{
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Admin-specific logout helper
const logoutAdmin = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('GrandeeAdminUser');
    localStorage.removeItem('userPermissions');
    toast.error('Session expired. Please login again.');
    window.location.href = '/';
};

export default apiAdmin;