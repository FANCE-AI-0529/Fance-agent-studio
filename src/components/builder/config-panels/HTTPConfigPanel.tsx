import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Globe, Plus, Trash2, Lock, Clock, RotateCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VariableInput from "../variables/VariableInput";

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] as const;

export default function HTTPConfigPanel({ node, onUpdate, nodes }: Props) {
  const data = node.data as any;
  const config = data?.config || {};

  const [method, setMethod] = useState(config.method || "GET");
  const [url, setUrl] = useState(config.url || "");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    config.headers ? Object.entries(config.headers).map(([key, value]) => ({ key, value: value as string })) : [{ key: "", value: "" }]
  );
  const [body, setBody] = useState(config.body || "");
  const [bodyType, setBodyType] = useState(config.bodyType || "json");
  const [authType, setAuthType] = useState(config.authType || "none");
  const [authToken, setAuthToken] = useState(config.authToken || "");
  const [timeout, setTimeout_] = useState(config.timeout ?? 30000);
  const [retryCount, setRetryCount] = useState(config.retryCount ?? 0);
  const [followRedirects, setFollowRedirects] = useState(config.followRedirects ?? true);

  useEffect(() => {
    const headersObj: Record<string, string> = {};
    headers.forEach((h) => { if (h.key) headersObj[h.key] = h.value; });
    onUpdate({
      config: { method, url, headers: headersObj, body, bodyType, authType, authToken, timeout, retryCount, followRedirects },
    });
  }, [method, url, headers, body, bodyType, authType, authToken, timeout, retryCount, followRedirects]);

  return (
    <div className="space-y-6">
      {/* Method + URL */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <Globe className="h-3.5 w-3.5" /> 请求
        </Label>
        <div className="flex gap-2">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {methods.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex-1">
            <VariableInput value={url} onChange={setUrl} nodes={nodes} placeholder="https://api.example.com/{{path}}" />
          </div>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="headers" className="w-full">
        <TabsList className="w-full h-8">
          <TabsTrigger value="headers" className="text-xs flex-1">Headers</TabsTrigger>
          <TabsTrigger value="body" className="text-xs flex-1">Body</TabsTrigger>
          <TabsTrigger value="auth" className="text-xs flex-1">认证</TabsTrigger>
        </TabsList>

        <TabsContent value="headers" className="space-y-2 mt-3">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="h-7 text-xs flex-1" placeholder="Key" value={h.key} onChange={(e) => setHeaders((prev) => prev.map((hh, ii) => ii === i ? { ...hh, key: e.target.value } : hh))} />
              <Input className="h-7 text-xs flex-1" placeholder="Value" value={h.value} onChange={(e) => setHeaders((prev) => prev.map((hh, ii) => ii === i ? { ...hh, value: e.target.value } : hh))} />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHeaders((prev) => prev.filter((_, ii) => ii !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setHeaders((prev) => [...prev, { key: "", value: "" }])}>
            <Plus className="h-3 w-3" /> 添加 Header
          </Button>
        </TabsContent>

        <TabsContent value="body" className="space-y-2 mt-3">
          <Select value={bodyType} onValueChange={setBodyType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="form">Form Data</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
            </SelectContent>
          </Select>
          <VariableInput value={body} onChange={setBody} nodes={nodes} multiline placeholder='{"key": "{{variable}}"}'  className="min-h-[120px] font-mono" />
        </TabsContent>

        <TabsContent value="auth" className="space-y-3 mt-3">
          <Select value={authType} onValueChange={setAuthType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无认证</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="api_key">API Key</SelectItem>
            </SelectContent>
          </Select>
          {authType !== "none" && (
            <VariableInput value={authToken} onChange={setAuthToken} nodes={nodes} placeholder="输入凭证或引用变量 {{...}}" />
          )}
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Advanced */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs"><Clock className="h-3.5 w-3.5" /> 超时 (ms)</Label>
          <Input type="number" className="h-7 w-24 text-xs text-right" value={timeout} onChange={(e) => setTimeout_(parseInt(e.target.value) || 30000)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs"><RotateCw className="h-3.5 w-3.5" /> 重试次数</Label>
          <Input type="number" className="h-7 w-24 text-xs text-right" value={retryCount} onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">跟随重定向</Label>
          <Switch checked={followRedirects} onCheckedChange={setFollowRedirects} />
        </div>
      </div>
    </div>
  );
}
