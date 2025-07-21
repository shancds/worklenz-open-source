import { createSlice, createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import { Task } from '@/types/task-management.types';
import { ITaskPhase } from '@/types/tasks/taskPhase.types';

// The output format for roadmap
export interface RoadmapListItem {
  id: string;
  text: string;
  start: Date | null;
  end: Date | null;
  duration: number;
  progress: number;
  parent: string | number;
  type: string;
  lazy: boolean;
}

interface RoadmapState {
  // Optionally, you can keep the grouped list in state if needed
}

const initialState: RoadmapState = {};

const roadmapSlice = createSlice({
  name: 'roadmap',
  initialState,
  reducers: {},
});

// Selector to get all tasks from taskManagement
const selectAllTasksArray = (state: RootState) =>
  Object.values(state.taskManagement.entities);

// Selector to get all phases from phaseReducer
const selectAllPhases = (state: RootState) =>
  state.phaseReducer.phaseList as ITaskPhase[];

// Helper to get phase name by id
const getPhaseNameById = (phases: ITaskPhase[], phaseId: string) => {
  const found = phases.find(p => p.id === phaseId);
  return found ? found.name : phaseId;
};

// Main selector: returns the grouped and formatted list for the roadmap
export const selectRoadmapGroupedByPhase = createSelector(
  [selectAllTasksArray, selectAllPhases],
  (tasks: Task[], phases: ITaskPhase[]): RoadmapListItem[] => {
    // Group tasks by phase (use phase id or name if not available)
    const phaseGroups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const phaseKey = task.phase || 'Unmapped';
      if (!phaseGroups[phaseKey]) phaseGroups[phaseKey] = [];
      phaseGroups[phaseKey].push(task);
    });

    // Build the output list
    const result: RoadmapListItem[] = [];
    Object.entries(phaseGroups).forEach(([phaseKey, groupTasks], idx) => {
      // Find phase name (if phaseKey is an id, resolve to name)
      const phaseName = getPhaseNameById(phases, phaseKey) || phaseKey;
      const groupId = `phase-${phaseKey}`;
      // Add the group (phase) as a parent row
      result.push({
        id: groupId,
        text: phaseName,
        start: null,
        end: null,
        duration: 0,
        progress: 0,
        parent: 0,
        type: 'task',
        lazy: false,
      });
      // Add all tasks in this group
      groupTasks.forEach(task => {
        result.push({
          id: task.id,
          text: task.title || task.name || 'Untitled Task',
          start: task.startDate ? new Date(task.startDate) : null,
          end: task.dueDate ? new Date(task.dueDate) : null,
          duration: 0,
          progress: typeof task.progress === 'number' ? task.progress : 0,
          parent: groupId,
          type: 'task',
          lazy: false,
        });
      });
    });
    console.log("result", result);
    return result;
  }
);

export default roadmapSlice.reducer;
