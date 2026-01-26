
import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Sun, Moon, Clock } from 'lucide-react';
import { ShiftType } from '../types';

interface CalendarProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  getShiftForDate: (date: Date) => ShiftType;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  renderDayContent?: (date: Date) => React.ReactNode;
}

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  onDateClick, 
  getShiftForDate,
  onPrevMonth,
  onNextMonth,
  renderDayContent
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = getDay(monthStart);
  const padding = Array.from({ length: startDay }).map((_, i) => null);

  const renderShiftBadge = (type: ShiftType) => {
    switch (type) {
      case 'morning':
        return <div className="mt-1 flex items-center justify-center text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold border border-blue-200"><Sun size={10} className="mr-0.5" /> AM</div>;
      case 'evening':
        return <div className="mt-1 flex items-center justify-center text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold border border-amber-200"><Moon size={10} className="mr-0.5" /> PM</div>;
      case 'all-day':
        return <div className="mt-1 flex items-center justify-center text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold border border-emerald-200"><Clock size={10} className="mr-0.5" /> ALL</div>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button onClick={onPrevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={onNextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100">
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className="h-24 sm:h-32 bg-slate-50/50" />
        ))}
        {days.map(day => {
          const shift = getShiftForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const active = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`h-24 sm:h-32 p-2 bg-white flex flex-col items-center group relative transition-colors hover:bg-indigo-50/50 ${!isCurrentMonth ? 'text-slate-300' : ''}`}
            >
              <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${active ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                {format(day, 'd')}
              </span>
              <div className="w-full h-full flex flex-col justify-end overflow-hidden pb-1">
                {renderDayContent ? renderDayContent(day) : renderShiftBadge(shift)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
