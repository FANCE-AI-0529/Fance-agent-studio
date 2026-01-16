/**
 * OpenCode Style Guide Panel
 * Quick reference for OpenCode coding standards
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getStyleRulesConfig } from '@/utils/openCodeStyleChecker';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface OpenCodeStyleGuideProps {
  compact?: boolean;
}

export function OpenCodeStyleGuide({ compact = false }: OpenCodeStyleGuideProps) {
  const rules = getStyleRulesConfig();
  
  const getSeverityBadge = (severity: 'error' | 'warning' | 'info') => {
    const config = {
      error: { variant: 'destructive' as const, icon: XCircle, label: 'Required' },
      warning: { variant: 'secondary' as const, icon: AlertCircle, label: 'Recommended' },
      info: { variant: 'outline' as const, icon: Info, label: 'Suggested' }
    };
    const { variant, icon: Icon, label } = config[severity];
    return (
      <Badge variant={variant} className="ml-2 text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };
  
  if (compact) {
    return (
      <Card className="border-muted">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            OpenCode Style Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>❌ No <code className="bg-muted px-1 rounded">let</code> - Use const + ternary</li>
            <li>❌ No <code className="bg-muted px-1 rounded">else</code> - Use early returns</li>
            <li>❌ No <code className="bg-muted px-1 rounded">any</code> - Use specific types</li>
            <li>✓ Single-word variable names</li>
            <li>✓ Avoid destructuring</li>
          </ul>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          OpenCode Style Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {rules.map((rule) => (
            <AccordionItem key={rule.rule} value={rule.rule}>
              <AccordionTrigger className="text-sm">
                <div className="flex items-center">
                  <span>{rule.name}</span>
                  {getSeverityBadge(rule.severity)}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Good
                      </div>
                      <pre className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-xs overflow-x-auto">
                        <code>{rule.example.good}</code>
                      </pre>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Bad
                      </div>
                      <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 text-xs overflow-x-auto">
                        <code>{rule.example.bad}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
