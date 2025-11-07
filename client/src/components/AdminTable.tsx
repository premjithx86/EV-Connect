import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, CheckCircle, XCircle, Search } from "lucide-react";

interface Report {
  id: string;
  reporter: string;
  targetType: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    reporter: "John Doe",
    targetType: "POST",
    reason: "Spam content",
    status: "OPEN",
    createdAt: "2024-12-15",
  },
  {
    id: "2",
    reporter: "Jane Smith",
    targetType: "COMMENT",
    reason: "Offensive language",
    status: "RESOLVED",
    createdAt: "2024-12-14",
  },
  {
    id: "3",
    reporter: "Mike Johnson",
    targetType: "USER",
    reason: "Harassment",
    status: "OPEN",
    createdAt: "2024-12-13",
  },
];

export function AdminTable() {
  const getStatusBadge = (status: Report["status"]) => {
    const variants = {
      OPEN: "destructive",
      RESOLVED: "default",
      DISMISSED: "secondary",
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-xl">Content Reports</h3>
          <p className="text-sm text-muted-foreground">Manage flagged content and user reports</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reports..." className="pl-9" data-testid="input-search-reports" />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reporter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REPORTS.map((report) => (
              <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                <TableCell className="font-medium">{report.reporter}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{report.targetType}</Badge>
                </TableCell>
                <TableCell>{report.reason}</TableCell>
                <TableCell>{getStatusBadge(report.status)}</TableCell>
                <TableCell>{report.createdAt}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-${report.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {report.status === "OPEN" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-status-online" data-testid={`button-resolve-${report.id}`}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-dismiss-${report.id}`}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing 1-3 of 23 reports
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
