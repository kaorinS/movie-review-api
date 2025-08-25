import express from 'express';
import { z } from 'zod';
import { Prisma, PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware'; // 作成した認証ミドルウェアをインポート
import { AuthRequest } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const router = express.Router();
const prisma = new PrismaClient();

// レビュー投稿用のバリデーションスキーマ
const reviewSchema = z
  .object({
    // 個々のルール
    movieId: z.string().min(1, { message: ERROR_MESSAGES.REQUIRED('映画ID') }),
    rating: z
      .number()
      .int()
      .min(1, { message: ERROR_MESSAGES.REQUIRED('評価点') })
      .max(5, { message: ERROR_MESSAGES.REQUIRED('評価点') }),
    comment_general: z
      .string()
      .max(1000, { message: ERROR_MESSAGES.REVIEW_MAX_LENGTH })
      .optional(), // 任意項目(optional()を付与)
    comment_spoiler: z
      .string()
      .max(1000, { message: ERROR_MESSAGES.REVIEW_MAX_LENGTH })
      .optional(), // 任意項目(optional()を付与)
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
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    // その他のサーバーエラー
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.ERROR });
  }
});

// 新着レビュー5件を取得するエンドポイント
router.get('/latest', async (req, res) => {
  try {
    const latestReviews = await prisma.review.findMany({
      orderBy: {
        created_at: 'desc', // 新しい順
      },
      take: 5, // 5件だけ取得する
      include: {
        author: {
          select: { id: true, name: true },
        },
        movie: {
          select: {
            id: true,
            title: true,
            poster_path: true,
            release_date: true,
          },
        },
      },
    });

    res.json(latestReviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// レビュー一覧取得のエンドポイント
router.get('/', async (req, res) => {
  try {
    // 1. クライアントから送られてきたクエリパラメータを取得
    const { sortBy, order, rating } = req.query;

    // 2. Prismaに渡す検索条件を動的に構築
    const findOptions: Prisma.ReviewFindManyArgs = {
      include: {
        // 関連するテーブルのデータも一緒に取得するためのオプション
        // Reviewモデルのauthorリレーションを辿って、レビューを書いたUserの情報を取得する
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        // 映画情報も一緒に取得する
        movie: {
          select: {
            id: true,
            title: true,
            poster_path: true,
            release_date: true,
          },
        },
      },
      orderBy: {
        // レビューを取得する際に、レビューが紐づいているMovieテーブルの情報も一緒に取得する。
        created_at: 'desc', // デフォルトは新着順
      },
    };
    // where句を後から追加するために、先に定義しておく
    const where: Prisma.ReviewWhereInput = {};

    // 3. 並び替え条件の指定があれば、orderByを上書き
    if (sortBy === 'rating') {
      findOptions.orderBy = {
        rating: order === 'asc' ? 'asc' : 'desc', // ascでなければdescにする
      };
    } else if (sortBy === 'created_at') {
      findOptions.orderBy = {
        created_at: order === 'asc' ? 'asc' : 'desc',
      };
    }

    // 4. 評価点による絞り込みがあれば、where条件を追加
    if (rating) {
      const ratingNumber = parseInt(rating as string, 10);
      if (!isNaN(ratingNumber)) {
        where.rating = ratingNumber;
      }
    }
    // 最後にwhere句をfindOptionsに合体させる
    findOptions.where = where;

    // 5. 構築した検索条件でデータベースを検索
    const reviews = await prisma.review.findMany(findOptions);

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.ERROR });
  }
});

export default router;
