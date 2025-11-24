import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string;
  reason: string;
  status: string;
  handledBy: string | null;
  createdAt: string;
}

export function AdminReportsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const response = await fetch("/api/reports?status=PENDING", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  // Handle report mutation
  const handleReportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update report", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async ({ postId, reportId }: { postId: string; reportId: string }) => {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete post");
      return { reportId };
    },
    onSuccess: async (_, variables) => {
      toast({ title: "Post deleted successfully" });
      try {
        await handleReportMutation.mutateAsync({ id: variables.reportId, status: "RESOLVED" });
      } catch {
        toast({ title: "Post deleted but failed to update report", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: () => {
      toast({ title: "Failed to delete post", variant: "destructive" });
    },
  });

  const handleApprove = (reportId: string) => {
    handleReportMutation.mutate({ id: reportId, status: "RESOLVED" });
  };

  const handleReject = (reportId: string) => {
    handleReportMutation.mutate({ id: reportId, status: "DISMISSED" });
  };

  const getContentLink = (targetType: string, targetId: string) => {
    switch (targetType) {
      case "ARTICLE":
        return `/articles/${targetId}`;
      case "POST":
        return `/posts/${targetId}`;
      case "COMMENT":
        return null; // Comments don't have direct links
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports Management</CardTitle>
        <CardDescription>Review and handle user-submitted reports</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending reports</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: Report) => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <Badge variant="outline">{report.targetType}</Badge>
                        <Badge variant={report.status === "PENDING" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">Reason: {report.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported on {new Date(report.createdAt).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          Target ID: {report.targetId}
                        </p>
                        {getContentLink(report.targetType, report.targetId) && (
                          <Link href={getContentLink(report.targetType, report.targetId)!}>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(report.id)}
                        disabled={handleReportMutation.isPending || deletePostMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(report.id)}
                        disabled={handleReportMutation.isPending || deletePostMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                      {report.targetType === "POST" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePostMutation.mutate({ postId: report.targetId, reportId: report.id })}
                          disabled={deletePostMutation.isPending || handleReportMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletePostMutation.isPending ? "Deleting..." : "Delete Post"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
