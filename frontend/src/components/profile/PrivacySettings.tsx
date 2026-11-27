import { MonitorSmartphone, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";

const PrivacySettings = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const clearState = useAuthStore((state) => state.clearState);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<
    Array<{
      _id: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      lastSeenAt: string;
      createdAt: string;
      expiresAt: string;
      isCurrent: boolean;
    }>
  >([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  const [twoFactorAction, setTwoFactorAction] = useState<
    "enable" | "disable"
  >("enable");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await authService.getLoginSessions();
      setSessions(data);
    } catch (error) {
      console.error("Lỗi khi tải phiên đăng nhập:", error);
      toast.error("Không thể tải danh sách phiên đăng nhập");
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const getDeviceName = (userAgent?: string | null) => {
    if (!userAgent) return "Thiết bị không xác định";
    if (/Windows/i.test(userAgent)) return "Máy tính Windows";
    if (/Android/i.test(userAgent)) return "Thiết bị Android";
    if (/iPhone|iPad|iPod/i.test(userAgent)) return "Thiết bị iOS";
    if (/Macintosh/i.test(userAgent)) return "Máy tính macOS";
    if (/Linux/i.test(userAgent)) return "Máy tính Linux";
    return "Thiết bị web";
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      await authService.revokeLoginSession(sessionId);
      setSessions((current) =>
        current.filter((session) => session._id !== sessionId),
      );
      toast.success("Đã đăng xuất thiết bị");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể đăng xuất thiết bị",
      );
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setSessionsLoading(true);
      await authService.revokeOtherLoginSessions();
      setSessions((current) => current.filter((session) => session.isCurrent));
      toast.success("Đã đăng xuất các thiết bị khác");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Không thể đăng xuất các thiết bị khác",
      );
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (deleteConfirmation !== "XOA TAI KHOAN") {
      toast.error("Vui lòng nhập chính xác cụm xác nhận");
      return;
    }
    try {
      setDeleteLoading(true);
      await authService.deleteAccount(deletePassword, deleteConfirmation);
      clearState();
      toast.success("Tài khoản đã được xóa");
      setShowDeleteAccount(false);
      navigate("/");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể xóa tài khoản");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    const action = enabled ? "enable" : "disable";
    try {
      setTwoFactorLoading(true);
      await authService.requestTwoFactorChange(action);
      setTwoFactorAction(action);
      setTwoFactorOtp("");
      setTwoFactorPassword("");
      setShowTwoFactorDialog(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Không thể gửi mã xác thực hai bước",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyTwoFactorChange = async () => {
    if (twoFactorOtp.length !== 6) return;
    if (twoFactorAction === "disable" && !twoFactorPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    try {
      setTwoFactorLoading(true);
      const result = await authService.verifyTwoFactorChange(
        twoFactorAction,
        twoFactorOtp,
        twoFactorAction === "disable" ? twoFactorPassword : undefined,
      );
      if (user) {
        setUser({ ...user, twoFactorEnabled: result.twoFactorEnabled });
      }
      setShowTwoFactorDialog(false);
      toast.success(
        result.twoFactorEnabled
          ? "Đã bật xác thực hai bước"
          : "Đã tắt xác thực hai bước",
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Không thể cập nhật xác thực hai bước",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setIsLoading(true);
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );
      toast.success("Đổi mật khẩu thành công");
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="glass-strong border-border/30">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Quyền riêng tư & Bảo mật
          </CardTitle>
          <CardDescription className="text-xs">
            Quản lý cài đặt quyền riêng tư và bảo mật của bạn
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-2">
            <Button
              onClick={() => setShowChangePassword(true)}
              variant="outline"
              className="h-9 w-full justify-start glass-light border-border/30 hover:text-warning"
            >
              <Shield className="h-4 w-4 mr-2" />
              Đổi mật khẩu
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Xác thực hai bước</p>
              <p className="text-xs text-muted-foreground">
                Yêu cầu mã OTP từ email khi đăng nhập
              </p>
            </div>
            <Switch
              checked={Boolean(user?.twoFactorEnabled)}
              disabled={twoFactorLoading}
              onCheckedChange={(enabled) =>
                void handleToggleTwoFactor(enabled)
              }
            />
          </div>

          <div className="space-y-2 border-t border-border/30 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <MonitorSmartphone className="size-4 text-primary" />
                  Phiên đăng nhập
                </h4>
                <p className="text-xs text-muted-foreground">
                  Quản lý thiết bị đang truy cập tài khoản
                </p>
              </div>
              {sessions.some((session) => !session.isCurrent) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sessionsLoading}
                  onClick={() => void handleRevokeOthers()}
                  className="shrink-0"
                >
                  Đăng xuất thiết bị khác
                </Button>
              )}
            </div>

            <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
              {sessionsLoading && sessions.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Đang tải phiên đăng nhập...
                </p>
              ) : sessions.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Không có phiên đăng nhập nào.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
                  >
                    <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-medium">
                          {getDeviceName(session.userAgent)}
                        </p>
                        {session.isCurrent && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {session.ipAddress || "IP không xác định"} ·{" "}
                        Hoạt động{" "}
                        {new Date(session.lastSeenAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={revokingSessionId === session._id}
                        onClick={() => void handleRevokeSession(session._id)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        Đăng xuất
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-border/30 pt-3">
            <h4 className="mb-2 text-sm font-medium text-destructive">
              Khu vực nguy hiểm
            </h4>
            <Button
              variant="destructive"
              className="h-9 w-full"
              onClick={() => setShowDeleteAccount(true)}
            >
              Xoá tài khoản
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showDeleteAccount}
        onOpenChange={(open) => {
          if (!deleteLoading) {
            setShowDeleteAccount(open);
            if (!open) {
              setDeletePassword("");
              setDeleteConfirmation("");
            }
          }
        }}
      >
        <DialogContent className="glass-strong border-border/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa tài khoản</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Tài khoản, tin nhắn, hội thoại,
              bạn bè, lời mời và phiên đăng nhập liên quan sẽ bị xóa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Mật khẩu hiện tại</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={deleteLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Nhập <span className="font-semibold">XOA TAI KHOAN</span> để xác nhận
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={deleteLoading}
                placeholder="XOA TAI KHOAN"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteAccount(false)}
                disabled={deleteLoading}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={
                  deleteLoading ||
                  !deletePassword ||
                  deleteConfirmation !== "XOA TAI KHOAN"
                }
              >
                {deleteLoading ? "Đang xóa..." : "Xóa tài khoản"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="glass-strong border-border/30">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mật khẩu mới của bạn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className="glass-light border-border/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="glass-light border-border/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="glass-light border-border/30"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="bg-gradient-primary hover:opacity-90"
              >
                {isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTwoFactorDialog}
        onOpenChange={(open) => {
          if (!twoFactorLoading) setShowTwoFactorDialog(open);
        }}
      >
        <DialogContent className="glass-strong border-border/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {twoFactorAction === "enable"
                ? "Bật xác thực hai bước"
                : "Tắt xác thực hai bước"}
            </DialogTitle>
            <DialogDescription>
              Nhập mã OTP 6 chữ số đã được gửi đến email của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {twoFactorAction === "disable" && (
              <div className="space-y-2">
                <Label htmlFor="two-factor-password">Mật khẩu hiện tại</Label>
                <Input
                  id="two-factor-password"
                  type="password"
                  value={twoFactorPassword}
                  onChange={(event) =>
                    setTwoFactorPassword(event.target.value)
                  }
                  disabled={twoFactorLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="two-factor-otp">Mã OTP</Label>
              <Input
                id="two-factor-otp"
                value={twoFactorOtp}
                onChange={(event) =>
                  setTwoFactorOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                disabled={twoFactorLoading}
                className="text-center text-2xl tracking-[0.35em]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTwoFactorDialog(false)}
                disabled={twoFactorLoading}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => void handleVerifyTwoFactorChange()}
                disabled={
                  twoFactorLoading ||
                  twoFactorOtp.length !== 6 ||
                  (twoFactorAction === "disable" && !twoFactorPassword)
                }
              >
                {twoFactorLoading ? "Đang xác minh..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrivacySettings;
