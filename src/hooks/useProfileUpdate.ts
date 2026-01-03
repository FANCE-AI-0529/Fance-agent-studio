import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ProfileUpdateData {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
      toast({
        title: "资料已更新",
        description: "个人信息保存成功",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "更新失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`;

      // Upload new avatar (with upsert to handle overwrites)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return `${publicUrl}?t=${timestamp}`;
    },
    onError: (error) => {
      console.error("Error uploading avatar:", error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "头像上传失败，请重试",
        variant: "destructive",
      });
    },
  });
}

export function useMyProfile() {
  const { user } = useAuth();

  return {
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  };
}
