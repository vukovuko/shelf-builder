import type { RuleAdjustment } from "@/lib/rules";

export const INSTALLATION_SERVICE_VALUES = [
  "prepared-delivery",
  "full-installation",
] as const;

export type InstallationServiceType =
  (typeof INSTALLATION_SERVICE_VALUES)[number];

export const INSTALLATION_ROUNDING_STEP = 2000;
export const INSTALLATION_BASE_FEE = 12000;

export const INSTALLATION_SERVICE_OPTIONS: Array<{
  value: InstallationServiceType;
  label: string;
  description: string;
  rate: number;
  baseFee: number;
}> = [
  {
    value: "prepared-delivery",
    label: "Dostava bez montaže, sa pripremom materijala",
    description:
      "Materijal dolazi pripremljen za montažu po sistemu sličnom IKEA rešenju.",
    rate: 0.1,
    baseFee: INSTALLATION_BASE_FEE,
  },
  {
    value: "full-installation",
    label: "Full montaža i transport",
    description: "Montaža i transport na teritoriji Beograda i okoline.",
    rate: 0.4,
    baseFee: INSTALLATION_BASE_FEE,
  },
];

export function isInstallationServiceType(
  value: string,
): value is InstallationServiceType {
  return INSTALLATION_SERVICE_OPTIONS.some((option) => option.value === value);
}

export function roundUpToStep(value: number, step: number): number {
  if (value <= 0) {
    return 0;
  }

  return Math.ceil(value / step) * step;
}

export function getInstallationServiceOption(type: InstallationServiceType) {
  return INSTALLATION_SERVICE_OPTIONS.find((option) => option.value === type);
}

export function buildInstallationServiceAdjustment(
  subtotal: number,
  serviceType: InstallationServiceType | "" | null | undefined,
): RuleAdjustment | null {
  if (!serviceType || !isInstallationServiceType(serviceType)) {
    return null;
  }

  const option = getInstallationServiceOption(serviceType);
  if (!option) {
    return null;
  }

  const amount = roundUpToStep(
    option.baseFee + subtotal * option.rate,
    INSTALLATION_ROUNDING_STEP,
  );

  return {
    ruleId: `installation:${serviceType}`,
    ruleName: "Usluga montaže",
    actionType: "surcharge_fixed",
    description: option.label,
    amount,
    visible: true,
  };
}
