import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const router = express.Router();
const prisma = new PrismaClient();

// 映画保存用のバリデーションスキーマ
const movieSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  release_date: z.string().optional(), // 日付も文字列として受け取ることが多い
  poster_path: z.string().optional(),
  overview: z.string().optional(),
});

// 外部API(TMDb)から映画を検索するエンドポイント
router.get('/search', async (req, res) => {
  // URLのクエリ(?query=...)から検索ワードを取得
  const query = req.query.query as string;

  // 検索ワードがなければ400エラー
  if (!query) {
    return res
      .status(400)
      .json({ message: ERROR_MESSAGES.REQUIRED('検索ワード') });
  }

  try {
    // axiosを使って、TMDb APIにリクエストを送信
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: process.env.TMDB_API_KEY,
          query: query,
          language: 'ja-JP',
        },
      }
    );

    // TMDbからの検索結果をそのままクライアントに返す
    res.json(response.data.results);
  } catch (error) {
    console.error('Error fetching from TMDB API:', error);
    res.status(500).json({ message: ERROR_MESSAGES.API_ERROR_FETCHING });
  }
});

// 選択された映画を自分のデータベースに保存するエンドポイント
router.post('/', async (req, res) => {
  try {
    // Zodで送られてきた映画データの形式を検証
    const movieData = movieSchema.parse(req.body);

    const movie = await prisma.movie.upsert({
      // Movieテーブルの中から、id列がmovieData.idと一致する行を探す
      where: { id: String(movieData.id) },
      // 映画がDBに既に存在した場合の更新データ（今回はタイトルなどを最新に保つ）
      update: {
        title: movieData.title,
        release_date: movieData.release_date
          ? new Date(movieData.release_date)
          : null,
        poster_path: movieData.poster_path,
        overview: movieData.overview,
      },
      // 映画がDBに存在しなかった場合の新規作成データ
      create: {
        id: String(movieData.id),
        title: movieData.title,
        release_date: movieData.release_date
          ? new Date(movieData.release_date)
          : null,
        poster_path: movieData.poster_path,
        overview: movieData.overview,
      },
    });

    // 保存（または更新）された映画情報を返す
    res.status(201).json(movie);
  } catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    // その他のサーバーエラー
    console.error(error);
    res.status(500).json({ message: ERROR_MESSAGES.MOVIE_SAVING });
  }
});

export default router;
