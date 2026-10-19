import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import Message from "../models/Message.js";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const formatMessageContent = (msg) => {
  const sender = msg.senderId?.displayName || "Người dùng";
  const content = msg.content?.trim();
  if (content) {
    return `${sender}: ${content}`;
  }
  if (msg.imgUrl) {
    return `${sender}: [Ảnh]`;
  }
  return `${sender}: [Tin nhắn]`;
};

const parseSuggestions = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    const data = JSON.parse(trimmed);
    return Array.isArray(data) ? data : null;
  } catch {
    const jsonMatch = trimmed.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return Array.isArray(data) ? data : null;
      } catch {}
    }
    return null;
  }
};

export const generateSmartReplies = async (req, res) => {
  try {
    const { conversationId } = req.body;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("senderId", "displayName");

    if (!messages || messages.length === 0) {
      return res.status(200).json({
        suggestions: ["Xin chào!", "Bạn khỏe không?", "Có chuyện gì thế?"],
      });
    }

    const history = messages.reverse().map(formatMessageContent).join("\n");

    const prompt = `Bạn là một trợ lý gợi ý trả lời thông minh cho ứng dụng chat.
Dựa vào các tin nhắn dưới đây, hãy đề xuất 3 câu trả lời tự nhiên bằng tiếng Việt.
Mỗi câu từ 4 đến 10 từ và phù hợp với nội dung của cuộc hội thoại.
Chỉ trả về duy nhất một mảng JSON gồm 3 chuỗi, không kèm giải thích hay ký tự khác.

Conversation:
${history}
`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      temperature: 0.2,
      maxOutputTokens: 200,
    });

    const suggestions = parseSuggestions(result.text);
    if (suggestions && suggestions.length > 0) {
      return res.status(200).json({ suggestions });
    }

    console.error("AI trả về JSON không hợp lệ:", result.text);
    return res.status(200).json({
      suggestions: ["OK", "Để mình xem", "Nghe hợp lý đó"],
    });
  } catch (error) {
    console.error("Lỗi khi tạo phản hồi thông minh:", error);
    return res.status(500).json({
      message: "Không thể tạo phản hồi",
    });
  }
};
