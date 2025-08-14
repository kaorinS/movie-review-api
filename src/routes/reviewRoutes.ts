import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware'; // 作成した認証ミドルウェアをインポート
import { AuthRequest } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const router = express.Router();
const prisma = new PrismaClient();

// レビュー投稿用のバリデーションスキーマ
const reviewSchema = z
  .object({
    // 個々のルール
    movieId: z
      .string()
      .min(1, { message: ERROR_MESSAGES.REQUIRED('映画タイトル') }),
    rating: z
      .number()
      .int()
      .min(1, { message: ERROR_MESSAGES.REQUIRED('評価') })
      .max(5),
    comment_general: z.string().optional(), // 任意項目(optional()を付与)
    comment_spoiler: z.string().optional(), // 任意項目(optional()を付与)
  })
  .refine(
    // 関係性のルール
    // 第一引数：検証関数
    // dataには、z.objectで定義されたオブジェクト全体（{ movieId, rating, comment_general, comment_spoiler }）が入ってくる
    (data) => {
      // comment_generalかcomment_spoilerのどちらかに値が入っていることを確認
      // 検証が成功ならtrue、失敗ならfalseを返す
      return data.comment_general || data.comment_spoiler;
    },
    // 第二引数：エラー設定
    // returnでfalseを返した場合のエラー設定
    {
      message: ERROR_MESSAGES.REVIEW_COMMENT_REQUIRED,
      // このエラーがどの項目に関連するものかを指定する
      // もし両方のコメントが空だった場合に、「ネタバレなしコメント」の欄にこのエラーメッセージを表示させる
      path: ['comment_general'],
    }
  );

// レビュー投稿のエンドポイント
// router.postの第2引数に、認証ミドルウェアを挟む
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 1. バリデーション
    const { movieId, rating, comment_general, comment_spoiler } =
      reviewSchema.parse(req.body);

    // 2. 認証ミドルウェアからユーザーIDを取得
    const userId = req.user?.userId;
    if (!userId) {
      // このエラーは通常発生しないはず（ミドルウェアで弾かれるため）
      return res.status(401).json({ message: ERROR_MESSAGES.USER });
    }

    // 3. データベースにレビューを作成
    const newReview = await prisma.review.create({
      data: {
        movieId,
        rating,
        comment_general,
        comment_spoiler,
        userId, // 誰が投稿したかを記録
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.ERROR });
  }
});

export default router;
