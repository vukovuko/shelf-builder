"use client";

import type { InputHTMLAttributes } from "react";
import { useTypedNumber } from "@/hooks/use-typed-number";

type TypedNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "min" | "max" | "onChange"
> & {
  value: number;
  min: number;
  max: number;
  onValue: (value: number) => void;
};

/** Plain number input that can be typed into (see useTypedNumber). */
export function TypedNumberInput({
  value,
  min,
  max,
  onValue,
  ...rest
}: TypedNumberInputProps) {
  const field = useTypedNumber({ value, min, max, onValue });
  return <input {...rest} {...field} />;
}
