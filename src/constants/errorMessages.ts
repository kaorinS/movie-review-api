export const ERROR_MESSAGES = {
  // 共通
  REQUIRED: (fieldName: string) => `${fieldName}は必須項目です。`,
  INVALID: '無効なリクエストです。',
  USER: 'ユーザーが認証されていません。',
  ERROR: 'エラーが発生しました。',

  // メールアドレス関連
  INVALID_EMAIL: '誤ったメールアドレス形式です。',
  DUPLICATION_EMAIL: '登録済みのメールアドレスです。',

  // パスワード関連
  PASSWORD_MIN_LENGTH: 'パスワードは8文字以上で入力してください。',
  PASSWORD_ALPHANUMERIC: 'パスワードは半角英数字で入力してください。',

  // 認証（トークン）関連
  TOKEN_REQUIRED: '認証トークンが必要です。',
  TOKEN_INVALID: '無効または期限切れのトークンです。',

  // レビュー関連
  RATING_NUMBER: '評価点は数値で入力してください。',
  REVIEW_COMMENT_REQUIRED:
    'ネタバレなし、またはネタバレありコメントのどちらか一方は必須です。',
};
