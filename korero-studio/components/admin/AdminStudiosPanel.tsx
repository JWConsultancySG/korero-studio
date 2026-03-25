"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminStudiosPanel() {
  const { studios } = useApp();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4 bg-card/50">
      <p className="text-sm font-black text-foreground">Studios</p>
      <div className="grid gap-3 md:grid-cols-2">
        {studios.map((studio) => (
          <div key={studio.id} className="rounded-xl border border-border p-3">
            <p className="font-bold">{studio.name}</p>
            <p className="text-xs text-muted-foreground">{studio.location}</p>
            <p className="text-xs text-muted-foreground">{studio.address}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio name" />
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        <Button type="button" variant="outline" disabled>
          Add studio (migration ready; API wiring next)
        </Button>
      </div>
    </div>
  );
}
