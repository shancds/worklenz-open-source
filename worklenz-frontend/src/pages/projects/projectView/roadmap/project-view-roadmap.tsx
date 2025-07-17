import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { Gantt, Willow, WillowDark } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import dayjs from "dayjs";
import { Select } from 'antd';

const VIEW_MODES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const GanttSkeleton = () => (
  <div style={{ padding: 24 }} className='animate-pulse'>
    <div style={{ height: 32, width: 180, borderRadius: 4, marginBottom: 16 }} className='animate-pulse bg-gray-200 dark:bg-gray-700' />
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }} className='animate-pulse '>
        <div style={{ width: 120, height: 30, borderRadius: 3, marginRight: 16 }} className='animate-pulse bg-gray-200 dark:bg-gray-700' />
        <div style={{ flex: 1, height: 30, borderRadius: 3 }} className='animate-pulse bg-gray-200 dark:bg-gray-700' />
      </div>
    ))}
  </div>
);

const ProjectViewGantt = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState("day");
  // Collapsed state: { [phaseId]: boolean }
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [lengthUnit, setLengthUnit] = useState("hour");
  const themeMode = useAppSelector(state => state.themeReducer?.mode === "dark");
  const [selectedScaleIdx, setSelectedScaleIdx] = useState(0);

  useEffect(() => {
    if (projectId) {
      console.log("projectId", projectId);
    }
  }, [dispatch, projectId]);
  const tasks = [
    {
      id: 20,
      text: "New Task",
      start: new Date(2024, 5, 11),
      end: new Date(2024, 6, 12),
      duration: 1,
      progress: 2,
      type: "task",
      lazy: false,
    },
    {
      id: 47,
      text: "[1] Master project",
      start: new Date(2024, 5, 12),
      end: new Date(2024, 7, 12),
      duration: 8,
      progress: 0,
      parent: 0,
      type: "summary",
    },
    {
      id: 22,
      text: "Task",
      start: new Date(2024, 7, 11),
      end: new Date(2024, 8, 12),
      duration: 8,
      progress: 0,
      parent: 47,
      type: "task",
    },
    {
      id: 21,
      text: "New Task 2",
      start: new Date(2024, 7, 10),
      end: new Date(2024, 8, 12),
      duration: 3,
      progress: 1,
      type: "task",
      lazy: false,
    },
  ];



  const columns = [
    { id: "text", header: "Task name" },
    {
      id: "start",
      header: "Start date",
      align: "center",
    },
    {
      id: "end",
      header: "End date",
      align: "center",
    },
  ];

  const dayStyle = (a: Date) => {
    const day = a.getDay() === 5 || a.getDay() === 6;
    return day ? "sday" : "";
  };
  
  const complexScales = [
    { unit: "day", step: 1, format: "d MMM", css: dayStyle },
    { unit: "year", step: 1, format: "yyyy" },
    { unit: "month", step: 2, format: "MMMM yyy" },
    { unit: "week", step: 1, format: "w MMM" },
  ];



  if (loading) return <GanttSkeleton />;
  return (
    <>
      <div style={{ height: "50px", position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, right: 24, zIndex: 10 }}>
          <Select
            value={selectedScaleIdx}
            onChange={setSelectedScaleIdx}
            style={{ width: 140 }}
            options={complexScales.map((scale, idx) => ({
              value: idx,
              label: scale.unit.charAt(0).toUpperCase() + scale.unit.slice(1)
            }))}
          />
        </div>
      </div>
      <div
        style={{ height: "70vh" }}
      >
        <Willow>
          <div className={themeMode ? "wx-willow-dark-theme" : "wx-willow-theme"} style={{ height: "70vh" }}>
          <Gantt
            tasks={tasks}
            scales={[complexScales[selectedScaleIdx]]}
            columns={columns}
            lengthUnit={lengthUnit}
          />
          </div>
        </Willow>
      </div>
    </>
  );
};

export default ProjectViewGantt;