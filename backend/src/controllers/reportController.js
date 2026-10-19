import Report from "../models/Report.js";

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const reporterId = req.user._id;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: "Thiếu thông tin báo cáo" });
    }

    const validReasons = [
      "spam",
      "abusive language",
      "scam",
      "fraud",
      "inappropriate content",
      "other",
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: "Lý do báo cáo không hợp lệ" });
    }

    // Check duplicate report within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingReport = await Report.findOne({
      reporterId,
      targetId,
      createdAt: { $gte: oneDayAgo },
    });

    if (existingReport) {
      return res.status(429).json({
        message: "Bạn đã báo cáo nội dung này trong vòng 24 giờ qua.",
      });
    }

    const newReport = new Report({
      reporterId,
      targetType,
      targetId,
      reason,
      description,
    });

    await newReport.save();

    return res.status(201).json({
      message: "Báo cáo của bạn đã được gửi và sẽ được xem xét.",
      report: newReport,
    });
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
