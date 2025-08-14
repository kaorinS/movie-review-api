import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. リクエストヘッダーからトークンを取得
  // req.headersはクライアントが送信したリクエストの「header情報」が全て入っているオブジェクト
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: ERROR_MESSAGES.TOKEN_REQUIRED });
  }
  const token = authHeader.split(' ')[1];

  try {
    // 2. トークンを検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // 3. 検証成功なら、リクエストオブジェクトにユーザー情報を格納
    req.user = decoded as { userId: number; role: Role };

    // 4. 次の処理へ進む
    next();
  } catch (error) {
    // 5. トークンが無効な場合はエラー
    return res.status(401).json({ message: ERROR_MESSAGES.TOKEN_INVALID });
  }
};
