import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  signupData: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

const OTPVerification = ({
  email,
  onVerified,
  signupData,
}: OTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/verify-otp", {
        email,
        otp,
        username: signupData.username,
        password: signupData.password,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
      });

      onVerified();
    } catch (err: any) {
      setError(err.response?.data?.message || "Xác minh OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);
    setResendCooldown(60);

    try {
      await api.post("/auth/send-otp", { email });
      setOtp("");
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gửi lại OTP thất bại");
      setResendCooldown(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Xác minh Email</h2>
        <p className="text-sm text-muted-foreground">
          Mã OTP đã được gửi đến <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Mã OTP</label>
          <Input
            type="text"
            placeholder="Nhập mã OTP 6 chữ số"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            maxLength={6}
            disabled={loading}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full"
        >
          {loading ? "Đang xác minh..." : "Xác minh"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Chưa nhận được mã?</p>
        <Button
          variant="link"
          onClick={handleResendOTP}
          disabled={loading || resendCooldown > 0}
          className="p-0"
        >
          {resendCooldown > 0
            ? `Gửi lại trong ${resendCooldown}s`
            : "Gửi lại mã OTP"}
        </Button>
      </div>
    </div>
  );
};

export default OTPVerification;
