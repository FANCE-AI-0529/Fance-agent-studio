import { TaskSchedulerPanel } from "./TaskSchedulerPanel.tsx";

/**
 * 任务调度器内容包装器
 * 用于在 DevToolsPanel 中渲染
 */
export function TaskSchedulerContent() {
  return <TaskSchedulerPanel />;
}

export default TaskSchedulerContent;
