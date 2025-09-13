import React, { useState, useEffect } from 'react';
import TrainingSidebar, { Module } from '../components/TrainingSidebar';
import VideoPlayer from '../components/VideoPlayer';
import StudyMaterials from '../components/StudyMaterials';

const modules: Module[] = Array.from({ length: 10 }, (_, i) => ({
  title: `Módulo ${i + 1}`,
  lessons: Array.from({ length: 3 + (i % 3) }, (_, j) => `Lição ${j + 1}`),
}));

export default function TrainingPage() {
  const [currentModule, setCurrentModule] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  useEffect(() => {
    const stored = localStorage.getItem('trainingState');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCurrentModule(data.moduloAtual || 0);
        setCurrentLesson(data.licaoAtual || 0);
        setCompletedLessons(new Set(data.concluidas || []));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const data = {
      moduloAtual: currentModule,
      licaoAtual: currentLesson,
      concluidas: Array.from(completedLessons),
      totalLicoes: totalLessons,
    };
    localStorage.setItem('trainingState', JSON.stringify(data));
  }, [currentModule, currentLesson, completedLessons, totalLessons]);

  const completedCount = completedLessons.size;
  const progress = Math.round((completedCount / totalLessons) * 100);

  const handleSelectLesson = (mIndex: number, lIndex: number) => {
    setCurrentModule(mIndex);
    setCurrentLesson(lIndex);
  };

  const handleNext = () => {
    const id = `${currentModule}-${currentLesson}`;
    setCompletedLessons((prev) => new Set(prev).add(id));

    const lessonsInModule = modules[currentModule].lessons.length;
    if (currentModule === modules.length - 1 && currentLesson === lessonsInModule - 1) {
      return;
    }
    if (currentLesson < lessonsInModule - 1) {
      setCurrentLesson(currentLesson + 1);
    } else {
      setCurrentModule(currentModule + 1);
      setCurrentLesson(0);
    }
  };

  const handlePrev = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    } else if (currentModule > 0) {
      const prevModule = currentModule - 1;
      setCurrentModule(prevModule);
      setCurrentLesson(modules[prevModule].lessons.length - 1);
    }
  };

  const isLastLesson =
    currentModule === modules.length - 1 &&
    currentLesson === modules[currentModule].lessons.length - 1;

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="hidden md:block">
        <TrainingSidebar
          modules={modules}
          currentModule={currentModule}
          currentLesson={currentLesson}
          onSelectLesson={handleSelectLesson}
          completedLessons={completedLessons}
        />
      </div>

      <div className="flex-1 p-4">
        <header className="sticky top-0 z-10 bg-white dark:bg-[#3E3E3E] p-4 shadow mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="font-semibold mb-2 md:mb-0">Módulo {currentModule + 1} → Lição {currentLesson + 1}</div>
            <div className="flex-1 md:ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Progresso: {progress}%</div>
              <div className="w-full bg-gray-200 dark:bg-[#1E1E1E] rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-yn-orange"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </header>

        <VideoPlayer videoId="z_Xe5j8xkfI" />
        <div className="mt-4 flex flex-col md:flex-row md:space-x-4">
          <button
            onClick={handlePrev}
            className="mb-2 md:mb-0 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg w-full md:w-auto"
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={isLastLesson}
            className={`bg-yn-orange hover:bg-yn-orange/90 text-white px-4 py-2 rounded-lg w-full md:w-auto ${isLastLesson ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Próximo
          </button>
        </div>

        <div className="mt-4">
          <StudyMaterials />
        </div>

        <div className="mt-4 md:hidden">
          <TrainingSidebar
            modules={modules}
            currentModule={currentModule}
            currentLesson={currentLesson}
            onSelectLesson={handleSelectLesson}
            completedLessons={completedLessons}
          />
        </div>
      </div>
    </div>
  );
}

