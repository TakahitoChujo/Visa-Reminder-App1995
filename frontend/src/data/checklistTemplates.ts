/**
 * チェックリストテンプレート定義
 *
 * 在留資格タイプ別に必要書類のテンプレート構造を定義する。
 * 日本語テキストは含まない（i18n キー参照のみ）。
 */

export interface ChecklistTemplateItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  tagKeys: string[];
  order: number;
}

export interface ChecklistTemplateCategory {
  id: string;
  titleKey: string;
  icon: string;
  items: ChecklistTemplateItem[];
}

/**
 * 在留資格タイプ別チェックリストテンプレート。
 *
 * キーは内部識別子（engineer, student, spouse-japanese）。
 * ResidenceType → テンプレートキー変換は画面側で行う。
 */
export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplateCategory[]> = {
  engineer: [
    {
      id: 'basic',
      titleKey: 'checklistData:engineer.basic.title',
      icon: 'document-text-outline',
      items: [
        {
          id: 'application-form',
          titleKey: 'checklistData:engineer.basic.items.applicationForm.title',
          descriptionKey: 'checklistData:engineer.basic.items.applicationForm.description',
          tagKeys: ['common:tag.required', 'common:tag.applicationDoc'],
          order: 1,
        },
        {
          id: 'photo',
          titleKey: 'checklistData:engineer.basic.items.photo.title',
          descriptionKey: 'checklistData:engineer.basic.items.photo.description',
          tagKeys: ['common:tag.required'],
          order: 2,
        },
        {
          id: 'passport',
          titleKey: 'checklistData:engineer.basic.items.passport.title',
          descriptionKey: 'checklistData:engineer.basic.items.passport.description',
          tagKeys: ['common:tag.required'],
          order: 3,
        },
        {
          id: 'residence-card',
          titleKey: 'checklistData:engineer.basic.items.residenceCard.title',
          descriptionKey: 'checklistData:engineer.basic.items.residenceCard.description',
          tagKeys: ['common:tag.required'],
          order: 4,
        },
        {
          id: 'fee',
          titleKey: 'checklistData:engineer.basic.items.fee.title',
          descriptionKey: 'checklistData:engineer.basic.items.fee.description',
          tagKeys: ['common:tag.required'],
          order: 5,
        },
      ],
    },
    {
      id: 'employment',
      titleKey: 'checklistData:engineer.employment.title',
      icon: 'briefcase-outline',
      items: [
        {
          id: 'employment-certificate',
          titleKey: 'checklistData:engineer.employment.items.employmentCertificate.title',
          descriptionKey: 'checklistData:engineer.employment.items.employmentCertificate.description',
          tagKeys: ['common:tag.required', 'common:tag.companyDoc'],
          order: 1,
        },
        {
          id: 'company-registration',
          titleKey: 'checklistData:engineer.employment.items.companyRegistration.title',
          descriptionKey: 'checklistData:engineer.employment.items.companyRegistration.description',
          tagKeys: ['common:tag.required', 'common:tag.companyDoc'],
          order: 2,
        },
        {
          id: 'tax-withholding',
          titleKey: 'checklistData:engineer.employment.items.taxWithholding.title',
          descriptionKey: 'checklistData:engineer.employment.items.taxWithholding.description',
          tagKeys: ['common:tag.required'],
          order: 3,
        },
      ],
    },
    {
      id: 'tax',
      titleKey: 'checklistData:engineer.tax.title',
      icon: 'clipboard-outline',
      items: [
        {
          id: 'tax-certificate',
          titleKey: 'checklistData:engineer.tax.items.taxCertificate.title',
          descriptionKey: 'checklistData:engineer.tax.items.taxCertificate.description',
          tagKeys: ['common:tag.required'],
          order: 1,
        },
        {
          id: 'tax-payment',
          titleKey: 'checklistData:engineer.tax.items.taxPayment.title',
          descriptionKey: 'checklistData:engineer.tax.items.taxPayment.description',
          tagKeys: ['common:tag.required'],
          order: 2,
        },
      ],
    },
  ],

  student: [
    {
      id: 'basic',
      titleKey: 'checklistData:student.basic.title',
      icon: 'document-text-outline',
      items: [
        {
          id: 'application-form',
          titleKey: 'checklistData:student.basic.items.applicationForm.title',
          descriptionKey: 'checklistData:student.basic.items.applicationForm.description',
          tagKeys: ['common:tag.required', 'common:tag.applicationDoc'],
          order: 1,
        },
        {
          id: 'photo',
          titleKey: 'checklistData:student.basic.items.photo.title',
          descriptionKey: 'checklistData:student.basic.items.photo.description',
          tagKeys: ['common:tag.required'],
          order: 2,
        },
        {
          id: 'passport',
          titleKey: 'checklistData:student.basic.items.passport.title',
          descriptionKey: 'checklistData:student.basic.items.passport.description',
          tagKeys: ['common:tag.required'],
          order: 3,
        },
        {
          id: 'residence-card',
          titleKey: 'checklistData:student.basic.items.residenceCard.title',
          descriptionKey: 'checklistData:student.basic.items.residenceCard.description',
          tagKeys: ['common:tag.required'],
          order: 4,
        },
      ],
    },
    {
      id: 'school',
      titleKey: 'checklistData:student.school.title',
      icon: 'school-outline',
      items: [
        {
          id: 'enrollment-certificate',
          titleKey: 'checklistData:student.school.items.enrollmentCertificate.title',
          descriptionKey: 'checklistData:student.school.items.enrollmentCertificate.description',
          tagKeys: ['common:tag.required', 'common:tag.schoolDoc'],
          order: 1,
        },
        {
          id: 'transcript',
          titleKey: 'checklistData:student.school.items.transcript.title',
          descriptionKey: 'checklistData:student.school.items.transcript.description',
          tagKeys: ['common:tag.required', 'common:tag.schoolDoc'],
          order: 2,
        },
        {
          id: 'attendance-certificate',
          titleKey: 'checklistData:student.school.items.attendanceCertificate.title',
          descriptionKey: 'checklistData:student.school.items.attendanceCertificate.description',
          tagKeys: ['common:tag.required', 'common:tag.schoolDoc'],
          order: 3,
        },
      ],
    },
    {
      id: 'financial',
      titleKey: 'checklistData:student.financial.title',
      icon: 'wallet-outline',
      items: [
        {
          id: 'financial-support',
          titleKey: 'checklistData:student.financial.items.financialSupport.title',
          descriptionKey: 'checklistData:student.financial.items.financialSupport.description',
          tagKeys: ['common:tag.required'],
          order: 1,
        },
      ],
    },
  ],

  'spouse-japanese': [
    {
      id: 'basic',
      titleKey: 'checklistData:spouseJapanese.basic.title',
      icon: 'document-text-outline',
      items: [
        {
          id: 'application-form',
          titleKey: 'checklistData:spouseJapanese.basic.items.applicationForm.title',
          descriptionKey: 'checklistData:spouseJapanese.basic.items.applicationForm.description',
          tagKeys: ['common:tag.required', 'common:tag.applicationDoc'],
          order: 1,
        },
        {
          id: 'photo',
          titleKey: 'checklistData:spouseJapanese.basic.items.photo.title',
          descriptionKey: 'checklistData:spouseJapanese.basic.items.photo.description',
          tagKeys: ['common:tag.required'],
          order: 2,
        },
        {
          id: 'passport',
          titleKey: 'checklistData:spouseJapanese.basic.items.passport.title',
          descriptionKey: 'checklistData:spouseJapanese.basic.items.passport.description',
          tagKeys: ['common:tag.required'],
          order: 3,
        },
        {
          id: 'residence-card',
          titleKey: 'checklistData:spouseJapanese.basic.items.residenceCard.title',
          descriptionKey: 'checklistData:spouseJapanese.basic.items.residenceCard.description',
          tagKeys: ['common:tag.required'],
          order: 4,
        },
      ],
    },
    {
      id: 'family',
      titleKey: 'checklistData:spouseJapanese.family.title',
      icon: 'people-outline',
      items: [
        {
          id: 'spouse-employment',
          titleKey: 'checklistData:spouseJapanese.family.items.spouseEmployment.title',
          descriptionKey: 'checklistData:spouseJapanese.family.items.spouseEmployment.description',
          tagKeys: ['common:tag.required'],
          order: 1,
        },
        {
          id: 'spouse-tax',
          titleKey: 'checklistData:spouseJapanese.family.items.spouseTax.title',
          descriptionKey: 'checklistData:spouseJapanese.family.items.spouseTax.description',
          tagKeys: ['common:tag.required'],
          order: 2,
        },
        {
          id: 'identity-guarantee',
          titleKey: 'checklistData:spouseJapanese.family.items.identityGuarantee.title',
          descriptionKey: 'checklistData:spouseJapanese.family.items.identityGuarantee.description',
          tagKeys: ['common:tag.required'],
          order: 3,
        },
      ],
    },
  ],
};
