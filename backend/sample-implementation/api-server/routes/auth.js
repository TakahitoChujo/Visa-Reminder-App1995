/**
 * 認証API
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * POST /auth/device/register
 * デバイス登録（匿名認証）
 */
router.post('/device/register',
  [
    body('device_id').isString().notEmpty(),
    body('platform').isIn(['ios', 'android']),
    body('os_version').optional().isString(),
    body('app_version').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'リクエストパラメータが不正です',
          details: errors.array(),
        },
      });
    }

    try {
      const { device_id, platform } = req.body;

      // ユーザーIDを生成
      const userId = uuidv4();

      // トークン生成
      const accessToken = jwt.sign(
        {
          user_id: userId,
          device_id: device_id,
          is_premium: false,
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      const refreshToken = jwt.sign(
        {
          user_id: userId,
        },
        JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
      );

      // データベースにユーザー登録（サンプルでは省略）
      // await db.query('INSERT INTO users (id, device_id) VALUES (?, ?)', [userId, device_id]);

      res.status(201).json({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
      });

      logger.info('Device registered', { user_id: userId, device_id, platform });
    } catch (error) {
      logger.error('Device registration failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイス登録に失敗しました',
        },
      });
    }
  }
);

/**
 * POST /auth/token/refresh
 * トークン更新
 */
router.post('/token/refresh',
  [body('refresh_token').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'リクエストパラメータが不正です',
        },
      });
    }

    try {
      const { refresh_token } = req.body;

      // リフレッシュトークンの検証
      jwt.verify(refresh_token, JWT_REFRESH_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'リフレッシュトークンが無効です',
            },
          });
        }

        // 新しいアクセストークンを生成
        const accessToken = jwt.sign(
          {
            user_id: user.user_id,
            is_premium: user.is_premium || false,
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        res.json({
          access_token: accessToken,
          expires_in: 3600,
          token_type: 'Bearer',
        });
      });
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'トークンの更新に失敗しました',
        },
      });
    }
  }
);

module.exports = router;
