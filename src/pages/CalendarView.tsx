import { useState, useMemo } from "react";
import { useActivities } from "@/hooks/useActivities";
import { useTasks } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { PageBanner } from "@/components/PageBanner";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckSquare } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, isToday,
  isAfter, startOfDay,
} from "date-fns";

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data: activities } = useActivities();
  const { data: tasks } = useTasks();
  const { data: deals } = useQuery({
    queryKey: ["calendar-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id, title, close_date").not("close_date", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getItems = (day: Date) => {
    const dayActivities = activities?.filter((a) => isSameDay(new Date(a.created_at), day)) || [];
    const dayDeals = deals?.filter((d) => d.close_date && isSameDay(new Date(d.close_date), day)) || [];
    const dayTasks = tasks?.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day)) || [];
    return { activities: dayActivities, deals: dayDeals, tasks: dayTasks };
  };

  // Find the next upcoming event date to auto-select
  const autoSelectedDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const today = startOfDay(new Date());
    const upcomingDates: Date[] = [];

    activities?.forEach((a) => {
      const d = new Date(a.created_at);
      if (isAfter(d, today) || isSameDay(d, today)) upcomingDates.push(d);
    });
    deals?.forEach((d) => {
      if (d.close_date) {
        const dt = new Date(d.close_date);
        if (isAfter(dt, today) || isSameDay(dt, today)) upcomingDates.push(dt);
      }
    });
    tasks?.forEach((t) => {
      if (t.due_date) {
        const dt = new Date(t.due_date);
        if (isAfter(dt, today) || isSameDay(dt, today)) upcomingDates.push(dt);
      }
    });

    if (upcomingDates.length === 0) return today;
    upcomingDates.sort((a, b) => a.getTime() - b.getTime());
    return upcomingDates[0];
  }, [selectedDate, activities, deals, tasks]);

  const sidebarItems = getItems(autoSelectedDate);
  const hasSidebarItems = sidebarItems.activities.length > 0 || sidebarItems.deals.length > 0 || sidebarItems.tasks.length > 0;

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <PageBanner title="Calendar">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-foreground/20"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center text-sidebar-foreground">{format(currentMonth, "MMMM yyyy")}</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-foreground/20"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </PageBanner>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar - 3/4 width */}
        <div className="lg:col-span-3 rounded-lg border">
          <div className="grid grid-cols-7 border-b">
            {weekdays.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const items = getItems(day);
              const hasItems = items.activities.length > 0 || items.deals.length > 0 || items.tasks.length > 0;
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, autoSelectedDate);

              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[48px] sm:min-h-[80px] border-b border-r p-1.5 text-left hover:bg-muted/50 transition-colors ${!inMonth ? "text-muted-foreground/40" : ""} ${isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                    >
                      <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {hasItems && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {items.activities.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                          {items.deals.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                          {items.tasks.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        </div>
                      )}
                    </button>
                  </PopoverTrigger>
                  {hasItems && (
                    <PopoverContent className="w-64 p-3">
                      <p className="text-sm font-semibold mb-2">{format(day, "PPP")}</p>
                      {items.activities.map((a) => (
                        <div key={a.id} className="text-xs mb-1.5">
                          <Badge variant="outline" className="text-[10px] mr-1">{a.type}</Badge>
                          {a.title}
                        </div>
                      ))}
                      {items.deals.map((d) => (
                        <div key={d.id} className="text-xs mb-1.5">
                          <Badge className="text-[10px] mr-1 bg-green-500/10 text-green-600 border-green-500/20" variant="outline">close</Badge>
                          {d.title}
                        </div>
                      ))}
                      {items.tasks.map((t) => (
                        <div key={t.id} className="text-xs mb-1.5">
                          <Badge className="text-[10px] mr-1 bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">task</Badge>
                          {t.title}
                        </div>
                      ))}
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </div>

        {/* Sidebar - 1/4 width */}
        <div className="lg:col-span-1 rounded-lg border p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Events for</p>
            <p className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {format(autoSelectedDate, "PPP")}
            </p>
          </div>

          {!hasSidebarItems && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No events on this day.
            </div>
          )}

          {sidebarItems.activities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Activities</h3>
              {sidebarItems.activities.map((a) => (
                <div key={a.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                    <span className="text-sm font-medium truncate">{a.title}</span>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                </div>
              ))}
            </div>
          )}

          {sidebarItems.deals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Deal Closings</h3>
              {sidebarItems.deals.map((d) => (
                <div key={d.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{d.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sidebarItems.tasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Tasks Due</h3>
              {sidebarItems.tasks.map((t) => (
                <div key={t.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{t.title}</span>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
