"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";

type Vehicle = { id: string; registration_number: string };

export function ReservationForm({
  transportPartnerId,
  vehicles,
}: {
  transportPartnerId: string;
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [type, setType] = useState<"full_day" | "custom">("full_day");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startPostcode, setStartPostcode] = useState("");
  const [endPostcode, setEndPostcode] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError("Add a vehicle before creating a reservation.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("reservations").insert({
      transport_partner_id: transportPartnerId,
      vehicle_id: vehicleId,
      type,
      date,
      start_time: type === "custom" ? startTime || null : null,
      end_time: type === "custom" ? endTime || null : null,
      start_postcode: startPostcode || null,
      end_postcode: endPostcode || null,
      min_price: minPrice ? Number(minPrice) : null,
      max_price: maxPrice ? Number(maxPrice) : null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/partner/reservations");
    router.refresh();
  }

  if (!vehicles.length) {
    return (
      <p className="text-sm text-ink-700">
        You need at least one vehicle before you can create a reservation.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle" className="text-sm font-medium text-ink-800">
          Vehicle
        </label>
        <select
          id="vehicle"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registration_number}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-800">Reservation type</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="radio"
              name="type"
              checked={type === "full_day"}
              onChange={() => setType("full_day")}
              className="accent-brand-600"
            />
            Full day
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="radio"
              name="type"
              checked={type === "custom"}
              onChange={() => setType("custom")}
              className="accent-brand-600"
            />
            Custom hours
          </label>
        </div>
      </div>

      <FormField
        label="Date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {type === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Start time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <FormField
            label="End time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Start postcode"
          value={startPostcode}
          onChange={(e) => setStartPostcode(e.target.value)}
        />
        <FormField
          label="End postcode"
          value={endPostcode}
          onChange={(e) => setEndPostcode(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Minimum price (£)"
          type="number"
          min={0}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <FormField
          label="Maximum price (£)"
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
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
        {saving ? "Saving…" : "Create reservation"}
      </button>
    </form>
  );
}
