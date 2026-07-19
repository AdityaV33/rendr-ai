import { InferSchemaType, Schema, model } from "mongoose";



const userSchema = new Schema({
  name: { type: String, required: true, trim: true
   },
  email: { type: String, required: true, unique: true, trim: true,lowercase: true },
  passwordHash: { type: String, required: true },
  refreshTokenHash: { type: String }
},
{
  timestamps: true,
  versionKey: false,

}
);
type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model<UserDocument>("User", userSchema);