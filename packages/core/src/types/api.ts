import {PluginState as PS} from './plugin.js';
import {TaskState} from '../task/index.js';
import {ScheduleType} from '../schedule/index.js';

export interface LivingRes {
  name: string;
  version: string;
  state: PS;
  task: Array<{
    task: string;
    taskCount: number;
    working: number;
  }>;
  app?: {
    url: string;
    settings?: string | true;
  };
}

export type TasksRes = Record<
  string,
  Array<{
    taskName: string;
    setup: boolean;
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
