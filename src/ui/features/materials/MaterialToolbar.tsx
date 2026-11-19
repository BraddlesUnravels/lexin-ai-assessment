import { Button, Group, Select, Text, TextInput } from '@mantine/core';
import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
} from '../../../shared/material-values.ts';
import type { MaterialViewState } from './url-state.ts';
import type { PlantRecord } from './types.ts';

type MaterialToolbarProps = {
  state: MaterialViewState;
  plants: PlantRecord[] | undefined;
  plantsPending: boolean;
  plantsError: boolean;
  searchTooLong: boolean;
  hasFilters: boolean;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string | null) => void;
  onMaterialTypeChange: (materialType: string | null) => void;
  onPlantCodeChange: (plantCode: string | null) => void;
  onClear: () => void;
  onRetryPlants: () => void;
};

export function MaterialToolbar({
  state,
  plants,
  plantsPending,
  plantsError,
  searchTooLong,
  hasFilters,
  onSearchChange,
  onStatusChange,
  onMaterialTypeChange,
  onPlantCodeChange,
  onClear,
  onRetryPlants,
}: MaterialToolbarProps) {
  const plantOptions = (plants ?? []).map((plant) => ({
    value: plant.plantCode,
    label: `${plant.plantCode} · ${plant.city}`,
  }));
  const selectedPlantExists = plantOptions.some(
    (plant) => plant.value === state.plantCode,
  );

  if (state.plantCode && !selectedPlantExists) {
    plantOptions.push({
      value: state.plantCode,
      label: plantsError
        ? `Plant ${state.plantCode}`
        : `Unknown plant (${state.plantCode})`,
    });
  }

  return (
    <section className="material-toolbar" aria-label="Material filters">
      <TextInput
        label="Search"
        placeholder="Material no., description or MPN"
        value={state.search}
        maxLength={200}
        error={
          searchTooLong
            ? 'Search must be 200 characters or fewer. Shorten it to continue.'
            : undefined
        }
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />
      <Select
        label="Status"
        aria-label="Status"
        value={state.status || null}
        placeholder="All statuses"
        data={MATERIAL_STATUSES.map((status) => ({
          value: status,
          label: status,
        }))}
        clearable
        onChange={onStatusChange}
      />
      <Select
        label="Material type"
        aria-label="Material type"
        value={state.materialType || null}
        placeholder="All types"
        data={MATERIAL_TYPES.map((materialType) => ({
          value: materialType,
          label: materialType,
        }))}
        clearable
        onChange={onMaterialTypeChange}
      />
      <div className="material-plant-filter">
        <Select
          label="In stock at"
          aria-label="In stock at"
          value={state.plantCode || null}
          placeholder="All plants"
          data={plantOptions}
          searchable
          clearable
          nothingFoundMessage="No plants found"
          onChange={onPlantCodeChange}
        />
        {plantsPending && (
          <Text size="xs" c="dimmed" role="status">
            Loading plants…
          </Text>
        )}
        {plantsError && (
          <Group gap="xs" mt={4}>
            <Text size="xs" c="red" role="alert">
              Plant options could not be loaded.
            </Text>
            <Button
              type="button"
              variant="subtle"
              size="compact-xs"
              onClick={onRetryPlants}
            >
              Retry plants
            </Button>
          </Group>
        )}
      </div>
      <Button
        type="button"
        variant="default"
        className="material-clear-filters"
        disabled={!hasFilters}
        onClick={onClear}
      >
        Clear search and filters
      </Button>
    </section>
  );
}
