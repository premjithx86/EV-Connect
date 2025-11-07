import { AdminStats } from "@/components/AdminStats";
import { AdminTable } from "@/components/AdminTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, MessageSquare, Zap, FileText } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="font-display font-bold text-3xl">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, content, and platform settings
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <AdminStats />

          <Tabs defaultValue="reports" className="w-full">
            <TabsList>
              <TabsTrigger value="reports" className="gap-2" data-testid="tab-reports">
                <Shield className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="communities" className="gap-2" data-testid="tab-communities">
                <MessageSquare className="h-4 w-4" />
                Communities
              </TabsTrigger>
              <TabsTrigger value="stations" className="gap-2" data-testid="tab-stations">
                <Zap className="h-4 w-4" />
                Stations
              </TabsTrigger>
              <TabsTrigger value="articles" className="gap-2" data-testid="tab-articles">
                <FileText className="h-4 w-4" />
                Articles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="mt-6">
              <AdminTable />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                User management interface will be displayed here
              </div>
            </TabsContent>

            <TabsContent value="communities" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Community management interface will be displayed here
              </div>
            </TabsContent>

            <TabsContent value="stations" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Station verification interface will be displayed here
              </div>
            </TabsContent>

            <TabsContent value="articles" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Article CMS will be displayed here
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
