import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';

export interface CalendarBlock {
  id?: string;
  taskId: string;
  taskTitle: string;
  courseTitle?: string;
  start: string;
  end: string;
  status?: string;
}

interface ScheduleCalendarProps {
  blocks: CalendarBlock[];
  timezone?: string;
  onStartFocus?: (block: CalendarBlock) => void;
}

function getZonedDateString(isoString: string, timeZone: string): string {
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch {
    return isoString.split('T')[0];
  }
}

function formatTime(isoString: string, timeZone: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  blocks,
  timezone = 'Asia/Colombo',
  onStartFocus,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);

  // Group all blocks by local calendar date YYYY-MM-DD
  const blocksByDate = useMemo(() => {
    const map = new Map<string, CalendarBlock[]>();
    for (const block of blocks) {
      const dateKey = getZonedDateString(block.start, timezone);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(block);
    }
    // Sort blocks chronologically within each date
    map.forEach(list => {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });
    return map;
  }, [blocks, timezone]);

  // Find earliest block date for the jump-to banner
  const earliestBlockDate = useMemo(() => {
    if (blocks.length === 0) return null;
    let earliest = new Date(blocks[0].start);
    for (const b of blocks) {
      const d = new Date(b.start);
      if (d < earliest) earliest = d;
    }
    return earliest;
  }, [blocks]);

  // Calculate current reference date for the active week
  const todayZonedStr = useMemo(() => getZonedDateString(new Date().toISOString(), timezone), [timezone]);

  const { weekDays, weekRangeLabel, containsEarliest } = useMemo(() => {
    const [tY, tM, tD] = todayZonedStr.split('-').map(Number);
    // Base date at noon UTC to avoid DST day drift
    const base = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
    
    // Day of week: 0 is Sun, 1 is Mon, ..., 6 is Sat
    const dayOfWeek = base.getUTCDay();
    // Monday as start of week: Monday=0, Tuesday=1, ..., Sunday=6
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(base.getTime() + (diffToMonday + weekOffset * 7) * 86400000);

    const days = [];
    let hasEarliest = false;

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday.getTime() + i * 86400000);
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, '0');
      const d = String(current.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(current);
      const monthDayName = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(current);

      const isToday = dateStr === todayZonedStr;
      const isWeekend = i === 5 || i === 6; // Saturday or Sunday

      if (earliestBlockDate && getZonedDateString(earliestBlockDate.toISOString(), timezone) === dateStr) {
        hasEarliest = true;
      }

      days.push({
        dateStr,
        dayName,
        monthDayName,
        isToday,
        isWeekend,
        blocks: blocksByDate.get(dateStr) || [],
      });
    }

    const first = days[0];
    const last = days[6];
    const rangeLabel = `${first.monthDayName} – ${last.monthDayName}, ${monday.getUTCFullYear()}`;

    return {
      weekDays: days,
      weekRangeLabel: rangeLabel,
      containsEarliest: hasEarliest,
    };
  }, [todayZonedStr, weekOffset, timezone, earliestBlockDate, blocksByDate]);

  // Jump to week containing the first session
  const handleJumpToFirstSession = () => {
    if (!earliestBlockDate) return;
    const [tY, tM, tD] = todayZonedStr.split('-').map(Number);
    const todayBase = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
    const earliestZoned = getZonedDateString(earliestBlockDate.toISOString(), timezone);
    const [eY, eM, eD] = earliestZoned.split('-').map(Number);
    const earliestBase = new Date(Date.UTC(eY, eM - 1, eD, 12, 0, 0));

    const diffDays = Math.round((earliestBase.getTime() - todayBase.getTime()) / 86400000);
    const targetWeekOffset = Math.floor((diffDays + (todayBase.getUTCDay() === 0 ? -6 : 1 - todayBase.getUTCDay())) / 7);
    setWeekOffset(targetWeekOffset);
  };

  const totalBlocksThisWeek = weekDays.reduce((acc, day) => acc + day.blocks.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Week Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-subtle">
        <div className="flex items-center gap-3">
          <CalendarIcon size={20} className="text-primary" />
          <div>
            <h2 className="text-lg font-bold text-primary mb-0">{weekRangeLabel}</h2>
            <p className="text-xs text-muted mb-0">Showing 7-day schedule in {timezone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="btn btn-secondary p-2 flex items-center justify-center text-primary"
            title="Previous week"
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`btn px-3 py-1.5 text-xs font-semibold ${weekOffset === 0 ? 'btn-primary' : 'btn-secondary'}`}
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="btn btn-secondary p-2 flex items-center justify-center text-primary"
            title="Next week"
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Jump to first session banner if outside displayed week */}
      {earliestBlockDate && !containsEarliest && totalBlocksThisWeek === 0 && (
        <div className="p-4 bg-surface border border-primary/30 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">ℹ</span>
            <span className="text-secondary">
              First scheduled study block is on{' '}
              <strong>
                {new Intl.DateTimeFormat('en-US', {
                  timeZone: timezone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                }).format(earliestBlockDate)}
              </strong>.
            </span>
          </div>
          <button
            onClick={handleJumpToFirstSession}
            className="text-xs font-bold text-primary hover:underline ml-4"
          >
            Jump to Week →
          </button>
        </div>
      )}

      {/* 7-Day Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map(day => (
          <Card
            key={day.dateStr}
            className={`p-3 min-h-[340px] flex flex-col transition-all ${
              day.isToday ? 'border-primary shadow-sm bg-primary/5' : 'bg-surface'
            }`}
          >
            <div className="text-center pb-2 mb-3 border-b border-subtle">
              <span className={`text-xs font-bold uppercase tracking-wider block ${
                day.isToday ? 'text-primary' : day.isWeekend ? 'text-muted' : 'text-secondary'
              }`}>
                {day.dayName}
              </span>
              <span className={`text-sm font-extrabold ${
                day.isToday ? 'text-primary' : 'text-primary'
              }`}>
                {day.monthDayName}
              </span>
              {day.isToday && (
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded">
                  Today
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {day.blocks.length > 0 ? (
                day.blocks.map((block, idx) => {
                  const isCompleted = block.status === 'completed';
                  return (
                    <div
                      key={block.id || idx}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all ${
                        isCompleted
                          ? 'bg-success-subtle/40 border-success/40 text-secondary'
                          : 'bg-surface border-subtle hover:border-primary/50 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1 mb-1">
                          <h4 className={`text-xs font-bold leading-snug break-words ${
                            isCompleted ? 'text-secondary line-through' : 'text-primary'
                          }`}>
                            {block.taskTitle}
                          </h4>
                          {isCompleted && (
                            <CheckCircle size={14} className="text-success flex-shrink-0" />
                          )}
                        </div>
                        {block.courseTitle && (
                          <p className="text-[11px] text-muted truncate mb-1">
                            {block.courseTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-[11px] font-medium text-secondary">
                          <Clock size={12} className="text-muted" />
                          <span>
                            {formatTime(block.start, timezone)} - {formatTime(block.end, timezone)}
                          </span>
                        </div>
                      </div>

                      {!isCompleted && onStartFocus && (
                        <button
                          onClick={() => onStartFocus(block)}
                          className="mt-1 w-full py-1 px-2 text-[11px] font-bold btn btn-secondary text-primary hover:bg-primary hover:text-white transition-colors rounded"
                        >
                          Start Focus
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted text-xs italic text-center">No sessions</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
