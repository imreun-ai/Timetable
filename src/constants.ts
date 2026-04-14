/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayOfWeek, TimeSlot } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'm1', label: '7-8', period: 'morning', startTime: '07:00', endTime: '08:00' },
  { id: 'm2', label: '8-9', period: 'morning', startTime: '08:00', endTime: '09:00' },
  { id: 'm3', label: '9-10', period: 'morning', startTime: '09:00', endTime: '10:00' },
  { id: 'm4', label: '10-11', period: 'morning', startTime: '10:00', endTime: '11:00' },
  { id: 'a1', label: '14-15', period: 'afternoon', startTime: '14:00', endTime: '15:00' },
  { id: 'a2', label: '15-16', period: 'afternoon', startTime: '15:00', endTime: '16:00' },
  { id: 'a3', label: '16-17', period: 'afternoon', startTime: '16:00', endTime: '17:00' },
];

export const TEACHER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', 
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];
