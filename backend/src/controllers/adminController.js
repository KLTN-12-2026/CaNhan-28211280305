import Message from "../models/Message.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Report from "../models/Report.js";
import AdminLog from "../models/AdminLog.js";
import { onlineUser, io } from "../socket/index.js";
import { sendAccountLockedEmail } from "../libs/emailService.js";

// ... existing imports ...

// @desc    Get dashboard statistics for admin
// @route   GET /api/admin/stats
// @access  Admin
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Overview Statistics
    const [
      totalUsers,
      newUsersToday,
      newUsersMonth,
      blockedUsers,
      totalMessages,
      totalReports,
      pendingReports,
      activeUserIds // Distinct senderIds from messages in last 7 days
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

    // 2. User Analytics - Registrations
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

    // Fill missing dates with 0
    const registrationTrend = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const stat = registrationStats.find(s => s._id === dateString);
        registrationTrend.push({
            date: dateString,
            count: stat ? stat.count : 0
        });
    }

    // 3. User Analytics - Top 5 Active Users
    const topActiveUsers = await Message.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } }, // Messages in last 30 days
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

    // 4. Report Analytics - Distribution by Reason
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
          .populate("targetType") // Note: targetId is dynamic, populate might fail or return null if ref is not dynamic. Report schema targetId is generic ObjectId.
          // For latest reports table, we might just show ID or basic info. Or fetch target specifically if needed.
          // Given targetType can be 'user', 'message', 'group', simply populating 'targetId' won't work easily without dynamic ref.
          // For now, return basic info.
          .lean(),
      },
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Get all users with search and online status
// @route   GET /api/admin/users
// @access  Admin
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
      // Use user.id which is a string from Mongoose document virtual or user._id.toString()
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

// @desc    Update user ban status
// @route   PATCH /api/admin/users/:id/ban
// @access  Admin
export const toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    const adminId = req.user._id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // prevent banning self
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot ban yourself" });
    }

    user.isBanned = isBanned;
    await user.save();

    // Log admin action
    await AdminLog.create({
      adminId,
      action: isBanned ? "BAN_USER" : "UNBAN_USER",
      targetId: user._id,
    });

    // If banned, invalidate sessions and disconnect socket
    if (isBanned) {
      await Session.deleteMany({ userId: user._id });
      
      const socketId = onlineUser.get(user._id.toString());
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        onlineUser.delete(user._id.toString());
        // Emit updated online list
        io.emit("online-users", Array.from(onlineUser.keys()));
      }
    }

    // Send email notification
    // Don't wait for email to send response
    sendAccountLockedEmail(user.email, isBanned);
    
    await user.save();

    res.status(200).json({ message: `User ${isBanned ? "banned" : "unbanned"} successfully`, user });
  } catch (error) {
    console.error("Error in toggleBanUser: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'user' or 'admin'
    const adminId = req.user._id;

    if (!['user', 'admin'].includes(role)) {
       return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot change your own role" });
    }

    user.role = role;
    await user.save();

    // Log admin action
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

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot delete yourself" });
    }

    await User.findByIdAndDelete(id);

    // Log admin action
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

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Admin
export const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    // Populate reporter info
     const reports = await Report.find(query)
      .populate("reporterId", "displayName email avatarUrl")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Resolve a report
// @route   PATCH /api/admin/reports/:id/resolve
// @access  Admin
export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body; // e.g., status='RESOLVED' or 'REVIEWED'
    const adminId = req.user._id;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status || "RESOLVED";
    await report.save();

    // Log the resolution action
    await AdminLog.create({
      adminId,
      action: actionTaken || `RESOLVE_REPORT_${report.status}`,
      targetId: report.targetId,
      reportId: report._id
    });
    
    // Optional: Notify the reported user via socket (anonymous)
    // if report.targetType === 'user' && status === 'RESOLVED' ...

    res.status(200).json({ message: "Report resolved", report });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Admin
export const getAdminLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate("adminId", "displayName email")
      .sort({ createdAt: -1 })
      .limit(100); 

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error getting logs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
