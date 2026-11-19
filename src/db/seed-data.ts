import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
} from '../shared/material-values.ts';
import type { materials, plantCatalogue, plants } from './schema.ts';

type MaterialType = (typeof MATERIAL_TYPES)[number];
type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
type MaterialSeed = typeof materials.$inferInsert;
type PlantCatalogueSeed = typeof plantCatalogue.$inferInsert;

type ProductFamily = {
  code: string;
  manufacturerName: string | null;
  materialType: MaterialType;
  units: readonly string[];
  minPriceCents: number;
  maxPriceCents: number;
  minQuantity: number;
  maxQuantity: number;
  common: boolean;
  description: (variant: number) => string;
};

const PLANTS: (typeof plants.$inferInsert)[] = [
  {
    plantCode: '3000',
    name: 'Melbourne Distribution Centre',
    city: 'Melbourne',
    state: 'VIC',
  },
  {
    plantCode: '2000',
    name: 'Sydney Warehouse',
    city: 'Sydney',
    state: 'NSW',
  },
  {
    plantCode: '4000',
    name: 'Brisbane Service Warehouse',
    city: 'Brisbane',
    state: 'QLD',
  },
  {
    plantCode: '6000',
    name: 'Perth Warehouse',
    city: 'Perth',
    state: 'WA',
  },
];

const PLANT_WEIGHTS = [
  { plantCode: '3000', weight: 35 },
  { plantCode: '2000', weight: 30 },
  { plantCode: '4000', weight: 25 },
  { plantCode: '6000', weight: 10 },
] as const;

const BEARING_DIMENSIONS = [
  [25, 52, 15],
  [30, 62, 16],
  [35, 72, 17],
  [40, 80, 18],
  [45, 85, 19],
  [50, 90, 20],
  [20, 47, 14],
  [17, 40, 12],
  [15, 35, 11],
  [12, 32, 10],
  [55, 100, 21],
  [60, 110, 22],
] as const;

const DEEP_GROOVE_BEARINGS: ProductFamily = {
  code: 'DGB',
  manufacturerName: 'Apex Motion (Synthetic)',
  materialType: 'Spare Part',
  units: ['EA'],
  minPriceCents: 850,
  maxPriceCents: 12_500,
  minQuantity: 2,
  maxQuantity: 48,
  common: true,
  description: (variant) => {
    const [bore, outsideDiameter, width] =
      BEARING_DIMENSIONS[variant % BEARING_DIMENSIONS.length];
    const seal = ['2RS seals', 'ZZ shields', 'open race'][variant % 3];
    return `Deep-groove ball bearing, ${bore} mm bore × ${outsideDiameter} mm OD × ${width} mm width, ${seal}`;
  },
};

const SPARE_PART_FAMILIES: readonly ProductFamily[] = [
  DEEP_GROOVE_BEARINGS,
  {
    code: 'TRB',
    manufacturerName: 'Southern Bearings (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 1_200,
    maxPriceCents: 24_000,
    minQuantity: 1,
    maxQuantity: 28,
    common: true,
    description: (variant) =>
      `Tapered roller bearing set, ${25 + (variant % 8) * 5} mm bore, ${55 + (variant % 9) * 5} mm cup OD`,
  },
  {
    code: 'HSG',
    manufacturerName: 'Apex Motion (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 2_500,
    maxPriceCents: 42_000,
    minQuantity: 1,
    maxQuantity: 16,
    common: false,
    description: (variant) =>
      `Pillow-block bearing housing, ${20 + (variant % 10) * 5} mm shaft, cast-iron base`,
  },
  {
    code: 'BLT',
    manufacturerName: 'DriveLine Works (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 650,
    maxPriceCents: 7_800,
    minQuantity: 2,
    maxQuantity: 40,
    common: true,
    description: (variant) =>
      `Classical V-belt, profile ${['A', 'B', 'C', 'SPZ'][variant % 4]}, ${600 + (variant % 18) * 50} mm datum length`,
  },
  {
    code: 'CHN',
    manufacturerName: 'DriveLine Works (Synthetic)',
    materialType: 'Spare Part',
    units: ['M'],
    minPriceCents: 1_100,
    maxPriceCents: 9_500,
    minQuantity: 1,
    maxQuantity: 36,
    common: true,
    description: (variant) =>
      `Roller chain, ${['06B', '08B', '10B', '12B'][variant % 4]} pitch, carbon steel, cut length`,
  },
  {
    code: 'SPK',
    manufacturerName: 'DriveLine Works (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 1_400,
    maxPriceCents: 15_000,
    minQuantity: 1,
    maxQuantity: 20,
    common: false,
    description: (variant) =>
      `Roller-chain sprocket, ${12 + (variant % 25)} teeth, ${['06B', '08B', '10B'][variant % 3]} chain`,
  },
  {
    code: 'OIL',
    manufacturerName: 'SealPoint (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 180,
    maxPriceCents: 3_900,
    minQuantity: 4,
    maxQuantity: 120,
    common: true,
    description: (variant) =>
      `Rotary shaft oil seal, ${12 + (variant % 20) * 2} mm shaft × ${24 + (variant % 18) * 2} mm housing`,
  },
  {
    code: 'HYD',
    manufacturerName: 'HydraLink (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 950,
    maxPriceCents: 18_000,
    minQuantity: 2,
    maxQuantity: 40,
    common: false,
    description: (variant) =>
      `Hydraulic adaptor, ${['BSP', 'JIC', 'ORFS'][variant % 3]} ${['1/4', '3/8', '1/2', '3/4'][variant % 4]} inch, carbon steel`,
  },
  {
    code: 'CPL',
    manufacturerName: 'DriveLine Works (Synthetic)',
    materialType: 'Spare Part',
    units: ['EA'],
    minPriceCents: 2_200,
    maxPriceCents: 32_000,
    minQuantity: 1,
    maxQuantity: 18,
    common: false,
    description: (variant) =>
      `Flexible jaw coupling, ${12 + (variant % 15) * 2} mm bore, ${['NBR', 'urethane'][variant % 2]} spider`,
  },
];

const CONSUMABLE_FAMILIES: readonly ProductFamily[] = [
  {
    code: 'DIS',
    manufacturerName: 'Workshop Supply Co (Synthetic)',
    materialType: 'Consumable',
    units: ['EA'],
    minPriceCents: 250,
    maxPriceCents: 2_200,
    minQuantity: 12,
    maxQuantity: 240,
    common: true,
    description: (variant) =>
      `${['Cutting', 'Grinding', 'Flap'][variant % 3]} disc, ${100 + (variant % 8) * 25} mm diameter, ${variant % 2 === 0 ? 'steel' : 'stainless'} rated`,
  },
  {
    code: 'THR',
    manufacturerName: 'Workshop Supply Co (Synthetic)',
    materialType: 'Consumable',
    units: ['EA'],
    minPriceCents: 1_100,
    maxPriceCents: 5_800,
    minQuantity: 3,
    maxQuantity: 48,
    common: true,
    description: (variant) =>
      `Threadlocker, ${['low', 'medium', 'high'][variant % 3]} strength, ${10 + (variant % 6) * 5} mL bottle`,
  },
  {
    code: 'OIL',
    manufacturerName: 'Workshop Supply Co (Synthetic)',
    materialType: 'Consumable',
    units: ['L'],
    minPriceCents: 750,
    maxPriceCents: 4_800,
    minQuantity: 1,
    maxQuantity: 80,
    common: true,
    description: (variant) =>
      `Hydraulic oil, ISO VG ${[32, 46, 68][variant % 3]}, bulk dispensing stock`,
  },
  {
    code: 'GRS',
    manufacturerName: 'Workshop Supply Co (Synthetic)',
    materialType: 'Consumable',
    units: ['KG'],
    minPriceCents: 1_200,
    maxPriceCents: 6_200,
    minQuantity: 1,
    maxQuantity: 55,
    common: true,
    description: (variant) =>
      `${['Lithium EP2', 'Calcium sulphonate', 'Moly EP2'][variant % 3]} grease, workshop bulk`,
  },
  {
    code: 'ANT',
    manufacturerName: 'Workshop Supply Co (Synthetic)',
    materialType: 'Consumable',
    units: ['EA', 'L'],
    minPriceCents: 650,
    maxPriceCents: 3_700,
    minQuantity: 2,
    maxQuantity: 60,
    common: false,
    description: (variant) =>
      `Anti-seize compound, ${['copper', 'nickel', 'ceramic'][variant % 3]} grade, ${100 + (variant % 8) * 50} g pack`,
  },
];

const RAW_MATERIAL_FAMILIES: readonly ProductFamily[] = [
  {
    code: 'MSR',
    manufacturerName: 'Foundry Stock (Synthetic)',
    materialType: 'Raw Material',
    units: ['M', 'KG'],
    minPriceCents: 450,
    maxPriceCents: 3_200,
    minQuantity: 1,
    maxQuantity: 90,
    common: false,
    description: (variant) =>
      `Mild-steel round bar, ${12 + (variant % 18) * 2} mm diameter, cold drawn`,
  },
  {
    code: 'SSF',
    manufacturerName: 'Foundry Stock (Synthetic)',
    materialType: 'Raw Material',
    units: ['KG'],
    minPriceCents: 1_200,
    maxPriceCents: 7_500,
    minQuantity: 1,
    maxQuantity: 80,
    common: false,
    description: (variant) =>
      `Stainless-steel flat bar, ${20 + (variant % 12) * 5} mm × ${3 + (variant % 6)} mm, grade 304`,
  },
  {
    code: 'SHM',
    manufacturerName: null,
    materialType: 'Raw Material',
    units: ['KG'],
    minPriceCents: 1_800,
    maxPriceCents: 9_500,
    minQuantity: 1,
    maxQuantity: 40,
    common: false,
    description: (variant) =>
      `Stainless-steel shim stock offcuts, ${['0.05', '0.10', '0.15', '0.20', '0.25', '0.30', '0.35', '0.40'][variant % 8]} mm sheet, unverified grade`,
  },
  {
    code: 'GKT',
    manufacturerName: 'SealPoint (Synthetic)',
    materialType: 'Raw Material',
    units: ['M', 'KG'],
    minPriceCents: 900,
    maxPriceCents: 5_600,
    minQuantity: 1,
    maxQuantity: 70,
    common: false,
    description: (variant) =>
      `Compressed gasket sheet, ${1 + (variant % 9)} mm thickness, ${['NBR', 'graphite', 'cork'][variant % 3]} roll stock`,
  },
];

const TOOL_FAMILIES: readonly ProductFamily[] = [
  {
    code: 'PUL',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['EA'],
    minPriceCents: 3_500,
    maxPriceCents: 28_000,
    minQuantity: 1,
    maxQuantity: 12,
    common: false,
    description: (variant) =>
      `Two-jaw bearing puller, ${75 + (variant % 12) * 25} mm reach, forged steel`,
  },
  {
    code: 'TQW',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['EA'],
    minPriceCents: 8_500,
    maxPriceCents: 62_000,
    minQuantity: 1,
    maxQuantity: 8,
    common: false,
    description: (variant) =>
      `Click torque wrench, ${['1/4', '3/8', '1/2'][variant % 3]} inch drive, ${5 + (variant % 12) * 5}-${30 + (variant % 14) * 10} Nm range`,
  },
  {
    code: 'CIR',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['EA', 'SET'],
    minPriceCents: 1_800,
    maxPriceCents: 16_000,
    minQuantity: 1,
    maxQuantity: 15,
    common: false,
    description: (variant) =>
      `Circlip pliers, ${['straight', '45 degree', '90 degree'][variant % 3]} tip, ${140 + (variant % 5) * 20} mm`,
  },
  {
    code: 'GRG',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['EA'],
    minPriceCents: 2_400,
    maxPriceCents: 19_500,
    minQuantity: 1,
    maxQuantity: 10,
    common: false,
    description: (variant) =>
      `${variant % 2 === 0 ? 'Lever' : 'Pistol'} grease gun, ${400 + (variant % 8) * 100} g cartridge`,
  },
  {
    code: 'CAL',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['EA'],
    minPriceCents: 2_900,
    maxPriceCents: 24_000,
    minQuantity: 1,
    maxQuantity: 9,
    common: false,
    description: (variant) =>
      `Digital calliper, ${150 + (variant % 4) * 50} mm range, ${['0.01', '0.02', '0.03'][variant % 3]} mm resolution`,
  },
  {
    code: 'SOC',
    manufacturerName: 'BenchPro Tools (Synthetic)',
    materialType: 'Tool',
    units: ['SET'],
    minPriceCents: 4_500,
    maxPriceCents: 38_000,
    minQuantity: 1,
    maxQuantity: 8,
    common: false,
    description: (variant) =>
      `Socket set, ${variant % 2 === 0 ? '1/4' : '3/8'} inch drive, ${10 + (variant % 15)} piece metric set`,
  },
];

const FAMILY_GROUPS: Readonly<Record<MaterialType, readonly ProductFamily[]>> =
  {
    'Spare Part': SPARE_PART_FAMILIES,
    Consumable: CONSUMABLE_FAMILIES,
    'Raw Material': RAW_MATERIAL_FAMILIES,
    Tool: TOOL_FAMILIES,
  };

const GENERATED_COUNTS: Readonly<Record<MaterialType, number>> = {
  'Spare Part': 2_999,
  Consumable: 1_100,
  'Raw Material': 499,
  Tool: 400,
};

const PLANT_CODES = new Set(PLANTS.map((plant) => plant.plantCode));
const RANDOM_SEED = 20_260_619;

export type SeedData = {
  plants: (typeof plants.$inferInsert)[];
  materials: MaterialSeed[];
  plantCatalogue: PlantCatalogueSeed[];
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function randomInteger(
  random: () => number,
  minimum: number,
  maximum: number,
): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function formatThousandths(value: number): string {
  return `${Math.floor(value / 1_000)}.${String(value % 1_000).padStart(3, '0')}`;
}

function createMaterialNumberGenerator(): () => string {
  let nextId = 1;
  return () => {
    while (nextId === 123 || nextId === 124) {
      nextId += 1;
    }
    return `MAT-${String(nextId++).padStart(6, '0')}`;
  };
}

function selectPlants(
  random: () => number,
  family: ProductFamily,
  plantRowCounts: Map<string, number>,
): string[] {
  const desiredCount = family.common
    ? random() < 0.35
      ? 4
      : 3
    : random() < 0.4
      ? 2
      : 1;
  const selected = new Set<string>();

  while (selected.size < desiredCount) {
    const available = PLANT_WEIGHTS.filter(
      ({ plantCode }) => !selected.has(plantCode),
    );
    // Balance extra site rows to preserve target plant shares.
    const leastLoaded = Math.min(
      ...available.map(
        ({ plantCode, weight }) =>
          (plantRowCounts.get(plantCode) ?? 0) / weight,
      ),
    );
    const candidates = available.filter(
      ({ plantCode, weight }) =>
        (plantRowCounts.get(plantCode) ?? 0) / weight === leastLoaded,
    );
    const totalWeight = candidates.reduce(
      (sum, plant) => sum + plant.weight,
      0,
    );
    let choice = random() * totalWeight;
    for (const plant of candidates) {
      choice -= plant.weight;
      if (choice < 0) {
        selected.add(plant.plantCode);
        plantRowCounts.set(
          plant.plantCode,
          (plantRowCounts.get(plant.plantCode) ?? 0) + 1,
        );
        break;
      }
    }
  }

  return [...selected];
}

function makeGeneratedMaterial(
  materialNumber: string,
  family: ProductFamily,
  variant: number,
  random: () => number,
  generatedIndex: number,
): MaterialSeed {
  const status: MaterialStatus =
    generatedIndex % 43 === 0
      ? 'Obsolete'
      : generatedIndex % 11 === 0
        ? 'Pending Review'
        : 'Active';
  const unitOfMeasure = family.units[variant % family.units.length];
  const priceMissing = random() < 0.025 || status === 'Pending Review';
  const priceCents = randomInteger(
    random,
    family.minPriceCents,
    family.maxPriceCents,
  );
  const timestampDay = generatedIndex % 365;

  return {
    materialNumber,
    description: family.description(variant),
    materialType: family.materialType,
    status,
    manufacturerName: family.manufacturerName,
    manufacturerPartNumber: family.manufacturerName
      ? `SYN-${family.code}-${String(variant + 1).padStart(5, '0')}`
      : null,
    unitOfMeasure,
    unitPriceAud: priceMissing ? null : formatCents(priceCents),
    updatedAt: new Date(Date.UTC(2025, 0, 1 + timestampDay)),
  };
}

function appendBalances(
  balances: PlantCatalogueSeed[],
  material: MaterialSeed,
  family: ProductFamily,
  random: () => number,
  plantRowCounts: Map<string, number>,
): void {
  const plantCodes = selectPlants(random, family, plantRowCounts);

  for (const plantCode of plantCodes) {
    const unitIsWhole =
      material.unitOfMeasure === 'EA' || material.unitOfMeasure === 'SET';
    const quantityInThousandths =
      random() < 0.04
        ? 0
        : unitIsWhole
          ? randomInteger(random, family.minQuantity, family.maxQuantity) *
            1_000
          : randomInteger(
              random,
              family.minQuantity * 1_000,
              family.maxQuantity * 1_000,
            );

    balances.push({
      materialNumber: material.materialNumber,
      plantCode,
      quantityOnHand: formatThousandths(quantityInThousandths),
    });
  }
}

function appendFixtureBalances(
  balances: PlantCatalogueSeed[],
  materialNumber: string,
  quantities: readonly { plantCode: string; quantityOnHand: string }[],
): void {
  for (const balance of quantities) {
    balances.push({ materialNumber, ...balance });
  }
}

export function generateSeedData(): SeedData {
  const random = createRandom(RANDOM_SEED);
  const nextMaterialNumber = createMaterialNumberGenerator();
  const materials: MaterialSeed[] = [];
  const plantCatalogue: PlantCatalogueSeed[] = [];
  const plantRowCounts = new Map(
    PLANT_WEIGHTS.map(({ plantCode }) => [plantCode, 0]),
  );
  const familyVariantCounts = new Map<string, number>();
  let generatedIndex = 0;

  for (const materialType of MATERIAL_TYPES) {
    const families = FAMILY_GROUPS[materialType];
    for (
      let typeIndex = 0;
      typeIndex < GENERATED_COUNTS[materialType];
      typeIndex += 1
    ) {
      const family = families[typeIndex % families.length];
      const variant = familyVariantCounts.get(family.code) ?? 0;
      familyVariantCounts.set(family.code, variant + 1);
      const material = makeGeneratedMaterial(
        nextMaterialNumber(),
        family,
        variant,
        random,
        generatedIndex,
      );
      materials.push(material);
      appendBalances(plantCatalogue, material, family, random, plantRowCounts);
      generatedIndex += 1;
    }
  }

  const bearingFixture: MaterialSeed = {
    materialNumber: 'MAT-000123',
    description:
      'Deep-groove ball bearing, 25 mm bore × 52 mm OD × 15 mm width',
    materialType: 'Spare Part',
    status: 'Active',
    manufacturerName: 'SKF',
    manufacturerPartNumber: '6205-2RS1',
    unitOfMeasure: 'EA',
    unitPriceAud: '19.95',
    updatedAt: new Date('2025-03-01T00:00:00.000Z'),
  };
  const shimFixture: MaterialSeed = {
    materialNumber: 'MAT-000124',
    description: 'Stainless-steel shim stock offcuts, workshop grade',
    materialType: 'Raw Material',
    status: 'Active',
    manufacturerName: null,
    manufacturerPartNumber: null,
    unitOfMeasure: 'KG',
    unitPriceAud: null,
    updatedAt: new Date('2025-03-02T00:00:00.000Z'),
  };

  materials.push(bearingFixture, shimFixture);
  appendFixtureBalances(plantCatalogue, bearingFixture.materialNumber, [
    { plantCode: '4000', quantityOnHand: '12.000' },
    { plantCode: '3000', quantityOnHand: '28.000' },
    { plantCode: '2000', quantityOnHand: '0.000' },
  ]);
  appendFixtureBalances(plantCatalogue, shimFixture.materialNumber, [
    { plantCode: '4000', quantityOnHand: '0.100' },
    { plantCode: '3000', quantityOnHand: '0.200' },
  ]);

  materials.sort((left, right) =>
    left.materialNumber.localeCompare(right.materialNumber),
  );
  plantCatalogue.sort(
    (left, right) =>
      left.materialNumber.localeCompare(right.materialNumber) ||
      left.plantCode.localeCompare(right.plantCode),
  );

  const result = { plants: PLANTS, materials, plantCatalogue };
  assertValidSeedData(result);
  return result;
}

export function assertValidSeedData(data: SeedData): void {
  const expectedTypeCounts: Readonly<Record<MaterialType, number>> = {
    'Spare Part': 3_000,
    Consumable: 1_100,
    'Raw Material': 500,
    Tool: 400,
  };
  const materialNumbers = new Set<string>();
  const manufacturerParts = new Set<string>();
  const balances = new Set<string>();
  const materialsWithBalances = new Set<string>();
  const actualTypeCounts = new Map<MaterialType, number>();
  const plantCodes = new Set<string>();

  for (const plant of data.plants) {
    if (plantCodes.has(plant.plantCode)) {
      throw new Error(`Duplicate plant code: ${plant.plantCode}`);
    }
    plantCodes.add(plant.plantCode);
  }

  for (const material of data.materials) {
    if (materialNumbers.has(material.materialNumber)) {
      throw new Error(`Duplicate material number: ${material.materialNumber}`);
    }
    materialNumbers.add(material.materialNumber);
    actualTypeCounts.set(
      material.materialType,
      (actualTypeCounts.get(material.materialType) ?? 0) + 1,
    );

    if (material.manufacturerName && material.manufacturerPartNumber) {
      const key = `${material.manufacturerName}\u0000${material.manufacturerPartNumber}`;
      if (manufacturerParts.has(key)) {
        throw new Error(`Duplicate manufacturer part pair: ${key}`);
      }
      manufacturerParts.add(key);
    }
  }

  for (const balance of data.plantCatalogue) {
    const pair = `${balance.materialNumber}\u0000${balance.plantCode}`;
    if (balances.has(pair)) {
      throw new Error(`Duplicate material-plant balance: ${pair}`);
    }
    if (!materialNumbers.has(balance.materialNumber)) {
      throw new Error(
        `Balance has unknown material: ${balance.materialNumber}`,
      );
    }
    if (
      !plantCodes.has(balance.plantCode) ||
      !PLANT_CODES.has(balance.plantCode)
    ) {
      throw new Error(`Balance has unknown plant: ${balance.plantCode}`);
    }
    if (!/^\d+\.\d{3}$/.test(balance.quantityOnHand ?? '')) {
      throw new Error(`Invalid stock decimal for ${pair}`);
    }
    balances.add(pair);
    materialsWithBalances.add(balance.materialNumber);
  }

  for (const material of data.materials) {
    if (!materialsWithBalances.has(material.materialNumber)) {
      throw new Error(
        `Material has no plant balance: ${material.materialNumber}`,
      );
    }
    if (
      material.unitPriceAud !== null &&
      material.unitPriceAud !== undefined &&
      !/^\d+\.\d{2}$/.test(material.unitPriceAud)
    ) {
      throw new Error(`Invalid price decimal: ${material.materialNumber}`);
    }
  }

  if (data.materials.length !== 5_000) {
    throw new Error(`Expected 5000 materials, got ${data.materials.length}`);
  }
  for (const materialType of MATERIAL_TYPES) {
    const expectedCount = expectedTypeCounts[materialType];
    const actualCount = actualTypeCounts.get(materialType) ?? 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} ${materialType} materials, got ${actualCount}`,
      );
    }
  }

  const brisbaneBearingMatches = data.materials.filter((material) => {
    if (
      material.materialType !== 'Spare Part' ||
      material.status !== 'Active' ||
      !material.description.toLowerCase().includes('bearing')
    ) {
      return false;
    }
    return data.plantCatalogue.some(
      (balance) =>
        balance.materialNumber === material.materialNumber &&
        balance.plantCode === '4000' &&
        Number(balance.quantityOnHand) > 0,
    );
  }).length;

  if (brisbaneBearingMatches < 76) {
    throw new Error(
      `Expected at least 76 qualifying Brisbane bearings, got ${brisbaneBearingMatches}`,
    );
  }
}
