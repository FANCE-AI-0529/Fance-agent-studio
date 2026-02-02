import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useTimeTravel } from "@/hooks/useTimeTravel";
import { cn } from "@/lib/utils";

interface SnapshotCalendarPickerProps {
  agentId: string | null;
  onDateSelect?: (date: Date) => void;
}

export function SnapshotCalendarPicker({
  agentId,
  onDateSelect,
}: SnapshotCalendarPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [snapshotDates, setSnapshotDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { getSnapshotDates, getSnapshotsByDate } = useTimeTravel(agentId);

  // 加载当月有快照的日期
  useEffect(() => {
    if (agentId) {
      getSnapshotDates(
        currentMonth.getFullYear(),
        currentMonth.getMonth()
      ).then(setSnapshotDates);
    }
  }, [agentId, currentMonth, getSnapshotDates]);

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  // 检查日期是否有快照
  const hasSnapshot = (date: Date) => {
    return snapshotDates.some(
      (d) => d.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        onMonthChange={handleMonthChange}
        className="rounded-md border pointer-events-auto"
        modifiers={{
          hasSnapshot: (date) => hasSnapshot(date),
        }}
        modifiersClassNames={{
          hasSnapshot: "relative",
        }}
        components={{
          DayContent: ({ date }) => (
            <div className="relative w-full h-full flex items-center justify-center">
              {date.getDate()}
              {hasSnapshot(date) && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
          ),
        }}
        disabled={(date) => date > new Date()}
      />
      
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>有版本记录</span>
        </div>
      </div>
    </div>
  );
}
