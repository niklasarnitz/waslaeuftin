import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const keyLength = 32;

export const hashPassword = (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // generate random 16 bytes long salt - recommended by NodeJS Docs
    const salt = randomBytes(16).toString("hex");

    scrypt(password, salt, keyLength, (err, derivedKey) => {
      if (err) reject(err);
      // derivedKey is of type Buffer
      resolve(`${salt}.${derivedKey.toString("hex")}`);
    });
  });
};

export const checkHashedPassword = async (password: string, hash: string) => {
  return new Promise<boolean>((resolve, reject) => {
    const [salt, hashKey] = hash.split(".");

    // eslint-disable-next-line prefer-promise-reject-errors
    if (!salt || !hashKey) reject(new Error("Invalid hash"));

    // we need to pass buffer values to timingSafeEqual
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hashKeyBuff = Buffer.from(hashKey!, "hex");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    scrypt(password, salt!, keyLength, (err, derivedKey) => {
      if (err) reject(err);
      // compare the new supplied password with the hashed password using timeSafeEqual
      resolve(timingSafeEqual(hashKeyBuff, derivedKey));
    });
  });
};
