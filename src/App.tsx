/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit,
  Download,
  Upload,
  FileUp, 
  RefreshCw, 
  Settings, 
  Calendar as CalendarIcon, 
  Users, 
  BookOpen, 
  GraduationCap,
  Save,
  ChevronRight,
  ChevronLeft,
  Filter,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

import { 
  Class, 
  Subject, 
  Teacher, 
  ScheduleEntry, 
  DayOfWeek, 
  TimeSlot 
} from './types';
import { DAYS_OF_WEEK, TIME_SLOTS, TEACHER_COLORS } from './constants';

// --- Sub-components for better state management ---

interface EditTeacherFormProps {
  teacher: Teacher;
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
  updateTeacher: (id: string, name: string, code: string, availability: Record<string, ('morning' | 'afternoon')[]>, assignedClasses: string[], subjects: string[]) => void;
  getClassById: (id: string) => Class | undefined;
  getSubjectById: (id: string) => Subject | undefined;
  onClose: () => void;
}

function EditTeacherForm({ 
  teacher, 
  classes, 
  subjects, 
  teachers, 
  updateTeacher, 
  getClassById, 
  getSubjectById,
  onClose
}: EditTeacherFormProps) {
  const [name, setName] = useState(teacher.name);
  const [code, setCode] = useState(teacher.code);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(teacher.assignedClasses);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(teacher.subjects);
  const [availability, setAvailability] = useState<Record<string, ('morning' | 'afternoon')[]>>(teacher.availability);

  const stats = useMemo(() => {
    const grades = new Set(classes.filter(c => selectedClasses.includes(c.id)).map(c => c.grade)).size;
    const count = selectedClasses.length;
    const hours = selectedClasses.reduce((total, classId) => {
      const cls = getClassById(classId);
      if (!cls) return total;
      const subHours = selectedSubjects.reduce((subTotal, subId) => {
        const sub = getSubjectById(subId);
        if (!sub) return subTotal;
        return subTotal + (Number(sub.hoursPerGrade[cls.grade]) || 0);
      }, 0);
      return total + subHours;
    }, 0);
    return { grades, count, hours };
  }, [selectedClasses, selectedSubjects, classes, getClassById, getSubjectById]);

  const handleToggleDay = (day: string, period: 'morning' | 'afternoon') => {
    const current = availability[day] || [];
    const next = current.includes(period) 
      ? current.filter(p => p !== period)
      : [...current, period];
    setAvailability({ ...availability, [day]: next });
  };

  const handleSave = () => {
    if (!name || !code) {
      toast.error('សូមបញ្ចូលឈ្មោះ និង កូដ!');
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error('សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់ ១!');
      return;
    }
    if (selectedSubjects.length > 2) {
      toast.error('គ្រូម្នាក់អាចបង្រៀនបានត្រឹមតែ ២ មុខវិជ្ជាប៉ុណ្ណោះ!');
      return;
    }

    // Check for conflicts
    const conflicts: string[] = [];
    selectedClasses.forEach(classId => {
      const cls = getClassById(classId);
      selectedSubjects.forEach(subId => {
        const sub = getSubjectById(subId);
        const existingTeacher = teachers.find(otherT => 
          otherT.id !== teacher.id && 
          otherT.assignedClasses.includes(classId) && 
          otherT.subjects.includes(subId)
        );
        if (existingTeacher) {
          conflicts.push(`ថ្នាក់ ${cls?.grade}${cls?.group} មុខវិជ្ជា ${sub?.name} មានគ្រូ ${existingTeacher.name} រួចហើយ!`);
        }
      });
    });

    if (conflicts.length > 0) {
      conflicts.forEach(msg => toast.error(msg));
      return;
    }

    updateTeacher(teacher.id, name, code, availability, selectedClasses, selectedSubjects);
    onClose();
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>ឈ្មោះគ្រូបង្រៀន</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>កូដបង្រៀន</Label>
        <Input value={code} onChange={e => setCode(e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-bold">កំណត់ពេលបង្រៀនតាមថ្ងៃ</Label>
        <div className="space-y-2 border rounded-xl p-3 bg-[#F8F9FA]">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="flex items-center justify-between py-1 border-b last:border-0 border-[#E9ECEF]">
              <span className="text-xs font-bold w-12">{day}</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id={`edit-m-${day}-${teacher.id}`}
                    checked={availability[day]?.includes('morning')}
                    onChange={() => handleToggleDay(day, 'morning')}
                  />
                  <label htmlFor={`edit-m-${day}-${teacher.id}`} className="text-[10px]">ព្រឹក</label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id={`edit-a-${day}-${teacher.id}`}
                    checked={availability[day]?.includes('afternoon')}
                    onChange={() => handleToggleDay(day, 'afternoon')}
                  />
                  <label htmlFor={`edit-a-${day}-${teacher.id}`} className="text-[10px]">រសៀល</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>ថ្នាក់ត្រូវបង្រៀន</Label>
        <ScrollArea className="h-40 border rounded-md p-2">
          <div className="grid grid-cols-2 gap-2">
            {classes.map(c => {
              const conflictingSubjects = selectedSubjects.filter(subId => 
                teachers.some(t => t.id !== teacher.id && t.assignedClasses.includes(c.id) && t.subjects.includes(subId))
              );
              const isBusy = conflictingSubjects.length > 0;
              const busyWith = conflictingSubjects.map(id => getSubjectById(id)?.name).join(', ');

              return (
                <div key={c.id} className="flex items-start gap-2">
                  <input 
                    type="checkbox" 
                    id={`edit-cls-${c.id}-${teacher.id}`}
                    disabled={isBusy}
                    checked={selectedClasses.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedClasses([...selectedClasses, c.id]);
                      else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                    }}
                  />
                  <label 
                    htmlFor={`edit-cls-${c.id}-${teacher.id}`} 
                    className={`text-xs ${isBusy ? 'text-gray-400 cursor-not-allowed italic' : 'cursor-pointer'}`}
                    title={isBusy ? `មុខវិជ្ជា (${busyWith}) មានគ្រូរួចហើយ` : ''}
                  >
                    {c.grade}{c.group}
                    {isBusy && <span className="block text-[8px] text-red-400">ជាប់ {busyWith}</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label>មុខវិជ្ជា (អតិបរមា ២)</Label>
        <ScrollArea className="h-32 border rounded-md p-2">
          <div className="space-y-2">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id={`edit-sub-${s.id}-${teacher.id}`}
                  checked={selectedSubjects.includes(s.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      if (selectedSubjects.length >= 2) {
                        toast.error('គ្រូម្នាក់អាចបង្រៀនបានត្រឹមតែ ២ មុខវិជ្ជាប៉ុណ្ណោះ!');
                        return;
                      }
                      setSelectedSubjects([...selectedSubjects, s.id]);
                    } else {
                      setSelectedSubjects(selectedSubjects.filter(id => id !== s.id));
                    }
                  }}
                />
                <label htmlFor={`edit-sub-${s.id}-${teacher.id}`} className="text-xs">{s.name}</label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Statistics for Edit Teacher */}
      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-blue-700">ចំនួនកម្រិតថ្នាក់:</span>
          <span className="font-bold">{stats.grades}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-blue-700">ចំនួនថ្នាក់:</span>
          <span className="font-bold">{stats.count}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-blue-700">ម៉ោងដែលត្រូវបង្រៀន:</span>
          <span className="font-bold text-blue-800">{stats.hours} ម៉ោង</span>
        </div>
      </div>

      <Button className="w-full bg-[#141414]" onClick={handleSave}>
        រក្សាទុក
      </Button>
    </div>
  );
}

export default function App() {
  // --- State ---
  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('school_classes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('school_subjects');
    if (saved) return JSON.parse(saved);
    
    // Default subjects if none saved
    const INITIAL_SUBJECTS_DATA = [
      { name: 'ភាសាខ្មែរ', code: 'K', hours: { '7': 6, '8': 6, '9': 6, '10': 6, '11SC': 3, '11SS': 5, '12SC': 3, '12SS': 5 } },
      { name: 'គណិតវិទ្យា', code: 'M', hours: { '7': 6, '8': 6, '9': 6, '10': 6, '11SC': 5, '11SS': 3, '12SC': 5, '12SS': 3 } },
      { name: 'គីមីវិទ្យា', code: 'C', hours: { '7': 1, '8': 1, '9': 1, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'រូបវិទ្យា', code: 'P', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'ជីវវិទ្យា', code: 'B', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'ភូមិវិទ្យា', code: 'G', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'ប្រវត្តិវិទ្យា', code: 'H', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'គេហកិច្ច', code: 'HE', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 0, '11SS': 0, '12SC': 0, '12SS': 0 } },
      { name: 'ផែនដីវិទ្យា', code: 'ES', hours: { '7': 1, '8': 1, '9': 1, '10': 2, '11SC': 2, '11SS': 2, '12SC': 2, '12SS': 2 } },
      { name: 'សេដ្ឋកិច្ច', code: 'EC', hours: { '7': 0, '8': 0, '9': 0, '10': 0, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'អង់គ្លេស', code: 'E', hours: { '7': 4, '8': 4, '9': 4, '10': 4, '11SC': 4, '11SS': 4, '12SC': 4, '12SS': 4 } },
      { name: 'កសិកម្ម', code: 'AG', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'កីឡា', code: 'Ed', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'សីលធម៌', code: 'I', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'ICT', code: 'CT', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'បណ្ណាល័យ', code: 'L', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'សុខភាព', code: 'HC', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'រោងជាង', code: 'WS', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'បំណិន', code: 'S', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } }
    ];
    return INITIAL_SUBJECTS_DATA.map(s => ({
      id: crypto.randomUUID(),
      name: s.name,
      code: s.code,
      hoursPerGrade: s.hours
    }));
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('school_teachers');
    return saved ? JSON.parse(saved) : [];
  });

  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => {
    const saved = localStorage.getItem('school_schedule');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [teacherSearch, setTeacherSearch] = useState('all');
  const [teacherFormClasses, setTeacherFormClasses] = useState<string[]>([]);
  const [teacherFormSubjects, setTeacherFormSubjects] = useState<string[]>([]);

  // --- Default Subjects List (for UI dropdown) ---
  const DEFAULT_SUBJECTS_LIST = [
    { name: 'ភាសាខ្មែរ', code: 'K' },
    { name: 'គណិតវិទ្យា', code: 'M' },
    { name: 'គីមីវិទ្យា', code: 'C' },
    { name: 'រូបវិទ្យា', code: 'P' },
    { name: 'ជីវវិទ្យា', code: 'B' },
    { name: 'ភូមិវិទ្យា', code: 'G' },
    { name: 'ប្រវត្តិវិទ្យា', code: 'H' },
    { name: 'គេហកិច្ច', code: 'HE' },
    { name: 'ផែនដីវិទ្យា', code: 'ES' },
    { name: 'សេដ្ឋកិច្ច', code: 'EC' },
    { name: 'អង់គ្លេស', code: 'E' },
    { name: 'កសិកម្ម', code: 'AG' },
    { name: 'កីឡា', code: 'Ed' },
    { name: 'សីលធម៌', code: 'I' },
    { name: 'ICT', code: 'CT' },
    { name: 'បណ្ណាល័យ', code: 'L' },
    { name: 'សុខភាព', code: 'HC' },
    { name: 'រោងជាង', code: 'WS' },
    { name: 'បំណិន', code: 'S' }
  ];

  const resetSubjectsToDefault = () => {
    const INITIAL_SUBJECTS_DATA = [
      { name: 'ភាសាខ្មែរ', code: 'K', hours: { '7': 6, '8': 6, '9': 6, '10': 6, '11SC': 3, '11SS': 5, '12SC': 3, '12SS': 5 } },
      { name: 'គណិតវិទ្យា', code: 'M', hours: { '7': 6, '8': 6, '9': 6, '10': 6, '11SC': 5, '11SS': 3, '12SC': 5, '12SS': 3 } },
      { name: 'គីមីវិទ្យា', code: 'C', hours: { '7': 1, '8': 1, '9': 1, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'រូបវិទ្យា', code: 'P', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'ជីវវិទ្យា', code: 'B', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 3, '11SS': 2, '12SC': 3, '12SS': 2 } },
      { name: 'ភូមិវិទ្យា', code: 'G', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'ប្រវត្តិវិទ្យា', code: 'H', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'គេហកិច្ច', code: 'HE', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 0, '11SS': 0, '12SC': 0, '12SS': 0 } },
      { name: 'ផែនដីវិទ្យា', code: 'ES', hours: { '7': 1, '8': 1, '9': 1, '10': 2, '11SC': 2, '11SS': 2, '12SC': 2, '12SS': 2 } },
      { name: 'សេដ្ឋកិច្ច', code: 'EC', hours: { '7': 0, '8': 0, '9': 0, '10': 0, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'អង់គ្លេស', code: 'E', hours: { '7': 4, '8': 4, '9': 4, '10': 4, '11SC': 4, '11SS': 4, '12SC': 4, '12SS': 4 } },
      { name: 'កសិកម្ម', code: 'AG', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'កីឡា', code: 'Ed', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'សីលធម៌', code: 'I', hours: { '7': 2, '8': 2, '9': 2, '10': 2, '11SC': 2, '11SS': 3, '12SC': 2, '12SS': 3 } },
      { name: 'ICT', code: 'CT', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'បណ្ណាល័យ', code: 'L', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'សុខភាព', code: 'HC', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'រោងជាង', code: 'WS', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } },
      { name: 'បំណិន', code: 'S', hours: { '7': 1, '8': 1, '9': 1, '10': 1, '11SC': 1, '11SS': 1, '12SC': 1, '12SS': 1 } }
    ];
    const newSubjects = INITIAL_SUBJECTS_DATA.map(s => ({
      id: crypto.randomUUID(),
      name: s.name,
      code: s.code,
      hoursPerGrade: s.hours
    }));
    setSubjects(newSubjects);
    toast.success('បានកំណត់មុខវិជ្ជាទៅជាលំនាំដើមវិញ');
  };

  // --- Persistence (Saving only) ---
  useEffect(() => {
    localStorage.setItem('school_classes', JSON.stringify(classes));
    localStorage.setItem('school_subjects', JSON.stringify(subjects));
    localStorage.setItem('school_teachers', JSON.stringify(teachers));
    localStorage.setItem('school_schedule', JSON.stringify(schedule));
  }, [classes, subjects, teachers, schedule]);

  // --- Helpers ---
  const getTeacherById = (id: string) => teachers.find(t => t.id === id);
  const getSubjectById = (id: string) => subjects.find(s => s.id === id);
  const getClassById = (id: string) => classes.find(c => c.id === id);

  // --- Actions: Classes ---
  const addClass = (grade: string, groupsString: string) => {
    if (!grade || !groupsString) return;
    
    // Split by comma or space and clean up
    const groups = groupsString.split(/[,\s]+/).filter(g => g.trim() !== "");
    
    if (groups.length === 0) return;

    const newClasses: Class[] = groups.map(group => ({
      id: crypto.randomUUID(),
      grade,
      group: group.trim().toUpperCase()
    }));

    setClasses([...classes, ...newClasses]);
    toast.success(`បានបន្ថែមថ្នាក់ថ្មីចំនួន ${newClasses.length}`);
  };

  const updateClass = (id: string, grade: string, group: string) => {
    setClasses(classes.map(c => c.id === id ? { ...c, grade, group: group.toUpperCase() } : c));
    toast.success('បានកែសម្រួលថ្នាក់');
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    setSchedule(schedule.filter(s => s.classId !== id));
    toast.info('បានលុបថ្នាក់');
  };

  // --- Actions: Subjects ---
  const addSubject = (name: string, code: string, hoursPerGrade: Record<string, number>) => {
    if (!name || !code) return;
    
    // Check for duplicates
    const isDuplicate = subjects.some(s => 
      s.name.toLowerCase() === name.toLowerCase() || 
      s.code.toUpperCase() === code.toUpperCase()
    );
    
    if (isDuplicate) {
      toast.error('មុខវិជ្ជា ឬកូដនេះមានរួចហើយ!');
      return;
    }

    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name,
      code: code.toUpperCase(),
      hoursPerGrade
    };
    setSubjects([...subjects, newSubject]);
    toast.success('បានបន្ថែមមុខវិជ្ជាថ្មី');
  };

  const updateSubject = (id: string, name: string, code: string, hoursPerGrade: Record<string, number>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, name, code: code.toUpperCase(), hoursPerGrade } : s));
    toast.success('បានកែសម្រួលមុខវិជ្ជា');
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    setSchedule(schedule.filter(s => s.subjectId !== id));
    toast.info('បានលុបមុខវិជ្ជា');
  };

  // --- Actions: Teachers ---
  const addTeacher = (name: string, code: string, availability: Record<string, ('morning' | 'afternoon')[]>, assignedClasses: string[], subjectIds: string[]) => {
    if (!name || !code) return;
    const newTeacher: Teacher = {
      id: crypto.randomUUID(),
      name,
      code,
      availableDays: Object.keys(availability),
      availablePeriods: Array.from(new Set(Object.values(availability).flat())),
      availability,
      assignedClasses,
      subjects: subjectIds,
      color: TEACHER_COLORS[teachers.length % TEACHER_COLORS.length]
    };
    setTeachers([...teachers, newTeacher]);
    toast.success('បានបន្ថែមគ្រូបង្រៀនថ្មី');
  };

  const updateTeacher = (id: string, name: string, code: string, availability: Record<string, ('morning' | 'afternoon')[]>, assignedClasses: string[], subjectIds: string[]) => {
    setTeachers(teachers.map(t => t.id === id ? {
      ...t,
      name,
      code,
      availableDays: Object.keys(availability),
      availablePeriods: Array.from(new Set(Object.values(availability).flat())),
      availability,
      assignedClasses,
      subjects: subjectIds
    } : t));
    toast.success('បានកែសម្រួលគ្រូបង្រៀន');
  };

  const deleteTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
    setSchedule(schedule.filter(s => s.teacherId !== id));
    toast.info('បានលុបគ្រូបង្រៀន');
  };

  // --- Scheduling Logic ---
  const autoGenerateSchedule = () => {
    // 1. Clear current schedule
    const newSchedule: ScheduleEntry[] = [];
    
    // 2. Track teacher busy slots
    const teacherBusySlots: Record<string, Set<string>> = {};
    teachers.forEach(t => {
      teacherBusySlots[t.id] = new Set();
    });

    // 3. Subject-first approach per class to avoid over-scheduling
    // Shuffle classes and subjects to avoid bias
    const shuffledClasses = [...classes].sort(() => Math.random() - 0.5);
    const shuffledSubjects = [...subjects].sort(() => Math.random() - 0.5);

    for (const cls of shuffledClasses) {
      for (const subject of shuffledSubjects) {
        const requiredHours = Number(subject.hoursPerGrade[cls.grade]) || 0;
        if (requiredHours === 0) continue;

        // Find the teacher assigned to this class who teaches this subject
        const teacher = teachers.find(t => 
          t.assignedClasses.includes(cls.id) && 
          t.subjects.includes(subject.id)
        );

        if (!teacher) continue;

        let scheduledHoursForThisTeacher = 0;
        const hoursScheduledThisSubjectToday: Record<string, number> = {};

        // New rules for pairs:
        // 1 or 2 hours -> 0 pairs (spread)
        // 3 hours -> 1 pair + 1 single
        // 4 hours -> 2 pairs
        // 5 hours -> 2 pairs + 1 single
        // 6 hours -> 3 pairs
        const pairsNeeded = requiredHours < 3 ? 0 : Math.floor(requiredHours / 2);
        
        // First pass: Try to schedule 2-hour CONSECUTIVE blocks
        if (pairsNeeded > 0) {
          let pairsScheduled = 0;
          
          // Spread across days: try one pair per day
          const dayPool = [...DAYS_OF_WEEK].sort(() => Math.random() - 0.5);
          for (const day of dayPool) {
            if (pairsScheduled >= pairsNeeded) break;
            
            const dayAvailability = teacher.availability[day];
            if (!dayAvailability || dayAvailability.length === 0) continue;

            const availablePairs: [TimeSlot, TimeSlot][] = [];
            for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
              const s1 = TIME_SLOTS[i];
              const s2 = TIME_SLOTS[i+1];
              if (s1.period !== s2.period) continue;
              if (!dayAvailability.includes(s1.period)) continue;

              const key1 = `${day}-${s1.id}`;
              const key2 = `${day}-${s2.id}`;
              const taken1 = newSchedule.some(s => s.classId === cls.id && s.day === day && s.timeSlotId === s1.id);
              const taken2 = newSchedule.some(s => s.classId === cls.id && s.day === day && s.timeSlotId === s2.id);
              const busy1 = teacherBusySlots[teacher.id].has(key1);
              const busy2 = teacherBusySlots[teacher.id].has(key2);
              
              if (!taken1 && !taken2 && !busy1 && !busy2) {
                availablePairs.push([s1, s2]);
              }
            }

            if (availablePairs.length > 0) {
              const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
              newSchedule.push({ id: crypto.randomUUID(), classId: cls.id, day, timeSlotId: pair[0].id, teacherId: teacher.id, subjectId: subject.id });
              newSchedule.push({ id: crypto.randomUUID(), classId: cls.id, day, timeSlotId: pair[1].id, teacherId: teacher.id, subjectId: subject.id });
              teacherBusySlots[teacher.id].add(`${day}-${pair[0].id}`);
              teacherBusySlots[teacher.id].add(`${day}-${pair[1].id}`);
              hoursScheduledThisSubjectToday[day] = (hoursScheduledThisSubjectToday[day] || 0) + 2;
              pairsScheduled++;
              scheduledHoursForThisTeacher += 2;
            }
          }
        }

        // Second pass: Fill remaining hours (single hours)
        // Rule: For 1 or 2 hours total, don't put consecutively (max 1 per day if possible)
        // For others, if we still have singles, fill them and try to spread
        if (scheduledHoursForThisTeacher < requiredHours) {
          const shuffledDays = [...DAYS_OF_WEEK].sort(() => Math.random() - 0.5);
          for (const day of shuffledDays) {
            if (scheduledHoursForThisTeacher >= requiredHours) break;
            
            // If total hours < 3, then don't put more than 1 hour per day
            if (requiredHours < 3 && (hoursScheduledThisSubjectToday[day] || 0) >= 1) continue;
            // Otherwise max 2 (for pairs we already handled pairs, this fills the odd hour)
            if ((hoursScheduledThisSubjectToday[day] || 0) >= 2) continue;

            const dayAvailability = teacher.availability[day];
            if (!dayAvailability || dayAvailability.length === 0) continue;

            const shuffledSlots = [...TIME_SLOTS].sort(() => Math.random() - 0.5);
            for (const slot of shuffledSlots) {
              if (scheduledHoursForThisTeacher >= requiredHours) break;
              if (requiredHours < 3 && (hoursScheduledThisSubjectToday[day] || 0) >= 1) break;
              if ((hoursScheduledThisSubjectToday[day] || 0) >= 2) break;
              if (!dayAvailability.includes(slot.period)) continue;

              const key = `${day}-${slot.id}`;
              const taken = newSchedule.some(s => s.classId === cls.id && s.day === day && s.timeSlotId === slot.id);
              const busy = teacherBusySlots[teacher.id].has(key);

              if (!taken && !busy) {
                newSchedule.push({
                  id: crypto.randomUUID(),
                  classId: cls.id,
                  day,
                  timeSlotId: slot.id,
                  teacherId: teacher.id,
                  subjectId: subject.id
                });

                teacherBusySlots[teacher.id].add(key);
                hoursScheduledThisSubjectToday[day] = (hoursScheduledThisSubjectToday[day] || 0) + 1;
                scheduledHoursForThisTeacher++;
                // Spread singles across days
                break; 
              }
            }
          }
        }
      }
    }

    setSchedule(newSchedule);
    toast.success('បានបង្កើតកាលវិភាគស្វ័យប្រវត្តិដោយជោគជ័យ');
  };

  const clearSchedule = () => {
    setSchedule([]);
    toast.info('បានសម្អាតកាលវិភាគ');
  };

  const importTeachersFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newTeachers: Teacher[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
          const name = row['Name'] || row['ឈ្មោះ'] || row['ឈ្មោះគ្រូ'];
          const code = row['Code'] || row['កូដ'] || row['កូដគ្រូ'];

          if (name && code) {
            newTeachers.push({
              id: crypto.randomUUID(),
              name,
              code: String(code).toUpperCase(),
              availableDays: [...DAYS_OF_WEEK],
              availablePeriods: ['morning', 'afternoon'],
              availability: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: ['morning', 'afternoon'] }), {}),
              assignedClasses: [],
              subjects: [],
              color: TEACHER_COLORS[(teachers.length + newTeachers.length) % TEACHER_COLORS.length]
            });
          } else {
            errors.push(`Row ${index + 2}: ឈ្មោះ ឬ កូដ មិនពេញលេញ`);
          }
        });

        if (newTeachers.length > 0) {
          setTeachers([...teachers, ...newTeachers]);
          toast.success(`បានបញ្ចូលគ្រូ ${newTeachers.length} នាក់ដោយជោគជ័យ`);
        }

        if (errors.length > 0) {
          const blob = new Blob([errors.join('\n')], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'teacher_import_errors.txt';
          a.click();
          toast.warning(`មានកំហុសមួយចំនួន ${errors.length}។ បានទាញយក File Error រួចរាល់។`);
        }
      } catch (err) {
        toast.error('មានបញ្ហាក្នុងការអាន File Excel');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadTeacherTemplate = () => {
    const data = [
      { 'Name': 'ឈ្មោះគ្រូ', 'Code': 'CODE1' },
      { 'Name': 'Sample Teacher', 'Code': 'ST1' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, "teacher_template.xlsx");
  };

  const updateScheduleEntry = (day: string, timeSlotId: string, classId: string, teacherId: string, subjectId: string) => {
    if (teacherId !== 'none') {
      const teacher = getTeacherById(teacherId);
      const slot = TIME_SLOTS.find(s => s.id === timeSlotId);
      if (teacher && slot) {
        const dayAvailability = teacher.availability[day];
        if (!dayAvailability || !dayAvailability.includes(slot.period)) {
          toast.warning(`គ្រូ ${teacher.name} មិនទំនេរនៅពេលនេះទេ!`);
        }
      }
    }

    // Check if teacher is busy elsewhere
    const isTeacherBusy = schedule.some(s => 
      s.day === day && 
      s.timeSlotId === timeSlotId && 
      s.teacherId === teacherId && 
      s.classId !== classId
    );

    if (isTeacherBusy) {
      toast.error('គ្រូបង្រៀននេះមានម៉ោងបង្រៀននៅថ្នាក់ផ្សេងរួចហើយ!');
      return;
    }

    const existingIndex = schedule.findIndex(s => s.day === day && s.timeSlotId === timeSlotId && s.classId === classId);
    
    if (teacherId === 'none') {
      if (existingIndex !== -1) {
        const newSchedule = [...schedule];
        newSchedule.splice(existingIndex, 1);
        setSchedule(newSchedule);
      }
      return;
    }

    const newEntry: ScheduleEntry = {
      id: crypto.randomUUID(),
      classId,
      day,
      timeSlotId,
      teacherId,
      subjectId
    };

    if (existingIndex !== -1) {
      const newSchedule = [...schedule];
      newSchedule[existingIndex] = newEntry;
      setSchedule(newSchedule);
    } else {
      setSchedule([...schedule, newEntry]);
    }
  };

  // --- Export ---
  const exportToExcel = () => {
    const data: any[] = [];
    
    // Header Row 1: Days
    const row1 = ['ថ្នាក់'];
    DAYS_OF_WEEK.forEach(day => {
      row1.push(day);
      for (let i = 1; i < TIME_SLOTS.length; i++) row1.push('');
    });
    data.push(row1);

    // Header Row 2: Time Slots
    const row2 = [''];
    DAYS_OF_WEEK.forEach(() => {
      TIME_SLOTS.forEach(slot => {
        row2.push(slot.label);
      });
    });
    data.push(row2);

    // Data Rows: Classes
    classes.forEach(cls => {
      const row = [`${cls.grade}${cls.group}`];
      DAYS_OF_WEEK.forEach(day => {
        TIME_SLOTS.forEach(slot => {
          const entry = schedule.find(s => s.classId === cls.id && s.day === day && s.timeSlotId === slot.id);
          if (entry) {
            const teacher = getTeacherById(entry.teacherId);
            row.push(teacher?.code || '');
          } else {
            row.push('');
          }
        });
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Add merges for days
    ws['!merges'] = DAYS_OF_WEEK.map((_, idx) => ({
      s: { r: 0, c: 1 + idx * TIME_SLOTS.length },
      e: { r: 0, c: 1 + (idx + 1) * TIME_SLOTS.length - 1 }
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
    XLSX.writeFile(wb, 'kandal_schedule.xlsx');
    toast.success('បានទាញយកកាលវិភាគជា Excel');
  };

  // --- Render Helpers ---
  const filteredClasses = useMemo(() => {
    let result = selectedClassId === 'all' ? classes : classes.filter(c => c.id === selectedClassId);
    
    if (teacherSearch !== 'all') {
      // Find classes where this specific teacher is scheduled
      const classesWithTeacher = new Set(
        schedule
          .filter(s => s.teacherId === teacherSearch)
          .map(s => s.classId)
      );
      
      result = result.filter(c => classesWithTeacher.has(c.id));
    }
    
    return result;
  }, [classes, selectedClassId, teacherSearch, schedule]);

  return (
    <div className="min-h-screen bg-transparent font-sans text-[#1A1A1A]">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/40">
          <div>
            <h1 className="text-3xl font-moul tracking-tight text-[#141414] mb-1">ប្រព័ន្ធរៀបកាលវិភាគស្វ័យប្រវត្តិ</h1>
            <p className="text-[#141414]/80 text-sm font-medium">គ្រប់គ្រងការបង្រៀន និងរៀបចំកាលវិភាគដោយវៃឆ្លាត</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exportToExcel} className="rounded-xl border-[#E9ECEF] hover:bg-[#F8F9FA]">
              <Download size={18} className="mr-2" /> ទាញយកជា Excel
            </Button>
            <Button onClick={autoGenerateSchedule} className="bg-[#141414] hover:bg-[#2D2D2D] text-white rounded-xl shadow-lg shadow-black/10">
              <CalendarIcon size={18} className="mr-2" /> រៀបកាលវិភាគស្វ័យប្រវត្តិ
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (confirm('តើអ្នកពិតជាចង់សម្អាតទិន្នន័យទាំងអស់មែនទេ?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }} 
              className="rounded-xl border-red-200 text-red-500 hover:bg-red-50"
            >
              <RotateCcw size={18} className="mr-2" /> កំណត់ឡើងវិញ
            </Button>
            <Button variant="destructive" onClick={clearSchedule} className="rounded-xl shadow-lg shadow-red-500/10">
              <Trash2 size={18} className="mr-2" /> សម្អាត
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/40 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-white/40 mb-6 h-12">
            <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">កាលវិភាគរួម</TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">ថ្នាក់រៀន</TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">មុខវិជ្ជា</TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">គ្រូបង្រៀន</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="border-none shadow-sm bg-white/40 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">កាលវិភាគរួម</CardTitle>
                  <CardDescription>បង្ហាញកាលវិភាគតាមថ្នាក់នីមួយៗ</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end text-[10px] font-bold text-[#141414]/60">
                    <div>កម្រិតថ្នាក់: {Array.from(new Set(classes.map(c => c.grade))).length}</div>
                    <div>ចំនួនថ្នាក់: {classes.length}</div>
                    <div>ម៉ោងសរុប: {schedule.length} ម៉ោង</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-[#141414]/40" />
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="ជ្រើសរើសថ្នាក់" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ថ្នាក់ទាំងអស់</SelectItem>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.grade}{c.group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#141414]/40" />
                    <Select value={teacherSearch} onValueChange={setTeacherSearch}>
                      <SelectTrigger className="w-[200px] bg-white">
                        <SelectValue placeholder="ជ្រើសរើសគ្រូ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">គ្រូទាំងអស់</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name} ({t.code})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSchedule} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    សម្អាតទាំងអស់
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px] rounded-md border border-[#141414]/5">
                  <div className="min-w-[3000px]">
                    <Table>
                      <TableHeader className="bg-[#141414]/5 sticky top-0 z-10">
                        <TableRow>
                          <TableHead rowSpan={2} className="w-[120px] border-r border-[#141414]/10 text-center font-bold bg-[#141414]/5">ថ្នាក់</TableHead>
                          {DAYS_OF_WEEK.map(day => (
                            <TableHead key={day} colSpan={TIME_SLOTS.length} className="text-center border-r border-[#141414]/10 font-bold bg-[#141414]/10">
                              {day}
                            </TableHead>
                          ))}
                          <TableHead rowSpan={2} className="w-[80px] border-l border-[#141414]/10 text-center font-bold bg-[#141414]/5">សរុប</TableHead>
                        </TableRow>
                        <TableRow>
                          {DAYS_OF_WEEK.map(day => (
                            TIME_SLOTS.map(slot => (
                              <TableHead key={`${day}-${slot.id}`} className="text-center border-r border-[#141414]/10 font-bold text-[10px] bg-[#141414]/5 w-[80px]">
                                {slot.label}
                              </TableHead>
                            ))
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClasses.map((cls) => (
                          <TableRow key={cls.id} className="hover:bg-[#141414]/[0.02] transition-colors border-b border-[#141414]/5">
                            <TableCell className="font-bold text-xl border-r border-[#141414]/10 bg-white text-center align-middle sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-2xl font-black text-[#141414]">{cls.grade}</span>
                                <Badge variant="secondary" className="text-[10px] bg-[#141414] text-white hover:bg-[#141414]">{cls.group}</Badge>
                              </div>
                            </TableCell>
                            {DAYS_OF_WEEK.map(day => (
                              TIME_SLOTS.map(slot => {
                                const entry = schedule.find(s => s.classId === cls.id && s.day === day && s.timeSlotId === slot.id);
                                const teacher = entry ? getTeacherById(entry.teacherId) : null;
                                const subject = entry ? getSubjectById(entry.subjectId) : null;
                                const isHighlighted = entry && teacherSearch !== 'all' && entry.teacherId === teacherSearch;

                                return (
                                  <TableCell key={`${day}-${slot.id}`} className="p-0 border-r border-[#141414]/10 h-[100px] w-[80px]">
                                    <Dialog>
                                      <DialogTrigger 
                                        render={
                                          <button 
                                            className={`w-full h-full p-2 text-left transition-all relative group ${
                                              entry ? 'shadow-sm' : 'hover:bg-[#141414]/5'
                                            } ${isHighlighted ? 'ring-2 ring-blue-500 ring-inset z-30 scale-[1.02] shadow-lg' : teacherSearch !== 'all' && entry ? 'opacity-30' : ''}`}
                                            style={teacher ? { 
                                              backgroundColor: `${teacher.color}15`, 
                                              borderLeft: `4px solid ${teacher.color}`,
                                              color: teacher.color 
                                            } : {}}
                                          />
                                        }
                                      >
                                        {entry ? (
                                          <div className="flex flex-col items-center justify-center h-full gap-1">
                                            <div className="text-lg font-black leading-none">
                                              {teacher?.code}
                                            </div>
                                            <div className="text-[9px] font-bold opacity-70 uppercase truncate max-w-full">
                                              {subject?.name}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={14} className="text-[#141414]/20" />
                                          </div>
                                        )}
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-2xl font-bold">រៀបចំម៉ោងបង្រៀន</DialogTitle>
                                          <CardDescription>
                                            ថ្នាក់ {cls.grade}{cls.group} | {day} | ម៉ោង {slot.label}
                                          </CardDescription>
                                        </DialogHeader>
                                        <div className="grid gap-6 py-6">
                                          <div className="space-y-3">
                                            <Label className="text-sm font-bold flex items-center gap-2">
                                              <Users size={14} />
                                              ជ្រើសរើសគ្រូបង្រៀន
                                            </Label>
                                            <Select 
                                              defaultValue={entry?.teacherId || 'none'}
                                              onValueChange={(val) => {
                                                if (val === 'none') {
                                                  updateScheduleEntry(day, slot.id, cls.id, 'none', '');
                                                } else {
                                                  const t = getTeacherById(val);
                                                  if (t) {
                                                    updateScheduleEntry(day, slot.id, cls.id, val, t.subjects[0]);
                                                  }
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="h-12 text-base">
                                                <SelectValue placeholder="ជ្រើសរើសគ្រូ" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none" className="text-red-500">គ្មាន (លុប)</SelectItem>
                                                {teachers
                                                  .filter(t => t.assignedClasses.includes(cls.id) && t.availableDays.includes(day))
                                                  .map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                                        {t.name} ({t.code})
                                                      </div>
                                                    </SelectItem>
                                                  ))
                                                }
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {entry && (
                                            <div className="space-y-3">
                                              <Label className="text-sm font-bold flex items-center gap-2">
                                                <BookOpen size={14} />
                                                ជ្រើសរើសមុខវិជ្ជា
                                              </Label>
                                              <Select 
                                                defaultValue={entry.subjectId}
                                                onValueChange={(val) => updateScheduleEntry(day, slot.id, cls.id, entry.teacherId, val)}
                                              >
                                                <SelectTrigger className="h-12 text-base">
                                                  <SelectValue placeholder="ជ្រើសរើសមុខវិជ្ជា" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {getTeacherById(entry.teacherId)?.subjects.map(sId => {
                                                    const s = getSubjectById(sId);
                                                    return <SelectItem key={sId} value={sId}>{s?.name}</SelectItem>;
                                                  })}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )}
                                        </div>
                                        <DialogFooter>
                                          <Button variant="outline" className="w-full" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                                            បិទ
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </TableCell>
                                );
                              })
                            ))}
                            <TableCell className="font-bold text-center border-l border-[#141414]/10 bg-[#141414]/5">
                              {schedule.filter(s => s.classId === cls.id).length}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none shadow-sm h-fit bg-white/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>បន្ថែមថ្នាក់ថ្មី</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>កម្រិតថ្នាក់</Label>
                    <Select onValueChange={(val: string) => {
                      const input = document.getElementById('grade-input') as HTMLInputElement;
                      if (input) input.value = val;
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ជ្រើសរើសកម្រិតថ្នាក់" />
                      </SelectTrigger>
                      <SelectContent>
                        {['7', '8', '9', '10', '11SC', '11SS', '12SC', '12SS'].map(g => (
                          <SelectItem key={g} value={g}>ថ្នាក់ទី {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" id="grade-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>ក្រុមថ្នាក់ (ជ្រើសរើស)</Label>
                    <div className="grid grid-cols-4 gap-2 border rounded-xl p-3 bg-[#F8F9FA]">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                        <div key={g} className="flex items-center gap-2">
                          <input type="checkbox" id={`group-${g}`} className="group-checkbox" value={g} />
                          <label htmlFor={`group-${g}`} className="text-sm font-bold">{g}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-[#141414]" 
                    onClick={() => {
                      const grade = (document.getElementById('grade-input') as HTMLInputElement).value;
                      const checkedGroups = Array.from(document.querySelectorAll('.group-checkbox:checked')).map(cb => (cb as HTMLInputElement).value);
                      const groupsString = checkedGroups.join(',');
                      
                      if (!grade) {
                        toast.error('សូមបញ្ចូលកម្រិតថ្នាក់!');
                        return;
                      }
                      if (checkedGroups.length === 0) {
                        toast.error('សូមជ្រើសរើសក្រុមថ្នាក់យ៉ាងហោចណាស់ ១!');
                        return;
                      }

                      addClass(grade, groupsString);
                      (document.getElementById('grade-input') as HTMLInputElement).value = '';
                      document.querySelectorAll('.group-checkbox').forEach(cb => (cb as HTMLInputElement).checked = false);
                    }}
                  >
                    បន្ថែមថ្នាក់
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm bg-white/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>បញ្ជីថ្នាក់រៀន</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>កម្រិតថ្នាក់</TableHead>
                        <TableHead>ក្រុមថ្នាក់</TableHead>
                        <TableHead className="text-right">សកម្មភាព</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">មិនទាន់មានទិន្នន័យ</TableCell>
                        </TableRow>
                      ) : (
                        classes.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-bold">{c.grade}</TableCell>
                            <TableCell>{c.group}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Dialog>
                                <DialogTrigger render={<Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50" />}>
                                  <Edit size={18} />
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>កែសម្រួលថ្នាក់</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>កម្រិតថ្នាក់</Label>
                                      <Input id={`edit-grade-${c.id}`} defaultValue={c.grade} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>ក្រុមថ្នាក់</Label>
                                      <Input id={`edit-group-${c.id}`} defaultValue={c.group} />
                                    </div>
                                    <Button 
                                      className="w-full bg-[#141414]" 
                                      onClick={() => {
                                        const grade = (document.getElementById(`edit-grade-${c.id}`) as HTMLInputElement).value;
                                        const group = (document.getElementById(`edit-group-${c.id}`) as HTMLInputElement).value;
                                        updateClass(c.id, grade, group);
                                        (document.querySelector('[data-state="open"]') as any)?.click();
                                      }}
                                    >
                                      រក្សាទុក
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button variant="ghost" size="icon" onClick={() => deleteClass(c.id)} className="text-red-500 hover:bg-red-50">
                                <Trash2 size={18} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <div className="flex flex-col gap-6">
              <Card className="border-none shadow-sm h-fit bg-white/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>បន្ថែមមុខវិជ្ជា</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>ឈ្មោះមុខវិជ្ជា</Label>
                        <Select onValueChange={(val: string) => {
                          const input = document.getElementById('sub-name') as HTMLInputElement;
                          const codeInput = document.getElementById('sub-code') as HTMLInputElement;
                          if (val === 'custom') {
                            input.value = '';
                            input.focus();
                          } else {
                            const sub = DEFAULT_SUBJECTS_LIST.find(s => s.name === val);
                            input.value = val;
                            if (sub) codeInput.value = sub.code;
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="ជ្រើសរើសមុខវិជ្ជា" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_SUBJECTS_LIST.map(s => (
                              <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                            ))}
                            <SelectItem value="custom" className="font-bold text-blue-600">+ បញ្ចូលថ្មី</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input id="sub-name" placeholder="ឈ្មោះមុខវិជ្ជា" className="mt-2" />
                      </div>
                      <div className="space-y-2">
                        <Label>កូដតំណាង</Label>
                        <Input id="sub-code" placeholder="MATH" />
                      </div>
                      <Button 
                        className="w-full bg-[#141414]" 
                        onClick={() => {
                          const name = (document.getElementById('sub-name') as HTMLInputElement).value;
                          const code = (document.getElementById('sub-code') as HTMLInputElement).value;
                          const hoursInputs = document.querySelectorAll('.subject-hours-input');
                          const hoursPerGrade: Record<string, number> = {};
                          hoursInputs.forEach(input => {
                            const grade = (input as HTMLInputElement).getAttribute('data-grade');
                            const val = parseInt((input as HTMLInputElement).value) || 0;
                            if (grade) hoursPerGrade[grade] = val;
                          });
                          addSubject(name, code, hoursPerGrade);
                          (document.getElementById('sub-name') as HTMLInputElement).value = '';
                          (document.getElementById('sub-code') as HTMLInputElement).value = '';
                          hoursInputs.forEach(input => (input as HTMLInputElement).value = '');
                        }}
                      >
                        បន្ថែមមុខវិជ្ជា
                      </Button>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-sm font-bold mb-4 block">ចំនួនម៉ោងតាមកម្រិតថ្នាក់</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        {['7', '8', '9', '10', '11SC', '11SS', '12SC', '12SS'].map(grade => (
                          <div key={grade} className="space-y-1">
                            <Label className="text-[10px] text-gray-500">ថ្នាក់ {grade}</Label>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              data-grade={grade}
                              className="h-8 text-xs subject-hours-input"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white/40 backdrop-blur-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BookOpen className="text-blue-600" />
                      បញ្ជីមុខវិជ្ជា និងម៉ោងសិក្សា
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={resetSubjectsToDefault} className="text-xs gap-1">
                      <RotateCcw size={14} />
                      កំណត់ឡើងវិញ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-[#141414]/5">
                        <TableRow>
                          <TableHead className="w-[150px]">មុខវិជ្ជា</TableHead>
                          <TableHead className="w-[80px]">កូដ</TableHead>
                          {['7', '8', '9', '10', '11SC', '11SS', '12SC', '12SS'].map(g => (
                            <TableHead key={g} className="text-center text-[10px] p-1 font-bold">ថ្នាក់ {g}</TableHead>
                          ))}
                          <TableHead className="text-right">សកម្មភាព</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjects.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">មិនទាន់មានទិន្នន័យ</TableCell>
                          </TableRow>
                        ) : (
                          subjects.map(s => (
                            <TableRow key={s.id} className="hover:bg-[#141414]/[0.02]">
                              <TableCell className="font-semibold">{s.name}</TableCell>
                              <TableCell><Badge variant="outline" className="bg-white">{s.code}</Badge></TableCell>
                              {['7', '8', '9', '10', '11SC', '11SS', '12SC', '12SS'].map(g => {
                                const hours = (s.hoursPerGrade as any)[g] || 0;
                                return (
                                  <TableCell key={g} className={`text-center font-bold text-xs ${hours > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                    {hours > 0 ? `${hours}ម៉` : '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Dialog>
                                    <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" />}>
                                      <Edit size={16} />
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>កែសម្រួលមុខវិជ្ជា</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label>ឈ្មោះមុខវិជ្ជា</Label>
                                          <Input id={`edit-sub-name-${s.id}`} defaultValue={s.name} />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>កូដតំណាង</Label>
                                          <Input id={`edit-sub-code-${s.id}`} defaultValue={s.code} />
                                        </div>
                                        <div className="space-y-4 pt-2">
                                          <Label className="text-sm font-bold">ចំនួនម៉ោងតាមកម្រិតថ្នាក់</Label>
                                          {['7', '8', '9', '10', '11SC', '11SS', '12SC', '12SS'].map(grade => (
                                            <div key={grade} className="flex items-center justify-between gap-4">
                                              <Label className="text-xs">ថ្នាក់ទី {grade}</Label>
                                              <Input 
                                                type="number" 
                                                defaultValue={(s.hoursPerGrade as any)[grade] || 0}
                                                className={`w-20 h-8 text-xs edit-subject-hours-input-${s.id}`}
                                                data-grade={grade}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                        <Button 
                                          className="w-full bg-[#141414]" 
                                          onClick={() => {
                                            const name = (document.getElementById(`edit-sub-name-${s.id}`) as HTMLInputElement).value;
                                            const code = (document.getElementById(`edit-sub-code-${s.id}`) as HTMLInputElement).value;
                                            const hoursInputs = document.querySelectorAll(`.edit-subject-hours-input-${s.id}`);
                                            const hoursPerGrade: Record<string, number> = {};
                                            hoursInputs.forEach(input => {
                                              const grade = (input as HTMLInputElement).getAttribute('data-grade');
                                              const val = parseInt((input as HTMLInputElement).value) || 0;
                                              if (grade) hoursPerGrade[grade] = val;
                                            });
                                            updateSubject(s.id, name, code, hoursPerGrade);
                                            (document.querySelector('[data-state="open"]') as any)?.click();
                                          }}
                                        >
                                          រក្សាទុក
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)} className="h-8 w-8 text-red-500">
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <div className="flex flex-col gap-6">
              {/* Excel Import/Export Section */}
              <Card className="border-none shadow-sm bg-white/40 backdrop-blur-md">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileUp size={20} className="text-green-600" />
                      ទាញចូលគ្រូបង្រៀនពី Excel
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadTeacherTemplate} className="text-xs bg-white">
                        <Download size={14} className="mr-1" /> Template
                      </Button>
                      <Label htmlFor="excel-import" className="cursor-pointer">
                        <div className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2">
                          <Upload size={14} /> ទាញចូល (Import)
                        </div>
                        <Input id="excel-import" type="file" accept=".xlsx, .xls" className="hidden" onChange={importTeachersFromExcel} />
                      </Label>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="md:col-span-1 border-none shadow-sm h-fit bg-white/40 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>បន្ថែមគ្រូបង្រៀន</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>ឈ្មោះគ្រូបង្រៀន</Label>
                      <Input id="teacher-name" placeholder="ឈ្មោះ..." />
                    </div>
                    <div className="space-y-2">
                      <Label>កូដបង្រៀន</Label>
                      <Input 
                        id="teacher-code" 
                        placeholder="ឧ. MATH1"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">កំណត់ពេលបង្រៀនតាមថ្ងៃ</Label>
                      <div className="space-y-2 border rounded-xl p-3 bg-[#F8F9FA]">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day} className="flex items-center justify-between py-1 border-b last:border-0 border-[#E9ECEF]">
                            <span className="text-xs font-bold w-12">{day}</span>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1.5">
                                <input type="checkbox" id={`morning-${day}`} className="teacher-avail-check" data-day={day} data-period="morning" defaultChecked />
                                <label htmlFor={`morning-${day}`} className="text-[10px]">ព្រឹក</label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input type="checkbox" id={`afternoon-${day}`} className="teacher-avail-check" data-day={day} data-period="afternoon" defaultChecked />
                                <label htmlFor={`afternoon-${day}`} className="text-[10px]">រសៀល</label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>ថ្នាក់ត្រូវបង្រៀន</Label>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        <div className="grid grid-cols-2 gap-2">
                          {classes.map(c => {
                            // Check if this class is already taken for ANY of the selected subjects
                            const conflictingSubjects = teacherFormSubjects.filter(subId => 
                              teachers.some(t => t.assignedClasses.includes(c.id) && t.subjects.includes(subId))
                            );
                            const isBusy = conflictingSubjects.length > 0;
                            const busyWith = conflictingSubjects.map(id => getSubjectById(id)?.name).join(', ');

                            return (
                              <div key={c.id} className="flex items-start gap-2 group relative">
                                <input 
                                  type="checkbox" 
                                  id={`cls-${c.id}`} 
                                  className="teacher-class-check mt-1" 
                                  value={c.id} 
                                  disabled={isBusy}
                                  checked={teacherFormClasses.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTeacherFormClasses([...teacherFormClasses, c.id]);
                                    } else {
                                      setTeacherFormClasses(teacherFormClasses.filter(id => id !== c.id));
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={`cls-${c.id}`} 
                                  className={`text-xs ${isBusy ? 'text-gray-400 cursor-not-allowed italic' : 'cursor-pointer'}`}
                                  title={isBusy ? `មុខវិជ្ជា (${busyWith}) មានគ្រូរួចហើយ` : ''}
                                >
                                  {c.grade}{c.group}
                                  {isBusy && <span className="block text-[8px] text-red-400">ជាប់ {busyWith}</span>}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-2">
                      <Label>មុខវិជ្ជា (អតិបរមា ២)</Label>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        <div className="space-y-2">
                          {subjects.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`sub-${s.id}`} 
                                className="teacher-sub-check" 
                                value={s.id} 
                                checked={teacherFormSubjects.includes(s.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (teacherFormSubjects.length >= 2) {
                                      toast.error('គ្រូម្នាក់អាចបង្រៀនបានត្រឹមតែ ២ មុខវិជ្ជាប៉ុណ្ណោះ!');
                                      return;
                                    }
                                    setTeacherFormSubjects([...teacherFormSubjects, s.id]);
                                  } else {
                                    setTeacherFormSubjects(teacherFormSubjects.filter(id => id !== s.id));
                                  }
                                }}
                              />
                              <label htmlFor={`sub-${s.id}`} className="text-xs">{s.name}</label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Statistics for Add Teacher */}
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-700">ចំនួនកម្រិតថ្នាក់:</span>
                        <span className="font-bold">{new Set(classes.filter(c => teacherFormClasses.includes(c.id)).map(c => c.grade)).size}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-700">ចំនួនថ្នាក់:</span>
                        <span className="font-bold">{teacherFormClasses.length}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-700">ម៉ោងដែលត្រូវបង្រៀន:</span>
                        <span className="font-bold text-blue-800">
                          {teacherFormClasses.reduce((total, classId) => {
                            const cls = getClassById(classId);
                            if (!cls) return total;
                            
                            const subjectHours = teacherFormSubjects.reduce((subTotal, subId) => {
                              const sub = getSubjectById(subId);
                              if (!sub) return subTotal;
                              const hoursForGrade = Number(sub.hoursPerGrade[cls.grade]) || 0;
                              return subTotal + hoursForGrade;
                            }, 0);
                            return total + subjectHours;
                          }, 0)} ម៉ោង
                        </span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-[#141414]" 
                      onClick={() => {
                        const name = (document.getElementById('teacher-name') as HTMLInputElement).value;
                        const code = (document.getElementById('teacher-code') as HTMLInputElement).value;
                        
                        const availChecks = document.querySelectorAll('.teacher-avail-check:checked');
                        const availability: Record<string, ('morning' | 'afternoon')[]> = {};
                        
                        availChecks.forEach(c => {
                          const day = (c as HTMLInputElement).getAttribute('data-day')!;
                          const period = (c as HTMLInputElement).getAttribute('data-period')! as 'morning' | 'afternoon';
                          if (!availability[day]) availability[day] = [];
                          availability[day].push(period);
                        });
                        
                        const assignedClasses = [...teacherFormClasses];
                        const subIds = [...teacherFormSubjects];

                        if (!name || !code) {
                          toast.error('សូមបញ្ចូលឈ្មោះ និង កូដ!');
                          return;
                        }

                        if (subIds.length === 0) {
                          toast.error('សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់ ១!');
                          return;
                        }

                        if (assignedClasses.length === 0) {
                          toast.error('សូមជ្រើសរើសថ្នាក់យ៉ាងហោចណាស់ ១!');
                          return;
                        }

                        // Check for conflicts: Is any class/subject pair already assigned to another teacher?
                        const conflicts: string[] = [];
                        assignedClasses.forEach(classId => {
                          const cls = getClassById(classId);
                          subIds.forEach(subId => {
                            const sub = getSubjectById(subId);
                            const existingTeacher = teachers.find(t => 
                              t.assignedClasses.includes(classId) && t.subjects.includes(subId)
                            );
                            if (existingTeacher) {
                              conflicts.push(`ថ្នាក់ ${cls?.grade}${cls?.group} មុខវិជ្ជា ${sub?.name} មានគ្រូ ${existingTeacher.name} រួចហើយ!`);
                            }
                          });
                        });

                        if (conflicts.length > 0) {
                          conflicts.forEach(msg => toast.error(msg));
                          return;
                        }

                        addTeacher(name, code, availability, assignedClasses, subIds);
                        
                        // Reset
                        (document.getElementById('teacher-name') as HTMLInputElement).value = '';
                        (document.getElementById('teacher-code') as HTMLInputElement).value = '';
                        setTeacherFormClasses([]);
                        setTeacherFormSubjects([]);
                      }}
                    >
                      បន្ថែមគ្រូបង្រៀន
                    </Button>
                  </CardContent>
                </Card>

                <Card className="md:col-span-3 border-none shadow-sm bg-white/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>បញ្ជីគ្រូបង្រៀន</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ឈ្មោះ</TableHead>
                        <TableHead>កូដ</TableHead>
                        <TableHead>មុខវិជ្ជា</TableHead>
                        <TableHead>ថ្នាក់បង្រៀន</TableHead>
                        <TableHead>ម៉ោងសរុប</TableHead>
                        <TableHead className="text-right">សកម្មភាព</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">មិនទាន់មានទិន្នន័យ</TableCell>
                        </TableRow>
                      ) : (
                        teachers.map(t => {
                          const scheduledHours = schedule.filter(s => s.teacherId === t.id).length;
                          
                          // Calculate total required hours based on assigned classes and subjects
                          const totalRequiredHours = t.assignedClasses.reduce((total, classId) => {
                            const cls = getClassById(classId);
                            if (!cls) return total;
                            const subjectHours = t.subjects.reduce((subTotal, subId) => {
                              const sub = getSubjectById(subId);
                              if (!sub) return subTotal;
                              return subTotal + (Number(sub.hoursPerGrade[cls.grade]) || 0);
                            }, 0);
                            return total + subjectHours;
                          }, 0);

                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                  <div>
                                    <div className="text-sm font-bold">{t.name}</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(t.availability).map(([day, periods]) => {
                                        const pList = periods as ('morning' | 'afternoon')[];
                                        return pList.length > 0 && (
                                          <span key={day} className="text-[9px] bg-[#F8F9FA] px-1.5 py-0.5 rounded border border-[#E9ECEF]">
                                            {day}: {pList.map(p => p === 'morning' ? 'ព្រឹក' : 'រសៀល').join('/')}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline">{t.code}</Badge></TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {t.subjects.map(sId => (
                                    <Badge key={sId} variant="secondary" className="text-[10px]">{getSubjectById(sId)?.name}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {t.assignedClasses.length > 0 ? (
                                    t.assignedClasses.map(cId => {
                                      const cls = getClassById(cId);
                                      return cls && <Badge key={cId} variant="outline" className="text-[10px]">{cls.grade}{cls.group}</Badge>;
                                    })
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">មិនទាន់មាន</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono font-bold">
                                <div className="flex flex-col">
                                  <span>{scheduledHours} / {totalRequiredHours} ម៉ោង</span>
                                  <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className={`h-full ${scheduledHours >= totalRequiredHours ? 'bg-green-500' : 'bg-blue-500'}`} 
                                      style={{ width: `${Math.min(100, (scheduledHours / (totalRequiredHours || 1)) * 100)}%` }} 
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger render={<Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50" />}>
                                      <Edit size={18} />
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>កែសម្រួលគ្រូបង្រៀន</DialogTitle>
                                      </DialogHeader>
                                      <EditTeacherForm 
                                        teacher={t}
                                        classes={classes}
                                        subjects={subjects}
                                        teachers={teachers}
                                        updateTeacher={updateTeacher}
                                        getClassById={getClassById}
                                        getSubjectById={getSubjectById}
                                        onClose={() => {
                                          (document.querySelector('[data-state="open"]') as any)?.click();
                                        }}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" onClick={() => deleteTeacher(t.id)} className="text-red-500 hover:bg-red-50">
                                    <Trash2 size={18} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
