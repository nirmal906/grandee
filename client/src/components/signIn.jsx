import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "../utils/axios";
import { toast } from 'react-toastify';
import { Eye, EyeOff, Mail, Lock, Loader } from 'lucide-react';
import { useTheme } from '../context/themeContext';
import { ThemeUI } from '../context/themeUI';
export default function SignIn(){
    const { theme }                       = useTheme();
    const [userInput, setUserInput]       = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors]             = useState({});
    const [isLoading, setIsLoading]       = useState(false);
    const [rememberMe, setRememberMe]     = useState(false);
    const navigate                        = useNavigate();
    const isValidEmail                    = (input) => {
        const emailRegex                  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
    };

    const cleanupExpiredTokens = () => {
        const expiredItems = ['user', 'access_token', 'token', 'refresh_token'];
        expiredItems.forEach(item => {
            const stored = localStorage.getItem(item);
            if(stored){
                try{
                    const parsed = JSON.parse(stored);
                    if(parsed && (parsed.token || parsed.access_token)){
                        localStorage.removeItem(item);
                    }
                }catch{
                    localStorage.removeItem(item);
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});
        try{
            cleanupExpiredTokens();
            const payload = {
                ...(isValidEmail(userInput) ? { email: userInput } : { mobile: userInput }),
                password,
                rememberMe
            };
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, payload);
            if(response.data.success){
                localStorage.setItem('adminAccessToken', response.data.accessToken);
                localStorage.setItem('adminRefreshToken', response.data.refreshToken);
                localStorage.setItem('GrandeeAdminUser', JSON.stringify(response.data.user));
                if(response.data.settings){
                    if(response.data.settings.companyName){
                        localStorage.setItem('companyName', response.data.settings.companyName);
                    }
                    if(response.data.settings.companyLogo){
                        localStorage.setItem('companyLogo', response.data.settings.companyLogo);
                    }
                }
                if(rememberMe && response.data.user.remember_token){
                    localStorage.setItem('remember_token', response.data.user.remember_token);
                }
                toast.success('Login successful!');
                navigate('/dashboard');
            }
        }catch(err){
            console.log('Login error:', err);
            const errorMessage = err.message || err.response?.data?.message || 'Invalid credentials';
            if(err.response?.status === 401 && errorMessage.includes('expired')){
                setErrors({ server: 'Session expired. Please login again.' });
                toast.error('Session expired. Please login again.');
                ['user', 'access_token', 'token', 'refresh_token', 'remember_token'].forEach(item => {
                    localStorage.removeItem(item);
                });
            }else{
                setErrors({ server: errorMessage });
                toast.error(errorMessage);
            }
        }finally{
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
                        Let's Get You In
                    </h2>
                    <p className="text-center text-sm font-medium mb-6" style={{ color: theme.primaryGradientStart }}>
                        Behind the Wheel of Every Ride
                    </p>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <ThemeUI.FormField
                            label    = "Email or Mobile Number"
                            name     = "userInput"
                            error    = {errors.userInput}
                            required = {true}
                        >
                            <ThemeUI.Input
                                id          = "userInput"
                                name        = "userInput"
                                type        = "text"
                                value       = {userInput}
                                onChange    = {(e) => setUserInput(e.target.value)}
                                placeholder = "6381455279 or user@example.com"
                                leftElement = {<Mail className="h-5 w-5" style={{ color: theme.primaryGradientStart }} />}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label    = "Password"
                            name     = "password"
                            error    = {errors.password}
                            required = {true}
                        >
                            <ThemeUI.Input
                                id           = "password"
                                name         = "password"
                                type         = {showPassword ? 'text' : 'password'}
                                value        = {password}
                                onChange     = {(e) => setPassword(e.target.value)}
                                placeholder  = "••••••••"
                                leftElement  = {<Lock className="h-5 w-5" style={{ color: theme.primaryGradientStart }} />}
                                rightElement = {
                                    <button
                                        type      = "button"
                                        onClick   = {() => setShowPassword(!showPassword)}
                                        className = "focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                }
                            />
                        </ThemeUI.FormField>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <ThemeUI.Checkbox
                                    id       = "remember-me"
                                    name     = "remember-me"
                                    checked  = {rememberMe}
                                    onChange = {(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <a
                                    href      = "#"
                                    className = "font-medium transition-all"
                                    style     = {{ color: theme.primaryGradientStart }}
                                >
                                    Forgot password?
                                </a>
                            </div>
                        </div>
                        {errors.server && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-600">{errors.server}</p>
                            </div>
                        )}
                        <button
                            type      = "submit"
                            disabled  = {isLoading}
                            style     = {{
                                background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
                            }}
                            className = {`w-full px-6 py-2 text-white rounded-md flex items-center justify-center transition duration-200 ${
                                isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'
                            }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <Loader className="animate-spin h-4 w-4 text-white" />
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                </div>
                <p className="mt-8 text-center text-xs text-gray-900">
                    Admin Dashboard • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}