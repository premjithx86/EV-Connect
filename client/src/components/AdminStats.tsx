import { Card } from "@/components/ui/card";
import { Users, MessageSquare, AlertCircle, Zap, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-4xl font-bold mb-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-status-online' : 'text-destructive'}`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function AdminStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Users"
        value="12,845"
        icon={<Users className="h-6 w-6" />}
        trend={{ value: "+12.5%", isPositive: true }}
      />
      <StatCard
        title="Active Communities"
        value="284"
        icon={<MessageSquare className="h-6 w-6" />}
        trend={{ value: "+8.2%", isPositive: true }}
      />
      <StatCard
        title="Pending Reports"
        value="23"
        icon={<AlertCircle className="h-6 w-6" />}
        trend={{ value: "-15.3%", isPositive: true }}
      />
      <StatCard
        title="Verified Stations"
        value="1,429"
        icon={<Zap className="h-6 w-6" />}
        trend={{ value: "+21.7%", isPositive: true }}
      />
    </div>
  );
}
