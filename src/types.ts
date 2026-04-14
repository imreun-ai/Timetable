/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Class {
  id: string;
  grade: string; // 7, 8, 9...
  group: string; // A, B, C...
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  hoursPerGrade: Record<string, number>; // grade -> hours
}

export interface Teacher {
  id: string;
  name: string;
  code: string;
  availableDays: string[]; // ['Monday', 'Tuesday'...]
  availablePeriods: ('morning' | 'afternoon')[];
  availability: Record<string, ('morning' | 'afternoon')[]>; // day -> periods
  assignedClasses: string[]; // Class IDs
  subjects: string[]; // Subject IDs (max 2)
  color: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  period: 'morning' | 'afternoon';
  startTime: string;
  endTime: string;
}

export interface ScheduleEntry {
  id: string;
  classId: string;
  day: string;
  timeSlotId: string;
  teacherId: string;
  subjectId: string;
}

export type DayOfWeek = 'ចន្ទ' | 'អង្គារ' | 'ពុធ' | 'ព្រហស្បតិ៍' | 'សុក្រ' | 'សៅរ៍';
