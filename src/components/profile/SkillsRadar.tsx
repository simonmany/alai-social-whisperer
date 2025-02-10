
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Palette, Map, Activity, Music } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SkillsRadarProps {
  skills: {
    gourmand: number;
    aesthete: number;
    traveler: number;
    athlete: number;
    reveler: number;
  };
}

export const SkillsRadar = ({ skills }: SkillsRadarProps) => {
  // Enhanced debugging
  console.log("SkillsRadar received raw skills:", skills);
  console.log("SkillsRadar skills values:", {
    gourmand: Number(skills.gourmand) || 0,
    aesthete: Number(skills.aesthete) || 0,
    traveler: Number(skills.traveler) || 0,
    athlete: Number(skills.athlete) || 0,
    reveler: Number(skills.reveler) || 0
  });

  const data = [
    {
      subject: "Gourmand",
      value: Number(skills.gourmand) || 0,
      icon: <Utensils className="h-4 w-4" />,
    },
    {
      subject: "Aesthete",
      value: Number(skills.aesthete) || 0,
      icon: <Palette className="h-4 w-4" />,
    },
    {
      subject: "Traveler",
      value: Number(skills.traveler) || 0,
      icon: <Map className="h-4 w-4" />,
    },
    {
      subject: "Athlete",
      value: Number(skills.athlete) || 0,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      subject: "Reveler",
      value: Number(skills.reveler) || 0,
      icon: <Music className="h-4 w-4" />,
    },
  ];

  // Add console log to debug transformed data
  console.log("SkillsRadar chart data:", data);

  return (
    <Card>
      <CardHeader className="pb-0 pt-3">
        <CardTitle className="text-lg">Growth</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="subject"
                tick={({ x, y, payload }) => {
                  const icon = data.find(d => d.subject === payload.value)?.icon;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <foreignObject
                        x="-12"
                        y="-12"
                        width="24"
                        height="24"
                        style={{ color: "var(--primary)" }}
                      >
                        <div className="flex h-full w-full items-center justify-center">
                          {icon}
                        </div>
                      </foreignObject>
                    </g>
                  );
                }}
              />
              <Tooltip />
              <Radar
                name="Skill Level"
                dataKey="value"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
