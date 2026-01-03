import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  Star,
  DollarSign,
  Package,
  Eye,
  Settings,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMySkills, usePublishSkill, useUpdateSkill } from "@/hooks/useSkills";
import { useEarningsStats, useCreatorSkillStats } from "@/hooks/useCreatorEarnings";
import { useAuth } from "@/contexts/AuthContext";

interface CreatorDashboardProps {
  onCreateNew?: () => void;
  onEditSkill?: (skillId: string) => void;
}

export function CreatorDashboard({ onCreateNew, onEditSkill }: CreatorDashboardProps) {
  const { user } = useAuth();
  const { data: mySkills = [], isLoading: loadingSkills } = useMySkills();
  const { data: earningsStats, isLoading: loadingEarnings } = useEarningsStats();
  const { data: skillStats, isLoading: loadingStats } = useCreatorSkillStats();
  const publishSkill = usePublishSkill();
  const updateSkill = useUpdateSkill();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>登录后查看创作者面板</p>
        </div>
      </div>
    );
  }

  const handlePublish = async (skillId: string) => {
    await publishSkill.mutateAsync(skillId);
  };

  const handleUnpublish = async (skillId: string) => {
    await updateSkill.mutateAsync({ id: skillId, is_published: false });
  };

  return (
    <div className="h-full flex flex-col">
      {/* 统计卡片 */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold mb-4">创作者中心</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="我的能力"
            value={skillStats?.totalSkills || 0}
            subValue={`${skillStats?.publishedCount || 0} 已发布`}
            loading={loadingStats}
          />
          <StatCard
            icon={<Download className="h-5 w-5" />}
            label="总安装量"
            value={skillStats?.totalDownloads || 0}
            loading={loadingStats}
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="平均评分"
            value={skillStats?.avgRating || 0}
            loading={loadingStats}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="累计收益"
            value={`¥${earningsStats?.totalEarnings?.toFixed(2) || "0.00"}`}
            subValue={`本月 ¥${earningsStats?.monthlyEarnings?.toFixed(2) || "0.00"}`}
            loading={loadingEarnings}
          />
        </div>
      </div>

      {/* 技能管理 */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="skills" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="skills" className="gap-2">
                  <Package className="h-4 w-4" />
                  我的能力
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  数据分析
                </TabsTrigger>
              </TabsList>
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                创建新能力
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="skills" className="mt-0">
              {loadingSkills ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : mySkills.length > 0 ? (
                <div className="space-y-3">
                  {mySkills.map((skill) => (
                    <Card key={skill.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{skill.name}</h4>
                              <Badge
                                variant={skill.is_published ? "default" : "secondary"}
                              >
                                {skill.is_published ? "已发布" : "草稿"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                v{skill.version}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {skill.description || "暂无描述"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                {skill.downloads_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {skill.rating || 0}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditSkill?.(skill.id)}
                              className="gap-1"
                            >
                              <Settings className="h-4 w-4" />
                              编辑
                            </Button>
                            {skill.is_published ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnpublish(skill.id)}
                                disabled={updateSkill.isPending}
                              >
                                下架
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(skill.id)}
                                disabled={publishSkill.isPending}
                              >
                                发布
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">还没有创建任何能力</p>
                  <Button onClick={onCreateNew} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    创建第一个能力
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 下载趋势 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      下载趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">数据统计功能即将上线</p>
                    </div>
                  </CardContent>
                </Card>

                {/* 收益明细 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      收益明细
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">收益功能即将上线</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <>
                <p className="text-lg font-semibold">{value}</p>
                {subValue && (
                  <p className="text-xs text-muted-foreground">{subValue}</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
