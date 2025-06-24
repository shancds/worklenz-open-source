import React, { useState, useCallback, useMemo } from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IProjectTask } from '@/types/project/projectTasksViewModel.types';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { Dropdown, MenuProps, Button, Divider, Popconfirm, Tag, Tooltip } from 'antd';
import { PlusOutlined, ForkOutlined, CaretDownFilled, CaretRightFilled, UserAddOutlined, InboxOutlined, DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { setShowTaskDrawer, setSelectedTaskId } from '@/features/task-drawer/task-drawer.slice';
import { addTaskToGroup } from '@/features/enhanced-kanban/enhanced-kanban.slice';
import CustomAvatarGroup from '@/components/board/custom-avatar-group';
import CustomDueDatePicker from '@/components/board/custom-due-date-picker';
import BoardSubTaskCard from '@/pages/projects/projectView/board/board-section/board-sub-task-card/board-sub-task-card';
import BoardCreateSubtaskCard from '@/pages/projects/projectView/board/board-section/board-sub-task-card/board-create-sub-task-card';
import { themeWiseColor } from '@/utils/themeWiseColor';
import { colors } from '@/styles/colors';
import PrioritySection from '@/components/board/taskCard/priority-section/priority-section';
import './EnhancedKanbanTaskCard.css';

interface EnhancedKanbanTaskCardProps {
  task: IProjectTask;
  isActive?: boolean;
  isDragOverlay?: boolean;
  isDropTarget?: boolean;
}

const EnhancedKanbanTaskCard: React.FC<EnhancedKanbanTaskCardProps> = React.memo(({
  task,
  isActive = false,
  isDragOverlay = false,
  isDropTarget = false
}) => {
  const { t } = useTranslation('kanban-board');
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const dispatch = useAppDispatch();
  const [isSubTaskShow, setIsSubTaskShow] = useState(false);
  const [showNewSubtaskCard, setShowNewSubtaskCard] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id!,
    data: {
      type: 'task',
      task,
    },
    disabled: isDragOverlay,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: themeMode === 'dark' ? '#292929' : '#fafafa',
    borderRadius: '0.375rem',
    boxShadow: isActive ? '0 2px 8px #8884' : undefined,
    cursor: 'grab',
    width: '100%',
    padding: 12,
    maxHeight: 90,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  // Context menu (dummy for now, can be extended)
  const items: MenuProps['items'] = useMemo(() => [
    {
      label: (
        <span>
          <UserAddOutlined />
          &nbsp;
          <span>{t('assignToMe')}</span>
        </span>
      ),
      key: '1',
      // onClick: handleAssignToMe, // implement if needed
      disabled: false,
    },
    {
      label: (
        <span>
          <InboxOutlined />
          &nbsp;
          <span>{t('archive')}</span>
        </span>
      ),
      key: '2',
      // onClick: handleArchive, // implement if needed
    },
    {
      label: (
        <Popconfirm
          title={t('deleteConfirmationTitle')}
          icon={<ExclamationCircleFilled style={{ color: colors.vibrantOrange }} />}
          okText={t('deleteConfirmationOk')}
          cancelText={t('deleteConfirmationCancel')}
          // onConfirm={handleDelete} // implement if needed
        >
          <DeleteOutlined />
          &nbsp;
          {t('delete')}
        </Popconfirm>
      ),
      key: '3',
    },
  ], [t]);

  const renderLabels = useMemo(() => {
    if (!task?.labels?.length) return null;
    return (
      <>
        {task.labels.slice(0, 2).map((label: any) => (
          <Tag key={label.id} style={{ marginRight: '4px' }} color={label?.color_code}>
            <span style={{ color: themeMode === 'dark' ? '#383838' : '' }}>
              {label.name}
            </span>
          </Tag>
        ))}
        {task.labels.length > 2 && <Tag>+ {task.labels.length - 2}</Tag>}
      </>
    );
  }, [task.labels, themeMode]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    dispatch(setSelectedTaskId(task.id!));
    dispatch(setShowTaskDrawer(true));
  }, [dispatch, isDragging, task.id]);

  const handleSubTaskExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubTaskShow(prev => !prev);
  }, []);

  const handleAddSubtaskClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNewSubtaskCard(true);
  }, []);

  return (
    <Dropdown menu={{ items }} trigger={['contextMenu']}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={
          `group outline-1 transition-colors duration-100 ${isActive ? 'ring-2 ring-blue-400' : ''}`
        }
        data-id={task.id}
        data-dragging={isDragging ? 'true' : 'false'}
        onClick={handleCardClick}
      >
        {/* Labels and Progress */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex flex-wrap items-center">{renderLabels}</div>
          {/* Progress circle can be added here if needed */}
        </div>
        {/* Priority, Name */}
        <div className="flex items-center gap-2 mb-1">
          <PrioritySection task={task} />
          <span className="font-medium truncate max-w-[180px]" title={task.name}>{task.name}</span>
        </div>
        {/* Assignees, Due Date, Subtasks */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {task && <CustomAvatarGroup task={task} sectionId={task.status_id || ''} />}
          </div>
          <div className="flex items-center gap-2">
            <CustomDueDatePicker task={task} onDateChange={() => {}} />
            <Button
              onClick={handleSubTaskExpand}
              size="small"
              className="p-0"
              type="text"
            >
              <Tag
                bordered={false}
                className="flex items-center m-0 bg-white dark:bg-[#1e1e1e]"
              >
                <ForkOutlined rotate={90} />
                <span>{task.sub_tasks_count}</span>
                {isSubTaskShow ? <CaretDownFilled /> : <CaretRightFilled />}
              </Tag>
            </Button>
          </div>
        </div>
        {/* Subtasks Section */}
        {isSubTaskShow && (
          <div className="mt-2">
            <Divider className="my-1" />
            <div>
              {task.sub_tasks && task.sub_tasks.map((subtask: any) => (
                <BoardSubTaskCard key={subtask.id} subtask={subtask} sectionId={task.status_id || ''} />
              ))}
              {showNewSubtaskCard && (
                <BoardCreateSubtaskCard
                  sectionId={task.status_id || ''}
                  parentTaskId={task.id || ''}
                  setShowNewSubtaskCard={setShowNewSubtaskCard}
                />
              )}
            </div>
            <Button
              type="text"
              className="mt-1"
              icon={<PlusOutlined />}
              onClick={handleAddSubtaskClick}
            >
              {t('addSubtask', 'Add Subtask')}
            </Button>
          </div>
        )}
      </div>
    </Dropdown>
  );
});

export default EnhancedKanbanTaskCard; 