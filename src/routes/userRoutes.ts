import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router = express.Router();
const prisma = new PrismaClient();

// ユーザー登録用のバリデーションスキーマを定義
const registrationSchema = z.object({
  name: z.string().min(1, { message: "名前は必須です" }),
  email: z.email({ message: "不正なメールアドレス形式です" }),
  password: z
    .string()
    .min(8, { message: "パスワードは8文字以上で入力してください" })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: "パスワードは半角英数字のみで入力してください",
    }),
});

router.post("/register", async (req, res) => {
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
      message: "User created successfully",
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
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "This email is already in use" });
      }
    }

    // Zodのバリデーションエラーの場合、より詳細な情報を返す
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: error.issues, // どの項目がどんな理由でエラーになったかの詳細
      });
    }

    // それ以外の予期せぬエラー
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;