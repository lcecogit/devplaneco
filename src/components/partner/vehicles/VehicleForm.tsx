"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";

const FUEL_TYPES = ["diesel", "petrol", "electric", "hybrid"] as const;

export type VehicleFormValues = {
  id?: string;
  registration_number: string;
  vehicle_type: string;
  vehicle_category: string;
  make: string;
  model: string;
  crew_capacity: string;
  base_postcode: string;
  payload_kg: string;
  cargo_volume_m3: string;
  max_load_length_m: string;
  has_tail_lift: boolean;
  can_transport_motorbikes: boolean;
  uses_trailer: boolean;
  fuel_type: (typeof FUEL_TYPES)[number] | "";
};

const EMPTY_VALUES: VehicleFormValues = {
  registration_number: "",
  vehicle_type: "",
  vehicle_category: "",
  make: "",
  model: "",
  crew_capacity: "",
  base_postcode: "",
  payload_kg: "",
  cargo_volume_m3: "",
  max_load_length_m: "",
  has_tail_lift: false,
  can_transport_motorbikes: false,
  uses_trailer: false,
  fuel_type: "",
};

function toNumberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function VehicleForm({
  transportPartnerId,
  initialValues,
}: {
  transportPartnerId: string;
  initialValues?: VehicleFormValues;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialValues?.id);
  const [values, setValues] = useState<VehicleFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const payload = {
      transport_partner_id: transportPartnerId,
      registration_number: values.registration_number,
      vehicle_type: values.vehicle_type || null,
      vehicle_category: values.vehicle_category || null,
      make: values.make || null,
      model: values.model || null,
      crew_capacity: toNumberOrNull(values.crew_capacity),
      base_postcode: values.base_postcode || null,
      payload_kg: toNumberOrNull(values.payload_kg),
      cargo_volume_m3: toNumberOrNull(values.cargo_volume_m3),
      max_load_length_m: toNumberOrNull(values.max_load_length_m),
      has_tail_lift: values.has_tail_lift,
      can_transport_motorbikes: values.can_transport_motorbikes,
      uses_trailer: values.uses_trailer,
      fuel_type: values.fuel_type || null,
    };

    if (isEditing && initialValues?.id) {
      const { error: updateError } = await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", initialValues.id);
      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.refresh();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("vehicles")
      .insert(payload)
      .select("id")
      .single();
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/partner/vehicles/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Registration number"
          required
          value={values.registration_number}
          onChange={(e) => set("registration_number", e.target.value)}
        />
        <FormField
          label="Base postcode"
          value={values.base_postcode}
          onChange={(e) => set("base_postcode", e.target.value)}
        />
        <FormField
          label="Vehicle type"
          placeholder="e.g. Luton van, 7.5t truck"
          value={values.vehicle_type}
          onChange={(e) => set("vehicle_type", e.target.value)}
        />
        <FormField
          label="Vehicle category"
          placeholder="e.g. Small van, Large van"
          value={values.vehicle_category}
          onChange={(e) => set("vehicle_category", e.target.value)}
        />
        <FormField label="Make" value={values.make} onChange={(e) => set("make", e.target.value)} />
        <FormField
          label="Model"
          value={values.model}
          onChange={(e) => set("model", e.target.value)}
        />
        <FormField
          label="Crew capacity"
          type="number"
          min={0}
          value={values.crew_capacity}
          onChange={(e) => set("crew_capacity", e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fuelType" className="text-sm font-medium text-ink-800">
            Fuel type
          </label>
          <select
            id="fuelType"
            value={values.fuel_type}
            onChange={(e) => set("fuel_type", e.target.value as VehicleFormValues["fuel_type"])}
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="">Select…</option>
            {FUEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <FormField
          label="Payload (kg)"
          type="number"
          min={0}
          value={values.payload_kg}
          onChange={(e) => set("payload_kg", e.target.value)}
        />
        <FormField
          label="Cargo volume (m³)"
          type="number"
          min={0}
          step="0.1"
          value={values.cargo_volume_m3}
          onChange={(e) => set("cargo_volume_m3", e.target.value)}
        />
        <FormField
          label="Max load length (m)"
          type="number"
          min={0}
          step="0.1"
          value={values.max_load_length_m}
          onChange={(e) => set("max_load_length_m", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-sm text-ink-800">
          <input
            type="checkbox"
            checked={values.has_tail_lift}
            onChange={(e) => set("has_tail_lift", e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Has tail lift
        </label>
        <label className="flex items-center gap-3 text-sm text-ink-800">
          <input
            type="checkbox"
            checked={values.can_transport_motorbikes}
            onChange={(e) => set("can_transport_motorbikes", e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Can transport motorbikes
        </label>
        <label className="flex items-center gap-3 text-sm text-ink-800">
          <input
            type="checkbox"
            checked={values.uses_trailer}
            onChange={(e) => set("uses_trailer", e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Uses a trailer
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : isEditing ? "Save changes" : "Add vehicle"}
      </button>
    </form>
  );
}
