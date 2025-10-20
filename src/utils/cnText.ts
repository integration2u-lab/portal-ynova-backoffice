export type TextVariant = 'title' | 'subtitle' | 'tableCell' | 'tableHeader';

export function cnText(variant: TextVariant = 'title') {
  switch (variant) {
    case 'subtitle':
      return 'text-gray-700 dark:text-white dark:font-bold';
    case 'tableCell':
      return 'text-gray-900 dark:text-white dark:font-bold';
    case 'tableHeader':
      return 'text-gray-600 dark:text-white dark:font-bold';
    default:
      return 'text-gray-900 dark:text-white dark:font-bold';
  }
}
