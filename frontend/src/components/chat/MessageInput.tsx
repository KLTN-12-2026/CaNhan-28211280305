import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation, Message } from "@/types/chat";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, Sparkles, X, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import SmartReplySuggestions from "./SmartReplySuggestions";
import { chatService } from "@/services/chatService";
import { isAxiosError } from "axios";
import { useSocketStore } from "@/stores/useSocketStore";

const MessageInput = ({
  selectedConvo,
  replyTo,
  onClearReply,
}: {
  selectedConvo: Conversation;
  replyTo: Message | null;
  onClearReply: () => void;
}) => {
  const { user } = useAuthStore();
  const {
    sendDirectMessage,
    sendGroupMessage,
    generateSmartReplies,
    isGeneratingReplies,
  } = useChatStore();
  const [value, setValue] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingSentAtRef = useRef(0);
  const { socket } = useSocketStore();

  const stopTyping = () => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      socket?.emit("typing:stop", { conversationId: selectedConvo._id });
      isTypingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        socket?.emit("typing:stop", { conversationId: selectedConvo._id });
        isTypingRef.current = false;
      }
    };
  }, [selectedConvo._id, socket]);

  if (!user) return null;

  if (selectedConvo.type === "direct" && selectedConvo.isBlocked) {
    return (
      <div className="border-t border-border/40 bg-background p-4 text-center font-medium text-red-600">
        Bạn không thể gửi tin nhắn
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!value.trim() && !imagePreview) return;
    const currValue = value;
    const currImage = imagePreview;
    stopTyping();
    setValue("");
    setImagePreview(null);

    try {
      if (selectedConvo.type === "direct") {
        const otherUser = selectedConvo.participants.find(
          (p) => p._id !== user._id,
        );
        if (otherUser) {
          await sendDirectMessage(
            otherUser._id,
            currValue,
            currImage || undefined,
            replyTo?._id,
          );
        }
      } else {
        await sendGroupMessage(
          selectedConvo._id,
          currValue,
          currImage || undefined,
          replyTo?._id,
        );
      }
      onClearReply();
    } catch (error) {
      if (
        selectedConvo.type === "direct" &&
        isAxiosError(error) &&
        error.response?.data?.code === "USER_BLOCKED"
      ) {
        useChatStore.getState().updateConversation({
          ...selectedConvo,
          isBlocked: true,
        });
        return;
      }
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Hãy thử lại!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (nextValue: string) => {
    setValue(nextValue);
    if (!socket) return;

    if (nextValue.trim()) {
      const now = Date.now();
      if (!isTypingRef.current || now - lastTypingSentAtRef.current >= 1500) {
        socket.emit("typing:start", { conversationId: selectedConvo._id });
        isTypingRef.current = true;
        lastTypingSentAtRef.current = now;
      }
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(stopTyping, 2500);
    } else {
      stopTyping();
    }
  };

  const handleSmartReply = () => {
    generateSmartReplies(selectedConvo._id);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await chatService.uploadImage(file);
      setImagePreview(imageUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleTriggerImageInput = () => {
    fileInputRef.current?.click();
  };

  const replySenderName = replyTo?.isOwn
    ? "chính mình"
    : selectedConvo.participants.find(
        (participant) => participant._id === replyTo?.senderId,
      )?.displayName ?? "tin nhắn";

  return (
    <div className="flex flex-col bg-background">
      <SmartReplySuggestions onSelect={setValue} />

      {replyTo && (
        <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/40 px-4 py-2">
          <div className="min-w-0 border-l-2 border-primary pl-2">
            <p className="text-xs font-medium">
              Đang trả lời {replySenderName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {replyTo.callDetails
                ? replyTo.callDetails.kind === "video"
                  ? "Cuộc gọi video"
                  : "Cuộc gọi thoại"
                : replyTo.content || (replyTo.imgUrl ? "Hình ảnh" : "Tin nhắn")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Hủy trả lời"
            title="Hủy trả lời"
            onClick={onClearReply}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Image Preview Area */}
      {imagePreview && (
        <div className="px-3 pt-2 pb-0 flex items-center">
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg border border-border/50 object-cover"
            />
            <Button
              className="absolute -top-2 -right-2 size-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleRemoveImage}
              size="icon"
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 min-h-[56px] bg-background border-t border-border/40">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageSelect}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleTriggerImageInput}
          disabled={isUploading}
          className="hover:bg-primary/10 transition-smooth"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSmartReply}
          disabled={isGeneratingReplies}
          className="hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-smooth text-purple-500"
          title="Generate Smart Replies"
        >
          <Sparkles
            className={`size-4 ${isGeneratingReplies ? "animate-pulse" : ""}`}
          />
        </Button>
        <div className="flex-1 relative">
          <Input
            onKeyDown={handleKeyPress}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Soạn tin nhắn"
            className="pr-10 h-9 bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none"
          ></Input>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => setValue(`${value}${emoji}`)}
                />
              </div>
            </Button>
          </div>
        </div>
        <Button
          onClick={handleSendMessage}
          className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105"
          disabled={(!value.trim() && !imagePreview) || isUploading}
        >
          <Send className="size-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
