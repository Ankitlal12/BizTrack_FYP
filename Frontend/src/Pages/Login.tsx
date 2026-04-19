// ==================== IMPORTS ====================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CiLock, CiUser } from "react-icons/ci";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import OTPVerification from '../components/OTPVerification';
import { usersAPI, tokenManager } from '../services/api';
import { toast } from 'sonner';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // OTP state
  const [showOTP, setShowOTP] = useState(false);
  const [otpData, setOtpData] = useState<{
    userId: string;
    email: string;
    name: string;
    expiresAt: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { login, setUser, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const validateLoginFields = () => {
    const nextErrors: { username?: string; password?: string } = {};
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      nextErrors.username = 'Email or username is required';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setFieldErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, trimmedUsername };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { isValid, trimmedUsername } = validateLoginFields();
    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(trimmedUsername, password);
      if (!success) {
        setError('Invalid email/username or password');
      }
      // Navigation is handled inside AuthContext.login() based on role
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginWithOTP = async (credential: string) => {
    setIsGoogleLoading(true);
    setError('');
    
    try {
      const response = await usersAPI.googleLoginWithOTP(credential);
      
      if (response.requiresOTP) {
        // Show OTP screen
        setOtpData({
          userId: response.userId,
          email: response.email,
          name: response.name,
          expiresAt: response.expiresAt,
        });
        setShowOTP(true);
        toast.success('OTP sent to your email');
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(err.message || 'Google authentication failed. Please try again.');
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!otpData) return;
    
    setIsVerifying(true);
    
    try {
      const response = await usersAPI.verifyOTP(otpData.userId, otp);
      
      // Save token and user data
      tokenManager.setToken(response.token);
      
      // Convert user data to proper format
      const userObj = {
        id: response.user._id || response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        avatar: response.user.avatar,
      };
      
      setUser(userObj);
      setIsAuthenticated(true);
      localStorage.setItem('biztrack_user', JSON.stringify(userObj));
      
      toast.success('Login successful!');
      // Navigate based on role using fresh userObj — not React state
      if (userObj.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userObj.role === 'owner') {
        navigate('/', { replace: true });
      } else if (userObj.role === 'manager') {
        navigate('/inventory', { replace: true });
      } else {
        navigate('/billing', { replace: true });
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      toast.error(err.message || 'Invalid OTP. Please try again.');
      throw err; // Re-throw to prevent OTP component from clearing
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!otpData) return;
    
    try {
      const response = await usersAPI.resendOTP(otpData.userId);
      setOtpData({
        ...otpData,
        expiresAt: response.expiresAt,
      });
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      toast.error(err.message || 'Failed to resend OTP');
      throw err;
    }
  };

  const handleBackToLoginFromOTP = () => {
    setShowOTP(false);
    setOtpData(null);
    setError('');
  };

  // Show OTP verification screen
  if (showOTP && otpData) {
    return (
      <OTPVerification
        userId={otpData.userId}
        email={otpData.email}
        name={otpData.name}
        expiresAt={otpData.expiresAt}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        onBack={handleBackToLoginFromOTP}
        isVerifying={isVerifying}
      />
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-teal-50 overflow-hidden px-4 py-8">

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-teal-200 opacity-30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>

      {/* Login Card */}
      <div className="login-card-animated-border relative z-10 bg-white/85 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-10 w-full max-w-md mx-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">BizTrack</h1>
          <p className="text-gray-500 text-sm mt-1">
            Inventory & Business Management
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Email/Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Email or Username
            </label>
            <div className="relative">
              <CiUser className="absolute left-3 top-3.5 text-gray-400 text-lg" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }
                }}
                placeholder="Enter your email or username"
                className={`pl-10 w-full border ${fieldErrors.username ? 'border-red-400' : 'border-gray-200'} rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400`}
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <CiLock className="absolute left-3 top-3.5 text-gray-400 text-lg" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                className={`pl-10 pr-10 w-full border ${fieldErrors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember + Help */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="ml-2">Remember me</span>
            </label>

            <span className="text-gray-500 text-xs">
              Forgot password? Contact admin
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 
              hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl 
              shadow-md transition-all disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google Login */}
        <div className="flex justify-center">
          {isGoogleLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Authenticating...</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={async (response) => {
                if (response.credential) {
                  await handleGoogleLoginWithOTP(response.credential);
                }
              }}
              onError={() => {
                setError('Google login was cancelled or failed.');
              }}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} BizTrack. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
