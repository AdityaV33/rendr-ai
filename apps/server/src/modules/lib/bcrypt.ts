import bcrypt from "bcrypt";
const BCRYPT_COST = 12;

export async function hash (value:string){
  return bcrypt.hash(value, BCRYPT_COST);
}

export async function compare (value:string, hash:string){
  return bcrypt.compare(value, hash);
}