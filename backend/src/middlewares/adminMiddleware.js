export const adminMiddleware = (req, res, next) => {
  if (req.user && ["admin", "superadmin"].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Bạn không có quyền quản trị" });
  }
};
