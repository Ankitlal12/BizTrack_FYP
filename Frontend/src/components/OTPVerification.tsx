import React, { useState, useEffect, useRef } from 'react';
import { Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface OTPVerificationProps {
  userId: string;
  email: string;
  name: string;
  expiresAt: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isVerifying: boolean;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  userId,
  email,
  name,
  expiresAt,
  onVerify,
  onResend,
  onBack,
  isVerifying,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Calculate time left
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format time left
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle OTP input change
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleSubmit(newOtp.join(''));
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) {
      toast.error('Please paste only numbers');
      return;
    }

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastFilledIndex = newOtp.findIndex(digit => digit === '');
    const focusIndex = lastFilledIndex === -1 ? 5 : lastFilledIndex;
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if all filled
    if (newOtp.every(digit => digit !== '')) {
      handleSubmit(newOtp.join(''));
    }
  };

  // Handle submit
  const handleSubmit = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    await onVerify(code);
  };

  // Handle resend
  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success('OTP resent successfully');
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
          <p className="text-gray-600">
            We've sent a 6-digit code to
          </p>
          <p className="text-teal-600 font-medium">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <div className="flex gap-2 justify-center mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isVerifying}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                  digit
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-300 bg-white'
                } ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center">
            {timeLeft > 0 ? (
              <p className="text-sm text-gray-600">
                Code expires in{' '}
                <span className="font-semibold text-teal-600">{formatTimeLeft()}</span>
              </p>
            ) : (
              <p className="text-sm text-red-600 font-medium">Code expired</p>
            )}
          </div>
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={otp.some(digit => digit === '') || isVerifying || timeLeft === 0}
          className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4 flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </button>

        {/* Resend */}
        <div className="text-center mb-4">
          <button
            onClick={handleResend}
            disabled={isResending || timeLeft > 540} // Disable if more than 9 minutes left
            className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isVerifying}
          className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            For security reasons, this code will expire in 10 minutes. If you didn't request this code, please ignore it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
