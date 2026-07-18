import { User } from "./user.model.js";

export const userService = {
  async findByEmail(email: string) {
    return User.findOne({ email });
},
async findById(id: string) {
  return User.findById(id);
},

async createUser(userData: { 
  name: string;
  email: string;
  passwordHash: string })
 {
  return User.create(userData);
}
}
