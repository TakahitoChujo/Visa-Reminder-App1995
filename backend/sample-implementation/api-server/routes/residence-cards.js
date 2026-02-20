/**
 * 在留カード管理API
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, checkResourceOwnership } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// サンプル実装のため、データベース接続は簡略化
// 実際にはデータベースモジュールをインポート
// const db = require('../utils/database');

/**
 * GET /api/residence-cards
 * 在留カード一覧取得
 */
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.user_id;
      const isActive = req.query.is_active !== 'false';

      // サンプルレスポンス
      const cards = [
        {
          id: 'card-123e4567-e89b-12d3',
          residence_type_id: 'work_visa',
          residence_type_name: '技術・人文知識・国際業務',
          expiry_date: '2027-12-31',
          application_start_date: '2027-08-31',
          days_until_expiry: 695,
          is_active: true,
          checklist: {
            total_items: 15,
            completed_items: 5,
            completion_rate: 33.33,
          },
          created_at: '2026-02-14T10:00:00Z',
          updated_at: '2026-02-14T10:00:00Z',
        },
      ];

      res.json({
        data: cards,
        meta: {
          total: cards.length,
          page: 1,
          per_page: 20,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch residence cards', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'カード一覧の取得に失敗しました',
        },
      });
    }
  }
);

/**
 * POST /api/residence-cards
 * 在留カード新規登録
 */
router.post('/',
  authenticateToken,
  [
    body('residence_type_id').isString().trim().notEmpty(),
    body('expiry_date').isISO8601().toDate(),
    body('memo').optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    // バリデーション結果チェック
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

    const { residence_type_id, expiry_date, memo } = req.body;
    const userId = req.user.user_id;

    // 有効期限が未来の日付かチェック
    if (expiry_date <= new Date()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_EXPIRY_DATE',
          message: '有効期限は未来の日付である必要があります',
        },
      });
    }

    try {
      // メモを暗号化（ある場合）
      const encryptedMemo = memo ? encrypt(memo) : null;

      // 申請開始日を計算（例: 4ヶ月前）
      const applicationStartDate = new Date(expiry_date);
      applicationStartDate.setMonth(applicationStartDate.getMonth() - 4);

      // データベースに保存（サンプル実装）
      const cardId = `card-${Date.now()}`;

      // サンプルレスポンス
      res.status(201).json({
        id: cardId,
        user_id: userId,
        residence_type_id,
        residence_type_name: '技術・人文知識・国際業務',
        expiry_date: expiry_date.toISOString().split('T')[0],
        application_start_date: applicationStartDate.toISOString().split('T')[0],
        days_until_expiry: Math.ceil((expiry_date - new Date()) / (1000 * 60 * 60 * 24)),
        is_active: true,
        memo: memo || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        checklist: {
          total_items: 15,
          completed_items: 0,
          completion_rate: 0,
        },
      });

      logger.info('Residence card created', { card_id: cardId, user_id: userId });
    } catch (error) {
      logger.error('Failed to create residence card', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'カードの登録に失敗しました',
        },
      });
    }
  }
);

/**
 * GET /api/residence-cards/:id
 * 在留カード詳細取得
 */
router.get('/:id',
  authenticateToken,
  checkResourceOwnership('residence_card'),
  async (req, res) => {
    try {
      const cardId = req.params.id;

      // サンプルレスポンス
      res.json({
        id: cardId,
        user_id: req.user.user_id,
        residence_type_id: 'work_visa',
        residence_type: {
          id: 'work_visa',
          name_ja: '技術・人文知識・国際業務',
          name_en: 'Engineer/Specialist in Humanities/International Services',
          application_months_before: 4,
        },
        expiry_date: '2027-12-31',
        application_start_date: '2027-08-31',
        days_until_expiry: 695,
        is_active: true,
        memo: null,
        checklist_summary: {
          total_items: 15,
          completed_items: 5,
          in_progress_items: 3,
          pending_items: 7,
          completion_rate: 33.33,
        },
        reminders: [
          {
            type: '4months',
            scheduled_date: '2027-08-31',
            status: 'scheduled',
          },
          {
            type: '3months',
            scheduled_date: '2027-09-30',
            status: 'scheduled',
          },
        ],
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      });
    } catch (error) {
      logger.error('Failed to fetch residence card', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'カード情報の取得に失敗しました',
        },
      });
    }
  }
);

/**
 * PUT /api/residence-cards/:id
 * 在留カード更新
 */
router.put('/:id',
  authenticateToken,
  checkResourceOwnership('residence_card'),
  [
    param('id').isString(),
    body('expiry_date').optional().isISO8601().toDate(),
    body('residence_type_id').optional().isString(),
    body('memo').optional().isString().isLength({ max: 1000 }),
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
      const cardId = req.params.id;
      const { expiry_date, residence_type_id, memo } = req.body;

      // メモを暗号化
      const encryptedMemo = memo ? encrypt(memo) : undefined;

      // サンプルレスポンス
      res.json({
        id: cardId,
        residence_type_id: residence_type_id || 'work_visa',
        expiry_date: expiry_date ? expiry_date.toISOString().split('T')[0] : '2027-12-31',
        application_start_date: '2027-08-31',
        memo: memo || null,
        updated_at: new Date().toISOString(),
      });

      logger.info('Residence card updated', { card_id: cardId });
    } catch (error) {
      logger.error('Failed to update residence card', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'カードの更新に失敗しました',
        },
      });
    }
  }
);

/**
 * DELETE /api/residence-cards/:id
 * 在留カード削除（論理削除）
 */
router.delete('/:id',
  authenticateToken,
  checkResourceOwnership('residence_card'),
  async (req, res) => {
    try {
      const cardId = req.params.id;

      // 論理削除（deleted_at にタイムスタンプを設定）
      // await db.query('UPDATE residence_cards SET deleted_at = NOW() WHERE id = ?', [cardId]);

      res.status(204).send();

      logger.info('Residence card deleted', { card_id: cardId });
    } catch (error) {
      logger.error('Failed to delete residence card', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'カードの削除に失敗しました',
        },
      });
    }
  }
);

module.exports = router;
