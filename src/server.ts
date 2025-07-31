import express from "express";
import cors from "cors";
import userRoutes from './routes/userRoutes'; 

const app = express();
const port = 3001; // ポート番号は3000番台がよく使われます

app.use(cors()); // CORSを許可する
app.use(express.json()); // JSON形式のリクエストを扱えるようにする

// テスト用のエンドポイント
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// `/api/users`というURLで始まるリクエストは、全てuserRoutesに任せる
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});