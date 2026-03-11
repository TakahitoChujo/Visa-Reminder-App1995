/**
 * DateInput.web.tsx のテスト
 * 有効期限フィールドの全幅統一の修正を検証
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DateInput } from '../DateInput.web';

describe('DateInput.web - 有効期限フィールドスタイルテスト', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('スタイル適用テスト', () => {
    test('TC-5: width: 100% のみが適用されており maxWidth は存在しない', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toBeInTheDocument();
      expect(input).toHaveStyle({
        width: '100%',
      });
      expect(input).not.toHaveStyle({
        maxWidth: '320px',
      });
    });

    test('TC-6: width: 100% が適用されている', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveStyle({
        width: '100%',
      });
    });

    test('TC-7: 高さが48pxである', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveStyle({
        height: '48px',
      });
    });
  });

  describe('styleプロップのオーバーライドテスト', () => {
    test('TC-16: カスタムmaxWidthが優先される', () => {
      const { container } = render(
        <DateInput
          value=""
          onChange={mockOnChange}
          style={{ maxWidth: '500px' }}
        />
      );
      const input = container.querySelector('input[type="date"]');

      // styleプロップがスプレッド演算子の最後にあるため、上書きされる
      expect(input).toHaveStyle({
        maxWidth: '500px',
      });
    });

    test('TC-17: カスタムwidthが優先される', () => {
      const { container } = render(
        <DateInput
          value=""
          onChange={mockOnChange}
          style={{ width: '200px' }}
        />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveStyle({
        width: '200px',
      });
    });
  });

  describe('機能回帰テスト', () => {
    test('TC-12: input要素がレンダリングされる', () => {
      const { container } = render(
        <DateInput value="2026-03-10" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    test('TC-13: value propが正しく反映される', () => {
      const { container } = render(
        <DateInput value="2026-03-10" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;

      expect(input.value).toBe('2026-03-10');
    });

    test('TC-14: onChange が呼ばれる', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;

      // 日付を変更
      input.value = '2026-04-15';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(mockOnChange).toHaveBeenCalledWith('2026-04-15');
    });

    test('placeholder propが正しく適用される', () => {
      const { container } = render(
        <DateInput
          value=""
          onChange={mockOnChange}
          placeholder="日付を選択"
        />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveAttribute('placeholder', '日付を選択');
    });
  });

  describe('アクセシビリティテスト', () => {
    test('カーソルがpointerである', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveStyle({
        cursor: 'pointer',
      });
    });

    test('outlineがnoneに設定されている', () => {
      const { container } = render(
        <DateInput value="" onChange={mockOnChange} />
      );
      const input = container.querySelector('input[type="date"]');

      expect(input).toHaveStyle({
        outline: 'none',
      });
    });
  });
});
