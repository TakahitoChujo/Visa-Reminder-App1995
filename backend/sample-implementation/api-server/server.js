/**
 * 在留資格更新リマインダー API サーバー
 * Node.js + Express サンプル実装
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// ミドルウェア設定
// ============================================

// セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// CORS設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// JSON パーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
  });
  next();
});

// レート制限
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 60, // 60リクエスト/分
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'レート制限を超過しました。しばらくしてから再試行してください。',
    },
  },
});

app.use('/api/', limiter);

// ============================================
// ルーティング
// ============================================

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 認証関連
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// API ルート
const residenceCardsRoutes = require('./routes/residence-cards');
const checklistRoutes = require('./routes/checklist');
const remindersRoutes = require('./routes/reminders');
const residenceTypesRoutes = require('./routes/residence-types');
const devicesRoutes = require('./routes/devices');

app.use('/api/residence-cards', residenceCardsRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/residence-types', residenceTypesRoutes);
app.use('/api/devices', devicesRoutes);

// ============================================
// エラーハンドリング
// ============================================

// 404エラー
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'リソースが見つかりません',
      path: req.path,
    },
  });
});

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  const statusCode = err.statusCode || 500;
  const errorResponse = {
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'サーバー内部エラーが発生しました',
    },
  };

  // 開発環境ではスタックトレースを含める
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// ============================================
// サーバー起動
// ============================================

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
