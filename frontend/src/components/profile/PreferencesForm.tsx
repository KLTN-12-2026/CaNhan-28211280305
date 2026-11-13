import { Sun, Moon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useThemeStore } from "@/stores/useThemeStore";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { User } from "@/types/user";

type Props = {
  userInfo: User | null;
};

const PreferencesForm = ({ userInfo }: Props) => {
  const { isDark, toggleTheme } = useThemeStore();
  const [onlineStatus, setOnlineStatus] = useState(
    userInfo?.showOnlineStatus ?? true
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userInfo) {
      setOnlineStatus(userInfo.showOnlineStatus ?? true);
    }
  }, [userInfo]);

  const handleThemeChange = async () => {
    try {
      setIsLoading(true);
      await authService.updatePreferences({
        isDarkMode: !isDark,
      });
      toggleTheme();
      toast.success("Cập nhật chế độ tối thành công");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlineStatusChange = async (value: boolean) => {
    try {
      setOnlineStatus(value);
      await authService.updatePreferences({
        showOnlineStatus: value,
      });
      toast.success("Cập nhật trạng thái thành công");
    } catch (error: any) {
      setOnlineStatus(!value);
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    }
  };

  return (
    <Card className="glass-strong border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          Tuỳ chỉnh ứng dụng
        </CardTitle>
        <CardDescription>
          Cá nhân hoá trải nghiệm trò chuyện của bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="theme-toggle" className="text-base font-medium">
              Chế độ tối
            </Label>
            <p className="text-sm text-muted-foreground">
              Chuyển đổi giữa giao diện sáng và tối
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Switch
              id="theme-toggle"
              checked={isDark}
              onCheckedChange={handleThemeChange}
              disabled={isLoading}
              className="data-[state=checked]:bg-primary-glow"
            />
            <Moon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="online-status" className="text-base font-medium">
              Hiển thị trạng thái online
            </Label>
            <p className="text-sm text-muted-foreground">
              Cho phép người khác thấy khi bạn đang online
            </p>
          </div>
          <Switch
            id="online-status"
            checked={onlineStatus}
            onCheckedChange={handleOnlineStatusChange}
            className="data-[state=checked]:bg-primary-glow"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PreferencesForm;
