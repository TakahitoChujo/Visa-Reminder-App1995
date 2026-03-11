/**
 * 在留カード関連の型定義
 */

/**
 * 在留資格の種類
 */
export interface ResidenceType {
  id: string;
  nameJa: string;
  nameEn: string;
  code: string;
}

/**
 * 在留カード
 */
export interface ResidenceCard {
  id: string;
  userId: string;
  residenceTypeId: string;
  residenceTypeName?: string;
  cardNumber: string;
  expiryDate: Date;
  issueDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 在留カード作成用データ
 */
export interface CreateResidenceCardInput {
  residenceTypeId: string;
  cardNumber: string;
  expiryDate: Date;
  issueDate: Date;
}

/**
 * 在留カード更新用データ
 */
export interface UpdateResidenceCardInput {
  residenceTypeId?: string;
  cardNumber?: string;
  expiryDate?: Date;
  issueDate?: Date;
  isActive?: boolean;
}
