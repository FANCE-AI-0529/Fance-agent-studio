import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ShareCardPreviewProps {
  messages: Message[];
  shareUrl?: string;
  agentName?: string;
  includeUser?: boolean;
}

export const ShareCardPreview = forwardRef<HTMLDivElement, ShareCardPreviewProps>(
  ({ messages, shareUrl, agentName, includeUser = true }, ref) => {
    const filteredMessages = messages.filter(
      (m) => includeUser || m.role === "assistant"
    );
    const displayMessages = filteredMessages.slice(-6); // Show last 6 messages

    return (
      <div
        ref={ref}
        className="w-[400px] bg-card p-6 rounded-xl border border-border"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold">{agentName || "AI 助手"}</h3>
              <p className="text-xs text-muted-foreground">智能对话</p>
            </div>
          </div>
          {shareUrl && (
            <div className="w-16 h-16 bg-white p-1 rounded">
              <QRCodeSVG value={shareUrl} size={56} level="L" />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-4">
          {displayMessages.map((msg, index) => (
            <div
              key={index}
              className={`text-sm ${
                msg.role === "user"
                  ? "text-right"
                  : "text-left"
              }`}
            >
              <span
                className={`inline-block px-3 py-2 rounded-lg max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content.length > 100
                  ? msg.content.slice(0, 100) + "..."
                  : msg.content}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            扫码查看完整对话 · Powered by AI Agent Platform
          </p>
        </div>
      </div>
    );
  }
);

ShareCardPreview.displayName = "ShareCardPreview";
