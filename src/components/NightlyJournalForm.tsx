import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface NightlyJournalFormProps {
  onSubmit: (journal: {
    rose: string;
    bud: string;
    thorn: string;
  }) => void;
}

export const NightlyJournalForm = ({ onSubmit }: NightlyJournalFormProps) => {
  const [rose, setRose] = useState("");
  const [bud, setBud] = useState("");
  const [thorn, setThorn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ rose, bud, thorn });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rose">
          🌹 Rose (What was the best part of your day?)
        </Label>
        <Textarea
          id="rose"
          value={rose}
          onChange={(e) => setRose(e.target.value)}
          placeholder="Share a highlight or something that brought you joy today..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bud">
          🌱 Bud (What are you looking forward to?)
        </Label>
        <Textarea
          id="bud"
          value={bud}
          onChange={(e) => setBud(e.target.value)}
          placeholder="Share something you're excited about or hoping for..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thorn">
          🌵 Thorn (What challenged you today?)
        </Label>
        <Textarea
          id="thorn"
          value={thorn}
          onChange={(e) => setThorn(e.target.value)}
          placeholder="Share a difficulty or something you'd like to improve..."
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Submit Journal Entry
      </Button>
    </form>
  );
};
