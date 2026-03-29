import jwt from "jsonwebtoken";
import { config } from "../config";

interface TokenPayload {
    id: string;
    role: string;
}

export const signAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiresIn as any,
    });
};

export const signRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn as any,
    });
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};
