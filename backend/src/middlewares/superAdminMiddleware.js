export const superAdminMiddleware = (req, res, next) => {
  if (req.user?.role === "superadmin") {
    next();
  } else {
    res.status(403).json({ message: "Chỉ Super Admin mới có quyền này" });
  }
};
