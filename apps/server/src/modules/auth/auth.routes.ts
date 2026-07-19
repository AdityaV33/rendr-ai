import { Router } from "express";
import{asyncHandler} from "../middleware/async-handler.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  login,
  logout,
  me,
  refresh,
  register,
} from "./auth.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { loginSchema, registerSchema, } from "./auth.validation.js";

const router = Router();
router.post("/register",validate(registerSchema), asyncHandler(register));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout",
  requireAuth,
  asyncHandler(logout),
);
router.get("/me",
  requireAuth,
  asyncHandler(me),
);

export default router;