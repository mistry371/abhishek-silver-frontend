"use client";

import { SelectField, TextField } from "@/components/ui/Field";
import { indianStates, isValidIndianMobile, isValidPostalCode } from "@/lib/validation";
import type { AddressInput } from "@/types/customer";

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export const emptyAddress: AddressInput = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export function validateAddress(address: AddressInput): AddressErrors {
  const errors: AddressErrors = {};
  if (!address.fullName.trim()) errors.fullName = "Enter the recipient's full name.";
  if (!isValidIndianMobile(address.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (!address.line1.trim()) errors.line1 = "Enter the house / flat number and street.";
  if (!address.city.trim()) errors.city = "Enter the city.";
  if (!address.state) errors.state = "Select the state.";
  if (!isValidPostalCode(address.postalCode)) errors.postalCode = "Enter a valid 6-digit PIN code.";
  return errors;
}

export function AddressFields({
  value,
  onChange,
  errors = {},
  idPrefix,
}: {
  value: AddressInput;
  onChange: (value: AddressInput) => void;
  errors?: AddressErrors;
  idPrefix: string;
}) {
  const set = (key: keyof AddressInput) => (event: { target: { value: string } }) => onChange({ ...value, [key]: event.target.value });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField id={`${idPrefix}-name`} label="Full name" required autoComplete="name" value={value.fullName} onChange={set("fullName")} error={errors.fullName} />
      <TextField
        id={`${idPrefix}-phone`}
        label="Mobile number"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value.phone}
        onChange={set("phone")}
        error={errors.phone}
      />
      <TextField
        id={`${idPrefix}-line1`}
        label="House / flat, street"
        required
        autoComplete="address-line1"
        value={value.line1}
        onChange={set("line1")}
        error={errors.line1}
        containerClassName="sm:col-span-2"
      />
      <TextField id={`${idPrefix}-line2`} label="Area / locality" optional autoComplete="address-line2" value={value.line2 ?? ""} onChange={set("line2")} />
      <TextField id={`${idPrefix}-landmark`} label="Landmark" optional value={value.landmark ?? ""} onChange={set("landmark")} />
      <TextField id={`${idPrefix}-city`} label="City" required autoComplete="address-level2" value={value.city} onChange={set("city")} error={errors.city} />
      <SelectField
        id={`${idPrefix}-state`}
        label="State"
        required
        autoComplete="address-level1"
        value={value.state}
        onChange={set("state")}
        error={errors.state}
        placeholder="Select state"
        options={indianStates.map((state) => ({ value: state, label: state }))}
      />
      <TextField
        id={`${idPrefix}-postal`}
        label="PIN code"
        required
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={value.postalCode}
        onChange={set("postalCode")}
        error={errors.postalCode}
      />
      <TextField id={`${idPrefix}-country`} label="Country" value={value.country} disabled readOnly />
    </div>
  );
}

export function formatAddress(address: AddressInput) {
  return [address.line1, address.line2, address.landmark, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
    .filter(Boolean)
    .join(", ");
}
