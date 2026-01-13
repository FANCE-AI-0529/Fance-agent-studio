import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Database,
  ShieldAlert,
  Unlock,
  Code,
  Globe,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RedTeamResults, RedTeamAttackResult, RedTeamAttackType } from '@/types/agentEvals';

interface RedTeamResultsPanelProps {
  results: RedTeamResults;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

// Attack type to icon mapping
const ATTACK_ICONS: Record<RedTeamAttackType, React.ElementType> = {
  prompt_injection: Terminal,
  data_exfiltration: Database,
  privilege_escalation: ShieldAlert,
  jailbreak_attempt: Unlock,
  sql_injection: Code,
  xss_attack: Globe,
  social_engineering: Users,
};

// Attack type labels in Chinese
const ATTACK_LABELS: Record<RedTeamAttackType, string> = {
  prompt_injection: 'Prompt注入',
  data_exfiltration: '数据泄露',
  privilege_escalation: '越权攻击',
  jailbreak_attempt: '越狱尝试',
  sql_injection: 'SQL注入',
  xss_attack: 'XSS攻击',
  social_engineering: '社会工程',
};

// Individual Attack Result Row
interface AttackResultRowProps {
  attack: RedTeamAttackResult;
  index: number;
}

const AttackResultRow: React.FC<AttackResultRowProps> = ({ attack, index }) => {
  const Icon = ATTACK_ICONS[attack.attackType] || AlertTriangle;
  const label = ATTACK_LABELS[attack.attackType] || attack.attackType;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        attack.blocked ? 'bg-green-500/5' : 'bg-destructive/5'
      )}
    >
      <div className={cn(
        'p-2 rounded-full',
        attack.blocked ? 'bg-green-500/10' : 'bg-destructive/10'
      )}>
        <Icon className={cn(
          'h-4 w-4',
          attack.blocked ? 'text-green-500' : 'text-destructive'
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{attack.attackName}</span>
          <Badge
            variant={attack.blocked ? 'default' : 'destructive'}
            className="text-xs"
          >
            {label}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground truncate mb-1">
          {attack.prompt}
        </p>
        
        {!attack.blocked && attack.violations && attack.violations.length > 0 && (
          <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
            <strong>检测到违规:</strong>
            <ul className="list-disc list-inside mt-1">
              {attack.violations.slice(0, 3).map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {attack.blocked ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
      </div>
    </motion.div>
  );
};

// Summary Stats Component
interface SummaryStatsProps {
  results: RedTeamResults;
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ results }) => {
  const blockRate = results.totalAttacks > 0 
    ? Math.round((results.attacksBlocked / results.totalAttacks) * 100) 
    : 100;

  // Group attacks by type
  const attacksByType = results.attacks.reduce((acc, attack) => {
    if (!acc[attack.attackType]) {
      acc[attack.attackType] = { blocked: 0, total: 0 };
    }
    acc[attack.attackType].total++;
    if (attack.blocked) acc[attack.attackType].blocked++;
    return acc;
  }, {} as Record<string, { blocked: number; total: number }>);

  return (
    <div className="space-y-3">
      {/* Overall stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">攻击拦截率</span>
        <span className={cn(
          'font-bold',
          blockRate === 100 ? 'text-green-500' : 'text-destructive'
        )}>
          {results.attacksBlocked}/{results.totalAttacks} ({blockRate}%)
        </span>
      </div>
      
      {/* Attack type breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(attacksByType).map(([type, stats]) => {
          const Icon = ATTACK_ICONS[type as RedTeamAttackType] || AlertTriangle;
          const allBlocked = stats.blocked === stats.total;
          
          return (
            <div
              key={type}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                allBlocked 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{ATTACK_LABELS[type as RedTeamAttackType] || type}</span>
              {allBlocked ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span>{stats.blocked}/{stats.total}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main RedTeamResultsPanel Component
const RedTeamResultsPanel: React.FC<RedTeamResultsPanelProps> = ({
  results,
  expanded = false,
  onToggle,
  className,
}) => {
  const allBlocked = results.attacksBlocked === results.totalAttacks;
  const hasVulnerabilities = results.vulnerabilities && results.vulnerabilities.length > 0;

  return (
    <Collapsible open={expanded} onOpenChange={onToggle} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              allBlocked ? 'bg-green-500/10' : 'bg-destructive/10'
            )}>
              <Shield className={cn(
                'h-5 w-5',
                allBlocked ? 'text-green-500' : 'text-destructive'
              )} />
            </div>
            <div className="text-left">
              <div className="font-medium flex items-center gap-2">
                🔴 红队对抗测试
                {allBlocked ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                    全部拦截
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    发现漏洞
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {results.attacksBlocked}/{results.totalAttacks} 攻击已拦截 | 
                安全评分 {results.securityScore}%
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {/* Summary stats */}
          <SummaryStats results={results} />
          
          {/* Vulnerabilities warning */}
          {hasVulnerabilities && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
            >
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                检测到安全漏洞
              </div>
              <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1">
                {results.vulnerabilities!.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {/* Attack results list */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              <AnimatePresence>
                {results.attacks.map((attack, index) => (
                  <AttackResultRow
                    key={attack.attackId}
                    attack={attack}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default RedTeamResultsPanel;
