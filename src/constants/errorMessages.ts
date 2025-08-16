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

  // 外部API関連
  API_ERROR_FETCHING: '外部APIからのデータ取得に失敗しました。',

  // 映画情報関連
  MOVIE_SAVING: '映画情報の保存に問題が発生しました。',

  // レビュー関連
  RATING_MAX_INT: '評価点は1〜5で入力してください。',
  REVIEW_COMMENT_REQUIRED:
    'ネタバレなし、またはネタバレありコメントのどちらか一方は必須です。',
};
