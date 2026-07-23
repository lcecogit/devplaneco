"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";

type Vehicle = { id: string; registration_number: string };
type Direction = "outbound" | "return" | "both";

export function RouteForm({
  transportPartnerId,
  vehicles,
  initialValues,
}: {
  transportPartnerId: string;
  vehicles: Vehicle[];
  initialValues?: {
    id: string;
    vehicle_id: string | null;
    date: string;
    start_postcode: string;
    end_postcode: string;
    direction: Direction;
    team_size: string;
  };
}) {
  const router = useRouter();
  const isEditing = Boolean(initialValues?.id);
  const [vehicleId, setVehicleId] = useState(initialValues?.vehicle_id ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [startPostcode, setStartPostcode] = useState(initialValues?.start_postcode ?? "");
  const [endPostcode, setEndPostcode] = useState(initialValues?.end_postcode ?? "");
  const [direction, setDirection] = useState<Direction>(initialValues?.direction ?? "both");
  const [teamSize, setTeamSize] = useState(initialValues?.team_size ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const payload = {
      transport_partner_id: transportPartnerId,
      vehicle_id: vehicleId || null,
      date,
      start_postcode: startPostcode,
      end_postcode: endPostcode,
      direction,
      team_size: teamSize ? Number(teamSize) : null,
    };

    const { error: saveError } = isEditing
      ? await supabase.from("routes").update(payload).eq("id", initialValues!.id)
      : await supabase.from("routes").insert(payload);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    router.push("/partner/routes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle" className="text-sm font-medium text-ink-800">
          Vehicle (optional)
        </label>
        <select
          id="vehicle"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          <option value="">Any vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registration_number}
            </option>
          ))}
        </select>
      </div>

      <FormField
        label="Date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Start postcode"
          required
          value={startPostcode}
          onChange={(e) => setStartPostcode(e.target.value)}
        />
        <FormField
          label="End postcode"
          required
          value={endPostcode}
          onChange={(e) => setEndPostcode(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-800">Direction</span>
        <div className="flex gap-4">
          {(["outbound", "return", "both"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm capitalize text-ink-800">
              <input
                type="radio"
                name="direction"
                checked={direction === option}
                onChange={() => setDirection(option)}
                className="accent-brand-600"
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      <FormField
        label="Team size"
        type="number"
        min={1}
        value={teamSize}
        onChange={(e) => setTeamSize(e.target.value)}
      />

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
        {saving ? "Saving…" : isEditing ? "Save changes" : "Save route"}
      </button>
    </form>
  );
}
