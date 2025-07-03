import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { IProjectTask } from '@/types/project/projectTasksViewModel.types';
import { setShowTaskDrawer, setSelectedTaskId } from '@/features/task-drawer/task-drawer.slice';
import { fetchBoardSubTasks, toggleTaskExpansion } from '@/features/enhanced-kanban/enhanced-kanban.slice';
import AvatarGroup from '@/components/AvatarGroup';
import LazyAssigneeSelectorWrapper from '@/components/task-management/lazy-assignee-selector';
import CustomDueDatePicker from '@/components/board/custom-due-date-picker';
import { themeWiseColor } from '@/utils/themeWiseColor';
import { useTranslation } from 'react-i18next';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { CaretDownFilled, CaretRightFilled, ForkOutlined, PlusOutlined } from '@ant-design/icons';
import { Divider, List, Skeleton, Tag, Tooltip, Progress, Button, Typography, Flex } from 'antd';
import EnhancedKanbanCreateSubtaskCard from '../EnhancedKanbanCreateSubtaskCard';
import BoardSubTaskCard from '@/pages/projects/projectView/board/board-section/board-sub-task-card/board-sub-task-card';
import '../EnhancedKanbanTaskCard.css';
import { useAppDispatch } from '@/hooks/useAppDispatch';

interface TaskCardProps {
    task: IProjectTask;
    onTaskDragStart: (e: React.DragEvent, taskId: string, groupId: string) => void;
    onTaskDragOver: (e: React.DragEvent, groupId: string, taskIdx: number) => void;
    onTaskDrop: (e: React.DragEvent, groupId: string, taskIdx: number) => void;
    groupId: string;
    isDropIndicator: boolean;
    idx: number;
}

const TaskCard: React.FC<TaskCardProps> = React.memo(({
    task,
    onTaskDragStart,
    onTaskDragOver,
    onTaskDrop,
    groupId,
    isDropIndicator,
    idx
}) => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation('kanban-board');
    const themeMode = useSelector((state: RootState) => state.themeReducer.mode);
    const [showNewSubtaskCard, setShowNewSubtaskCard] = useState(false);
    const [dueDate, setDueDate] = useState<Dayjs | null>(task?.end_date ? dayjs(task?.end_date) : null);
    const projectId = useSelector((state: RootState) => state.projectReducer.projectId);

    const handleCardClick = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dispatch(setSelectedTaskId(id));
        dispatch(setShowTaskDrawer(true));
    }, [dispatch]);

    const renderLabels = useMemo(() => {
        if (!task?.labels?.length) return null;
        return (
            <>
                {task.labels.slice(0, 2).map((label: any) => (
                    <Tag key={label.id} style={{ marginRight: '2px' }} color={label?.color_code}>
                        <span style={{ color: themeMode === 'dark' ? '#383838' : '', fontSize: 10 }}>
                            {label.name}
                        </span>
                    </Tag>
                ))}
                {task.labels.length > 2 && <Tag>+ {task.labels.length - 2}</Tag>}
            </>
        );
    }, [task.labels, themeMode]);

    const handleSubTaskExpand = useCallback(() => {
        if (task && task.id && projectId) {
            if (task.sub_tasks && task.sub_tasks.length > 0 && task.sub_tasks_count && task.sub_tasks_count > 0) {
                dispatch(toggleTaskExpansion(task.id));
            } else if (task.sub_tasks_count && task.sub_tasks_count > 0) {
                dispatch(toggleTaskExpansion(task.id));
                dispatch(fetchBoardSubTasks({ taskId: task.id , projectId }));
            } else {
                dispatch(toggleTaskExpansion(task.id));
            }
        }
    }, [task, projectId, dispatch]);

    const handleSubtaskButtonClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleSubTaskExpand();
    }, [handleSubTaskExpand]);

    const handleAddSubtaskClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowNewSubtaskCard(true);
    }, []);

    const background = themeMode === 'dark' ? '#23272f' : '#fff';
    const color = themeMode === 'dark' ? '#fff' : '#23272f';

    return (
        <>
            {isDropIndicator && (
                <div
                    style={{
                        height: 80,
                        background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0',
                        borderRadius: 6,
                        border: `5px`,
                    }}
                    onDragStart={e => onTaskDragStart(e, task.id!, groupId)}
                    onDragOver={e => onTaskDragOver(e, groupId, idx)}
                    onDrop={e => onTaskDrop(e, groupId, idx)}
                />
            )}
            <div
                className="enhanced-kanban-task-card"
                draggable
                onDragStart={e => onTaskDragStart(e, task.id!, groupId)}
                onDragOver={e => onTaskDragOver(e, groupId, idx)}
                onDrop={e => onTaskDrop(e, groupId, idx)}
                style={{ background, color }}
                onClick={e => handleCardClick(e, task.id || '')}
            >
                <div className="task-content">
                    <Flex align="center" justify="space-between" className="mb-2">
                        <Flex>{renderLabels}</Flex>
                        <Tooltip title={` ${task?.completed_count} / ${task?.total_tasks_count}`}>
                            <Progress type="circle" percent={task?.complete_ratio} size={24} strokeWidth={(task.complete_ratio || 0) >= 100 ? 9 : 7} />
                        </Tooltip>
                    </Flex>
                    <Flex gap={4} align="center">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.priority_color || '#d9d9d9' }}
                        />
                        <Typography.Text
                            style={{ fontWeight: 500 }}
                            ellipsis={{ tooltip: task.name }}
                        >
                            {task.name}
                        </Typography.Text>
                    </Flex>
                    <Flex align="center" justify="space-between" style={{ marginBlock: 8 }}>
                        <Flex align="center" gap={2}>
                            <AvatarGroup
                                members={task.names || []}
                                maxCount={3}
                                isDarkMode={themeMode === 'dark'}
                                size={24}
                            />
                            <LazyAssigneeSelectorWrapper task={task} groupId={groupId} isDarkMode={themeMode === 'dark'} />
                        </Flex>
                        <Flex gap={4} align="center">
                            <CustomDueDatePicker task={task} onDateChange={setDueDate} />
                            <Button
                                onClick={handleSubtaskButtonClick}
                                size="small"
                                style={{ padding: 0 }}
                                type="text"
                            >
                                <Tag
                                    bordered={false}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        margin: 0,
                                        backgroundColor: themeWiseColor('white', '#1e1e1e', themeMode),
                                    }}
                                >
                                    <ForkOutlined rotate={90} />
                                    <span>{task.sub_tasks_count}</span>
                                    {task.show_sub_tasks ? <CaretDownFilled /> : <CaretRightFilled />}
                                </Tag>
                            </Button>
                        </Flex>
                    </Flex>
                    <Flex vertical gap={8}>
                        {task.show_sub_tasks && (
                            <Flex vertical>
                                <Divider style={{ marginBlock: 0 }} />
                                <List>
                                    {task.sub_tasks_loading && (
                                        <List.Item>
                                            <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginTop: 8 }} />
                                        </List.Item>
                                    )}
                                    {!task.sub_tasks_loading && task?.sub_tasks && task.sub_tasks.length > 0 &&
                                        task.sub_tasks.map((subtask: any) => (
                                            <BoardSubTaskCard key={subtask.id} subtask={subtask} sectionId={groupId} />
                                        ))}
                                    {!task.sub_tasks_loading && (!task?.sub_tasks || task.sub_tasks.length === 0) && task.sub_tasks_count === 0 && (
                                        <List.Item>
                                            <div style={{ padding: '8px 0', color: '#999', fontSize: '12px' }}>
                                                {t('noSubtasks', 'No subtasks')}
                                            </div>
                                        </List.Item>
                                    )}
                                    {showNewSubtaskCard && (
                                        <EnhancedKanbanCreateSubtaskCard
                                            sectionId={groupId}
                                            parentTaskId={task.id || ''}
                                            setShowNewSubtaskCard={setShowNewSubtaskCard}
                                        />
                                    )}
                                </List>
                                <Button
                                    type="text"
                                    style={{ width: 'fit-content', borderRadius: 6, boxShadow: 'none' }}
                                    icon={<PlusOutlined />}
                                    onClick={handleAddSubtaskClick}
                                >
                                    {t('addSubtask', 'Add Subtask')}
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                </div>
            </div>
        </>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard; 