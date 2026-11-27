import Message from "../models/Message.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Session from "../models/Session.js";
import Report from "../models/Report.js";
import AdminLog from "../models/AdminLog.js";
import { onlineUser, io } from "../socket/index.js";
import { sendAccountLockedEmail } from "../libs/emailService.js";

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersMonth,
      blockedUsers,
      totalMessages,
      totalReports,
      pendingReports,
      activeUserIds,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: start } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ isBanned: true }),
      Message.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: "PENDING" }),
      Message.distinct("senderId", { createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const activeUsers7d = activeUserIds.length;
    const inactiveUsers = totalUsers - blockedUsers - activeUsers7d;

    const registrationStats = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const registrationTrend = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split("T")[0];
      const stat = registrationStats.find((s) => s._id === dateString);
      registrationTrend.push({
        date: dateString,
        count: stat ? stat.count : 0,
      });
    }

    const topActiveUsers = await Message.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$senderId", messageCount: { $sum: 1 } } },
      { $sort: { messageCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          displayName: "$user.displayName",
          email: "$user.email",
          avatarUrl: "$user.avatarUrl",
          messageCount: 1,
        },
      },
    ]);

    const reportDistribution = await Report.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      overview: {
        totalUsers,
        newUsersToday,
        newUsersMonth,
        activeUsers7d,
        blockedUsers,
        totalMessages,
        totalReports,
        pendingReports,
      },
      userAnalytics: {
        registrationTrend,
        userStatusDistribution: [
          { name: "Active (7d)", value: activeUsers7d },
          { name: "Inactive", value: inactiveUsers > 0 ? inactiveUsers : 0 },
          { name: "Blocked", value: blockedUsers },
        ],
        topActiveUsers,
      },
      reportAnalytics: {
        distribution: reportDistribution.map((r) => ({
          name: r._id,
          value: r.count,
        })),
        latestReports: await Report.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("reporterId", "displayName")
          .populate("targetType")
          .lean(),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { keyword } = req.query;

    let query = {};

    if (keyword) {
      query = {
        $or: [
          { username: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
          { displayName: { $regex: keyword, $options: "i" } },
        ],
      };
    }

    const users = await User.find(query).select("-hashedPassword");

    const usersWithStatus = users.map((user) => {
      const isOnline = onlineUser.has(user._id.toString());
      return {
        ...user.toObject(),
        isOnline,
      };
    });

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error in getAllUsers: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    const adminId = req.user._id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot ban yourself" });
    }
    if (user.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "Cannot change a Super Admin account" });
    }
    if (req.user.role === "admin" && user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins can only manage regular users" });
    }
    if (typeof isBanned !== "boolean") {
      return res.status(400).json({ message: "Invalid account status" });
    }

    user.isBanned = isBanned;
    await user.save();

    await AdminLog.create({
      adminId,
      action: isBanned ? "BAN_USER" : "UNBAN_USER",
      targetId: user._id,
    });

    if (isBanned) {
      await Session.deleteMany({ userId: user._id });

      const socketIds = onlineUser.get(user._id.toString());
      if (socketIds) {
        socketIds.forEach((socketId) => {
          const socket = io.sockets.sockets.get(socketId);
          socket?.disconnect(true);
        });
        onlineUser.delete(user._id.toString());
        io.emit("online-users", Array.from(onlineUser.keys()));
      }
    }

    sendAccountLockedEmail(user.email, isBanned);

    await user.save();

    res
      .status(200)
      .json({
        message: `User ${isBanned ? "banned" : "unbanned"} successfully`,
        user,
      });
  } catch (error) {
    console.error("Error in toggleBanUser: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user._id;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    if (user.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "Cannot change a Super Admin role" });
    }

    user.role = role;
    await user.save();

    await AdminLog.create({
      adminId,
      action: `UPDATE_ROLE_TO_${role.toUpperCase()}`,
      targetId: user._id,
    });

    res.status(200).json({ message: `User role updated to ${role}`, user });
  } catch (error) {
    console.error("Error in updateUserRole: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }
    if (user.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "Cannot delete a Super Admin account" });
    }
    if (req.user.role === "admin" && user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins can only manage regular users" });
    }

    await User.findByIdAndDelete(id);

    await AdminLog.create({
      adminId,
      action: "DELETE_USER",
      targetId: id,
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const reports = await Report.find(query)
      .populate("reporterId", "displayName email avatarUrl")
      .populate("reviewedBy", "displayName")
      .populate("resolvedBy", "displayName")
      .sort({ createdAt: -1 });

    const reportsWithTargets = await Promise.all(
      reports.map(async (report) => {
        let targetDetails = null;
        let chatContext = [];
        if (report.targetType === "user") {
          targetDetails = await User.findById(report.targetId)
            .select("displayName username avatarUrl role isBanned")
            .lean();
        } else if (report.targetType === "message") {
          targetDetails = await Message.findById(report.targetId)
            .select("content imgUrl senderId conversationId createdAt")
            .populate("senderId", "displayName username avatarUrl")
            .populate("conversationId", "type group.name")
            .lean();
        } else if (report.targetType === "group") {
          targetDetails = await Conversation.findOne({
            _id: report.targetId,
            type: "group",
          })
            .select("group participants createdAt")
            .populate("participants.userId", "displayName username avatarUrl")
            .lean();
        }

        const reporterId =
          report.reporterId?._id?.toString() ||
          report.reporterId?.toString();
        let conversations = [];

        if (report.targetType === "message" && targetDetails?.conversationId?._id) {
          conversations = await Conversation.find({
            _id: targetDetails.conversationId._id,
          })
            .select("type group participants")
            .populate("participants.userId", "displayName username avatarUrl")
            .lean();
        } else if (report.targetType === "user" && reporterId) {
          conversations = await Conversation.find({
            type: "direct",
            "participants.userId": {
              $all: [reporterId, report.targetId],
            },
          })
            .select("type group participants")
            .populate("participants.userId", "displayName username avatarUrl")
            .limit(3)
            .lean();
        } else if (report.targetType === "group") {
          conversations = await Conversation.find({
            _id: report.targetId,
            type: "group",
          })
            .select("type group participants")
            .populate("participants.userId", "displayName username avatarUrl")
            .lean();
        }

        chatContext = await Promise.all(
          conversations.map(async (conversation) => {
            let messages;
            if (report.targetType === "message" && targetDetails?.createdAt) {
              const [before, after] = await Promise.all([
                Message.find({
                  conversationId: conversation._id,
                  createdAt: { $lte: targetDetails.createdAt },
                })
                  .sort({ createdAt: -1 })
                  .limit(25)
                  .populate("senderId", "displayName username avatarUrl")
                  .lean(),
                Message.find({
                  conversationId: conversation._id,
                  createdAt: { $gt: targetDetails.createdAt },
                })
                  .sort({ createdAt: 1 })
                  .limit(25)
                  .populate("senderId", "displayName username avatarUrl")
                  .lean(),
              ]);
              messages = [...before.reverse(), ...after];
            } else {
              messages = await Message.find({
                conversationId: conversation._id,
              })
                .sort({ createdAt: -1 })
                .limit(60)
                .populate("senderId", "displayName username avatarUrl")
                .lean();
              messages = messages.reverse();
            }

            return {
              conversationId: conversation._id,
              type: conversation.type,
              name: conversation.group?.name || null,
              participants: conversation.participants || [],
              messages,
            };
          }),
        );

        return {
          ...report.toObject(),
          targetDetails,
          chatContext,
        };
      }),
    );

    res.status(200).json(reportsWithTargets);
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const adminId = req.user._id;

    if (!["REVIEWED", "RESOLVED"].includes(status)) {
      return res.status(400).json({ message: "Invalid report status" });
    }

    if (
      typeof actionTaken !== "string" ||
      actionTaken.trim().length > 500 ||
      (status === "RESOLVED" && !actionTaken.trim())
    ) {
      return res.status(400).json({
        message:
          "A resolution note of up to 500 characters is required to resolve a report",
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (
      report.status === "RESOLVED" ||
      (report.status === "REVIEWED" && status === "REVIEWED")
    ) {
      return res.status(400).json({
        message: "Report cannot transition from its current status",
      });
    }

    report.status = status;
    report.resolutionNote = actionTaken.trim();
    if (status === "REVIEWED") {
      report.reviewedBy = adminId;
      report.reviewedAt = new Date();
    } else {
      report.resolvedBy = adminId;
      report.resolvedAt = new Date();
    }
    await report.save();

    await AdminLog.create({
      adminId,
      action: `REPORT_STATUS_${report.status}`,
      targetId: report.targetId,
      reportId: report._id,
    });

    await report.populate([
      { path: "reporterId", select: "displayName email avatarUrl" },
      { path: "reviewedBy", select: "displayName" },
      { path: "resolvedBy", select: "displayName" },
    ]);

    res.status(200).json({ message: "Report status updated", report });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAdminLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate("adminId", "displayName email")
      .populate(
        "reportId",
        "reporterId targetType targetId reason description status resolutionNote reviewedBy resolvedBy createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(100);

    const logsWithDetails = await Promise.all(
      logs.map(async (log) => {
        const logDetails = log.toObject();
        if (log.action.startsWith("REPORT_STATUS_")) {
          const report = logDetails.reportId;
          if (report) {
            report.reporterId = await User.findById(report.reporterId)
              .select("displayName email")
              .lean();
            if (report.targetType === "user") {
              report.targetDetails = await User.findById(report.targetId)
                .select("displayName username role isBanned")
                .lean();
            } else if (report.targetType === "message") {
              report.targetDetails = await Message.findById(report.targetId)
                .select("content senderId")
                .populate("senderId", "displayName username")
                .lean();
            } else if (report.targetType === "group") {
              report.targetDetails = await Conversation.findOne({
                _id: report.targetId,
                type: "group",
              })
                .select("group.name")
                .lean();
            }
          }
        } else {
          logDetails.targetDetails = await User.findById(log.targetId)
            .select("displayName username email role isBanned")
            .lean();
        }
        return logDetails;
      }),
    );

    res.status(200).json(logsWithDetails);
  } catch (error) {
    console.error("Error getting logs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
