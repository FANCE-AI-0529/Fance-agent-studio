import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp } from "lucide-react";

interface UserSourceData {
  inviter_id: string;
  inviter_name: string;
  total_invites: number;
  accepted_invites: number;
  pending_invites: number;
  conversion_rate: number;
}

interface UserSourceTableProps {
  data: UserSourceData[];
  isLoading: boolean;
}

export function UserSourceTable({ data, isLoading }: UserSourceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户来源追踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          用户来源追踪
          <Badge variant="secondary" className="ml-auto">
            {data.length} 位邀请人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            暂无邀请数据
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邀请人</TableHead>
                  <TableHead className="text-center">发出邀请</TableHead>
                  <TableHead className="text-center">已接受</TableHead>
                  <TableHead className="text-center">待使用</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.inviter_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {item.inviter_name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[150px]">
                          {item.inviter_name || "未知用户"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.total_invites}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                        {item.accepted_invites}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.pending_invites}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TrendingUp className={`h-4 w-4 ${
                          item.conversion_rate >= 50 ? "text-green-500" : 
                          item.conversion_rate >= 25 ? "text-yellow-500" : "text-muted-foreground"
                        }`} />
                        <span className={`font-medium ${
                          item.conversion_rate >= 50 ? "text-green-500" : 
                          item.conversion_rate >= 25 ? "text-yellow-500" : ""
                        }`}>
                          {item.conversion_rate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
