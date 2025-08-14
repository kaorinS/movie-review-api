import { Request } from 'express';
import { Role } from '@prisma/client'; // Prismaが生成したRole enumをインポート

// ExpressのRequestオブジェクトに、カスタムプロパティを追加するための型定義
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: Role; // stringの代わりに、より厳密なRole型を使う
  };
}
