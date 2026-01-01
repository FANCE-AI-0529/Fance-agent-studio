import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type FeedbackType = "like" | "dislike" | null;

export function useMessageFeedback(messageId: string) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing feedback on mount
  useEffect(() => {
    if (!user || !messageId) return;

    const fetchFeedback = async () => {
      const { data } = await supabase
        .from("message_feedback")
        .select("feedback_type")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setFeedback(data.feedback_type as FeedbackType);
      }
    };

    fetchFeedback();
  }, [messageId, user]);

  const submitFeedback = async (type: FeedbackType) => {
    if (!user || !messageId || isLoading) return;

    setIsLoading(true);

    try {
      if (type === null) {
        // Remove feedback
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        setFeedback(null);
      } else if (feedback === type) {
        // Toggle off - remove feedback
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        setFeedback(null);
      } else {
        // Upsert feedback
        await supabase
          .from("message_feedback")
          .upsert(
            {
              message_id: messageId,
              user_id: user.id,
              feedback_type: type,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id" }
          );
        setFeedback(type);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    feedback,
    isLoading,
    submitFeedback,
    isLiked: feedback === "like",
    isDisliked: feedback === "dislike",
  };
}
