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
  RefreshCw, 
  Settings, 
  Calendar as CalendarIcon, 
  Users, 
  BookOpen, 
  GraduationCap,
  Save,
  ChevronRight,
  ChevronLeft,
  Filter
} from 'lucide-react';
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
import * as XLSX from 'xlsx';
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

export default function App() {
  // --- State ---
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // --- Default Subjects ---
  const DEFAULT_SUBJECTS = [
    { name: 'ភាសាខ្មែរ', code: 'K' },
    { name: 'គណិតវិទ្យា', code: 'M' },
    { name: 'គីមីវិទ្យា', code: 'C' },
    { name: 'រូបវិទ្យា', code: 'P' },
    { name: 'ជីវវិទ្យា', code: 'B' },
    { name: 'ភូមិវិទ្យា', code: 'G' },
    { name: 'ប្រវត្តិវិទ្យា', code: 'H' },
    { name: 'គេហកិច្ច', code: 'E' },
    { name: 'ផែនដីវិទ្យា', code: 'D' },
    { name: 'សេដ្ឋកិច្ច', code: 'S' },
    { name: 'អង់គ្លេស', code: 'A' },
    { name: 'កសិកម្ម', code: 'AG' },
    { name: 'កីឡា', code: 'SP' },
    { name: 'សីលធម៌', code: 'MO' },
    { name: 'ICT', code: 'I' },
    { name: 'បណ្ណាល័យ', code: 'L' },
    { name: 'សុខភាព', code: 'HE' },
    { name: 'រោងជាង', code: 'W' }
  ];

  // --- Persistence ---
  useEffect(() => {
    const savedClasses = localStorage.getItem('school_classes');
    const savedSubjects = localStorage.getItem('school_subjects');
    const savedTeachers = localStorage.getItem('school_teachers');
    const savedSchedule = localStorage.getItem('school_schedule');

    if (savedClasses) setClasses(JSON.parse(savedClasses));
    
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects));
    } else {
      // Initialize with default subjects if none saved
      const initialSubjects: Subject[] = DEFAULT_SUBJECTS.map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        code: s.code,
        hoursPerGrade: {}
      }));
      setSubjects(initialSubjects);
    }

    if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
    if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
  }, []);

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
    // Basic greedy algorithm for scheduling
    // 1. Clear current schedule
    const newSchedule: ScheduleEntry[] = [];
    
    // 2. Track teacher workload and availability
    const teacherWorkload: Record<string, number> = {}; // teacherId -> hours scheduled
    const teacherBusySlots: Record<string, Set<string>> = {}; // teacherId -> Set of "day-timeSlotId"

    teachers.forEach(t => {
      teacherWorkload[t.id] = 0;
      teacherBusySlots[t.id] = new Set();
    });

    // 3. Iterate through each class
    for (const cls of classes) {
      // For each subject assigned to this class (via teachers)
      const classTeachers = teachers.filter(t => t.assignedClasses.includes(cls.id));
      
      for (const teacher of classTeachers) {
        // For each subject this teacher teaches
        for (const subjectId of teacher.subjects) {
          const subject = getSubjectById(subjectId);
          if (!subject) continue;

          const requiredHours = subject.hoursPerGrade[cls.grade] || 0;
          let scheduledHours = 0;

          // Try to find slots for this subject/teacher/class
          // Shuffle days and slots for more variety
          const shuffledDays = [...DAYS_OF_WEEK].sort(() => Math.random() - 0.5);
          
          for (const day of shuffledDays) {
            if (scheduledHours >= requiredHours) break;
            const dayAvailability = teacher.availability[day];
            if (!dayAvailability || dayAvailability.length === 0) continue;

            let hoursToday = 0;
            for (const slot of TIME_SLOTS) {
              if (scheduledHours >= requiredHours) break;
              if (hoursToday >= 2) break; // Max 2 hours per subject per day for a class
              
              // Check teacher period availability for this specific day
              if (!dayAvailability.includes(slot.period)) continue;

              // Check if slot is already taken in this class
              const isSlotTakenInClass = newSchedule.some(s => s.classId === cls.id && s.day === day && s.timeSlotId === slot.id);
              if (isSlotTakenInClass) continue;

              // Check if teacher is busy in another class at this time
              const teacherKey = `${day}-${slot.id}`;
              if (teacherBusySlots[teacher.id].has(teacherKey)) continue;

              // Schedule it!
              newSchedule.push({
                id: crypto.randomUUID(),
                classId: cls.id,
                day,
                timeSlotId: slot.id,
                teacherId: teacher.id,
                subjectId: subjectId
              });

              teacherBusySlots[teacher.id].add(teacherKey);
              scheduledHours++;
              hoursToday++;
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
  const filteredClasses = selectedClassId === 'all' ? classes : classes.filter(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-transparent font-sans text-[#1A1A1A]">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/20">
          <div>
            <h1 className="text-3xl font-moul tracking-tight text-[#141414] mb-1">ប្រព័ន្ធរៀបកាលវិភាគស្វ័យប្រវត្តិ</h1>
            <p className="text-[#141414]/60 text-sm font-medium">គ្រប់គ្រងការបង្រៀន និងរៀបចំកាលវិភាគដោយវៃឆ្លាត</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exportToExcel} className="rounded-xl border-[#E9ECEF] hover:bg-[#F8F9FA]">
              <Download size={18} className="mr-2" /> ទាញយកជា Excel
            </Button>
            <Button onClick={autoGenerateSchedule} className="bg-[#141414] hover:bg-[#2D2D2D] text-white rounded-xl shadow-lg shadow-black/10">
              <CalendarIcon size={18} className="mr-2" /> រៀបកាលវិភាគស្វ័យប្រវត្តិ
            </Button>
            <Button variant="destructive" onClick={clearSchedule} className="rounded-xl shadow-lg shadow-red-500/10">
              <Trash2 size={18} className="mr-2" /> សម្អាត
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-[#E9ECEF] mb-6 h-12">
            <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">កាលវិភាគរួម</TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">ថ្នាក់រៀន</TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">មុខវិជ្ជា</TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-xl data-[state=active]:bg-[#141414] data-[state=active]:text-white px-6">គ្រូបង្រៀន</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">កាលវិភាគរួម</CardTitle>
                  <CardDescription>បង្ហាញកាលវិភាគតាមថ្នាក់នីមួយៗ</CardDescription>
                </div>
                <div className="flex items-center gap-4">
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

                                return (
                                  <TableCell key={`${day}-${slot.id}`} className="p-0 border-r border-[#141414]/10 h-[100px] w-[80px]">
                                    <Dialog>
                                      <DialogTrigger 
                                        render={
                                          <button 
                                            className={`w-full h-full p-2 text-left transition-all relative group ${
                                              entry ? 'shadow-sm' : 'hover:bg-[#141414]/5'
                                            }`}
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
              <Card className="md:col-span-1 border-none shadow-sm h-fit">
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

              <Card className="md:col-span-2 border-none shadow-sm">
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
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none shadow-sm h-fit">
                <CardHeader>
                  <CardTitle>បន្ថែមមុខវិជ្ជា</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ឈ្មោះមុខវិជ្ជា</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={(val: string) => {
                        const input = document.getElementById('sub-name') as HTMLInputElement;
                        const codeInput = document.getElementById('sub-code') as HTMLInputElement;
                        if (val === 'custom') {
                          input.value = '';
                          input.focus();
                        } else {
                          const sub = DEFAULT_SUBJECTS.find(s => s.name === val);
                          input.value = val;
                          if (sub) codeInput.value = sub.code;
                        }
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="ជ្រើសរើសមុខវិជ្ជា" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_SUBJECTS.map(s => (
                            <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                          ))}
                          <SelectItem value="custom" className="font-bold text-blue-600">+ បញ្ចូលថ្មី</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input id="sub-name" placeholder="ឈ្មោះមុខវិជ្ជា" className="mt-2" />
                  </div>
                  <div className="space-y-2">
                    <Label>កូដតំណាង</Label>
                    <Input id="sub-code" placeholder="MATH" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <Label className="text-sm font-bold">ចំនួនម៉ោងតាមកម្រិតថ្នាក់</Label>
                    {Array.from(new Set(classes.map(c => c.grade))).sort().map(grade => (
                      <div key={grade} className="flex items-center justify-between gap-4">
                        <Label className="text-xs">ថ្នាក់ទី {grade}</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          data-grade={grade}
                          className="w-20 h-8 text-xs subject-hours-input"
                        />
                      </div>
                    ))}
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
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>បញ្ជីមុខវិជ្ជា</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>មុខវិជ្ជា</TableHead>
                        <TableHead>កូដ</TableHead>
                        <TableHead>ម៉ោង/សប្តាហ៍</TableHead>
                        <TableHead className="text-right">សកម្មភាព</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">មិនទាន់មានទិន្នន័យ</TableCell>
                        </TableRow>
                      ) : (
                        subjects.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-semibold">{s.name}</TableCell>
                            <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(s.hoursPerGrade).map(([grade, hours]) => (
                                  (hours as number) > 0 && <Badge key={grade} variant="secondary" className="text-[10px]">ថ្នាក់ទី {grade}: {hours}ម៉</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Dialog>
                                <DialogTrigger render={<Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50" />}>
                                  <Edit size={18} />
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
                                      {Array.from(new Set(classes.map(c => c.grade))).sort().map(grade => (
                                        <div key={grade} className="flex items-center justify-between gap-4">
                                          <Label className="text-xs">ថ្នាក់ទី {grade}</Label>
                                          <Input 
                                            type="number" 
                                            defaultValue={(s.hoursPerGrade as any)[grade as string] || 0}
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
                              <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)} className="text-red-500 hover:bg-red-50">
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

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none shadow-sm h-fit">
                <CardHeader>
                  <CardTitle>បន្ថែមគ្រូបង្រៀន</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ឈ្មោះគ្រូបង្រៀន</Label>
                    <Input id="teacher-name" placeholder="ឈ្មោះ..." />
                  </div>
                  <div className="space-y-2">
                    <Label>កូដបង្រៀន (ស្វ័យប្រវត្តិ)</Label>
                    <Input id="teacher-code" placeholder="នឹងរត់ស្វ័យប្រវត្តិ..." readOnly className="bg-muted" />
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
                        {classes.map(c => (
                          <div key={c.id} className="flex items-center gap-2">
                            <input type="checkbox" id={`cls-${c.id}`} className="teacher-class-check" value={c.id} />
                            <label htmlFor={`cls-${c.id}`} className="text-xs">{c.grade}{c.group}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label>មុខវិជ្ជា (អតិបរមា ២)</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                        {subjects.map(s => (
                          <div key={s.id} className="flex items-center gap-2">
                            <input type="checkbox" id={`sub-${s.id}`} className="teacher-sub-check" value={s.id} />
                            <label htmlFor={`sub-${s.id}`} className="text-xs">{s.name}</label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
                      
                      const classChecks = document.querySelectorAll('.teacher-class-check:checked');
                      const assignedClasses = Array.from(classChecks).map(c => (c as HTMLInputElement).value);
                      
                      const subChecks = document.querySelectorAll('.teacher-sub-check:checked');
                      const subIds = Array.from(subChecks).map(c => (c as HTMLInputElement).value);

                      if (subIds.length === 0) {
                        toast.error('សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់ ១!');
                        return;
                      }

                      if (subIds.length > 2) {
                        toast.error('គ្រូម្នាក់អាចបង្រៀនបានត្រឹមតែ ២ មុខវិជ្ជាប៉ុណ្ណោះ!');
                        return;
                      }

                      // Auto-generate teacher code based on first subject
                      const firstSub = getSubjectById(subIds[0]);
                      const subPrefix = firstSub?.code.charAt(0).toUpperCase() || 'T';
                      const samePrefixTeachers = teachers.filter(t => t.code.startsWith(subPrefix));
                      const nextNum = samePrefixTeachers.length + 1;
                      const teacherCode = `${subPrefix}${nextNum}`;

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

                      addTeacher(name, teacherCode, availability, assignedClasses, subIds);
                      
                      // Reset
                      (document.getElementById('teacher-name') as HTMLInputElement).value = '';
                      (document.getElementById('teacher-code') as HTMLInputElement).value = '';
                      document.querySelectorAll('.teacher-avail-check').forEach(c => (c as HTMLInputElement).checked = true);
                      document.querySelectorAll('.teacher-class-check').forEach(c => (c as HTMLInputElement).checked = false);
                      document.querySelectorAll('.teacher-sub-check').forEach(c => (c as HTMLInputElement).checked = false);
                    }}
                  >
                    បន្ថែមគ្រូបង្រៀន
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm">
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
                        <TableHead>ម៉ោងសរុប</TableHead>
                        <TableHead className="text-right">សកម្មភាព</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">មិនទាន់មានទិន្នន័យ</TableCell>
                        </TableRow>
                      ) : (
                        teachers.map(t => {
                          const totalHours = schedule.filter(s => s.teacherId === t.id).length;
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
                              <TableCell className="font-mono font-bold">{totalHours} ម៉ោង</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50">
                                        <Edit size={18} />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>កែសម្រួលគ្រូបង្រៀន</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label>ឈ្មោះគ្រូបង្រៀន</Label>
                                          <Input id={`edit-teacher-name-${t.id}`} defaultValue={t.name} />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>កូដបង្រៀន</Label>
                                          <Input id={`edit-teacher-code-${t.id}`} defaultValue={t.code} />
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
                                                      id={`edit-morning-${day}-${t.id}`} 
                                                      className={`edit-teacher-avail-check-${t.id}`} 
                                                      data-day={day} 
                                                      data-period="morning" 
                                                      defaultChecked={t.availability[day]?.includes('morning')} 
                                                    />
                                                    <label htmlFor={`edit-morning-${day}-${t.id}`} className="text-[10px]">ព្រឹក</label>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <input 
                                                      type="checkbox" 
                                                      id={`edit-afternoon-${day}-${t.id}`} 
                                                      className={`edit-teacher-avail-check-${t.id}`} 
                                                      data-day={day} 
                                                      data-period="afternoon" 
                                                      defaultChecked={t.availability[day]?.includes('afternoon')} 
                                                    />
                                                    <label htmlFor={`edit-afternoon-${day}-${t.id}`} className="text-[10px]">រសៀល</label>
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
                                              {classes.map(c => (
                                                <div key={c.id} className="flex items-center gap-2">
                                                  <input 
                                                    type="checkbox" 
                                                    id={`edit-cls-${c.id}-${t.id}`} 
                                                    className={`edit-teacher-class-check-${t.id}`} 
                                                    value={c.id} 
                                                    defaultChecked={t.assignedClasses.includes(c.id)}
                                                  />
                                                  <label htmlFor={`edit-cls-${c.id}-${t.id}`} className="text-xs">{c.grade}{c.group}</label>
                                                </div>
                                              ))}
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
                                                    id={`edit-sub-${s.id}-${t.id}`} 
                                                    className={`edit-teacher-sub-check-${t.id}`} 
                                                    value={s.id} 
                                                    defaultChecked={t.subjects.includes(s.id)}
                                                  />
                                                  <label htmlFor={`edit-sub-${s.id}-${t.id}`} className="text-xs">{s.name}</label>
                                                </div>
                                              ))}
                                            </div>
                                          </ScrollArea>
                                        </div>

                                        <Button 
                                          className="w-full bg-[#141414]" 
                                          onClick={() => {
                                            const name = (document.getElementById(`edit-teacher-name-${t.id}`) as HTMLInputElement).value;
                                            const code = (document.getElementById(`edit-teacher-code-${t.id}`) as HTMLInputElement).value;
                                            
                                            const availChecks = document.querySelectorAll(`.edit-teacher-avail-check-${t.id}:checked`);
                                            const availability: Record<string, ('morning' | 'afternoon')[]> = {};
                                            availChecks.forEach(c => {
                                              const day = (c as HTMLElement).dataset.day!;
                                              const period = (c as HTMLElement).dataset.period! as 'morning' | 'afternoon';
                                              if (!availability[day]) availability[day] = [];
                                              availability[day].push(period);
                                            });

                                            const classChecks = document.querySelectorAll(`.edit-teacher-class-check-${t.id}:checked`);
                                            const assignedClasses = Array.from(classChecks).map(c => (c as HTMLInputElement).value);

                                            const subChecks = document.querySelectorAll(`.edit-teacher-sub-check-${t.id}:checked`);
                                            const subIds = Array.from(subChecks).map(c => (c as HTMLInputElement).value);

                                            if (subIds.length === 0) {
                                              toast.error('សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់ ១!');
                                              return;
                                            }
                                            if (subIds.length > 2) {
                                              toast.error('គ្រូម្នាក់អាចបង្រៀនបានត្រឹមតែ ២ មុខវិជ្ជាប៉ុណ្ណោះ!');
                                              return;
                                            }

                                            updateTeacher(t.id, name, code, availability, assignedClasses, subIds);
                                            (document.querySelector('[data-state="open"]') as any)?.click();
                                          }}
                                        >
                                          រក្សាទុក
                                        </Button>
                                      </div>
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
          </TabsContent>
        </Tabs>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
