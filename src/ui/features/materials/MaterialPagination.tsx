import { Button, Flex, Group, Text } from '@mantine/core';
import { getPageNumbers } from './url-state.ts';

type MaterialPaginationProps = {
  page: number;
  pageCount: number;
  disabled: boolean;
  onNavigate: (page: number) => void;
};

export function MaterialPagination({
  page,
  pageCount,
  disabled,
  onNavigate,
}: MaterialPaginationProps) {
  const numbers = getPageNumbers(page, pageCount);
  const firstPage = page === 1;
  const lastPage = pageCount === 0 || page >= pageCount;
  const finalVisiblePage = numbers.at(-1) ?? 0;

  return (
    <Flex
      className="material-pagination"
      component="nav"
      align="center"
      justify="space-between"
      gap="md"
      wrap="wrap"
      aria-label="Material pages"
    >
      <Group gap="xs">
        <Button
          type="button"
          variant="subtle"
          disabled={disabled || firstPage}
          onClick={() => onNavigate(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="subtle"
          disabled={disabled || lastPage}
          onClick={() => onNavigate(page + 1)}
        >
          Next
        </Button>
      </Group>
      <Group className="material-pagination-pages" gap={4} wrap="nowrap">
        <Button
          type="button"
          variant="subtle"
          disabled={disabled || lastPage}
          onClick={() => onNavigate(pageCount)}
        >
          Skip to end
        </Button>
        {numbers.map((number) => (
          <Button
            key={number}
            type="button"
            variant={number === page ? 'light' : 'default'}
            aria-current={number === page ? 'page' : undefined}
            aria-label={`Page ${number}`}
            disabled={disabled || number === page}
            onClick={() => onNavigate(number)}
          >
            {number}
          </Button>
        ))}
        {finalVisiblePage < pageCount && (
          <>
            <Text aria-hidden="true" px={4}>
              …
            </Text>
            <span className="visually-hidden">
              More pages after page {finalVisiblePage}
            </span>
          </>
        )}
        <Button
          type="button"
          variant="subtle"
          disabled={disabled || firstPage}
          onClick={() => onNavigate(1)}
        >
          Skip to start
        </Button>
      </Group>
    </Flex>
  );
}
