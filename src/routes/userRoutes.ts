import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const router = express.Router();
const prisma = new PrismaClient();

// ユーザー登録用のバリデーションスキーマを定義
const registrationSchema = z.object({
  name: z.string().min(1, { message: ERROR_MESSAGES.REQUIRED('名前') }),
  email: z.email({ message: ERROR_MESSAGES.INVALID_EMAIL }),
  password: z
    .string()
    .min(8, { message: ERROR_MESSAGES.PASSWORD_MIN_LENGTH })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: ERROR_MESSAGES.PASSWORD_ALPHANUMERIC,
    }),
});

router.post('/register', async (req, res) => {
  try {
    // 1. Zodのスキーマを使って、req.bodyを検証する
    // Zodの.parse()というメソッドは、req.bodyがregistrationSchemaのルールに違反していた場合、エラーを投げます（throw）。
    // エラーが投げられると、プログラムは即座にcatchブロックにジャンプします。
    const { email, name, password } = registrationSchema.parse(req.body);

    // 2. パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. データベースにユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // 4. 成功レスポンスを返す
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    // 5. エラーハンドリング
    // errorがPrismaの既知のエラーかどうかをまずチェック
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // もしユニーク制約違反(P2002)だったら
      if (error.code === 'P2002') {
        return res
          .status(409)
          .json({ message: ERROR_MESSAGES.DUPLICATION_EMAIL });
      }
    }

    // Zodのバリデーションエラーの場合、より詳細な情報を返す
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: ERROR_MESSAGES.INVALID,
        errors: error.issues, // どの項目がどんな理由でエラーになったかの詳細
      });
    }

    // それ以外の予期せぬエラー
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.ERROR });
  }
});

// ログイン用のバリデーションスキーマ
const loginSchema = z.object({
  email: z.email({ message: ERROR_MESSAGES.INVALID_EMAIL }),
  password: z
    .string()
    .min(1, { message: ERROR_MESSAGES.REQUIRED('パスワード') }),
});

// ログインのエンドポイント
router.post('/login', async (req, res) => {
  try {
    // 1. 入力値のバリデーション
    const { email, password } = loginSchema.parse(req.body);

    // 2. メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      // ユーザーが見つからない場合はエラー
      return res.status(401).json({ message: ERROR_MESSAGES.INVALID });
    }

    // 3. パスワードの照合
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // パスワードが一致しない場合はエラー
      return res.status(401).json({ message: ERROR_MESSAGES.INVALID });
    }

    // 4. JWTを生成
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // トークンに含める情報
      process.env.JWT_SECRET as string, // .envから秘密鍵を読み込む
      { expiresIn: '1h' } // 有効期限 (例: 1時間)
    );

    // 5. JWTをクライアントに返す
    res.json({ token });
  } catch (error) {
    // Zodバリデーションエラーの処理
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: ERROR_MESSAGES.INVALID,
        errors: error.issues,
      });
    }
    // その他のサーバーエラー
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.ERROR });
  }
});

export default router;
