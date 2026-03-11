/**
 * 認証ミドルウェア
 * JWT トークンの検証と認可
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT トークンを検証する認証ミドルウェア
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Token verification failed', {
        error: err.message,
        ip: req.ip,
      });

      return res.status(403).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'トークンが無効または期限切れです',
        },
      });
    }

    req.user = user;
    next();
  });
}

/**
 * プレミアム機能チェックミドルウェア
 */
function requirePremium(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    });
  }

  if (!req.user.is_premium) {
    return res.status(403).json({
      error: {
        code: 'PREMIUM_REQUIRED',
        message: 'この機能はプレミアム会員限定です',
      },
    });
  }

  // プレミアム期限チェック
  if (req.user.premium_expires_at) {
    const expiresAt = new Date(req.user.premium_expires_at);
    if (expiresAt < new Date()) {
      return res.status(403).json({
        error: {
          code: 'PREMIUM_EXPIRED',
          message: 'プレミアム会員の期限が切れています',
        },
      });
    }
  }

  next();
}

/**
 * リソース所有権チェック
 * @param {string} resourceType - リソースタイプ（'residence_card', 'checklist_item'等）
 */
function checkResourceOwnership(resourceType) {
  return async (req, res, next) => {
    const userId = req.user.user_id;
    const resourceId = req.params.id || req.params.residence_card_id;

    try {
      // データベースから所有権をチェック
      // 実装はリソースタイプによって異なる
      // ここではサンプルとして residence_cards をチェック

      const db = require('../utils/database');
      let query;
      let params;

      if (resourceType === 'residence_card') {
        query = 'SELECT user_id FROM residence_cards WHERE id = ? AND deleted_at IS NULL';
        params = [resourceId];
      } else if (resourceType === 'checklist_item') {
        query = `
          SELECT rc.user_id
          FROM checklist_items ci
          INNER JOIN residence_cards rc ON ci.residence_card_id = rc.id
          WHERE ci.id = ?
        `;
        params = [resourceId];
      } else {
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'リソースタイプが不明です',
          },
        });
      }

      const result = await db.query(query, params);

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'リソースが見つかりません',
          },
        });
      }

      if (result[0].user_id !== userId) {
        logger.warn('Unauthorized resource access attempt', {
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'このリソースへのアクセス権限がありません',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed', {
        error: error.message,
        resource_type: resourceType,
        resource_id: resourceId,
      });

      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  };
}

module.exports = {
  authenticateToken,
  requirePremium,
  checkResourceOwnership,
};
