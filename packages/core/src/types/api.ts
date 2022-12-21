import {PluginState as PS} from './plugin.js';
import {TaskState} from '../task/index.js';
import {ScheduleType} from '../schedule/index.js';
import {AppSettings} from './settings.js';

export interface LivingRes {
  name: string;
  version: string;
  state: PS;
  task: Array<{
    task: string;
    taskCount: number;
    running: Array<{
      state: TaskState;
      taskId: number;
      scheduleId: number;
    }>;
  }>;
  app?: {
    url: string;
    settings?: string | true;
  };
}

export type GroupedTasksRes = Record<
  string,
  Array<{
    taskName: string;
    description?: string;
    link?: string;
    instances: Array<{
      id: number;
      name: string | null;
      createdAt: Date;
      settings: any | null;
    }>;
  }>
>;

export type TasksRes = Array<{
  id: number;
  plugin: string;
  task: string;
  name: string | null;
  settings: any | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export interface Schedule {
  id: number;
  taskId: number;
  type: ScheduleType;
  lastRun: Date | null;
  createdAt: Date;
  trigger: string | null;
  state?: TaskState;
  plugin: string;
  task: string;
  name: string | null;
}

export type ScheduleRes = Array<Schedule>;

export type SchedulePutRes = {
  scheduleId: number;
};

export enum ServiceErrorCode {
  globalSettingsReconfiguration,
}

export interface ReconfigurationErrorRes {
  code: ServiceErrorCode.globalSettingsReconfiguration;
  data: AppSettings;
}
