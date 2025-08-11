import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express(); // ExpressはWebアプリケーションを作るためのフレームワークなので、その本体をappと名付けるのが最もシンプルで分かりやすいとされている
const port = 3001; // ポート番号は3000番台がよく使われる。衝突回避のため、今回は3001を使用

// app.useでミドルウェアを登録する
app.use(cors()); // CORSを許可する。現在は全てを許可してしまっているので、本番環境ではアクセスを許可するウェブサイトを具体的に指定する必要がある
// 本番環境の例
// const options = {
// ここに、デプロイしたあなたのフロントエンドのURLを指定します
// origin: 'https://my-awesome-movie-app.com',
// };
// app.use(cors(options));

app.use(express.json()); // JSON形式のリクエストを扱えるようにする

// テスト用のエンドポイント
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// `/api/users`というURLで始まるリクエストは、全てuserRoutesに任せる
app.use('/api/users', userRoutes);

// サーバーの起動
// 指定したポート番号でサーバーを起動する
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
