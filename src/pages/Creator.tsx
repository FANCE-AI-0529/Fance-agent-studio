import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorProfile, useCreatorAgents, useCreatorStats } from "@/hooks/useCreatorProfile";
import { useUserActivities } from "@/hooks/useActivities";
import { useIsFollowing } from "@/hooks/useFollow";
import { FollowButton } from "@/components/social/FollowButton";
import { ActivityFeed } from "@/components/social/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  Users, 
  Bot, 
  Heart, 
  Copy, 
  ArrowLeft,
  MessageSquare,
  Settings,
  ExternalLink
} from "lucide-react";

export default function Creator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useCreatorProfile(id);
  const { data: agents, isLoading: agentsLoading } = useCreatorAgents(id);
  const { data: stats } = useCreatorStats(id);
  const { data: activities, isLoading: activitiesLoading } = useUserActivities(id, 20);

  const isOwnProfile = user?.id === id;
  const name = profile?.display_name || "匿名用户";
  const initial = name.charAt(0).toUpperCase();

  if (profileLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">用户不存在</h2>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Cover Image */}
        <div className="relative h-48 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 overflow-hidden">
          {profile.cover_image_url && (
            <img 
              src={profile.cover_image_url} 
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-background/80 backdrop-blur"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12 px-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 pt-8 sm:pt-12">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{name}</h1>
              {profile.is_verified && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
              {profile.creator_level && profile.creator_level > 1 && (
                <Badge variant="secondary">Lv.{profile.creator_level}</Badge>
              )}
            </div>
            
            {profile.department && (
              <p className="text-sm text-muted-foreground mb-2">{profile.department}</p>
            )}
            
            {profile.bio && (
              <p className="text-sm mb-3">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-semibold">{profile.followers_count || 0}</div>
                <div className="text-muted-foreground text-xs">粉丝</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{profile.following_count || 0}</div>
                <div className="text-muted-foreground text-xs">关注</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{stats?.agentCount || profile.total_agents || 0}</div>
                <div className="text-muted-foreground text-xs">Agent</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{stats?.totalLikes || profile.total_likes_received || 0}</div>
                <div className="text-muted-foreground text-xs">获赞</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-8 sm:pt-12">
            {isOwnProfile ? (
              <Button variant="outline" onClick={() => navigate("/profile")}>
                <Settings className="h-4 w-4 mr-2" />
                编辑资料
              </Button>
            ) : (
              <>
                <FollowButton userId={id!} />
                <Button variant="outline" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="agents" className="mt-6">
          <TabsList>
            <TabsTrigger value="agents">
              <Bot className="h-4 w-4 mr-1" />
              Agent ({agents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activities">
              动态
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            {agentsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : agents?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agents.map(agent => (
                  <Card 
                    key={agent.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/builder/${agent.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{agent.name}</h3>
                          {agent.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {agent.category}
                            </Badge>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {agent.usage_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {agent.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Copy className="h-3 w-3" />
                              {agent.clones_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                暂无发布的 Agent
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <ActivityFeed 
                  activities={activities || []} 
                  isLoading={activitiesLoading}
                  showUser={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
