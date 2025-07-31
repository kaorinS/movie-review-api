"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// ユーザー登録用のバリデーションスキーマを定義
const registrationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: "名前を入力してください" }),
    email: zod_1.z.email({ message: "誤ったメールアドレス形式です" }),
    password: zod_1.z
        .string()
        .min(8, { message: "パスワードは8文字以上で入力してください" })
        .regex(/^[a-zA-Z0-9]+$/, {
        message: "パスワードは半角英数字のみで入力してください",
    }),
});
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Zodのスキーマを使って、req.bodyを検証する
        // Zodの.parse()というメソッドは、req.bodyがregistrationSchemaのルールに違反していた場合、エラーを投げます（throw）。
        // エラーが投げられると、プログラムは即座にcatchブロックにジャンプします。
        const { email, name, password } = registrationSchema.parse(req.body);
        // 2. パスワードをハッシュ化
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // 3. データベースにユーザーを作成
        const user = yield prisma.user.create({
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
    }
    catch (error) {
        // 5. エラーハンドリング
        // errorがPrismaの既知のエラーかどうかをまずチェック
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // もしユニーク制約違反(P2002)だったら
            if (error.code === "P2002") {
                return res
                    .status(409)
                    .json({ message: "This email is already in use" });
            }
        }
        // Zodのバリデーションエラーの場合、より詳細な情報を返す
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: "Invalid request body",
                errors: error.issues, // どの項目がどんな理由でエラーになったかの詳細
            });
        }
        // それ以外の予期せぬエラー
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}));
// ログイン用のバリデーションスキーマ
const loginSchema = zod_1.z.object({
    email: zod_1.z.email({ message: "誤ったメールアドレス形式です" }),
    password: zod_1.z.string().min(1, { message: "パスワードを入力してください" }),
});
// ログインのエンドポイント
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. 入力値のバリデーション
        const { email, password } = loginSchema.parse(req.body);
        // 2. メールアドレスでユーザーを検索
        const user = yield prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            // ユーザーが見つからない場合はエラー
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // 3. パスワードの照合
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            // パスワードが一致しない場合はエラー
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // 4. JWTを生成
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, // トークンに含める情報
        process.env.JWT_SECRET, // .envから秘密鍵を読み込む
        { expiresIn: '1h' } // 有効期限 (例: 1時間)
        );
        // 5. JWTをクライアントに返す
        res.json({ token });
    }
    catch (error) {
        // Zodバリデーションエラーの処理
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Invalid request body',
                errors: error.issues,
            });
        }
        // その他のサーバーエラー
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
}));
exports.default = router;
