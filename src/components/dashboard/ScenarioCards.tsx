import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { scenarioTemplates, hotTemplates } from "@/data/agentTemplates";

export function ScenarioCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {scenarioTemplates.map((scenario, index) => (
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={`/hive?tab=builder&template=${scenario.id}`}
            className="group relative flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
          >
            {scenario.popular && (
              <div className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                热门
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl ${scenario.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <scenario.icon className={`h-6 w-6 ${scenario.color}`} />
            </div>
            <h3 className="font-medium text-sm text-center group-hover:text-primary transition-colors">
              {scenario.name}
            </h3>
            <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
              {scenario.description}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

export function HotTemplates() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {hotTemplates.map((template, index) => (
        <motion.div
          key={template.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link
            to={`/hive?tab=builder&template=${template.id}`}
            className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {template.name}
                </h4>
                <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded">
                  {template.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {template.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{(template.usageCount || 0).toLocaleString()} 人使用</span>
                <span className="flex items-center gap-1">
                  ⭐ {template.rating || 4.5}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
