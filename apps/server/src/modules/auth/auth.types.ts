import { z } from "zod";

import {
  registerSchema,
  loginSchema,
} from "./auth.validation.js";

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;