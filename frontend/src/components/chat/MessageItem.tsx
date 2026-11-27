import { cn, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
  onReply: (message: Message) => void;
}

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
  onReply,
}: MessageItemProps) => {
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;
  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000;

  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString()
  );
  const callDetails = message.callDetails;
  const callStatus =
    callDetails?.status === "completed"
      ? callDetails.kind === "video"
        ? "Cuộc gọi video"
        : "Cuộc gọi thoại"
      : callDetails?.status === "missed"
        ? "Cuộc gọi nhỡ"
        : callDetails?.status === "rejected"
          ? "Cuộc gọi bị từ chối"
          : "Cuộc gọi đã hủy";
  const callDuration = callDetails
    ? `${Math.floor(callDetails.durationSeconds / 60)}:${String(
        callDetails.durationSeconds % 60,
      ).padStart(2, "0")}`
    : "";
  return (
    <>
      {/* time */}
      {isShowTime && (
        <div className="flex justify-center w-full text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </div>
      )}
      <div
        id={`message-${message._id}`}
        className={cn(
          "flex gap-2 message-bounce mt-1",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
            )}
          </div>
        )}
        {/* Tin nhắn */}
        <div
          className={cn(
            "group relative max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          <Card
            className={cn(
              "p-3 space-y-2",
              message.isOwn
                ? "chat-bubble-received border-0"
                : "bg-chat-bubble-received"
            )}
            onDoubleClick={() => onReply(message)}
          >
            {message.replyTo && (
              <button
                type="button"
                className="w-full border-l-2 border-primary/60 bg-background/30 px-2 py-1 text-left"
                title="Đi tới tin nhắn được trả lời"
                onClick={() =>
                  document
                    .getElementById(`message-${message.replyTo?._id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                <span className="block truncate text-xs font-medium">
                  {message.replyTo.senderId?.displayName ?? "Người dùng"}
                </span>
                <span className="block truncate text-xs opacity-75">
                  {message.replyTo.callDetails
                    ? message.replyTo.callDetails.kind === "video"
                      ? "Cuộc gọi video"
                      : "Cuộc gọi thoại"
                    : message.replyTo.content ||
                      (message.replyTo.imgUrl ? "Hình ảnh" : "Tin nhắn")}
                </span>
              </button>
            )}
            {callDetails ? (
              <div className="flex min-w-48 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70">
                  {callDetails.status === "missed" ||
                  callDetails.status === "rejected" ? (
                    <PhoneMissed className="size-5 text-destructive" />
                  ) : callDetails.status === "cancelled" ? (
                    message.isOwn ? (
                      <PhoneOutgoing className="size-5 text-muted-foreground" />
                    ) : (
                      <PhoneIncoming className="size-5 text-muted-foreground" />
                    )
                  ) : callDetails.kind === "video" ? (
                    <Video className="size-5 text-primary" />
                  ) : message.isOwn ? (
                    <PhoneOutgoing className="size-5 text-primary" />
                  ) : (
                    <PhoneIncoming className="size-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{callStatus}</p>
                  {callDetails.status === "completed" && (
                    <p className="text-xs opacity-75">Thời lượng {callDuration}</p>
                  )}
                </div>
                {callDetails.status === "completed" && (
                  callDetails.kind === "video" ? (
                    <Video className="ml-auto size-4 opacity-70" />
                  ) : (
                    <Phone className="ml-auto size-4 opacity-70" />
                  )
                )}
              </div>
            ) : message.imgUrl ? (
              <img
                src={message.imgUrl}
                alt="Uploaded"
                className="rounded-lg max-w-full h-auto object-cover max-h-60 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => message.imgUrl && window.open(message.imgUrl, "_blank")}
              />
            ) : null}
            {!callDetails && message.content && (
              <p className="text-sm leading-relaxed break-words">
                {message.content}
              </p>
            )}
          </Card>

          {/* seen/delivered */}
          {!callDetails &&
            message.isOwn &&
            message._id === selectedConvo.lastMessage?._id && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-1.5 py-0.5 h-4 border-0",
                  lastMessageStatus === "seen"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {lastMessageStatus}
              </Badge>
            )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;
