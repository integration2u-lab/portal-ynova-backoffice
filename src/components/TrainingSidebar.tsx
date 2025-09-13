import React, { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

export interface Module {
  title: string;
  lessons: string[];
}

interface TrainingSidebarProps {
  modules: Module[];
  currentModule: number;
  currentLesson: number;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  completedLessons: Set<string>;
}

export default function TrainingSidebar({
  modules,
  currentModule,
  currentLesson,
  onSelectLesson,
  completedLessons,
}: TrainingSidebarProps) {
  const [openModule, setOpenModule] = useState<number | null>(0);

  const toggleModule = (index: number) => {
    setOpenModule(openModule === index ? null : index);
  };

  return (
    <div className="w-full md:w-64 lg:w-72 bg-white dark:bg-[#3E3E3E] border-t md:border-t-0 md:border-r border-gray-200 dark:border-[#1E1E1E] h-full overflow-y-auto text-gray-900 dark:text-gray-100">
      {modules.map((module, mIndex) => (
        <div key={module.title}>
          <button
            onClick={() => toggleModule(mIndex)}
            className="w-full flex items-center justify-between px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-[#1E1E1E]"
          >
            {module.title}
            <ChevronDown
              size={16}
              className={`transition-transform ${openModule === mIndex ? 'rotate-180' : ''}`}
            />
          </button>
          {openModule === mIndex && (
            <div className="px-4 py-2 space-y-1">
              {module.lessons.map((lesson, lIndex) => {
                const id = `${mIndex}-${lIndex}`;
                const isActive =
                  mIndex === currentModule && lIndex === currentLesson;
                const isCompleted = completedLessons.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => onSelectLesson(mIndex, lIndex)}
                    className={`w-full flex items-center text-left px-2 py-1 rounded-md text-sm ${
                      isActive
                        ? 'bg-yn-orange/10 text-yn-orange dark:bg-yn-orange/20 dark:text-yn-orange'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
                    }`}
                  >
                    {isCompleted && (
                      <CheckCircle
                        size={14}
                        className="text-green-500 mr-2 flex-shrink-0"
                      />
                    )}
                    {!isCompleted && <span className="w-4 mr-2" />}
                    {lesson}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

