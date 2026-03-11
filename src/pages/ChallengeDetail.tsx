import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useChallenge, useChallengeEntries, useSubmitEntry, useVoteEntry, useHasVoted } from "../hooks/useChallenges.ts";
import { useMyAgents } from "../hooks/useAgents.ts";
import { Trophy, Clock, Users, ArrowLeft, ThumbsUp, Calendar, Award, Plus, Bot } from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";

interface Entry {
  id: string;
  title?: string;
  description?: string;
  agent_id?: string;
  votes_count?: number;
  rank?: number;
}

const EntryCard = React.memo(function EntryCard({ entry, challengeActive }: { entry: Entry; challengeActive: boolean }) {
  const { user } = useAuth();
  const { data: hasVoted = false } = useHasVoted(entry.id);
  const voteEntry = useVoteEntry();

  const handleVote = () => {
    if (!user) return;
    voteEntry.mutate(entry.id);
  };

  return (
    <Card className="hover:border-primary/50 transition-all">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarFallback>
              {entry.title?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium mb-1">{entry.title || "未命名作品"}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.description}
            </p>
            {entry.agent_id && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Bot className="h-3 w-3" />
                使用了 Agent
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button
              variant={hasVoted ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={handleVote}
              disabled={!user || !challengeActive || voteEntry.isPending}
            >
              <ThumbsUp className={`h-4 w-4 ${hasVoted ? "fill-current" : ""}`} />
              {entry.votes_count || 0}
            </Button>
            {entry.rank && entry.rank <= 3 && (
              <Badge variant={entry.rank === 1 ? "default" : "secondary"}>
                #{entry.rank}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

function SubmitEntryDialog({ challengeId, onSuccess }: { challengeId: string; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  
  const { data: myAgents = [] } = useMyAgents();
  const submitEntry = useSubmitEntry();

  const handleSubmit = async () => {
    await submitEntry.mutateAsync({
      challengeId,
      title,
      description,
      agentId: agentId || undefined,
    });
    setOpen(false);
    setTitle("");
    setDescription("");
    setAgentId("");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          提交作品
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>提交参赛作品</DialogTitle>
          <DialogDescription>
            提交你的作品参与挑战
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">作品标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的作品起个名字"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">作品描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍一下你的作品..."
              rows={4}
            />
          </div>
          {myAgents.length > 0 && (
            <div className="space-y-2">
              <Label>关联 Agent（可选）</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个 Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不关联</SelectItem>
                  {myAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !description.trim() || submitEntry.isPending}
          >
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { data: challenge, isLoading: challengeLoading } = useChallenge(id || "");
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useChallengeEntries(id || "");

  if (challengeLoading) {
    return (
      <MainLayout>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!challenge) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">活动不存在</h3>
              <Link to="/challenges">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  返回活动列表
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const now = new Date();
  const startDate = new Date(challenge.start_at);
  const endDate = new Date(challenge.end_at);
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isEnded = isPast(endDate);

  return (
    <MainLayout>
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          {/* Back Button */}
          <Link to="/challenges">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回活动列表
            </Button>
          </Link>

          {/* Challenge Header */}
          <Card>
            {challenge.banner_url && (
              <div className="h-48 md:h-64 overflow-hidden rounded-t-lg">
                <img 
                  src={challenge.banner_url} 
                  alt={challenge.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{challenge.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {challenge.description}
                  </CardDescription>
                </div>
                <Badge 
                  className={isActive ? "bg-status-executing" : ""}
                  variant={isActive ? "default" : isUpcoming ? "secondary" : "outline"}
                >
                  {isActive ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(startDate, "yyyy年MM月dd日", { locale: zhCN })} - {format(endDate, "MM月dd日", { locale: zhCN })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {entries.length} 个参赛作品
                </span>
                {isActive && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(endDate, { locale: zhCN })}后结束
                  </span>
                )}
              </div>

              {challenge.prize_description && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg mb-6">
                  <Trophy className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">奖励</p>
                    <p className="text-sm text-muted-foreground">{challenge.prize_description}</p>
                  </div>
                </div>
              )}

              {challenge.rules && (
                <div className="prose prose-sm max-w-none">
                  <h4 className="font-medium mb-2">活动规则</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {challenge.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entries Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5" />
                参赛作品
              </h2>
              {user && isActive && (
                <SubmitEntryDialog challengeId={challenge.id} onSuccess={() => refetchEntries()} />
              )}
            </div>

            {entriesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="py-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">暂无参赛作品</h3>
                  {user && isActive ? (
                    <p className="text-muted-foreground mb-4">成为第一个参赛者吧！</p>
                  ) : !user ? (
                    <div>
                      <p className="text-muted-foreground mb-4">登录后即可参与挑战</p>
                      <Link to="/auth">
                        <Button>登录参与</Button>
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} challengeActive={isActive} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
