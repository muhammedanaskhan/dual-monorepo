import dotenv from 'dotenv';

dotenv.config();

export const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
export const PRIVY_SECRET = process.env.PRIVY_SECRET;
export const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY;
export const PRIVY_SIGNING_KEY = process.env.PRIVY_SIGNING_KEY;
export const JWT_SECRET = process.env.JWT_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL;
export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV;