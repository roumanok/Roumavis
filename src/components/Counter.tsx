"use client";
import { useEffect, useState } from "react";
import { relationshipDuration } from "@/lib/time";
export default function Counter() {
  const [duration, setDuration] = useState<ReturnType<
    typeof relationshipDuration
  > | null>(null);
  useEffect(() => {
    const update = () => setDuration(relationshipDuration());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  if (!duration)
    return (
      <div className="counter" aria-label="Calculando nuestro tiempo juntos" />
    );
  const parts = [
    [duration.years, "años"],
    [duration.months, "meses"],
    [duration.days, "días"],
    [duration.hours, "horas"],
    [duration.minutes, "minutos"],
    [duration.seconds, "segundos"],
  ] as const;
  return (
    <div className="counter" aria-label="Tiempo juntos">
      {parts.map(([value, unit]) => (
        <div key={unit}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{unit}</span>
        </div>
      ))}
    </div>
  );
}
